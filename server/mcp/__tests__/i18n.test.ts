import { describe, expect, it } from "vitest";
import { getMcpTranslator, resolveMcpLocale } from "@/server/mcp/i18n";
import { createFakeAdmin } from "./fake-admin";

describe("resolveMcpLocale", () => {
  it("prefers an explicit locale over the profile locale", async () => {
    const admin = createFakeAdmin({ profiles: [{ id: "user-1", locale: "es" }] });
    const locale = await resolveMcpLocale(admin as never, "user-1", "en");
    expect(locale).toBe("en");
  });

  it("falls back to the API key owner's profile locale", async () => {
    const admin = createFakeAdmin({ profiles: [{ id: "user-1", locale: "es" }] });
    const locale = await resolveMcpLocale(admin as never, "user-1", undefined);
    expect(locale).toBe("es");
  });

  it("falls back to English when no explicit locale or profile locale exists", async () => {
    const admin = createFakeAdmin({ profiles: [] });
    const locale = await resolveMcpLocale(admin as never, "user-1", undefined);
    expect(locale).toBe("en");
  });

  it("ignores an invalid explicit locale", async () => {
    const admin = createFakeAdmin({ profiles: [{ id: "user-1", locale: "es" }] });
    const locale = await resolveMcpLocale(admin as never, "user-1", "fr");
    expect(locale).toBe("es");
  });
});

describe("getMcpTranslator", () => {
  it("returns English copy for the en locale", () => {
    const t = getMcpTranslator("en");
    expect(t("header")).toBe("SEQURAI");
    expect(t("modes.production_review")).toBe("PRODUCTION REVIEW");
  });

  it("returns Spanish copy for the es locale", () => {
    const t = getMcpTranslator("es");
    expect(t("header")).toBe("SEQURAI");
    expect(t("modes.production_review")).toBe("REVISIÓN DE PRODUCCIÓN");
  });

  it("interpolates params in error messages", () => {
    const t = getMcpTranslator("en");
    expect(t("deploymentConfidence.reasons.blockers", { count: 3 })).toContain("3");
  });
});
