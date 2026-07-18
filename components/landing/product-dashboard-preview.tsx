import { PREVIEW } from "@/content/landing";
import { cn } from "@/lib/utils";

type ProductDashboardPreviewProps = {
  className?: string;
  variant?: "hero" | "full";
};

/** Static preview aligned with Builder Edition V1 */
export function ProductDashboardPreview({
  className,
  variant = "full",
}: ProductDashboardPreviewProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[20px] landing-surface shadow-[0_40px_120px_rgb(0_0_0_/_0.55)]",
        isHero && "pointer-events-none select-none",
        className
      )}
      aria-hidden={isHero}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className={cn("p-5 md:p-6 lg:p-8", isHero && "scale-[0.98] opacity-90")}>
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-lg">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
              Production Verdict · {PREVIEW.verdictStatus}
            </p>
            <p className="text-lg font-medium tracking-tight text-foreground/90 md:text-xl">
              {PREVIEW.verdictSummary}
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Score</p>
            <p className="mt-1 text-5xl font-semibold tabular-nums tracking-[-0.04em] md:text-6xl">
              {PREVIEW.score}
            </p>
            <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-brand-gradient landing-glow-score"
                style={{ width: `${PREVIEW.score}%` }}
              />
            </div>
          </div>
        </div>

        {!isHero && (
          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6 h-full">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  Continuous Reviews
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-success" />
                    {PREVIEW.continuousReviews.state}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Last review: {PREVIEW.continuousReviews.lastReview}
                </p>
                <p className="mt-4 text-xs leading-relaxed text-text-muted">
                  Every time your code changes, SequrAI automatically reviews it.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6 h-full">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  Recommendations
                </p>
                <div className="mt-4 space-y-3">
                  {PREVIEW.recommendations.map((item) => (
                    <div
                      key={item.rank}
                      className="rounded-xl border border-border/80 bg-surface px-4 py-3.5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {item.rank}. {item.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isHero && (
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background-deep to-transparent" />
      )}
    </div>
  );
}
