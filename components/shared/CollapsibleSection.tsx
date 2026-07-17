"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  onToggle,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card/30", className)}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            onToggle?.(next);
            return next;
          });
        }}
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <ChevronDown
          className={cn("mt-1 h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-border/70 px-5 py-4">{children}</div>}
    </section>
  );
}
