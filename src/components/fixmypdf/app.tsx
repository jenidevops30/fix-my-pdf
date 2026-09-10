"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  analyzeDocument,
  applyRequirements,
  extractPagesToFile,
  findPagesWithText,
  getBasicInfo,
  makeItFit,
  removePagesFromFile,
  type BasicInfo,
  type EngineProgress,
  type TextSearchOutcome,
} from "@/lib/pdf/engine";
import { baseName, formatBytes, pagesToCompactSpec } from "@/lib/pdf/format";
import { Footer } from "./footer";
import { Header } from "./header";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { PrivacyRibbon } from "./privacy-ribbon";
import { SecondaryCards } from "./secondary-cards";
import { Workspace } from "./workspace";
import type {
  AnalysisState,
  FitRunOptions,
  JobResult,
  Mode,
  RemoveOptions,
  RequirementsRunOptions,
  SearchProgress,
  WorkspaceCallbacks,
} from "./types";

const LARGE_FILE_BYTES = 200 * 1024 * 1024;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function FixMyPdfApp() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<BasicInfo | null>(null);
  const [mode, setMode] = useState<Mode>("fit");
  const [result, setResult] = useState<JobResult>({ kind: "idle" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });

  // Analysis lifecycle guards: which file the cache belongs to, its status, and
  // a run token that lets in-flight passes be invalidated when the file changes.
  const analysisFileRef = useRef<File | null>(null);
  const analysisStatusRef = useRef<"idle" | "running" | "done">("idle");
  const analysisRunRef = useRef(0);

  /* ------------------------------- file intake ------------------------------ */

  const onFileSelected = useCallback(async (f: File) => {
    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("That is not a PDF", {
        description: "FixMyPDF only handles .pdf files — pick the right one.",
      });
      return;
    }
    if (f.size > LARGE_FILE_BYTES) {
      toast.warning("Big file detected", {
        description: "Files over 200 MB can take a while to process in the browser — hang tight.",
      });
    }
    try {
      const basic = await getBasicInfo(f);
      analysisRunRef.current += 1; // invalidate any in-flight analysis for the old file
      analysisFileRef.current = f;
      analysisStatusRef.current = "idle";
      setFile(f);
      setInfo(basic);
      setResult({ kind: "idle" });
      setAnalysis({ status: "idle" });
    } catch (err) {
      toast.error(errorMessage(err, "Could not read that file as a PDF."));
    }
  }, []);

  const onClearFile = useCallback(() => {
    analysisRunRef.current += 1;
    analysisFileRef.current = null;
    analysisStatusRef.current = "idle";
    setFile(null);
    setInfo(null);
    setResult({ kind: "idle" });
    setAnalysis({ status: "idle" });
  }, []);

  /* -------------------------- shared thumbnail pass ------------------------- */

  const ensureAnalysis = useCallback(() => {
    const f = file;
    if (!f) return;
    if (analysisFileRef.current !== f) {
      analysisFileRef.current = f;
      analysisStatusRef.current = "idle";
      setAnalysis({ status: "idle" });
    }
    if (analysisStatusRef.current !== "idle") return; // already running or done for this file
    const runId = ++analysisRunRef.current;
    analysisStatusRef.current = "running";
    setAnalysis({ status: "running" });
    analyzeDocument(f, (p: EngineProgress) => {
      if (analysisRunRef.current === runId) {
        setAnalysis({ status: "running", progress: p });
      }
    })
      .then((data) => {
        if (analysisRunRef.current !== runId) return; // stale pass for a previous file
        analysisStatusRef.current = "done";
        setAnalysis({ status: "done", data });
      })
      .catch((err: unknown) => {
        if (analysisRunRef.current !== runId) return;
        analysisStatusRef.current = "idle";
        analysisFileRef.current = null; // allow a retry
        setAnalysis({ status: "idle" });
        toast.error(errorMessage(err, "Could not analyze this document."));
      });
  }, [file]);

  /* --------------------------------- runners -------------------------------- */

  const runFit = useCallback(
    async (opts: FitRunOptions) => {
      if (!file) return;
      setResult({ kind: "working", phase: "Preparing", percent: 0 });
      try {
        const res = await makeItFit(file, {
          targetBytes: opts.targetBytes,
          grayscale: opts.grayscale,
          stripMetadata: opts.stripMetadata,
          onProgress: (p) =>
            setResult({ kind: "working", phase: p.phase, percent: p.percent, detail: p.detail }),
        });
        setResult({
          kind: "fit",
          result: res,
          contextLabel: `Make It Fit · ≤ ${formatBytes(opts.targetBytes)}`,
          targetBytes: opts.targetBytes,
        });
      } catch (err) {
        const message = errorMessage(err, "Something went wrong while shrinking the file.");
        setResult({ kind: "error", message });
        toast.error(message);
      }
    },
    [file]
  );

  const runRequirements = useCallback(
    async (opts: RequirementsRunOptions) => {
      if (!file) return;
      setResult({ kind: "working", phase: "Preparing", percent: 0 });
      try {
        const res = await applyRequirements(
          file,
          { maxBytes: opts.maxBytes, maxPages: opts.maxPages },
          {
            grayscale: opts.grayscale,
            stripMetadata: opts.stripMetadata,
            onProgress: (p) =>
              setResult({ kind: "working", phase: p.phase, percent: p.percent, detail: p.detail }),
          }
        );
        setResult({
          kind: "fit",
          result: res,
          contextLabel: "Portal Requirements",
          targetBytes: opts.maxBytes,
        });
      } catch (err) {
        const message = errorMessage(err, "Could not satisfy those requirements.");
        setResult({ kind: "error", message });
        toast.error(message);
      }
    },
    [file]
  );

  const runExtract = useCallback(
    async (pages: number[]) => {
      if (!file || !info) return;
      setResult({ kind: "working", phase: "Cutting pages", percent: 10 });
      try {
        const res = await extractPagesToFile(file, pages, (p) =>
          setResult({ kind: "working", phase: p.phase, percent: p.percent, detail: p.detail })
        );
        setResult({
          kind: "pages",
          blob: res.blob,
          filename: res.filename,
          pagesOut: res.pagesOut,
          action: "extract",
          headline: `Extracted ${pages.length} pages`,
          bullets: [
            `Source: ${baseName(file.name)}.pdf (${info.pageCount} pages)`,
            `Kept: ${pagesToCompactSpec(pages)}`,
          ],
        });
      } catch (err) {
        const message = errorMessage(err, "Could not extract those pages.");
        setResult({ kind: "error", message });
        toast.error(message);
      }
    },
    [file, info]
  );

  const runRemove = useCallback(
    async (pages: number[], opts?: RemoveOptions) => {
      if (!file || !info) return;
      setResult({ kind: "working", phase: "Removing pages", percent: 10 });
      try {
        const res = await removePagesFromFile(file, pages, (p) =>
          setResult({ kind: "working", phase: p.phase, percent: p.percent, detail: p.detail })
        );
        setResult({
          kind: "pages",
          blob: res.blob,
          filename: res.filename,
          pagesOut: res.pagesOut,
          action: opts?.action ?? "remove",
          headline: opts?.headline ?? `Removed ${pages.length} pages`,
          bullets:
            opts?.bullets ?? [
              `Source: ${baseName(file.name)}.pdf`,
              `Removed: ${pagesToCompactSpec(pages)}`,
              `Remaining: ${info.pageCount - pages.length} pages`,
            ],
        });
      } catch (err) {
        const message = errorMessage(err, "Could not remove those pages.");
        setResult({ kind: "error", message });
        toast.error(message);
      }
    },
    [file, info]
  );

  const search = useCallback(
    (query: string, onProgress?: SearchProgress): Promise<TextSearchOutcome> => {
      if (!file) return Promise.reject(new Error("Select a PDF first."));
      return findPagesWithText(file, query, onProgress);
    },
    [file]
  );

  const onResetResult = useCallback(() => setResult({ kind: "idle" }), []);

  const callbacks: WorkspaceCallbacks = {
    onModeChange: setMode,
    onFileSelected,
    onClearFile,
    runFit,
    runRequirements,
    runExtract,
    runRemove,
    search,
    ensureAnalysis,
    onResetResult,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faff] text-slate-900">
      <Header />
      <main className="w-full max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-12">
        <Hero mode={mode} onModeChange={setMode} />
        <Workspace
          file={file}
          info={info}
          mode={mode}
          result={result}
          analysis={analysis}
          callbacks={callbacks}
        />
        <SecondaryCards mode={mode} onModeChange={setMode} />
        <HowItWorks />
        <PrivacyRibbon />
      </main>
      <Footer />
    </div>
  );
}
