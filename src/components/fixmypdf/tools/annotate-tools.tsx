"use client";

/**
 * Tool Shed — "Fill, Sign & Stamp" (annotate) tools.
 *
 *  - fill-forms     : reads AcroForm fields and types values into them
 *  - sign           : draw / type a signature, stamp it on a page
 *  - page-numbers   : 1, 2, 3… stamps
 *  - watermark      : diagonal text or image watermark
 *  - header-footer  : one header + one footer line, three slots each
 *
 * All PDF work happens through ../lib engines — nothing ever uploads.
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  Eraser,
  Hash,
  PanelTop,
  PenLine,
  Stamp as StampIcon,
  Signature as SignatureIcon,
  Type as TypeIcon,
} from "lucide-react";
import {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";
import type { PDFField } from "pdf-lib";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { loadPdf, fileBytes } from "@/lib/pdf/tools/kit";
import {
  addHeaderFooter,
  addPageNumbers,
  addWatermark,
  fillForm,
  stampSignature,
} from "@/lib/pdf/tools/annotate";
import type {
  PageNumberFormat,
  SignatureAnchor,
  StampPosition,
  WatermarkColor,
} from "@/lib/pdf/tools/annotate";
import type { ToolComponentProps, ToolDef } from "@/lib/pdf/tools/types";
import { ToolHint, ToolNote, ToolStep } from "./parts";

/* ------------------------------- shared bits ------------------------------- */

