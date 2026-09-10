"use client";

import { useState } from "react";
import { Loader2, Scissors, Search } from "lucide-react";
import type { EngineProgress, TextSearchOutcome } from "@/lib/pdf/engine";
import { baseName, pagesForFilename } from "@/lib/pdf/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface FindModeProps {
  file: File;
  working: boolean;
  onSearch: (query: string, onProgress?: (p: EngineProgress) => void) => Promise<TextSearchOutcome>;
  onExtract: (pages: number[]) => void;
}

export function FindMode({ file, working, onSearch, onExtract }: FindModeProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [outcome, setOutcome] = useState<TextSearchOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<EngineProgress | null>(null);

  const runSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(null);
    setOutcome(null);
    setProgress(null);
    try {
      const res = await onSearch(query, (p) => setProgress(p));
      setOutcome(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          Step 1 • Search Text
        </p>
        <h3 className="text-xl font-bold">Find pages containing a word</h3>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex gap-2"
      >
        <Input
          aria-label="Search text"
          placeholder="e.g. Policy Schedule"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-10"
        />
        <Button
          type="submit"
          aria-label="Run search"
          disabled={searching || !query.trim()}
          className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {searching ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Search aria-hidden="true" />
          )}
          Search
        </Button>
      </form>

      {searching && (
        <div className="space-y-2" aria-busy="true">
          <Progress
            value={progress?.percent ?? 5}
            className="bg-muted [&_[data-slot=progress-indicator]]:bg-orange-600 dark:[&_[data-slot=progress-indicator]]:bg-orange-500"
            aria-label="Searching"
          />
          <p className="font-mono text-xs text-muted-foreground">
            {progress ? `${progress.phase} · ${progress.detail ?? ""}` : "Searching pages…"}
          </p>
        </div>
      )}

      {error && (
        <p className="text-rose-600 dark:text-rose-400 text-xs" role="alert">
          {error}
        </p>
      )}

      {outcome && outcome.pages.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/70">
              <span className="text-sm font-bold">
                Found on {outcome.pages.length} pages · {outcome.matchCount} matches
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent font-mono shrink-0">
                {outcome.matchCount} hits
              </Badge>
            </div>
            <div className="max-h-64 overflow-y-auto slim-scrollbar divide-y divide-border/70 px-4">
              {outcome.pages.map((p) => (
                <div key={p} className="flex items-start gap-3 py-2">
                  <Badge className="bg-muted text-foreground/80 border-transparent font-mono shrink-0">
                    p.{p}
                  </Badge>
                  <p className="text-xs text-muted-foreground font-mono line-clamp-2">
                    {outcome.snippets[p] ?? ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/70 break-all">
            → {baseName(file.name)}-pages-{pagesForFilename(outcome.pages)}.pdf
          </p>
          <Button
            type="button"
            disabled={working}
            onClick={() => onExtract(outcome.pages)}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
          >
            <Scissors aria-hidden="true" />
            Extract {outcome.pages.length} Found Pages
          </Button>
        </div>
      )}

      {outcome && outcome.pages.length === 0 && (
        outcome.pagesWithText === 0 ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-700 dark:text-amber-400">
            This looks like a scanned document — it has no searchable text layer. Try Remove Blank
            Pages or Make It Fit instead.
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
            No pages contain “{outcome.query}”. Try a shorter word.
          </div>
        )
      )}
    </div>
  );
}
