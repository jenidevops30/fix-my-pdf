/**
 * FixMyPDF Tool Shed — "convert" category engines.
 *
 * Pure browser-side TypeScript: bytes in, ToolOutputs out. pdf.js is only
 * loaded lazily through ./kit (never imported here); heic2any is dynamically
 * imported the first time a HEIC/HEIF file shows up. Every loop honours
 * ctx.signal via throwIfAborted and reports ctx.progress per page/sheet.
 * Nothing ever leaves the browser.
 */
import { PDFDocument, rgb } from "pdf-lib";
import type { PDFEmbeddedPage, PDFImage, PDFPage } from "pdf-lib";
import { baseName, formatBytes, parsePageSpec } from "../format";
import {
  blobOutput,
  bytesToBlob,
  fileBytes,
  loadPdf,
  pdfOutput,
  rasterizePdfBytes,
  renderPages,
  savePdf,
  throwIfAborted,
} from "./kit";
import type { RunCtx, ToolOutput } from "./types";

/* --------------------------------- helpers --------------------------------- */

/** Standard paper sizes in PDF points (short side, long side). */
const PAPER_PT = {
  a4: [595.28, 841.89] as const,
  letter: [612, 792] as const,
};

async function loadSource(input: File | Uint8Array): Promise<PDFDocument> {
  try {
    return await loadPdf(input);
  } catch {
    throw new Error(
      "That file doesn't look like a valid PDF — try opening it in a PDF reader first."
    );
  }
}

/** Map low-level pdf.js/pdf-lib failures to human messages (keeps AbortError). */
function toFriendlyError(err: unknown, message: string): Error {
  if (err instanceof DOMException && err.name === "AbortError") return err;
  const text = err instanceof Error ? `${err.name} ${err.message}` : "";
  if (/password/i.test(text)) {
    return new Error(
      "This PDF is password-protected — remove the password first, then try again."
    );
  }
  return new Error(message);
}

/** Encode a canvas via canvas.toBlob (quality applies to lossy formats only). */
function canvasToBlobBytes(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode the page image."));
          return;
        }
        blob
          .arrayBuffer()
          .then((ab) => resolve(new Uint8Array(ab)))
          .catch(reject);
      },
      mime,
      quality
    );
  });
}

function fileBase(input: File | Uint8Array): string {
  return input instanceof File ? baseName(input.name) : "document";
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/* ------------------------- 1. PDF → images (JPG/PNG) ------------------------ */

export interface PdfToImagesOptions {
  /** "jpeg" (default) or "png" */
  format?: "jpeg" | "png";
  /** JPEG quality 0..1, default 0.85 */
  quality?: number;
  /** render resolution, default 150 */
  dpi?: number;
  /** blank = every page; validated against the document's page count */
  pagesSpec?: string;
}

export async function pdfToImages(
  input: File | Uint8Array,
  options: PdfToImagesOptions = {},
  ctx?: RunCtx
): Promise<ToolOutput[]> {
  const format = options.format ?? "jpeg";
  const quality = options.quality ?? 0.85;
  const dpi = options.dpi ?? 150;
  const bytes = input instanceof File ? await fileBytes(input) : input;
  const doc = await loadSource(bytes);
  const total = doc.getPageCount();
  if (total < 1) throw new Error("This PDF has no pages.");
  const spec = (options.pagesSpec ?? "").trim();
  const wanted = spec
    ? parsePageSpec(spec, total)
    : Array.from({ length: total }, (_, i) => i + 1);
  throwIfAborted(ctx?.signal);

  ctx?.progress({
    percent: 2,
    detail: `Rendering ${wanted.length} page${wanted.length === 1 ? "" : "s"}…`,
  });

  let canvases: HTMLCanvasElement[];
  try {
    canvases = await renderPages(bytes, {
      dpi,
      pages: wanted,
      signal: ctx?.signal,
      onProgress: (done, t) =>
        ctx?.progress({
          percent: 2 + Math.round((done / t) * 85),
          detail: `Rendering page ${done} of ${t}…`,
        }),
    });
  } catch (err) {
    throw toFriendlyError(
      err,
      "Couldn't render this PDF — it may be corrupted or use unsupported features."
    );
  }

  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  const ext = format === "jpeg" ? "jpg" : "png";
  const base = fileBase(input);
  const outputs: ToolOutput[] = [];

  for (let i = 0; i < canvases.length; i++) {
    throwIfAborted(ctx?.signal);
    const canvas = canvases[i];
    const pageNum = wanted[i];
    try {
      const data = await canvasToBlobBytes(
        canvas,
        mime,
        format === "jpeg" ? quality : undefined
      );
      outputs.push(
        blobOutput(
          `${base}-page-${String(pageNum).padStart(3, "0")}.${ext}`,
          bytesToBlob(data, mime),
          `page ${pageNum} · ${canvas.width}×${canvas.height} px`
        )
      );
    } catch (err) {
      throw toFriendlyError(err, "Could not encode a page image — try a lower DPI.");
    }
    ctx?.progress({
      percent: 88 + Math.round(((i + 1) / canvases.length) * 12),
      detail: `Encoding image ${i + 1} of ${canvases.length}…`,
    });
  }
  return outputs;
}

/* ------------------------------ 2. images → PDF ----------------------------- */

export interface ImagesToPdfOptions {
  /**
   * "auto" — page matches the image at 72 dpi (1 px = 1 pt);
   * "a4"/"letter" — image scaled to fit & centered with 24 pt margins,
   * page orientation picked per image.
   */
  pageSize?: "auto" | "a4" | "letter";
}

const IMAGE_PAGE_MARGIN_PT = 24;

function isHeicFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/** HEIC/HEIF → PNG blob via heic2any (lazy-loaded, keeps everything local). */
async function heicToPngBlob(file: File): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/png" });
  return Array.isArray(result) ? result[0] : result;
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be decoded."));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/** Decode any browser-supported image blob onto a canvas (alpha preserved). */
async function drawBlobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    bitmap = null;
  }
  try {
    if (bitmap) {
      canvas.width = Math.max(1, bitmap.width);
      canvas.height = Math.max(1, bitmap.height);
      ctx.drawImage(bitmap, 0, 0);
    } else {
      const img = await loadImageElement(blob);
      canvas.width = Math.max(1, img.naturalWidth || 1);
      canvas.height = Math.max(1, img.naturalHeight || 1);
      ctx.drawImage(img, 0, 0);
    }
  } finally {
    bitmap?.close();
  }
  return canvas;
}