function FieldRow({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function RunButton({
  busy,
  label,
  icon: Icon,
  disabled,
  onRun,
}: {
  busy: boolean;
  label: string;
  icon: typeof PenLine;
  disabled?: boolean;
  onRun: () => void;
}) {
  return (
    <Button className="w-full" disabled={busy || disabled} onClick={onRun}>
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

/* ================================ fill forms =============================== */

type FieldKind = "text" | "multiline" | "checkbox" | "dropdown" | "radio" | "optionlist";

interface FieldInfo {
  name: string;
  kind: FieldKind;
  options: string[];
}

type FillValues = Record<string, string | boolean>;

const KIND_LABELS: Record<FieldKind, string> = {
  text: "text",
  multiline: "text (multi-line)",
  checkbox: "checkbox",
  dropdown: "dropdown",
  radio: "radio",
  optionlist: "list",
};

function mapFormFields(raw: PDFField[]): FieldInfo[] {
  const out: FieldInfo[] = [];
  for (const f of raw) {
    const name = f.getName();
    if (f instanceof PDFTextField) {
      out.push({ name, kind: f.isMultiline() ? "multiline" : "text", options: [] });
    } else if (f instanceof PDFCheckBox) {
      out.push({ name, kind: "checkbox", options: [] });
    } else if (f instanceof PDFDropdown) {
      out.push({ name, kind: "dropdown", options: f.getOptions() });
    } else if (f instanceof PDFRadioGroup) {
      out.push({ name, kind: "radio", options: f.getOptions() });
    } else if (f instanceof PDFOptionList) {
      out.push({ name, kind: "optionlist", options: f.getOptions() });
    }
    // push-buttons / signature fields have nothing to type — skipped
  }
  return out;
}

function FillFormsControls({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  // Remount the panel per file so field state resets cleanly on re-pick.
  const fileKey = `${file.name}:${file.size}`;
  return <FillFormsPanel key={fileKey} file={file} busy={busy} run={run} />;
}

function FillFormsPanel({
  file,
  busy,
  run,
}: {
  file: File;
  busy: boolean;
  run: ToolComponentProps["run"];
}) {
  const [fields, setFields] = useState<FieldInfo[] | null>(null); // null = reading
  const [values, setValues] = useState<FillValues>({});
  const [flatten, setFlatten] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const doc = await loadPdf(file);
        if (!alive) return;
        if (doc.isEncrypted) {
          setProblem(
            "This PDF is password-protected. Re-save it without a password, then try again."
          );
          setFields([]);
          return;
        }
        const infos = mapFormFields(doc.getForm().getFields());
        const init: FillValues = {};
        for (const f of infos) init[f.name] = f.kind === "checkbox" ? false : "";
        setValues(init);
        setFields(infos);
      } catch {
        if (!alive) return;
        setProblem("This file could not be read as a PDF form.");
        setFields([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);

  const setValue = (name: string, v: string | boolean) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  if (fields === null) {
    return (
      <div className="py-6 text-center">
        <ToolHint>Reading form…</ToolHint>
      </div>
    );
  }

  if (problem) {
    return <ToolNote>{problem}</ToolNote>;
  }

  if (!fields.length) {
    return (
      <ToolNote>
        This PDF has no fillable form fields (no AcroForm). Scanned paper forms
        can&apos;t be typed into.
      </ToolNote>
    );
  }

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Fill the fields" last>
        <div className="max-h-96 overflow-y-auto slim-scrollbar rounded-lg border border-border divide-y divide-border">
          {fields.map((f) => (
            <div key={f.name} className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold truncate" title={f.name}>
                  {f.name}
                </Label>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">
                  {KIND_LABELS[f.kind]}
                </span>
              </div>
              {(f.kind === "text" || f.kind === "multiline") && (
                <Input
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  className="h-8 text-xs"
                  aria-label={f.name}
                />
              )}
              {f.kind === "checkbox" && (
                <Switch
                  checked={values[f.name] === true}
                  onCheckedChange={(v) => setValue(f.name, v)}
                  aria-label={f.name}
                />
              )}
              {(f.kind === "dropdown" || f.kind === "radio" || f.kind === "optionlist") &&
                (f.options.length ? (
                  <Select
                    value={
                      typeof values[f.name] === "string" && values[f.name]
                        ? (values[f.name] as string)
                        : undefined
                    }
                    onValueChange={(v) => setValue(f.name, v)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="— choose —" />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o, i) => {
                        const val = o === "" ? "(blank)" : o;
                        return (
                          <SelectItem key={`${i}-${o}`} value={val} className="text-xs">
                            {val}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <ToolHint>No options embedded in this field.</ToolHint>
                ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold">Flatten after filling</p>
            <ToolHint>Fields become plain text — values can&apos;t be edited afterwards.</ToolHint>
          </div>
          <Switch checked={flatten} onCheckedChange={setFlatten} aria-label="Flatten after filling" />
        </div>

        <RunButton
          busy={busy}
          label="Fill fields & download"
          icon={PenLine}
          onRun={() =>
            run(async (ctx) => {
              ctx.progress({ percent: 4, detail: "Filling form fields…" });
              return [await fillForm(file, values, flatten, ctx)];
            })
          }
        />
      </ToolStep>
    </div>
  );
}

/* =================================== sign =================================== */

const SIGN_ANCHORS: Array<{ value: SignatureAnchor; label: string }> = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
];

function renderTypeSignature(text: string): string | null {
  if (!text) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let px = 44;
  const family = '"Segoe Script", "Bradley Hand", cursive';
  ctx.font = `italic ${px}px ${family}`;
  while (px > 16 && ctx.measureText(text).width > canvas.width - 24) {
    px -= 2;
    ctx.font = `italic ${px}px ${family}`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = window.atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function SignControls({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [typedPreview, setTypedPreview] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [anchor, setAnchor] = useState<SignatureAnchor>("bottom-right");
  const [widthPct, setWidthPct] = useState(24);
  const [offsetPct, setOffsetPct] = useState(6);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  // Page count loads after mount (state set only in the async continuation).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const doc = await loadPdf(file);
        if (!alive) return;
        const n = doc.getPageCount();
        setPageCount(n);
        setPage((p) => Math.min(Math.max(p, 1), Math.max(n, 1)));
      } catch {
        if (alive) setPageCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);

  // Typed-signature preview (debounced like the dict loaders).
  useEffect(() => {
    if (mode !== "type") return;
    const t = window.setTimeout(() => {
      setTypedPreview(renderTypeSignature(typedName.trim()));
    }, 120);
    return () => window.clearTimeout(t);
  }, [mode, typedName]);

  const canvasPoint = (e: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(rect.width, 1)) * canvas.width,
      y: ((e.clientY - rect.top) / Math.max(rect.height, 1)) * canvas.height,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = canvasPoint(e);
    if (!canvas || !ctx || !pt) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
    drawingRef.current = true;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01); // register a dot on a simple click
    ctx.stroke();
    setHasInk(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const pt = canvasPoint(e);
    if (!ctx || !pt) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const pages = Math.max(pageCount, 1);
  const safePage = Math.min(Math.max(page, 1), pages);

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Your signature">
        <Tabs value={mode} onValueChange={(v) => setMode(v === "type" ? "type" : "draw")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="draw" className="text-xs">
              <PenLine className="size-3.5" aria-hidden="true" /> Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="text-xs">
              <TypeIcon className="size-3.5" aria-hidden="true" /> Type
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "draw" ? (
          <div className="space-y-2">
            <canvas
              ref={canvasRef}
              width={520}
              height={160}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              aria-label="Signature drawing pad — draw with mouse, pen or finger"
              className="w-full max-w-[520px] mx-auto touch-none cursor-crosshair rounded-lg border-2 border-dashed border-border bg-white dark:bg-slate-900/60 block"
            />
            <div className="flex items-center justify-between gap-2">
              <ToolHint>Draw with mouse, pen or finger.</ToolHint>
              <Button type="button" variant="outline" size="sm" onClick={clearPad} disabled={!hasInk}>
                <Eraser className="size-3.5" aria-hidden="true" /> Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full name…"
              aria-label="Type your signature"
              className="h-9"
            />
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-white dark:bg-slate-900/60 h-[100px]">
              {typedPreview ? (
                <img src={typedPreview} alt="Typed signature preview" className="max-h-[88px]" />
              ) : (
                <ToolHint>The preview appears as you type.</ToolHint>
              )}
            </div>
          </div>
        )}
      </ToolStep>

      <ToolStep n={2} title="Placement">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow label="Page" htmlFor="sign-page">
            <Select
              value={String(safePage)}
              onValueChange={(v) => setPage(parseInt(v, 10) || 1)}
            >
              <SelectTrigger id="sign-page" className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <SelectItem key={p} value={String(p)} className="text-xs">
                    Page {p}
                    {pageCount > 0 ? ` of ${pageCount}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Position" htmlFor="sign-anchor">
            <Select value={anchor} onValueChange={(v) => setAnchor(v as SignatureAnchor)}>
              <SelectTrigger id="sign-anchor" className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGN_ANCHORS.map((a) => (
                  <SelectItem key={a.value} value={a.value} className="text-xs">
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
        <FieldRow label={`Width · ${widthPct}% of page`} htmlFor="sign-width">
          <Slider
            id="sign-width"
            value={[widthPct]}
            min={10}
            max={50}
            step={1}
            onValueChange={(vals) => setWidthPct(vals[0] ?? widthPct)}
          />
        </FieldRow>
        <FieldRow
          label={`Edge offset · ${offsetPct}% ${anchor.startsWith("top") ? "from top" : "from bottom"}`}
          htmlFor="sign-offset"
        >
          <Slider
            id="sign-offset"
            value={[offsetPct]}
            min={0}
            max={15}
            step={1}
            onValueChange={(vals) => setOffsetPct(vals[0] ?? offsetPct)}
          />
        </FieldRow>
        <ToolHint>
          The offset is the distance from the bottom edge — top positions use it from the top.
        </ToolHint>
      </ToolStep>

      <ToolStep n={3} title="Stamp it" last>
        <RunButton
          busy={busy}
          label="Sign & download"
          icon={SignatureIcon}
          onRun={() =>
            run(async (ctx) => {
              let pngBytes: Uint8Array;
              if (mode === "draw") {
                if (!hasInk || !canvasRef.current) {
                  throw new Error("Draw your signature in the pad first.");
                }
                pngBytes = dataUrlToBytes(canvasRef.current.toDataURL("image/png"));
              } else {
                const dataUrl = renderTypeSignature(typedName.trim());
                if (!dataUrl) throw new Error("Type your name to create the signature first.");
                pngBytes = dataUrlToBytes(dataUrl);
              }
              ctx.progress({ percent: 10, detail: "Embedding signature…" });
              return [
                await stampSignature(
                  file,
                  { pngBytes, page: safePage, anchor, widthPct, offsetPct },
                  ctx
                ),
              ];
            })
          }
        />
      </ToolStep>
    </div>
  );
}

/* =============================== page numbers =============================== */

const STAMP_POSITIONS: Array<{ value: StampPosition; label: string }> = [
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
];

const NUMBER_FORMATS: Array<{ value: PageNumberFormat; label: string }> = [
  { value: "n", label: "1" },
  { value: "n-of-n", label: "1 / N" },
  { value: "page-n-of-n", label: "Page 1 of N" },
];

function PageNumbersControls({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  const [format, setFormat] = useState<PageNumberFormat>("n-of-n");
  const [position, setPosition] = useState<StampPosition>("bottom-center");
  const [start, setStart] = useState("1");
  const [size, setSize] = useState("10");
  const [skipFirst, setSkipFirst] = useState(false);

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Number style">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow label="Format" htmlFor="pn-format">
            <Select value={format} onValueChange={(v) => setFormat(v as PageNumberFormat)}>
              <SelectTrigger id="pn-format" className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Start at" htmlFor="pn-start">
            <Input
              id="pn-start"
              type="number"
              min={1}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-8 text-xs"
            />
          </FieldRow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow label="Position" htmlFor="pn-position">
            <Select value={position} onValueChange={(v) => setPosition(v as StampPosition)}>
              <SelectTrigger id="pn-position" className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAMP_POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Size (pt)" htmlFor="pn-size">
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id="pn-size" className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["8", "9", "10", "11"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s} pt
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold">Skip the first page</p>
            <ToolHint>Covers usually have their own style — page 2 still shows 2.</ToolHint>
          </div>
          <Switch checked={skipFirst} onCheckedChange={setSkipFirst} aria-label="Skip the first page" />
        </div>
      </ToolStep>

      <ToolStep n={2} title="Stamp numbers" last>
        <RunButton
          busy={busy}
          label="Number pages & download"
          icon={Hash}
          onRun={() =>
            run(async (ctx) => [
              await addPageNumbers(
                file,
                {
                  format,
                  position,
                  start: Math.max(1, Math.floor(Number(start) || 1)),
                  size: Number(size) || 10,
                  skipFirst,
                },
                ctx
              ),
            ])
          }
        />
      </ToolStep>
    </div>
  );
}

/* ================================ watermark ================================= */

const WM_COLORS: Array<{ value: WatermarkColor; label: string }> = [
  { value: "slate", label: "Slate gray" },
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "emerald", label: "Emerald" },
];

function WatermarkControls({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [size, setSize] = useState(72);
  const [rotation, setRotation] = useState(45);
  const [opacity, setOpacity] = useState(14);
  const [color, setColor] = useState<WatermarkColor>("slate");
  const [tiling, setTiling] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState(30);
  const [imageOpacity, setImageOpacity] = useState(20);
  const [imagePosition, setImagePosition] = useState<"center" | "corners">("center");

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Watermark">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v === "image" ? "image" : "text")}
          className="grid grid-cols-2 gap-2"
        >
          <Label
            htmlFor="wm-mode-text"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold cursor-pointer ${
              mode === "text" ? "border-orange-400 bg-orange-500/5" : "border-border"
            }`}
          >
            <RadioGroupItem value="text" id="wm-mode-text" /> Text stamp
          </Label>
          <Label
            htmlFor="wm-mode-image"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold cursor-pointer ${
              mode === "image" ? "border-orange-400 bg-orange-500/5" : "border-border"
            }`}
          >
            <RadioGroupItem value="image" id="wm-mode-image" /> Image (logo)
          </Label>
        </RadioGroup>

        {mode === "text" ? (
          <div className="space-y-3">
            <FieldRow label="Text" htmlFor="wm-text">
              <Input
                id="wm-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="CONFIDENTIAL"
                className="h-9 font-mono uppercase"
              />
            </FieldRow>
            <FieldRow label={`Size · ${size} pt`} htmlFor="wm-size">
              <Slider
                id="wm-size"
                value={[size]}
                min={24}
                max={120}
                step={2}
                onValueChange={(vals) => setSize(vals[0] ?? size)}
              />
            </FieldRow>
            <FieldRow label={`Rotation · ${rotation}°`} htmlFor="wm-rotation">
              <Slider
                id="wm-rotation"
                value={[rotation]}
                min={0}
                max={90}
                step={5}
                onValueChange={(vals) => setRotation(vals[0] ?? rotation)}
              />
            </FieldRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Color" htmlFor="wm-color">
                <Select value={color} onValueChange={(v) => setColor(v as WatermarkColor)}>
                  <SelectTrigger id="wm-color" className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WM_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label={`Opacity · ${opacity}%`} htmlFor="wm-opacity">
                <Slider
                  id="wm-opacity"
                  value={[opacity]}
                  min={5}
                  max={60}
                  step={1}
                  onValueChange={(vals) => setOpacity(vals[0] ?? opacity)}
                />
              </FieldRow>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">Repeat diagonally</p>
                <ToolHint>Tiles the text across the whole page, offset row by row.</ToolHint>
              </div>
              <Switch checked={tiling} onCheckedChange={setTiling} aria-label="Repeat diagonally across the page" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <FieldRow label="Image" htmlFor="wm-image">
              <Input
                id="wm-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="h-9 text-xs font-mono file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
              />
            </FieldRow>
            <FieldRow label={`Scale · ${imageScale}% of page width`} htmlFor="wm-scale">
              <Slider
                id="wm-scale"
                value={[imageScale]}
                min={10}
                max={60}
                step={1}
                onValueChange={(vals) => setImageScale(vals[0] ?? imageScale)}
              />
            </FieldRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Position" htmlFor="wm-position">
                <Select
                  value={imagePosition}
                  onValueChange={(v) => setImagePosition(v === "corners" ? "corners" : "center")}
                >
                  <SelectTrigger id="wm-position" className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center" className="text-xs">Center</SelectItem>
                    <SelectItem value="corners" className="text-xs">All four corners</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label={`Opacity · ${imageOpacity}%`} htmlFor="wm-image-opacity">
                <Slider
                  id="wm-image-opacity"
                  value={[imageOpacity]}
                  min={5}
                  max={100}
                  step={1}
                  onValueChange={(vals) => setImageOpacity(vals[0] ?? imageOpacity)}
                />
              </FieldRow>
            </div>
          </div>
        )}
      </ToolStep>

      <ToolStep n={2} title="Apply" last>
        <RunButton
          busy={busy}
          label="Add watermark & download"
          icon={StampIcon}
          onRun={() =>
            run(async (ctx) => {
              if (mode === "text") {
                return [
                  await addWatermark(
                    file,
                    { mode: "text", text, size, rotation, opacityPct: opacity, color, tiling },
                    ctx
                  ),
                ];
              }
              if (!imageFile) {
                throw new Error("Choose an image to use as the watermark first.");
              }
              ctx.progress({ percent: 5, detail: "Reading watermark image…" });
              const imageBytes = await fileBytes(imageFile);
              return [
                await addWatermark(
                  file,
                  {
                    mode: "image",
                    imageBytes,
                    opacityPct: imageOpacity,
                    imageScalePct: imageScale,
                    imagePosition,
                  },
                  ctx
                ),
              ];
            })
          }
        />
        <ToolNote>
          Opacity works in every modern viewer. Re-save/flatten if a portal complains.
        </ToolNote>
      </ToolStep>
    </div>
  );
}

/* ============================== header & footer ============================= */

type HfSlotKey = "left" | "center" | "right";

function HeaderFooterControls({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  const [header, setHeader] = useState<Record<HfSlotKey, string>>({ left: "", center: "", right: "" });
  const [footer, setFooter] = useState<Record<HfSlotKey, string>>({ left: "", center: "", right: "" });
  const [size, setSize] = useState("9");

  const setSlot = (which: "header" | "footer", slot: HfSlotKey, v: string) => {
    const target = which === "header" ? header : footer;
    const next = { ...target, [slot]: v };
    if (which === "header") setHeader(next);
    else setFooter(next);
  };

  const slotInputs = (which: "header" | "footer") => {
    const data = which === "header" ? header : footer;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {(["left", "center", "right"] as HfSlotKey[]).map((slot) => (
          <FieldRow key={slot} label={slot} htmlFor={`hf-${which}-${slot}`}>
            <Input
              id={`hf-${which}-${slot}`}
              value={data[slot]}
              onChange={(e) => setSlot(which, slot, e.target.value)}
              placeholder={`${slot} text…`}
              className="h-8 text-xs"
            />
          </FieldRow>
        ))}
      </div>
    );
  };

  const hasAny =
    [...Object.values(header), ...Object.values(footer)].some((s) => s.trim().length > 0);

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="Header — top line">
        {slotInputs("header")}
      </ToolStep>

      <ToolStep n={2} title="Footer — bottom line">
        {slotInputs("footer")}
      </ToolStep>

      <ToolStep n={3} title="Style & run" last>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldRow label="Font size" htmlFor="hf-size">
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id="hf-size" className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["8", "9", "10"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s} pt
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <div className="flex items-end pb-1">
            <ToolHint>24pt margins · Helvetica</ToolHint>
          </div>
        </div>
        <RunButton
          busy={busy}
          label="Add header & footer"
          icon={PanelTop}
          disabled={!hasAny}
          onRun={() =>
            run(async (ctx) => [
              await addHeaderFooter(
                file,
                { header, footer, size: Number(size) || 9 },
                ctx
              ),
            ])
          }
        />
        {!hasAny && <ToolHint>Type at least one line above — any mix of slots works.</ToolHint>}
      </ToolStep>
    </div>
  );
}

/* ================================ the registry ============================== */

export const ANNOTATE_TOOLS: ToolDef[] = [
  {
    id: "fill-forms",
    name: "Fill PDF Forms",
    tagline: "Type into fillable fields and download a finished copy.",
    icon: PenLine,
    category: "annotate",
    io: { accept: ".pdf", hint: "Fillable PDF forms (AcroForm)" },
    Component: FillFormsControls,
  },
  {
    id: "sign",
    name: "Sign PDF",
    tagline: "Draw or type a signature and place it on the page.",
    icon: SignatureIcon,
    category: "annotate",
    io: { accept: ".pdf" },
    Component: SignControls,
  },
  {
    id: "page-numbers",
    name: "Add Page Numbers",
    tagline: "Stamp 1, 2, 3… wherever the rules say they belong.",
    icon: Hash,
    category: "annotate",
    io: { accept: ".pdf" },
    Component: PageNumbersControls,
    batchRun: (file, ctx) =>
      addPageNumbers(
        file,
        { format: "n-of-n", position: "bottom-center", start: 1, size: 10, skipFirst: false },
        ctx
      ).then((o) => [o]),
  },
  {
    id: "watermark",
    name: "Add Watermark",
    tagline: "Stamp CONFIDENTIAL (or anything) over every page.",
    icon: StampIcon,
    category: "annotate",
    io: { accept: ".pdf" },
    Component: WatermarkControls,
    batchRun: (file, ctx) =>
      addWatermark(
        file,
        { mode: "text", text: "CONFIDENTIAL", size: 72, rotation: 45, opacityPct: 14, color: "slate", tiling: true },
        ctx
      ).then((o) => [o]),
  },
  {
    id: "header-footer",
    name: "Header & Footer",
    tagline: "One line at the top, one at the bottom — on every page.",
    icon: PanelTop,
    category: "annotate",
    io: { accept: ".pdf" },
    Component: HeaderFooterControls,
  },
];
