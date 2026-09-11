/**
 * Smart Insights engines — 100% client-side, no network, no storage.
 *
 *  - extractText      per-page text layer extraction (pdf.js via kit)
 *  - extractImages    raw XObject image salvage (pdf-lib internals + fflate)
 *  - analyzeSize      byte-level breakdown of what makes a file heavy
 *  - visualDiff       canvas diff of two documents, page by page
 *  - ocrPdf           offline OCR via the self-hosted tesseract.js bundle
 *  - gatherAutoSignals one-pass diagnosis feeding Auto-Prescribe
 *
 * pdf.js is only ever touched through the lazy loader; tesseract.js is only
 * imported dynamically. Every loop honours the run signal and reports
 * progress, and all errors are thrown with friendly, human messages.
 */
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import type { PDFDocument } from "pdf-lib";
import { inflateSync } from "fflate";
import { baseName, parsePageSpec } from "../format";
import { analyzeDocument, detectBlankPages, getBasicInfo } from "../engine";
import { loadPdfjsDoc } from "../pdfjs";
import type { PdfjsDocumentHandle } from "../pdfjs";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  blobOutput,
  bytesToBlob,
  extractTextPerPage,
  fileBytes,
  loadPdf,
  renderPages,
  textOutput,
  throwIfAborted,
} from "./kit";
import type { RunCtx, ToolOutput, ToolProgress } from "./types";

/* ========================================================================== */
/*  1. Extract text                                                            */
/* ========================================================================== */

export type ExtractTextMode = "one" | "per-page";

/** Page separators used by joined single-file output. */
const PAGE_HEADER = (n: number) => `--- Page ${n} ---`;

export async function extractText(
  file: File,
  mode: ExtractTextMode,
  pagesSpec: string | undefined,
  ctx: RunCtx
): Promise<ToolOutput[]> {
  const base = baseName(file.name);
  ctx.progress({ percent: 4, detail: "Opening document…" });
  const bytes = await fileBytes(file);

  // Validate the page spec up-front (cheap pdf-lib load) so typos fail fast.
  let wanted: number[] | null = null;
  const spec = pagesSpec?.trim();
  if (spec) {
    const info = await getBasicInfo(file);
    wanted = parsePageSpec(spec, info.pageCount);
  }

  ctx.progress({ percent: 8, detail: "Reading the text layer…" });
  let allPages: string[];
  try {
    allPages = await extractTextPerPage(
      bytes,
      (done, total) =>
        ctx.progress({
          percent: 8 + Math.round((done / Math.max(total, 1)) * 88),
          detail: `Page ${done} of ${total}`,
        }),
      ctx.signal
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    const raw = err instanceof Error ? err.message : "";
    if (/header|parse|invalid|structure/i.test(raw)) {
      throw new Error(
        "That file doesn't look like a valid PDF — try opening it in a PDF reader first."
      );
    }
    throw new Error("Could not read this PDF's text layer — the file may be corrupted.");
  }
  const total = allPages.length;
  if (!total) throw new Error("This document has no pages to extract text from.");

  const pageNumbers = wanted ?? allPages.map((_, i) => i + 1);
  const picked = pageNumbers.map((p) => ({ page: p, text: allPages[p - 1] ?? "" }));

  if (mode === "per-page") {
    return picked.map(({ page, text }) =>
      textOutput(
        `${base}-p${String(page).padStart(3, "0")}.txt`,
        text,
        `${text.length} characters`
      )
    );
  }

  const joined = picked
    .map(({ page, text }) => `${PAGE_HEADER(page)}\n\n${text}`)
    .join("\n\n");
  const chars = joined.length;
  return [
    textOutput(
      `${base}-text.txt`,
      joined,
      chars > 0
        ? `${chars} characters`
        : "0 characters — no text layer found (try OCR)"
    ),
  ];
}

/* ========================================================================== */
/*  2. Extract images                                                          */
/* ========================================================================== */

/** Filters we deliberately cannot (or should not) decode in the browser. */
const UNSUPPORTED_FILTERS = new Set([
  "JPXDecode", // JPEG 2000
  "JBIG2Decode", // bi-level compression
  "CCITTFaxDecode", // fax
  "LZWDecode",
  "RunLengthDecode",
  "Crypt",
]);

function cleanName(obj: unknown): string {
  return obj instanceof PDFName ? obj.toString().replace(/^\//, "") : "";
}

/** Filter names of an image stream, e.g. ["FlateDecode"] or ["DCTDecode"]. */
function filterNames(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of("Filter"));
  if (f instanceof PDFName) return [cleanName(f)];
  if (f instanceof PDFArray) {
    const out: string[] = [];
    for (let i = 0; i < f.size(); i++) {
      const name = cleanName(f.lookup(i));
      if (name) out.push(name);
    }
    return out;
  }
  return [];
}

function numberFromDict(dict: PDFDict, key: string): number | undefined {
  const v = dict.lookup(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : undefined;
}

/** Components (1/3/4) from a simple ColorSpace; undefined when unknown. */
function colorSpaceComponents(dict: PDFDict): number | undefined {
  const cs = dict.lookup(PDFName.of("ColorSpace"));
  if (cs instanceof PDFName) {
    const name = cleanName(cs);
    if (name === "DeviceGray" || name === "CalGray" || name === "G") return 1;
    if (name === "DeviceRGB" || name === "CalRGB" || name === "RGB") return 3;
    if (name === "DeviceCMYK" || name === "CMYK") return 4;
    return undefined;
  }
  if (cs instanceof PDFArray && cs.size() > 0) {
    const head = cleanName(cs.lookup(0));
    if (head === "ICCBased") {
      const profile = cs.lookup(1);
      if (profile instanceof PDFRawStream) {
        const n = profile.dict.lookup(PDFName.of("N"));
        if (n instanceof PDFNumber) {
          const comps = n.asNumber();
          if (comps === 1 || comps === 3 || comps === 4) return comps;
        }
      }
    }
    if (head === "DeviceGray" || head === "CalGray") return 1;
    if (head === "DeviceRGB" || head === "CalRGB") return 3;
    if (head === "DeviceCMYK") return 4;
  }
  return undefined;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode an image."))),
      "image/png"
    );
  });
}

