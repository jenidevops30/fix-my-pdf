/**
 * FixMyPDF "secure" tool engines: protect, unprotect, redact, flatten,
 * sanitize, metadata.
 *
 * 100% client-side:
 *  - structural surgery uses the regular (statically imported) pdf-lib;
 *  - encryption/decryption uses the @cantoo/pdf-lib fork, loaded lazily via
 *    dynamic import so it never executes during SSR (it carries its own
 *    Web Crypto dependency and adds bundle weight);
 *  - rasterization / text scanning go through the shared kit + pdf.js loader.
 *
 * Nothing ever leaves the browser.
 */
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import type { PDFPage } from "pdf-lib";
import {
  fileBytes,
  loadPdf,
  pdfOutput,
  plural,
  rasterizePdfBytes,
  renderPages,
  savePdf,
  throwIfAborted,
} from "./kit";
import { loadPdfjsDoc } from "../pdfjs";
import { baseName, formatBytes } from "../format";
import type { RunCtx, ToolOutput } from "./types";

/* --------------------------------- helpers --------------------------------- */

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Small JPEG encoder used when rebuilding redacted pages. */
function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode a page image."));
          return;
        }
        blob
          .arrayBuffer()
          .then((ab) => resolve(new Uint8Array(ab)))
          .catch(reject);
      },
      "image/jpeg",
      quality
    );
  });
}

/* ------------------------------ 1 · protect -------------------------------- */

export interface ProtectPasswords {
  user: string;
  /** When set, this password unlocks full (owner) access; user-password readers get restricted editing. */
  owner?: string;
}

/**
 * Encrypt a PDF with AES-256 right in the browser via @cantoo/pdf-lib
 * (`PDFDocument.encrypt({ userPassword, ownerPassword, permissions })`, then a
 * normal `save()` — the writer applies the security dictionary). When a
 * separate owner password is given, user-password readers keep printing /
 * copying / accessibility but lose editing rights; otherwise the owner
 * password defaults to the user password (full access).
 */
export async function protectPdf(
  file: File,
  passwords: ProtectPasswords,
  ctx: RunCtx
): Promise<ToolOutput> {
  const user = passwords.user;
  if (!user) throw new Error("Enter a password to protect this file.");
  const separateOwner = !!(passwords.owner && passwords.owner.length);
  if (separateOwner && passwords.owner === user) {
    throw new Error(
      "The owner password must differ from the main password — otherwise just leave the switch off."
    );
  }

  const bytes = await fileBytes(file);
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 15, detail: "Reading the document…" });

  let saved: Uint8Array;
  let pageCount: number;
  try {
    const { PDFDocument: CantooPDFDocument } = await import("@cantoo/pdf-lib");
    throwIfAborted(ctx.signal);
    const doc = await CantooPDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    if (doc.isEncrypted) {
      throw new Error(
        "This PDF already has a password — remove it first (Remove Password), then protect it again."
      );
    }
    pageCount = doc.getPageCount();
    ctx.progress({ percent: 55, detail: "Encrypting with AES-256…" });
    doc.encrypt({
      userPassword: user,
      ownerPassword: separateOwner ? passwords.owner : user,
      permissions: {
        printing: "highResolution",
        copying: true,
        contentAccessibility: true,
        ...(separateOwner
          ? {
              modifying: false,
              annotating: false,
              fillingForms: false,
              documentAssembly: false,
            }
          : {}),
      },
    });
    saved = await doc.save({ useObjectStreams: true });
  } catch (err) {
    if (isAbort(err)) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (
      msg.startsWith("This PDF") ||
      msg.startsWith("Enter a") ||
      msg.startsWith("The owner")
    ) {
      throw err;
    }
    if (/PDF\/A/.test(msg)) {
      throw new Error(
        "This PDF is PDF/A-archived — the format forbids encryption, so it can't be password-protected."
      );
    }
    throw new Error(
      "This browser build couldn't encrypt the file — try Chrome, Edge or Firefox."
    );
  }

  return pdfOutput(
    `${baseName(file.name)}-locked.pdf`,
    saved,
    `AES-256 encrypted · ${plural(pageCount, "page")} · ${formatBytes(saved.length)}`
  );
}

