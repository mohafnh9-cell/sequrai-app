import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/landing/brand-logo";
import { BRAND } from "@/content/landing";

export function FinalCTA() {
  return (
    <section className="bg-background py-32 md:py-44 lg:py-52">
      <div className="mx-auto max-w-[760px] px-6 text-center">
        <h2 className="text-[clamp(3rem,8vw,5rem)] font-semibold leading-none tracking-[-0.05em]">
          <span className="text-gradient">{BRAND.slogan}</span>
        </h2>

        <p className="mx-auto mt-10 max-w-md text-lg leading-relaxed tracking-[-0.01em] text-muted-foreground">
          Build with the speed of AI.
          <br />
          Ship with the confidence of a senior engineer.
        </p>

        <Button
          size="lg"
          className="mt-12 h-12 rounded-full bg-brand-gradient px-8 text-sm font-medium hover:opacity-90"
          asChild
        >
          <Link href="/signup">Analyze your project</Link>
        </Button>

        <div className="mt-20 flex flex-col items-center gap-2">
          <BrandLogo />
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{BRAND.slogan}</p>
        </div>
      </div>
    </section>
  );
}
