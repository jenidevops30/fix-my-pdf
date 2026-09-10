"use client";

/**
 * Tool Shed — "convert" category tools.
 *
 * Each component renders ONLY its controls + the run button; the dialog owns
 * file intake, progress, cancellation, results and downloads.
 */
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Contrast,
  Grid2X2,
  Image as ImageIcon,
  Images,
} from "lucide-react";
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
import {
  bookletPdf,
  grayscalePdf,
  imagesToPdf,
  nUpPdf,
  pdfToImages,
} from "@/lib/pdf/tools/convert";
import type { ToolComponentProps, ToolDef } from "@/lib/pdf/tools/types";
import { ToolHint, ToolNote, ToolStep } from "./parts";

/* ------------------------------ small controls ------------------------------ */

function RadioOption({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <label
      className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 cursor-pointer transition-colors hover:border-orange-400/60 has-[[data-state=checked]]:border-orange-500 has-[[data-state=checked]]:bg-orange-500/5"
      data-slot="radio-option"
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="space-y-0.5 min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        {sublabel && (
          <span className="block text-xs text-muted-foreground leading-snug">
            {sublabel}
          </span>
        )}
      </span>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

/* ------------------------------ PDF to Images ------------------------------- */

function PdfToImagesTool({ files, busy, run }: ToolComponentProps) {
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [quality, setQuality] = useState(85);
  const [dpi, setDpi] = useState("150");
  const [pagesText, setPagesText] = useState("");

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Image format">
        <RadioGroup
          value={format}
          onValueChange={(v) => setFormat(v as "jpeg" | "png")}
          className="grid grid-cols-2 gap-2"
        >
          <RadioOption value="jpeg" label="JPG" sublabel="Smaller — best for photos" />
          <RadioOption value="png" label="PNG" sublabel="Lossless — text & screenshots" />
        </RadioGroup>
        {format === "jpeg" && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <FieldLabel>JPEG quality</FieldLabel>
              <span className="text-xs font-mono text-muted-foreground">{quality}</span>
            </div>
            <Slider
              value={[quality]}
              min={50}
              max={95}
              step={1}
              onValueChange={(v) => setQuality(v[0] ?? 85)}
              aria-label="JPEG quality"
            />
          </div>
        )}
      </ToolStep>

      <ToolStep n={2} title="Resolution & pages">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FieldLabel>DPI</FieldLabel>
            <Select value={dpi} onValueChange={setDpi}>
              <SelectTrigger className="w-full" aria-label="Render resolution">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="96">96 — screen</SelectItem>
                <SelectItem value="150">150 — standard</SelectItem>
                <SelectItem value="200">200 — sharp</SelectItem>
                <SelectItem value="300">300 — print</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Pages</FieldLabel>
            <Input
              value={pagesText}
              onChange={(e) => setPagesText(e.target.value)}
              placeholder="All pages"
              aria-label="Pages to export"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <ToolHint>
          Optional page list — e.g. &quot;1-3, 7&quot;. Higher DPI means crisper
          (and larger) images.
        </ToolHint>
      </ToolStep>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() =>
          run(async (ctx) =>
            pdfToImages(
              files[0],
              {
                format,
                quality: quality / 100,
                dpi: Number(dpi),
                pagesSpec: pagesText,
              },
              ctx
            )
          )
        }
      >
        Export PDF as {format === "jpeg" ? "JPG" : "PNG"}
      </Button>
    </div>
  );
}

/* ------------------------------ Images to PDF ------------------------------- */

