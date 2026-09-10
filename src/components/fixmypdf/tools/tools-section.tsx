"use client";

/**
 * The Tool Shed — every FixMyPDF operation, searchable and grouped.
 * Single-page: each tool opens in an in-page dialog. Nothing ever uploads.
 */
import { useEffect, useMemo, useState } from "react";
import { Search, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TOOL_CATEGORIES, type ToolCategory, type ToolDef } from "@/lib/pdf/tools/types";
import { CATEGORY_LABELS, TOOLS } from "./tools-registry";
import { ToolDialog } from "./dialog";

export function ToolsSection() {
  const [active, setActive] = useState<ToolDef | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"all" | ToolCategory>("all");

  // Smart tools (e.g. Auto-Prescribe) can hand over to another tool,
  // or send the user back to the flagship Make-It-Fit workspace.
  useEffect(() => {
    const onOpenTool = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; target?: string }>).detail ?? {};
      if (detail.target === "workspace") {
        setActive(null);
        document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const next = detail.id ? TOOLS.find((t) => t.id === detail.id) : undefined;
      if (next) setActive(next);
    };
    window.addEventListener("fixmypdf:open-tool", onOpenTool);
    return () => window.removeEventListener("fixmypdf:open-tool", onOpenTool);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.id.includes(q)
      );
    });
  }, [query, cat]);

  return (
    <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24">
      <div className="space-y-1.5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
          The Tool Shed
        </p>
        <h2 id="tools-heading" className="text-2xl md:text-3xl font-bold">
          49 fixes. One click each. Zero uploads.
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Everything runs inside this browser tab with WebAssembly — your files never
          touch a server. Pick a problem, drop a file, get the fixed output. (The
          flagship fixes — size limits, blank pages, page keep/remove/find — live in
          the workspace above.)
        </p>
      </div>

      {/* search + categories */}
      <div className="mt-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools — merge, split, watermark, OCR…"
            aria-label="Search tools"
            className="pl-9 font-mono text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCat("all")}
            aria-pressed={cat === "all"}
            className={`rounded-full px-3 py-1.5 text-xs font-mono border transition-colors ${
              cat === "all"
                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                : "border-border text-muted-foreground hover:text-foreground hover:border-orange-400/60"
            }`}
          >
            All · {TOOLS.length}
          </button>
          {TOOL_CATEGORIES.map((c) => {
            const n = TOOLS.filter((t) => t.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={`rounded-full px-3 py-1.5 text-xs font-mono border transition-colors ${
                  cat === c
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-orange-400/60"
                }`}
              >
                {CATEGORY_LABELS[c]} · {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* grid */}
      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="All tools">
        {filtered.map((tool) => {
          const Icon = tool.icon;
          return (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => setActive(tool)}
                aria-haspopup="dialog"
                className="group w-full h-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-orange-400/70 hover:shadow-md hover:shadow-orange-500/5 focus-visible:outline-2 focus-visible:outline-ring flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="size-9 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center transition-transform group-hover:scale-105">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
                    {CATEGORY_LABELS[tool.category]}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold leading-tight">{tool.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.tagline}</p>
                </div>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="col-span-full">
            <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
              <Wrench className="size-6 text-muted-foreground mx-auto" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                No tool matches “{query}”. Try “pages”, “size”, “sign” or “scan”.
              </p>
            </div>
          </li>
        )}
      </ul>

      <ToolDialog tool={active} open={!!active} onOpenChange={(o) => !o && setActive(null)} />
    </section>
  );
}
