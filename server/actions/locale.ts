"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/config";
import type { AppLocale } from "@/lib/i18n/types";
import { isAppLocale } from "@/lib/i18n/config";

export async function setLocaleAction(locale: AppLocale) {
  if (!isAppLocale(locale)) return { error: "Invalid locale" };

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .update({ locale, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  return { error: null };
}
