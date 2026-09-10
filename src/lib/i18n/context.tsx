"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, STORAGE_KEY, detectLocale, isLocale, type Locale } from "./config";
import { en, type Dict, type DictKey } from "./dictionaries/en";

type DictVars = Record<string, string | number>;

/**
 * Locales are code-split: only the active dictionary is fetched, and EN is
 * always inlined as the instant fallback while a translation loads.
 */
const dictCache = new Map<Locale, Dict>();

async function loadDict(locale: Locale): Promise<Dict> {
  if (locale === DEFAULT_LOCALE) return en;
  const cached = dictCache.get(locale);
  if (cached) return cached;
  // Locale files export a named const matching the locale code (hi, es, …).
  const mod = (await import(`./dictionaries/${locale}`)) as Record<string, unknown>;
  const dict = (mod[locale] ?? en) as Dict;
  dictCache.set(locale, dict);
  return dict;
}

function interpolate(template: string, vars?: DictVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a key with optional {placeholder} interpolation. Falls back to English. */
  t: (key: DictKey, vars?: DictVars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start from English for a hydration-stable first paint, then adopt the
  // saved/browser locale right after mount (same pattern as next-themes).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Dict>(en);

  // Adopt persisted / browser locale on mount (deferred via rAF: the sync
  // first paint must match the server-rendered English markup).
  useEffect(() => {
    const preferred = detectLocale();
    if (preferred === DEFAULT_LOCALE) return;
    const raf = requestAnimationFrame(() => setLocaleState(preferred));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keep <html lang> in sync for screen readers + search engines.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Load the dictionary for the active locale (EN is bundled, others are lazy).
  // setDict runs inside promise callbacks, never synchronously.
  useEffect(() => {
    let cancelled = false;
    loadDict(locale)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(en); // translation missing/broken → English fallback
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — session-only locale */
    }
  }, []);

  const t = useCallback<I18nContextValue["t"]>(
    (key, vars) => interpolate(dict[key] ?? en[key] ?? String(key), vars),
    [dict]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export { isLocale };
