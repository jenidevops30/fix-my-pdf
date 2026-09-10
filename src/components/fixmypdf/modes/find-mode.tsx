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
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 font-semibold">
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
          className="h-10 bg-slate-900 hover:bg-slate-800 text-white"
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
            className="bg-slate-200/80 [&_[data-slot=progress-indicator]]:bg-orange-600"
            aria-label="Searching"
          />
          <p className="font-mono text-xs text-slate-600">
            {progress ? `${progress.phase} · ${progress.detail ?? ""}` : "Searching pages…"}
          </p>
        </div>
      )}

      {error && (
        <p className="text-rose-600 text-xs" role="alert">
          {error}
        </p>
      )}

      {outcome && outcome.pages.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold">
                Found on {outcome.pages.length} pages · {outcome.matchCount} matches
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-transparent font-mono shrink-0">
                {outcome.matchCount} hits
              </Badge>
            </div>
            <div className="max-h-64 overflow-y-auto slim-scrollbar divide-y divide-slate-100 px-4">
              {outcome.pages.map((p) => (
                <div key={p} className="flex items-start gap-3 py-2">
                  <Badge className="bg-slate-100 text-slate-700 border-transparent font-mono shrink-0">
                    p.{p}
                  </Badge>
                  <p className="text-xs text-slate-600 font-mono line-clamp-2">
                    {outcome.snippets[p] ?? ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] font-mono text-slate-400 break-all">
            → {baseName(file.name)}-pages-{pagesForFilename(outcome.pages)}.pdf
          </p>
          <Button
            type="button"
            disabled={working}
            onClick={() => onExtract(outcome.pages)}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base"
          >
            <Scissors aria-hidden="true" />
            Extract {outcome.pages.length} Found Pages
          </Button>
        </div>
      )}

      {outcome && outcome.pages.length === 0 && (
        outcome.pagesWithText === 0 ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
            This looks like a scanned document — it has no searchable text layer. Try Remove Blank
            Pages or Make It Fit instead.
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            No pages contain “{outcome.query}”. Try a shorter word.
          </div>
        )
      )}
    </div>
  );
}