/**
 * Decode one /Image XObject into a ToolOutput. Returns null when the encoding
 * is unsupported (the caller counts it as "skipped"). JPEG streams are passed
 * through byte-for-byte; Flate streams are inflated and rebuilt as PNG.
 */
async function decodeImageObject(
  stream: PDFRawStream,
  base: string,
  index: number
): Promise<ToolOutput | null> {
  const dict = stream.dict;
  const w = numberFromDict(dict, "Width");
  const h = numberFromDict(dict, "Height");
  const bpc = numberFromDict(dict, "BitsPerComponent") ?? 8;
  if (!w || !h || w < 1 || h < 1) return null;
  const idx = String(index).padStart(3, "0");
  const dims = `${w}×${h}`;

  const filters = filterNames(dict);

  // ---- JPEG passthrough (bytes untouched) ---------------------------------
  if (filters.length === 1 && filters[0] === "DCTDecode") {
    return blobOutput(
      `${base}-img-${idx}.jpg`,
      bytesToBlob(stream.contents, "image/jpeg"),
      dims
    );
  }
  // Rare Flate-wrapped JPEG.
  if (filters[0] === "FlateDecode" && filters[1] === "DCTDecode") {
    try {
      const jpeg = inflateSync(stream.contents);
      return blobOutput(`${base}-img-${idx}.jpg`, bytesToBlob(jpeg, "image/jpeg"), dims);
    } catch {
      return null;
    }
  }

  if (filters.some((f) => UNSUPPORTED_FILTERS.has(f))) return null;

  // ---- Inflate + rebuild as PNG -------------------------------------------
  let data: Uint8Array;
  if (filters[0] === "FlateDecode") {
    // PNG-predictor output would need extra unwinding — mark unsupported.
    if (dict.lookup(PDFName.of("DecodeParms")) !== undefined) return null;
    try {
      data = inflateSync(stream.contents);
    } catch {
      return null;
    }
  } else if (filters.length === 0) {
    data = stream.contents; // uncompressed
  } else {
    return null;
  }

  if (bpc !== 8) return null;

  let comps = colorSpaceComponents(dict);
  if (!comps) {
    const per = data.length / (w * h);
    comps = per === 1 || per === 3 || per === 4 ? per : undefined;
  }
  if (!comps) return null;
  const needed = w * h * comps;
  if (data.length < needed) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c2d = canvas.getContext("2d");
  if (!c2d) throw new Error("Canvas is not available in this browser.");
  const img = c2d.createImageData(w, h);
  const px = img.data;
  const approx = comps === 4;
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const o = i * comps;
    if (comps === 1) {
      const v = data[o];
      px[p] = v;
      px[p + 1] = v;
      px[p + 2] = v;
    } else if (comps === 3) {
      px[p] = data[o];
      px[p + 1] = data[o + 1];
      px[p + 2] = data[o + 2];
    } else {
      // Naive CMYK → RGB (ignores ICC profiles): invert the ink amounts.
      const c = data[o];
      const m = data[o + 1];
      const y = data[o + 2];
      const k = data[o + 3];
      px[p] = 255 - Math.min(255, c + k);
      px[p + 1] = 255 - Math.min(255, m + k);
      px[p + 2] = 255 - Math.min(255, y + k);
    }
    px[p + 3] = 255;
  }
  c2d.putImageData(img, 0, 0);
  const blob = await canvasToPngBlob(canvas);
  return blobOutput(
    `${base}-img-${idx}.png`,
    blob,
    approx ? `${dims} · CMYK (approx. colors)` : dims
  );
}

