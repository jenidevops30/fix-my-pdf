"use client";

/**
 * Tool Shed — "optimize" group (Shrink & Fit).
 *
 * Five single-PDF tools:
 *  - resize-pages      vector re-layout onto A4 / Letter
 *  - crop-margins      auto-detected or exact-millimetre crop boxes
 *  - scale-pages       exact pixel-size page rebuild (1 px = 1 pt)
 *  - dpi-fixer         normalise scanned pages to one resolution
 *  - quality-reducer   quality / grayscale / dpi dial
 *
 * Components render controls + the run button only; the ToolDialog owns
 * progress, cancellation and results. All heavy lifting lives in
 * src/lib/pdf/tools/optimize.ts.
 */
import { useState } from "react";
import { Crop, Gauge, Proportions, Scaling, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { baseName } from "@/lib/pdf/format";
import { fileBytes, pdfOutput } from "@/lib/pdf/tools/kit";
import {
  autoCropMargins,
  fixDpi,
  reduceQuality,
  resizeToPaper,
  scaleToPixels,
} from "@/lib/pdf/tools/optimize";
import type {
  CropMode,
  MarginsMm,
  OptimizeResult,
  PaperKind,
  PaperOrientation,
  PixelFit,
} from "@/lib/pdf/tools/optimize";
import type { RunCtx, ToolComponentProps, ToolDef, ToolOutput } from "@/lib/pdf/tools/types";
import { ToolHint, ToolNote, ToolStep } from "./parts";

/* --------------------------------- helpers -------------------------------- */

/** Read the file, run an engine with progress/abort wired, wrap as output. */
async function runEngine(
  file: File,
  ctx: RunCtx,
  build: (bytes: Uint8Array) => Promise<OptimizeResult>,
  name: string
): Promise<ToolOutput[]> {
  const bytes = await fileBytes(file);
  const result = await build(bytes);
  return [pdfOutput(name, result.bytes, result.meta)];
}

function RadioOption({
  id,
  value,
  current,
  title,
  sub,
  className = "",
}: {
  id: string;
  value: string;
  current: string;
  title: string;
  sub?: string;
  className?: string;
}) {
  const active = current === value;
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
        active
          ? "border-orange-500/70 bg-orange-500/5"
          : "border-border hover:border-orange-400/50 hover:bg-muted/50"
      } ${className}`}
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        {sub && <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </label>
  );
}

function radioTile(active: boolean): string {
  return `flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors ${
    active
      ? "border-orange-500/70 bg-orange-500/5"
      : "border-border hover:border-orange-400/50 hover:bg-muted/50"
  }`;
}

/* ---------------------------- 1. resize-pages ----------------------------- */

function ResizeComponent({ files, busy, run }: ToolComponentProps) {
  const [paper, setPaper] = useState<PaperKind>("a4");
  const [orientation, setOrientation] = useState<PaperOrientation>("auto");
  const file = files[0];

  const onRun = () => {
    if (!file) return;
    run((ctx) =>
      runEngine(
        file,
        ctx,
        (bytes) =>
          resizeToPaper(bytes, {
            paper,
            orientation,
            signal: ctx.signal,
            onProgress: ctx.progress,
          }),
        `${baseName(file.name)}-${paper}.pdf`
      )
    );
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Paper size">
        <RadioGroup
          value={paper}
          onValueChange={(v) => setPaper(v as PaperKind)}
          className="grid grid-cols-2 gap-2"
        >
          <RadioOption id="resize-paper-a4" value="a4" current={paper} title="A4" sub="210 × 297 mm" />
          <RadioOption
            id="resize-paper-letter"
            value="letter"
            current={paper}
            title="Letter"
            sub="8.5 × 11 in"
          />
        </RadioGroup>
      </ToolStep>
      <ToolStep n={2} title="Orientation" last>
        <RadioGroup
          value={orientation}
          onValueChange={(v) => setOrientation(v as PaperOrientation)}
          className="grid gap-2"
        >
          <RadioOption id="resize-orient-portrait" value="portrait" current={orientation} title="Portrait" />
          <RadioOption id="resize-orient-landscape" value="landscape" current={orientation} title="Landscape" />
          <RadioOption
            id="resize-orient-auto"
            value="auto"
            current={orientation}
            title="Auto — per page"
            sub="Each page gets the orientation closest to its shape"
          />
        </RadioGroup>
      </ToolStep>
      <ToolNote tone="emerald">Pure vector re-layout — text stays sharp and selectable.</ToolNote>
      <Button className="w-full" disabled={busy} onClick={onRun}>
        Resize to {paper === "a4" ? "A4" : "Letter"}
      </Button>
    </div>
  );
}

async function resizeBatch(file: File, ctx: RunCtx): Promise<ToolOutput[]> {
  return runEngine(
    file,
    ctx,
    (bytes) =>
      resizeToPaper(bytes, {
        paper: "a4",
        orientation: "auto",
        signal: ctx.signal,
        onProgress: ctx.progress,
      }),
    `${baseName(file.name)}-a4.pdf`
  );
}

/* ----------------------------- 2. crop-margins ---------------------------- */

const MARGIN_FIELDS: Array<{ key: keyof MarginsMm; label: string }> = [
  { key: "top", label: "Top" },
  { key: "right", label: "Right" },
  { key: "bottom", label: "Bottom" },
  { key: "left", label: "Left" },
];

function CropComponent({ files, busy, run }: ToolComponentProps) {
  const [mode, setMode] = useState<CropMode>("auto");
  const [padding, setPadding] = useState("12");
  const [margins, setMargins] = useState<Record<keyof MarginsMm, string>>({
    top: "0",
    right: "0",
    bottom: "0",
    left: "0",
  });
  const file = files[0];

  // Live sanity note: margins bigger than the page make the run stop, so
  // warn while typing instead of only after the click.
  const hugeMargin = Object.values(margins).some((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 150;
  });
  const negativeMargin = Object.values(margins).some((v) => {
    const n = Number(v);
    return v.trim() !== "" && (!Number.isFinite(n) || n < 0);
  });

  const onRun = () => {
    if (!file) return;
    run((ctx) =>
      runEngine(
        file,
        ctx,
        async (bytes) => {
          if (mode === "manual") {
            const mm = (v: string): number => {
              const n = Number(v);
              if (!Number.isFinite(n) || n < 0) {
                throw new Error("Margins must be zero or positive numbers.");
              }
              return n;
            };
            return autoCropMargins(bytes, {
              mode,
              marginsMm: {
                top: mm(margins.top),
                right: mm(margins.right),
                bottom: mm(margins.bottom),
                left: mm(margins.left),
              },
              signal: ctx.signal,
              onProgress: ctx.progress,
            });
          }
          const pad = Number(padding);
          if (!Number.isFinite(pad) || pad < 0) {
            throw new Error("Padding must be zero or a positive number.");
          }
          return autoCropMargins(bytes, {
            mode,
            paddingPt: pad,
            signal: ctx.signal,
            onProgress: ctx.progress,
          });
        },
        `${baseName(file.name)}-cropped.pdf`
      )
    );
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Mode">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as CropMode)}
          className="grid gap-2"
        >
          <RadioOption
            id="crop-mode-auto"
            value="auto"
            current={mode}
            title="Auto-detect content"
            sub="Finds the printed area and trims the white border"
          />
          <RadioOption
            id="crop-mode-manual"
            value="manual"
            current={mode}
            title="Exact margins"
            sub="Cut a fixed amount off each edge"
          />
        </RadioGroup>
      </ToolStep>
      <ToolStep n={2} title={mode === "auto" ? "Padding" : "Margins"} last>
        {mode === "auto" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label htmlFor="crop-padding" className="w-28 shrink-0 text-sm">
                Keep padding
              </Label>
              <div className="relative flex-1">
                <Input
                  id="crop-padding"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={padding}
                  onChange={(e) => setPadding(e.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-mono text-muted-foreground">
                  pt
                </span>
              </div>
            </div>
            <ToolHint>Extra white border kept around the detected content, in points.</ToolHint>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MARGIN_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`crop-${key}`} className="text-xs text-muted-foreground">
                    {label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`crop-${key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={margins[key]}
                      onChange={(e) => setMargins({ ...margins, [key]: e.target.value })}
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[11px] font-mono text-muted-foreground">
                      mm
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <ToolHint>Applied to every page in the document.</ToolHint>
            {negativeMargin && (
              <ToolNote>Margins must be zero or positive numbers.</ToolNote>
            )}
            {!negativeMargin && hugeMargin && (
              <ToolNote>
                Very large margins — anything past the page edge will stop the run. Most
                pages are under 300 mm tall.
              </ToolNote>
            )}
          </div>
        )}
      </ToolStep>
      <ToolNote>
        Cropping sets the visible box — the hidden content stays in the file. Use Flatten
        afterwards to discard it for good.
      </ToolNote>
      <Button
        className="w-full"
        disabled={busy || negativeMargin}
        onClick={onRun}
      >
        Crop margins
      </Button>
    </div>
  );
}

