"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export function ProjectSubNav({
  projectId,
  latestReportHref,
}: {
  projectId: string;
  latestReportHref?: string;
}) {
  const pathname = usePathname();
  const { t: tp } = useI18n("projects");

  const tabs = [
    { href: `/projects/${projectId}`, label: tp("overview"), match: (p: string) => p === `/projects/${projectId}` },
    {
      href: `/projects/${projectId}/journey`,
      label: tp("productionJourney"),
      match: (p: string) => p.startsWith(`/projects/${projectId}/journey`),
    },
    ...(latestReportHref
      ? [
          {
            href: latestReportHref,
            label: tp("technicalDetails"),
            match: (p: string) => p.includes("/report"),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Project sections"
      className="flex flex-wrap gap-1 border-b border-border/60 pb-px"
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-t-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "text-foreground border-b-2 border-primary -mb-px bg-secondary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
