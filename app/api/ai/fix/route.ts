import { NextResponse } from "next/server";

const deprecated = {
  error: "This endpoint is deprecated. Use AI analysis on scan reports via /api/scans/{scanId}/ai-analysis.",
  migration: "Block 5.5 — production readiness API",
};

export async function POST() {
  return NextResponse.json(deprecated, { status: 410 });
}
