import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingNav } from "@/components/landing/nav";
import { PLANS } from "@/lib/stripe";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

const PLAN_KEYS = Object.keys(PLANS) as Array<keyof typeof PLANS>;

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background">
      {!user && <LandingNav />}

      <div className={`${!user ? "pt-32" : "pt-6"} pb-24 px-6`}>
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-xs">Pricing</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              14-day free trial on all plans. No credit card required.
            </p>
          </div>

          {/* Plans */}
          <div className="grid gap-6 lg:grid-cols-3">
            {PLAN_KEYS.map((key, i) => {
              const plan = PLANS[key];
              const isPopular = key === "STUDIO";

              return (
                <div
                  key={key}
                  className={`relative rounded-xl border p-8 ${
                    isPopular
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 bg-card/50"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="text-xs">Most popular</Badge>
                    </div>
                  )}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">€{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.limits.projects === Infinity ? "Unlimited" : plan.limits.projects} projects ·{" "}
                      {plan.limits.scansPerMonth === Infinity ? "Unlimited" : plan.limits.scansPerMonth} scans/mo
                    </p>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={user ? `/api/stripe/checkout?plan=${key}` : "/signup"}>
                      {user ? "Upgrade now" : "Start free trial"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* FAQ below */}
          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              Questions?{" "}
              <a href="mailto:hi@sequrai.com" className="underline underline-offset-4">
                Contact us
              </a>
              {" "}or check our{" "}
              <Link href="/#faq" className="underline underline-offset-4">FAQ</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
