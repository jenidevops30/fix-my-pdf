/**
 * Shared types for the FixMyPDF UI.
 * The PDF engine itself lives in @/lib/pdf/engine — the UI never re-implements it.
 */
import type {
  EngineProgress,
  FitResult,
  PageAnalysis,
  TextSearchOutcome,
} from "@/lib/pdf/engine";

export type Mode = "fit" | "keep" | "requirements" | "blank" | "remove" | "find";

export type JobResult =
  | { kind: "idle" }
  | { kind: "working"; phase: string; percent: number; detail?: string }
  | {
      kind: "fit";
      result: FitResult;
      contextLabel: string;
      /** Size limit used, when the requirement included one (drives the "Too Large" label). */
      targetBytes?: number;
    }
  | {
      kind: "pages";
      blob: Blob;
      filename: string;
      pagesOut: number;
      action: "extract" | "remove" | "blank";
      headline: string;
      bullets: string[];
    }
  | { kind: "error"; message: string };

export type AnalysisState = {
  status: "idle" | "running" | "done";
  data?: PageAnalysis;
  progress?: EngineProgress;
};

export interface FitRunOptions {
  targetBytes: number;
  grayscale: boolean;
  stripMetadata: boolean;
}

export interface RequirementsRunOptions {
  maxBytes?: number;
  maxPages?: number;
  grayscale: boolean;
  stripMetadata: boolean;
}

export interface RemoveOptions {
  action?: "remove" | "blank";
  headline?: string;
  bullets?: string[];
}

export type SearchProgress = (p: EngineProgress) => void;

export interface WorkspaceCallbacks {
  onModeChange: (mode: Mode) => void;
  onFileSelected: (file: File) => void;
  onClearFile: () => void;
  runFit: (opts: FitRunOptions) => void;
  runRequirements: (opts: RequirementsRunOptions) => void;
  runExtract: (pages: number[]) => void;
  runRemove: (pages: number[], opts?: RemoveOptions) => void;
  search: (query: string, onProgress?: SearchProgress) => Promise<TextSearchOutcome>;
  ensureAnalysis: () => void;
  onResetResult: () => void;
}
