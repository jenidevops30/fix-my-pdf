"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { detectBlankPages, type BasicInfo } from "@/lib/pdf/engine";
import { pagesToCompactSpec, parsePageSpec } from "@/lib/pdf/format";
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
      parseError = err instanceof Error ? err.message : "Invalid page list.";
    }
  }
  const remaining = info.pageCount - parsed.length;
  const removingAll = parsed.length >= info.pageCount;
  const analysisDone = analysis.status === "done" && !!analysis.data;

  const applyBlanks = () => {
    if (!analysis.data) return;
    const blanks = detectBlankPages(analysis.data, "normal");
    if (!blanks.length) {
      toast.info("No blank pages found", {
        description: "Nothing looked empty at normal sensitivity.",
      });
      return;
    }
    setSpec(pagesToCompactSpec(blanks));
  };

  const setParity = (parity: "odd" | "even") => {
    const pages: number[] = [];
    for (let n = 1; n <= info.pageCount; n++) {
      if (parity === "odd" ? n % 2 === 1 : n % 2 === 0) pages.push(n);
    }
    setSpec(pagesToCompactSpec(pages));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          Step 1 • Mark The Cuts
        </p>
        <h3 className="text-xl font-bold">Which pages should go?</h3>
      </header>

      <div className="space-y-2">
        <Label htmlFor="remove-spec">Pages to remove</Label>
        <Input
          id="remove-spec"
          aria-label="Pages to remove"
          placeholder="e.g. 1-3, 8, 14-17"
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          className="font-mono h-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick actions:</span>
        <button
          type="button"
          onClick={applyBlanks}
          disabled={!analysisDone}
          title={
            analysisDone
              ? "Fill in the blank pages found by the ink scan"
              : "Available once the page scan finishes"
          }
          className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors disabled:opacity-50 min-h-[32px]"
        >
          Remove blank pages
        </button>
        <button
          type="button"
          onClick={() => setParity("odd")}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors min-h-[32px]"
        >
          Remove odd pages
        </button>
        <button
          type="button"
          onClick={() => setParity("even")}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors min-h-[32px]"
        >
          Remove even pages
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-mono">
          {remaining} of {info.pageCount} pages will remain
        </p>
        {parseError && (
          <p className="text-rose-600 dark:text-rose-400 text-xs" role="alert">
            {parseError}
          </p>
        )}
        {!parseError && removingAll && (
          <p className="text-amber-600 dark:text-amber-400 text-xs">
            A PDF needs at least one page — leave something behind.
          </p>
        )}
      </div>

      <Button
        type="button"
        disabled={working || parsed.length === 0 || removingAll}
        onClick={() => onRemove(parsed)}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
      >
        <Trash2 aria-hidden="true" />
        Remove {parsed.length} Pages
      </Button>
    </div>
  );
}