/* ------------------------------ 2 · unprotect ------------------------------ */

/**
 * Open the PDF with the password the user knows and re-save it WITHOUT any
 * encryption options. Verified against the @cantoo typings/implementation: a
 * `load(bytes, { password })` decrypts and deletes the trailer's /Encrypt
 * entry, and since `context.security` is only ever set by an explicit
 * `encrypt()` call, a plain `save()` writes a completely unencrypted file.
 */
export async function unprotectPdf(
  file: File,
  password: string,
  ctx: RunCtx
): Promise<ToolOutput> {
  if (!password) throw new Error("Enter the current password to unlock this file.");
  const bytes = await fileBytes(file);
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 20, detail: "Unlocking…" });

  try {
    const { PDFDocument: CantooPDFDocument } = await import("@cantoo/pdf-lib");

    // Honest pre-check: is this file actually encrypted?
    const probe = await CantooPDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      parseSpeed: 1500, // ParseSpeeds.Fast — probe only
    });
    if (!probe.isEncrypted) {
      throw new Error(
        "This PDF isn't password-protected — there's nothing to unlock."
      );
    }
    throwIfAborted(ctx.signal);

    const doc = await CantooPDFDocument.load(bytes, {
      password,
      updateMetadata: false,
    });
    ctx.progress({ percent: 65, detail: "Re-saving without a password…" });
    const saved = await doc.save({ useObjectStreams: true });
    return pdfOutput(
      `${baseName(file.name)}-unlocked.pdf`,
      saved,
      `Password removed · ${plural(doc.getPageCount(), "page")} · ${formatBytes(saved.length)}`
    );
  } catch (err) {
    if (isAbort(err)) throw err;
    if (err instanceof Error && err.message.startsWith("This PDF")) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (/password/i.test(msg)) {
      throw new Error(
        "Wrong password — the file stayed locked. Nothing was changed."
      );
    }
    throw new Error(
      "This PDF could not be unlocked — it may be corrupted or use an unsupported kind of encryption."
    );
  }
}

/* -------------------------------- 3 · redact ------------------------------- */

