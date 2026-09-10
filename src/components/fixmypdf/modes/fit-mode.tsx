"use client";

import { useEffect, useState } from "react";
import { Star, X, Zap } from "lucide-react";
import { toast } from "sonner";
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

/**
 * Device-local custom target presets (MB values). Stored as a JSON array in
 * localStorage — sorted ascending, deduped, 0.1 MB precision, 0.1..100 range.
 * Never a server, never a database: this is device-only state.
 */
const CUSTOM_PRESETS_KEY = "fixmypdf:custom-presets";
const MAX_CUSTOM_PRESETS = 5;
const MIN_CUSTOM_MB = 0.1;
const MAX_CUSTOM_MB = 100;

function readCustomPresets(): number[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      .map((v) => Math.round(v * 10) / 10) // snap to 0.1 MB precision
      .filter((v) => v >= MIN_CUSTOM_MB && v <= MAX_CUSTOM_MB)
      .sort((a, b) => a - b)
      .filter((v, i, arr) => i === 0 || arr[i - 1] !== v);
  } catch {
    return []; // storage blocked or corrupt data — session-only empty list
  }
}

function writeCustomPresets(presets: number[]) {
  try {
    window.localStorage.setItem(
      CUSTOM_PRESETS_KEY,
      JSON.stringify([...presets].sort((a, b) => a - b))
    );
  } catch {
    /* storage blocked — presets stay session-only */
  }
}

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
  // Device-local custom presets, in save order (cap 5). Filled after first
  // paint inside a rAF callback so the hydration-stable first render matches
  // the server output — localStorage is never read during render.
  const [customPresets, setCustomPresets] = useState<number[]>([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setCustomPresets(readCustomPresets()));
    return () => cancelAnimationFrame(raf);
  }, []);

  const mb = parseFloat(mbText);
  const valid = Number.isFinite(mb) && mb > 0;
  const display = valid ? (Number.isInteger(mb) ? mb.toFixed(1) : String(mb)) : "5.0";
  // Chips always display in ascending order, matching the persisted format.
  const sortedCustom = [...customPresets].sort((a, b) => a - b);

  const choosePreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.mb);
    setMbText(String(p.mb));
  };

  const chooseCustom = (value: number) => {
    setPreset(value);
    setMbText(String(value));
  };

  const savePreset = () => {
    if (!valid) return;
    const value = Math.round(mb * 10) / 10;
    if (value < MIN_CUSTOM_MB || value > MAX_CUSTOM_MB) return;
    if (customPresets.includes(value)) return; // already saved — do nothing
    // Cap at 5: when full, the oldest saved preset is dropped.
    const next = [...customPresets.slice(-(MAX_CUSTOM_PRESETS - 1)), value];
    setCustomPresets(next);
    writeCustomPresets(next);
    toast.success(t("fit_saved_toast", { mb: value.toFixed(1) }));
  };

  const removePreset = (value: number) => {
    const next = customPresets.filter((v) => v !== value);
    setCustomPresets(next);
    writeCustomPresets(next);
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
        {sortedCustom.map((value) => (
          <div key={`custom-${value}`} className="relative">
            <button
              type="button"
              aria-pressed={preset === value}
              onClick={() => chooseCustom(value)}
              className={cn(
                "w-full h-full p-3 pr-7 rounded-xl border-2 text-left transition-colors min-h-[44px]",
                preset === value
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <span className="block text-sm font-bold">{value.toFixed(1)} MB</span>
              <span className="block text-[11px] font-mono text-muted-foreground mt-0.5">
                <Star
                  aria-hidden="true"
                  className="inline size-3 text-orange-600 dark:text-orange-400"
                />
              </span>
            </button>
            <button
              type="button"
              aria-label={`Remove preset ${value.toFixed(1)} MB`}
              onClick={() => removePreset(value)}
              className="absolute right-1 top-1 p-1 rounded-md text-muted-foreground/70 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fit-max-mb">{t("fit_exact_label")}</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!valid}
            onClick={savePreset}
            title={t("fit_save_target")}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Star aria-hidden="true" />
            {t("fit_save_target")}
          </Button>
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
