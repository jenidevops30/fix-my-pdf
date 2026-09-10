/**
 * Tool Shed — "Repair & Scans" engines.
 *
 * 100% client-side: pdf.js renders pages to canvas, pdf-lib performs the
 * structural surgery. Errors are always friendly `Error`s; progress and
 * cancellation (AbortSignal) are honored in every loop. No bytes leave the
 * browser.
 */
import { PDFDocument } from "pdf-lib";
import {
  canvasesToPdfBytes,
  fileBytes,
  loadPdf,
  pdfOutput,
  renderPages,
  savePdf,
  throwIfAborted,
} from "./kit";
import { baseName, formatBytes } from "../format";
import type { RunCtx, ToolOutput } from "./types";

/* -------------------------------- messages -------------------------------- */

const ENCRYPTED_MSG =
  "This PDF is password-protected — remove the password (or unlock it) first, then run this tool.";
const NO_PAGES_MSG = "This PDF has no pages.";
const TOO_DAMAGED_MSG =
  "Too damaged for in-browser structural repair. If it opens in a viewer, print → “Save as PDF” from there, then run Make It Fit.";
const NO_CANVAS_MSG = "Canvas is not available in this browser.";

/* ------------------------------ fix-corrupted ------------------------------ */

/**
 * Rebuild a damaged file's structure: re-parse with pdf-lib (tolerant) and
 * re-serialize with a plain (non-object-stream) cross-reference table for
 * maximum viewer compatibility. Honest failure mode: if pdf-lib can't parse
 * it at all, we say so instead of pretending.
 */