async function cropBatch(file: File, ctx: RunCtx): Promise<ToolOutput[]> {
  return runEngine(
    file,
    ctx,
    (bytes) =>
      autoCropMargins(bytes, {
        mode: "auto",
        paddingPt: 12,
        signal: ctx.signal,
        onProgress: ctx.progress,
      }),
    `${baseName(file.name)}-cropped.pdf`
  );
}

/* ----------------------------- 3. scale-pages ----------------------------- */

function ScaleComponent({ files, busy, run }: ToolComponentProps) {
  const [width, setWidth] = useState("600");
  const [height, setHeight] = useState("600");
  const [fit, setFit] = useState<PixelFit>("contain");
  const file = files[0];

  const parseSize = (v: string): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 16 && n <= 4000 ? Math.round(n) : null;
  };
  const W = parseSize(width);
  const H = parseSize(height);
  const sizeInvalid = W === null || H === null;

  const onRun = () => {
    if (!file || W === null || H === null) return;
    run((ctx) =>
      runEngine(
        file,
        ctx,
        (bytes) =>
          scaleToPixels(bytes, {
            width: W,
            height: H,
            fit,
            signal: ctx.signal,
            onProgress: ctx.progress,
          }),
        `${baseName(file.name)}-${W}x${H}.pdf`
      )
    );
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Page size">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="scale-width" className="text-xs text-muted-foreground">
              Width (px)
            </Label>
            <Input
              id="scale-width"
              type="number"
              inputMode="numeric"
              min={16}
              max={4000}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scale-height" className="text-xs text-muted-foreground">
              Height (px)
            </Label>
            <Input
              id="scale-height"
              type="number"
              inputMode="numeric"
              min={16}
              max={4000}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>
        <ToolHint>Between 16 and 4000 pixels per side — e.g. 600 × 600 portal rules.</ToolHint>
        {sizeInvalid && (
          <ToolNote>
            Enter whole pixel sizes between 16 and 4000 for width and height.
          </ToolNote>
        )}
      </ToolStep>
      <ToolStep n={2} title="Fit" last>
        <RadioGroup
          value={fit}
          onValueChange={(v) => setFit(v as PixelFit)}
          className="grid gap-2"
        >
          <RadioOption
            id="scale-fit-contain"
            value="contain"
            current={fit}
            title="Contain"
            sub="Whole page visible — white letterbox fills the rest"
          />
          <RadioOption
            id="scale-fit-cover"
            value="cover"
            current={fit}
            title="Cover"
            sub="Fills the page edge-to-edge — edges may be cropped"
          />
        </RadioGroup>
      </ToolStep>
      <ToolNote>
        {W !== null && H !== null
          ? `Output pages are rebuilt as ${W}×${H} pixel pictures (1 px = 1 pt). Text becomes part of the image — perfect for upload portals that check page dimensions.`
          : "Output pages are rebuilt at an exact pixel size (1 px = 1 pt)."}
      </ToolNote>
      <Button className="w-full" disabled={busy || sizeInvalid} onClick={onRun}>
        {W !== null && H !== null ? `Rebuild pages at ${W}×${H} px` : "Rebuild pages"}
      </Button>
    </div>
  );
}

