import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SequrAI — Think Ahead.",
    template: "%s | SequrAI",
  },
  description:
    "SequrAI tells you when your AI-built application is ready to ship and the fastest path to get there. Think Ahead — every push reviewed.",
  keywords: [
    "production readiness",
    "AI development",
    "Cursor",
    "Claude Code",
    "Supabase",
    "deployment",
    "production engineer",
  ],
  authors: [{ name: "SequrAI" }],
  creator: "SequrAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sequrai.com",
    title: "SequrAI — Think Ahead.",
    description:
      "SequrAI tells you when your AI-built application is ready to ship and the fastest path to get there.",
    siteName: "SequrAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SequrAI — Think Ahead.",
    description: "Build with AI. Ship with engineering excellence.",
    creator: "@sequrai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