interface TermBox {
  /** all in PDF points, origin bottom-left */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageTermBoxes {
  boxes: TermBox[];
  widthPt: number;
  heightPt: number;
}

export interface RedactScan {
  pageCount: number;
  /** pages that actually had a text layer */
  pagesWithText: number;
  /** 1-based pages where at least one term was located */
  pages: number[];
  occurrenceCount: number;
  boxesByPage: Map<number, PageTermBoxes>;
}

export interface RedactPreview {
  pageCount: number;
  pages: number[];
  occurrences: number;
  pagesWithText: number;
}

interface TextChunk {
  str: string;
  width: number;
  height: number;
  transform: number[];
  hasEOL: boolean;
}

/** Split on commas / newlines, trim, dedupe case-insensitively. */
export function normalizeTerms(raw: string | string[]): string[] {
  const pieces = (Array.isArray(raw) ? raw : [raw]).flatMap((s) =>
    s.split(/[\n,]+/)
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of pieces) {
    const term = piece.trim();
    const key = term.toLowerCase();
    if (term && !seen.has(key)) {
      seen.add(key);
      out.push(term);
    }
  }
  return out;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Turn a [start, end) range in the NORMALIZED page text back into black boxes
 * in PDF points. The normalized text is built with the exact same join rule
 * as the kit's extractTextPerPage (item.str + " " on hasEOL, whitespace
 * collapsed), so the "Find terms" preview and the redaction pass always agree
 * on what matches. Ranges that cross an item boundary (or a line break)
 * produce one box fragment per item.
 */
function boxesForRange(
  chunks: Array<{ chunk: TextChunk; start: number }>,
  normToRaw: number[],
  start: number,
  end: number
): TermBox[] {
  if (start >= end) return [];
  const rawStart = normToRaw[start];
  const rawEnd = normToRaw[end - 1] + 1;
  const boxes: TermBox[] = [];
  for (const { chunk, start: cs } of chunks) {
    const s = Math.max(rawStart, cs);
    const e = Math.min(rawEnd, cs + chunk.str.length);
    if (e <= s) continue;
    const cw = chunk.str.length > 0 ? chunk.width / chunk.str.length : 0;
    boxes.push({
      x: chunk.transform[4] + (s - cs) * cw,
      y: chunk.transform[5],
      w: (e - s) * cw,
      h: chunk.height > 0 ? chunk.height : 10,
    });
  }
  return boxes;
}

/**
 * Scan every page's text layer and compute the exact rectangles to burn out.
 * Uses the same lazy pdf.js loader pattern as the kit.
 */
async function scanForTerms(
  bytes: Uint8Array,
  terms: string[],
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<RedactScan> {
  const handle = await loadPdfjsDoc(bytes);
  const doc = handle.doc;
  const n = doc.numPages;
  const scan: RedactScan = {
    pageCount: n,
    pagesWithText: 0,
    pages: [],
    occurrenceCount: 0,
    boxesByPage: new Map(),
  };
  try {
    for (let i = 1; i <= n; i++) {
      throwIfAborted(signal);
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();

      // Raw concatenation of the text items (same join rule as the kit).
      const chunks: Array<{ chunk: TextChunk; start: number }> = [];
      let concat = "";
      for (const raw of tc.items) {
        if (!("str" in raw)) continue;
        const chunk = raw as TextChunk;
        chunks.push({ chunk, start: concat.length });
        concat += chunk.str;
        if (chunk.hasEOL) concat += " ";
      }

      // Collapse whitespace exactly like extractTextPerPage's
      // `.replace(/\s+/g, " ").trim()`, but keep a map from each normalized
      // char back to its raw position so boxes land on the right glyphs.
      const normToRaw: number[] = [];
      let norm = "";
      let lastWasSpace = true; // also trims leading whitespace
      for (let c = 0; c < concat.length; c++) {
        const ch = concat[c];
        if (/\s/.test(ch)) {
          if (lastWasSpace) continue;
          norm += " ";
          normToRaw.push(c);
          lastWasSpace = true;
        } else {
          norm += ch;
          normToRaw.push(c);
          lastWasSpace = false;
        }
      }
      if (norm.endsWith(" ")) {
        norm = norm.slice(0, -1);
        normToRaw.pop();
      }

      if (norm.length > 0) scan.pagesWithText++;

      const boxes: TermBox[] = [];
      for (const term of terms) {
        const t = normalizeForMatch(term);
        if (!t) continue;
        let idx = norm.indexOf(t);
        while (idx !== -1) {
          scan.occurrenceCount++;
          boxes.push(...boxesForRange(chunks, normToRaw, idx, idx + t.length));
          idx = norm.indexOf(t, idx + t.length);
        }
      }

      if (boxes.length) {
        const base = page.getViewport({ scale: 1 });
        scan.pages.push(i);
        scan.boxesByPage.set(i, {
          boxes,
          widthPt: base.width,
          heightPt: base.height,
        });
      }
      page.cleanup();
      onProgress?.(i, n);
    }
  } finally {
    await handle.destroy();
  }
  return scan;
}

/** The component's "Find terms" mini-flow — same matcher the redactor uses. */
export async function findRedactablePages(
  file: File,
  terms: string[]
): Promise<RedactPreview> {
  const list = normalizeTerms(terms);
  if (!list.length) throw new Error("Enter at least one term to look for.");
  const scan = await scanForTerms(await fileBytes(file), list);
  return {
    pageCount: scan.pageCount,
    pages: scan.pages,
    occurrences: scan.occurrenceCount,
    pagesWithText: scan.pagesWithText,
  };
}

/** Paint the black boxes onto a rendered page canvas (+2px padding). */
function paintBoxes(
  canvas: HTMLCanvasElement,
  info: PageTermBoxes | undefined
): void {
  if (!info || !info.boxes.length) return;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return;
  const sx = canvas.width / info.widthPt;
  const sy = canvas.height / info.heightPt;
  const PAD = 2;
  ctx2d.fillStyle = "#000000";
  for (const box of info.boxes) {
    const x = box.x * sx - PAD;
    const y = canvas.height - (box.y + box.h) * sy - PAD;
    ctx2d.fillRect(x, y, box.w * sx + PAD * 2, box.h * sy + PAD * 2);
  }
}

/**
 * Redact terms for good: affected pages are re-rendered at 150 DPI with the
 * term boxes burned in as black rectangles and rebuilt as pictures (the text
 * underneath is gone); every unaffected page is copied structurally and keeps
 * its real, selectable text.
 */
export async function redactTerms(
  file: File,
  terms: string[],
  ctx: RunCtx
): Promise<ToolOutput> {
  const list = normalizeTerms(terms);
  if (!list.length) throw new Error("Enter at least one term to redact.");

  const bytes = await fileBytes(file);
  throwIfAborted(ctx.signal);

  ctx.progress({ percent: 4, detail: "Opening the document…" });
  const src = await loadPdf(bytes);
  if (src.isEncrypted) {
    throw new Error(
      "This PDF is password-protected — remove the password first (see Remove Password), then redact."
    );
  }

  ctx.progress({ percent: 8, detail: "Scanning the text layer…" });
  const scan = await scanForTerms(
    bytes,
    list,
    (done, total) =>
      ctx.progress({
        percent: 8 + Math.round((done / total) * 24),
        detail: `Scanning page ${done} of ${total}`,
      }),
    ctx.signal
  );
  const affected = scan.pages;
  if (!affected.length) {
    throw new Error(
      "None of the terms were found in the text layer — scanned pages can't be located by text. Nothing was changed."
    );
  }

  ctx.progress({
    percent: 34,
    detail: `Burning out terms on ${plural(affected.length, "page")}…`,
  });
  const canvases = await renderPages(bytes, {
    dpi: 150,
    pages: affected,
    signal: ctx.signal,
    onProgress: (done, total) =>
      ctx.progress({
        percent: 36 + Math.round((done / total) * 30),
        detail: `Rasterizing page ${done} of ${total}`,
      }),
    transform: (canvas, pageNum) => paintBoxes(canvas, scan.boxesByPage.get(pageNum)),
  });
  throwIfAborted(ctx.signal);
  const canvasByPage = new Map<number, HTMLCanvasElement>();
  affected.forEach((p, i) => canvasByPage.set(p, canvases[i]));

  // Rebuild: redacted pages become pictures, the rest are structural copies.
  const out = await PDFDocument.create();
  const n = src.getPageCount();
  const unaffectedIndices = Array.from({ length: n }, (_, k) => k).filter(
    (k) => !scan.boxesByPage.has(k + 1)
  );
  const copied: PDFPage[] = unaffectedIndices.length
    ? await out.copyPages(src, unaffectedIndices)
    : [];
  const copiedByPage = new Map<number, PDFPage>();
  unaffectedIndices.forEach((idx, k) => copiedByPage.set(idx + 1, copied[k]));

  for (let p = 1; p <= n; p++) {
    throwIfAborted(ctx.signal);
    const info = scan.boxesByPage.get(p);
    if (info) {
      const jpeg = await canvasToJpegBytes(canvasByPage.get(p) as HTMLCanvasElement, 0.85);
      const img = await out.embedJpg(jpeg);
      const page = out.addPage([info.widthPt, info.heightPt]);
      page.drawImage(img, { x: 0, y: 0, width: info.widthPt, height: info.heightPt });
    } else {
      out.addPage(copiedByPage.get(p) as PDFPage);
    }
    ctx.progress({
      percent: 68 + Math.round((p / n) * 28),
      detail: `Rebuilding page ${p} of ${n}`,
    });
  }

  const saved = await out.save({ useObjectStreams: true });
  return pdfOutput(
    `${baseName(file.name)}-redacted.pdf`,
    saved,
    `${plural(n, "page")} · ${affected.length} redacted · ${formatBytes(saved.length)}`
  );
}

/* -------------------------------- 4 · flatten ------------------------------ */

/**
 * Freeze forms, layers & annotations into plain pages: every page is
 * re-rendered at 150 DPI and rebuilt as a JPEG picture.
 */
export async function flattenPdf(file: File, ctx: RunCtx): Promise<ToolOutput> {
  const bytes = await fileBytes(file);
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 5, detail: "Rendering pages…" });