/* ------------------------------ 4. dpi-fixer ------------------------------ */

const DPI_OPTIONS = [150, 200, 300, 600] as const;

function DpiComponent({ files, busy, run }: ToolComponentProps) {
  const [dpi, setDpi] = useState<number>(300);
  const [pagesSpec, setPagesSpec] = useState("");
  const file = files[0];

  const specLooksValid =
    pagesSpec.trim() === "" || /^[0-9\s,\-]+$/.test(pagesSpec.trim());

  const onRun = () => {
    if (!file) return;
    run((ctx) =>
      runEngine(
        file,
        ctx,
        (bytes) =>
          fixDpi(bytes, {
            dpi,
            pagesSpec,
            signal: ctx.signal,
            onProgress: ctx.progress,
          }),
        `${baseName(file.name)}-${dpi}dpi.pdf`
      )
    );
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Target resolution">
        <RadioGroup
          value={String(dpi)}
          onValueChange={(v) => setDpi(Number(v))}
          className="grid grid-cols-4 gap-2"
        >
          {DPI_OPTIONS.map((d) => (
            <label key={d} htmlFor={`dpi-${d}`} className={radioTile(dpi === d)}>
              <RadioGroupItem id={`dpi-${d}`} value={String(d)} />
              <span className="font-mono text-sm font-bold">{d}</span>
            </label>
          ))}
        </RadioGroup>
        <ToolHint>
          Higher DPI is sharper but heavier — 300 is the sweet spot for text scans, 600 for
          photos or fine print.
        </ToolHint>
      </ToolStep>
      <ToolStep n={2} title="Pages" last>
        <div className="space-y-1.5">
          <Label htmlFor="dpi-pages" className="text-xs text-muted-foreground">
            Page range (blank = every page)
          </Label>
          <Input
            id="dpi-pages"
            placeholder="e.g. 1-10, 14"
            value={pagesSpec}
            onChange={(e) => setPagesSpec(e.target.value)}
            disabled={busy}
            className="font-mono"
            autoComplete="off"
            aria-invalid={!specLooksValid}
          />
          {!specLooksValid ? (
            <ToolNote>
              Use page numbers and ranges — for example “1-10, 14”.
            </ToolNote>
          ) : (
            <ToolHint>
              Long documents: fix a range at a time — very large runs are refused to keep the
              tab responsive. Text becomes part of the image.
            </ToolHint>
          )}
        </div>
      </ToolStep>
      <Button className="w-full" disabled={busy || !specLooksValid} onClick={onRun}>
        Normalise to {dpi} DPI
      </Button>
    </div>
  );
}

