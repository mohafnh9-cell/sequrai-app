"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getWorkspaceAccentColor,
  getWorkspaceInitials,
} from "@/lib/workspaces/presentation";

export function WorkspaceIcon({
  name,
  logoUrl,
  className,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";
  const initials = getWorkspaceInitials(name);
  const accent = getWorkspaceAccentColor(name);

  if (logoUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md border border-border/60 bg-secondary/40",
          dimension,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md font-semibold text-white",
        dimension,
        className
      )}
      style={{ backgroundColor: accent }}
      aria-hidden
    >
      {initials || <Shield className="h-3.5 w-3.5" />}
    </div>
  );
}
