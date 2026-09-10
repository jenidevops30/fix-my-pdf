/**
 * i18n configuration for FixMyPDF.
 * Everything is client-side: locale lives in localStorage, never a database.
 */

export type Locale = "en" | "hi" | "es" | "fr" | "de" | "pt" | "zh";

export interface LocaleMeta {
  code: Locale;
  /** Endonym shown in the switcher ("Deutsch", "हिन्दी", …). */
  nativeLabel: string;
  /** Short code for compact display. */
  shortLabel: string;
}

export const LOCALES: LocaleMeta[] = [
  { code: "en", nativeLabel: "English", shortLabel: "EN" },
  { code: "hi", nativeLabel: "हिन्दी", shortLabel: "HI" },
  { code: "es", nativeLabel: "Español", shortLabel: "ES" },
  { code: "fr", nativeLabel: "Français", shortLabel: "FR" },
  { code: "de", nativeLabel: "Deutsch", shortLabel: "DE" },
  { code: "pt", nativeLabel: "Português", shortLabel: "PT" },
  { code: "zh", nativeLabel: "中文", shortLabel: "ZH" },
];

export const DEFAULT_LOCALE: Locale = "en";
export const STORAGE_KEY = "fixmypdf:locale";

export function isLocale(value: string): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

/** Read the saved locale, then fall back to the browser's preferred languages. SSR-safe. */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isLocale(saved)) return saved;
  } catch {
    /* storage blocked — ignore */
  }
  const candidates = typeof navigator !== "undefined" ? navigator.languages ?? [] : [];
  for (const cand of candidates) {
    const base = cand.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
