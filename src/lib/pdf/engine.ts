/**
 * FixMyPDF client-side engine.
 *
 * Everything runs 100% in the browser:
 *  - pdf.js renders pages to canvas (analysis, raster compression, text search)
 *  - pdf-lib performs structural surgery (extract / remove / trim / metadata)
 * Zero bytes leave the machine.
 */
import { PDFDocument } from "pdf-lib";
import { getPdfjs, loadPdfjsDoc } from "./pdfjs";
import { baseName, formatBytes, pagesForFilename } from "./format";

/* ---------------------------------- types ---------------------------------- */

export interface EngineProgress {
  phase: string;
  percent: number;
  detail?: string;
}

export interface BasicInfo {
  pageCount: number;
  encrypted: boolean;
}

export interface CompressionPass {
  label: string;
  size: number;
  ok: boolean;
  note?: string;
}

export interface FitResult {
  blob: Blob;
  filename: string;
  size: number;
  originalSize: number;
  passes: CompressionPass[];
  success: boolean;
  pagesOut: number;
  method: "metadata-only" | "rasterized";
  trimmedToPages?: number;
  pagesBeforeTrim?: number;
}

export interface PageAnalysis {
  pageCount: number;
  /** dataURLs, index 0 = page 1 */
  thumbs: string[];
  /** fraction of non-near-white pixels, index 0 = page 1 */
  inkRatios: number[];
}

export type BlankSensitivity = "conservative" | "normal" | "lenient";

export const BLANK_THRESHOLDS: Record<BlankSensitivity, number> = {
  // fraction of pixels that are allowed to be "ink" on a page still called blank
  conservative: 0.002,
  normal: 0.006,
  lenient: 0.015,
};

export interface TextSearchOutcome {
  query: string;
  pages: number[];
  snippets: Record<number, string>;
  matchCount: number;
  /** pages that actually had a text layer */
  pagesWithText: number;
  pageCount: number;
}

/* --------------------------------- helpers --------------------------------- */

function bytesToBlob(data: Uint8Array, type = "application/pdf"): Blob {
  const ab = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;
  return new Blob([ab], { type });
}

async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Remove metadata / producer / tracking info. Returns a re-serialized PDF. */
async function stripMetadataBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("FixMyPDF (in-browser)");
  doc.setCreator("FixMyPDF (in-browser)");
  return await doc.save({ useObjectStreams: true });
}

function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode a page to JPEG."));
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

/* ------------------------------- basic info -------------------------------- */

export async function getBasicInfo(file: File): Promise<BasicInfo> {
  const bytes = await readBytes(file);
  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    return { pageCount: doc.getPageCount(), encrypted: doc.isEncrypted };
  } catch {
    try {
      const handle = await loadPdfjsDoc(bytes);
      const n = handle.doc.numPages;
      await handle.destroy();
      return { pageCount: n, encrypted: false };
    } catch {
      throw new Error(
        "This file could not be read as a PDF — it may be corrupted or password-protected."
      );
    }
  }
}

/* ----------------------------- page surgery -------------------------------- */

async function requireStructuralAccess(file: File): Promise<PDFDocument> {
  const bytes = await readBytes(file);
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  if (doc.isEncrypted) {
    throw new Error(
      "This PDF is password-protected. Open it once and re-save it without a password, then try again."
    );
  }
  return doc;
}

export async function extractPagesToFile(
  file: File,
  pages: number[],
  onProgress?: (p: EngineProgress) => void
): Promise<{ blob: Blob; filename: string; pagesOut: number }> {
  if (!pages.length) throw new Error("Select at least one page first.");
  onProgress?.({
    phase: "Cutting pages",
    percent: 30,
    detail: `Keeping ${pages.length} pages`,
  });
  const src = await requireStructuralAccess(file);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p - 1)
  );
  for (const pg of copied) out.addPage(pg);
  const saved = await out.save({ useObjectStreams: true });
  onProgress?.({ phase: "Cutting pages", percent: 100 });
  return {
    blob: bytesToBlob(saved),
    filename: `${baseName(file.name)}-pages-${pagesForFilename(pages)}.pdf`,
    pagesOut: out.getPageCount(),
  };
}

