import { ProductDashboardPreview } from "@/components/landing/product-dashboard-preview";

export function ProductProof() {
  return (
    <section id="product" className="relative bg-background-deep py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Product</p>
        <h2 className="mt-4 max-w-lg text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
          Your Production Verdict, updated on every push.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          SequrAI watches your repository. When your code changes, you see whether you can
          deploy — and what to fix first.
        </p>

        <div className="mt-12">
          <ProductDashboardPreview variant="full" />
        </div>
      </div>
    </section>
  );
}
