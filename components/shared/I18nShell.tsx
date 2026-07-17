import { I18nProvider } from "@/lib/i18n/client";
import { getMessages, getRequestLocale } from "@/lib/i18n/server";

export async function I18nShell({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string | null;
}) {
  const locale = await getRequestLocale(userId);
  const messages = await getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      {children}
    </I18nProvider>
  );
}
