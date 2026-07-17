import { PREVIEW } from "@/content/landing";
import { cn } from "@/lib/utils";

type ProductDashboardPreviewProps = {
  className?: string;
  variant?: "hero" | "full";
};

/** Faithful static reconstruction of the production dashboard UI */
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
        {/* ProductionHero pattern */}
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-lg">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
              Production Level 2 · Almost Ready
            </p>
            <p className="text-lg font-medium tracking-tight text-foreground/90 md:text-xl">
              Your application needs improvements before production
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Production Ready Score
            </p>
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
            {/* AI Production Engineer pattern */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  AI Production Engineer
                </p>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-foreground/90">
                  <p>I reviewed your latest push.</p>
                  <p>
                    Your project is{" "}
                    <span className="font-medium text-foreground">{PREVIEW.score}%</span> production
                    ready.
                  </p>
                  <p>
                    Fixing the next three blockers could raise it to{" "}
                    <span className="font-medium text-foreground">{PREVIEW.projectedScore}</span>.
                  </p>
                  <p className="text-text-muted">
                    Estimated implementation time: {PREVIEW.estimatedMinutes} minutes.
                  </p>
                </div>
              </div>

              {/* Production Roadmap pattern */}
              <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  Production Roadmap
                </p>
                <div className="mt-4 space-y-3">
                  {PREVIEW.roadmap.map((item) => (
                    <div
                      key={item.rank}
                      className="rounded-xl border border-border/80 bg-surface px-4 py-3.5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {item.rank}. {item.title}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        +{item.delta} score · {item.minutes} min
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline pattern */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6 h-full">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  Production Timeline
                </p>
                <div className="mt-4 space-y-4">
                  {PREVIEW.timeline.map((item) => (
                    <div key={item.title} className="flex gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
                      <div>
                        <p className="text-sm text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-xs text-text-muted">{item.time}</p>
                      </div>
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
