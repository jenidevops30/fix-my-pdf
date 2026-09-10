"use client";

/**
 * Shared building blocks for Tool Shed dialogs:
 *  - ToolFiles: dropzone + file chips (+ clipboard paste, drag & drop, click)
 *  - small labelled rows used by tool control panels
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FileText, Image as ImageIcon, Plus, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/pdf/format";
import type { ToolIO } from "@/lib/pdf/tools/types";

/* ------------------------------- accept match ------------------------------- */

export function acceptMatches(file: File, accept: string): boolean {
  if (!accept || accept === "*") return true;
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  for (const token of tokens) {
    if (token.startsWith(".")) {
      if (name.endsWith(token)) return true;
    } else if (token.endsWith("/*")) {
      if (type.startsWith(token.slice(0, -1))) return true;
    } else if (type === token) {
      return true;
    }
  }
  return false;
}

/* --------------------------------- ToolFiles -------------------------------- */

export interface ToolFilesProps {
  io: ToolIO;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** file kinds are only used for the empty-state icon */
  imageOnly?: boolean;
}

export function ToolFiles({ io, files, onChange, disabled, imageOnly }: ToolFilesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming || disabled) return;
      const list = Array.from(incoming);
      const max = io.maxFiles ?? (io.multiple ? 20 : 1);
      const accepted: File[] = [];
      const rejected: string[] = [];
      for (const f of list) {
        if (!acceptMatches(f, io.accept)) {
          rejected.push(f.name);
          continue;
        }
        if (accepted.length < max) accepted.push(f);
      }
      if (rejected.length) {
        const label = rejected.slice(0, 2).join(", ");
        window.dispatchEvent(
          new CustomEvent("fixmypdf:tool-files-error", {
            detail: `Unsupported file type: ${label}${rejected.length > 2 ? ` +${rejected.length - 2} more` : ""}`,
          })
        );
      }
      if (accepted.length) {
        const merged = io.multiple ? [...files, ...accepted].slice(0, max) : accepted.slice(0, 1);
        onChange(merged);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [disabled, files, io, onChange]
  );

  // Clipboard paste (screenshots → images-to-pdf, copied PDFs, etc.)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const pasted = Array.from(e.clipboardData?.files ?? []);
      if (pasted.length) {
        e.preventDefault();
        addFiles(pasted);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, disabled]);

  const Icon = imageOnly ? ImageIcon : FileText;

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept={io.accept}
        multiple={io.multiple}
        className="sr-only"
        aria-label="Choose files"
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        aria-label={files.length ? "Add files" : "Choose files"}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-7 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-ring ${
          dragOver
            ? "border-orange-500 bg-orange-500/5"
            : "border-border hover:border-orange-400/70 hover:bg-muted/60"
        }`}
      >
        <span className="size-10 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
          <UploadCloud className="size-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium">
          {files.length
            ? "Click to replace, drop more, or paste (Ctrl+V)"
            : "Click, drop files here, or paste (Ctrl+V)"}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {io.hint ?? (io.multiple ? "Multiple files supported" : "One file")}
        </span>
      </button>

      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Selected files">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}-${f.size}`}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <Icon className="size-4 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              <span className="text-xs font-mono truncate flex-1" title={f.name}>
                {f.name}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                {formatBytes(f.size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label={`Remove ${f.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
          {io.multiple && files.length < (io.maxFiles ?? 20) && !disabled && (
            <li>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => inputRef.current?.click()}
              >
                <Plus className="size-3.5" aria-hidden="true" /> Add more
              </Button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ small primitives ----------------------------- */

export function ToolStep({
  n,
  title,
  children,
  last,
}: {
  n: number;
  title: string;
  children?: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`space-y-3 ${last ? "" : "pb-1"}`}>
      <div className="flex items-center gap-2">
        <span
          className="size-5 rounded-full bg-primary text-primary-foreground font-mono text-[11px] flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {n}
        </span>
        <h4 className="text-sm font-bold font-mono uppercase tracking-wide">{title}</h4>
      </div>
      {children && <div className="pl-7 space-y-3">{children}</div>}
    </div>
  );
}

export function ToolHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>;
}

export function ToolNote({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "emerald" }) {
  const cls =
    tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <p className={`text-xs leading-relaxed rounded-lg border px-3 py-2 ${cls}`}>{children}</p>
  );
}

export { formatBytes };
