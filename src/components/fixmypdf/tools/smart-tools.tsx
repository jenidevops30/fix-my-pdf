"use client";

/**
 * Smart Insights group — extract-text, extract-images, why-big, visual-diff,
 * ocr, auto-prescribe.
 *
 * Contract notes:
 *  - standard tools render controls + one full-width run Button (dialog owns
 *    progress, cancellation and results);
 *  - "why-big" and "auto-prescribe" are reports, not converters — they run
 *    their analysis directly with their own inline progress/abort state and
 *    render the result inside the component;
 *  - cross-tool navigation goes through the shared "fixmypdf:open-tool"
 *    CustomEvent ({ id } for shed tools, { target: "workspace" } for the
 *    flagship size fitter / blank pages in the main workspace).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  Eraser,
  Gauge,
  GitCompareArrows,
  Image as ImageIcon,
  ImageDown,
  Loader2,
  PenLine,
  Ruler,
  Scale,
  ScanText,
  Sparkles,
  Stethoscope,
  Type,
  Unlock,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { formatBytes } from "@/lib/pdf/format";
import {
  analyzeSize,
  extractImages,
  extractText,
  gatherAutoSignals,
  ocrPdf,
  SIZE_KIND_LABEL,
  visualDiff,
} from "@/lib/pdf/tools/smart";
import type {
  AutoSignals,
  DiffMode,
  ExtractTextMode,
  SizeBucket,
  SizeReport,
} from "@/lib/pdf/tools/smart";
import type { ToolComponentProps, ToolDef, ToolProgress } from "@/lib/pdf/tools/types";
import { ToolHint, ToolNote, ToolStep } from "./parts";

/* ----------------------------- event plumbing ------------------------------ */

function openToolEvent(id: string): void {
  window.dispatchEvent(new CustomEvent("fixmypdf:open-tool", { detail: { id } }));
}

function goWorkspaceEvent(): void {
  window.dispatchEvent(
    new CustomEvent("fixmypdf:open-tool", { detail: { target: "workspace" } })
  );
}

function listPages(pages: number[]): string {
  const head = pages.slice(0, 5).join(", ");
  return pages.length > 5 ? `${head} +${pages.length - 5} more` : head;
}

function plural(n: number, one: string): string {
  return `${n} ${n === 1 ? one : `${one}s`}`;
}

/* ---------------------------- shared report bits --------------------------- */

interface QuickAction {
  label: string;
  kind: "tool" | "workspace";
  id?: string;
}

interface ReportSuggestion {
  icon: LucideIcon;
  title: string;
  reason: string;
  actions: QuickAction[];
}

