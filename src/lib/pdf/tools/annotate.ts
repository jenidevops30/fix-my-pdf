/**
 * FixMyPDF Tool Shed — "annotate" engines (fill forms, sign, page numbers,
 * watermark, header/footer).
 *
 * 100% client-side: pdf-lib does the stamping/filling; nothing ever uploads.
 * Every engine:
 *  - loads through kit.loadPdf (ignoreEncryption) and then refuses to
 *    *work on* password-protected files with an honest, friendly error;
 *  - reports progress through ctx and honours cancellation (throwIfAborted);
 *  - names outputs deterministically via baseName.
 */
import {
  degrees,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  rgb,
  StandardFonts,
} from "pdf-lib";
import type { PDFFont, PDFField } from "pdf-lib";
import { baseName } from "../format";
import { loadPdf, pdfOutput, savePdf, throwIfAborted } from "./kit";
import type { RunCtx, ToolOutput } from "./types";

/* ---------------------------------- types ---------------------------------- */

export type FillValues = Record<string, string | boolean>;

export type SignatureAnchor =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "bottom-center";

export interface SignatureStampCfg {
  /** PNG bytes of the signature (transparent background). */
  pngBytes: Uint8Array;
  /** 1-based page number. */
  page: number;
  anchor: SignatureAnchor;
  /** Signature width as % of page width (10..50 typical). */
  widthPct: number;
  /** Distance from the bottom edge as % of page height (top anchors use it from the top). */
  offsetPct: number;
}

export type StampPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export type PageNumberFormat = "n" | "n-of-n" | "page-n-of-n";

export interface PageNumbersCfg {
  format: PageNumberFormat;
  position: StampPosition;
  start: number;
  size: number;
  skipFirst: boolean;
}

export type WatermarkColor = "slate" | "red" | "orange" | "emerald";

export interface WatermarkCfg {
  mode: "text" | "image";
  text?: string;
  /** Text height in pt (24..120 typical). */
  size?: number;
  /** Rotation in degrees (0..90). */
  rotation?: number;
  /** Opacity in percent (5..60 typical). */
  opacityPct?: number;
  color?: WatermarkColor;
  /** Repeat diagonally across the page instead of one centred stamp. */
  tiling?: boolean;
  /** PNG or JPG bytes (image mode). */
  imageBytes?: Uint8Array;
  /** Image width as % of page width. */
  imageScalePct?: number;
  imagePosition?: "center" | "corners";
}

export interface HeaderFooterSlot {
  left?: string;
  center?: string;
  right?: string;
}

export interface HeaderFooterCfg {
  header?: HeaderFooterSlot;
  footer?: HeaderFooterSlot;
  /** Base font size 8..10 typical. */
  size?: number;
}

/* --------------------------------- helpers --------------------------------- */

function assertNotEncrypted(doc: PDFDocument): void {
  if (doc.isEncrypted) {
    throw new Error(
      "This PDF is password-protected. Open it once and re-save it without a password, then try again."
    );
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const WATERMARK_COLORS: Record<WatermarkColor, { r: number; g: number; b: number }> = {
  slate: { r: 0.28, g: 0.33, b: 0.41 },
  red: { r: 0.86, g: 0.15, b: 0.15 },
  orange: { r: 0.92, g: 0.35, b: 0.05 },
  emerald: { r: 0.02, g: 0.59, b: 0.41 },
};

function isPngBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/** Shrink (then chop) a stamp line until it fits `available` pt. */
function fitStampText(
  font: PDFFont,
  text: string,
  size: number,
  available: number
): { text: string; size: number; width: number } {
  let s = size;
  let t = text;
  while (s > 6 && font.widthOfTextAtSize(t, s) > available) s -= 0.5;
  if (font.widthOfTextAtSize(t, s) > available) {
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, s) > available) {
      t = t.slice(0, -1);
    }
    t = `${t}…`;
  }
  return { text: t, size: s, width: font.widthOfTextAtSize(t, s) };
}

/* -------------------------------- fill forms ------------------------------- */

/**
 * Fill AcroForm fields with user values, one field per try/catch so one
 * exotic widget never blocks the rest. Optionally flattens; if flattening
 * fails the filled-but-editable file is still returned.
 */