/**
 * Embed one image file into the document. Native JPEG/PNG bytes go straight
 * into pdf-lib (with a canvas-decode fallback for exotic encodings like CMYK);
 * everything else (WebP, GIF, BMP, HEIC…) is decoded and re-encoded as PNG.
 */
async function embedImageFile(
  doc: PDFDocument,
  file: File
): Promise<{ image: PDFImage; width: number; height: number }> {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const isJpeg =
    type === "image/jpeg" || type === "image/jpg" || /\.(jpe?g)$/.test(name);
  const isPng = type === "image/png" || name.endsWith(".png");

  if (isJpeg || isPng) {
    try {
      const bytes = await fileBytes(file);
      const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      return { image: img, width: img.width, height: img.height };
    } catch (err) {
      if (isAbort(err)) throw err;
      // fall through to the decode path below
    }
  }

  try {
    const blob = isHeicFile(file) ? await heicToPngBlob(file) : file;
    const canvas = await drawBlobToCanvas(blob);
    const png = await canvasToBlobBytes(canvas, "image/png");
    const img = await doc.embedPng(png);
    return { image: img, width: canvas.width, height: canvas.height };
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new Error(
      `Couldn't decode ${file.name} — try converting it to JPG or PNG first.`
    );
  }
}

export async function imagesToPdf(
  input: File | File[],
  options: ImagesToPdfOptions = {},
  ctx?: RunCtx
): Promise<ToolOutput[]> {
  const files = Array.isArray(input) ? input : [input];
  if (!files.length) throw new Error("Add at least one image first.");
  const pageSize = options.pageSize ?? "auto";
  const out = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    throwIfAborted(ctx?.signal);
    const file = files[i];
    ctx?.progress({
      percent: Math.round((i / total) * 94),
      detail: `Placing ${file.name} (${i + 1} of ${total})…`,
    });
    const { image, width, height } = await embedImageFile(out, file);

    if (pageSize === "auto") {
      // 1 px = 1 pt → the page is the image at its natural 72-dpi size.
      const page = out.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    } else {
      const [shortSide, longSide] = PAPER_PT[pageSize];
      const landscape = width > height;
      const pageW = landscape ? longSide : shortSide;
      const pageH = landscape ? shortSide : longSide;
      const scale = Math.min(
        (pageW - 2 * IMAGE_PAGE_MARGIN_PT) / width,
        (pageH - 2 * IMAGE_PAGE_MARGIN_PT) / height
      );
      const w = Math.max(1, width * scale);
      const h = Math.max(1, height * scale);
      const page = out.addPage([pageW, pageH]);
      page.drawImage(image, {
        x: (pageW - w) / 2,
        y: (pageH - h) / 2,
        width: w,
        height: h,
      });
    }
  }

  const pdfBytes = await savePdf(out);
  const sizeLabel =
    pageSize === "auto"
      ? "image-size pages"
      : `${pageSize.toUpperCase()} pages`;
  return [
    pdfOutput(
      "images-to-fixmypdf.pdf",
      pdfBytes,
      `${total} image${total === 1 ? "" : "s"} · ${sizeLabel} · ${formatBytes(pdfBytes.length)}`
    ),
  ];
}

