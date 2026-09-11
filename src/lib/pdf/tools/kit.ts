/**
 * Shared browser-side helpers for Tool Shed engines.
 *
 * Rules for every tool engine:
 *  - pdf.js is ONLY loaded through the lazy loader (never a static import);
 *  - progress + abort must be honored in loops (throwIfAborted);
 *  - errors are `Error` with a friendly, human message;
 *  - nothing ever leaves the browser.
 */
import { PDFDocument } from "pdf-lib";
import { zip } from "fflate";
import { loadPdfjsDoc } from "../pdfjs";
import { downloadBlob, formatBytes } from "../format";
import type { RunCtx, ToolOutput } from "./types";

/* -------------------------------- primitives ------------------------------- */

export async function fileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function bytesToBlob(data: Uint8Array, type = "application/pdf"): Blob {
  const ab = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;
  return new Blob([ab], { type });
}

export function pdfOutput(name: string, bytes: Uint8Array, meta?: string): ToolOutput {
  return {
    name,
    blob: bytesToBlob(bytes),
    meta: meta ?? `${formatBytes(bytes.length)} · PDF`,
  };
}

export function blobOutput(name: string, blob: Blob, meta?: string): ToolOutput {
  return { name, blob, meta: meta ?? formatBytes(blob.size) };
}

export function textOutput(name: string, text: string, meta?: string): ToolOutput {
  return {
    name,
    blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
    meta: meta ?? `${formatBytes(text.length)} · TXT`,
  };
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError");
}

/** Yield to the event loop so progress paints and Cancel stays responsive. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function isAborted(signal?: AbortSignal): boolean {
  return !!signal?.aborted;
}

/* --------------------------------- pdf-lib --------------------------------- */

export async function loadPdf(input: File | Uint8Array): Promise<PDFDocument> {
  const bytes = input instanceof File ? await fileBytes(input) : input;
  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
  } catch (err) {
    // Surface the app's standard friendly copy instead of raw pdf-lib jargon
    // ("Failed to parse PDF document (line:0 col:104…)").
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new Error(
      "That file doesn't look like a valid PDF — try opening it in a PDF reader first."
    );
  }
}

export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true });
}

/* ---------------------------- pdf.js render pass ---------------------------- */

export interface RenderOpts {
  /** render resolution, default 150 */
  dpi?: number;
  /** cap the longest canvas side (memory guard), default 2600 */
  maxSide?: number;
  /** post-render grayscale (reliable — ctx.filter does NOT survive pdf.js v6) */
  gray?: boolean;
  /** post-render contrast (1 = neutral) / brightness multiplier (1 = neutral) */
  adjust?: { contrast?: number; brightness?: number };
  /** 1-based page subset to render (default: all) */
  pages?: number[];
  /** post-render hook per canvas (redaction boxes, deskew rotate, split…) */
  transform?: (canvas: HTMLCanvasElement, pageIndex: number) => void | Promise<void>;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export interface CanvasPixelOps {
  gray?: boolean;
  contrast?: number;
  brightness?: number;
}

/**
 * Pixel-level grayscale / contrast / brightness. Unlike ctx.filter (which
 * pdf.js v6 silently ignores), this always works because it rewrites the
 * rendered bitmap directly.
 */
export function applyCanvasPixelOps(
  canvas: HTMLCanvasElement,
  ops: CanvasPixelOps
): void {
  const hasGray = !!ops.gray;
  const c = ops.contrast ?? 1;
  const br = ops.brightness ?? 1;
  const hasAdjust = c !== 1 || br !== 1;
  if (!hasGray && !hasAdjust) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    if (hasGray) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l;
      g = l;
      b = l;
    }
    if (hasAdjust) {
      r = (r - 128) * c + 128;
      g = (g - 128) * c + 128;
      b = (b - 128) * c + 128;
      r *= br;
      g *= br;
      b *= br;
    }
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(img, 0, 0);
}

export async function renderPages(
  bytes: Uint8Array,
  opts: RenderOpts = {}
): Promise<HTMLCanvasElement[]> {
  const {
    dpi = 150,
    maxSide = 2600,
    gray,
    adjust,
    pages,
    transform,
    onProgress,
    signal,
  } = opts;
  const handle = await loadPdfjsDoc(bytes);
  const doc = handle.doc;
  const total = doc.numPages;
  const wanted = pages && pages.length ? pages : Array.from({ length: total }, (_, i) => i + 1);
  const out: HTMLCanvasElement[] = [];
  try {
    for (let i = 0; i < wanted.length; i++) {
      throwIfAborted(signal);
      const n = wanted[i];
      const page = await doc.getPage(Math.min(n, total));
      const base = page.getViewport({ scale: 1 });
      let scale = dpi / 72;
      const longest = Math.max(base.width, base.height);
      if (longest * scale > maxSide) scale = maxSide / longest;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;
      applyCanvasPixelOps(canvas, { gray, contrast: adjust?.contrast, brightness: adjust?.brightness });
      if (transform) await transform(canvas, n);
      out.push(canvas);
      page.cleanup();
      onProgress?.(i + 1, wanted.length);
    }
  } finally {
    await handle.destroy();
  }
  return out;
}

