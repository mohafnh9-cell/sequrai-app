import { describe, expect, it } from "vitest";
import { isTerminalDeliveryStatus } from "../delivery-idempotency";

describe("isTerminalDeliveryStatus", () => {
  it("treats processed, failed, and ignored as terminal", () => {
    expect(isTerminalDeliveryStatus("processed")).toBe(true);
    expect(isTerminalDeliveryStatus("failed")).toBe(true);
    expect(isTerminalDeliveryStatus("ignored")).toBe(true);
  });

  it("treats in-flight statuses as non-terminal", () => {
    expect(isTerminalDeliveryStatus("processing")).toBe(false);
    expect(isTerminalDeliveryStatus("queued")).toBe(false);
    expect(isTerminalDeliveryStatus("unknown")).toBe(false);
  });
});