export async function removePagesFromFile(
  file: File,
  pages: number[],
  onProgress?: (p: EngineProgress) => void
): Promise<{ blob: Blob; filename: string; pagesOut: number }> {
  if (!pages.length) throw new Error("Enter the pages you want removed.");
  onProgress?.({
    phase: "Removing pages",
    percent: 30,
    detail: `Removing ${pages.length} pages`,
  });
  const doc = await requireStructuralAccess(file);
  const sorted = [...new Set(pages)].sort((a, b) => b - a);
  for (const p of sorted) doc.removePage(p - 1);
  const saved = await doc.save({ useObjectStreams: true });
  onProgress?.({ phase: "Removing pages", percent: 100 });
  return {
    blob: bytesToBlob(saved),
    filename: `${baseName(file.name)}-trimmed.pdf`,
    pagesOut: doc.getPageCount(),
  };
}

/* ------------------------------ analysis pass ------------------------------ */

/**
 * One render pass per page that yields BOTH a thumbnail (dataURL) and an ink
 * ratio used for blank-page detection. Cached by the UI per file.
 */
export async function analyzeDocument(
  file: File,
  onProgress?: (p: EngineProgress) => void
): Promise<PageAnalysis> {
  const bytes = await readBytes(file);
  const handle = await loadPdfjsDoc(bytes);
  const doc = handle.doc;
  const n = doc.numPages;
  const thumbs: string[] = [];
  const inkRatios: number[] = [];
  try {
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.max(0.05, 150 / Math.max(base.width, 1));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let ink = 0;
      const total = canvas.width * canvas.height;
      for (let px = 0; px < data.length; px += 4) {
        if (data[px] < 245 || data[px + 1] < 245 || data[px + 2] < 245) ink++;
      }
      inkRatios.push(ink / Math.max(total, 1));
      try {
        thumbs.push(canvas.toDataURL("image/jpeg", 0.55));
      } catch {
        thumbs.push("");
      }
      page.cleanup();
      if (i % 3 === 0 || i === n) {
        onProgress?.({
          phase: "Analyzing pages",
          percent: Math.round((i / n) * 100),
          detail: `Page ${i} of ${n}`,
        });
      }
    }
  } finally {
    await handle.destroy();
  }
  return { pageCount: n, thumbs, inkRatios };
}

export function detectBlankPages(
  analysis: PageAnalysis,
  sensitivity: BlankSensitivity
): number[] {
  const threshold = BLANK_THRESHOLDS[sensitivity];
  const out: number[] = [];
  analysis.inkRatios.forEach((ratio, i) => {
    if (ratio < threshold) out.push(i + 1);
  });
  return out;
}

/* ------------------------------ text search -------------------------------- */

export async function findPagesWithText(
  file: File,
  query: string,
  onProgress?: (p: EngineProgress) => void
): Promise<TextSearchOutcome> {
  const q = query.trim().toLowerCase();
  if (!q) throw new Error("Type a word or phrase to search for.");
  const bytes = await readBytes(file);
  const handle = await loadPdfjsDoc(bytes);
  const doc = handle.doc;
  const n = doc.numPages;
  const pages: number[] = [];
  const snippets: Record<number, string> = {};
  let matchCount = 0;
  let pagesWithText = 0;
  try {
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let text = "";
      for (const item of tc.items) {
        if ("str" in item) {
          text += item.str;
          if (item.hasEOL) text += " ";
        }
      }
      text = text.replace(/\s+/g, " ").trim();
      if (text.length > 0) pagesWithText++;

      const lower = text.toLowerCase();
      let idx = lower.indexOf(q);
      const first = idx;
      while (idx !== -1) {
        matchCount++;
        idx = lower.indexOf(q, idx + q.length);
      }
      if (first !== -1) {
        pages.push(i);
        const start = Math.max(0, first - 42);
        const end = Math.min(text.length, first + q.length + 64);
        snippets[i] =
          (start > 0 ? "…" : "") +
          text.slice(start, end) +
          (end < text.length ? "…" : "");
      }
      page.cleanup();
      onProgress?.({
        phase: "Searching",
        percent: Math.round((i / n) * 100),
        detail: `Page ${i} of ${n}`,
      });
    }
  } finally {
    await handle.destroy();
  }
  return { query, pages, snippets, matchCount, pagesWithText, pageCount: n };
}

