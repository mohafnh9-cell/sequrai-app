import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/server/http/rate-limit";

// Stripe webhooks not yet implemented
export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request);
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    { received: true, message: "Stripe not yet implemented" },
    { status: 200 }
  );
}
