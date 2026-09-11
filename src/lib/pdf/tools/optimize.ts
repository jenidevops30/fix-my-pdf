/**
 * Tool Shed engines — "optimize" group (Shrink & Fit).
 *
 *  - resizeToPaper   vector re-layout of every page onto A4 / Letter
 *  - autoCropMargins content-aware ("auto") or exact-millimetre ("manual") crop
 *  - scaleToPixels   rebuild pages at an exact pixel size (1 px = 1 pt)
 *  - fixDpi          normalise every page to one raster resolution
 *  - reduceQuality   dial-based raster shrink (quality / grayscale / dpi)
 *
 * Everything runs 100% in the browser. pdf.js is only touched through the
 * lazy loader inside kit.ts — never imported here. Every engine:
 *   - loads via loadPdf and refuses encrypted documents with a friendly error;
 *   - reports progress per page ({ percent, detail });
 *   - honours cancellation via throwIfAborted;
 *   - returns deterministic bytes plus a short human meta line.
 */
import { PDFDocument, degrees } from "pdf-lib";
import {
  loadPdf,
  renderPages,
  savePdf,
  throwIfAborted,
  yieldToUi,
  formatBytes,
} from "./kit";
import { parsePageSpec } from "../format";
import type { ToolProgress } from "./types";

/* --------------------------------- types ---------------------------------- */

export interface OptimizeResult {
  bytes: Uint8Array;
  /** Short human line for the results list, e.g. "12 pages · A4". */
  meta: string;
}

export interface EngineOpts {
  onProgress?: (p: ToolProgress) => void;
  signal?: AbortSignal;
}

export type PaperKind = "a4" | "letter";
export type PaperOrientation = "portrait" | "landscape" | "auto";
export type CropMode = "auto" | "manual";
export type PixelFit = "contain" | "cover";

export interface MarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const ENCRYPTED_MSG =
  "This PDF is password-protected. Open it once and re-save it without a password, then try again.";

/* -------------------------------- helpers --------------------------------- */

/** Shared intake: load, refuse encrypted files, refuse empty documents. */
async function prepare(bytes: Uint8Array): Promise<{ doc: PDFDocument; pageCount: number }> {
  let doc: PDFDocument;
  try {
    doc = await loadPdf(bytes);
  } catch {
    throw new Error("This file could not be read as a PDF — it may be corrupted.");
  }
  if (doc.isEncrypted) throw new Error(ENCRYPTED_MSG);
  const pageCount = doc.getPageCount();
  if (!pageCount) throw new Error("This PDF has no pages.");
  return { doc, pageCount };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** Normalise a page /Rotate angle to the nearest multiple of 90 (0/90/180/270). */
function snapRotation(angle: number): number {
  const norm = ((Math.round(angle) % 360) + 360) % 360;
  return (Math.round(norm / 90) * 90) % 360;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode a page image."));
          return;
        }
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))).catch(reject);
      },
      "image/jpeg",
      quality
    );
  });
}

/* ------------------------- 1. resize to A4 / Letter ------------------------ */

const PAPER_SIZES_PT: Record<PaperKind, { w: number; h: number }> = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};

/**
 * Target page dims for a source page. Fixed orientations use the paper as
 * given (or swapped); "auto" picks the orientation whose aspect ratio is
 * closest to the page's displayed shape.
 */
function resolveTarget(
  size: { w: number; h: number },
  orientation: PaperOrientation,
  dispW: number,
  dispH: number
): [number, number] {
  if (orientation === "landscape") return [size.h, size.w];
  if (orientation === "portrait") return [size.w, size.h];
  const aspect = dispW / Math.max(dispH, 1e-6);
  const portraitAspect = size.w / size.h;
  const landscapeAspect = size.h / size.w;
  return Math.abs(aspect - landscapeAspect) < Math.abs(aspect - portraitAspect)
    ? [size.h, size.w]
    : [size.w, size.h];
}

/**
 * Re-layout every page onto the chosen paper size, fully vector:
 * each source page is embedded once (single object copier — shared fonts and
 * images are NOT duplicated per page) and drawn centred, scaled to fit the
 * target minus a 0 margin, aspect preserved. Nothing is rasterized — text
 * stays sharp and selectable. Page /Rotate is honoured so scans land upright.
 */
