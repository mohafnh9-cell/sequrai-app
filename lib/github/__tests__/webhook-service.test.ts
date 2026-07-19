import { describe, expect, it } from "vitest";
import {
  findSequrAIWebhook,
  isPubliclyReachableCallbackUrl,
  parseRepositoryOwnerRepo,
  resolveWebhookCallbackUrl,
} from "@/lib/github/webhook-service";

describe("parseRepositoryOwnerRepo", () => {
  it("parses owner/repo", () => {
    expect(parseRepositoryOwnerRepo("acme/app")).toEqual({ owner: "acme", repo: "app" });
    expect(parseRepositoryOwnerRepo("invalid")).toBeNull();
  });
});

describe("findSequrAIWebhook", () => {
  it("matches callback URL", () => {
    const url = "https://sequrai-app.vercel.app/api/webhooks/github";
    const hook = findSequrAIWebhook(
      [
        {
          id: 1,
          type: "web",
          active: true,
          events: ["push"],
          config: { url },
        },
      ],
      url
    );
    expect(hook?.id).toBe(1);
  });
});

describe("resolveWebhookCallbackUrl", () => {
  it("prefers GITHUB_WEBHOOK_URL", () => {
    const previous = process.env.GITHUB_WEBHOOK_URL;
    process.env.GITHUB_WEBHOOK_URL = "https://example.com/hook/";
    expect(resolveWebhookCallbackUrl()).toBe("https://example.com/hook");
    process.env.GITHUB_WEBHOOK_URL = previous;
  });
});

describe("isPubliclyReachableCallbackUrl", () => {
  it("accepts a normal https production URL", () => {
    expect(isPubliclyReachableCallbackUrl("https://sequrai-app.vercel.app/api/webhooks/github")).toBe(true);
  });

  it("rejects localhost — the exact regression that broke push detection for a real project", () => {
    expect(isPubliclyReachableCallbackUrl("http://localhost:3000/api/webhooks/github")).toBe(false);
  });

  it("rejects 127.0.0.1 and other loopback/private addresses", () => {
    expect(isPubliclyReachableCallbackUrl("http://127.0.0.1:3000/api/webhooks/github")).toBe(false);
    expect(isPubliclyReachableCallbackUrl("http://192.168.1.5:3000/api/webhooks/github")).toBe(false);
    expect(isPubliclyReachableCallbackUrl("http://10.0.0.5:3000/api/webhooks/github")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isPubliclyReachableCallbackUrl("not-a-url")).toBe(false);
  });
});
