import { Inter } from "next/font/google";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { LandingNavbar } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { ProductFlow } from "@/components/landing/product-flow";
import { ProductProof } from "@/components/landing/product-proof";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export default function LandingPage() {
  return (
    <div className={`${inter.variable} min-h-screen bg-background-deep font-[family-name:var(--font-sans)]`}>
      <LandingNavbar />
      <main>
        <Hero />
        <ProductProof />
        <ProductFlow />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