export async function extractImages(file: File, ctx: RunCtx): Promise<ToolOutput[]> {
  const base = baseName(file.name);
  ctx.progress({ percent: 4, detail: "Opening document…" });
  let doc: PDFDocument;
  try {
    doc = await loadPdf(file);
  } catch {
    throw new Error(
      "This file could not be read as a PDF — it may be corrupted or password-protected."
    );
  }

  const objects = doc.context.enumerateIndirectObjects();
  const outputs: ToolOutput[] = [];
  let attempts = 0;
  let skipped = 0;

  for (let i = 0; i < objects.length; i++) {
    throwIfAborted(ctx.signal);
    const obj = objects[i][1];
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.lookup(PDFName.of("Subtype"));
    if (!subtype || subtype.toString() !== "/Image") continue;

    attempts += 1;
    ctx.progress({
      percent: 5 + Math.round((i / Math.max(objects.length, 1)) * 90),
      detail: `Extracting image object #${attempts}…`,
    });
    try {
      const out = await decodeImageObject(obj, base, attempts);
      if (out) outputs.push(out);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  if (!outputs.length) {
    throw new Error("No embedded raster images found — this PDF is probably vector/text.");
  }
  if (skipped > 0) {
    outputs[0].meta = `${outputs[0].meta ?? ""} · ${outputs.length} images · ${skipped} skipped (unsupported encoding)`;
  }
  ctx.progress({ percent: 100, detail: "Done" });
  return outputs;
}

/* ========================================================================== */
/*  3. Why is my file big — size breakdown                                     */
/* ========================================================================== */

export type SizeKind = "image" | "font" | "structure" | "content";

export interface SizeBucket {
  label: string;
  bytes: number;
  count: number;
}

export interface SizeTopObject {
  bytes: number;
  kind: SizeKind;
}

export interface SizeReport {
  fileBytes: number;
  images: SizeBucket;
  fonts: SizeBucket;
  structure: SizeBucket;
  content: SizeBucket;
  top: SizeTopObject[];
  pageCount: number;
  encrypted: boolean;
}

export interface AnalyzeHooks {
  onProgress?: (p: ToolProgress) => void;
  signal?: AbortSignal;
}

const SIZE_LABELS: Record<SizeKind, string> = {
  image: "Images",
  font: "Fonts",
  structure: "Xref & structure",
  content: "Content & other",
};

export const SIZE_KIND_LABEL: Record<SizeKind, string> = {
  image: "image",
  font: "font",
  structure: "xref/structure",
  content: "content/other",
};

function classifyStream(dict: PDFDict): SizeKind {
  const sub = cleanName(dict.lookup(PDFName.of("Subtype")));
  const typ = cleanName(dict.lookup(PDFName.of("Type")));
  if (sub === "Image") return "image";
  if (
    sub === "Type1C" ||
    sub === "CIDFontType0C" ||
    sub === "OpenType" ||
    dict.has(PDFName.of("FontFile")) ||
    dict.has(PDFName.of("FontFile2")) ||
    dict.has(PDFName.of("FontFile3"))
  ) {
    return "font";
  }
  if (typ === "XRef" || typ === "ObjStm") return "structure";
  return "content";
}

/**
 * Walk every indirect object and bucket the encoded stream bytes into
 * images / fonts / xref & structure / content & other. Measured straight
 * from the bytes on disk — nothing is rendered or uploaded.
 */
export async function analyzeSize(
  input: File | Uint8Array,
  hooks: AnalyzeHooks = {}
): Promise<SizeReport> {
  const { onProgress, signal } = hooks;
  onProgress?.({ percent: 5, detail: "Reading file…" });
  const bytes = input instanceof File ? await fileBytes(input) : input;
  throwIfAborted(signal);

  onProgress?.({ percent: 25, detail: "Opening the document…" });
  let doc: PDFDocument;
  try {
    doc = await loadPdf(bytes);
  } catch {
    throw new Error(
      "This file could not be read as a PDF — it may be corrupted or password-protected."
    );
  }
  throwIfAborted(signal);

  onProgress?.({ percent: 45, detail: "Measuring internal objects…" });
  // Yield once so the progress row can paint before the sync walk.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 30));

  const buckets: Record<SizeKind, SizeBucket> = {
    image: { label: SIZE_LABELS.image, bytes: 0, count: 0 },
    font: { label: SIZE_LABELS.font, bytes: 0, count: 0 },
    structure: { label: SIZE_LABELS.structure, bytes: 0, count: 0 },
    content: { label: SIZE_LABELS.content, bytes: 0, count: 0 },
  };
  const all: SizeTopObject[] = [];

  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const size = obj.getContentsSize();
    const kind = classifyStream(obj.dict);
    buckets[kind].bytes += size;
    buckets[kind].count += 1;
    all.push({ bytes: size, kind });
  }
  all.sort((a, b) => b.bytes - a.bytes);

  onProgress?.({ percent: 80, detail: "Summing categories…" });
  const info =
    input instanceof File
      ? await getBasicInfo(input)
      : { pageCount: doc.getPageCount(), encrypted: doc.isEncrypted };
  throwIfAborted(signal);
  onProgress?.({ percent: 100, detail: "Done" });

  return {
    fileBytes: bytes.length,
    images: buckets.image,
    fonts: buckets.font,
    structure: buckets.structure,
    content: buckets.content,
    top: all.slice(0, 5),
    pageCount: info.pageCount,
    encrypted: info.encrypted,
  };
}

/* ========================================================================== */
/*  4. Visual diff                                                             */
/* ========================================================================== */

export type DiffMode = "overlay" | "side-by-side";

const RED_BLEND = 0.85; // rgba(234, 42, 42, 0.85)

/** Render one page at 72 dpi (1 pt = 1 px) on a white background. */
async function renderPageAt72(
  doc: PDFDocumentProxy,
  pageNumber: number
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("Canvas is not available in this browser.");
  ctx2d.fillStyle = "#ffffff";
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas: null, canvasContext: ctx2d, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** Place a page canvas centered on a white canvas of the max page size. */
function normalizeCanvas(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  if (src.width === w && src.height === h) return src;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("Canvas is not available in this browser.");
  ctx2d.fillStyle = "#ffffff";
  ctx2d.fillRect(0, 0, w, h);
  ctx2d.drawImage(src, Math.round((w - src.width) / 2), Math.round((h - src.height) / 2));
  return canvas;
}

/** Per-pixel mask (ΔRGB > 24 on any channel) + sampled diff percentage. */
function diffMask(
  a: HTMLCanvasElement,
  b: HTMLCanvasElement
): { percent: number; mask: Uint8Array } {
  const w = a.width;
  const h = a.height;
  const ca = a.getContext("2d");
  const cb = b.getContext("2d");
  if (!ca || !cb) throw new Error("Canvas is not available in this browser.");
  const da = ca.getImageData(0, 0, w, h).data;
  const db = cb.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  let sampled = 0;
  let diffed = 0;
  for (let y = 0, p = 0; y < h; y++) {
    for (let x = 0; x < w; x++, p++) {
      const i = p * 4;
      const diff =
        Math.abs(da[i] - db[i]) > 24 ||
        Math.abs(da[i + 1] - db[i + 1]) > 24 ||
        Math.abs(da[i + 2] - db[i + 2]) > 24;
      if (diff) mask[p] = 1;
      if (x % 3 === 0 && y % 3 === 0) {
        sampled += 1;
        if (diff) diffed += 1;
      }
    }
  }
  return { percent: sampled ? (diffed / sampled) * 100 : 0, mask };
}

/** Version A with differing pixels painted red. */
function paintOverlay(
  base: HTMLCanvasElement,
  mask: Uint8Array,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx2d) throw new Error("Canvas is not available in this browser.");
  ctx2d.drawImage(base, 0, 0);
  const img = ctx2d.getImageData(0, 0, w, h);
  const d = img.data;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    d[i] = Math.round(d[i] * (1 - RED_BLEND) + 234 * RED_BLEND);
    d[i + 1] = Math.round(d[i + 1] * (1 - RED_BLEND) + 42 * RED_BLEND);
    d[i + 2] = Math.round(d[i + 2] * (1 - RED_BLEND) + 42 * RED_BLEND);
  }
  ctx2d.putImageData(img, 0, 0);
  return canvas;
}

