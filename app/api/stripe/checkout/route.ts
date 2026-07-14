import { NextResponse } from "next/server";

// Stripe checkout not yet implemented
export async function POST() {
  return NextResponse.json(
    { error: "Stripe payments not yet implemented" },
    { status: 501 }
  );
}
