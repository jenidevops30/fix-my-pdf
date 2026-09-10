"use client";

import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface PrivacyRibbonProps {
  /**
   * Cross-origin requests observed during the most recent fix.
   * `null` = no fix has been run in this session yet.
   */
  externalRequests: number | null;
}

export function PrivacyRibbon({ externalRequests }: PrivacyRibbonProps) {
  const { t } = useI18n();

  const requestsStrong =
    externalRequests === null
      ? t("priv_requests_idle")
      : externalRequests === 0
        ? t("priv_requests_strong_zero")
        : t("priv_requests_strong_n", { n: externalRequests });
  const requestsTone =
    externalRequests !== null && externalRequests > 0
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground font-semibold";

  return (
    <section
      aria-label="Privacy promise"
      className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-bold">{t("priv_title")}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{t("priv_body")}</p>
        </div>
      </div>
      <div className="flex items-center gap-5 font-mono text-xs text-muted-foreground shrink-0">
        <span>
          <strong className="text-foreground font-semibold">{t("priv_delay_strong")}</strong>{" "}
          {t("priv_delay_label")}
        </span>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <span>
          <strong className="text-foreground font-semibold">{t("priv_logged_strong")}</strong>{" "}
          {t("priv_logged_label")}
        </span>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <span
          title={t("priv_requests_tooltip")}
          className="flex items-center gap-1.5 cursor-help"
          role="status"
          aria-live="polite"
        >
          {externalRequests !== null && externalRequests === 0 && (
            <span
              className="relative flex size-2 shrink-0"
              aria-hidden="true"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
          )}
          <strong className={requestsTone}>{requestsStrong}</strong>{" "}
          <span className="max-w-[90px] sm:max-w-none">{t("priv_requests_label")}</span>
        </span>
      </div>
    </section>
  );
}