/** A left, B right, thin slate divider — composite only. */
function sideBySide(
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
  w: number,
  h: number
): HTMLCanvasElement {
  const gap = 4;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2 + gap;
  canvas.height = h;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("Canvas is not available in this browser.");
  ctx2d.fillStyle = "#ffffff";
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  ctx2d.drawImage(a, 0, 0);
  ctx2d.drawImage(b, w + gap, 0);
  ctx2d.fillStyle = "#94a3b8";
  ctx2d.fillRect(w, 0, gap, h);
  return canvas;
}

export async function visualDiff(
  fileA: File,
  fileB: File,
  maxPages: number,
  mode: DiffMode,
  ctx: RunCtx
): Promise<ToolOutput[]> {
  const base = baseName(fileA.name);
  const cap = Math.min(50, Math.max(1, Math.round(maxPages) || 10));
  ctx.progress({ percent: 3, detail: "Opening version A…" });

  let handleA: PdfjsDocumentHandle | undefined;
  let handleB: PdfjsDocumentHandle | undefined;
  try {
    try {
      handleA = await loadPdfjsDoc(await fileBytes(fileA));
    } catch {
      throw new Error(`Could not open “${fileA.name}” as a PDF.`);
    }
    throwIfAborted(ctx.signal);
    ctx.progress({ percent: 8, detail: "Opening version B…" });
    try {
      handleB = await loadPdfjsDoc(await fileBytes(fileB));
    } catch {
      throw new Error(`Could not open “${fileB.name}” as a PDF.`);
    }
    throwIfAborted(ctx.signal);

    const n = Math.min(handleA.doc.numPages, handleB.doc.numPages, cap);
    if (n < 1) throw new Error("Neither file has any pages to compare.");

    const outputs: ToolOutput[] = [];
    let allClean = true;

    for (let i = 1; i <= n; i++) {
      throwIfAborted(ctx.signal);
      ctx.progress({
        percent: 5 + Math.round(((i - 1) / n) * 90),
        detail: `Comparing page ${i} of ${n}`,
      });
      const rawA = await renderPageAt72(handleA.doc, i);
      const rawB = await renderPageAt72(handleB.doc, i);
      const w = Math.max(rawA.width, rawB.width);
      const h = Math.max(rawA.height, rawB.height);
      const normA = normalizeCanvas(rawA, w, h);
      const normB = normalizeCanvas(rawB, w, h);
      const { percent: diffPct, mask } = diffMask(normA, normB);
      const out =
        mode === "overlay" ? paintOverlay(normA, mask, w, h) : sideBySide(normA, normB, w, h);
      const blob = await canvasToPngBlob(out);
      outputs.push(
        blobOutput(
          `${base}-diff-p${String(i).padStart(3, "0")}.png`,
          blob,
          `page ${i} · ${diffPct.toFixed(1)}% pixels differ`
        )
      );
      if (diffPct >= 0.5) allClean = false;
    }

    if (allClean) {
      outputs.push(
        textOutput(`${base}-diff-summary.txt`, `No visual differences found in the first ${n} pages.`)
      );
    }
    ctx.progress({ percent: 100, detail: "Done" });
    return outputs;
  } finally {
    try {
      await handleA?.destroy();
    } catch {
      /* already gone */
    }
    try {
      await handleB?.destroy();
    } catch {
      /* already gone */
    }
  }
}

