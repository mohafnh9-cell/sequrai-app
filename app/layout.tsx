import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SequrAI — Production & Security OS for AI-built Apps",
    template: "%s | SequrAI",
  },
  description:
    "Know if your AI-built app is production ready. Automated analysis, deployment blockers, and AI-powered fixes for apps built with Cursor, Claude Code, Lovable, Bolt, Vercel, Supabase, and Firebase.",
  keywords: ["production readiness", "AI", "security", "Cursor", "Supabase", "Next.js", "deployment"],
  authors: [{ name: "SequrAI" }],
  creator: "SequrAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sequrai.com",
    title: "SequrAI — Production & Security OS for AI-built Apps",
    description: "Never deploy an AI-built application without SequrAI.",
    siteName: "SequrAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SequrAI — Production & Security OS",
    description: "Is your AI-built app production ready?",
    creator: "@sequrai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
