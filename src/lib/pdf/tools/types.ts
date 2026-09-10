/**
 * FixMyPDF "Tool Shed" contracts.
 *
 * Every tool in the shed is a self-contained, 100% client-side operation:
 *  - the dialog owns file intake, progress UI, cancellation and results;
 *  - the tool owns controls + a `build(ctx)` closure that returns outputs.
 *
 * No tool may touch a network or storage beyond device-local localStorage.
 */
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface ToolProgress {
  percent: number; // 0..100
  detail?: string;
}

export interface RunCtx {
  /** Report progress to the dialog (throttle to ~every page/step). */
  progress: (p: ToolProgress) => void;
  /** Cooperative cancellation — check `throwIfAborted(ctx.signal)` in loops. */
  signal: AbortSignal;
}

export interface ToolOutput {
  name: string;
  blob: Blob;
  /** Short human line, e.g. "12 pages · 4.8 MB". */
  meta?: string;
}

export interface ToolIO {
  /** input accept attribute, e.g. ".pdf" or ".pdf,image/*" */
  accept: string;
  multiple?: boolean;
  /** default 1 */
  minFiles?: number;
  maxFiles?: number;
  /** small hint under the dropzone, e.g. "Drop 2+ PDFs to combine" */
  hint?: string;
}

export interface ToolComponentProps {
  files: File[];
  busy: boolean;
  /** Fire a build; the dialog owns progress UI, cancellation and results. */
  run: (build: (ctx: RunCtx) => Promise<ToolOutput[]>) => void;
}

export type ToolCategory =
  | "organize"
  | "convert"
  | "optimize"
  | "secure"
  | "repair"
  | "annotate"
  | "smart";

export interface ToolDef {
  id: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  category: ToolCategory;
  io: ToolIO;
  Component: ComponentType<ToolComponentProps>;
  /**
   * Optional single-file run with sane defaults, used by batch mode when the
   * user drops several files. Tools with interactive controls may omit it.
   */
  batchRun?: (file: File, ctx: RunCtx) => Promise<ToolOutput[]>;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  "organize",
  "convert",
  "optimize",
  "secure",
  "repair",
  "annotate",
  "smart",
];
