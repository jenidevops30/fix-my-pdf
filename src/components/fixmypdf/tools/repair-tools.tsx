"use client";

/**
 * Tool Shed — "Repair & Scans" group.
 *
 * fix-corrupted · remove-duplicates · deskew · scan-cleanup · split-scans
 * Controls only — the dialog owns file intake, progress, cancel + results.
 */
import { useState } from "react";
import {
  AlignVerticalJustifyCenter,
  Columns2,
  CopyX,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToolHint, ToolNote, ToolStep } from "./parts";
import {
  dedupePages,
  deskewPdf,
  fixCorrupted,
  scanCleanup,
  splitDoubleScans,
} from "@/lib/pdf/tools/repair";
import type {
  DedupeSensitivity,
  DeskewMode,
  SplitOrder,
} from "@/lib/pdf/tools/repair";
import type { ToolComponentProps, ToolDef } from "@/lib/pdf/tools/types";

/* ------------------------------ small pieces ------------------------------ */

function ChoiceOption({
  id,
  value,
  checked,
  title,
  desc,
}: {
  id: string;
  value: string;
  checked: boolean;
  title: string;
  desc?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
        checked
          ? "border-orange-500/60 bg-orange-500/5"
          : "border-border hover:border-orange-400/50 hover:bg-muted/60"
      }`}
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        {desc && (
          <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">
            {desc}
          </span>
        )}
      </span>
    </label>
  );
}

function SliderRow({
  id,
  label,
  readout,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  readout: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {readout}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      {hint && <ToolHint>{hint}</ToolHint>}
    </div>
  );
}

/* ----------------------------- fix-corrupted ------------------------------ */

function FixCorruptedControls({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  return (
    <div className="space-y-4">
      <ToolStep n={1} title="How it works" last>
        <ToolHint>
          The file is re-parsed and re-serialized with a plain, classic
          cross-reference table — the most compatible PDF structure there is.
          Everything happens in this tab; nothing is uploaded.
        </ToolHint>
      </ToolStep>
      <ToolNote tone="amber">
        This repairs the file&apos;s cross-reference table &amp; structure — it
        can&apos;t recover lost content.
      </ToolNote>
      <Button
        className="w-full"
        disabled={busy || !file}
        onClick={() => {
          if (file) run((ctx) => fixCorrupted(file, ctx));
        }}
      >
        <Wrench className="size-4" aria-hidden="true" />
        Rebuild structure
      </Button>
    </div>
  );
}

/* --------------------------- remove-duplicates ---------------------------- */

function RemoveDuplicatesControls({ files, busy, run }: ToolComponentProps) {
  const [sensitivity, setSensitivity] = useState<DedupeSensitivity>("similar");
  const file = files[0];
  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Sensitivity">
        <RadioGroup
          value={sensitivity}
          onValueChange={(v) => setSensitivity(v as DedupeSensitivity)}
          className="gap-2"
        >
          <ChoiceOption
            id="dedupe-similar"
            value="similar"
            checked={sensitivity === "similar"}
            title="Similar (recommended)"
            desc="Visual fingerprints — identical-looking pages count as duplicates."
          />
          <ChoiceOption
            id="dedupe-exact"
            value="exact"
            checked={sensitivity === "exact"}
            title="Exact"
            desc="Only pages that render pixel-identical at the same size."
          />
        </RadioGroup>
      </ToolStep>
      <ToolStep n={2} title="Run" last>
        <ToolNote tone="emerald">
          Comparison uses visual fingerprints at low resolution —
          identical-looking pages count as duplicates even if their internals
          differ.
        </ToolNote>
        <Button
          className="w-full"
          disabled={busy || !file}
          onClick={() => {
            if (file) run((ctx) => dedupePages(file, ctx, sensitivity));
          }}
        >
          <CopyX className="size-4" aria-hidden="true" />
          Scan for duplicate pages
        </Button>
      </ToolStep>
    </div>
  );
}

/* --------------------------------- deskew --------------------------------- */

function DeskewControls({ files, busy, run }: ToolComponentProps) {
  const [mode, setMode] = useState<DeskewMode>("auto");
  const [angle, setAngle] = useState(0);
  const file = files[0];
  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Mode">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as DeskewMode)}
          className="gap-2"
        >
          <ChoiceOption
            id="deskew-auto"
            value="auto"
            checked={mode === "auto"}
            title="Auto-detect tilt"
            desc="Measures line angles on every page and straightens each one."
          />
          <ChoiceOption
            id="deskew-manual"
            value="manual"
            checked={mode === "manual"}
            title="Manual angle"
            desc="Apply the same correction to every page."
          />
        </RadioGroup>
      </ToolStep>
      {mode === "manual" && (
        <div className="pl-7">
          <SliderRow
            id="deskew-angle"
            label="Correction"
            readout={`${angle.toFixed(1)}°`}
            min={-10}
            max={10}
            step={0.1}
            value={angle}
            onChange={setAngle}
            hint="Most scans need less than 5°. Pages under 0.3° are left alone."
          />
        </div>
      )}
      <ToolStep n={2} title="Run" last>
        <ToolNote tone="amber">
          Pages are rebuilt as straightened pictures; text becomes part of the
          image.
        </ToolNote>
        <Button
          className="w-full"
          disabled={busy || !file}
          onClick={() => {
            if (file) run((ctx) => deskewPdf(file, ctx, mode, angle));
          }}
        >
          <AlignVerticalJustifyCenter className="size-4" aria-hidden="true" />
          Straighten pages
        </Button>
      </ToolStep>
    </div>
  );
}

/* ------------------------------ scan-cleanup ------------------------------ */

function ScanCleanupControls({ files, busy, run }: ToolComponentProps) {
  const [contrast, setContrast] = useState(30);
  const [brightness, setBrightness] = useState(0);
  const [whiten, setWhiten] = useState(true);
  const [threshold, setThreshold] = useState(210);
  const file = files[0];
  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Contrast & brightness">
        <div className="space-y-4">
          <SliderRow
            id="scan-contrast"
            label="Contrast boost"
            readout={`+${contrast}%`}
            min={0}
            max={100}
            step={1}
            value={contrast}
            onChange={setContrast}
            hint="Darkens faint text before cleanup."
          />
          <SliderRow
            id="scan-brightness"
            label="Brightness lift"
            readout={`${brightness >= 0 ? "+" : ""}${brightness}`}
            min={-50}
            max={50}
            step={1}
            value={brightness}
            onChange={setBrightness}
          />
        </div>
      </ToolStep>
      <ToolStep n={2} title="White snap">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">
              Snap near-white to pure white
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Removes the gray scanner background completely.
            </p>
          </div>
          <Switch
            checked={whiten}
            onCheckedChange={setWhiten}
            aria-label="Snap near-white to pure white"
          />
        </div>
        {whiten && (
          <div className="pt-1">
            <SliderRow
              id="scan-threshold"
              label="White threshold"
              readout={`${threshold}`}
              min={180}
              max={240}
              step={1}
              value={threshold}
              onChange={setThreshold}
              hint="Higher = more pixels count as background. 200–220 works for most scans."
            />
          </div>
        )}
      </ToolStep>
      <ToolStep n={3} title="Run" last>
        <ToolNote tone="amber">Pages are rebuilt as cleaned pictures.</ToolNote>
        <Button
          className="w-full"
          disabled={busy || !file}
          onClick={() => {
            if (file)
              run((ctx) =>
                scanCleanup(file, ctx, { contrast, brightness, whiten, threshold })
              );
          }}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Clean up scans
        </Button>
      </ToolStep>
    </div>
  );
}

/* ------------------------------ split-scans ------------------------------- */

function SplitScansControls({ files, busy, run }: ToolComponentProps) {
  const [order, setOrder] = useState<SplitOrder>("left-first");
  const [offset, setOffset] = useState(0);
  const [margin, setMargin] = useState(8);
  const file = files[0];
  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Page order">
        <RadioGroup
          value={order}
          onValueChange={(v) => setOrder(v as SplitOrder)}
          className="gap-2"
        >
          <ChoiceOption
            id="split-left-first"
            value="left-first"
            checked={order === "left-first"}
            title="Left page first"
            desc="For books read left-to-right."
          />
          <ChoiceOption
            id="split-right-first"
            value="right-first"
            checked={order === "right-first"}
            title="Right page first"
            desc="For manga and right-to-left books."
          />
        </RadioGroup>
      </ToolStep>
      <ToolStep n={2} title="The cut">
        <div className="space-y-4">
          <SliderRow
            id="split-offset"
            label="Shift the cut line"
            readout={`${offset >= 0 ? "+" : ""}${offset} px`}
            min={-60}
            max={60}
            step={1}
            value={offset}
            onChange={setOffset}
            hint="Nudge left/right when the spine isn't exactly centered."
          />
          <SliderRow
            id="split-margin"
            label="Trim inner edge"
            readout={`${margin} px`}
            min={0}
            max={40}
            step={1}
            value={margin}
            onChange={setMargin}
            hint="Hides the gutter shadow near the spine."
          />
        </div>
      </ToolStep>
      <ToolStep n={3} title="Run" last>
        <ToolNote tone="amber">
          Best on straight, evenly-lit double-page photos. Text becomes part of
          rebuilt images.
        </ToolNote>
        <Button
          className="w-full"
          disabled={busy || !file}
          onClick={() => {
            if (file)
              run((ctx) => splitDoubleScans(file, ctx, { order, offset, margin }));
          }}
        >
          <Columns2 className="size-4" aria-hidden="true" />
          Split into two pages
        </Button>
      </ToolStep>
    </div>
  );
}

/* --------------------------------- exports -------------------------------- */

export const REPAIR_TOOLS: ToolDef[] = [
  {
    id: "fix-corrupted",
    name: "Fix Corrupted PDF",
    tagline: "Rebuild a broken file's structure so it opens again.",
    icon: Wrench,
    category: "repair",
    io: {
      accept: ".pdf",
      multiple: true,
      hint: "Damaged PDFs — drop several to batch",
    },
    Component: FixCorruptedControls,
    batchRun: (file, ctx) => fixCorrupted(file, ctx),
  },
  {
    id: "remove-duplicates",
    name: "Remove Duplicate Pages",
    tagline: "Scan a doc for identical pages and keep one of each.",
    icon: CopyX,
    category: "repair",
    io: {
      accept: ".pdf",
      multiple: true,
      hint: "Duplicate-heavy scans — batch supported",
    },
    Component: RemoveDuplicatesControls,
    batchRun: (file, ctx) => dedupePages(file, ctx, "similar"),
  },
  {
    id: "deskew",
    name: "Deskew Scans",
    tagline: "Straighten tilted pages automatically.",
    icon: AlignVerticalJustifyCenter,
    category: "repair",
    io: {
      accept: ".pdf",
      multiple: true,
      hint: "Tilted scans — batch supported",
    },
    Component: DeskewControls,
    batchRun: (file, ctx) => deskewPdf(file, ctx, "auto"),
  },
  {
    id: "scan-cleanup",
    name: "Scan Cleanup",
    tagline: "Whiten the gray background, boost faint text.",
    icon: Sparkles,
    category: "repair",
    io: {
      accept: ".pdf",
      multiple: true,
      hint: "Gray-background scans — batch supported",
    },
    Component: ScanCleanupControls,
    batchRun: (file, ctx) => scanCleanup(file, ctx),
  },
  {
    id: "split-scans",
    name: "Split Double Scans",
    tagline: "One photo of two book pages? Cut it into two.",
    icon: Columns2,
    category: "repair",
    io: {
      accept: ".pdf",
      hint: "One double-page photo per PDF",
    },
    Component: SplitScansControls,
  },
];