export async function fixCorrupted(file: File, ctx: RunCtx): Promise<ToolOutput[]> {
  const bytes = await fileBytes(file);
  ctx.progress({ percent: 6, detail: "Reading file…" });
  throwIfAborted(ctx.signal);

  let doc: PDFDocument;
  try {
    // Tolerant parse: don't throw on invalid objects, ignore /Encrypt flags.
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
  } catch {
    throw new Error(TOO_DAMAGED_MSG);
  }

  if (doc.isEncrypted) throw new Error(ENCRYPTED_MSG);
  const pagesBefore = doc.getPageCount();
  if (pagesBefore === 0) throw new Error(NO_PAGES_MSG);

  ctx.progress({ percent: 34, detail: "Rebuilding cross-reference table…" });
  throwIfAborted(ctx.signal);
  let saved: Uint8Array;
  try {
    // Plain xref rebuild (no object streams) — max compatibility.
    saved = await doc.save({ useObjectStreams: false });
  } catch {
    throw new Error(TOO_DAMAGED_MSG);
  }

  ctx.progress({ percent: 78, detail: "Verifying the rebuilt file…" });
  let pagesAfter = pagesBefore;
  try {
    const check = await PDFDocument.load(saved, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    pagesAfter = check.getPageCount();
  } catch {
    throw new Error(TOO_DAMAGED_MSG);
  }

  ctx.progress({ percent: 100, detail: "Done." });
  return [
    pdfOutput(
      `${baseName(file.name)}-fixed.pdf`,
      saved,
      `${pagesAfter} pages recovered · ${formatBytes(saved.length)}`
    ),
  ];
}

/* ---------------------------- remove-duplicates ---------------------------- */

export type DedupeSensitivity = "exact" | "similar";

interface PageFingerprint {
  /** 8×8 average hash — 64 bits as 0/1 bytes. */
  bits: Uint8Array;
  /** fraction of 8×8 cells that contain ink (dark pixels). */
  ink: number;
  /** rendered canvas dimensions (px) — part of the "exact" test. */
  w: number;
  h: number;
}

/** 8×8 average-hash: grayscale mean per cell → bit above/below the mean. */
function fingerprintCanvas(canvas: HTMLCanvasElement): PageFingerprint {
  const small = document.createElement("canvas");
  small.width = 8;
  small.height = 8;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error(NO_CANVAS_MSG);
  sctx.drawImage(canvas, 0, 0, 8, 8);
  const data = sctx.getImageData(0, 0, 8, 8).data;

  const gray = new Float64Array(64);
  let sum = 0;
  let ink = 0;
  for (let i = 0; i < 64; i++) {
    const g =
      0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
    if (g < 245) ink++;
  }
  const mean = sum / 64;
  const bits = new Uint8Array(64);
  for (let i = 0; i < 64; i++) bits[i] = gray[i] >= mean ? 1 : 0;
  return { bits, ink: ink / 64, w: canvas.width, h: canvas.height };
}

function hamming(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/**
 * Scan a document for identical pages (visual fingerprints at low dpi) and
 * keep the first occurrence of each. Structural rebuild via pdf-lib
 * copyPages, so text/pages that are kept stay vector-sharp.
 */
export async function dedupePages(
  file: File,
  ctx: RunCtx,
  sensitivity: DedupeSensitivity = "similar"
): Promise<ToolOutput[]> {
  const bytes = await fileBytes(file);
  const src = await loadPdf(bytes); // honest encryption check
  if (src.isEncrypted) throw new Error(ENCRYPTED_MSG);

  ctx.progress({ percent: 4, detail: "Loading pages…" });
  const canvases = await renderPages(bytes, {
    dpi: 40,
    gray: true,
    signal: ctx.signal,
    onProgress: (done, total) =>
      ctx.progress({
        percent: 4 + Math.round((done / total) * 46),
        detail: `Rendering page ${done} of ${total}`,
      }),
  });
  if (!canvases.length) throw new Error(NO_PAGES_MSG);

  const total = canvases.length;
  const kept: number[] = [];
  const keptPrints: PageFingerprint[] = [];
  let removed = 0;
  for (let i = 0; i < total; i++) {
    throwIfAborted(ctx.signal);
    const print = fingerprintCanvas(canvases[i]);
    let dup = false;
    for (const k of keptPrints) {
      const d = hamming(print.bits, k.bits);
      const isDup =
        sensitivity === "exact"
          ? d === 0 && print.w === k.w && print.h === k.h
          : d <= 3;
      if (isDup) {
        dup = true;
        break;
      }
    }
    if (dup) removed++;
    else {
      kept.push(i);
      keptPrints.push(print);
    }
    ctx.progress({
      percent: 50 + Math.round(((i + 1) / total) * 26),
      detail: `Page ${i + 1} of ${total} · found ${removed} duplicates so far`,
    });
  }

  ctx.progress({ percent: 80, detail: `Rebuilding with ${kept.length} pages…` });
  throwIfAborted(ctx.signal);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, kept);
  for (const page of copied) out.addPage(page);
  const saved = await savePdf(out);

  ctx.progress({ percent: 100, detail: "Done." });
  return [
    pdfOutput(
      `${baseName(file.name)}-deduped.pdf`,
      saved,
      removed > 0
        ? `Removed ${removed} duplicate ${removed === 1 ? "page" : "pages"} · ${kept.length} of ${total} kept`
        : `No duplicate pages found · all ${total} kept`
    ),
  ];
}

/* --------------------------------- deskew --------------------------------- */

export type DeskewMode = "auto" | "manual";

/** Tilts smaller than this are treated as already straight. */
const MIN_TILT_DEG = 0.3;

/**
 * Estimate a page's tilt by maximizing the horizontal-projection variance of
 * ink pixels: for candidate angles −8..8° (step 0.5°), histogram ink pixels
 * into rows using y' = y + x·tan(a); the angle whose rows line up best
 * (highest Σ count²) is the one where text/baseline lines are horizontal.
 */
function estimateTilt(canvas: HTMLCanvasElement): number {
  // Downscale to ≤400 px wide for speed.
  const scale = Math.min(1, 400 / canvas.width);
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error(NO_CANVAS_MSG);
  sctx.drawImage(canvas, 0, 0, w, h);
  const data = sctx.getImageData(0, 0, w, h).data;

  // Collect ink pixel coordinates (binarize: luminance < 200).
  const xs = new Int32Array(w * h);
  const ys = new Int32Array(w * h);
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 200) {
        xs[n] = x;
        ys[n] = y;
        n++;
      }
    }
  }
  if (n < 20) return 0; // blank / nearly blank page — nothing to straighten

  const maxShift = Math.ceil(w * Math.tan((8 * Math.PI) / 180)) + 1;
  let bestAngle = 0;
  let bestScore = -1;
  for (let a = -8; a <= 8; a += 0.5) {
    const t = Math.tan((a * Math.PI) / 180);
    const rows = new Int32Array(h + 2 * maxShift + 2);
    for (let p = 0; p < n; p++) {
      rows[ys[p] + Math.round(xs[p] * t) + maxShift]++;
    }
    let score = 0;
    for (let r = 0; r < rows.length; r++) score += rows[r] * rows[r];
    if (score > bestScore) {
      bestScore = score;
      bestAngle = a;
    }
  }
  return bestAngle;
}

