"use client";

import { BadgeCheck, Check, HeartHandshake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";

const FREE_FEATURES: DictKey[] = ["price_free_f1", "price_free_f2", "price_free_f3", "price_free_f4"];
const PRO_FEATURES: DictKey[] = ["price_pro_f1", "price_pro_f2", "price_pro_f3", "price_pro_f4"];

export function Pricing({ onUseNow }: { onUseNow: () => void }) {
  const { t } = useI18n();

  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="scroll-mt-20 max-w-3xl mx-auto space-y-5"
    >
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold">{t("price_heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("price_sub")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Free — the actual product */}
        <Card className="p-6 gap-4 border-emerald-500/40">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base flex items-center gap-2">
              <BadgeCheck className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t("price_free_name")}
            </span>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 font-mono text-[10px] px-2 py-1 rounded-full">
              live today
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold">{t("price_free_price")}</span>
            <span className="text-xs text-muted-foreground font-mono">{t("price_free_period")}</span>
          </div>
          <ul className="space-y-2">
            {FREE_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={onUseNow}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            {t("price_free_cta")}
          </Button>
        </Card>

        {/* Pro — honest coming-soon */}
        <Card className="p-6 gap-4 opacity-95">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base flex items-center gap-2">
              <Sparkles className="size-5 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              {t("price_pro_name")}
            </span>
            <span className="bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 font-mono text-[10px] px-2 py-1 rounded-full">
              {t("price_pro_soon")}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold">{t("price_pro_price")}</span>
            <span className="text-xs text-muted-foreground font-mono">{t("price_pro_period")}</span>
          </div>
          <ul className="space-y-2">
            {PRO_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            asChild
            className="w-full h-11 font-bold"
          >
            <a href="mailto:hello@fixmypdf.app?subject=FixMyPDF%20Pro%20waitlist">
              <HeartHandshake aria-hidden="true" />
              {t("price_pro_cta")}
            </a>
          </Button>
          <p className="text-[11px] font-mono text-muted-foreground/70 text-center">
            {t("price_pro_note")}
          </p>
        </Card>
      </div>
    </section>
  );
}
