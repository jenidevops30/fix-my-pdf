"use client";

import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseRequirements } from "@/lib/pdf/format";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { RequirementsRunOptions } from "../types";

interface RequirementsModeProps {
  working: boolean;
  onRun: (opts: RequirementsRunOptions) => void;
}

export function RequirementsMode({ working, onRun }: RequirementsModeProps) {
  const { t } = useI18n();
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
          {t("req_step")}
        </p>
        <h3 className="text-xl font-bold">{t("req_question")}</h3>
        <p className="text-xs text-muted-foreground">{t("req_sub")}</p>
      </header>

      <div className="space-y-3">
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("req_placeholder")}
          aria-label={t("req_text_aria")}
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
                  {!actionableChip && ` · ${t("req_informational")}`}
                </Badge>
              );
            })}
          </div>
        )}
        {text.trim().length > 0 && actionable.length === 0 && (
          <p role="status" className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 p-3 text-xs">
            {t("req_no_limit")}
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
          {t("req_strip_meta")}
        </Label>
      </div>

      <Button
        type="button"
        data-primary-cta
        disabled={working || actionable.length === 0}
        onClick={() => onRun({ maxBytes, maxPages, grayscale: false, stripMetadata })}
        className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base"
      >
        <CheckCheck aria-hidden="true" />
        {t("req_cta")}
      </Button>
    </div>
  );
}
