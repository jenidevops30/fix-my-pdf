"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mbToBytes } from "@/lib/pdf/format";
import { cn } from "@/lib/utils";
import type { FitRunOptions } from "../types";

const PRESETS: Array<{ mb: number; label: string; star?: boolean }> = [
  { mb: 1, label: "Gov / Visa" },
  { mb: 2, label: "Workday / HR" },
  { mb: 5, label: "University", star: true },
];

interface FitModeProps {
  working: boolean;
  onRun: (opts: FitRunOptions) => void;
}

export function FitMode({ working, onRun }: FitModeProps) {
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
          Step 1 • Byte Target
        </p>
        <h3 className="text-xl font-bold">What is the upload size limit?</h3>
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
              {p.label}
              {p.star && <span className="text-orange-600 dark:text-orange-400"> ★ Common</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fit-max-mb">Or type an exact limit</Label>
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
            aria-label="Maximum size in megabytes"
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
            Strip hidden tracking metadata & camera EXIF
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
            Convert to grayscale (scanned B&W docs compress dramatically)
          </Label>
        </div>
      </div>

      <Button
        type="button"
        disabled={working || !valid}
        onClick={() => onRun({ targetBytes: mbToBytes(mb), grayscale, stripMetadata })}
        className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base"
      >
        <Zap aria-hidden="true" />
        Make It Fit Under {display} MB
      </Button>
    </div>
  );
}
