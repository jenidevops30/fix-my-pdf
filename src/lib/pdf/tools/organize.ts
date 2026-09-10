/**
 * Tool Shed — "organize" engine (merge / split / rotate / reorder / reverse /
 * insert blank / duplicate).
 *
 * Pure structural surgery with pdf-lib: pages are copied between documents,
 * nothing is re-rendered and nothing ever leaves the browser. pdf.js is NEVER
 * imported here — previews belong to the UI layer via engine/kit render
 * helpers. Every function honors `ctx.progress` + `ctx.signal` and throws
 * friendly `Error`s with human messages.
 */
import { PDFDocument, degrees } from "pdf-lib";
import { baseName, formatBytes, pagesForFilename, parsePageSpec } from "../format";
import { loadPdf, pdfOutput, savePdf, throwIfAborted } from "./kit";
import type { RunCtx, ToolOutput } from "./types";

/* -------------------------------- guards ---------------------------------- */

export const ENCRYPTED_PDF_MESSAGE =
  "This PDF is password-protected. Unlock it first (Protect & Clean → Remove password).";

/** loadPdf sets ignoreEncryption, so the load succeeds — but surgery on an
 *  encrypted file can corrupt it. Every tool checks honestly instead. */
function assertNotEncrypted(doc: PDFDocument): void {
  if (doc.isEncrypted) throw new Error(ENCRYPTED_PDF_MESSAGE);
}

function assertHasPages(doc: PDFDocument, context: string): void {
  if (doc.getPageCount() === 0) throw new Error(`${context} has no pages to process.`);
}

/** True when `order` contains every index of 0..n-1 exactly once. */
export function isPermutation(order: number[], n: number): boolean {
  if (order.length !== n) return false;
  const seen = new Array<boolean>(n).fill(false);
  for (const i of order) {
    if (!Number.isInteger(i) || i < 0 || i >= n || seen[i]) return false;
    seen[i] = true;
  }
  return true;
}

/* ------------------------------ page groups ------------------------------- */

/**
 * Parse a split spec like "1-3, 4, 5-9" into groups — every comma-separated
 * token becomes one output PDF. Each token is validated with parsePageSpec
 * against the real page count.
 */
export function parseGroups(spec: string, maxPage: number): number[][] {
  const cleaned = spec.replace(/[–—]/g, "-").trim();
  if (!cleaned) throw new Error("Enter at least one page group, e.g. 1-3, 4, 5-9.");
  if (maxPage < 1) throw new Error("This document has no pages.");
  const tokens = cleaned.split(",").map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) throw new Error("Enter at least one page group, e.g. 1-3, 4, 5-9.");
  return tokens.map((token, i) => {
    try {
      const pages = parsePageSpec(token, maxPage);
      if (!pages.length) throw new Error("This group is empty.");
      return pages;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "invalid page range";
      throw new Error(`Group ${i + 1} (“${token}”): ${msg}`);
    }
  });
}

/** [1..pageCount] chunked into runs of `size` pages (last run may be shorter). */
export function chunkEveryN(pageCount: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("Pages per file must be at least 1.");
  if (pageCount < 1) throw new Error("This document has no pages.");
  const groups: number[][] = [];
  for (let start = 1; start <= pageCount; start += size) {
    const end = Math.min(start + size - 1, pageCount);
    const group: number[] = [];
    for (let p = start; p <= end; p++) group.push(p);
    groups.push(group);
  }
  return groups;
}

/* --------------------------------- merge ---------------------------------- */

/**
 * Merge several PDFs, in the order given, into one fresh document.
 * Output name: {first-file-name}-merged.pdf
 */
export async function mergePdfs(files: File[], ctx: RunCtx): Promise<ToolOutput> {
  if (files.length < 2) throw new Error("Add at least two PDFs to merge.");
  const out = await PDFDocument.create();
  let pagesIn = 0;
  for (let i = 0; i < files.length; i++) {
    throwIfAborted(ctx.signal);
    const f = files[i];
    ctx.progress({
      percent: Math.round((i / (files.length + 1)) * 90),
      detail: `Appending ${f.name} (${i + 1} of ${files.length})`,
    });
    const doc = await loadPdf(f);
    assertNotEncrypted(doc);
    assertHasPages(doc, `“${f.name}”`);
    const count = doc.getPageCount();
    const indices = Array.from({ length: count }, (_, k) => k);
    const copied = await out.copyPages(doc, indices);
    for (const pg of copied) out.addPage(pg);
    pagesIn += count;
  }
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 95, detail: "Writing the merged PDF…" });
  const bytes = await savePdf(out);
  const name = `${baseName(files[0].name)}-merged.pdf`;
  return pdfOutput(
    name,
    bytes,
    `${pagesIn} pages from ${files.length} PDFs · ${formatBytes(bytes.length)}`
  );
}

