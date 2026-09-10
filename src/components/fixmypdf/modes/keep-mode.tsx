"use client";

import { useEffect, useState } from "react";
import { Check, Scissors } from "lucide-react";
import type { BasicInfo } from "@/lib/pdf/engine";
import {
  baseName,
  pagesForFilename,
  pagesToCompactSpec,
  parsePageSpec,
} from "@/lib/pdf/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AnalysisState } from "../types";

interface KeepModeProps {
  file: File;
  info: BasicInfo;
  analysis: AnalysisState;
  working: boolean;
  ensureAnalysis: () => void;
  onExtract: (pages: number[]) => void;
}

export function KeepMode({ file, info, analysis, working, ensureAnalysis, onExtract }: KeepModeProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [specInput, setSpecInput] = useState("");
  const [specError, setSpecError] = useState<string | null>(null);

  useEffect(() => {
    ensureAnalysis();
  }, [ensureAnalysis]);

  const pageCount = info.pageCount;
  const data = analysis.status === "done" ? analysis.data : undefined;
  const sorted = [...selected].sort((a, b) => a - b);

  const applySet = (next: Set<number>) => {
    setSelected(next);
    const arr = [...next].sort((a, b) => a - b);
    setSpecInput(arr.length ? pagesToCompactSpec(arr) : "");
    setSpecError(null);
  };

  const toggle = (n: number) => {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    applySet(next);
  };

  const onSpecChange = (value: string) => {
    setSpecInput(value);
    if (!value.trim()) {
      setSelected(new Set());
      setSpecError(null);
      return;
    }
    try {
      const pages = parsePageSpec(value, pageCount);
      setSelected(new Set(pages));
      setSpecError(null);
    } catch (err) {
      setSpecError(err instanceof Error ? err.message : "Invalid page list.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          Step 1 • Pick Your Pages
        </p>
        <h3 className="text-xl font-bold">Which pages do you need?</h3>
      </header>

      {!data ? (
        <div className="space-y-3" aria-busy="true">
          <div
            aria-hidden="true"
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1 slim-scrollbar"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
          <Progress
            value={analysis.progress?.percent ?? 5}
            className="bg-muted [&_[data-slot=progress-indicator]]:bg-orange-600 dark:[&_[data-slot=progress-indicator]]:bg-orange-500"
            aria-label="Analyzing pages"
          />
          <p className="font-mono text-xs text-muted-foreground">
            {analysis.progress
              ? `${analysis.progress.phase} · ${analysis.progress.detail ?? ""}`
              : "Analyzing pages…"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1 slim-scrollbar">
            {data.thumbs.map((thumb, idx) => {
              const n = idx + 1;
              const isSel = selected.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={`Select page ${n}`}
                  onClick={() => toggle(n)}
                  className={cn(
                    "relative rounded-lg border overflow-hidden aspect-[3/4] bg-muted transition-all",
                    isSel
                      ? "border-orange-500 ring-2 ring-orange-500"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {thumb ? (
                    <img src={thumb} alt={`Page ${n}`} className="w-full h-full object-cover" />
                  ) : (
                    <Skeleton className="w-full h-full rounded-none" />
                  )}
                  <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                    {n}
                  </span>
                  {isSel && (
                    <span className="absolute top-1 right-1 size-5 rounded-full bg-orange-600 text-white flex items-center justify-center">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">Selected:</span>
              <Badge
                className={cn(
                  "font-mono max-w-full",
                  sorted.length
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 border-transparent"
                    : "bg-muted text-muted-foreground border-transparent"
                )}
              >
                <span className="truncate">{sorted.length ? pagesToCompactSpec(sorted) : "none"}</span>
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => applySet(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => applySet(new Set())}
              >
                Clear
              </Button>
            </div>

            <div className="space-y-1.5">
              <Input
                aria-label="Page numbers"
                placeholder="e.g. 3, 7, 12, 19-23"
                value={specInput}
                onChange={(e) => onSpecChange(e.target.value)}
                className="font-mono text-sm h-10"
              />
              {specError && (
                <p className="text-rose-600 dark:text-rose-400 text-xs" role="alert">
                  {specError}
                </p>
              )}
            </div>

            {sorted.length > 0 && (
              <p className="text-[11px] font-mono text-muted-foreground/70 break-all">
                → {baseName(file.name)}-pages-{pagesForFilename(sorted)}.pdf
              </p>
            )}
          </div>

          <Button
            type="button"
            disabled={working || sorted.length === 0}
            onClick={() => onExtract(sorted)}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
          >
            <Scissors aria-hidden="true" />
            Extract {sorted.length} Pages
          </Button>
        </>
      )}
    </div>
  );
}