/** Rotate a canvas about its center onto a white, enlarged bounding box. */
function rotateCanvasInPlace(canvas: HTMLCanvasElement, angleDeg: number): void {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = canvas.width;
  const h = canvas.height;
  const nw = Math.ceil(w * cos + h * sin);
  const nh = Math.ceil(w * sin + h * cos);

  // Keep the original pixels, then re-draw rotated onto the same canvas.
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  if (!tctx) throw new Error(NO_CANVAS_MSG);
  tctx.drawImage(canvas, 0, 0);

  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(NO_CANVAS_MSG);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, nw, nh);
  ctx.translate(nw / 2, nh / 2);
  ctx.rotate(rad);
  ctx.drawImage(temp, -w / 2, -h / 2);
}

/**
 * Straighten tilted scans. Auto mode measures each page's tilt; manual mode
 * applies the given correction to every page. Pages are rebuilt as images
 * (canvas → JPEG → PDF) at 100 dpi.
 */
export async function deskewPdf(
  file: File,
  ctx: RunCtx,
  mode: DeskewMode = "auto",
  manualAngle = 0
): Promise<ToolOutput[]> {
  const bytes = await fileBytes(file);
  const probe = await loadPdf(bytes); // honest encryption check
  if (probe.isEncrypted) throw new Error(ENCRYPTED_MSG);

  ctx.progress({ percent: 4, detail: "Loading pages…" });
  const canvases = await renderPages(bytes, {
    dpi: 100,
    gray: true,
    signal: ctx.signal,
    onProgress: (done, total) =>
      ctx.progress({
        percent: 4 + Math.round((done / total) * 41),
        detail: `Rendering page ${done} of ${total}`,
      }),
  });
  if (!canvases.length) throw new Error(NO_PAGES_MSG);

  const total = canvases.length;
  let straightened = 0;
  for (let i = 0; i < total; i++) {
    throwIfAborted(ctx.signal);
    const raw =
      mode === "manual"
        ? Math.max(-10, Math.min(10, manualAngle))
        : estimateTilt(canvases[i]);
    const tilt = Math.abs(raw) < MIN_TILT_DEG ? 0 : raw;
    if (tilt !== 0) {
      rotateCanvasInPlace(canvases[i], tilt);
      straightened++;
      ctx.progress({
        percent: 45 + Math.round(((i + 1) / total) * 45),
        detail: `Page ${i + 1} of ${total} · tilt ${tilt.toFixed(1)}°`,
      });
    } else {
      ctx.progress({
        percent: 45 + Math.round(((i + 1) / total) * 45),
        detail: `Page ${i + 1} of ${total} · already straight`,
      });
    }
  }

  ctx.progress({ percent: 92, detail: "Rebuilding pages…" });
  throwIfAborted(ctx.signal);
  const saved = await canvasesToPdfBytes(canvases, { dpi: 100 });
  ctx.progress({ percent: 100, detail: "Done." });
  return [
    pdfOutput(
      `${baseName(file.name)}-deskewed.pdf`,
      saved,
      `${total} pages · ${straightened} straightened`
    ),
  ];
}

/* ------------------------------ scan-cleanup ------------------------------ */

export interface ScanCleanupOptions {
  /** extra contrast, 0..100 (applied as contrast(1 + c/100)) */
  contrast?: number;
  /** brightness lift, -50..50 (applied as brightness(1 + b/100)) */
  brightness?: number;
  /** snap near-white pixels to pure white */
  whiten?: boolean;
  /** white threshold, 180..240 */
  threshold?: number;
}

/** Set every pixel whose r,g,b are all ≥ threshold to pure white, in place. */
function snapWhites(canvas: HTMLCanvasElement, threshold: number): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error(NO_CANVAS_MSG);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] >= threshold && d[i + 1] >= threshold && d[i + 2] >= threshold) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Whiten the gray scanner background and boost faint text: pages are
 * rendered through a contrast/brightness/grayscale CSS filter, near-white
 * pixels are snapped to pure white, and pages are rebuilt as images.
 */
