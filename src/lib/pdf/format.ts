/**
 * Pure helpers for FixMyPDF — no DOM, no PDF libs. Deterministic and SSR-safe.
 */

/* ---------------------------------- sizes ---------------------------------- */

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : decimals)} ${units[i]}`;
}

export function mbToBytes(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

/* ------------------------------- page specs -------------------------------- */

/**
 * Parse a human page spec like "3, 7, 12, 19-23" (also accepts "3 7 12",
 * en-dashes, semicolons) into a sorted, deduped, validated page list.
 * Throws an Error with a friendly message when something is invalid.
 */
export function parsePageSpec(spec: string, maxPage: number): number[] {
  const cleaned = spec.replace(/[–—]/g, "-").trim();
  if (!cleaned) throw new Error("Enter at least one page number.");
  if (maxPage < 1) throw new Error("This document has no pages.");

  const out = new Set<number>();
  for (const rawPart of cleaned.split(/[,;\s]+/).filter(Boolean)) {
    const m = rawPart.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) {
      throw new Error(
        `"${rawPart}" is not a valid page or range. Use forms like 7 or 4-9.`
      );
    }
    let a = parseInt(m[1], 10);
    let b = m[2] !== undefined ? parseInt(m[2], 10) : a;
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > maxPage) {
      throw new Error(`Pages must be between 1 and ${maxPage}.`);
    }
    for (let p = a; p <= b; p++) out.add(p);
  }
  return [...out].sort((x, y) => x - y);
}

function groupRuns(pages: number[]): Array<[number, number]> {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];
  for (const p of sorted) {
    const last = runs[runs.length - 1];
    if (last && p === last[1] + 1) last[1] = p;
    else runs.push([p, p]);
  }
  return runs;
}

/** [3,7,12,19,20,21,23] -> "3, 7, 12, 19-21, 23" */
export function pagesToCompactSpec(pages: number[]): string {
  return groupRuns(pages)
    .map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`))
    .join(", ");
}

/** [3,7,12,19,20,21] -> "3-7-12-19-21" (for download filenames) */
export function pagesForFilename(pages: number[]): string {
  return groupRuns(pages)
    .map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`))
    .join("-");
}

export function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "_");
}

/* --------------------------- requirements parser --------------------------- */

export type RequirementKind = "size" | "pages" | "format" | "dimensions";

export interface ParsedRequirement {
  kind: RequirementKind;
  /** Human chip label, e.g. "≤ 2.0 MB" */
  label: string;
  maxBytes?: number;
  maxPages?: number;
}

/**
 * Deterministically parse requirement text a user pasted from a website, e.g.:
 * "The uploaded file must be a PDF, maximum size 2 MB, maximum 10 pages."
 * No AI — just patterns. The strictest (smallest) limit wins.
 */
export function parseRequirements(text: string): ParsedRequirement[] {
  const t = text.toLowerCase().replace(/,/g, ".");
  const out: ParsedRequirement[] = [];
  if (!t.trim()) return out;

  // ---- size limits: "2 MB", "500 kb", "maximum 5 megabytes", "under 100 KB"
  let maxBytes: number | undefined;
  const sizeRe = /(\d+(?:\.\d+)?)\s*(mbytes|megabytes?|mb|kbytes|kilobytes?|kb)\b/g;
  for (const m of t.matchAll(sizeRe)) {
    const n = parseFloat(m[1]);
    const unit = m[2];
    const isKb = unit.startsWith("k");
    if (!Number.isFinite(n) || n <= 0) continue;
    const bytes = Math.round(n * (isKb ? 1024 : 1024 * 1024));
    if (maxBytes === undefined || bytes < maxBytes) maxBytes = bytes;
  }
  if (maxBytes !== undefined) {
    out.push({ kind: "size", label: `≤ ${formatBytes(maxBytes)}`, maxBytes });
  }

  // ---- page limits: "max 10 pages", "up to 20 pages", "10-page", "4 sheets"
  let maxPages: number | undefined;
  const pagesRe = /(\d+)\s*-?\s*(?:pages?|sheets?|slides?)\b/g;
  for (const m of t.matchAll(pagesRe)) {
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (maxPages === undefined || n < maxPages) maxPages = n;
  }
  if (maxPages !== undefined) {
    out.push({ kind: "pages", label: `≤ ${maxPages} pages`, maxPages });
  }

  // ---- file formats mentioned
  const fmtRe = /\b(pdf|jpe?g|png|heic|tiff?|gif|bmp|webp|docx?|xlsx?|pptx?)\b/g;
  const formats = new Set<string>();
  for (const m of t.matchAll(fmtRe)) formats.add(m[1]);
  if (formats.size > 0) {
    out.push({
      kind: "format",
      label: `${[...formats].map((f) => f.toUpperCase()).join(", ")} mentioned`,
    });
  }

  // ---- pixel dimensions (image-oriented requirement, informational for PDFs)
  const dimRe = /(\d{2,5})\s*[x×]\s*(\d{2,5})/g;
  const dims = new Set<string>();
  for (const m of t.matchAll(dimRe)) dims.add(`${m[1]}×${m[2]}`);
  if (dims.size > 0) {
    out.push({
      kind: "dimensions",
      label: `${[...dims].map((d) => `${d} px (images)`).join(", ")}`,
    });
  }

  return out;
}

/* -------------------------------- downloads -------------------------------- */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
