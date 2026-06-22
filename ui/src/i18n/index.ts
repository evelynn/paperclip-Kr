import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, Trans, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales } from "./locales";

const LOCALE_STORAGE_KEY = "paperclip.locale";

// --- paperclip-Kr distribution layer ---
// Generic upstream builds fall back to DEFAULT_LOCALE ("en"). The Korean pack
// prefers "ko" as the first-run default when nothing else resolves. This single
// constant is the only locale-policy line that differs from upstream.
const PREFERRED_DEFAULT_LOCALE = "ko";

const supported = supportedLocales as readonly string[];

function isSupported(locale: string | null | undefined): boolean {
  return Boolean(locale) && supported.includes(locale as string);
}

/** Resolve an arbitrary locale tag (e.g. "ko-KR") to a supported locale, or null. */
function matchSupported(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  if (isSupported(candidate)) return candidate;
  const base = candidate.split("-")[0];
  if (isSupported(base)) return base;
  const prefixed = supported.find((locale) => locale.split("-")[0] === base);
  return prefixed ?? null;
}

function readStoredLocale(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // Ignore persistence failures (private mode, disabled storage, etc.).
  }
}

/**
 * Initial locale resolution order:
 *   1. Explicit user choice persisted in localStorage.
 *   2. The browser's navigator.language.
 *   3. The distribution's preferred default (browser runtime only).
 *   4. DEFAULT_LOCALE ("en") — also the deterministic answer in non-browser
 *      (test / SSR) contexts so locale-dependent assertions stay stable.
 */
export function resolveInitialLocale(): string {
  const stored = matchSupported(readStoredLocale());
  if (stored) return stored;

  const fromNavigator =
    typeof navigator !== "undefined" ? matchSupported(navigator.language) : null;
  if (fromNavigator) return fromNavigator;

  if (typeof window !== "undefined") {
    return matchSupported(PREFERRED_DEFAULT_LOCALE) ?? DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: resolveInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

/** Change the active locale and persist the choice for future sessions. */
export function setLocale(locale: string): void {
  const resolved = matchSupported(locale) ?? DEFAULT_LOCALE;
  persistLocale(resolved);
  void i18n.changeLanguage(resolved);
}

/** The currently active locale tag. */
export function getLocale(): string {
  return i18n.language || DEFAULT_LOCALE;
}

export const SUPPORTED_LOCALES = supported;

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n, Trans };
