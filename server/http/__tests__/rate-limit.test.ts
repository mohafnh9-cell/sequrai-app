import { describe, expect, it } from "vitest";
import { enforceRateLimit, resetRateLimitStateForTests } from "../rate-limit";

describe("enforceRateLimit", () => {
  it("returns 429 after the configured limit is exceeded", () => {
    resetRateLimitStateForTests();
    const request = new Request("https://example.com/api/projects", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    expect(enforceRateLimit(request, { limit: 2, windowMs: 60_000, keyPrefix: "test" })).toBeNull();
    expect(enforceRateLimit(request, { limit: 2, windowMs: 60_000, keyPrefix: "test" })).toBeNull();
    const blocked = enforceRateLimit(request, {
      limit: 2,
      windowMs: 60_000,
      keyPrefix: "test",
    });

    expect(blocked?.status).toBe(429);
  });
});
