import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "placeholder", {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Keep named export for convenience
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  BUILDER: {
    name: "Builder",
    priceId: process.env.STRIPE_BUILDER_PRICE_ID ?? "",
    price: 49,
    currency: "eur",
    interval: "month" as const,
    features: [
      "5 projects",
      "50 scans/month",
      "2 team members",
      "Basic AI fixes",
      "Email notifications",
      "14-day free trial",
    ],
    limits: { projects: 5, scansPerMonth: 50, members: 2 },
  },
  STUDIO: {
    name: "Studio",
    priceId: process.env.STRIPE_STUDIO_PRICE_ID ?? "",
    price: 99,
    currency: "eur",
    interval: "month" as const,
    features: [
      "20 projects",
      "200 scans/month",
      "10 team members",
      "Full AI Fix Center",
      "Cursor & Claude prompts",
      "Priority support",
      "14-day free trial",
    ],
    limits: { projects: 20, scansPerMonth: 200, members: 10 },
  },
  AGENCY: {
    name: "Agency",
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? "",
    price: 299,
    currency: "eur",
    interval: "month" as const,
    features: [
      "Unlimited projects",
      "Unlimited scans",
      "Unlimited team members",
      "Full AI Fix Center + MCP",
      "GitHub App integration",
      "Custom webhooks",
      "Dedicated support",
      "14-day free trial",
    ],
    limits: { projects: Infinity, scansPerMonth: Infinity, members: Infinity },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