/* ========================================================================== */
/*  5. OCR                                                                     */
/* ========================================================================== */

/** Pages rendered per renderPages call — keeps 300 dpi canvases off the heap. */
const OCR_BATCH = 4;

export async function ocrPdf(
  file: File,
  pagesSpec: string | undefined,
  ctx: RunCtx
): Promise<ToolOutput[]> {
  const base = baseName(file.name);
  ctx.progress({ percent: 2, detail: "Opening document…" });
  const bytes = await fileBytes(file);
  const info = await getBasicInfo(file);
  const spec = pagesSpec?.trim();
  const wanted = spec ? parsePageSpec(spec, info.pageCount) : Array.from({ length: info.pageCount }, (_, i) => i + 1);
  if (!wanted.length) throw new Error("This document has no pages to OCR.");

  ctx.progress({ percent: 5, detail: "Loading the OCR engine…" });
  let worker: Awaited<ReturnType<typeof createOcrWorker>>["worker"];
  try {
    worker = (await createOcrWorker()).worker;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new Error("OCR engine failed to start in this browser.");
  }

  try {
    try {
      await worker.setParameters({ user_defined_dpi: "300" });
    } catch {
      /* cosmetic parameter — never fatal */
    }

    const texts: string[] = [];
    let done = 0;
    for (let start = 0; start < wanted.length; start += OCR_BATCH) {
      throwIfAborted(ctx.signal);
      const batch = wanted.slice(start, start + OCR_BATCH);
      ctx.progress({
        percent: 12 + Math.round((start / Math.max(wanted.length, 1)) * 8),
        detail: `Rendering pages ${batch[0]}–${batch[batch.length - 1]}…`,
      });
      const canvases = await renderPages(bytes, {
        dpi: 300,
        maxSide: 3500,
        gray: true,
        adjust: { contrast: 1.05 },
        pages: batch,
        signal: ctx.signal,
      });
      for (let i = 0; i < canvases.length; i++) {
        throwIfAborted(ctx.signal);
        done += 1;
        ctx.progress({
          percent: 20 + Math.round((done / wanted.length) * 76),
          detail: `Page ${done} of ${wanted.length} (OCR)`,
        });
        let text = "";
        try {
          const res = await worker.recognize(canvases[i]);
          text = res.data.text.trim();
        } catch {
          text = "";
        }
        texts.push(`${PAGE_HEADER(batch[i])}\n\n${text}`);
      }
      canvases.length = 0; // release the batch before rendering the next one
    }

    const joined = texts.join("\n\n");
    ctx.progress({ percent: 100, detail: "Done" });
    return [textOutput(`${base}-ocr.txt`, joined, `${joined.length} of text`)];
  } finally {
    try {
      await worker.terminate();
    } catch {
      /* already terminated */
    }
  }
}