function ImagesToPdfTool({ files, busy, run }: ToolComponentProps) {
  const [order, setOrder] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<"auto" | "a4" | "letter">("auto");

  // Derive the display order at render time: keep the saved order for files
  // still selected, then append anything newly added. No effects needed.
  const list = useMemo(() => {
    const kept = order.filter((f) => files.includes(f));
    const added = files.filter((f) => !order.includes(f));
    return [...kept, ...added];
  }, [files, order]);

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    next[index] = list[target];
    next[target] = list[index];
    setOrder(next);
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Page order">
        {list.length > 1 ? (
          <ul className="space-y-1.5" aria-label="Image order">
            {list.map((f, i) => (
              <li
                key={`${f.name}-${i}-${f.size}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5"
              >
                <span className="w-5 text-center text-[11px] font-mono text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs font-mono truncate flex-1" title={f.name}>
                  {f.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={`Move ${f.name} up`}
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={`Move ${f.name} down`}
                  disabled={busy || i === list.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <ToolHint>
            Images become pages in the order shown — add more images to reorder.
          </ToolHint>
        )}
      </ToolStep>

      <ToolStep n={2} title="Page size">
        <RadioGroup
          value={pageSize}
          onValueChange={(v) => setPageSize(v as "auto" | "a4" | "letter")}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          <RadioOption value="auto" label="Auto" sublabel="One page per image, natural size" />
          <RadioOption value="a4" label="A4" sublabel="Scaled to fit, centered" />
          <RadioOption value="letter" label="Letter" sublabel="Scaled to fit, centered" />
        </RadioGroup>
        {pageSize !== "auto" && (
          <ToolHint>
            Landscape images get a landscape page — orientation follows each image.
          </ToolHint>
        )}
      </ToolStep>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run((ctx) => imagesToPdf(list, { pageSize }, ctx))}
      >
        Build PDF from {list.length} image{list.length === 1 ? "" : "s"}
      </Button>
    </div>
  );
}

/* --------------------------- PDF to Grayscale ------------------------------- */

const GRAYSCALE_PRESETS: Record<string, number> = {
  high: 0.85,
  balanced: 0.75,
  small: 0.6,
};

function GrayscaleTool({ files, busy, run }: ToolComponentProps) {
  const [preset, setPreset] = useState("balanced");

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Quality">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-full" aria-label="Output quality">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High quality · 85</SelectItem>
            <SelectItem value="balanced">Balanced · 75</SelectItem>
            <SelectItem value="small">Small file · 60</SelectItem>
          </SelectContent>
        </Select>
        <ToolHint>
          Pages are re-encoded as images — lower quality means smaller files.
        </ToolHint>
      </ToolStep>

      <ToolNote>
        Pages are rebuilt as pictures — text turns into part of the image. Output
        page size and count stay the same.
      </ToolNote>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() =>
          run((ctx) => grayscalePdf(files[0], { quality: GRAYSCALE_PRESETS[preset] }, ctx))
        }
      >
        Convert to grayscale
      </Button>
    </div>
  );
}

/* -------------------------------- N-up Layout ------------------------------- */

function NUpTool({ files, busy, run }: ToolComponentProps) {
  const [layout, setLayout] = useState<"2-up" | "4-up">("2-up");
  const [paper, setPaper] = useState("a4");

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Layout">
        <RadioGroup
          value={layout}
          onValueChange={(v) => setLayout(v as "2-up" | "4-up")}
          className="grid grid-cols-2 gap-2"
        >
          <RadioOption value="2-up" label="2-up" sublabel="2 pages per sheet, side by side" />
          <RadioOption value="4-up" label="4-up" sublabel="4 pages per sheet, 2 × 2" />
        </RadioGroup>
      </ToolStep>

      <ToolStep n={2} title="Paper">
        <Select value={paper} onValueChange={setPaper}>
          <SelectTrigger className="w-full" aria-label="Paper size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a4">A4</SelectItem>
            <SelectItem value="letter">Letter</SelectItem>
          </SelectContent>
        </Select>
        <ToolHint>
          {layout === "2-up"
            ? "Sheets are landscape — two portrait pages sit side by side."
            : "Sheets are portrait — four pages in a 2 × 2 grid."}
        </ToolHint>
      </ToolStep>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() =>
          run((ctx) =>
            nUpPdf(files[0], { layout, paper: paper as "a4" | "letter" }, ctx)
          )
        }
      >
        Lay out as {layout}
      </Button>
    </div>
  );
}

/* ---------------------------- Booklet Imposition ---------------------------- */

function BookletTool({ files, busy, run }: ToolComponentProps) {
  const [paper, setPaper] = useState("a4");

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Paper">
        <Select value={paper} onValueChange={setPaper}>
          <SelectTrigger className="w-full" aria-label="Sheet size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a4">A4 — two A5 halves per side</SelectItem>
            <SelectItem value="letter">Letter — two half-letter halves per side</SelectItem>
          </SelectContent>
        </Select>
        <ToolHint>
          Pages are re-ordered into landscape sheets carrying two pages per side.
        </ToolHint>
      </ToolStep>

      <ToolNote>
        Print double-sided (flip on long edge), fold the stack in half — pages
        read in order.
      </ToolNote>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => run((ctx) => bookletPdf(files[0], { paper: paper as "a4" | "letter" }, ctx))}
      >
        Build booklet PDF
      </Button>
    </div>
  );
}

/* --------------------------------- registry --------------------------------- */

export const CONVERT_TOOLS: ToolDef[] = [
  {
    id: "pdf-to-images",
    name: "PDF to Images",
    tagline: "Export every page as a crisp JPG or PNG.",
    icon: ImageIcon,
    category: "convert",
    io: {
      accept: ".pdf",
      hint: "One PDF — every page becomes an image",
    },
    Component: PdfToImagesTool,
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    tagline: "Turn photos & scans into a single tidy PDF.",
    icon: Images,
    category: "convert",
    io: {
      accept: ".jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,image/*",
      multiple: true,
      minFiles: 1,
      maxFiles: 100,
      hint: "JPG · PNG · WebP · HEIC — each image becomes one page",
    },
    Component: ImagesToPdfTool,
  },
  {
    id: "grayscale",
    name: "PDF to Grayscale",
    tagline: "Strip color — smaller files, cheaper printing.",
    icon: Contrast,
    category: "convert",
    io: {
      accept: ".pdf",
      hint: "One PDF — pages are rebuilt in black & white",
    },
    Component: GrayscaleTool,
  },
  {
    id: "n-up",
    name: "N-up Layout",
    tagline: "2 or 4 pages per sheet — save paper, print handouts.",
    icon: Grid2X2,
    category: "convert",
    io: {
      accept: ".pdf",
      hint: "One PDF — pages are tiled onto larger sheets",
    },
    Component: NUpTool,
  },
  {
    id: "booklet",
    name: "Booklet Imposition",
    tagline: "Re-order pages for fold-and-staple booklets.",
    icon: BookOpen,
    category: "convert",
    io: {
      accept: ".pdf",
      hint: "One PDF — pages are re-ordered for folding",
    },
    Component: BookletTool,
  },
];
