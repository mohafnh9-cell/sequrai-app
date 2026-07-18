"use client";

import { DemoShell } from "./DemoShell";

export function DemoLayoutClient({ children }: { children: React.ReactNode }) {
  return <DemoShell orgName="Northwind Labs">{children}</DemoShell>;
}
