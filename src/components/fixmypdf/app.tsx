"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { baseName, downloadBlob, formatBytes, pagesToCompactSpec } from "@/lib/pdf/format";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";
import { Faq } from "./faq";
import { Footer } from "./footer";
import { Header } from "./header";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { Pricing } from "./pricing";
import { PrivacyRibbon } from "./privacy-ribbon";
import { PwaRegister } from "./pwa-register";
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
const FIX_COUNT_KEY = "fixmypdf:fix-count";
const AUTO_DOWNLOAD_KEY = "fixmypdf:auto-download";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function readLocalInt(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function readLocalBool(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * Counts cross-origin resource entries that appeared after `before` —
 * the honest, live proof that a fix makes zero external network requests.
 */
function countExternalRequestsSince(before: Set<string>): number {
  let external = 0;
  for (const entry of performance.getEntriesByType("resource")) {
    if (before.has(entry.name)) continue;
    try {
      if (new URL(entry.name).hostname !== window.location.hostname) external += 1;
    } catch {
      /* unparsable entry — ignore */
    }
  }
  return external;
}

function FixMyPdfAppInner() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<BasicInfo | null>(null);
  const [mode, setMode] = useState<Mode>("fit");
  const [result, setResult] = useState<JobResult>({ kind: "idle" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [externalRequests, setExternalRequests] = useState<number | null>(null);
  const [fixCount, setFixCount] = useState(0);
  const [autoDownload, setAutoDownloadState] = useState(false);
  const [successNonce, setSuccessNonce] = useState(0);

  // Analysis lifecycle guards: which file the cache belongs to, its status, and
  // a run token that lets in-flight passes be invalidated when the file changes.
  const analysisFileRef = useRef<File | null>(null);
  const analysisStatusRef = useRef<"idle" | "running" | "done">("idle");
  const analysisRunRef = useRef(0);

  // Zero-upload proof + local prefs
  const networkSnapshotRef = useRef<Set<string>>(new Set());
  const autoDownloadedRef = useRef<JobResult>({ kind: "idle" });

  /* ----------------------------- local prefs ------------------------------ */

  // Read device-local preferences after first paint (rAF callback keeps the
  // hydration-stable first render identical to the server output).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setFixCount(readLocalInt(FIX_COUNT_KEY));
      setAutoDownloadState(readLocalBool(AUTO_DOWNLOAD_KEY));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const setAutoDownload = useCallback((value: boolean) => {
    setAutoDownloadState(value);
    try {
      window.localStorage.setItem(AUTO_DOWNLOAD_KEY, value ? "1" : "0");
    } catch {
      /* storage blocked — session-only preference */
    }
  }, []);

  /* ------------------------------ download -------------------------------- */

  const handleDownload = useCallback(
    (blob: Blob, filename: string) => {
      downloadBlob(blob, filename);
      toast.success(t("result_download_started"), { description: filename });
      setFixCount((prev) => {
        const next = prev + 1;
        try {
          window.localStorage.setItem(FIX_COUNT_KEY, String(next));
        } catch {
          /* storage blocked */
        }
        return next;
      });
    },
    [t]
  );

  /* --------------------------- zero-upload proof --------------------------- */

  const beginNetworkWatch = useCallback(() => {
    networkSnapshotRef.current = new Set(
      performance.getEntriesByType("resource").map((e) => e.name)
    );
  }, []);

  const endNetworkWatch = useCallback(() => {
    setExternalRequests(countExternalRequestsSince(networkSnapshotRef.current));
  }, []);

  /* ------------------------------- file intake ----------------------------- */

  const onFileSelected = useCallback(
    async (f: File) => {
      const isPdf =
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error(t("toast_not_pdf"), { description: t("toast_not_pdf_desc") });
        return;
      }
      if (f.size > LARGE_FILE_BYTES) {
        toast.warning(t("toast_big"), { description: t("toast_big_desc") });
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
        toast.error(errorMessage(err, t("toast_read_fail")));
      }
    },
    [t]
  );

  const onClearFile = useCallback(() => {
    analysisRunRef.current += 1;
    analysisFileRef.current = null;
    analysisStatusRef.current = "idle";
    setFile(null);
    setInfo(null);
    setResult({ kind: "idle" });
    setAnalysis({ status: "idle" });
  }, []);

  /* -------------------------- shared thumbnail pass ------------------------ */

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
        toast.error(errorMessage(err, t("toast_analyze_fail")));
      });
  }, [file, t]);

  /* --------------------------------- runners ------------------------------- */

  const runFit = useCallback(
    async (opts: FitRunOptions) => {
      if (!file) return;
      setResult({ kind: "working", phase: "Preparing", percent: 0 });
      beginNetworkWatch();
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
          contextLabel: t("ctx_fit", { size: formatBytes(opts.targetBytes) }),
          targetBytes: opts.targetBytes,
        });
      } catch (err) {
        const message = errorMessage(err, t("toast_fit_fail"));
        setResult({ kind: "error", message });
        toast.error(message);
      } finally {
        endNetworkWatch();
      }
    },
    [file, t, beginNetworkWatch, endNetworkWatch]
  );

  const runRequirements = useCallback(
    async (opts: RequirementsRunOptions) => {
      if (!file) return;
      setResult({ kind: "working", phase: "Preparing", percent: 0 });
      beginNetworkWatch();
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
          contextLabel: t("ctx_requirements"),
          targetBytes: opts.maxBytes,
        });
      } catch (err) {
        const message = errorMessage(err, t("toast_req_fail"));
        setResult({ kind: "error", message });
        toast.error(message);
      } finally {
        endNetworkWatch();
      }
    },
    [file, t, beginNetworkWatch, endNetworkWatch]
  );

  const runExtract = useCallback(
    async (pages: number[]) => {
      if (!file || !info) return;
      setResult({ kind: "working", phase: "Cutting pages", percent: 10 });
      beginNetworkWatch();
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
          headline: t("keep_cta", { n: pages.length }),
          bullets: [
            `Source: ${baseName(file.name)}.pdf (${info.pageCount} pages)`,
            `Kept: ${pagesToCompactSpec(pages)}`,
          ],
        });
      } catch (err) {
        const message = errorMessage(err, t("toast_extract_fail"));
        setResult({ kind: "error", message });
        toast.error(message);
      } finally {
        endNetworkWatch();
      }
    },
    [file, info, t, beginNetworkWatch, endNetworkWatch]
  );

  const runRemove = useCallback(
    async (pages: number[], opts?: RemoveOptions) => {
      if (!file || !info) return;
      setResult({ kind: "working", phase: "Removing pages", percent: 10 });
      beginNetworkWatch();
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
          headline: opts?.headline ?? t("remove_cta", { n: pages.length }),
          bullets:
            opts?.bullets ?? [
              `Source: ${baseName(file.name)}.pdf`,
              `Removed: ${pagesToCompactSpec(pages)}`,
              `Remaining: ${info.pageCount - pages.length} pages`,
            ],
        });
      } catch (err) {
        const message = errorMessage(err, t("toast_remove_fail"));
        setResult({ kind: "error", message });
        toast.error(message);
      } finally {
        endNetworkWatch();
      }
    },
    [file, info, t, beginNetworkWatch, endNetworkWatch]
  );

  const search = useCallback(
    (query: string, onProgress?: SearchProgress): Promise<TextSearchOutcome> => {
      if (!file) return Promise.reject(new Error("Select a PDF first."));
      return findPagesWithText(file, query, onProgress);
    },
    [file]
  );

  const onResetResult = useCallback(() => setResult({ kind: "idle" }), []);

  /* ------------------------- celebrate + auto-download --------------------- */

  // Confetti: adjust state during render when the result changes (React's
  // sanctioned derived-state pattern — no cascading effect renders).
  const [celebrated, setCelebrated] = useState<JobResult>({ kind: "idle" });
  const resultIsSuccess =
    (result.kind === "fit" && result.result.success) || result.kind === "pages";
  if (result !== celebrated) {
    setCelebrated(result);
    if (resultIsSuccess) setSuccessNonce((n) => n + 1);
  }

  // Auto-download: a genuine side effect, runs once per successful result.
  useEffect(() => {
    if (!autoDownload || !resultIsSuccess) return;
    if (autoDownloadedRef.current === result) return; // this result already downloaded
    autoDownloadedRef.current = result;
    if (result.kind === "fit") handleDownload(result.result.blob, result.result.filename);
    else handleDownload(result.blob, result.filename);
  }, [result, resultIsSuccess, autoDownload, handleDownload]);

  /* ---------------------------- keyboard shortcuts ------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[role='dialog']")) return; // Radix dialogs handle their own keys
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Enter") {
        // Only assist when focus is on plain content or a text input —
        // focused buttons/links/role=button elements fire natively.
        const interactive =
          tag === "BUTTON" ||
          tag === "A" ||
          target?.getAttribute("role") === "button";
        if (interactive) return;
        const primary = document.querySelector<HTMLButtonElement>(
          "#workspace [data-primary-cta]:not([disabled])"
        );
        if (primary) {
          e.preventDefault();
          primary.click();
        }
      } else if (e.key === "Escape") {
        if (result.kind === "fit" || result.kind === "pages" || result.kind === "error") {
          onResetResult();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result.kind, onResetResult]);

  /* --------------------------------- render -------------------------------- */

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

  const scrollToWorkspace = useCallback(() => {
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="w-full max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-12">
        <Hero mode={mode} onModeChange={setMode} />
        <Workspace
          file={file}
          info={info}
          mode={mode}
          result={result}
          analysis={analysis}
          successNonce={successNonce}
          autoDownload={autoDownload}
          onAutoDownloadChange={setAutoDownload}
          onDownload={handleDownload}
          callbacks={callbacks}
        />
        <SecondaryCards mode={mode} onModeChange={setMode} />
        <HowItWorks />
        <Faq />
        <Pricing onUseNow={scrollToWorkspace} />
        <PrivacyRibbon externalRequests={externalRequests} />
      </main>
      <Footer fixCount={fixCount} />
      <PwaRegister />
    </div>
  );
}

export function FixMyPdfApp() {
  return (
    <I18nProvider>
      <FixMyPdfAppInner />
    </I18nProvider>
  );
}