/* ---------------------------- 3. PDF → grayscale ---------------------------- */

export interface GrayscaleOptions {
  /** JPEG quality 0..1 for the rebuilt pages, default 0.75 */
  quality?: number;
}

export async function grayscalePdf(
  input: File | Uint8Array,
  options: GrayscaleOptions = {},
  ctx?: RunCtx
): Promise<ToolOutput[]> {
  const quality = options.quality ?? 0.75;
  const bytes = input instanceof File ? await fileBytes(input) : input;
  const doc = await loadSource(bytes);
  const pages = doc.getPageCount();
  if (pages < 1) throw new Error("This PDF has no pages.");
  throwIfAborted(ctx?.signal);

  ctx?.progress({
    percent: 4,
    detail: `Converting ${pages} page${pages === 1 ? "" : "s"} to grayscale…`,
  });

  let out: Uint8Array;
  try {
    out = await rasterizePdfBytes(
      bytes,
      {
        dpi: 150,
        gray: true,
        signal: ctx?.signal,
        onProgress: (done, t) =>
          ctx?.progress({
            percent: 4 + Math.round((done / t) * 88),
            detail: `Grayscale page ${done} of ${t}…`,
          }),
      },
      { dpi: 150, quality }
    );
  } catch (err) {
    throw toFriendlyError(
      err,
      "Couldn't render this PDF — it may be corrupted or use unsupported features."
    );
  }

  return [
    pdfOutput(
      `${fileBase(input)}-grayscale.pdf`,
      out,
      `${pages} pages · ${formatBytes(out.length)}`
    ),
  ];
}

/* --------------------- shared N-up / booklet tile helpers -------------------- */

const SHEET_MARGIN_PT = 18;
const SHEET_GUTTER_PT = 8;
const TILE_BORDER_COLOR = rgb(0.8, 0.8, 0.85);

interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function fitTile(srcW: number, srcH: number, cell: TileRect): TileRect {
  const scale = Math.min(cell.width / srcW, cell.height / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return {
    x: cell.x + (cell.width - width) / 2,
    y: cell.y + (cell.height - height) / 2,
    width,
    height,
  };
}

/** Embed a source page into a cell, aspect-fit centered, with a hairline border. */
async function drawTile(
  out: PDFDocument,
  page: PDFPage,
  srcPage: PDFPage,
  cell: TileRect
): Promise<void> {
  let embedded: PDFEmbeddedPage;
  let rect: TileRect;
  try {
    // pdf-lib resolves the source page's resources lazily at draw time,
    // so both calls must be guarded.
    embedded = await out.embedPage(srcPage);
    rect = fitTile(embedded.width, embedded.height, cell);
    page.drawPage(embedded, rect);
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new Error(
      "Couldn't process this PDF — a page looks empty or damaged. Try repairing it first."
    );
  }
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    borderColor: TILE_BORDER_COLOR,
    borderWidth: 0.5,
  });
}

/** Two cells side by side (left → right) inside a landscape sheet. */
function sideBySideCells(sheetW: number, sheetH: number): TileRect[] {
  const cellW = (sheetW - 2 * SHEET_MARGIN_PT - SHEET_GUTTER_PT) / 2;
  const cellH = sheetH - 2 * SHEET_MARGIN_PT;
  return [
    { x: SHEET_MARGIN_PT, y: SHEET_MARGIN_PT, width: cellW, height: cellH },
    {
      x: SHEET_MARGIN_PT + cellW + SHEET_GUTTER_PT,
      y: SHEET_MARGIN_PT,
      width: cellW,
      height: cellH,
    },
  ];
}

/* --------------------------------- 4. N-up ---------------------------------- */

export type NUpLayout = "2-up" | "4-up";

export interface NUpOptions {
  layout?: NUpLayout;
  paper?: "a4" | "letter";
}

