"use client";

import { DraftingCompass } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <DraftingCompass className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg whitespace-nowrap">FixMyPDF</span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono truncate max-w-[180px]">
              {t("nav_tagline")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 md:gap-4 shrink-0">
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono bg-muted border border-border rounded-full px-3 py-1.5 text-muted-foreground whitespace-nowrap">
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            {t("nav_trust")}
          </div>
          <nav className="hidden md:flex items-center gap-3" aria-label="Page sections">
            <a
              href="#tools"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              All tools
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav_how")}
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav_faq")}
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav_pricing")}
            </a>
          </nav>
          <LanguageSwitcher />
          <ThemeToggle />
          <div
            className="size-8 rounded-full bg-muted border border-border hidden sm:flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0"
            aria-hidden="true"
          >
            wasm
          </div>
        </div>
      </div>
    </header>
  );
}
