import { NextResponse } from "next/server";

// Stripe webhooks not yet implemented
export async function POST() {
  return NextResponse.json(
    { received: true, message: "Stripe not yet implemented" },
    { status: 200 }
  );
}
