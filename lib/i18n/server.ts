import "server-only";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "./config";
import { detectLocaleFromAcceptLanguage, resolveLocalePreference } from "./detect";
import { loadAllMessages, loadNamespace } from "./load-messages";
import { createTranslator } from "./translate";
import type { AppLocale, MessageNamespace, Messages, Translator } from "./types";
import { DEFAULT_LOCALE } from "./types";

export async function getRequestLocale(userId?: string | null): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  if (userId) {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", userId)
      .maybeSingle();

    const profileLocale =
      error?.message.includes("locale") && error.message.includes("does not exist")
        ? null
        : profile?.locale;

    return resolveLocalePreference(
      profileLocale,
      cookieLocale,
      detectLocaleFromAcceptLanguage((await headers()).get("accept-language")),
      DEFAULT_LOCALE
    );
  }

  return resolveLocalePreference(
    cookieLocale,
    detectLocaleFromAcceptLanguage((await headers()).get("accept-language")),
    DEFAULT_LOCALE
  );
}

export async function getMessages(locale?: AppLocale): Promise<Messages> {
  const resolved = locale ?? (await getRequestLocale());
  return loadAllMessages(resolved);
}

export async function getTranslator(namespace?: MessageNamespace) {
  const locale = await getRequestLocale();
  const messages = namespace
    ? { [namespace]: loadNamespace(locale, namespace) }
    : loadAllMessages(locale);

  const t = createTranslator(messages, locale);
  const scoped = namespace
    ? (key: string, params?: Record<string, string | number | null | undefined>) =>
        t(`${namespace}.${key}`, params)
    : t;

  return { locale, t: scoped as Translator, messages };
}
