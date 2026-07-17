"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createTranslator } from "./translate";
import type { AppLocale, Messages, TranslateParams, Translator } from "./types";
import { setLocaleAction } from "@/server/actions/locale";

type I18nContextValue = {
  locale: AppLocale;
  messages: Messages;
  t: Translator;
  tn: (namespace: string, key: string, params?: TranslateParams) => string;
  setLocale: (locale: AppLocale) => Promise<void>;
  isChangingLocale: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: AppLocale;
  messages: Messages;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const t = useMemo(() => createTranslator(messages, locale), [messages, locale]);

  const tn = useCallback(
    (namespace: string, key: string, params?: TranslateParams) =>
      t(`${namespace}.${key}`, params),
    [t]
  );

  const setLocale = useCallback(
    async (nextLocale: AppLocale) => {
      await setLocaleAction(nextLocale);
      startTransition(() => {
        router.refresh();
      });
    },
    [router]
  );

  const value = useMemo(
    () => ({
      locale,
      messages,
      t,
      tn,
      setLocale,
      isChangingLocale: isPending,
    }),
    [isPending, locale, messages, setLocale, t, tn]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(namespace?: string) {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  const scopedT = useCallback(
    (key: string, params?: TranslateParams) =>
      namespace ? context.tn(namespace, key, params) : context.t(key, params),
    [context, namespace]
  );

  return {
    locale: context.locale,
    t: scopedT,
    setLocale: context.setLocale,
    isChangingLocale: context.isChangingLocale,
  };
}
