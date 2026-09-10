"use client";

import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";

const STEPS: Array<{ titleKey: DictKey; bodyKey: DictKey }> = [
  { titleKey: "how_1_title", bodyKey: "how_1_body" },
  { titleKey: "how_2_title", bodyKey: "how_2_body" },
  { titleKey: "how_3_title", bodyKey: "how_3_body" },
];

export function HowItWorks() {
  const { t } = useI18n();

  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="scroll-mt-20 bg-card rounded-2xl border border-border p-8 sm:p-10"
    >
      <h2 className="text-2xl font-bold">{t("how_heading")}</h2>
      <div className="grid sm:grid-cols-3 gap-6 mt-6">
        {STEPS.map((step, i) => (
          <div key={step.titleKey} className="space-y-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground font-mono text-sm flex items-center justify-center">
              {i + 1}
            </div>
            <h3 className="font-bold text-sm">{t(step.titleKey)}</h3>
            <p className="text-xs text-muted-foreground">{t(step.bodyKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
