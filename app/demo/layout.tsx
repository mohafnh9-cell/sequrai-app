import type { Metadata } from "next";
import { Suspense } from "react";
import { I18nShell } from "@/components/shared/I18nShell";
import { DemoLayoutClient } from "@/features/demo/components/DemoLayoutClient";

export const metadata: Metadata = {
  title: "SequrAI Demo",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nShell>
      <Suspense fallback={null}>
        <DemoLayoutClient>{children}</DemoLayoutClient>
      </Suspense>
    </I18nShell>
  );
}
