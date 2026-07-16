import { NextResponse } from "next/server";

const deprecated = {
  error: "This endpoint is deprecated. Use POST /api/repositories/{projectId}/scans instead.",
  migration: "Block 5.5 — production readiness API",
};

export async function GET() {
  return NextResponse.json(deprecated, { status: 410 });
}

export async function POST() {
  return NextResponse.json(deprecated, { status: 410 });
}
