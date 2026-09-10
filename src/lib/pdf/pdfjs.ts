/**
 * Lazy pdf.js loader. pdf.js must never execute during SSR, so it is only
 * imported dynamically — from browser-only code paths (event handlers etc.).
 * The worker file is version-locked: public/pdf.worker.min.mjs is copied from
 * node_modules/pdfjs-dist/build/pdf.worker.min.mjs at install time.
 */
import type * as PdfjsModule from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

let cached: typeof PdfjsModule | null = null;

export async function getPdfjs(): Promise<typeof PdfjsModule> {
  if (cached) return cached;
  if (typeof window === "undefined") {
    throw new Error("PDF engine can only run in the browser.");
  }
  const mod = await import("pdfjs-dist");
  if (!mod.GlobalWorkerOptions.workerSrc) {
    mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  cached = mod;
  return mod;
}

export interface PdfjsDocumentHandle {
  doc: PDFDocumentProxy;
  /** Destroys the worker + document. Always call when finished. */
  destroy: () => Promise<void>;
}

/** Load a PDFDocumentProxy from raw bytes (safe copies — pdf.js transfers buffers). */
export async function loadPdfjsDoc(
  bytes: Uint8Array,
  onProgress?: (loaded: number, total: number) => void
): Promise<PdfjsDocumentHandle> {
  const pdfjs = await getPdfjs();
  const task = pdfjs.getDocument({
    data: bytes.slice(0),
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  });
  task.onProgress = (p: { loaded: number; total: number }) =>
    onProgress?.(p.loaded, p.total);
  const doc = await task.promise;
  return { doc, destroy: () => task.destroy() };
}