export async function fillForm(
  file: File,
  values: FillValues,
  flatten: boolean,
  ctx: RunCtx
): Promise<ToolOutput> {
  ctx.progress({ percent: 6, detail: "Reading form fields…" });
  const doc = await loadPdf(file);
  assertNotEncrypted(doc);
  const form = doc.getForm();
  const fields = form.getFields();
  if (!fields.length) {
    throw new Error(
      "This PDF has no fillable form fields (no AcroForm). Scanned paper forms can't be typed into."
    );
  }

  let set = 0;
  const skipped: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    throwIfAborted(ctx.signal);
    const field: PDFField = fields[i];
    const name = field.getName();
    const raw = values[name];
    if (raw === undefined || raw === null || raw === "") continue;
    try {
      if (field instanceof PDFTextField) {
        field.setText(String(raw));
      } else if (field instanceof PDFCheckBox) {
        if (raw) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown) {
        field.select(String(raw));
      } else if (field instanceof PDFRadioGroup) {
        field.select(String(raw));
      } else if (field instanceof PDFOptionList) {
        field.select(String(raw));
      } else {
        continue; // push-buttons / signature fields — nothing to fill
      }
      set++;
    } catch {
      skipped.push(name);
    }
  }

  ctx.progress({ percent: 72, detail: flatten ? "Flattening fields…" : "Saving filled form…" });
  let flattenNote = "";
  if (flatten) {
    try {
      form.flatten();
    } catch {
      flattenNote = "flatten failed — fields left editable";
    }
  }

  const bytes = await savePdf(doc);
  const meta = [`${set} of ${fields.length} fields set`];
  if (skipped.length) {
    meta.push(
      `skipped: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? ` +${skipped.length - 3} more` : ""}`
    );
  }
  if (flattenNote) meta.push(flattenNote);
  return pdfOutput(`${baseName(file.name)}-filled.pdf`, bytes, meta.join(" · "));
}

/* --------------------------------- sign ------------------------------------ */

/**
 * Stamp a transparent PNG signature onto one page, anchored to a corner /
 * edge with percentage-based sizing and offsets.
 */
export async function stampSignature(
  file: File,
  cfg: SignatureStampCfg,
  ctx: RunCtx
): Promise<ToolOutput> {
  ctx.progress({ percent: 8, detail: `Embedding signature on page ${cfg.page}…` });
  const doc = await loadPdf(file);
  assertNotEncrypted(doc);
  const pageCount = doc.getPageCount();
  if (!pageCount) throw new Error("This document has no pages.");
  if (cfg.page < 1 || cfg.page > pageCount) {
    throw new Error(
      `Page ${cfg.page} doesn't exist — this PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`
    );
  }

  let img;
  try {
    img = await doc.embedPng(cfg.pngBytes);
  } catch {
    throw new Error("The signature image could not be embedded — try drawing it again.");
  }

  const page = doc.getPage(cfg.page - 1);
  const { width: pageW, height: pageH } = page.getSize();
  const width = Math.max(8, (pageW * clamp(cfg.widthPct, 1, 100)) / 100);
  const height = width * (img.height / Math.max(img.width, 1));
  const xMargin = pageW * 0.04;
  const yOffset = (pageH * clamp(cfg.offsetPct, 0, 50)) / 100;

  let x: number;
  let y: number;
  switch (cfg.anchor) {
    case "bottom-right":
      x = pageW - xMargin - width;
      y = yOffset;
      break;
    case "bottom-left":
      x = xMargin;
      y = yOffset;
      break;
    case "bottom-center":
      x = (pageW - width) / 2;
      y = yOffset;
      break;
    case "top-right":
      x = pageW - xMargin - width;
      y = pageH - yOffset - height;
      break;
    case "top-left":
      x = xMargin;
      y = pageH - yOffset - height;
      break;
  }

  page.drawImage(img, { x, y, width, height });
  ctx.progress({ percent: 84, detail: "Saving signed PDF…" });
  const bytes = await savePdf(doc);
  const anchorLabel = cfg.anchor.replace("-", " ");
  return pdfOutput(
    `${baseName(file.name)}-signed.pdf`,
    bytes,
    `Page ${cfg.page} · ${anchorLabel} · ${Math.round(cfg.widthPct)}% width`
  );
}

/* ------------------------------ page numbers -------------------------------- */

/**
 * Stamp page numbers (start + index; "skip first" removes the first stamp
 * without shifting the sequence) in 24pt margins.
 */