  let saved: Uint8Array;
  try {
    saved = await rasterizePdfBytes(
      bytes,
      {
        dpi: 150,
        signal: ctx.signal,
        onProgress: (done, total) =>
          ctx.progress({
            percent: Math.min(95, 6 + Math.round((done / total) * 88)),
            detail: `Rasterizing page ${done} of ${total}`,
          }),
      },
      { dpi: 150, quality: 0.85 }
    );
  } catch (err) {
    if (isAbort(err)) throw err;
    if (err instanceof Error && err.message.startsWith("This document")) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (/password/i.test(msg)) {
      throw new Error(
        "This PDF is password-protected — remove the password first (see Remove Password), then flatten."
      );
    }
    throw new Error(
      "This PDF could not be flattened — it may be corrupted or use unsupported features."
    );
  }

  return pdfOutput(
    `${baseName(file.name)}-flattened.pdf`,
    saved,
    `Flattened at 150 DPI · ${formatBytes(saved.length)}`
  );
}

/* -------------------------------- 5 · sanitize ----------------------------- */

/**
 * Rebuild-free sanitize: remove document JavaScript, embedded file
 * attachments, XFA forms and tracking metadata in place, so outline bookmarks,
 * named destinations and (optionally kept) annotations survive with valid
 * references. Link annotations can be stripped on request (this removes ALL
 * page annotations — documented trade-off).
 */