/** Dynamic-import wrapper so tesseract.js is never in the main bundle. */
async function createOcrWorker(): Promise<{ worker: import("tesseract.js").Worker }> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    // Self-hosted assets only — the OCR itself never touches the internet.
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tessdata",
    cacheMethod: "none", // no IndexedDB writes — nothing is stored
  });
  return { worker };
}

/* ========================================================================== */
/*  6. Auto-Prescribe signals                                                  */
/* ========================================================================== */

export interface AutoSignals {
  canRead: boolean;
  encrypted: boolean;
  pageCount: number;
  fileBytes: number;
  imagesBytes: number;
  fontsBytes: number;
  contentBytes: number;
  structureBytes: number;
  /** share of the whole file taken by embedded images (0..1) */
  imageShare: number;
  blankPages: number[];
  avgInk: number;
  /** heuristic: average ink above ~12% smells like photos of paper */
  scanLike: boolean;
  textChars: number;
  hasText: boolean;
  formFieldCount: number;
  duplicatePages: number[];
  oversizedPages: number[];
}

/** Cap for the duplicate-page render pass (tiny 30 dpi canvases). */
const DUP_SAMPLE_CAP = 150;
/** Anything bigger than these points is "oversized" (the task's A3 bar). */
const OVERSIZE_W_PT = 1191;
const OVERSIZE_H_PT = 1684;