export async function nUpPdf(
  input: File | Uint8Array,
  options: NUpOptions = {},
  ctx?: RunCtx
): Promise<ToolOutput[]> {
  const layout: NUpLayout = options.layout ?? "2-up";
  const paper = options.paper ?? "a4";
  const bytes = input instanceof File ? await fileBytes(input) : input;
  const src = await loadSource(bytes);
  const pageCount = src.getPageCount();
  if (pageCount < 1) throw new Error("This PDF has no pages.");

  const [shortSide, longSide] = PAPER_PT[paper];
  const perSheet = layout === "2-up" ? 2 : 4;
  const sheetW = layout === "2-up" ? longSide : shortSide;
  const sheetH = layout === "2-up" ? shortSide : longSide;

  // Reading order: left → right, top → bottom (PDF y-axis points up).
  let cells: TileRect[];
  if (perSheet === 2) {
    cells = sideBySideCells(sheetW, sheetH);
  } else {
    const [c0, c1] = sideBySideCells(sheetW, sheetH);
    const cellH = (sheetH - 2 * SHEET_MARGIN_PT - SHEET_GUTTER_PT) / 2;
    const rowTop = SHEET_MARGIN_PT + cellH + SHEET_GUTTER_PT;
    cells = [
      { ...c0, y: rowTop, height: cellH }, // top-left
      { ...c1, y: rowTop, height: cellH }, // top-right
      { ...c0, y: SHEET_MARGIN_PT, height: cellH }, // bottom-left
      { ...c1, y: SHEET_MARGIN_PT, height: cellH }, // bottom-right
    ];
  }

  const sheetCount = Math.ceil(pageCount / perSheet);
  const out = await PDFDocument.create();

  for (let s = 0; s < sheetCount; s++) {
    throwIfAborted(ctx?.signal);
    ctx?.progress({
      percent: Math.min(98, Math.round(((s + 0.15) / sheetCount) * 100)),
      detail: `Building sheet ${s + 1} of ${sheetCount}…`,
    });
    const page = out.addPage([sheetW, sheetH]);
    for (let c = 0; c < perSheet; c++) {
      const idx = s * perSheet + c;
      if (idx >= pageCount) break; // skip empty trailing cells
      await drawTile(out, page, src.getPage(idx), cells[c]);
    }
  }

  let outBytes: Uint8Array;
  try {
    outBytes = await savePdf(out);
  } catch (err) {
    throw toFriendlyError(
      err,
      "Couldn't build the sheets — a source page looks empty or damaged. Try repairing the PDF first."
    );
  }
  return [
    pdfOutput(
      `${fileBase(input)}-${layout.replace("-", "")}.pdf`,
      outBytes,
      `${pageCount} pages → ${sheetCount} sheet${sheetCount === 1 ? "" : "s"} · ${formatBytes(outBytes.length)}`
    ),
  ];
}

/* -------------------------------- 5. booklet -------------------------------- */

export interface BookletOptions {
  /** Sheet size — always landscape, 2 pages per side. */
  paper?: "a4" | "letter";
}

/**
 * Saddle-stitch imposition: pages are re-ordered so that printing the result
 * double-sided (flip on long edge) and folding the stack in half yields a
 * booklet whose pages read in order.
 */
export async function bookletPdf(
  input: File | Uint8Array,
  options: BookletOptions = {},
  ctx?: RunCtx
): Promise<ToolOutput[]> {
  const paper = options.paper ?? "a4";
  const bytes = input instanceof File ? await fileBytes(input) : input;
  const src = await loadSource(bytes);
  const n = src.getPageCount();
  if (n < 1) throw new Error("This PDF has no pages.");

  const padded = Math.ceil(n / 4) * 4;
  // Canonical fold order — groups of 4: [last, first, second, second-last],
  // then [third-last, third, fourth, fourth-last], … (1-based).
  const order: number[] = [];
  for (let s = 0; s < padded / 4; s++) {
    order.push(padded - 2 * s, 2 * s + 1, 2 * s + 2, padded - 2 * s - 1);
  }
  // Each sheet carries two slots: [left, right]. Numbers > n are padding.
  const sheetCount = padded / 2;

  const [shortSide, longSide] = PAPER_PT[paper];
  const sheetW = longSide;
  const sheetH = shortSide;
  const cells = sideBySideCells(sheetW, sheetH);

  const out = await PDFDocument.create();
  for (let s = 0; s < sheetCount; s++) {
    throwIfAborted(ctx?.signal);
    ctx?.progress({
      percent: Math.min(98, Math.round(((s + 0.15) / sheetCount) * 100)),
      detail: `Imposing sheet ${s + 1} of ${sheetCount}…`,
    });
    const page = out.addPage([sheetW, sheetH]);
    for (let c = 0; c < 2; c++) {
      const num = order[s * 2 + c];
      if (num === undefined || num > n) continue; // blank cell (padding)
      await drawTile(out, page, src.getPage(num - 1), cells[c]);
    }
  }

  let outBytes: Uint8Array;
  try {
    outBytes = await savePdf(out);
  } catch (err) {
    throw toFriendlyError(
      err,
      "Couldn't build the booklet — a source page looks empty or damaged. Try repairing the PDF first."
    );
  }
  return [
    pdfOutput(
      `${fileBase(input)}-booklet.pdf`,
      outBytes,
      `${n} pages → ${sheetCount} printed sides (${Math.ceil(sheetCount / 2)} sheets double-sided) · ${formatBytes(outBytes.length)}`
    ),
  ];
}
