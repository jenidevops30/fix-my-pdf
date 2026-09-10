"use client";

/**
 * Tool Shed — "organize" group UI (merge / split / rotate / reorder / reverse /
 * insert blank / duplicate). Every tool renders ONLY controls + a run button;
 * the ToolDialog owns progress UI, cancellation, results and downloads.
 * All work is 100% client-side via @/lib/pdf/tools/organize.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Copy,
  FilePlus,
  GripVertical,
  Loader2,
  Merge,
  RotateCw,
  Scissors,
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
import { analyzeDocument } from "@/lib/pdf/engine";
import { parsePageSpec } from "@/lib/pdf/format";
import {
  chunkEveryN,
  duplicatePdfPages,
  ENCRYPTED_PDF_MESSAGE,
  insertBlankPage,
  isPermutation,
  mergePdfs,
  parseGroups,
  reorderPdfPages,
  reversePdfPages,
  rotatePages,
  splitPdf,
  type BlankPosition,
  type RotationAngle,
} from "@/lib/pdf/tools/organize";
import { loadPdf, throwIfAborted } from "@/lib/pdf/tools/kit";
import type { ToolComponentProps, ToolDef } from "@/lib/pdf/tools/types";
import { formatBytes, ToolHint, ToolNote, ToolStep } from "./parts";

/* ------------------------------- shared bits ------------------------------- */

function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

interface ProbeData {
  state: "loading" | "ready" | "error";
  pages: number;
  encrypted: boolean;
}

const PROBE_LOADING: ProbeData = { state: "loading", pages: 0, encrypted: false };

/** Lightweight pdf-lib pass that reports page count + encryption for hints. */
function usePdfProbe(file: File | undefined): ProbeData {
  const [store, setStore] = useState<{ key: string; data: ProbeData }>({
    key: "",
    data: PROBE_LOADING,
  });

  useEffect(() => {
    if (!file) return;
    const key = fileKey(file);
    let live = true;
    void (async () => {
      try {
        const doc = await loadPdf(file);
        if (!live) return;
        setStore({
          key,
          data: {
            state: doc.isEncrypted ? "error" : "ready",
            pages: doc.getPageCount(),
            encrypted: doc.isEncrypted,
          },
        });
      } catch {
        if (!live) return;
        setStore({ key, data: { state: "error", pages: 0, encrypted: false } });
      }
    })();
    return () => {
      live = false;
    };
  }, [file]);

  const key = file ? fileKey(file) : "";
  return store.key === key && key !== "" ? store.data : PROBE_LOADING;
}

/** Page count for run-time validation, reusing the probe when it is trustworthy. */
async function resolvePageCount(file: File, probe: ProbeData): Promise<number> {
  if (probe.state === "ready" && !probe.encrypted) return probe.pages;
  const doc = await loadPdf(file);
  if (doc.isEncrypted) throw new Error(ENCRYPTED_PDF_MESSAGE);
  return doc.getPageCount();
}

function ProbeRow({ probe }: { probe: ProbeData }) {
  if (probe.state === "loading") {
    return (
      <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Reading document…
      </p>
    );
  }
  if (probe.encrypted) return <ToolNote>{ENCRYPTED_PDF_MESSAGE}</ToolNote>;
  if (probe.state === "error") {
    return (
      <ToolNote>This file could not be read as a PDF — it may be corrupted.</ToolNote>
    );
  }
  return (
    <p className="font-mono text-xs text-muted-foreground">
      {probe.pages} page{probe.pages === 1 ? "" : "s"} detected
    </p>
  );
}

function RunButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button className="w-full" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}

/* --------------------------------- 1 · merge -------------------------------- */

