import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("text-[15px] font-semibold tracking-[-0.02em] text-foreground", className)}>
      Sequr<span className="text-gradient">AI</span>
    </span>
  );
}

export function BrandLogoLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex", className)}>
      <BrandLogo />
    </Link>
  );
}
