import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PREVIEW } from "@/content/landing";

export function AIEngineerSection() {
  return (
    <section className="bg-background-deep py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">
              AI Production Engineer
            </p>
            <h2 className="mt-6 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
              Senior judgment,
              <br />
              available instantly.
            </h2>
          </div>

          <div className="rounded-[20px] border border-border bg-surface p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
              Executive report
            </p>
            <div className="mt-6 space-y-4 text-[15px] leading-[1.7] text-foreground/90">
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
              <p className="text-muted-foreground">
                Estimated implementation time: {PREVIEW.estimatedMinutes} minutes.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="rounded-full border-border bg-transparent" asChild>
                <Link href="/signup">Review roadmap</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full border-border bg-transparent" asChild>
                <Link href="/signup">Generate fix</Link>
              </Button>
              <Button size="sm" className="rounded-full bg-brand-gradient hover:opacity-90" asChild>
                <Link href="/signup">Open project</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