function emptySignals(): AutoSignals {
  return {
    canRead: false,
    encrypted: false,
    pageCount: 0,
    fileBytes: 0,
    imagesBytes: 0,
    fontsBytes: 0,
    contentBytes: 0,
    structureBytes: 0,
    imageShare: 0,
    blankPages: [],
    avgInk: 0,
    scanLike: false,
    textChars: 0,
    hasText: false,
    formFieldCount: 0,
    duplicatePages: [],
    oversizedPages: [],
  };
}

/** Text chars across the first pages only (bounded probe, same mechanism as kit). */
async function sampleTextChars(
  bytes: Uint8Array,
  maxPages: number,
  signal?: AbortSignal
): Promise<number> {
  const handle = await loadPdfjsDoc(bytes);
  try {
    const n = Math.min(handle.doc.numPages, maxPages);
    let chars = 0;
    for (let i = 1; i <= n; i++) {
      throwIfAborted(signal);
      const page = await handle.doc.getPage(i);
      const tc = await page.getTextContent();
      for (const item of tc.items) {
        if ("str" in item) chars += item.str.replace(/\s+/g, "").length;
      }
      page.cleanup();
    }
    return chars;
  } finally {
    await handle.destroy();
  }
}

/** 8×8 average hash of a tiny page render. */
function averageHash(canvas: HTMLCanvasElement): string {
  const small = document.createElement("canvas");
  small.width = 8;
  small.height = 8;
  const ctx2d = small.getContext("2d");
  if (!ctx2d) return "";
  ctx2d.drawImage(canvas, 0, 0, 8, 8);
  const { data } = ctx2d.getImageData(0, 0, 8, 8);
  const gray: number[] = [];
  let sum = 0;
  for (let i = 0; i < 64; i++) {
    const v = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray.push(v);
    sum += v;
  }
  const mean = sum / 64;
  return gray.map((v) => (v >= mean ? "1" : "0")).join("");
}

function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d += 1;
  return d;
}

