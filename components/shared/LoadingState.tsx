import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingState({
  label,
  size = "md",
  className,
}: LoadingStateProps) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground",
        className
      )}
    >
      <Loader2 className={cn("animate-spin", sizes[size])} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-5 animate-pulse", className)}>
      <div className="h-3 w-24 rounded bg-secondary mb-4" />
      <div className="h-7 w-16 rounded bg-secondary mb-2" />
      <div className="h-2.5 w-32 rounded bg-secondary/60" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-border/50 p-3 animate-pulse", className)}>
      <div className="h-8 w-8 rounded-md bg-secondary shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-40 rounded bg-secondary" />
        <div className="h-2.5 w-24 rounded bg-secondary/60" />
      </div>
      <div className="h-5 w-12 rounded-full bg-secondary shrink-0" />
    </div>
  );
}