export interface SinglePage {
  canvas: HTMLCanvasElement;
  /** page size in PDF points */
  widthPt: number;
  heightPt: number;
}

export async function renderOnePage(
  bytes: Uint8Array,
  pageIndex: number,
  opts: Omit<RenderOpts, "pages" | "onProgress"> = {}
): Promise<SinglePage> {
  const { dpi = 150, maxSide = 2600, gray, adjust, transform, signal } = opts;
  const handle = await loadPdfjsDoc(bytes);
  try {
    const page = await handle.doc.getPage(Math.min(Math.max(pageIndex, 1), handle.doc.numPages));
    const base = page.getViewport({ scale: 1 });
    let scale = dpi / 72;
    const longest = Math.max(base.width, base.height);
    if (longest * scale > maxSide) scale = maxSide / longest;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;
    applyCanvasPixelOps(canvas, { gray, contrast: adjust?.contrast, brightness: adjust?.brightness });
    if (transform) await transform(canvas, pageIndex);
    return { canvas, widthPt: base.width, heightPt: base.height };
  } finally {
    await handle.destroy();
  }
}

/* ------------------------- canvases → PDF rebuilding ------------------------ */

export interface RebuildOpts {
  /** DPI used when rendering the canvases — sets output page size in points. Default 150. */
  dpi?: number;
  /** JPEG quality 0..1 (format "jpeg"), default 0.82 */
  quality?: number;
  format?: "jpeg" | "png";
}

function canvasToBytes(canvas: HTMLCanvasElement, format: "jpeg" | "png", quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode a page image."));
          return;
        }
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))).catch(reject);
      },
      format === "jpeg" ? "image/jpeg" : "image/png",
      format === "jpeg" ? quality : undefined
    );
  });
}

export async function canvasesToPdfBytes(
  canvases: HTMLCanvasElement[],
  opts: RebuildOpts = {}
): Promise<Uint8Array> {
  const { dpi = 150, quality = 0.82, format = "jpeg" } = opts;
  const out = await PDFDocument.create();
  for (const canvas of canvases) {
    const data = await canvasToBytes(canvas, format, quality);
    const img = format === "jpeg" ? await out.embedJpg(data) : await out.embedPng(data);
    const w = (canvas.width * 72) / dpi;
    const h = (canvas.height * 72) / dpi;
    const page = out.addPage([w, h]);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return out.save({ useObjectStreams: true });
}

/** Render + rebuild in one shot (flatten / grayscale / quality / dpi pipelines). */
export async function rasterizePdfBytes(
  bytes: Uint8Array,
  renderOpts: RenderOpts = {},
  rebuildOpts: RebuildOpts = {}
): Promise<Uint8Array> {
  const canvases = await renderPages(bytes, renderOpts);
  if (!canvases.length) throw new Error("This document has no pages to process.");
  return canvasesToPdfBytes(canvases, rebuildOpts);
}

/* --------------------------------- zip ------------------------------------- */

function zipAsync(entries: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(entries, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

/** Bundle several outputs into one .zip ToolOutput. */
export async function zipOutputs(
  outputs: ToolOutput[],
  zipName: string
): Promise<ToolOutput> {
  if (!outputs.length) throw new Error("Nothing to bundle.");
  const entries: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const o of outputs) {
    let name = o.name;
    let n = 2;
    while (used.has(name)) {
      const dot = o.name.lastIndexOf(".");
      name = dot > 0 ? `${o.name.slice(0, dot)}-${n}${o.name.slice(dot)}` : `${o.name}-${n}`;
      n++;
    }
    used.add(name);
    entries[name] = new Uint8Array(await o.blob.arrayBuffer());
  }
  const data = await zipAsync(entries);
  return {
    name: zipName,
    blob: bytesToBlob(data, "application/zip"),
    meta: `${outputs.length} files · ${formatBytes(data.length)}`,
  };
}

export function downloadOutput(o: ToolOutput): void {
  downloadBlob(o.blob, o.name);
}

/* ------------------------------ text utilities ------------------------------ */

/** Per-page text extraction via pdf.js (page i = index i-1 in the result). */
export async function extractTextPerPage(
  bytes: Uint8Array,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<string[]> {
  const handle = await loadPdfjsDoc(bytes);
  const doc = handle.doc;
  const out: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      throwIfAborted(signal);
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let text = "";
      for (const item of tc.items) {
        if ("str" in item) {
          text += item.str;
          if (item.hasEOL) text += " ";
        }
      }
      out.push(text.replace(/\s+/g, " ").trim());
      page.cleanup();
      onProgress?.(i, doc.numPages);
    }
  } finally {
    await handle.destroy();
  }
  return out;
}

/* ------------------------------ misc helpers ------------------------------- */

/** Safe base name for outputs (reuses format.ts rules). */
export { formatBytes } from "../format";

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}
