"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { detectBlankPages, type BasicInfo } from "@/lib/pdf/engine";
import { pagesToCompactSpec, parsePageSpec } from "@/lib/pdf/format";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnalysisState } from "../types";

interface RemoveModeProps {
  info: BasicInfo;
  analysis: AnalysisState;
  working: boolean;
  ensureAnalysis: () => void;
  onRemove: (pages: number[]) => void;
}

export function RemoveMode({ info, analysis, working, ensureAnalysis, onRemove }: RemoveModeProps) {
  const { t } = useI18n();
  const [spec, setSpec] = useState("");

  // The "Remove blank pages" quick action needs the ink scan — warm it up.
  useEffect(() => {
    ensureAnalysis();
  }, [ensureAnalysis]);

  let parsed: number[] = [];
  let parseError: string | null = null;
  if (spec.trim()) {
    try {
      parsed = parsePageSpec(spec, info.pageCount);
    } catch (err) {
      parseError = err instanceof Error ? err.message : t("remove_invalid_list");
    }
  }
  const remaining = info.pageCount - parsed.length;
  const removingAll = parsed.length >= info.pageCount;
  const analysisDone = analysis.status === "done" && !!analysis.data;

  const applyBlanks = () => {
    if (!analysis.data) return;
    const blanks = detectBlankPages(analysis.data, "normal");
    if (!blanks.length) {
      toast.info(t("remove_no_blanks"), {
        description: t("remove_no_blanks_desc"),
      });
      return;
    }
    setSpec(pagesToCompactSpec(blanks));
  };

  const parityPages = (parity: "odd" | "even") => {
    const pages: number[] = [];
    for (let n = 1; n <= info.pageCount; n++) {
      if (parity === "odd" ? n % 2 === 1 : n % 2 === 0) pages.push(n);
    }
    return pages;
  };

  const everyNthPages = (step: number) => {
    const pages: number[] = [];
    for (let n = 1; n <= info.pageCount; n += step) pages.push(n);
    return pages;
  };

  const quickChip =
    "rounded-full border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors disabled:opacity-50 min-h-[32px]";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          {t("remove_step")}
        </p>
        <h3 className="text-xl font-bold">{t("remove_question")}</h3>
      </header>

      <div className="space-y-2">
        <Label htmlFor="remove-spec">{t("remove_label")}</Label>
        <Input
          id="remove-spec"
          aria-label={t("remove_aria")}
          placeholder={t("remove_placeholder")}
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          className="font-mono h-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("remove_quick")}</span>
        <button
          type="button"
          onClick={applyBlanks}
          disabled={!analysisDone}
          title={
            analysisDone
              ? t("remove_qa_blanks_title")
              : t("remove_qa_blanks_pending")
          }
          className={quickChip}
        >
          {t("remove_qa_blanks")}
        </button>
        <button type="button" onClick={() => setSpec(pagesToCompactSpec(parityPages("odd")))} className={quickChip}>
          {t("remove_qa_odd")}
        </button>
        <button type="button" onClick={() => setSpec(pagesToCompactSpec(parityPages("even")))} className={quickChip}>
          {t("remove_qa_even")}
        </button>
        <button type="button" onClick={() => setSpec(pagesToCompactSpec(everyNthPages(2)))} className={quickChip}>
          {t("remove_qa_every", { n: 2 })}
        </button>
        <button type="button" onClick={() => setSpec(pagesToCompactSpec(everyNthPages(3)))} className={quickChip}>
          {t("remove_qa_every", { n: 3 })}
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-mono">
          {t("remove_remaining", { remaining, total: info.pageCount })}
        </p>
        {parseError && (
          <p className="text-rose-600 dark:text-rose-400 text-xs" role="alert">
            {parseError}
          </p>
        )}
        {!parseError && removingAll && (
          <p className="text-amber-600 dark:text-amber-400 text-xs">{t("remove_min_one")}</p>
        )}
      </div>

      <Button
        type="button"
        data-primary-cta
        disabled={working || parsed.length === 0 || removingAll}
        onClick={() => onRemove(parsed)}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
      >
        <Trash2 aria-hidden="true" />
        {t("remove_cta", { n: parsed.length })}
      </Button>
    </div>
  );
}