export async function addPageNumbers(
  file: File,
  cfg: PageNumbersCfg,
  ctx: RunCtx
): Promise<ToolOutput> {
  const doc = await loadPdf(file);
  assertNotEncrypted(doc);
  const pages = doc.getPages();
  if (!pages.length) throw new Error("This document has no pages.");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = clamp(cfg.size || 10, 6, 24);
  const start = Number.isFinite(cfg.start) ? Math.max(1, Math.floor(cfg.start)) : 1;
  const last = start + pages.length - 1;
  const color = rgb(0.35, 0.39, 0.48);
  const formatLabel =
    cfg.format === "n" ? "1" : cfg.format === "page-n-of-n" ? "Page 1 of N" : "1 / N";

  for (let i = 0; i < pages.length; i++) {
    throwIfAborted(ctx.signal);
    if (cfg.skipFirst && i === 0) continue;
    const page = pages[i];
    const num = start + i;
    const label =
      cfg.format === "n"
        ? `${num}`
        : cfg.format === "page-n-of-n"
          ? `Page ${num} of ${last}`
          : `${num} / ${last}`;
    const { width: pageW, height: pageH } = page.getSize();
    const w = font.widthOfTextAtSize(label, size);
    let x = 24;
    if (cfg.position.endsWith("right")) x = pageW - 24 - w;
    else if (cfg.position.endsWith("center")) x = (pageW - w) / 2;
    const y = cfg.position.startsWith("top") ? pageH - 24 : 24;
    page.drawText(label, { x, y, size, font, color });
    if (i % 4 === 0 || i === pages.length - 1) {
      ctx.progress({
        percent: 5 + Math.round(((i + 1) / pages.length) * 88),
        detail: `Stamping page ${i + 1} of ${pages.length}`,
      });
    }
  }

  ctx.progress({ percent: 96, detail: "Saving…" });
  const bytes = await savePdf(doc);
  const meta = [`${pages.length} pages · "${formatLabel}" · from ${start}`];
  if (cfg.skipFirst) meta.push("first page skipped");
  return pdfOutput(`${baseName(file.name)}-numbered.pdf`, bytes, meta.join(" · "));
}

/* -------------------------------- watermark --------------------------------- */

/**
 * Stamp text (optionally tiled diagonally) or an image over every page with
 * true PDF opacity. Text is centred via a rotated-bbox midpoint calculation.
 */
export async function addWatermark(
  file: File,
  cfg: WatermarkCfg,
  ctx: RunCtx
): Promise<ToolOutput> {
  const doc = await loadPdf(file);
  assertNotEncrypted(doc);
  const pages = doc.getPages();
  if (!pages.length) throw new Error("This document has no pages.");
  const opacity = clamp((cfg.opacityPct ?? 14) / 100, 0.02, 1);
  const meta: string[] = [];

  if (cfg.mode === "text") {
    const text = (cfg.text ?? "").trim() || "CONFIDENTIAL";
    const size = clamp(cfg.size ?? 72, 8, 200);
    const rotation = clamp(cfg.rotation ?? 45, 0, 90);
    const c = WATERMARK_COLORS[cfg.color ?? "slate"];
    const color = rgb(c.r, c.g, c.b);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const w = font.widthOfTextAtSize(text, size);
    const rad = (rotation * Math.PI) / 180;

    for (let i = 0; i < pages.length; i++) {
      throwIfAborted(ctx.signal);
      const page = pages[i];
      const { width: pageW, height: pageH } = page.getSize();

      if (cfg.tiling) {
        // Grid every ~pageW/3, alternating rows offset half a step → diagonal lattice.
        const step = Math.max(pageW / 3, 120);
        const rowStep = step * 0.85;
        const cols = Math.ceil(pageW / step) + 2;
        const rows = Math.ceil(pageH / rowStep) + 2;
        for (let r = 0; r <= rows; r++) {
          const y = pageH - size - r * rowStep;
          const shift = (r % 2) * (step / 2);
          for (let col = 0; col <= cols; col++) {
            const x = col * step - step + shift;
            page.drawText(text, { x, y, size, font, color, opacity, rotate: degrees(rotation) });
          }
        }
      } else {
        // Place the rotated text so its visual midpoint lands on the page centre.
        const x = pageW / 2 - (w / 2) * Math.cos(rad) + size * 0.36 * Math.sin(rad);
        const y = pageH / 2 - (w / 2) * Math.sin(rad) - size * 0.36 * Math.cos(rad);
        page.drawText(text, { x, y, size, font, color, opacity, rotate: degrees(rotation) });
      }

      if (i % 4 === 0 || i === pages.length - 1) {
        ctx.progress({
          percent: 5 + Math.round(((i + 1) / pages.length) * 88),
          detail: `Stamping page ${i + 1} of ${pages.length}`,
        });
      }
    }
    meta.push(`"${text}"`, `${Math.round(rotation)}°`, `${Math.round(opacity * 100)}% opacity`);
  } else {
    if (!cfg.imageBytes || !cfg.imageBytes.length) {
      throw new Error("Choose an image to use as the watermark first.");
    }
    let img;
    try {
      img = isPngBytes(cfg.imageBytes)
        ? await doc.embedPng(cfg.imageBytes)
        : await doc.embedJpg(cfg.imageBytes);
    } catch {
      throw new Error("That image could not be embedded — use a PNG or JPG file.");
    }
    const scale = clamp(cfg.imageScalePct ?? 30, 2, 100) / 100;

    for (let i = 0; i < pages.length; i++) {
      throwIfAborted(ctx.signal);
      const page = pages[i];
      const { width: pageW, height: pageH } = page.getSize();
      const w = Math.max(8, pageW * scale);
      const h = w * (img.height / Math.max(img.width, 1));
      const margin = pageW * 0.04;

      const spots: Array<[number, number]> =
        cfg.imagePosition === "corners"
          ? [
              [margin, margin],
              [pageW - margin - w, margin],
              [margin, pageH - margin - h],
              [pageW - margin - w, pageH - margin - h],
            ]
          : [[(pageW - w) / 2, (pageH - h) / 2]];
      for (const [x, y] of spots) {
        page.drawImage(img, { x, y, width: w, height: h, opacity });
      }

      if (i % 4 === 0 || i === pages.length - 1) {
        ctx.progress({
          percent: 5 + Math.round(((i + 1) / pages.length) * 88),
          detail: `Stamping page ${i + 1} of ${pages.length}`,
        });
      }
    }
    meta.push(
      "image",
      `${Math.round(clamp(cfg.imageScalePct ?? 30, 2, 100))}% · ${cfg.imagePosition ?? "center"}`,
      `${Math.round(opacity * 100)}% opacity`
    );
  }

  ctx.progress({ percent: 96, detail: "Saving…" });
  const bytes = await savePdf(doc);
  return pdfOutput(`${baseName(file.name)}-watermarked.pdf`, bytes, meta.join(" · "));
}