/* ------------------------------- make it fit ------------------------------- */

interface LadderStep {
  dpi: number;
  quality: number;
  label: string;
}

const COMPRESSION_LADDER: LadderStep[] = [
  { dpi: 144, quality: 0.72, label: "Pass 1 · High-fidelity raster (144 DPI)" },
  { dpi: 110, quality: 0.62, label: "Pass 2 · Balanced raster (110 DPI)" },
  { dpi: 96, quality: 0.52, label: "Pass 3 · Compact raster (96 DPI)" },
  { dpi: 72, quality: 0.45, label: "Pass 4 · Small raster (72 DPI)" },
  { dpi: 54, quality: 0.36, label: "Pass 5 · Ultra-light raster (54 DPI)" },
];

/**
 * Render every page through canvas and rebuild the PDF from JPEGs.
 * Deterministic: same input + same step => same output.
 */
async function rasterizePdf(
  bytes: Uint8Array,
  dpi: number,
  quality: number,
  grayscale: boolean,
  onPage?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const handle = await loadPdfjsDoc(bytes);
  const doc = handle.doc;
  const out = await PDFDocument.create();
  try {
    const n = doc.numPages;
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      let scale = dpi / 72;
      const MAX_SIDE = 2200;
      const longest = Math.max(base.width, base.height);
      if (longest * scale > MAX_SIDE) scale = MAX_SIDE / longest;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (grayscale) ctx.filter = "grayscale(1)";
      await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

      const jpeg = await canvasToJpegBytes(canvas, quality);
      const img = await out.embedJpg(jpeg);
      const outPage = out.addPage([base.width, base.height]);
      outPage.drawImage(img, {
        x: 0,
        y: 0,
        width: base.width,
        height: base.height,
      });
      page.cleanup();
      onPage?.(i, n);
    }
  } finally {
    await handle.destroy();
  }
  return await out.save({ useObjectStreams: true });
}

export interface FitOptions {
  targetBytes?: number;
  grayscale: boolean;
  stripMetadata: boolean;
  onProgress?: (p: EngineProgress) => void;
}

/**
 * The flagship. Tries, in order:
 *   0. metadata strip only (keeps text perfectly selectable)
 *   1..5. raster ladder — each pass re-renders pages at lower DPI/quality
 * Stops at the first pass that fits the target. Reports every pass honestly.
 */
