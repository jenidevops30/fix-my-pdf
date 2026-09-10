"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Wand2 } from "lucide-react";
import {
  BLANK_THRESHOLDS,
  detectBlankPages,
  type BasicInfo,
  type BlankSensitivity,
} from "@/lib/pdf/engine";
import { baseName, pagesToCompactSpec } from "@/lib/pdf/format";
import { useI18n } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AnalysisState, RemoveOptions } from "../types";

const SENSITIVITIES: BlankSensitivity[] = ["conservative", "normal", "lenient"];

interface BlankModeProps {
  file: File;
  info: BasicInfo;
  analysis: AnalysisState;
  working: boolean;
  ensureAnalysis: () => void;
  onRemove: (pages: number[], opts?: RemoveOptions) => void;
}

export function BlankMode({ file, info, analysis, working, ensureAnalysis, onRemove }: BlankModeProps) {
  const { t } = useI18n();
  const [sensitivity, setSensitivity] = useState<BlankSensitivity>("normal");

  useEffect(() => {
    ensureAnalysis();
  }, [ensureAnalysis]);

  const threshold = BLANK_THRESHOLDS[sensitivity];
  const data = analysis.status === "done" ? analysis.data : undefined;
  const blanks = data ? detectBlankPages(data, sensitivity) : [];
  const ratios = data?.inkRatios ?? [];

  const removeBlanks = () => {
    if (!blanks.length) return;
    onRemove(blanks, {
      action: "blank",
      headline: t("blank_cta", { n: blanks.length }),
      bullets: [
        `Source: ${baseName(file.name)}.pdf`,
        `Blank pages removed: ${pagesToCompactSpec(blanks)}`,
        `Remaining: ${info.pageCount - blanks.length} pages`,
      ],
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          {t("blank_step")}
        </p>
        <h3 className="text-xl font-bold">{t("blank_question")}</h3>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {SENSITIVITIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={sensitivity === s}
            onClick={() => setSensitivity(s)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-mono capitalize transition-colors min-h-[32px]",
              sensitivity === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        {t("blank_threshold", { pct: (threshold * 100).toFixed(1) })}
      </p>

      {!data ? (
        <div className="space-y-2" aria-busy="true">
          <Progress
            value={analysis.progress?.percent ?? 5}
            className="bg-muted [&_[data-slot=progress-indicator]]:bg-orange-600 dark:[&_[data-slot=progress-indicator]]:bg-orange-500"
            aria-label={t("blank_scanning_aria")}
          />
          <p className="font-mono text-xs text-muted-foreground" role="status">
            {analysis.progress
              ? `${analysis.progress.phase} · ${analysis.progress.detail ?? ""}`
              : t("blank_scanning")}
          </p>
        </div>
      ) : blanks.length === 0 ? (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{t("blank_none")}</span>
        </div>
      ) : (
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">{t("blank_found")}</span>
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 border-transparent font-mono">
              {t("blank_pages", { n: blanks.length })}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {blanks.map((n) => (
              <span
                key={n}
                className="rounded bg-card border border-border px-2 py-1 text-xs font-mono"
              >
                p.{n} · {((ratios[n - 1] ?? 0) * 100).toFixed(2)}% ink
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70">{t("blank_detected_note")}</p>
        </div>
      )}

      <Button
        type="button"
        data-primary-cta
        disabled={working || !data || blanks.length === 0}
        onClick={removeBlanks}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
      >
        <Wand2 aria-hidden="true" />
        {t("blank_cta", { n: blanks.length })}
      </Button>
    </div>
  );
}