async function findDuplicatePages(
  bytes: Uint8Array,
  totalPages: number,
  blankPages: number[],
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void
): Promise<number[]> {
  const limit = Math.min(totalPages, DUP_SAMPLE_CAP);
  if (limit < 2) return [];
  const canvases = await renderPages(bytes, {
    dpi: 30,
    maxSide: 200,
    pages: Array.from({ length: limit }, (_, i) => i + 1),
    signal,
    onProgress,
  });
  // Text gate: pages with different extracted text are never duplicates —
  // the 8×8 hash alone cannot see a one-word difference and used to report
  // most of a unique document as copies.
  const texts = await extractTextPerPage(
    bytes,
    undefined,
    signal
  ).catch(() => [] as string[]);
  const textKey = (i: number): string =>
    (texts[i] ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const dupes: number[] = [];
  const kept: Array<{ hash: string; text: string }> = [];
  for (let i = 0; i < canvases.length; i++) {
    const page = i + 1;
    const hash = averageHash(canvases[i]);
    if (!hash || blankPages.includes(page)) continue; // blanks are reported separately
    const text = textKey(i);
    const isDup = kept.some(
      (k) => k.text === text && hamming(k.hash, hash) <= 3
    );
    if (isDup) dupes.push(page);
    else kept.push({ hash, text });
  }
  canvases.length = 0;
  return dupes;
}

/**
 * One-pass diagnosis for Auto-Prescribe: structure, size breakdown, blank
 * pages, text presence, form fields, duplicate pages and oversized pages.
 * Never throws for unreadable files — it returns canRead=false instead.
 */
export async function gatherAutoSignals(
  file: File,
  hooks: AnalyzeHooks = {}
): Promise<AutoSignals> {
  const { onProgress, signal } = hooks;
  onProgress?.({ percent: 3, detail: "Reading file…" });
  const bytes = await fileBytes(file);
  throwIfAborted(signal);
  const len = bytes.length;

  let info: { pageCount: number; encrypted: boolean };
  try {
    info = await getBasicInfo(file);
  } catch {
    // Unreadable → the UI prescribes the repair tool and stops there.
    return { ...emptySignals(), fileBytes: len };
  }
  throwIfAborted(signal);

  onProgress?.({ percent: 10, detail: "Measuring what's inside…" });
  const size = await analyzeSize(bytes, {
    signal,
    onProgress: (p) =>
      onProgress?.({ percent: 10 + Math.round(p.percent * 0.2), detail: p.detail }),
  });
  throwIfAborted(signal);

  onProgress?.({ percent: 32, detail: "Rendering pages for a first look…" });
  let blankPages: number[] = [];
  let avgInk = 0;
  try {
    const analysis = await analyzeDocument(file, (p) =>
      onProgress?.({ percent: 32 + Math.round(p.percent * 0.28), detail: p.detail })
    );
    blankPages = detectBlankPages(analysis, "normal");
    avgInk =
      analysis.inkRatios.reduce((a, b) => a + b, 0) / Math.max(analysis.inkRatios.length, 1);
  } catch {
    /* analysis is best-effort — keep defaults */
  }
  throwIfAborted(signal);

  onProgress?.({ percent: 62, detail: "Probing the text layer…" });
  let textChars = 0;
  try {
    textChars = await sampleTextChars(bytes, 3, signal);
  } catch {
    /* no text layer */
  }
  throwIfAborted(signal);

  onProgress?.({ percent: 70, detail: "Checking for form fields…" });
  let formFieldCount = 0;
  const oversizedPages: number[] = [];
  try {
    const doc = await loadPdf(bytes);
    try {
      formFieldCount = doc.getForm().getFields().length;
    } catch {
      formFieldCount = 0;
    }
    doc.getPages().forEach((pg, idx) => {
      const { width, height } = pg.getSize();
      if (width > OVERSIZE_W_PT || height > OVERSIZE_H_PT) oversizedPages.push(idx + 1);
    });
  } catch {
    /* structural access is best-effort */
  }
  throwIfAborted(signal);

  onProgress?.({ percent: 80, detail: "Looking for duplicate pages…" });
  let duplicatePages: number[] = [];
  try {
    duplicatePages = await findDuplicatePages(
      bytes,
      info.pageCount,
      blankPages,
      signal,
      (done, total) =>
        onProgress?.({
          percent: 80 + Math.round((done / Math.max(total, 1)) * 18),
          detail: `Hashing page ${done} of ${total}`,
        })
    );
  } catch {
    /* best-effort */
  }

  onProgress?.({ percent: 100, detail: "Diagnosis ready" });
  return {
    canRead: true,
    encrypted: info.encrypted,
    pageCount: info.pageCount,
    fileBytes: len,
    imagesBytes: size.images.bytes,
    fontsBytes: size.fonts.bytes,
    contentBytes: size.content.bytes,
    structureBytes: size.structure.bytes,
    imageShare: len > 0 ? size.images.bytes / len : 0,
    blankPages,
    avgInk,
    scanLike: avgInk > 0.12,
    textChars,
    hasText: textChars >= 20,
    formFieldCount,
    duplicatePages,
    oversizedPages,
  };
}