/* ----------------------------- header & footer ------------------------------ */

/**
 * Draw up to three header slots and three footer slots per page in 24pt
 * margins. Long lines shrink (down to 6pt) and then truncate with an ellipsis
 * so they never spill off the page.
 */
export async function addHeaderFooter(
  file: File,
  cfg: HeaderFooterCfg,
  ctx: RunCtx
): Promise<ToolOutput> {
  const header = cfg.header ?? {};
  const footer = cfg.footer ?? {};
  const hasAny = [...Object.values(header), ...Object.values(footer)].some(
    (s) => (s ?? "").trim().length > 0
  );
  if (!hasAny) {
    throw new Error("Type at least one header or footer line first.");
  }

  const doc = await loadPdf(file);
  assertNotEncrypted(doc);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = clamp(cfg.size ?? 9, 6, 24);
  const pages = doc.getPages();
  if (!pages.length) throw new Error("This document has no pages.");
  const color = rgb(0.15, 0.18, 0.23);
  const MARGIN = 24;
  const GAP = 12;

  for (let i = 0; i < pages.length; i++) {
    throwIfAborted(ctx.signal);
    const page = pages[i];
    const { width: pageW, height: pageH } = page.getSize();
    const avail = pageW - MARGIN * 2;

    const lines: Array<{ raw: string; y: number; align: "left" | "center" | "right" }> = [];
    if ((header.left ?? "").trim()) lines.push({ raw: header.left!.trim(), y: pageH - MARGIN, align: "left" });
    if ((header.center ?? "").trim()) lines.push({ raw: header.center!.trim(), y: pageH - MARGIN, align: "center" });
    if ((header.right ?? "").trim()) lines.push({ raw: header.right!.trim(), y: pageH - MARGIN, align: "right" });
    if ((footer.left ?? "").trim()) lines.push({ raw: footer.left!.trim(), y: MARGIN, align: "left" });
    if ((footer.center ?? "").trim()) lines.push({ raw: footer.center!.trim(), y: MARGIN, align: "center" });
    if ((footer.right ?? "").trim()) lines.push({ raw: footer.right!.trim(), y: MARGIN, align: "right" });

    // Raw widths first so side slots can reserve room for each other.
    const rawWidth = new Map<number, number>();
    lines.forEach((l, idx) => rawWidth.set(idx, font.widthOfTextAtSize(l.raw, size)));

    const fitted = lines.map((l, idx) => {
      const others = lines.reduce((sum, o, j) => {
        if (j === idx) return sum;
        return sum + rawWidth.get(j)! + GAP;
      }, 0);
      const available = Math.max(40, avail - others);
      return fitStampText(font, l.raw, size, available);
    });

    lines.forEach((l, idx) => {
      const f = fitted[idx];
      let x: number;
      if (l.align === "left") x = MARGIN;
      else if (l.align === "right") x = pageW - MARGIN - f.width;
      else x = (pageW - f.width) / 2;
      page.drawText(f.text, { x, y: l.y, size: f.size, font, color });
    });

    if (i % 6 === 0 || i === pages.length - 1) {
      ctx.progress({
        percent: 5 + Math.round(((i + 1) / pages.length) * 88),
        detail: `Stamping page ${i + 1} of ${pages.length}`,
      });
    }
  }

  ctx.progress({ percent: 96, detail: "Saving…" });
  const bytes = await savePdf(doc);
  return pdfOutput(
    `${baseName(file.name)}-headfoot.pdf`,
    bytes,
    `${pages.length} pages · 24pt margins · Helvetica`
  );
}