export async function resizeToPaper(
  bytes: Uint8Array,
  opts: { paper: PaperKind; orientation: PaperOrientation } & EngineOpts
): Promise<OptimizeResult> {
  const { paper, orientation, onProgress, signal } = opts;
  const { doc: src, pageCount } = await prepare(bytes);
  const out = await PDFDocument.create();

  // Embed every source page up-front. Bounding boxes follow the visible
  // CropBox (embedder translates content to the box origin), so the output
  // shows exactly what a viewer would show.
  const srcPages = src.getPages();
  const boxes = srcPages.map((p) => {
    const b = p.getCropBox();
    return { left: b.x, bottom: b.y, right: b.x + b.width, top: b.y + b.height };
  });
  throwIfAborted(signal);
  onProgress?.({ percent: 4, detail: "Embedding vector content…" });
  const embedded = await out.embedPages(srcPages, boxes);

  const paperSize = PAPER_SIZES_PT[paper];
  for (let i = 0; i < pageCount; i++) {
    throwIfAborted(signal);
    const page = embedded[i];
    const rot = snapRotation(srcPages[i].getRotation().angle);
    const swap = rot === 90 || rot === 270;
    const dispW = swap ? page.height : page.width;
    const dispH = swap ? page.width : page.height;
    const [pw, ph] = resolveTarget(paperSize, orientation, dispW, dispH);

    const outPage = out.addPage([pw, ph]);
    if (page.width > 0 && page.height > 0 && dispW > 0 && dispH > 0) {
      const scale = Math.min(pw / dispW, ph / dispH);
      const drawW = page.width * scale;
      const drawH = page.height * scale;

      // drawPage pivots around (x, y) — the bottom-left of the un-rotated
      // rect — rotating counter-clockwise for positive angles. /Rotate r
      // displays content r° clockwise, so we draw at (360 − r)° CCW.
      const theta = (360 - rot) % 360;
      let x: number;
      let y: number;
      let rotate = degrees(0);
      if (theta === 90) {
        rotate = degrees(90);
        x = (pw + drawH) / 2;
        y = (ph - drawW) / 2;
      } else if (theta === 180) {
        rotate = degrees(180);
        x = (pw + drawW) / 2;
        y = (ph + drawH) / 2;
      } else if (theta === 270) {
        rotate = degrees(270);
        x = (pw - drawH) / 2;
        y = (ph + drawW) / 2;
      } else {
        x = (pw - drawW) / 2;
        y = (ph - drawH) / 2;
      }
      outPage.drawPage(page, { x, y, width: drawW, height: drawH, rotate });
    }

    onProgress?.({
      percent: Math.round(((i + 1) / pageCount) * 100),
      detail: `Page ${i + 1} of ${pageCount}`,
    });
  }

  const saved = await savePdf(out);
  const label = paper === "a4" ? "A4" : "Letter";
  return {
    bytes: saved,
    meta: `${pageCount} pages · ${label}${orientation !== "auto" ? ` · ${orientation}` : ""}`,
  };
}

/* --------------------------- 2. crop margins ------------------------------ */

/**
 * Bounding box (px, canvas top-left origin) of non-near-white pixels.
 * Samples every 2nd pixel in both axes; near-white = r,g,b all ≥ 245.
 * Returns null for pages with no ink at all.
 */
function detectInkBox(
  canvas: HTMLCanvasElement
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 2) {
    const row = y * width;
    for (let x = 0; x < width; x += 2) {
      const i = (row + x) * 4;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, maxX, minY, maxY };
}

/**
 * Set the visible CropBox per page.
 *
 * "auto": every page is rendered at 50 dpi (chunked to bound memory), the
 * bounding box of non-near-white pixels is found and converted back to
 * points, padded, clamped to the page and applied as the new CropBox.
 * Pages whose detected box already covers > 95% of the page are skipped
 * (nothing to trim), as are blank pages.
 *
 * "manual": exact margins in millimetres from the MediaBox edges, applied to
 * every page.
 *
 * Cropping only sets the visible box — hidden content stays in the file.
 */