export async function makeItFit(file: File, opts: FitOptions): Promise<FitResult> {
  const { targetBytes, grayscale, stripMetadata, onProgress } = opts;
  if (targetBytes === undefined && !stripMetadata) {
    throw new Error(
      "Nothing to do — set a size limit or allow metadata stripping."
    );
  }
  const originalBytes = await readBytes(file);
  const originalSize = originalBytes.length;
  const pageCount = (await getBasicInfo(file)).pageCount;
  const passes: CompressionPass[] = [
    { label: "Original file", size: originalSize, ok: false },
  ];

  const totalUnits = (stripMetadata ? 1 : 0) + COMPRESSION_LADDER.length;
  let unit = 0;
  const unitPercent = (doneInUnit: number) =>
    Math.min(99, Math.round(((unit + doneInUnit) / Math.max(totalUnits, 1)) * 100));

  // ---- pass 0: metadata strip (text stays selectable)
  let baseBytes = originalBytes;
  if (stripMetadata) {
    onProgress?.({
      phase: "Stripping metadata & tracking data",
      percent: unitPercent(0.4),
      detail: "Removing hidden producer / authoring info",
    });
    try {
      const stripped = await stripMetadataBytes(originalBytes);
      if (stripped.length < originalSize) baseBytes = stripped;
      passes.push({
        label: "Metadata & tracking data stripped",
        size: baseBytes.length,
        ok: targetBytes !== undefined ? baseBytes.length <= targetBytes : true,
        note: "Text remains 100% selectable",
      });
    } catch {
      passes.push({
        label: "Metadata & tracking data stripped",
        size: originalSize,
        ok: false,
        note: "Skipped — file is protected",
      });
    }
    unit += 1;
    if (targetBytes === undefined || baseBytes.length <= targetBytes) {
      onProgress?.({ phase: "Done", percent: 100 });
      return {
        blob: bytesToBlob(baseBytes),
        filename: `${baseName(file.name)}-clean.pdf`,
        size: baseBytes.length,
        originalSize,
        passes,
        success: true,
        pagesOut: pageCount,
        method: "metadata-only",
      };
    }
  }

  // ---- raster ladder
  let bestBytes = baseBytes;
  let bestPassIndex = -1; // index into passes
  let success = false;

  for (let li = 0; li < COMPRESSION_LADDER.length; li++) {
    const step = COMPRESSION_LADDER[li];
    try {
      const built = await rasterizePdf(
        baseBytes,
        step.dpi,
        step.quality,
        grayscale,
        (done, total) => {
          onProgress?.({
            phase: `${step.label}`,
            percent: unitPercent(done / total),
            detail: `Rebuilding page ${done} of ${total}`,
          });
        }
      );
      const ok = built.length <= (targetBytes ?? Infinity);
      passes.push({
        label: step.label,
        size: built.length,
        ok,
        note: grayscale ? "Grayscale" : undefined,
      });
      unit += 1;
      if (built.length < bestBytes.length) {
        bestBytes = built;
        bestPassIndex = passes.length - 1;
      }
      if (ok) {
        success = true;
        break;
      }
    } catch (err) {
      passes.push({
        label: step.label,
        size: NaN,
        ok: false,
        note: err instanceof Error ? err.message : "Pass failed",
      });
      unit += 1;
    }
  }

  onProgress?.({ phase: "Done", percent: 100 });
  return {
    blob: bytesToBlob(bestBytes),
    filename: `${baseName(file.name)}-fit-${formatBytes(bestBytes.length).replace(/\s/g, "")}.pdf`,
    size: bestBytes.length,
    originalSize,
    passes,
    success: targetBytes === undefined ? true : success,
    pagesOut: pageCount,
    method: "rasterized",
  };
}

/* --------------------------- "the website says…" --------------------------- */

export interface ApplyOptions {
  grayscale: boolean;
  stripMetadata: boolean;
  onProgress?: (p: EngineProgress) => void;
}

/**
 * Apply pasted portal requirements deterministically:
 *  1. trim to maxPages (keeps the FIRST N pages)
 *  2. compress to maxBytes via makeItFit
 */
export async function applyRequirements(
  file: File,
  reqs: { maxBytes?: number; maxPages?: number },
  opts: ApplyOptions
): Promise<FitResult> {
  const { maxBytes, maxPages } = reqs;
  if (maxBytes === undefined && maxPages === undefined) {
    throw new Error(
      "No usable requirement found — paste text that mentions a size (e.g. “2 MB”) or pages (e.g. “max 10 pages”)."
    );
  }

  const pageCount = (await getBasicInfo(file)).pageCount;
  let workFile = file;
  let trimmedTo: number | undefined;

  if (maxPages !== undefined && pageCount > maxPages) {
    opts.onProgress?.({
      phase: "Trimming pages",
      percent: 10,
      detail: `Keeping the first ${maxPages} of ${pageCount} pages`,
    });
    try {
      const src = await requireStructuralAccess(file);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(
        src,
        Array.from({ length: maxPages }, (_, i) => i)
      );
      for (const pg of copied) out.addPage(pg);
      const saved = await out.save({ useObjectStreams: true });
      workFile = new File([bytesToBlob(saved)], file.name, {
        type: "application/pdf",
      });
      trimmedTo = maxPages;
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Could not trim pages on this document.");
    }
  }

  const result = await makeItFit(workFile, {
    targetBytes: maxBytes,
    grayscale: opts.grayscale,
    stripMetadata: opts.stripMetadata,
    onProgress: opts.onProgress,
  });

  return {
    ...result,
    filename:
      trimmedTo !== undefined
        ? `${baseName(file.name)}-fit.pdf`
        : result.filename,
    trimmedToPages: trimmedTo,
    pagesBeforeTrim: pageCount,
  };
}
