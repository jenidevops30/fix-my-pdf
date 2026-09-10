"use client";

import { Check, CheckCircle2, Download, X } from "lucide-react";
import { toast } from "sonner";
import type { CompressionPass } from "@/lib/pdf/engine";
import { downloadBlob, formatBytes } from "@/lib/pdf/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { JobResult, Mode } from "./types";

type FitView = Extract<JobResult, { kind: "fit" }>;
type PagesView = Extract<JobResult, { kind: "pages" }>;

const IDLE_PROMISES: Record<Mode, string[]> = {
  fit: [
    "Metadata stripped first — text stays selectable",
    "Deterministic five-step raster ladder",
    "Stops at the first pass that fits",
  ],
  keep: [
    "Visual grid with live page thumbnails",
    "Type specs like 3, 7, 12, 19-23",
    "Structure copied losslessly page by page",
  ],
  requirements: [
    "Pasted rules parsed locally — no AI involved",
    "Strictest size and page limit wins",
    "Trim to the page cap, then compress",
  ],
  blank: [
    "Ink-density scan of every single page",
    "Conservative, normal and lenient levels",
    "Nothing is removed until you confirm",
  ],
  remove: [
    "Ranges like 1-3, 8, 14-17 supported",
    "Quick cuts for blanks, odd and even pages",
    "Live preview of what remains",
  ],
  find: [
    "Searches the text layer of every page",
    "Snippet shown for each hit",
    "Extract all hits in one click",
  ],
};

function headlineFor(result: JobResult): string {
  switch (result.kind) {
    case "idle":
      return "Nothing processed yet";
    case "working":
      return "Engine running";
    case "fit":
      return result.contextLabel;
    case "pages":
      return result.headline;
    case "error":
      return "Something went wrong";
  }
}

function StatusBadge({ result }: { result: JobResult }) {
  switch (result.kind) {
    case "idle":
      return (
        <Badge className="bg-muted text-muted-foreground border-transparent">
          Awaiting instructions
        </Badge>
      );
    case "working":
      return (
        <Badge className="bg-muted text-foreground border-transparent">
          <span className="size-1.5 rounded-full bg-foreground animate-pulse" aria-hidden="true" />
          Working…
        </Badge>
      );
    case "fit":
      return result.result.success ? (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent">
          Passed All Limits
        </Badge>
      ) : (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-transparent">Closest Match Found</Badge>
      );
    case "pages":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent">Cut Complete</Badge>
      );
    case "error":
      return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-transparent">Error</Badge>;
  }
}

function PassRow({ pass, emphasized }: { pass: CompressionPass; emphasized: boolean }) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3", emphasized && "font-semibold")}
    >
      <span className={cn("truncate", emphasized ? "text-foreground" : "text-muted-foreground")}>
        {pass.label}
        {pass.note && <span className="text-[10px] text-muted-foreground/70"> · {pass.note}</span>}
      </span>
      <span className="flex items-center gap-1.5 shrink-0">
        {Number.isNaN(pass.size) ? (
          <span className="text-rose-500">failed</span>
        ) : (
          <span className={emphasized ? "text-foreground" : "text-foreground/80"}>
            {formatBytes(pass.size)}
          </span>
        )}
        {pass.ok ? (
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <X className="size-3.5 text-rose-500" aria-hidden="true" />
        )}
      </span>
    </div>
  );
}

