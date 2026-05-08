import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

const STORAGE_KEY = "process-blueprint-ai-workbench:locale";
export const defaultLocale: Locale = "vi";

export type { Locale, TranslationKey } from "@/lib/i18n/types";

export function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}

export function t(key: TranslationKey, locale: Locale = defaultLocale) {
  return dictionaries[locale][key] ?? dictionaries[defaultLocale][key] ?? key;
}

export function getLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const savedLocale = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(savedLocale) ? savedLocale : defaultLocale;
}

export function setLocale(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, locale);
  window.dispatchEvent(new CustomEvent("process-blueprint-locale-change", {
    detail: { locale }
  }));
}