export async function sanitizePdf(
  file: File,
  opts: { removeLinks: boolean },
  ctx: RunCtx
): Promise<ToolOutput> {
  const bytes = await fileBytes(file);
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 10, detail: "Reading the document…" });

  const doc = await loadPdf(bytes);
  if (doc.isEncrypted) {
    throw new Error(
      "This PDF is password-protected — remove the password first (see Remove Password), then sanitize."
    );
  }
  const catalog = doc.catalog;

  // Document-level JavaScript actions.
  try {
    catalog.delete(PDFName.of("JavaScript"));
    catalog.delete(PDFName.of("OpenAction"));
    catalog.delete(PDFName.of("AA"));
  } catch {
    /* structural oddity — best effort */
  }

  // Name trees: embedded files + named JavaScript. Named destinations
  // (/Names /Dests) are KEPT so bookmarks and internal links still work.
  try {
    const names = catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
    if (names) {
      names.delete(PDFName.of("EmbeddedFiles"));
      names.delete(PDFName.of("JavaScript"));
    }
  } catch {
    /* best effort */
  }

  // XFA forms (the hidden XML layer), while normal AcroForm fields stay.
  try {
    const acroForm = catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    if (acroForm) acroForm.delete(PDFName.of("XFA"));
  } catch {
    /* best effort */
  }

  // Tracking metadata: XMP packet + Info dictionary.
  try {
    catalog.delete(PDFName.of("Metadata"));
  } catch {
    /* guarded per spec */
  }
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("FixMyPDF (in-browser)");
  doc.setCreator("FixMyPDF (in-browser)");

  if (opts.removeLinks) {
    ctx.progress({ percent: 45, detail: "Removing link annotations…" });
    const pages = doc.getPages();
    for (let i = 0; i < pages.length; i++) {
      throwIfAborted(ctx.signal);
      pages[i].node.delete(PDFName.of("Annots"));
      ctx.progress({
        percent: 45 + Math.round(((i + 1) / pages.length) * 30),
        detail: `Stripping annotations — page ${i + 1} of ${pages.length}`,
      });
    }
  }

  ctx.progress({ percent: 85, detail: "Saving the clean copy…" });
  const saved = await savePdf(doc);
  return pdfOutput(
    `${baseName(file.name)}-sanitized.pdf`,
    saved,
    `Clean copy · ${pageMetaOf(doc, saved)}`
  );
}

