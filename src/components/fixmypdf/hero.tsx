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
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";
import type { Mode } from "./types";

const MODES: Array<{ id: Mode; labelKey: DictKey; icon: LucideIcon }> = [
  { id: "fit", labelKey: "mode_fit", icon: Shrink },
  { id: "keep", labelKey: "mode_keep", icon: Scissors },
  { id: "requirements", labelKey: "mode_requirements", icon: ClipboardList },
  { id: "blank", labelKey: "mode_blank", icon: Wand2 },
  { id: "remove", labelKey: "mode_remove", icon: Trash2 },
  { id: "find", labelKey: "mode_find", icon: TextSearch },
];

interface HeroProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function Hero({ mode, onModeChange }: HeroProps) {
  const { t } = useI18n();

  return (
    <section aria-label="FixMyPDF introduction" className="max-w-3xl mx-auto space-y-4 text-center">
      <Badge
        variant="outline"
        className="bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400 font-mono text-xs gap-1.5 px-3 py-1"
      >
        <Zap className="size-3.5 text-orange-600 dark:text-orange-400" aria-hidden="true" />
        {t("hero_badge")}
      </Badge>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
        {t("hero_title_1")} <br className="hidden sm:inline" />
        <span className="text-orange-600 dark:text-orange-400">{t("hero_title_2")}</span>
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("hero_sub")}</p>
      <div
        role="tablist"
        aria-label={t("hero_choose_aria")}
        className="pt-4 flex flex-wrap justify-center gap-2"
      >
        {MODES.map(({ id, labelKey, icon: Icon }) => {
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
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-muted-foreground/40 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4", active && "text-orange-400")} aria-hidden="true" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
