"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { demoHref } from "./paths";
import { parseDemoScenario } from "./scenarios";

export function useDemoNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = pathname.startsWith("/demo");
  const scenario = parseDemoScenario(searchParams.get("scenario"));

  const href = (path: string) => {
    if (!isDemo) return path;
    return demoHref(path, scenario);
  };

  return { isDemo, scenario, href };
}
