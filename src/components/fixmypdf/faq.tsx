"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";

const FAQ_COUNT = 8;

export function Faq() {
  const { t } = useI18n();

  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      className="scroll-mt-20 max-w-3xl mx-auto space-y-5"
    >
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold">{t("faq_heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("faq_sub")}</p>
      </div>
      <Accordion type="single" collapsible className="bg-card border border-border rounded-2xl px-6">
        {Array.from({ length: FAQ_COUNT }, (_, i) => {
          const q = t(`faq_${i + 1}_q` as DictKey);
          const a = t(`faq_${i + 1}_a` as DictKey);
          return (
            <AccordionItem key={i} value={`faq-${i + 1}`} className="last:border-b-0">
              <AccordionTrigger className="text-sm font-bold text-left hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {a}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
