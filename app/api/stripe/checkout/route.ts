import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/server/http/rate-limit";

// Stripe checkout not yet implemented
export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request);
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    { error: "Stripe payments not yet implemented" },
    { status: 501 }
  );
}