function pageMetaOf(doc: { getPageCount(): number }, bytes: Uint8Array): string {
  return `${plural(doc.getPageCount(), "page")} · ${formatBytes(bytes.length)}`;
}

/* -------------------------------- 6 · metadata ----------------------------- */

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created: Date | null;
  modified: Date | null;
  pageCount: number;
}

async function loadMetadataDoc(bytes: Uint8Array): Promise<PDFDocument> {
  const doc = await loadPdf(bytes);
  if (doc.isEncrypted) {
    throw new Error(
      "This PDF is password-protected — remove the password first (see Remove Password) to edit its metadata."
    );
  }
  return doc;
}

/** Read the current Info-dictionary metadata for the editor form. */
export async function readPdfMetadata(file: File): Promise<PdfMetadata> {
  const doc = await loadMetadataDoc(await fileBytes(file));
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    creator: doc.getCreator() ?? "",
    producer: doc.getProducer() ?? "",
    created: doc.getCreationDate() ?? null,
    modified: doc.getModificationDate() ?? null,
    pageCount: doc.getPageCount(),
  };
}

export interface MetadataFields {
  title: string;
  author: string;
  subject: string;
  /** comma-separated */
  keywords: string;
}

/** Apply the edited fields and stamp a fresh modification date. */
export async function applyMetadata(
  file: File,
  fields: MetadataFields,
  ctx: RunCtx
): Promise<ToolOutput> {
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 30, detail: "Rewriting metadata…" });
  const doc = await loadMetadataDoc(await fileBytes(file));
  doc.setTitle(fields.title);
  doc.setAuthor(fields.author);
  doc.setSubject(fields.subject);
  doc.setKeywords(
    fields.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  );
  doc.setModificationDate(new Date());
  ctx.progress({ percent: 70, detail: "Saving…" });
  const saved = await savePdf(doc);
  return pdfOutput(
    `${baseName(file.name)}-meta.pdf`,
    saved,
    `Metadata updated · ${plural(doc.getPageCount(), "page")} · ${formatBytes(saved.length)}`
  );
}

/** Wipe every identity field and the XMP packet; producer becomes FixMyPDF. */
export async function wipeMetadata(file: File, ctx: RunCtx): Promise<ToolOutput> {
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 30, detail: "Wiping metadata…" });
  const doc = await loadMetadataDoc(await fileBytes(file));
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setCreator("FixMyPDF (in-browser)");
  doc.setProducer("FixMyPDF (in-browser)");
  doc.setModificationDate(new Date());
  try {
    doc.catalog.delete(PDFName.of("Metadata")); // XMP packet holds the juicy bits
  } catch {
    /* guarded */
  }
  ctx.progress({ percent: 70, detail: "Saving…" });
  const saved = await savePdf(doc);
  return pdfOutput(
    `${baseName(file.name)}-clean.pdf`,
    saved,
    `Metadata wiped · ${plural(doc.getPageCount(), "page")} · ${formatBytes(saved.length)}`
  );
}
