import { PREVIEW, WORKFLOW_STEPS } from "@/content/landing";

export function WorkflowSection() {
  return (
    <section id="workflow" className="border-t border-border bg-background py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.04em]">
          Every push. Reviewed.
        </h2>

        <div className="mt-14 overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-3 text-sm md:gap-4 md:text-[15px]">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step} className="flex items-center gap-3 md:gap-4">
                <span className="whitespace-nowrap text-muted-foreground">{step}</span>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-text-muted" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 max-w-2xl rounded-[20px] border border-border bg-surface p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
              GitHub
            </span>
            <span className="text-text-muted">·</span>
            <span className="font-mono text-xs text-muted-foreground md:text-sm">
              {PREVIEW.githubCheck.repo}
            </span>
          </div>
          <p className="mt-4 text-sm text-foreground">{PREVIEW.githubCheck.commit}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-warning/30 bg-brand-warning/5 px-3 py-1.5 text-xs text-brand-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-warning" />
            {PREVIEW.githubCheck.status}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span>GitHub</span>
          <span className="text-text-muted">·</span>
          <span>SequrAI</span>
          <span className="text-text-muted">·</span>
          <span>
            Cursor MCP{" "}
            <span className="ml-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
              Available
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