async function dpiBatch(file: File, ctx: RunCtx): Promise<ToolOutput[]> {
  return runEngine(
    file,
    ctx,
    (bytes) => fixDpi(bytes, { dpi: 300, signal: ctx.signal, onProgress: ctx.progress }),
    `${baseName(file.name)}-300dpi.pdf`
  );
}

/* --------------------------- 5. quality-reducer --------------------------- */

const QUALITY_DPI_OPTIONS = [96, 150, 200] as const;

function QualityComponent({ files, busy, run }: ToolComponentProps) {
  const [quality, setQuality] = useState(60);
  const [grayscale, setGrayscale] = useState(false);
  const [dpi, setDpi] = useState("150");
  const file = files[0];

  const onRun = () => {
    if (!file) return;
    run((ctx) =>
      runEngine(
        file,
        ctx,
        (bytes) =>
          reduceQuality(bytes, {
            quality,
            grayscale,
            dpi: Number(dpi),
            signal: ctx.signal,
            onProgress: ctx.progress,
          }),
        `${baseName(file.name)}-q${quality}.pdf`
      )
    );
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="JPEG quality">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quality</span>
          <span className="font-mono text-sm font-bold text-orange-600 dark:text-orange-400">
            {quality}%
          </span>
        </div>
        <Slider
          aria-label="JPEG quality percent"
          min={10}
          max={95}
          step={1}
          value={[quality]}
          onValueChange={(v) => setQuality(v[0])}
        />
        <ToolHint>Lower = smaller file, softer image. 60 is a good everyday default.</ToolHint>
      </ToolStep>
      <ToolStep n={2} title="Colour & resolution" last>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <Label htmlFor="quality-grayscale" className="text-sm font-medium">
              Convert to grayscale
            </Label>
            <p className="text-xs text-muted-foreground">Shrinks scans further, looks cleaner</p>
          </div>
          <Switch id="quality-grayscale" checked={grayscale} onCheckedChange={setGrayscale} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <Label htmlFor="quality-dpi" className="text-sm font-medium">
            Render DPI
          </Label>
          <Select value={dpi} onValueChange={(v) => setDpi(v)}>
            <SelectTrigger id="quality-dpi" size="sm" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_DPI_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ToolStep>
      <ToolNote>
        Pages are re-rendered as JPEG pictures at the chosen quality — text becomes part of the
        image. For a guaranteed size target use the Make It Fit workspace above instead.
      </ToolNote>
      <Button className="w-full" disabled={busy} onClick={onRun}>
        Reduce quality to {quality}%
      </Button>
    </div>
  );
}

