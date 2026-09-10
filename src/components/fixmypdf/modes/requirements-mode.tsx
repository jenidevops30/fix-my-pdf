"use client";

import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseRequirements } from "@/lib/pdf/format";
import { cn } from "@/lib/utils";
import type { RequirementsRunOptions } from "../types";

interface RequirementsModeProps {
  working: boolean;
  onRun: (opts: RequirementsRunOptions) => void;
}

export function RequirementsMode({ working, onRun }: RequirementsModeProps) {
  const [text, setText] = useState("");
  const [stripMetadata, setStripMetadata] = useState(true);

  const reqs = useMemo(() => parseRequirements(text), [text]);
  const actionable = reqs.filter((r) => r.kind === "size" || r.kind === "pages");
  const maxBytes = actionable.find((r) => r.kind === "size")?.maxBytes;
  const maxPages = actionable.find((r) => r.kind === "pages")?.maxPages;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          Step 1 • Paste The Rules
        </p>
        <h3 className="text-xl font-bold">What does the website say?</h3>
        <p className="text-xs text-muted-foreground">
          Paste the upload instructions. We read them locally — no AI, just parsing.
        </p>
      </header>

      <div className="space-y-3">
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. The uploaded file must be a PDF, maximum size 2 MB, maximum 10 pages."
          aria-label="Requirement text"
        />
        {reqs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reqs.map((r) => {
              const actionableChip = r.kind === "size" || r.kind === "pages";
              return (
                <Badge
                  key={r.label}
                  className={cn(
                    "font-mono",
                    actionableChip
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent"
                      : "bg-muted text-muted-foreground border-transparent"
                  )}
                >
                  {r.label}
                  {!actionableChip && " · informational"}
                </Badge>
              );
            })}
          </div>
        )}
        {text.trim().length > 0 && actionable.length === 0 && (
          <p role="status" className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 p-3 text-xs">
            No size or page limit detected yet — mention something like “under 2 MB” or “max 10
            pages”.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 min-h-6">
        <Checkbox
          id="req-strip-meta"
          checked={stripMetadata}
          onCheckedChange={(v) => setStripMetadata(v === true)}
        />
        <Label
          htmlFor="req-strip-meta"
          className="text-xs text-muted-foreground font-normal cursor-pointer leading-snug"
        >
          Strip hidden tracking metadata
        </Label>
      </div>

      <Button
        type="button"
        disabled={working || actionable.length === 0}
        onClick={() => onRun({ maxBytes, maxPages, grayscale: false, stripMetadata })}
        className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base"
      >
        <CheckCheck aria-hidden="true" />
        Make My File Fit
      </Button>
    </div>
  );
}
