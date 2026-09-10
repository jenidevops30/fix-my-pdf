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
      headline: `Removed ${blanks.length} blank pages`,
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
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 font-semibold">
          Step 1 • Scan For Empties
        </p>
        <h3 className="text-xl font-bold">Remove blank pages?</h3>
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
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 font-mono">
        A page counts as blank when less than {(threshold * 100).toFixed(1)}% of its pixels carry
        ink.
      </p>

      {!data ? (
        <div className="space-y-2" aria-busy="true">
          <Progress
            value={analysis.progress?.percent ?? 5}
            className="bg-slate-200/80 [&_[data-slot=progress-indicator]]:bg-orange-600"
            aria-label="Scanning pages"
          />
          <p className="font-mono text-xs text-slate-600">
            {analysis.progress
              ? `${analysis.progress.phase} · ${analysis.progress.detail ?? ""}`
              : "Scanning pages…"}
          </p>
        </div>
      ) : blanks.length === 0 ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>No blank pages detected — your document is clean.</span>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">Blanks found</span>
            <Badge className="bg-orange-100 text-orange-800 border-transparent font-mono">
              {blanks.length} pages
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {blanks.map((n) => (
              <span
                key={n}
                className="rounded bg-white border border-slate-200 px-2 py-1 text-xs font-mono"
              >
                p.{n} · {((ratios[n - 1] ?? 0) * 100).toFixed(2)}% ink
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Detected pages are only removed when you press the button.
          </p>
        </div>
      )}

      <Button
        type="button"
        disabled={working || !data || blanks.length === 0}
        onClick={removeBlanks}
        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base"
      >
        <Wand2 aria-hidden="true" />
        Remove {blanks.length} Blank Pages
      </Button>
    </div>
  );
}
