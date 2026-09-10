"use client";

import type { BasicInfo } from "@/lib/pdf/engine";
import { FileBar } from "./file-bar";
import { BlankMode } from "./modes/blank-mode";
import { FindMode } from "./modes/find-mode";
import { FitMode } from "./modes/fit-mode";
import { KeepMode } from "./modes/keep-mode";
import { RemoveMode } from "./modes/remove-mode";
import { RequirementsMode } from "./modes/requirements-mode";
import { ResultPanel } from "./result-panel";
import { UploadZone } from "./upload-zone";
import type { AnalysisState, JobResult, Mode, WorkspaceCallbacks } from "./types";

interface WorkspaceProps {
  file: File | null;
  info: BasicInfo | null;
  mode: Mode;
  result: JobResult;
  analysis: AnalysisState;
  callbacks: WorkspaceCallbacks;
}

export function Workspace({ file, info, mode, result, analysis, callbacks }: WorkspaceProps) {
  const working = result.kind === "working";

  return (
    <section
      id="workspace"
      aria-label="Fix workspace"
      className="scroll-mt-24 bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-10"
    >
      {!file || !info ? (
        <UploadZone onFileSelected={callbacks.onFileSelected} />
      ) : (
        <>
          <FileBar file={file} info={info} onClearFile={callbacks.onClearFile} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 items-start">
            <div aria-label="Fix controls" className="min-w-0">
              {mode === "fit" && <FitMode working={working} onRun={callbacks.runFit} />}
              {mode === "requirements" && (
                <RequirementsMode working={working} onRun={callbacks.runRequirements} />
              )}
              {mode === "keep" && (
                <KeepMode
                  file={file}
                  info={info}
                  analysis={analysis}
                  working={working}
                  ensureAnalysis={callbacks.ensureAnalysis}
                  onExtract={callbacks.runExtract}
                />
              )}
              {mode === "blank" && (
                <BlankMode
                  file={file}
                  info={info}
                  analysis={analysis}
                  working={working}
                  ensureAnalysis={callbacks.ensureAnalysis}
                  onRemove={callbacks.runRemove}
                />
              )}
              {mode === "remove" && (
                <RemoveMode
                  info={info}
                  analysis={analysis}
                  working={working}
                  ensureAnalysis={callbacks.ensureAnalysis}
                  onRemove={callbacks.runRemove}
                />
              )}
              {mode === "find" && (
                <FindMode
                  file={file}
                  working={working}
                  onSearch={callbacks.search}
                  onExtract={callbacks.runExtract}
                />
              )}
            </div>
            <ResultPanel result={result} mode={mode} onReset={callbacks.onResetResult} />
          </div>
        </>
      )}
    </section>
  );
}
