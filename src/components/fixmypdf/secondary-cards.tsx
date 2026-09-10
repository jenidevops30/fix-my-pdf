"use client";

import { ClipboardList, Scissors, Wand2, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Mode } from "./types";

interface SecondaryCardsProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

interface ModeCardProps {
  id: Mode;
  active: boolean;
  icon: LucideIcon;
  title: string;
  body: string;
  cta: string;
  onPick: (mode: Mode) => void;
  children?: React.ReactNode;
}

function ModeCard({ id, active, icon: Icon, title, body, cta, onPick, children }: ModeCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={() => onPick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(id);
        }
      }}
      className={cn(
        "p-6 gap-4 cursor-pointer transition-all hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        active && "border-orange-400 bg-orange-50/30"
      )}
    >
      <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="size-5 text-slate-700" aria-hidden="true" />
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs text-slate-500">{body}</p>
      {children}
      <Button
        asChild
        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold pointer-events-none mt-auto"
        tabIndex={-1}
      >
        <span>{cta}</span>
      </Button>
    </Card>
  );
}

export function SecondaryCards({ mode, onModeChange }: SecondaryCardsProps) {
  const pick = (m: Mode) => {
    onModeChange(m);
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section aria-label="Other surgical solutions" className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Other Surgical Solutions</h2>
        <p className="text-sm text-slate-600">
          Pick the exact fix you need — no settings maze.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <ModeCard
          id="keep"
          active={mode === "keep"}
          icon={Scissors}
          title="“I only need certain pages”"
          body="Extract signature pages or tax tables with a visual page picker."
          cta="Open Page Picker →"
          onPick={pick}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs space-y-1">
            <span className="block text-[10px] uppercase text-slate-400">Selected pages:</span>
            <span className="block font-bold">3, 7, 12, 14-16</span>
          </div>
        </ModeCard>

        <ModeCard
          id="requirements"
          active={mode === "requirements"}
          icon={ClipboardList}
          title="“The website says...”"
          body="Paste portal instructions; we detect size and page limits locally."
          cta="Paste The Rules →"
          onPick={pick}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="italic text-[11px] text-slate-600 line-clamp-2">
              Upload must be PDF, strictly under 2 MB, max 4 pages.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-emerald-100 text-emerald-800 border-transparent font-mono text-[10px]">
                ≤ 2.0 MB
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 border-transparent font-mono text-[10px]">
                ≤ 4 Pages
              </Badge>
            </div>
          </div>
        </ModeCard>

        <ModeCard
          id="blank"
          active={mode === "blank"}
          icon={Wand2}
          title="Excise Blank Pages"
          body="Detect empty scanner feeder pages with ink-density analysis."
          cta="Scan For Blanks →"
          onPick={pick}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
            <span className="block text-xs font-bold text-orange-600">6 blanks found</span>
            <span className="block font-mono text-[10px] text-slate-500">
              Pages 4, 9, 11, 18, 22, 30 will be cut
            </span>
          </div>
        </ModeCard>
      </div>
    </section>
  );
}
