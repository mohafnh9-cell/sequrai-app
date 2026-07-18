import "server-only";

const BYPASS_VALUES = new Set(["true", "1", "yes"]);

export function isBypassFlagSet(): boolean {
  const value = process.env.SEQURAI_BYPASS_AUTH?.trim().toLowerCase();
  return Boolean(value && BYPASS_VALUES.has(value));
}

export function assertProductionSafe(): void {
  const deployedProduction = process.env.VERCEL_ENV === "production";
  const runtimeProduction =
    process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";

  if ((deployedProduction || runtimeProduction) && isBypassFlagSet()) {
    throw new Error(
      "SEQURAI_BYPASS_AUTH cannot be enabled in production. Remove it from your deployment environment."
    );
  }
}

export function isAuthBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production") {
    assertProductionSafe();
    return false;
  }
  return isBypassFlagSet();
}