export async function scanCleanup(
  file: File,
  ctx: RunCtx,
  opts: ScanCleanupOptions = {}
): Promise<ToolOutput[]> {
  const { contrast = 30, brightness = 0, whiten = true, threshold = 210 } = opts;
  const bytes = await fileBytes(file);
  const probe = await loadPdf(bytes); // honest encryption check
  if (probe.isEncrypted) throw new Error(ENCRYPTED_MSG);

  ctx.progress({ percent: 4, detail: "Loading pages…" });
  const canvases = await renderPages(bytes, {
    dpi: 150,
    gray: true,
    adjust: {
      contrast: 1 + contrast / 100,
      brightness: 1 + brightness / 100,
    },
    signal: ctx.signal,
    onProgress: (done, total) =>
      ctx.progress({
        percent: 4 + Math.round((done / total) * 56),
        detail: `Rendering page ${done} of ${total}`,
      }),
  });
  if (!canvases.length) throw new Error(NO_PAGES_MSG);

  if (whiten) {
    const total = canvases.length;
    for (let i = 0; i < total; i++) {
      throwIfAborted(ctx.signal);
      snapWhites(canvases[i], threshold);
      ctx.progress({
        percent: 60 + Math.round(((i + 1) / total) * 30),
        detail: `Page ${i + 1} of ${total} · snapping near-white to pure white`,
      });
    }
  }

  ctx.progress({ percent: 92, detail: "Rebuilding pages…" });
  throwIfAborted(ctx.signal);
  const saved = await canvasesToPdfBytes(canvases, { dpi: 150, quality: 0.8 });
  ctx.progress({ percent: 100, detail: "Done." });
  return [
    pdfOutput(
      `${baseName(file.name)}-clean.pdf`,
      saved,
      `${canvases.length} pages · background whitened`
    ),
  ];
}

/* ------------------------------ split-scans ------------------------------- */

export type SplitOrder = "left-first" | "right-first";

export interface SplitScanOptions {
  /** which half becomes the first page */
  order?: SplitOrder;
  /** shift the cut line from center, -60..60 px */
  offset?: number;
  /** trim the inner (spine) edge of each half, 0..40 px */
  margin?: number;
}

function cropCanvas(
  src: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, sw);
  out.height = Math.max(1, sh);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error(NO_CANVAS_MSG);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}

/**
 * Cut double-page scans (one photo containing two book pages) into two
 * single-page PDFs' worth of halves, interleaved in one output PDF:
 * N pages in → 2N pages out. Page size per half = px × 72/150 pt.
 */
export async function splitDoubleScans(
  file: File,
  ctx: RunCtx,
  opts: SplitScanOptions = {}
): Promise<ToolOutput[]> {
  const { order = "left-first", offset = 0, margin = 8 } = opts;
  const bytes = await fileBytes(file);
  const probe = await loadPdf(bytes); // honest encryption check
  if (probe.isEncrypted) throw new Error(ENCRYPTED_MSG);

  ctx.progress({ percent: 4, detail: "Loading pages…" });
  const canvases = await renderPages(bytes, {
    dpi: 150,
    signal: ctx.signal,
    onProgress: (done, total) =>
      ctx.progress({
        percent: 4 + Math.round((done / total) * 56),
        detail: `Rendering page ${done} of ${total}`,
      }),
  });
  if (!canvases.length) throw new Error(NO_PAGES_MSG);

  const total = canvases.length;
  const halves: HTMLCanvasElement[] = [];
  for (let i = 0; i < total; i++) {
    throwIfAborted(ctx.signal);
    const canvas = canvases[i];
    const w = canvas.width;
    const h = canvas.height;
    const cut = Math.min(w - 1, Math.max(1, Math.round(w / 2 + offset)));
    const leftW = Math.max(1, cut - margin);
    const rightX = Math.min(w - 1, cut + margin);
    const rightW = Math.max(1, w - rightX);
    const left = cropCanvas(canvas, 0, 0, leftW, h);
    const right = cropCanvas(canvas, rightX, 0, rightW, h);
    if (order === "left-first") halves.push(left, right);
    else halves.push(right, left);
    ctx.progress({
      percent: 60 + Math.round(((i + 1) / total) * 30),
      detail: `Page ${i + 1} of ${total} · cut at the spine`,
    });
  }

  ctx.progress({ percent: 92, detail: "Rebuilding pages…" });
  throwIfAborted(ctx.signal);
  // dpi 150 → each half becomes a page of px × 72/150 points.
  const saved = await canvasesToPdfBytes(halves, { dpi: 150 });
  ctx.progress({ percent: 100, detail: "Done." });
  return [
    pdfOutput(
      `${baseName(file.name)}-split.pdf`,
      saved,
      `${halves.length} pages from ${total}`
    ),
  ];
}
