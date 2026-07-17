import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductDashboardPreview } from "@/components/landing/product-dashboard-preview";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-16 md:pt-20">
      <div className="absolute inset-0 landing-ambient" />
      <div className="absolute left-1/2 top-[38%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-violet/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-[1200px] flex-col px-6 pb-8 pt-16 md:pt-24 lg:pt-28">
        <div className="mx-auto max-w-[760px] text-center lg:text-left lg:mx-0">
          <p className="landing-reveal text-[11px] font-medium uppercase tracking-[0.28em] text-text-muted">
            The production engineer for AI-built software
          </p>

          <h1 className="landing-reveal landing-reveal-delay-1 mt-8 text-[clamp(3.5rem,10vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
            <span className="text-gradient">Think Ahead.</span>
          </h1>

          <p className="landing-reveal landing-reveal-delay-2 mt-8 text-xl font-medium tracking-[-0.02em] text-foreground md:text-2xl">
            Build at the speed of AI.
            <br />
            Ship with senior judgment.
          </p>

          <p className="landing-reveal landing-reveal-delay-2 mt-6 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground lg:mx-0 mx-auto">
            SequrAI reviews every change, identifies what could fail in production, and gives you
            the fastest path to ship with confidence.
          </p>

          <div className="landing-reveal landing-reveal-delay-3 mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button
              size="lg"
              className="h-12 rounded-full bg-brand-gradient px-7 text-sm font-medium hover:opacity-90"
              asChild
            >
              <Link href="/signup">Analyze your project</Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-12 rounded-full px-7 text-sm text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="#product">Watch the product</Link>
            </Button>
          </div>

          <p className="landing-reveal landing-reveal-delay-3 mt-5 text-xs text-text-muted">
            Connect GitHub. First analysis in minutes.
          </p>
        </div>

        <div className="landing-reveal landing-reveal-delay-3 relative mt-12 md:mt-16 lg:mt-20">
          <ProductDashboardPreview variant="hero" className="mx-auto max-w-[980px]" />
        </div>
      </div>
    </section>
  );
}