/* --------------------------------- split ---------------------------------- */

export interface SplitOpts {
  /** Name outputs {base}-page-001.pdf (one page per file) instead of {base}-pages-1-3.pdf. */
  singlePageNames?: boolean;
}

/**
 * Split one PDF into several: every group of page numbers becomes its own
 * fresh document built with copyPages.
 */
export async function splitPdf(
  file: File,
  groups: number[][],
  ctx: RunCtx,
  opts: SplitOpts = {}
): Promise<ToolOutput[]> {
  if (!groups.length) throw new Error("Nothing to split — no page groups were given.");
  const src = await loadPdf(file);
  assertNotEncrypted(src);
  assertHasPages(src, "This PDF");
  const pageCount = src.getPageCount();
  const base = baseName(file.name);
  const outputs: ToolOutput[] = [];
  for (let g = 0; g < groups.length; g++) {
    throwIfAborted(ctx.signal);
    const group = groups[g];
    if (!group.length) throw new Error(`Group ${g + 1} is empty — check your page ranges.`);
    for (const p of group) {
      if (p < 1 || p > pageCount) {
        throw new Error(`Page ${p} is out of range — this PDF has ${pageCount} pages.`);
      }
    }
    ctx.progress({
      percent: Math.round((g / groups.length) * 95),
      detail: `Building file ${g + 1} of ${groups.length} (pages ${pagesForFilename(group)})…`,
    });
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, group.map((p) => p - 1));
    for (const pg of copied) out.addPage(pg);
    const bytes = await savePdf(out);
    const name = opts.singlePageNames
      ? `${base}-page-${String(group[0]).padStart(3, "0")}.pdf`
      : `${base}-pages-${pagesForFilename(group)}.pdf`;
    outputs.push(
      pdfOutput(name, bytes, `${group.length} page${group.length === 1 ? "" : "s"} · ${formatBytes(bytes.length)}`)
    );
  }
  return outputs;
}

/* --------------------------------- rotate --------------------------------- */

export type RotationAngle = 90 | 180 | 270;

/**
 * Rotate pages clockwise by `angle`. `pages` is a validated 1-based list, or
 * null for every page. Existing per-page rotation is preserved and added to.
 */
export async function rotatePages(
  file: File,
  angle: RotationAngle,
  pages: number[] | null,
  ctx: RunCtx
): Promise<ToolOutput> {
  const doc = await loadPdf(file);
  assertNotEncrypted(doc);
  assertHasPages(doc, "This PDF");
  const pageCount = doc.getPageCount();
  let targets: Set<number>;
  if (pages) {
    for (const p of pages) {
      if (p < 1 || p > pageCount) {
        throw new Error(`Page ${p} is out of range — this PDF has ${pageCount} pages.`);
      }
    }
    targets = new Set(pages);
  } else {
    targets = new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
  }
  throwIfAborted(ctx.signal);
  ctx.progress({
    percent: 40,
    detail: `Rotating ${targets.size} of ${pageCount} pages by ${angle}°…`,
  });
  for (let i = 0; i < pageCount; i++) {
    if (!targets.has(i + 1)) continue;
    throwIfAborted(ctx.signal);
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((((current + angle) % 360) + 360) % 360));
  }
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 92, detail: "Writing the rotated PDF…" });
  const bytes = await savePdf(doc);
  return pdfOutput(
    `${baseName(file.name)}-rotated.pdf`,
    bytes,
    `${targets.size} page${targets.size === 1 ? "" : "s"} rotated ${angle}° · ${formatBytes(bytes.length)}`
  );
}

/* --------------------------------- reorder -------------------------------- */

/**
 * Rebuild the document with pages in `order` (0-based source indices — must
 * be a full permutation of the document's pages).
 */
export async function reorderPdfPages(
  file: File,
  order: number[],
  ctx: RunCtx
): Promise<ToolOutput> {
  const src = await loadPdf(file);
  assertNotEncrypted(src);
  assertHasPages(src, "This PDF");
  const pageCount = src.getPageCount();
  if (pageCount <= 1) throw new Error("Nothing to reorder — this PDF has a single page.");
  if (!isPermutation(order, pageCount)) {
    throw new Error("The new page order is incomplete — reset the order and try again.");
  }
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 40, detail: `Rebuilding ${pageCount} pages in the new order…` });
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  for (const pg of copied) out.addPage(pg);
  throwIfAborted(ctx.signal);
  const bytes = await savePdf(out);
  return pdfOutput(
    `${baseName(file.name)}-reordered.pdf`,
    bytes,
    `${pageCount} pages · ${formatBytes(bytes.length)}`
  );
}

