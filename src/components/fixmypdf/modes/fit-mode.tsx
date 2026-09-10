"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mbToBytes } from "@/lib/pdf/format";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { FitRunOptions } from "../types";

const PRESETS: Array<{ mb: number; labelKey: "fit_preset_1" | "fit_preset_2" | "fit_preset_3"; star?: boolean }> = [
  { mb: 1, labelKey: "fit_preset_1" },
  { mb: 2, labelKey: "fit_preset_2" },
  { mb: 5, labelKey: "fit_preset_3", star: true },
];

interface FitModeProps {
  working: boolean;
  onRun: (opts: FitRunOptions) => void;
}

export function FitMode({ working, onRun }: FitModeProps) {
  const { t } = useI18n();
  const [mbText, setMbText] = useState("5");
  const [preset, setPreset] = useState<number | null>(null);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [grayscale, setGrayscale] = useState(false);

  const mb = parseFloat(mbText);
  const valid = Number.isFinite(mb) && mb > 0;
  const display = valid ? (Number.isInteger(mb) ? mb.toFixed(1) : String(mb)) : "5.0";

  const choosePreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.mb);
    setMbText(String(p.mb));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
          {t("fit_step")}
        </p>
        <h3 className="text-xl font-bold">{t("fit_question")}</h3>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        {PRESETS.map((p) => (
          <button
            key={p.mb}
            type="button"
            aria-pressed={preset === p.mb}
            onClick={() => choosePreset(p)}
            className={cn(
              "p-3 rounded-xl border-2 text-left transition-colors min-h-[44px]",
              preset === p.mb
                ? "border-orange-500 bg-orange-500/10"
                : "border-border hover:bg-muted/50"
            )}
          >
            <span className="block text-sm font-bold">{p.mb.toFixed(1)} MB</span>
            <span className="block text-[11px] font-mono text-muted-foreground mt-0.5">
              {t(p.labelKey)}
              {p.star && <span className="text-orange-600 dark:text-orange-400"> {t("fit_common")}</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fit-max-mb">{t("fit_exact_label")}</Label>
        <div className="relative">
          <Input
            id="fit-max-mb"
            type="number"
            inputMode="decimal"
            min={0.1}
            step={0.1}
            value={mbText}
            onChange={(e) => {
              setMbText(e.target.value);
              setPreset(null);
            }}
            aria-label={t("fit_mb_aria")}
            className="h-12 pr-24 font-mono text-lg font-bold"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 font-mono text-sm pointer-events-none"
            aria-hidden="true"
          >
            MB MAX
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5 min-h-6">
          <Checkbox
            id="fit-strip-meta"
            checked={stripMetadata}
            onCheckedChange={(v) => setStripMetadata(v === true)}
          />
          <Label
            htmlFor="fit-strip-meta"
            className="text-xs text-muted-foreground font-normal cursor-pointer leading-snug"
          >
            {t("fit_strip_meta")}
          </Label>
        </div>
        <div className="flex items-center gap-2.5 min-h-6">
          <Checkbox
            id="fit-grayscale"
            checked={grayscale}
            onCheckedChange={(v) => setGrayscale(v === true)}
          />
          <Label
            htmlFor="fit-grayscale"
            className="text-xs text-muted-foreground font-normal cursor-pointer leading-snug"
          >
            {t("fit_grayscale")}
          </Label>
        </div>
      </div>

      <Button
        type="button"
        data-primary-cta
        disabled={working || !valid}
        onClick={() => onRun({ targetBytes: mbToBytes(mb), grayscale, stripMetadata })}
        className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base"
      >
        <Zap aria-hidden="true" />
        {t("fit_cta", { mb: display })}
      </Button>
    </div>
  );
}
