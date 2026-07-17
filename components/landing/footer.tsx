import Link from "next/link";
import { BrandLogo } from "@/components/landing/brand-logo";
import { BRAND } from "@/content/landing";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-deep py-14 md:py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <BrandLogo />
            <p className="mt-4 max-w-xs text-sm text-text-muted">{BRAND.positioning}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Product</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="#product" className="hover:text-foreground transition-colors">
                Product
              </Link>
              <Link href="#workflow" className="hover:text-foreground transition-colors">
                Workflow
              </Link>
              <Link href="#pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Company</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="mailto:hi@sequrai.com" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Legal</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-12 text-xs text-text-muted">© 2026 SequrAI</p>
      </div>
    </footer>
  );
}