/* --------------------------------- reverse -------------------------------- */

/** Flip the whole document back-to-front (copyPages from last to first). */
export async function reversePdfPages(file: File, ctx: RunCtx): Promise<ToolOutput> {
  const src = await loadPdf(file);
  assertNotEncrypted(src);
  assertHasPages(src, "This PDF");
  const pageCount = src.getPageCount();
  throwIfAborted(ctx.signal);
  ctx.progress({ percent: 40, detail: `Flipping ${pageCount} pages back-to-front…` });
  const order = Array.from({ length: pageCount }, (_, i) => pageCount - 1 - i);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  for (const pg of copied) out.addPage(pg);
  throwIfAborted(ctx.signal);
  const bytes = await savePdf(out);
  return pdfOutput(
    `${baseName(file.name)}-reversed.pdf`,
    bytes,
    `${pageCount} page${pageCount === 1 ? "" : "s"} · ${formatBytes(bytes.length)}`
  );
}

/* ------------------------------ insert blank ------------------------------ */

export type BlankPosition = { at: "start" } | { at: "end" } | { at: "after"; page: number };

/**
 * Insert one empty page matching the size of the document's first page,
 * at the start, at the end, or right after page N.
 */
export async function insertBlankPage(
  file: File,
  position: BlankPosition,
  ctx: RunCtx
): Promise<ToolOutput> {
  const src = await loadPdf(file);
  assertNotEncrypted(src);
  assertHasPages(src, "This PDF");
  const pageCount = src.getPageCount();
  const { width, height } = src.getPage(0).getSize();

  let idx: number;
  if (position.at === "start") {
    idx = 0;
  } else if (position.at === "end") {
    idx = pageCount;
  } else {
    const after = position.page;
    if (!Number.isInteger(after) || after < 1 || after > pageCount - 1) {
      if (pageCount === 1) {
        throw new Error("This PDF has a single page — insert at the start or end instead.");
      }
      throw new Error(`“After page” must be between 1 and ${pageCount - 1}.`);
    }
    idx = after;
  }

  throwIfAborted(ctx.signal);
  const where =
    position.at === "start" ? "at the start" : position.at === "end" ? "at the end" : `after page ${position.page}`;
  ctx.progress({ percent: 40, detail: `Inserting a blank page ${where}…` });

  const out = await PDFDocument.create();
  const indices = Array.from({ length: pageCount }, (_, i) => i);
  const copied = await out.copyPages(src, indices);
  for (const pg of copied) out.addPage(pg);
  out.insertPage(idx, [width, height]);
  throwIfAborted(ctx.signal);
  const bytes = await savePdf(out);
  return pdfOutput(
    `${baseName(file.name)}-with-blank.pdf`,
    bytes,
    `${out.getPageCount()} pages · ${formatBytes(bytes.length)}`
  );
}

/* -------------------------------- duplicate ------------------------------- */

/**
 * Clone pages: each selected page is repeated `times` more times directly
 * after the original. `pages` is a validated 1-based list, or null for every
 * page. copyPages accepts repeated indices, so nothing is re-rendered.
 */
export async function duplicatePdfPages(
  file: File,
  pages: number[] | null,
  times: number,
  ctx: RunCtx
): Promise<ToolOutput> {
  const src = await loadPdf(file);
  assertNotEncrypted(src);
  assertHasPages(src, "This PDF");
  const pageCount = src.getPageCount();
  const copies = Math.floor(times);
  if (!Number.isInteger(copies) || copies < 1 || copies > 10) {
    throw new Error("Copies must be a whole number from 1 to 10.");
  }
  let selected: Set<number>;
  if (pages) {
    for (const p of pages) {
      if (p < 1 || p > pageCount) {
        throw new Error(`Page ${p} is out of range — this PDF has ${pageCount} pages.`);
      }
    }
    selected = new Set(pages);
  } else {
    selected = new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
  }

  const order: number[] = [];
  for (let p = 1; p <= pageCount; p++) {
    order.push(p - 1);
    if (selected.has(p)) {
      for (let c = 0; c < copies; c++) order.push(p - 1);
    }
  }

  throwIfAborted(ctx.signal);
  ctx.progress({
    percent: 40,
    detail: `Building ${order.length} pages (${copies} cop${copies === 1 ? "y" : "ies"} after each selected page)…`,
  });
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  for (const pg of copied) out.addPage(pg);
  throwIfAborted(ctx.signal);
  const bytes = await savePdf(out);
  return pdfOutput(
    `${baseName(file.name)}-duplicated.pdf`,
    bytes,
    `${pageCount} → ${order.length} pages · ${formatBytes(bytes.length)}`
  );
}
