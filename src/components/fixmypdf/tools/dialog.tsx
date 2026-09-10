"use client";

/**
 * ToolDialog — the shell every Tool Shed tool runs inside.
 *
 * Owns: file intake (via ToolFiles), progress + cancellation, the results
 * list (per-file download + zip-all), a before/after first-page preview and
 * the "memory cleared" honesty note. Tools only supply controls + a builder.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Download,
  FileDown,
  Loader2,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatBytes } from "@/lib/pdf/format";
import { renderOnePage } from "@/lib/pdf/tools/kit";
import type { RunCtx, ToolDef, ToolOutput, ToolProgress } from "@/lib/pdf/tools/types";
import { ToolFiles, ToolHint } from "./parts";

/* ----------------------------- before/after view ---------------------------- */

function BeforeAfter({ original, output }: { original?: File; output?: ToolOutput }) {
  const [pairs, setPairs] = useState<{ before?: string; after?: string }>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const before = original
          ? (await renderOnePage(new Uint8Array(await original.arrayBuffer()), 1, { dpi: 72 })).canvas.toDataURL("image/jpeg", 0.7)
          : undefined;
        let after: string | undefined;
        if (output && output.blob.type === "application/pdf") {
          const bytes = new Uint8Array(await output.blob.arrayBuffer());
          after = (await renderOnePage(bytes, 1, { dpi: 72 })).canvas.toDataURL("image/jpeg", 0.7);
        }
        if (alive) setPairs({ before, after });
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [original, output]);

  if (failed) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {(["before", "after"] as const).map((slot) => {
        const src = pairs[slot];
        return (
          <div key={slot} className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              {slot === "after" && <ArrowRightLeft className="size-3" aria-hidden="true" />}
              {slot === "before" ? "Before" : "After"}
            </p>
            <div className="aspect-[3/4] rounded-md bg-white dark:bg-slate-900/60 overflow-hidden flex items-center justify-center">
              {src ? (
                <img src={src} alt={`${slot} page preview`} className="w-full h-full object-contain" />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground truncate">
              {slot === "before"
                ? original
                  ? `${original.name} · ${formatBytes(original.size)}`
                  : "—"
                : output
                  ? `${output.name} · ${formatBytes(output.blob.size)}`
                  : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- the dialog -------------------------------- */

export interface ToolDialogProps {
  tool: ToolDef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolDialog({ tool, open, onOpenChange }: ToolDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<ToolProgress | null>(null);
  const [results, setResults] = useState<ToolOutput[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const busy = progress !== null;
  const minFiles = tool?.io.minFiles ?? 1;

  // Reset everything when the dialog closes (slightly delayed so a close →
  // "adjust" reopen doesn't flash), and IMMEDIATELY whenever a DIFFERENT tool
  // is opened — switching tools must never inherit the previous tool's files
  // or results (React's sanctioned adjust-state-during-render pattern).
  const [prevToolId, setPrevToolId] = useState<string | null>(null);
  if (tool && open && tool.id !== prevToolId) {
    setPrevToolId(tool.id);
    setFiles([]);
    setProgress(null);
    setResults(null);
    setError(null);
  }

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      const t = window.setTimeout(() => {
        setFiles([]);
        setProgress(null);
        setResults(null);
        setError(null);
        setPrevToolId(null);
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, [open, tool]);

  // Surface ToolFiles rejections as toasts.
  useEffect(() => {
    const onError = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) toast.error(detail);
    };
    window.addEventListener("fixmypdf:tool-files-error", onError);
    return () => window.removeEventListener("fixmypdf:tool-files-error", onError);
  }, []);

  const run = useCallback(
    async (build: (ctx: RunCtx) => Promise<ToolOutput[]>) => {
      if (!tool) return;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setError(null);
      setResults(null);
      setProgress({ percent: 2, detail: "Preparing…" });
      try {
        const outputs = await build({
          progress: (p) => setProgress(p),
          signal: ctrl.signal,
        });
        if (!outputs.length) throw new Error("The tool produced no output.");
        setResults(outputs);
        toast.success("Done — output ready below.", { description: `${outputs.length} file${outputs.length === 1 ? "" : "s"}` });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          toast.info("Cancelled — nothing was saved.");
        } else {
          const message = err instanceof Error && err.message ? err.message : "Something went wrong.";
          setError(message);
          toast.error(message);
        }
      } finally {
        abortRef.current = null;
        setProgress(null);
      }
    },
    [tool]
  );

  const runBatch = useCallback(() => {
    if (!tool?.batchRun) return;
    const queue = files;
    run(async (ctx) => {
      const outputs: ToolOutput[] = [];
      for (let i = 0; i < queue.length; i++) {
        const f = queue[i];
        ctx.progress({
          percent: Math.round((i / queue.length) * 100),
          detail: `File ${i + 1} of ${queue.length}: ${f.name}`,
        });
        const scoped: RunCtx = {
          signal: ctx.signal,
          progress: (p) =>
            ctx.progress({
              percent: Math.min(99, Math.round(((i + Math.max(0, p.percent) / 100) / queue.length) * 100)),
              detail: `${f.name} — ${p.detail ?? ""}`,
            }),
        };
        outputs.push(...(await tool.batchRun!(f, scoped)));
      }
      return outputs;
    });
  }, [files, run, tool]);

  const downloadOne = useCallback((o: ToolOutput) => {
    const url = URL.createObjectURL(o.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = o.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success("Download started", { description: o.name });
  }, []);

  const downloadZip = useCallback(async () => {
    if (!results || !tool) return;
    setZipping(true);
    try {
      const { zipOutputs, downloadOutput } = await import("@/lib/pdf/tools/kit");
      const bundle = await zipOutputs(results, `${tool.id}-fixmypdf.zip`);
      downloadOutput(bundle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the ZIP.");
    } finally {
      setZipping(false);
    }
  }, [results, tool]);

  if (!tool) return null;
  const Icon = tool.icon;
  const ToolComponent = tool.Component;
  const showBatch = !!tool.batchRun && files.length > 1;
  // Tools with a batch runner accept several files even when their normal
  // flow is single-file: >1 file automatically switches to batch mode.
  const effectiveIo = tool.batchRun && !tool.io.multiple
    ? { ...tool.io, multiple: true, maxFiles: tool.io.maxFiles ?? 20, hint: `${tool.io.hint ?? ""} · drop several to batch them`.trim() }
    : tool.io;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tool.name}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      <button
        aria-label="Close tool"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm cursor-default"
        onClick={() => {
          if (!busy) onOpenChange(false);
        }}
        tabIndex={-1}
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border shrink-0">
          <span className="size-9 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-tight truncate">{tool.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{tool.tagline}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Close"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-4">
            {/* stage: running */}
            {busy && (
              <div className="py-8 space-y-4 text-center" aria-live="polite">
                <Loader2 className="size-7 animate-spin text-orange-600 dark:text-orange-400 mx-auto" aria-hidden="true" />
                <div className="space-y-1.5">
                  <p className="text-sm font-bold font-mono">{progress?.detail ?? "Working…"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{progress?.percent ?? 0}% · 100% in your browser</p>
                </div>
                <Progress value={progress?.percent ?? 0} className="max-w-sm mx-auto" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* stage: results */}
            {!busy && results && (
              <div className="space-y-4" aria-live="polite">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                  <p className="text-sm font-bold font-mono">Output ready — nothing was uploaded</p>
                </div>
                <ul className="space-y-1.5 max-h-96 overflow-y-auto slim-scrollbar pr-1">
                  {results.map((o, i) => (
                    <li
                      key={`${o.name}-${i}`}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
                    >
                      <FileDown className="size-4 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono truncate" title={o.name}>{o.name}</p>
                        {o.meta && <p className="text-[11px] text-muted-foreground font-mono">{o.meta}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => downloadOne(o)}>
                        <Download className="size-3.5" aria-hidden="true" /> Get
                      </Button>
                    </li>
                  ))}
                </ul>
                {results.length > 1 && (
                  <Button variant="secondary" className="w-full" onClick={downloadZip} disabled={zipping}>
                    {zipping ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Package className="size-4" aria-hidden="true" />}
                    Download all as ZIP
                  </Button>
                )}
                {files.length === 1 && (
                  <BeforeAfter original={files[0]} output={results[0]} />
                )}
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setResults(null);
                      setError(null);
                    }}
                  >
                    Adjust settings & run again
                  </Button>
                  <Button className="flex-1" onClick={() => onOpenChange(false)}>
                    Done — clear memory
                  </Button>
                </div>
                <ToolHint>
                  Outputs live only in this browser tab&apos;s memory. &quot;Done&quot; releases them —
                  nothing is stored, uploaded or logged.
                </ToolHint>
              </div>
            )}

            {/* stage: pick/configure */}
            {!busy && !results && (
              <div className="space-y-4">
                <ToolFiles
                  io={effectiveIo}
                  files={files}
                  onChange={setFiles}
                  disabled={busy}
                />

                {error && (
                  <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2.5 leading-relaxed">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                    {error}
                  </p>
                )}

                {files.length >= minFiles && !showBatch && (
                  <>
                    <ToolComponent files={files} busy={busy} run={run} />
                  </>
                )}
                {showBatch && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <p className="text-xs font-bold font-mono uppercase tracking-wide">
                      Batch mode · {files.length} files
                    </p>
                    <ToolHint>
                      {files.length} files dropped — every file is processed with the
                      tool&apos;s default settings, one after another, and all outputs
                      land in one list for a single ZIP download. For per-file
                      control, run them one at a time.
                    </ToolHint>
                    <Button variant="secondary" className="w-full" onClick={runBatch} disabled={busy}>
                      <Package className="size-4" aria-hidden="true" />
                      Run batch on {files.length} files
                    </Button>
                  </div>
                )}
                {files.length > 0 && files.length < minFiles && (
                  <ToolHint>
                    This tool needs {minFiles} files — add {minFiles - files.length} more.
                  </ToolHint>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
