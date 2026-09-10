"use client";

import { useI18n } from "@/lib/i18n/context";
import { LegalDialogs } from "./legal-dialogs";

interface FooterProps {
  /** Successful downloads on this device — lives in localStorage, never a server. */
  fixCount: number;
}

export function Footer({ fixCount }: FooterProps) {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-card py-4 mt-auto">
      <div className="max-w-5xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-2.5 text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {t("foot_ready")}
        </span>
        <span className="flex items-center flex-wrap justify-center gap-x-2 gap-y-1">
          <span>{t("foot_tagline")}</span>
          <span aria-hidden="true">·</span>
          <LegalDialogs />
        </span>
        <span className="flex items-center flex-wrap justify-center gap-x-2 gap-y-1">
          {fixCount > 0 && (
            <>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {fixCount === 1
                  ? t("foot_fixed_on_device_one", { n: fixCount })
                  : t("foot_fixed_on_device", { n: fixCount })}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="text-muted-foreground/70">{t("foot_engine")}</span>
        </span>
      </div>
    </footer>
  );
}