async function qualityBatch(file: File, ctx: RunCtx): Promise<ToolOutput[]> {
  return runEngine(
    file,
    ctx,
    (bytes) =>
      reduceQuality(bytes, {
        quality: 60,
        grayscale: false,
        dpi: 150,
        signal: ctx.signal,
        onProgress: ctx.progress,
      }),
    `${baseName(file.name)}-q60.pdf`
  );
}

/* -------------------------------- registry -------------------------------- */

export const OPTIMIZE_TOOLS: ToolDef[] = [
  {
    id: "resize-pages",
    name: "Resize to A4 / Letter",
    tagline: "Fix pages that are the wrong size for printing or portals.",
    icon: Proportions,
    category: "optimize",
    io: { accept: ".pdf", hint: "One PDF — every page is re-laid-out in vector" },
    Component: ResizeComponent,
    batchRun: resizeBatch,
  },
  {
    id: "crop-margins",
    name: "Crop Margins",
    tagline: "Trim white borders — auto-detect or exact millimetres.",
    icon: Crop,
    category: "optimize",
    io: { accept: ".pdf", hint: "One PDF — great for over-scanned documents" },
    Component: CropComponent,
    batchRun: cropBatch,
  },
  {
    id: "scale-pages",
    name: "Scale to Pixel Size",
    tagline: "Rebuild pages at an exact pixel size — 600×600 portal rules.",
    icon: Scaling,
    category: "optimize",
    io: { accept: ".pdf", hint: "One PDF" },
    Component: ScaleComponent,
  },
  {
    id: "dpi-fixer",
    name: "Scan DPI Fixer",
    tagline: "Normalise scanned pages to one clean resolution.",
    icon: Gauge,
    category: "optimize",
    io: { accept: ".pdf", hint: "One PDF — mixed-resolution scans welcome" },
    Component: DpiComponent,
    batchRun: dpiBatch,
  },
  {
    id: "quality-reducer",
    name: "Image Quality Reducer",
    tagline: "Slide the dial — trade a little sharpness for a lot of bytes.",
    icon: SlidersHorizontal,
    category: "optimize",
    io: { accept: ".pdf", hint: "One PDF" },
    Component: QualityComponent,
    batchRun: qualityBatch,
  },
];
