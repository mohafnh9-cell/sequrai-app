import { describe, expect, it } from "vitest";
import {
  findSequrAIWebhook,
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
