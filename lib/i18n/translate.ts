import type { AppLocale, Messages, TranslateParams, Translator } from "./types";

function getNestedValue(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in (current as object))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value == null ? "" : String(value);
  });
}

function pluralForm(locale: AppLocale, count: number): "one" | "other" {
  if (locale === "es") return count === 1 ? "one" : "other";
  return count === 1 ? "one" : "other";
}

export function createTranslator(messages: Messages, locale: AppLocale): Translator {
  return (key: string, params?: TranslateParams) => {
    const count = params?.count;
    if (typeof count === "number") {
      const pluralKey = `${key}_${pluralForm(locale, count)}`;
      const pluralValue = getNestedValue(messages, pluralKey);
      if (pluralValue) {
        return interpolate(pluralValue, { ...params, count });
      }
    }

    const value = getNestedValue(messages, key);
    if (value) return interpolate(value, params);

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing key: ${key}`);
    }
    return key;
  };
}

export function mergeMessages(...parts: Messages[]): Messages {
  return Object.assign({}, ...parts);
}
