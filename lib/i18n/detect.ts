import { DEFAULT_LOCALE, type AppLocale } from "./types";
import { isAppLocale } from "./config";

export function detectLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined
): AppLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const candidates = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const tag of candidates) {
    if (tag.startsWith("es")) return "es";
    if (tag.startsWith("en")) return "en";
  }

  return DEFAULT_LOCALE;
}

export function resolveLocalePreference(
  ...candidates: Array<string | null | undefined>
): AppLocale {
  for (const candidate of candidates) {
    if (isAppLocale(candidate)) return candidate;
  }
  return DEFAULT_LOCALE;
}
