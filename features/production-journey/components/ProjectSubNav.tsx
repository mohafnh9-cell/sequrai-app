"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { useDemoNavigation } from "@/features/demo/use-demo-navigation";

export function ProjectSubNav({
  projectId,
  latestReportHref,
}: {
  projectId: string;
  latestReportHref?: string;
}) {
  const pathname = usePathname();
  const { t: tp } = useI18n("projects");
  const { href } = useDemoNavigation();
  const overviewHref = href(`/projects/${projectId}`);
  const journeyHref = href(`/projects/${projectId}/journey`);
  const reportHref = latestReportHref ? href(latestReportHref) : undefined;

  const tabs = [
    { href: overviewHref, label: tp("overview"), match: (p: string) => p.split("?")[0] === overviewHref.split("?")[0] },
    {
      href: journeyHref,
      label: tp("productionJourney"),
      match: (p: string) => p.split("?")[0].startsWith(journeyHref.split("?")[0]),
    },
    ...(reportHref
      ? [
          {
            href: reportHref,
            label: tp("technicalDetails"),
            match: (p: string) => p.includes("/report"),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Project sections"
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "bg-accent/60 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
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
