"use client";

import { DraftingCompass } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <DraftingCompass className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-lg">FixMyPDF</span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono truncate">
              Targeted PDF Surgery
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-muted border border-border rounded-full px-3 py-1.5 text-muted-foreground">
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            100% in-browser WebAssembly • Zero server uploads
          </div>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <ThemeToggle />
          <div
            className="size-8 rounded-full bg-muted border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0"
            aria-hidden="true"
          >
            wasm
          </div>
        </div>
      </div>
    </header>
  );
}
