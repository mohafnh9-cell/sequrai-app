import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SequrAI — Production Verdict for AI-built apps",
    template: "%s | SequrAI",
  },
  description:
    "Know if your AI-built application is ready for production before you deploy. Connect GitHub, get a Production Verdict on every push.",
  keywords: [
    "production verdict",
    "AI-built apps",
    "Cursor",
    "Claude Code",
    "continuous reviews",
    "deploy with confidence",
  ],
  authors: [{ name: "SequrAI" }],
  creator: "SequrAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sequrai.com",
    title: "SequrAI — Production Verdict for AI-built apps",
    description:
      "Know if your AI-built application is ready for production before you deploy.",
    siteName: "SequrAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SequrAI — Production Verdict for AI-built apps",
    description:
      "Connect GitHub. Every push reviewed. Get your Production Verdict before you deploy.",
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
