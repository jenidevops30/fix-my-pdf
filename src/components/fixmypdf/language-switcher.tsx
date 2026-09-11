"use client";

import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  // NOTE: this Select must render the same tree on the server and the client
  // first pass. A mounted-guard placeholder here silently shifts Radix's
  // React useId positions, which breaks hydration for EVERY later id-based
  // component (FAQ accordion aria-controls etc.). The i18n provider starts on
  // English on both passes and adopts the saved locale right after mount —
  // same hydration-safe pattern as next-themes — so no guard is needed.
  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as typeof locale)}>
      <SelectTrigger
        size="sm"
        aria-label={t("nav_language")}
        className="h-9 w-[104px] gap-1.5 pl-2.5 font-mono text-xs"
      >
        <Globe className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l.code} value={l.code} className="font-mono text-xs">
            {l.nativeLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
