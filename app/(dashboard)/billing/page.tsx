import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreditCard, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing" };

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For individual developers exploring SequrAI.",
    features: ["2 projects", "5 scans/month", "1 team member", "Email reports"],
    cta: "Current plan",
    current: true,
  },
  {
    id: "BUILDER",
    name: "Builder",
    price: "$29",
    period: "/month",
    description: "For indie hackers and small teams.",
    features: ["5 projects", "50 scans/month", "2 team members", "AI fix suggestions", "Slack alerts"],
    cta: "Upgrade",
    current: false,
  },
  {
    id: "STUDIO",
    name: "Studio",
    price: "$99",
    period: "/month",
    description: "For product studios and growing teams.",
    features: ["20 projects", "200 scans/month", "10 team members", "Priority AI fixes", "Webhooks", "API access"],
    cta: "Upgrade",
    current: false,
  },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <PageHeader
        title="Billing"
        description="Manage your subscription and usage."
      />

      {/* Current plan notice */}
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 px-4 py-3">
        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">You are on the Free plan</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paid plans unlock more projects and every-push reviews. Billing integration is in progress.
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto shrink-0">
          Coming soon
        </Badge>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`border-border/50 ${plan.current ? "ring-1 ring-primary/30" : ""}`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{plan.name}</CardTitle>
                {plan.current && (
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription className="text-xs">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="sm"
                variant={plan.current ? "outline" : "default"}
                disabled
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
