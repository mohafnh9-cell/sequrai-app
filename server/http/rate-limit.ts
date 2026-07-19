import "server-only";

import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  keyPrefix?: string;
  /** Typed error code + message for callers that need a structured body (e.g. MCP). */
  errorCode?: string;
  errorMessage?: string;
};

function clientKey(request: Request, keyPrefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${keyPrefix}:${ip}`;
}

export function enforceRateLimit(
  request: Request,
  options: RateLimitOptions = {},
): NextResponse | null {
  const limit = options.limit ?? 120;
  const windowMs = options.windowMs ?? 60_000;
  const key = clientKey(request, options.keyPrefix ?? "api");
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return NextResponse.json(
      {
        error: options.errorMessage ?? "Too many requests",
        ...(options.errorCode ? { code: options.errorCode } : {}),
      },
      { status: 429 }
    );
  }

  return null;
}

export function resetRateLimitStateForTests() {
  buckets.clear();
}
