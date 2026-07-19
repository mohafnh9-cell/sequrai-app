import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAppLocale } from "@/lib/i18n/config";
import { loadNamespace } from "@/lib/i18n/load-messages";
import { createTranslator } from "@/lib/i18n/translate";
import { DEFAULT_LOCALE, type AppLocale, type TranslateParams } from "@/lib/i18n/types";

/**
 * MCP clients are not browsers: there is no cookie or Accept-Language header
 * that represents a human's preference. Locale resolution order per the MCP
 * V1 spec is: explicit input > API-key owner's profile locale > English.
 */
export async function resolveMcpLocale(
  admin: SupabaseClient,
  userId: string,
  explicitLocale?: string | null
): Promise<AppLocale> {
  if (isAppLocale(explicitLocale)) return explicitLocale;

  const { data: profile, error } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();

  const profileLocale =
    error?.message.includes("locale") && error.message.includes("does not exist")
      ? null
      : profile?.locale;

  if (isAppLocale(profileLocale)) return profileLocale;

  return DEFAULT_LOCALE;
}

export type McpTranslator = (key: string, params?: TranslateParams) => string;

export function getMcpTranslator(locale: AppLocale): McpTranslator {
  const messages = loadNamespace(locale, "mcp");
  return createTranslator(messages, locale);
}
