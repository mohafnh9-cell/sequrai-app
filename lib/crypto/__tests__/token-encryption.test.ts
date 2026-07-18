import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { encryptToken, decryptToken } from "@/lib/crypto/token-encryption";

describe("token encryption", () => {
  it("round-trips when encryption key is configured", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = key;
    const encrypted = encryptToken("gho_test_token_value");
    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    expect(decryptToken(encrypted)).toBe("gho_test_token_value");
    delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  });

  it("stores plaintext when encryption key is absent", () => {
    delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    expect(encryptToken("plain-token")).toBe("plain-token");
    expect(decryptToken("plain-token")).toBe("plain-token");
  });
});

describe("migration 015 organization security", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "database/migrations/015_organization_security_hardening.sql"),
    "utf8"
  );

  it("removes permissive membership insert policy", () => {
    expect(sql).toContain('drop policy if exists "Users can create org memberships"');
    expect(sql).not.toMatch(/with check \(auth\.uid\(\) is not null\)/i);
  });

  it("defines create_organization_with_owner RPC", () => {
    expect(sql).toContain("create or replace function public.create_organization_with_owner");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("grant execute");
  });

  it("restricts direct organization creation", () => {
    expect(sql).toContain('drop policy if exists "Authenticated users can create organizations"');
  });
});
