import { ProductDashboardPreview } from "@/components/landing/product-dashboard-preview";
import { PRODUCT_LABELS } from "@/content/landing";

export function ProductProof() {
  return (
    <section id="product" className="relative bg-background py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-16">
          <div className="max-w-md">
            <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">Product</p>
          </div>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {PRODUCT_LABELS.map((label) => (
              <li key={label} className="text-sm text-muted-foreground">
                {label}
              </li>
            ))}
          </ul>
        </div>

        <ProductDashboardPreview variant="full" />
      </div>
    </section>
  );
}
