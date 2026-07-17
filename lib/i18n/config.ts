import type { AppLocale } from "./types";

export const LOCALE_COOKIE = "sequrai_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "es";
}