function SuggestionCards({ items }: { items: ReportSuggestion[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((s, i) => (
        <div
          key={`${s.title}-${i}`}
          className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-3"
        >
          <span className="size-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <s.icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-bold leading-tight">{s.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {s.actions.map((a, j) => (
                <Button
                  key={a.label}
                  size="sm"
                  variant={j === 0 ? "default" : "outline"}
                  onClick={() => {
                    if (a.kind === "tool" && a.id) openToolEvent(a.id);
                    else goWorkspaceEvent();
                  }}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineProgress({
  progress,
  onCancel,
}: {
  progress: ToolProgress;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex items-center gap-2">
        <Loader2
          className="size-4 animate-spin text-orange-600 dark:text-orange-400 shrink-0"
          aria-hidden="true"
        />
        <p className="text-sm font-bold font-mono flex-1 truncate">
          {progress.detail ?? "Working…"}
        </p>
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {progress.percent}%
        </span>
      </div>
      <Progress value={progress.percent} />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2.5 leading-relaxed">
      <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
      {message}
    </p>
  );
}

function HealthyNote({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      <p className="text-xs font-medium">{children}</p>
    </div>
  );
}

/* --------------------------- 1. Extract Text tool -------------------------- */

function ExtractTextTool({ files, busy, run }: ToolComponentProps) {
  const [mode, setMode] = useState<ExtractTextMode>("one");
  const [pages, setPages] = useState("");

  return (
    <div className="space-y-5">
      <ToolStep n={1} title="Output style">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as ExtractTextMode)}
          className="gap-2"
        >
          <div className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <RadioGroupItem value="one" id="extract-text-one" className="mt-0.5" />
            <div>
              <Label htmlFor="extract-text-one" className="text-sm font-medium cursor-pointer">
                One file
              </Label>
              <p className="text-xs text-muted-foreground">
                A single .txt with “--- Page N ---” separators
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <RadioGroupItem value="per-page" id="extract-text-per-page" className="mt-0.5" />
            <div>
              <Label htmlFor="extract-text-per-page" className="text-sm font-medium cursor-pointer">
                One per page
              </Label>
              <p className="text-xs text-muted-foreground">
                One .txt per page, zipped together
              </p>
            </div>
          </div>
        </RadioGroup>
      </ToolStep>

      <ToolStep n={2} title="Pages (optional)" last>
        <Input
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder="All pages — or e.g. 1-3, 7"
          inputMode="numeric"
          aria-label="Pages to extract"
        />
        <ToolHint>
          Leave empty for every page. Scanned pages without a text layer come out
          empty — run the OCR tool for those instead.
        </ToolHint>
      </ToolStep>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run((ctx) => extractText(files[0], mode, pages, ctx))}
      >
        <Type className="size-4" aria-hidden="true" />
        {mode === "one" ? "Extract text to one file" : "Extract one text file per page"}
      </Button>
    </div>
  );
}

/* -------------------------- 2. Extract Images tool ------------------------- */

function ExtractImagesTool({ files, busy, run }: ToolComponentProps) {
  return (
    <div className="space-y-4">
      <ToolNote tone="amber">
        Best effort: JPEG streams come out untouched; some exotic encodings
        (JPX/JBIG2) are skipped.
      </ToolNote>
      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run((ctx) => extractImages(files[0], ctx))}
      >
        <ImageDown className="size-4" aria-hidden="true" />
        Pull the images out
      </Button>
    </div>
  );
}

/* ---------------------------- 3. Why-big tool ------------------------------ */

function reportToText(report: SizeReport): string {
  const pct = (b: number) => `${((b / Math.max(report.fileBytes, 1)) * 100).toFixed(1)}%`;
  const cats: Array<[string, SizeBucket]> = [
    [report.images.label, report.images],
    [report.fonts.label, report.fonts],
    [report.structure.label, report.structure],
    [report.content.label, report.content],
  ];
  return [
    "Why Is My File Big — FixMyPDF (measured in-browser, nothing uploaded)",
    `Total: ${formatBytes(report.fileBytes)} · ${plural(report.pageCount, "page")}${report.encrypted ? " · encrypted" : ""}`,
    "",
    ...cats.map(
      ([label, b]) =>
        `${label}: ${formatBytes(b.bytes)} (${pct(b.bytes)}) · ${plural(b.count, "object")}`
    ),
    "",
    "Biggest single objects:",
    ...report.top.map(
      (o, i) => `  ${i + 1}. ${formatBytes(o.bytes)} · ${SIZE_KIND_LABEL[o.kind]}`
    ),
  ].join("\n");
}

function buildWhyBigSuggestions(report: SizeReport): ReportSuggestion[] {
  const total = Math.max(report.fileBytes, 1);
  const share = (b: number) => b / total;
  const out: ReportSuggestion[] = [];

  if (share(report.images.bytes) >= 0.3 && report.images.bytes > 128 * 1024) {
    out.push({
      icon: ImageIcon,
      title: "Re-compress the images",
      reason: `${Math.round(share(report.images.bytes) * 100)}% of the file is embedded raster images — the size fitter re-encodes them at smarter DPI and quality.`,
      actions: [{ label: "Make It Fit", kind: "workspace" }],
    });
  }
  if (share(report.fonts.bytes) >= 0.3 && report.fonts.bytes > 128 * 1024) {
    out.push({
      icon: Type,
      title: "Trim embedded fonts",
      reason: `${Math.round(share(report.fonts.bytes) * 100)}% is font data — sanitizing rewrites the font tables, flattening turns pages into lean images.`,
      actions: [
        { label: "Sanitize", kind: "tool", id: "sanitize" },
        { label: "Flatten", kind: "tool", id: "flatten" },
      ],
    });
  } else if (share(report.content.bytes) >= 0.35 && report.content.bytes > 500 * 1024) {
    out.push({
      icon: Eraser,
      title: "Clean the content streams",
      reason: "Page content and misc objects dominate — sanitizing strips junk and re-serializes the file tightly.",
      actions: [{ label: "Sanitize", kind: "tool", id: "sanitize" }],
    });
  }
  if (report.encrypted) {
    out.push({
      icon: Unlock,
      title: "Remove the password first",
      reason: "The file is encrypted — several fixes refuse to rewrite locked documents.",
      actions: [{ label: "Unprotect", kind: "tool", id: "unprotect" }],
    });
  }
  if (
    report.fileBytes > 10 * 1024 * 1024 &&
    !out.some((s) => s.actions.some((a) => a.kind === "workspace"))
  ) {
    out.push({
      icon: Sparkles,
      title: "Shrink it under a limit",
      reason: `${formatBytes(report.fileBytes)} is past the 10 MB mark many portals reject — pick a target size and get the least-lossy pass that fits.`,
      actions: [{ label: "Make It Fit", kind: "workspace" }],
    });
  }
  return out;
}

function SizeReportView({ report }: { report: SizeReport }) {
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const total = Math.max(report.fileBytes, 1);
  const rows: Array<{ bucket: SizeBucket; cls: string }> = [
    { bucket: report.images, cls: "bg-orange-500" },
    { bucket: report.fonts, cls: "bg-emerald-500" },
    { bucket: report.structure, cls: "bg-slate-400 dark:bg-slate-500" },
    { bucket: report.content, cls: "bg-amber-500" },
  ];
  const suggestions = buildWhyBigSuggestions(report);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportToText(report));
      setCopyState("ok");
    } catch {
      setCopyState("fail");
    }
    window.setTimeout(() => setCopyState("idle"), 1800);
  }, [report]);

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold font-mono truncate">
          {formatBytes(report.fileBytes)} · {plural(report.pageCount, "page")}
          {report.encrypted ? " · encrypted" : ""}
        </p>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={copyReport}>
          {copyState === "ok" ? (
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <ClipboardCopy className="size-3.5" aria-hidden="true" />
          )}
          {copyState === "ok" ? "Copied" : copyState === "fail" ? "Copy failed" : "Copy report"}
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map(({ bucket, cls }) => {
          const pct = (bucket.bytes / total) * 100;
          return (
            <div key={bucket.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold font-mono">{bucket.label}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {formatBytes(bucket.bytes)} · {pct.toFixed(1)}% · {bucket.count} obj
                </p>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${cls}`}
                  style={{ width: `${bucket.count > 0 ? Math.max(pct, 1.5) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {report.top.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Biggest single objects
          </p>
          {report.top.map((o, i) => (
            <div
              key={`${o.bytes}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
            >
              <span className="text-xs font-mono text-muted-foreground">
                #{i + 1} · {SIZE_KIND_LABEL[o.kind]}
              </span>
              <span className="text-xs font-mono font-bold">{formatBytes(o.bytes)}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {suggestions.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            What to do about it
          </p>
          <SuggestionCards items={suggestions} />
        </div>
      ) : (
        <HealthyNote>
          Nothing obvious to fix — the bytes are spread across categories the way a
          healthy document looks.
        </HealthyNote>
      )}
    </div>
  );
}

function WhyBigTool({ files, busy }: ToolComponentProps) {
  const [result, setResult] = useState<{ file: File; report: SizeReport } | null>(null);
  const [progress, setProgress] = useState<ToolProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const file = files[0];
  const report = result && result.file === file ? result.report : null;

  useEffect(() => () => abortRef.current?.abort(), []);

  const analyze = useCallback(async () => {
    if (!file) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setResult(null);
    setProgress({ percent: 4, detail: "Reading file…" });
    try {
      const r = await analyzeSize(file, {
        signal: ctrl.signal,
        onProgress: (p) => setProgress(p),
      });
      if (ctrl.signal.aborted) return;
      setResult({ file, report: r });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not analyze this file.");
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setProgress(null);
    }
  }, [file]);

  return (
    <div className="space-y-4">
      <ToolNote tone="emerald">
        Measured directly from the file&apos;s internal objects — nothing is uploaded.
      </ToolNote>

      {progress ? (
        <InlineProgress
          progress={progress}
          onCancel={() => abortRef.current?.abort()}
        />
      ) : (
        <>
          {error && <ErrorNote message={error} />}
          {report && <SizeReportView report={report} />}
          <Button className="w-full" disabled={busy} onClick={analyze}>
            <Scale className="size-4" aria-hidden="true" />
            {report ? "Re-analyze this file" : "Analyze this file"}
          </Button>
          {!report && (
            <ToolHint>
              Counts every internal object — images, fonts, xref tables and page
              content — and shows the five biggest offenders.
            </ToolHint>
          )}
        </>
      )}
    </div>
  );
}

/* --------------------------- 4. Visual Diff tool --------------------------- */

function VisualDiffTool({ files, busy, run }: ToolComponentProps) {
  const [mode, setMode] = useState<DiffMode>("overlay");
  const [maxPagesInput, setMaxPagesInput] = useState("10");
  const maxPages = Math.min(50, Math.max(1, Math.round(Number(maxPagesInput) || 10)));

  return (
    <div className="space-y-5">
      <ToolStep n={1} title="Pages to compare">
        <Input
          value={maxPagesInput}
          onChange={(e) => setMaxPagesInput(e.target.value)}
          inputMode="numeric"
          aria-label="Maximum pages to compare"
        />
        <ToolHint>
          Compares the first {maxPages} page{maxPages === 1 ? "" : "s"} (1–50) of the
          shorter document — page 1 against page 1, page 2 against page 2, and so on.
        </ToolHint>
      </ToolStep>

      <ToolStep n={2} title="Difference style" last>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as DiffMode)}
          className="gap-2"
        >
          <div className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <RadioGroupItem value="overlay" id="diff-overlay" className="mt-0.5" />
            <div>
              <Label htmlFor="diff-overlay" className="text-sm font-medium cursor-pointer">
                Overlay red
              </Label>
              <p className="text-xs text-muted-foreground">
                Version A with every differing pixel painted red
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <RadioGroupItem value="side-by-side" id="diff-side" className="mt-0.5" />
            <div>
              <Label htmlFor="diff-side" className="text-sm font-medium cursor-pointer">
                Side-by-side pair
              </Label>
              <p className="text-xs text-muted-foreground">
                A and B next to each other, one PNG per page
              </p>
            </div>
          </div>
        </RadioGroup>
      </ToolStep>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run((ctx) => visualDiff(files[0], files[1], maxPages, mode, ctx))}
      >
        Compare the two PDFs
      </Button>
    </div>
  );
}

/* ------------------------------ 5. OCR tool -------------------------------- */

function OcrTool({ files, busy, run }: ToolComponentProps) {
  const [pages, setPages] = useState("");

  return (
    <div className="space-y-5">
      <ToolStep n={1} title="Pages (optional)" last>
        <Input
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder="All pages — or e.g. 1-5"
          inputMode="numeric"
          aria-label="Pages to OCR"
        />
        <ToolHint>
          OCR is slow — for a first try, keep it to 20 pages or fewer.
        </ToolHint>
        <ToolNote tone="emerald">
          English model (2 MB) is served from this site — the OCR itself never
          touches the internet.
        </ToolNote>
      </ToolStep>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run((ctx) => ocrPdf(files[0], pages, ctx))}
      >
        <ScanText className="size-4" aria-hidden="true" />
        Read the text with OCR
      </Button>
    </div>
  );
}

/* -------------------------- 6. Auto-Prescribe tool ------------------------- */

type ChipTone = "slate" | "amber" | "emerald";

const CHIP_TONES: Record<ChipTone, string> = {
  slate: "border-border bg-muted/60 text-muted-foreground",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function SignalChips({ signals }: { signals: AutoSignals }) {
  const chips: Array<{ label: string; tone: ChipTone }> = signals.canRead
    ? [
        { label: plural(signals.pageCount, "page"), tone: "slate" },
        {
          label: formatBytes(signals.fileBytes),
          tone: signals.fileBytes > 10 * 1024 * 1024 ? "amber" : "slate",
        },
        ...(signals.encrypted ? [{ label: "Encrypted", tone: "amber" as const }] : []),
        ...(signals.blankPages.length
          ? [
              {
                label: plural(signals.blankPages.length, "blank page"),
                tone: "amber" as const,
              },
            ]
          : []),
        ...(signals.scanLike ? [{ label: "Likely scans", tone: "amber" as const }] : []),
        {
          label: signals.hasText ? "Text layer ✓" : "No text layer",
          tone: signals.hasText ? "emerald" : "amber",
        },
        ...(signals.formFieldCount > 0
          ? [
              {
                label: plural(signals.formFieldCount, "form field"),
                tone: "slate" as const,
              },
            ]
          : []),
        ...(signals.duplicatePages.length
          ? [
              {
                label: plural(signals.duplicatePages.length, "duplicate page"),
                tone: "amber" as const,
              },
            ]
          : []),
        ...(signals.oversizedPages.length
          ? [{ label: "Oversized pages", tone: "amber" as const }]
          : []),
      ]
    : [{ label: formatBytes(signals.fileBytes), tone: "amber" as const }];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <Badge key={`${c.label}-${i}`} variant="outline" className={CHIP_TONES[c.tone]}>
          {c.label}
        </Badge>
      ))}
    </div>
  );
}

function prescribeSuggestions(s: AutoSignals): ReportSuggestion[] {
  if (!s.canRead) {
    return [
      {
        icon: WandSparkles,
        title: "Try repairing the file",
        reason:
          "This file could not be opened as a PDF — the structure may be damaged. The repair tool can often rebuild a working copy.",
        actions: [{ label: "Open tool", kind: "tool", id: "fix-corrupted" }],
      },
    ];
  }

  const out: ReportSuggestion[] = [];
  const push = (
    icon: LucideIcon,
    title: string,
    reason: string,
    action: { kind: "tool"; id: string } | { kind: "workspace" }
  ) => {
    out.push({
      icon,
      title,
      reason,
      actions:
        action.kind === "workspace"
          ? [{ label: "Go to workspace", kind: "workspace" }]
          : [{ label: "Open tool", kind: "tool", id: action.id }],
    });
  };

  if (s.encrypted) {
    push(
      Unlock,
      "Remove the password first",
      "The PDF is encrypted — most fixes need an unlocked copy before they can rewrite it.",
      { kind: "tool", id: "unprotect" }
    );
  }
  if (s.imageShare > 0.6) {
    push(
      Sparkles,
      "Make it fit under a size limit",
      `${Math.round(s.imageShare * 100)}% of every byte is embedded images — the size fitter re-compresses them far smarter than any manual export.`,
      { kind: "workspace" }
    );
    push(
      Gauge,
      "Reduce image quality",
      "Re-encodes the heavy photos at web-friendly quality without touching the layout or text.",
      { kind: "tool", id: "quality-reducer" }
    );
  }
  if (s.blankPages.length) {
    push(
      Eraser,
      "Remove blank pages",
      `${plural(s.blankPages.length, "blank page")} detected on page${s.blankPages.length === 1 ? "" : "s"} ${listPages(s.blankPages)} — the Blank Pages pill in the main workspace deletes them in one click.`,
      { kind: "workspace" }
    );
  }
  if (s.duplicatePages.length) {
    push(
      Copy,
      "Delete duplicate pages",
      `Page${s.duplicatePages.length === 1 ? "" : "s"} ${listPages(s.duplicatePages)} look${s.duplicatePages.length === 1 ? "s" : ""} identical to an earlier page.`,
      { kind: "tool", id: "remove-duplicates" }
    );
  }
  if (s.scanLike && !s.hasText) {
    push(
      ScanText,
      "OCR the scanned pages",
      "This reads like photos of paper with no selectable text — OCR reads it back into real text, fully offline.",
      { kind: "tool", id: "ocr" }
    );
    push(
      WandSparkles,
      "Clean up the scan",
      "Deskew, brighten and sharpen photo-of-paper artifacts before sharing.",
      { kind: "tool", id: "scan-cleanup" }
    );
  }
  if (s.formFieldCount > 0) {
    push(
      PenLine,
      "Fill in the form",
      `${plural(s.formFieldCount, "fillable field")} found — type the answers straight into the browser.`,
      { kind: "tool", id: "fill-forms" }
    );
  }
  if (s.oversizedPages.length) {
    push(
      Ruler,
      "Normalize oversized pages",
      `Page${s.oversizedPages.length === 1 ? "" : "s"} ${listPages(s.oversizedPages)} exceed${s.oversizedPages.length === 1 ? "s" : ""} A3 — resize for printers or portal uploads.`,
      { kind: "tool", id: "resize-pages" }
    );
  }
  if (s.fileBytes > 10 * 1024 * 1024 && !out.some((o) => o.actions.some((a) => a.kind === "workspace"))) {
    push(
      Sparkles,
      "Shrink it under a limit",
      `${formatBytes(s.fileBytes)} is past the 10 MB mark most portals reject — set a target size and let the fitter pick the least-lossy pass.`,
      { kind: "workspace" }
    );
  }
  return out.slice(0, 4);
}

function AutoPrescribeTool({ files, busy }: ToolComponentProps) {
  const [result, setResult] = useState<{ file: File; signals: AutoSignals } | null>(null);
  const [progress, setProgress] = useState<ToolProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const file = files[0];
  const signals = result && result.file === file ? result.signals : null;
  const suggestions = signals ? prescribeSuggestions(signals) : [];

  useEffect(() => () => abortRef.current?.abort(), []);

  const analyze = useCallback(async () => {
    if (!file) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setResult(null);
    setProgress({ percent: 3, detail: "Reading file…" });
    try {
      const s = await gatherAutoSignals(file, {
        signal: ctrl.signal,
        onProgress: (p) => setProgress(p),
      });
      if (ctrl.signal.aborted) return;
      setResult({ file, signals: s });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not diagnose this file.");
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setProgress(null);
    }
  }, [file]);

  return (
    <div className="space-y-4">
      <ToolNote tone="emerald">
        Diagnosed entirely on this device — the file never leaves the browser tab.
      </ToolNote>

      {progress ? (
        <InlineProgress
          progress={progress}
          onCancel={() => abortRef.current?.abort()}
        />
      ) : (
        <>
          {error && <ErrorNote message={error} />}
          {signals && (
            <div className="space-y-3" aria-live="polite">
              <SignalChips signals={signals} />
              <Separator />
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Suggested fixes
              </p>
              {suggestions.length === 0 ? (
                <HealthyNote>This PDF looks healthy — nothing to fix.</HealthyNote>
              ) : (
                <SuggestionCards items={suggestions} />
              )}
            </div>
          )}
          <Button className="w-full" disabled={busy} onClick={analyze}>
            <Stethoscope className="size-4" aria-hidden="true" />
            {signals ? "Diagnose again" : "Diagnose this file"}
          </Button>
          {!signals && (
            <ToolHint>
              Checks structure, size makeup, blank pages, text layer, form fields,
              duplicate pages and page sizes — then lines up the right fix.
            </ToolHint>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- the group --------------------------------- */

export const SMART_TOOLS: ToolDef[] = [
  {
    id: "extract-text",
    name: "Extract Text",
    tagline: "Pull every word out — perfect for quoting or re-use.",
    icon: Type,
    category: "smart",
    io: { accept: ".pdf", hint: "One PDF — every page's text is pulled out" },
    Component: ExtractTextTool,
    batchRun: (file, ctx) => extractText(file, "one", undefined, ctx),
  },
  {
    id: "extract-images",
    name: "Extract Images",
    tagline: "Pull the photos & scans back out of a PDF.",
    icon: ImageDown,
    category: "smart",
    io: { accept: ".pdf", hint: "One PDF — embedded photos & scans are pulled out" },
    Component: ExtractImagesTool,
  },
  {
    id: "why-big",
    name: "Why Is My File Big?",
    tagline: "See exactly what's eating the megabytes.",
    icon: Scale,
    category: "smart",
    io: { accept: ".pdf", hint: "One PDF — measured right here, nothing uploaded" },
    Component: WhyBigTool,
  },
  {
    id: "visual-diff",
    name: "Visual Diff",
    tagline: "Two versions side by side — see what actually changed.",
    icon: GitCompareArrows,
    category: "smart",
    io: {
      accept: ".pdf",
      multiple: true,
      minFiles: 2,
      maxFiles: 2,
      hint: "Drop exactly 2 PDFs — pages are compared in order",
    },
    Component: VisualDiffTool,
  },
  {
    id: "ocr",
    name: "OCR Scanned Pages",
    tagline: "Read text out of photos & scans — English, fully offline.",
    icon: ScanText,
    category: "smart",
    io: { accept: ".pdf", hint: "One PDF · English · runs fully offline" },
    Component: OcrTool,
  },
  {
    id: "auto-prescribe",
    name: "Auto-Prescribe",
    tagline: "Not sure which fix you need? Upload — get a diagnosis.",
    icon: Stethoscope,
    category: "smart",
    io: { accept: ".pdf", hint: "One PDF — get a diagnosis and a fix list" },
    Component: AutoPrescribeTool,
  },
];