export async function autoCropMargins(
  bytes: Uint8Array,
  opts: { mode: CropMode; paddingPt?: number; marginsMm?: MarginsMm } & EngineOpts
): Promise<OptimizeResult> {
  const { mode, paddingPt = 12, marginsMm, onProgress, signal } = opts;
  const { doc, pageCount } = await prepare(bytes);
  const pages = doc.getPages();
  let trimmed = 0;

  if (mode === "manual") {
    const m = marginsMm ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const mmToPt = 72 / 25.4;
    const mt = m.top * mmToPt;
    const mr = m.right * mmToPt;
    const mb = m.bottom * mmToPt;
    const ml = m.left * mmToPt;
    if ([mt, mr, mb, ml].some((v) => !Number.isFinite(v) || v < 0)) {
      throw new Error("Margins must be zero or positive numbers.");
    }
    for (let i = 0; i < pageCount; i++) {
      throwIfAborted(signal);
      const page = pages[i];
      const { width, height } = page.getSize();
      if (ml + mr >= width || mt + mb >= height) {
        throw new Error("Those margins are larger than the page itself — reduce them a little.");
      }
      if (mt > 0 || mr > 0 || mb > 0 || ml > 0) {
        page.setCropBox(ml, mb, width - ml - mr, height - mt - mb);
        trimmed++;
      }
      onProgress?.({
        percent: Math.round(((i + 1) / pageCount) * 100),
        detail: `Page ${i + 1} of ${pageCount}`,
      });
    }
  } else {
    const pad = paddingPt;
    if (!Number.isFinite(pad) || pad < 0) {
      throw new Error("Padding must be zero or a positive number.");
    }
    onProgress?.({ percent: 2, detail: "Scanning pages…" });
    const CHUNK = 24;
    let done = 0;
    for (let start = 0; start < pageCount; start += CHUNK) {
      throwIfAborted(signal);
      const nums: number[] = [];
      const end = Math.min(start + CHUNK, pageCount);
      for (let p = start + 1; p <= end; p++) nums.push(p);
      const canvases = await renderPages(bytes, { dpi: 50, pages: nums, signal });
      for (let k = 0; k < canvases.length; k++) {
        throwIfAborted(signal);
        const page = pages[start + k];
        const canvas = canvases[k];
        // pdf.js renders the CropBox ("view"); all pixel math maps back to
        // absolute user space through the box origin.
        const box = page.getCropBox();
        const pxPerPtX = canvas.width / Math.max(box.width, 1e-6);
        const pxPerPtY = canvas.height / Math.max(box.height, 1e-6);
        const ink = detectInkBox(canvas);
        if (ink) {
          const leftRel = ink.minX / pxPerPtX;
          const rightRel = (ink.maxX + 1) / pxPerPtX;
          const topRel = ink.minY / pxPerPtY;
          const bottomRel = (ink.maxY + 1) / pxPerPtY;
          const coverage =
            ((rightRel - leftRel) * (bottomRel - topRel)) /
            Math.max(box.width * box.height, 1e-6);
          if (coverage <= 0.95) {
            const absLeft = box.x + leftRel;
            const absRight = box.x + rightRel;
            const absTop = box.y + box.height - topRel;
            const absBottom = box.y + box.height - bottomRel;
            const cx = clamp(absLeft - pad, box.x, box.x + box.width);
            const cy = clamp(absBottom - pad, box.y, box.y + box.height);
            const cx2 = clamp(absRight + pad, box.x, box.x + box.width);
            const cy2 = clamp(absTop + pad, box.y, box.y + box.height);
            const cw = cx2 - cx;
            const ch = cy2 - cy;
            const noTrim = cw > box.width - 0.5 && ch > box.height - 0.5;
            if (cw > 1 && ch > 1 && !noTrim) {
              page.setCropBox(cx, cy, cw, ch);
              trimmed++;
            }
          }
        }
        done++;
        onProgress?.({
          percent: Math.round((done / pageCount) * 100),
          detail: `Page ${done} of ${pageCount}`,
        });
      }
    }
  }

  const saved = await savePdf(doc);
  return { bytes: saved, meta: `trimmed ${trimmed} of ${pageCount} pages` };
}

/* ---------------------- shared chunked raster rebuild ---------------------- */

interface RasterToPdfOpts extends EngineOpts {
  pageCount: number;
  /** Render resolution; also the default px→pt page-size conversion. */
  dpi: number;
  /** Cap on the longest canvas side (memory guard). Default 2600. */
  maxSide?: number;
  /** JPEG quality 0..1. */
  quality: number;
  /** Post-render grayscale (reliable pixel op — ctx.filter is ignored by pdf.js v6). */
  gray?: boolean;
  /** 1-based subset to process (default: all pages). */
  pages?: number[];
  /** Optional redraw producing the final page canvas (exact-pixel rebuild). */
  redraw?: (src: HTMLCanvasElement) => HTMLCanvasElement;
  /** Output page size in pt (defaults to px × 72 / dpi). */
  pageSize?: (canvas: HTMLCanvasElement) => [number, number];
}

