"use client";

import { ClipboardList, Scissors, Wand2, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";
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
        "p-6 gap-4 cursor-pointer transition-all hover:border-muted-foreground/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        active && "border-orange-500/70 bg-orange-500/10"
      )}
    >
      <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="size-5 text-foreground/80" aria-hidden="true" />
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs text-muted-foreground">{body}</p>
      {children}
      <Button
        asChild
        className="w-full bg-muted hover:bg-accent text-foreground text-xs font-bold pointer-events-none mt-auto"
        tabIndex={-1}
      >
        <span>{cta}</span>
      </Button>
    </Card>
  );
}

export function SecondaryCards({ mode, onModeChange }: SecondaryCardsProps) {
  const { t } = useI18n();

  const pick = (m: Mode) => {
    onModeChange(m);
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section aria-label="Other surgical solutions" className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t("sec_heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("sec_sub")}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <ModeCard
          id="keep"
          active={mode === "keep"}
          icon={Scissors}
          title={t("sec_keep_title")}
          body={t("sec_keep_body")}
          cta={t("sec_keep_cta")}
          onPick={pick}
        >
          <div className="bg-muted/50 border border-border rounded-lg p-3 font-mono text-xs space-y-1">
            <span className="block text-[10px] uppercase text-muted-foreground/80">
              {t("sec_keep_preview_label")}
            </span>
            <span className="block font-bold">3, 7, 12, 14-16</span>
          </div>
        </ModeCard>

        <ModeCard
          id="requirements"
          active={mode === "requirements"}
          icon={ClipboardList}
          title={t("sec_req_title")}
          body={t("sec_req_body")}
          cta={t("sec_req_cta")}
          onPick={pick}
        >
          <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
            <p className="italic text-[11px] text-muted-foreground line-clamp-2">
              Upload must be PDF, strictly under 2 MB, max 4 pages.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent font-mono text-[10px]">
                ≤ 2.0 MB
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent font-mono text-[10px]">
                ≤ 4 Pages
              </Badge>
            </div>
          </div>
        </ModeCard>

        <ModeCard
          id="blank"
          active={mode === "blank"}
          icon={Wand2}
          title={t("sec_blank_title")}
          body={t("sec_blank_body")}
          cta={t("sec_blank_cta")}
          onPick={pick}
        >
          <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-1">
            <span className="block text-xs font-bold text-orange-600 dark:text-orange-400">
              {t("sec_blank_found")}
            </span>
            <span className="block font-mono text-[10px] text-muted-foreground">
              {t("sec_blank_cut")}
            </span>
          </div>
        </ModeCard>
      </div>
    </section>
  );
}