function FitBody({ r }: { r: FitView }) {
  const res = r.result;
  // "Too Large" is only truthful when a byte target actually existed and was exceeded.
  const firstFit = r.targetBytes === undefined ? true : res.originalSize <= r.targetBytes;
  const pct = res.originalSize > 0 ? Math.max(0, Math.round((1 - res.size / res.originalSize) * 100)) : 0;
  const outWidth = Math.max(6, Math.round((res.size / Math.max(res.originalSize, 1)) * 100));
  let lastOkIndex = -1;
  for (let i = res.passes.length - 1; i >= 0; i--) {
    if (res.passes[i].ok) {
      lastOkIndex = i;
      break;
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Original File</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatBytes(res.originalSize)}
            {!firstFit && " (Too Large)"}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden" aria-hidden="true">
          <div className="h-full bg-rose-500 rounded-full" style={{ width: "100%" }} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Fixed Output
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatBytes(res.size)} (-{pct}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${outWidth}%` }}
          />
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-1.5 font-mono text-xs">
        {res.passes.map((pass, i) => (
          <PassRow key={`${pass.label}-${i}`} pass={pass} emphasized={i === lastOkIndex} />
        ))}
      </div>

      {!res.success && (
        <p className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 p-3 text-xs">
          We could not get under the limit without hurting readability. The smallest safe version
          is attached.
        </p>
      )}
      {res.trimmedToPages !== undefined && (
        <p className="text-xs text-muted-foreground">
          Trimmed to the first {res.trimmedToPages} of {res.pagesBeforeTrim} pages (keep-only
          step).
        </p>
      )}
    </div>
  );
}

function PagesBody({ r }: { r: PagesView }) {
  return (
    <div className="space-y-5">
      <ul className="space-y-1.5">
        {r.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs font-mono text-muted-foreground">
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
            <span className="break-all">{b}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-lg bg-card border border-border p-5 text-center">
        <div className="text-4xl font-extrabold">{r.pagesOut}</div>
        <div className="text-xs text-muted-foreground mt-1">pages in the new file</div>
      </div>
    </div>
  );
}

function DownloadFooter({ blob, filename }: { blob: Blob; filename: string }) {
  const label = filename.length > 28 ? "Fixed PDF" : filename;
  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={() => {
          downloadBlob(blob, filename);
          toast.success("Download started", { description: filename });
        }}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
      >
        <Download aria-hidden="true" />
        Download {label}
      </Button>
      <p className="text-center text-[11px] font-mono text-muted-foreground/70">
        No watermark • Processed privately in browser memory
      </p>
    </div>
  );
}

interface ResultPanelProps {
  result: JobResult;
  mode: Mode;
  onReset: () => void;
}

export function ResultPanel({ result, mode, onReset }: ResultPanelProps) {
  const downloadable =
    result.kind === "fit"
      ? { blob: result.result.blob, filename: result.result.filename }
      : result.kind === "pages"
        ? { blob: result.blob, filename: result.filename }
        : null;

  return (
    <aside
      aria-label="Verification and download"
      aria-live="polite"
      className="rounded-xl bg-background border border-border p-6 sm:p-7 flex flex-col justify-between gap-6 min-h-[420px]"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Verification Engine
          </span>
          <StatusBadge result={result} />
        </div>
        <h4 className="text-base font-bold">{headlineFor(result)}</h4>

        {result.kind === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tell the engine what to do on the left. Every fix is verified against your exact
              requirement before download.
            </p>
            <ul className="space-y-1.5">
              {IDLE_PROMISES[mode].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 font-mono text-xs text-muted-foreground"
                >
                  <span
                    className="mt-1.5 size-1 rounded-full bg-muted-foreground/60 shrink-0"
                    aria-hidden="true"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.kind === "working" && (
          <div className="space-y-2">
            <Progress
              value={result.percent}
              className="bg-muted [&_[data-slot=progress-indicator]]:bg-orange-600 dark:[&_[data-slot=progress-indicator]]:bg-orange-500"
              aria-label={`Progress: ${result.percent}%`}
            />
            <p className="font-mono text-xs text-muted-foreground">{result.phase}</p>
            {result.detail && <p className="text-[11px] text-muted-foreground/70">{result.detail}</p>}
          </div>
        )}

        {result.kind === "fit" && <FitBody r={result} />}
        {result.kind === "pages" && <PagesBody r={result} />}

        {result.kind === "error" && (
          <div className="space-y-4">
            <div
              role="alert"
              className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-700 dark:text-rose-400"
            >
              {result.message}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {downloadable && (
        <DownloadFooter blob={downloadable.blob} filename={downloadable.filename} />
      )}
    </aside>
  );
}