/**
 * Render pages with pdf.js and rebuild the PDF from JPEGs — one doc, page
 * size derived per canvas. Pages are processed in small chunks so peak
 * canvas memory stays bounded on long documents (the same output the kit's
 * rasterize path produces, without holding every page's canvas at once).
 */
async function rasterToPdf(bytes: Uint8Array, opts: RasterToPdfOpts): Promise<Uint8Array> {
  const { pageCount, dpi, maxSide = 2600, quality, gray, pages, redraw, pageSize, onProgress, signal } = opts;
  const out = await PDFDocument.create();
  // Small chunks at high DPI: a 300-dpi A4 canvas is a ~33 MB buffer, and
  // peak memory = chunkSize × buffer — keep it at 2 canvases there.
  const chunkSize = dpi >= 250 ? 2 : 8;
  let done = 0;
  for (let start = 0; start < pageCount; start += chunkSize) {
    throwIfAborted(signal);
    const nums: number[] = [];
    const end = Math.min(start + chunkSize, pageCount);
    for (let p = start + 1; p <= end; p++) nums.push(p);
    const canvases = await renderPages(bytes, {
      dpi,
      maxSide,
      gray,
      pages: pages
        ? pages.slice(start, start + chunkSize)
        : nums,
      signal,
      onProgress: (d) => {
        onProgress?.({
          percent: Math.min(99, Math.round(((start + d) / pageCount) * 100)),
          detail: `Rendering page ${start + d} of ${pageCount}`,
        });
      },
    });
    for (const src of canvases) {
      throwIfAborted(signal);
      const canvas = redraw ? redraw(src) : src;
      const jpeg = await canvasToJpeg(canvas, quality);
      const img = await out.embedJpg(jpeg);
      const [w, h] = pageSize
        ? pageSize(canvas)
        : [(canvas.width * 72) / dpi, (canvas.height * 72) / dpi];
      const page = out.addPage([w, h]);
      page.drawImage(img, { x: 0, y: 0, width: w, height: h });
      done++;
      onProgress?.({
        percent: Math.round((done / pageCount) * 100),
        detail: `Page ${done} of ${pageCount}`,
      });
      // Hand the main thread back between pages — at high DPI each encode is
      // heavy, and without this yield the tab freezes and Cancel dies.
      await yieldToUi();
    }
  }
  await yieldToUi();
  return savePdf(out);
}

/* ------------------------ 3. scale to pixel size -------------------------- */

/**
 * Rebuild every page at an exact pixel size (1 px = 1 pt): render, redraw the
 * bitmap onto an exact W×H canvas ("contain" letterboxes on white, "cover"
 * fills and crops), then embed at JPEG quality 0.85 with page size [W, H].
 */
export async function scaleToPixels(
  bytes: Uint8Array,
  opts: { width: number; height: number; fit: PixelFit } & EngineOpts
): Promise<OptimizeResult> {
  const { width, height, fit, onProgress, signal } = opts;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 16 ||
    height < 16 ||
    width > 4000 ||
    height > 4000
  ) {
    throw new Error("Page size must be between 16 and 4000 pixels.");
  }
  const W = Math.round(width);
  const H = Math.round(height);
  const { doc, pageCount } = await prepare(bytes);

  // Adaptive render dpi: aim the longest side of the largest page at the
  // largest target dimension (capped for memory) so small targets stay light
  // and large targets aren't upscaled from a fixed low resolution.
  let longestPt = 1;
  for (const p of doc.getPages()) {
    const { width: w, height: h } = p.getSize();
    longestPt = Math.max(longestPt, w, h);
  }
  const maxTarget = Math.max(W, H);
  const dpi = Math.min(300, Math.max(72, Math.round((72 * maxTarget) / longestPt)));
  const maxSide = Math.max(2600, Math.ceil(maxTarget * 1.3));

  const redraw = (src: HTMLCanvasElement): HTMLCanvasElement => {
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const scale =
      fit === "cover"
        ? Math.max(W / src.width, H / src.height)
        : Math.min(W / src.width, H / src.height);
    const dw = src.width * scale;
    const dh = src.height * scale;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return out;
  };

  const saved = await rasterToPdf(bytes, {
    pageCount,
    dpi,
    maxSide,
    quality: 0.85,
    redraw,
    pageSize: () => [W, H],
    onProgress,
    signal,
  });

  return { bytes: saved, meta: `${pageCount} pages · ${W}×${H} px · ${fit}` };
}

