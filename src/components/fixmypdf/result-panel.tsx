"use client";

import { Check, CheckCircle2, Download, X } from "lucide-react";
import type { CompressionPass } from "@/lib/pdf/engine";
import { formatBytes } from "@/lib/pdf/format";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SuccessBurst } from "./success-burst";
import type { JobResult, Mode } from "./types";

type FitView = Extract<JobResult, { kind: "fit" }>;
type PagesView = Extract<JobResult, { kind: "pages" }>;

const IDLE_PROMISES: Record<Mode, [DictKey, DictKey, DictKey]> = {
  fit: ["idle_fit_1", "idle_fit_2", "idle_fit_3"],
  keep: ["idle_keep_1", "idle_keep_2", "idle_keep_3"],
  requirements: ["idle_requirements_1", "idle_requirements_2", "idle_requirements_3"],
  blank: ["idle_blank_1", "idle_blank_2", "idle_blank_3"],
  remove: ["idle_remove_1", "idle_remove_2", "idle_remove_3"],
  find: ["idle_find_1", "idle_find_2", "idle_find_3"],
};

function StatusBadge({ result }: { result: JobResult }) {
  const { t } = useI18n();
  switch (result.kind) {
    case "idle":
      return (
        <Badge className="bg-muted text-muted-foreground border-transparent">
          {t("result_awaiting")}
        </Badge>
      );
    case "working":
      return (
        <Badge className="bg-muted text-foreground border-transparent">
          <span className="size-1.5 rounded-full bg-foreground animate-pulse" aria-hidden="true" />
          {t("result_working")}
        </Badge>
      );
    case "fit":
      return result.result.success ? (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent">
          {t("result_passed")}
        </Badge>
      ) : (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-transparent">
          {t("result_closest")}
        </Badge>
      );
    case "pages":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent">
          {t("result_cut")}
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-transparent">
          {t("result_error_badge")}
        </Badge>
      );
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
  const { t } = useI18n();
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
          <span className="text-muted-foreground">{t("result_original")}</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatBytes(res.originalSize)}
            {!firstFit && ` ${t("result_too_large")}`}
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
            {t("result_fixed")}
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
          {t("result_best_effort")}
        </p>
      )}
      {res.trimmedToPages !== undefined && (
        <p className="text-xs text-muted-foreground">
          {t("result_trimmed", { kept: res.trimmedToPages, total: res.pagesBeforeTrim ?? 0 })}
        </p>
      )}
    </div>
  );
}

function PagesBody({ r }: { r: PagesView }) {
  const { t } = useI18n();
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
        <div className="text-xs text-muted-foreground mt-1">{t("result_pages_out")}</div>
      </div>
    </div>
  );
}

interface DownloadFooterProps {
  blob: Blob;
  filename: string;
  autoDownload: boolean;
  onAutoDownloadChange: (value: boolean) => void;
  onDownload: (blob: Blob, filename: string) => void;
}

function DownloadFooter({
  blob,
  filename,
  autoDownload,
  onAutoDownloadChange,
  onDownload,
}: DownloadFooterProps) {
  const { t } = useI18n();
  const label = filename.length > 28 ? "Fixed PDF" : filename;
  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={() => onDownload(blob, filename)}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
      >
        <Download aria-hidden="true" />
        {t("result_download", { name: label })}
      </Button>
      <div className="flex items-center justify-center gap-2 min-h-6">
        <Checkbox
          id="auto-download"
          checked={autoDownload}
          onCheckedChange={(v) => onAutoDownloadChange(v === true)}
        />
        <Label
          htmlFor="auto-download"
          className="text-[11px] text-muted-foreground font-normal cursor-pointer leading-snug font-mono"
        >
          {t("result_auto_download")}
        </Label>
      </div>
      <p className="text-center text-[11px] font-mono text-muted-foreground/70">
        {t("result_download_note")}
      </p>
    </div>
  );
}

interface ResultPanelProps {
  result: JobResult;
  mode: Mode;
  /** Increments on every successful fix — drives the confetti burst. */
  successNonce: number;
  autoDownload: boolean;
  onAutoDownloadChange: (value: boolean) => void;
  onDownload: (blob: Blob, filename: string) => void;
  onReset: () => void;
}

export function ResultPanel({
  result,
  mode,
  successNonce,
  autoDownload,
  onAutoDownloadChange,
  onDownload,
  onReset,
}: ResultPanelProps) {
  const { t } = useI18n();

  const headline = (() => {
    switch (result.kind) {
      case "idle":
        return t("result_idle_title");
      case "working":
        return t("result_working_title");
      case "fit":
        return result.contextLabel;
      case "pages":
        return result.headline;
      case "error":
        return t("result_error_title");
    }
  })();

  const downloadable =
    result.kind === "fit"
      ? { blob: result.result.blob, filename: result.result.filename }
      : result.kind === "pages"
        ? { blob: result.blob, filename: result.filename }
        : null;

  return (
    <aside
      aria-label={t("result_panel_label")}
      aria-live="polite"
      className="relative rounded-xl bg-background border border-border p-6 sm:p-7 flex flex-col justify-between gap-6 min-h-[420px]"
    >
      <SuccessBurst burstKey={successNonce} />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t("result_engine")}
          </span>
          <StatusBadge result={result} />
        </div>
        <h4 className="text-base font-bold" role="status">
          {headline}
        </h4>

        {result.kind === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("result_idle_lead")}</p>
            <ul className="space-y-1.5">
              {IDLE_PROMISES[mode].map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2 font-mono text-xs text-muted-foreground"
                >
                  <span
                    className="mt-1.5 size-1 rounded-full bg-muted-foreground/60 shrink-0"
                    aria-hidden="true"
                  />
                  {t(key)}
                </li>
              ))}
            </ul>
            <p className="text-[11px] font-mono text-muted-foreground/60 pt-1">
              {t("result_shortcuts_hint")}
            </p>
          </div>
        )}

        {result.kind === "working" && (
          <div className="space-y-2">
            <Progress
              value={result.percent}
              className="bg-muted [&_[data-slot=progress-indicator]]:bg-orange-600 dark:[&_[data-slot=progress-indicator]]:bg-orange-500"
              aria-label={t("result_progress_aria", { n: result.percent })}
            />
            <p className="font-mono text-xs text-muted-foreground" role="status">
              {result.phase}
            </p>
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
              {t("result_try_again")}
            </Button>
          </div>
        )}
      </div>

      {downloadable && (
        <DownloadFooter
          blob={downloadable.blob}
          filename={downloadable.filename}
          autoDownload={autoDownload}
          onAutoDownloadChange={onAutoDownloadChange}
          onDownload={onDownload}
        />
      )}
    </aside>
  );
}
