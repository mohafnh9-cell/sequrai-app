import { NextResponse } from "next/server";

// MCP integration not yet implemented
export async function POST() {
  return NextResponse.json(
    { error: "MCP integration not yet implemented" },
    { status: 501 }
  );
}
