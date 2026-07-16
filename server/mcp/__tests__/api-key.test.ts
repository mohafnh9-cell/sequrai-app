import { describe, expect, it } from "vitest";
import { generateMcpApiKey, hashMcpApiKey } from "@/server/mcp/auth";

describe("MCP API key auth", () => {
  it("hashes keys deterministically", () => {
    const raw = "seq_live_abc123";
    expect(hashMcpApiKey(raw)).toBe(hashMcpApiKey(raw));
    expect(hashMcpApiKey(raw)).toHaveLength(64);
  });

  it("generates prefixed keys with matching hash", () => {
    const { rawKey, prefix, hash } = generateMcpApiKey();
    expect(rawKey.startsWith("seq_live_")).toBe(true);
    expect(prefix).toBe(rawKey.slice(0, 16));
    expect(hashMcpApiKey(rawKey)).toBe(hash);
  });

  it("generates unique keys", () => {
    const a = generateMcpApiKey();
    const b = generateMcpApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
  });
});
