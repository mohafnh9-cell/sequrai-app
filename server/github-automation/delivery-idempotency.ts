import type { SupabaseClient } from "@supabase/supabase-js";

const TERMINAL_DELIVERY_STATUSES = new Set([
  "processed",
  "failed",
  "ignored",
]);

export function isTerminalDeliveryStatus(status: string): boolean {
  return TERMINAL_DELIVERY_STATUSES.has(status);
}

export async function findDeliveryEventStatus(
  admin: SupabaseClient,
  deliveryId: string | null
): Promise<string | null> {
  if (!deliveryId) return null;

  const { data, error } = await admin
    .from("repository_events")
    .select("status")
    .eq("github_delivery_id", deliveryId)
    .maybeSingle();

  if (error) {
    console.warn("delivery_status_lookup_failed", {
      deliveryId,
      message: error.message,
    });
    return null;
  }

  return data?.status ?? null;
}

export async function isDeliveryAlreadyHandled(
  admin: SupabaseClient,
  deliveryId: string | null
): Promise<boolean> {
  const status = await findDeliveryEventStatus(admin, deliveryId);
  return status != null && isTerminalDeliveryStatus(status);
}