/* ----------------------------- 4. dpi fixer ------------------------------- */

/**
 * Normalise scanned pages to one clean resolution: re-rendered at the chosen
 * DPI (capped at ~11 in of paper) and rebuilt as JPEG q0.85; page size in
 * points = pixels × 72 / dpi.
 */
export async function fixDpi(
  bytes: Uint8Array,
  opts: { dpi: number; pagesSpec?: string } & EngineOpts
): Promise<OptimizeResult> {
  const { dpi, pagesSpec, onProgress, signal } = opts;
  if (dpi !== 150 && dpi !== 200 && dpi !== 300 && dpi !== 600) {
    throw new Error("Choose a DPI of 150, 200, 300 or 600.");
  }
  const { doc, pageCount } = await prepare(bytes);
  let wanted = Array.from({ length: pageCount }, (_, i) => i + 1);
  if (pagesSpec && pagesSpec.trim()) {
    wanted = parsePageSpec(pagesSpec, pageCount); // friendly errors on junk
  }
  if (!wanted.length) {
    throw new Error("No pages matched that page range.");
  }

  // Honest workload guard: each 300-dpi A4 page is a ~33 MB canvas buffer
  // plus JPEG encode churn — empirically ~260 MP of re-rendering OOMs a
  // browser tab. Stop before that happens, with a clear way out.
  const first = doc.getPage(wanted[0] - 1);
  const { width: pw, height: ph } = first.getSize();
  const pxPerPage = (pw / 72) * dpi * ((ph / 72) * dpi);
  const totalPx = pxPerPage * wanted.length;
  const MAX_PIXELS = 120_000_000; // ≈ 13 A4 pages at 300 dpi, ≈ 55 at 150 dpi
  if (totalPx > MAX_PIXELS) {
    const atLowerDpi = Math.floor(MAX_PIXELS / ((pw / 72) * 150 * ((ph / 72) * 150)));
    throw new Error(
      `That's about ${Math.round(totalPx / 1_000_000)} megapixels of re-rendering — too heavy for one in-browser pass (the tab would run out of memory). Try a lower DPI (about ${atLowerDpi} pages fit at 150 DPI) or fix a smaller page range (e.g. “1-10”) in batches.`
    );
  }

  const saved = await rasterToPdf(
    bytes,
    {
      pageCount: wanted.length,
      dpi,
      maxSide: dpi * 11, // ≈ 11 in cap at the chosen resolution
      quality: 0.85,
      pages: wanted,
      onProgress,
      signal,
    }
  );
  return {
    bytes: saved,
    meta: `${wanted.length} of ${pageCount} pages · ${dpi} DPI`,
  };
}

/* -------------------------- 5. quality reducer ---------------------------- */

/**
 * Dial-based raster shrink: re-render at the chosen DPI (optionally
 * grayscale) and rebuild as JPEG at the chosen quality. The Make It Fit
 * workspace remains the tool for a guaranteed byte target.
 */
export async function reduceQuality(
  bytes: Uint8Array,
  opts: { quality: number; grayscale: boolean; dpi: number } & EngineOpts
): Promise<OptimizeResult> {
  const { quality, grayscale, dpi, onProgress, signal } = opts;
  const q = Math.round(quality);
  if (!Number.isFinite(quality) || q < 10 || q > 95) {
    throw new Error("Quality must be between 10 and 95 percent.");
  }
  if (dpi !== 96 && dpi !== 150 && dpi !== 200) {
    throw new Error("Choose a DPI of 96, 150 or 200.");
  }
  const { pageCount } = await prepare(bytes);
  const saved = await rasterToPdf(bytes, {
    pageCount,
    dpi,
    maxSide: 2600,
    quality: q / 100,
    gray: grayscale,
    onProgress,
    signal,
  });
  return { bytes: saved, meta: formatBytes(saved.length) };
}
