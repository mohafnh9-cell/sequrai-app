import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SequrAI — AI Security Director for AI-built Apps",
    template: "%s | SequrAI",
  },
  description:
    "Automated security scanning, vulnerability detection, and AI-powered fix generation for apps built with Cursor, Claude Code, Lovable, Bolt, Vercel, Supabase, and Firebase.",
  keywords: ["security", "AI", "vulnerability scanner", "Cursor", "Supabase", "Next.js", "web security"],
  authors: [{ name: "SequrAI" }],
  creator: "SequrAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sequrai.com",
    title: "SequrAI — AI Security Director for AI-built Apps",
    description: "Automated security scanning and AI-powered fix generation for modern apps.",
    siteName: "SequrAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SequrAI — AI Security Director",
    description: "Automated security scanning for AI-built apps.",
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
