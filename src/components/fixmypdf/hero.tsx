"use client";

import {
  ClipboardList,
  Scissors,
  Shrink,
  TextSearch,
  Trash2,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Mode } from "./types";

const MODES: Array<{ id: Mode; label: string; icon: LucideIcon }> = [
  { id: "fit", label: "Make It Fit (Target Limit)", icon: Shrink },
  { id: "keep", label: "Keep Specific Pages", icon: Scissors },
  { id: "requirements", label: "“The website says...”", icon: ClipboardList },
  { id: "blank", label: "Remove Blank Pages", icon: Wand2 },
  { id: "remove", label: "Remove Pages", icon: Trash2 },
  { id: "find", label: "Find Pages With a Word", icon: TextSearch },
];

interface HeroProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function Hero({ mode, onModeChange }: HeroProps) {
  return (
    <section aria-label="FixMyPDF introduction" className="max-w-3xl mx-auto space-y-4 text-center">
      <Badge
        variant="outline"
        className="bg-orange-50 border-orange-200/60 text-orange-700 font-mono text-xs gap-1.5 px-3 py-1"
      >
        <Zap className="size-3.5 text-orange-600" aria-hidden="true" />
        Deterministic Portal Triage
      </Badge>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
        Your PDF is wrong. <br className="hidden sm:inline" />
        We’ll fix it.
      </h1>
      <p className="text-lg text-slate-600 max-w-2xl mx-auto">
        No complicated toolboxes. Tell us the hard upload limit or the pages you need, and our
        browser engine safely resizes and trims it — nothing is ever uploaded.
      </p>
      <div
        role="tablist"
        aria-label="Choose a fix"
        className="pt-4 flex flex-wrap justify-center gap-2"
      >
        {MODES.map(({ id, label, icon: Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onModeChange(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              <Icon className={cn("size-4", active && "text-orange-400")} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
