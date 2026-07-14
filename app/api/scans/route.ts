import { NextResponse } from "next/server";

// Scanner not yet implemented
export async function GET() {
  return NextResponse.json(
    { error: "Scanner not yet implemented" },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Scanner not yet implemented" },
    { status: 501 }
  );
}
