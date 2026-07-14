import { NextResponse } from "next/server";

// AI fix generation not yet implemented
export async function POST() {
  return NextResponse.json(
    { error: "AI fix generation not yet implemented" },
    { status: 501 }
  );
}