function MergeTool({ files, busy, run }: ToolComponentProps) {
  const [order, setOrder] = useState<number[] | null>(null);

  const display = useMemo<number[]>(
    () =>
      order !== null && isPermutation(order, files.length)
        ? order
        : files.map((_, i) => i),
    [order, files]
  );
  const custom = order !== null && isPermutation(order, files.length);
  const orderedFiles = display.map((i) => files[i]);

  const move = (pos: number, delta: -1 | 1) => {
    const next = [...display];
    const to = pos + delta;
    if (to < 0 || to >= next.length) return;
    const tmp = next[pos];
    next[pos] = next[to];
    next[to] = tmp;
    setOrder(next);
  };

  const sortByName = () => {
    setOrder(
      [...display].sort((a, b) =>
        files[a].name.localeCompare(files[b].name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      )
    );
  };

  return (
    <div>
      <ToolStep n={1} title="Merge order" last>
        <p className="text-xs text-muted-foreground">
          Pages are stitched in the order below — the first row&apos;s pages come
          first in the merged PDF.
        </p>
        <ul className="space-y-1.5" aria-label="Merge order">
          {display.map((fileIdx, pos) => {
            const f = files[fileIdx];
            return (
              <li
                key={`${fileIdx}-${f.name}-${f.size}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5"
              >
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-600/10 font-mono text-[10px] font-bold text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                  aria-hidden="true"
                >
                  {pos + 1}
                </span>
                <span className="flex-1 truncate font-mono text-xs" title={f.name}>
                  {f.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {formatBytes(f.size)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  aria-label={`Move ${f.name} up`}
                  disabled={busy || pos === 0}
                  onClick={() => move(pos, -1)}
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  aria-label={`Move ${f.name} down`}
                  disabled={busy || pos === display.length - 1}
                  onClick={() => move(pos, 1)}
                >
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2">
          <ToolHint>
            {custom
              ? "Custom order — it resets if you add or remove files."
              : "Files merge in the order you added them."}
          </ToolHint>
          <Button variant="outline" size="sm" onClick={sortByName} disabled={busy}>
            <ArrowUpDown className="size-3.5" aria-hidden="true" /> Sort by name
          </Button>
        </div>
      </ToolStep>
      <RunButton
        label={`Merge ${files.length} PDFs`}
        disabled={busy}
        onClick={() => run(async (ctx) => [await mergePdfs(orderedFiles, ctx)])}
      />
    </div>
  );
}

/* --------------------------------- 2 · split -------------------------------- */

type SplitMode = "ranges" | "every-n" | "single";

const SPLIT_MODES: ReadonlyArray<{ value: SplitMode; title: string; desc: string }> = [
  { value: "ranges", title: "By ranges", desc: "“1-3, 4, 5-9” — each group becomes one PDF" },
  { value: "every-n", title: "Every N pages", desc: "Chunks of N pages, e.g. every 10 pages" },
  { value: "single", title: "One file per page", desc: "Every page becomes its own PDF" },
];

function SplitTool({ files, busy, run }: ToolComponentProps) {
  const file = files.length > 0 ? files[0] : undefined;
  const probe = usePdfProbe(file);
  const [mode, setMode] = useState<SplitMode>("ranges");
  const [spec, setSpec] = useState("");
  const [everyStr, setEveryStr] = useState("10");

  const pages = probe.state === "ready" && !probe.encrypted ? probe.pages : 0;
  const everyN = parseInt(everyStr, 10);
  const everyValid = Number.isInteger(everyN) && everyN >= 1 && everyN <= 500;

  const ranges = useMemo<{ count: number | null; error: string | null }>(() => {
    if (mode !== "ranges" || !spec.trim() || pages < 1) return { count: null, error: null };
    try {
      return { count: parseGroups(spec, pages).length, error: null };
    } catch (err) {
      return { count: null, error: err instanceof Error ? err.message : "Invalid page ranges." };
    }
  }, [mode, spec, pages]);

  const groupCount =
    pages > 0
      ? mode === "single"
        ? pages
        : mode === "every-n"
          ? everyValid
            ? Math.ceil(pages / everyN)
            : null
          : spec.trim()
            ? ranges.count
            : null
      : null;

  const onRun = () =>
    run(async (ctx) => {
      if (!file) throw new Error("Add a PDF first.");
      throwIfAborted(ctx.signal);
      const pageCount = await resolvePageCount(file, probe);
      let groups: number[][];
      if (mode === "single") {
        groups = Array.from({ length: pageCount }, (_, i) => [i + 1]);
      } else if (mode === "every-n") {
        if (!everyValid) throw new Error("Pages per file must be a whole number from 1 to 500.");
        groups = chunkEveryN(pageCount, everyN);
      } else {
        groups = parseGroups(spec, pageCount);
      }
      return splitPdf(file, groups, ctx, { singlePageNames: mode === "single" });
    });

  return (
    <div className="space-y-4">
      <ProbeRow probe={probe} />
      <ToolStep n={1} title="How should it be split?" last>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as SplitMode)}
          disabled={busy}
          className="gap-2"
        >
          {SPLIT_MODES.map((opt) => (
            <div
              key={opt.value}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                mode === opt.value ? "border-orange-500/60 bg-orange-500/5" : "border-border"
              }`}
            >
              <RadioGroupItem value={opt.value} id={`split-mode-${opt.value}`} className="mt-0.5" />
              <Label
                htmlFor={`split-mode-${opt.value}`}
                className="flex-1 cursor-pointer space-y-0.5 font-normal"
              >
                <span className="block text-sm font-medium">{opt.title}</span>
                <span className="block text-xs text-muted-foreground">{opt.desc}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {mode === "ranges" && (
          <div className="space-y-1.5">
            <Label htmlFor="split-ranges">Page groups</Label>
            <Input
              id="split-ranges"
              placeholder="1-3, 4, 5-9"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              disabled={busy}
              className="font-mono"
              autoComplete="off"
            />
            <ToolHint>Commas separate files — “1-3, 4, 5-9” creates three PDFs.</ToolHint>
            {ranges.error ? <ToolNote>{ranges.error}</ToolNote> : null}
          </div>
        )}

        {mode === "every-n" && (
          <div className="space-y-1.5">
            <Label htmlFor="split-every">Pages per file</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">every</span>
              <Input
                id="split-every"
                type="number"
                min={1}
                max={500}
                value={everyStr}
                onChange={(e) => setEveryStr(e.target.value)}
                disabled={busy}
                className="w-24 font-mono"
              />
              <span className="text-xs text-muted-foreground">pages</span>
            </div>
            {!everyValid ? (
              <ToolNote>Pages per file must be a whole number from 1 to 500.</ToolNote>
            ) : null}
          </div>
        )}

        {mode === "single" && (
          <ToolHint>
            Files are named after the original: document-page-001.pdf,
            document-page-002.pdf, …
          </ToolHint>
        )}

        {groupCount !== null && groupCount > 0 && (
          <ToolNote tone="emerald">
            This will create {groupCount} PDF{groupCount === 1 ? "" : "s"}.
          </ToolNote>
        )}
      </ToolStep>
      <RunButton
        label={
          groupCount
            ? `Split into ${groupCount} PDF${groupCount === 1 ? "" : "s"}`
            : "Split PDF"
        }
        disabled={busy || !!ranges.error}
        onClick={onRun}
      />
    </div>
  );
}

/* --------------------------------- 3 · rotate ------------------------------- */

function RotateTool({ files, busy, run }: ToolComponentProps) {
  const file = files.length > 0 ? files[0] : undefined;
  const probe = usePdfProbe(file);
  const [angleStr, setAngleStr] = useState<"90" | "180" | "270">("90");
  const [spec, setSpec] = useState("");

  const pages = probe.state === "ready" && !probe.encrypted ? probe.pages : 0;
  const specError = useMemo(() => {
    if (!spec.trim() || pages < 1) return null;
    try {
      parsePageSpec(spec, pages);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid page list.";
    }
  }, [spec, pages]);

  const onRun = () =>
    run(async (ctx) => {
      if (!file) throw new Error("Add a PDF first.");
      throwIfAborted(ctx.signal);
      const angle = parseInt(angleStr, 10) as RotationAngle;
      const pageCount = await resolvePageCount(file, probe);
      const targets = spec.trim() ? parsePageSpec(spec, pageCount) : null;
      return [await rotatePages(file, angle, targets, ctx)];
    });

  return (
    <div className="space-y-4">
      <ProbeRow probe={probe} />
      <ToolStep n={1} title="Rotation & pages" last>
        <div className="space-y-1.5">
          <Label htmlFor="rotate-angle">Turn</Label>
          <Select
            value={angleStr}
            onValueChange={(v) => setAngleStr(v as "90" | "180" | "270")}
            disabled={busy}
          >
            <SelectTrigger id="rotate-angle" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90° clockwise</SelectItem>
              <SelectItem value="180">180° — upside down</SelectItem>
              <SelectItem value="270">270° clockwise (90° counter-clockwise)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rotate-pages">Pages</Label>
          <Input
            id="rotate-pages"
            placeholder="All pages — or e.g. 1-3, 7"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            disabled={busy}
            className="font-mono"
            autoComplete="off"
          />
          <ToolHint>
            Leave blank to rotate the whole document. The turn stacks on top of any
            rotation a page already has.
          </ToolHint>
          {specError ? <ToolNote>{specError}</ToolNote> : null}
        </div>
      </ToolStep>
      <RunButton label={`Rotate ${angleStr}°`} disabled={busy || !!specError} onClick={onRun} />
    </div>
  );
}

/* --------------------------------- 4 · reorder ------------------------------ */

interface ReorderAnalysis {
  thumbs: string[];
  count: number;
}

function SortableThumb({
  page,
  src,
  position,
  disabled,
}: {
  page: number;
  src?: string;
  position: number;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Page ${page + 1}, now in position ${position + 1}. Drag to move it.`}
      className={`relative w-24 shrink-0 cursor-grab touch-manipulation select-none rounded-lg border bg-card p-1 text-left active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-orange-500 ${
        isDragging
          ? "z-10 border-orange-500 opacity-80 shadow-lg"
          : "border-border hover:border-orange-400/70"
      }`}
    >
      <span
        className="absolute -left-1.5 -top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 font-mono text-[10px] font-bold text-white dark:bg-orange-500"
        aria-hidden="true"
      >
        {page + 1}
      </span>
      <GripVertical
        className="absolute right-1.5 top-1.5 size-3 text-muted-foreground/60"
        aria-hidden="true"
      />
      <span className="block aspect-[3/4] w-full overflow-hidden rounded bg-white dark:bg-slate-900/60">
        {src ? (
          <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
        ) : (
          <Loader2
            className="h-full w-full animate-spin p-4 text-muted-foreground/40"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}

function ReorderTool({ files, busy, run }: ToolComponentProps) {
  const file = files.length > 0 ? files[0] : undefined;
  const [store, setStore] = useState<{ key: string; data: ReorderAnalysis } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [renderPct, setRenderPct] = useState<number | null>(null);
  const [order, setOrder] = useState<number[] | null>(null);
  const tokenRef = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Render one preview per page; a run token guards against stale setState
  // after the file changes or the dialog unmounts.
  useEffect(() => {
    if (!file) return;
    const key = fileKey(file);
    const token = ++tokenRef.current;
    void (async () => {
      try {
        const analysis = await analyzeDocument(file, (p) => {
          if (tokenRef.current === token) setRenderPct(p.percent);
        });
        if (tokenRef.current !== token) return;
        setStore({ key, data: { thumbs: analysis.thumbs, count: analysis.pageCount } });
        setRenderPct(null);
      } catch {
        if (tokenRef.current !== token) return;
        setFailedKey(key);
        setRenderPct(null);
      }
    })();
    return () => {
      tokenRef.current += 1;
    };
  }, [file]);

  const key = file ? fileKey(file) : "";
  const analysis = store && store.key === key ? store.data : null;
  const failed = !!file && failedKey === key;
  const count = analysis?.count ?? 0;
  const display = useMemo<number[]>(
    () =>
      order !== null && isPermutation(order, count)
        ? order
        : Array.from({ length: count }, (_, i) => i),
    [order, count]
  );
  const custom = order !== null && isPermutation(order, count);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = display.indexOf(Number(active.id));
    const to = display.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    setOrder(arrayMove(display, from, to));
  };

  return (
    <div className="space-y-4">
      <ToolStep n={1} title="New page order" last>
        {!analysis && !failed && (
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Rendering previews… {renderPct ?? 0}%
          </p>
        )}
        {failed && (
          <ToolNote>
            Previews could not be rendered — this PDF may be corrupted. Try another file.
          </ToolNote>
        )}
        {analysis && count <= 1 && (
          <ToolNote>Nothing to reorder — this PDF has a single page.</ToolNote>
        )}
        {analysis && count > 1 && (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={display} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-2.5" aria-label="Page thumbnails">
                  {display.map((page, pos) => (
                    <SortableThumb
                      key={page}
                      page={page}
                      src={analysis.thumbs[page] || undefined}
                      position={pos}
                      disabled={busy}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setOrder([...display].reverse())}
              >
                <ArrowLeftRight className="size-3.5" aria-hidden="true" /> Reverse order
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy || !custom}
                onClick={() => setOrder(null)}
              >
                Reset order
              </Button>
            </div>
            <ToolHint>
              The badge is the original page number. Drag any thumbnail into place —
              the PDF is rebuilt exactly in this order.
            </ToolHint>
          </>
        )}
      </ToolStep>
      <RunButton
        label={count > 1 ? `Reorder ${count} pages` : "Reorder pages"}
        disabled={busy || !analysis || count <= 1}
        onClick={() =>
          run(async (ctx) => {
            if (!file) throw new Error("Add a PDF first.");
            return [await reorderPdfPages(file, display, ctx)];
          })
        }
      />
    </div>
  );
}

/* --------------------------------- 5 · reverse ------------------------------ */

function ReverseTool({ files, busy, run }: ToolComponentProps) {
  const file = files.length > 0 ? files[0] : undefined;
  const probe = usePdfProbe(file);
  return (
    <div className="space-y-4">
      <ProbeRow probe={probe} />
      {probe.state === "ready" && !probe.encrypted && probe.pages <= 1 && (
        <ToolNote>
          This PDF has a single page — the output would be identical.
        </ToolNote>
      )}
      <ToolHint>
        The last page becomes the first, the first becomes the last — the whole
        document flips back-to-front. No settings needed.
      </ToolHint>
      <RunButton
        label="Reverse page order"
        disabled={busy}
        onClick={() =>
          run(async (ctx) => {
            if (!file) throw new Error("Add a PDF first.");
            return [await reversePdfPages(file, ctx)];
          })
        }
      />
    </div>
  );
}

/* ------------------------------ 6 · insert blank ---------------------------- */

type BlankPos = "start" | "end" | "after";

function InsertBlankTool({ files, busy, run }: ToolComponentProps) {
  const file = files.length > 0 ? files[0] : undefined;
  const probe = usePdfProbe(file);
  const [pos, setPos] = useState<BlankPos>("end");
  const [afterStr, setAfterStr] = useState("1");

  const pages = probe.state === "ready" && !probe.encrypted ? probe.pages : 0;
  const after = parseInt(afterStr, 10);
  const afterValid = Number.isInteger(after) && after >= 1 && (pages < 2 || after <= pages - 1);

  const onRun = () =>
    run(async (ctx) => {
      if (!file) throw new Error("Add a PDF first.");
      throwIfAborted(ctx.signal);
      const pageCount = await resolvePageCount(file, probe);
      if (pos === "after") {
        if (pageCount <= 1) {
          throw new Error("This PDF has a single page — insert at the start or end instead.");
        }
        if (!Number.isInteger(after) || after < 1 || after > pageCount - 1) {
          throw new Error(`“After page” must be between 1 and ${pageCount - 1}.`);
        }
      }
      const position: BlankPosition =
        pos === "start" ? { at: "start" } : pos === "end" ? { at: "end" } : { at: "after", page: after };
      return [await insertBlankPage(file, position, ctx)];
    });

  const label =
    pos === "start"
      ? "Insert blank page at the start"
      : pos === "end"
        ? "Insert blank page at the end"
        : afterValid
          ? `Insert blank page after page ${after}`
          : "Insert blank page";

  return (
    <div className="space-y-4">
      <ProbeRow probe={probe} />
      <ToolStep n={1} title="Where should the blank page go?" last>
        <div className="space-y-1.5">
          <Label htmlFor="blank-position">Position</Label>
          <Select
            value={pos}
            onValueChange={(v) => setPos(v as BlankPos)}
            disabled={busy}
          >
            <SelectTrigger id="blank-position" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">At the start — new page 1</SelectItem>
              <SelectItem value="end">At the end — after the last page</SelectItem>
              <SelectItem value="after">After a specific page…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {pos === "after" && (
          <div className="space-y-1.5">
            <Label htmlFor="blank-after">After page</Label>
            <Input
              id="blank-after"
              type="number"
              min={1}
              max={pages > 1 ? pages - 1 : undefined}
              value={afterStr}
              onChange={(e) => setAfterStr(e.target.value)}
              disabled={busy}
              className="w-24 font-mono"
            />
            {pages > 1 && (
              <ToolHint>Can be 1–{pages - 1} for this document.</ToolHint>
            )}
            {pages === 1 && (
              <ToolNote>
                This PDF has a single page — insert at the start or end instead.
              </ToolNote>
            )}
            {pages > 1 && !afterValid && (
              <ToolNote>“After page” must be between 1 and {pages - 1}.</ToolNote>
            )}
          </div>
        )}
        <ToolHint>
          The blank page matches the size of the current first page, so the
          document stays uniform.
        </ToolHint>
      </ToolStep>
      <RunButton
        label={label}
        disabled={busy || (pos === "after" && pages > 1 && !afterValid)}
        onClick={onRun}
      />
    </div>
  );
}

/* ------------------------------- 7 · duplicate ------------------------------ */

function DuplicateTool({ files, busy, run }: ToolComponentProps) {
  const file = files.length > 0 ? files[0] : undefined;
  const probe = usePdfProbe(file);
  const [spec, setSpec] = useState("");
  const [timesStr, setTimesStr] = useState("1");

  const pages = probe.state === "ready" && !probe.encrypted ? probe.pages : 0;
  const times = parseInt(timesStr, 10);
  const timesValid = Number.isInteger(times) && times >= 1 && times <= 10;

  const parsed = useMemo<{ pages: number[] | null; error: string | null }>(() => {
    if (!spec.trim() || pages < 1) return { pages: null, error: null };
    try {
      return { pages: parsePageSpec(spec, pages), error: null };
    } catch (err) {
      return { pages: null, error: err instanceof Error ? err.message : "Invalid page list." };
    }
  }, [spec, pages]);

  const selectedCount = parsed.pages ? parsed.pages.length : pages;
  const resultPages = timesValid && pages > 0 ? pages + selectedCount * times : null;

  const onRun = () =>
    run(async (ctx) => {
      if (!file) throw new Error("Add a PDF first.");
      throwIfAborted(ctx.signal);
      if (!timesValid) throw new Error("Copies must be a whole number from 1 to 10.");
      const pageCount = await resolvePageCount(file, probe);
      const targets = spec.trim() ? parsePageSpec(spec, pageCount) : null;
      return [await duplicatePdfPages(file, targets, times, ctx)];
    });

  return (
    <div className="space-y-4">
      <ProbeRow probe={probe} />
      <ToolStep n={1} title="Pages & copies" last>
        <div className="space-y-1.5">
          <Label htmlFor="duplicate-pages">Pages to duplicate</Label>
          <Input
            id="duplicate-pages"
            placeholder="All pages — or e.g. 1-3, 7"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            disabled={busy}
            className="font-mono"
            autoComplete="off"
          />
          <ToolHint>
            Leave blank to duplicate every page. Copies land directly after each
            original, which stays in place.
          </ToolHint>
          {parsed.error ? <ToolNote>{parsed.error}</ToolNote> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duplicate-times">Copies after each page</Label>
          <Input
            id="duplicate-times"
            type="number"
            min={1}
            max={10}
            value={timesStr}
            onChange={(e) => setTimesStr(e.target.value)}
            disabled={busy}
            className="w-24 font-mono"
          />
          {!timesValid ? (
            <ToolNote>Copies must be a whole number from 1 to 10.</ToolNote>
          ) : null}
        </div>
        {resultPages !== null && (
          <ToolNote tone="emerald">
            Output will have {resultPages} page{resultPages === 1 ? "" : "s"}
            {spec.trim() ? "" : " (every page gets a copy)"}
            {times > 1 ? ` ×${times}` : ""}.
          </ToolNote>
        )}
      </ToolStep>
      <RunButton
        label={timesValid && times > 1 ? `Duplicate pages ×${times}` : "Duplicate pages"}
        disabled={busy || !!parsed.error || !timesValid}
        onClick={onRun}
      />
    </div>
  );
}

/* --------------------------------- registry --------------------------------- */

export const ORGANIZE_TOOLS: ToolDef[] = [
  {
    id: "merge",
    name: "Merge PDFs",
    tagline: "Stitch several PDFs into one, in the order you choose.",
    icon: Merge,
    category: "organize",
    io: {
      accept: ".pdf",
      multiple: true,
      minFiles: 2,
      maxFiles: 20,
      hint: "Drop 2+ PDFs — they merge in the order shown",
    },
    Component: MergeTool,
  },
  {
    id: "split",
    name: "Split PDF",
    tagline: "Cut one PDF into several — by ranges, every N pages, or one file per page.",
    icon: Scissors,
    category: "organize",
    io: { accept: ".pdf" },
    Component: SplitTool,
  },
  {
    id: "rotate",
    name: "Rotate Pages",
    tagline: "Turn pages the right way up — all of them or just some.",
    icon: RotateCw,
    category: "organize",
    io: { accept: ".pdf" },
    Component: RotateTool,
    batchRun: async (file, ctx) => [await rotatePages(file, 90, null, ctx)],
  },
  {
    id: "reorder",
    name: "Reorder Pages",
    tagline: "Drag page thumbnails into any new order.",
    icon: ArrowUpDown,
    category: "organize",
    io: { accept: ".pdf" },
    Component: ReorderTool,
  },
  {
    id: "reverse",
    name: "Reverse Page Order",
    tagline: "Flip the whole document back-to-front.",
    icon: ArrowLeftRight,
    category: "organize",
    io: { accept: ".pdf" },
    Component: ReverseTool,
    batchRun: async (file, ctx) => [await reversePdfPages(file, ctx)],
  },
  {
    id: "insert-blank",
    name: "Insert Blank Page",
    tagline: "Drop an empty page anywhere — separators, signing pages, spacers.",
    icon: FilePlus,
    category: "organize",
    io: { accept: ".pdf" },
    Component: InsertBlankTool,
    batchRun: async (file, ctx) => [await insertBlankPage(file, { at: "end" }, ctx)],
  },
  {
    id: "duplicate",
    name: "Duplicate Pages",
    tagline: "Clone pages — repeat a form, template or checklist.",
    icon: Copy,
    category: "organize",
    io: { accept: ".pdf" },
    Component: DuplicateTool,
  },
];
