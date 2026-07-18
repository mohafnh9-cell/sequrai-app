"use client";

import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { QueryProvider } from "@/lib/query/provider";
import { DemoBanner } from "./DemoBanner";

const DEMO_USER = {
  id: "demo-user",
  email: "reviewer@demo.sequrai.dev",
  user_metadata: { full_name: "Product Reviewer" },
};

export function DemoShell({
  orgName,
  children,
}: {
  orgName: string;
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <DashboardShell user={DEMO_USER} orgName={orgName}>
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        {children}
      </DashboardShell>
    </QueryProvider>
  );
}
