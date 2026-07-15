import { NextResponse, after } from "next/server";
import { verifyGitHubWebhookSignature } from "@/server/github-automation/webhook-utils";
import { processGitHubWebhookEvent } from "@/server/github-automation/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

function webhookSecret(): string | null {
  return process.env.GITHUB_WEBHOOK_SECRET ?? null;
}

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured", code: "WEBHOOK_MISCONFIGURED" },
      { status: 503 }
    );
  }

  const deliveryId = request.headers.get("x-github-delivery");
  const eventType = request.headers.get("x-github-event") ?? "unknown";
  const signature = request.headers.get("x-hub-signature-256");
  const rawBody = await request.text();

  if (!verifyGitHubWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Respond immediately — GitHub expects a fast 2xx.
  after(async () => {
    try {
      await processGitHubWebhookEvent({
        eventType,
        deliveryId,
        payload,
      });
    } catch (error) {
      console.error({
        component: "github-webhook",
        event: "background_processing_failed",
        deliveryId,
        eventType,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  });

  return NextResponse.json(
    { received: true, event: eventType, deliveryId },
    { status: 202 }
  );
}
