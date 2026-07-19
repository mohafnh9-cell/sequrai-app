import { describe, expect, it } from "vitest";
import { buildProductionJourney } from "@/brain/production-journey";
import { ProductionJourneySchema } from "@/brain/production-journey/schema";
import { createFakeAdmin } from "@/server/mcp/__tests__/fake-admin";
import { buildVerdictFixture, verdictRow } from "@/server/mcp/__tests__/verdict-fixture";
import { loadVerdictJourneyRecords } from "../load-verdicts";

const PROJECT_1 = "11111111-1111-4111-8111-111111111111";

describe("loadVerdictJourneyRecords", () => {
  it("normalizes PostgREST's '+00:00'-offset timestamptz values to a strict ISO 'Z' string", async () => {
    const verdict = buildVerdictFixture();
    const row = verdictRow(PROJECT_1, verdict);
    // PostgREST returns timestamptz columns like "2026-01-02 03:04:05.678+00",
    // not the "...Z" form Date#toISOString() produces. Simulate that here.
    const admin = createFakeAdmin({
      production_verdicts: [{ ...row, generated_at: "2026-01-02T03:04:05.678+00:00" }],
    });

    const { records } = await loadVerdictJourneyRecords(admin as never, PROJECT_1);

    expect(records).toHaveLength(1);
    expect(records[0].generatedAt).toBe("2026-01-02T03:04:05.678Z");
  });

  it("lets buildProductionJourney succeed end-to-end against offset-formatted timestamps (regression for the production_history MCP bug)", async () => {
    const older = buildVerdictFixture({ score: 58, generatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = buildVerdictFixture({ score: 91, generatedAt: "2026-01-05T00:00:00.000Z" });

    const admin = createFakeAdmin({
      production_verdicts: [
        { ...verdictRow(PROJECT_1, older), generated_at: "2026-01-01T00:00:00+00:00" },
        { ...verdictRow(PROJECT_1, newer), generated_at: "2026-01-05T00:00:00+00:00" },
      ],
    });

    const { records } = await loadVerdictJourneyRecords(admin as never, PROJECT_1);
    const journey = buildProductionJourney(records);

    // The original bug threw inside ProductionJourneySchema.parse (called by
    // buildProductionJourney itself) before this assertion was ever reached.
    expect(() => ProductionJourneySchema.parse(journey)).not.toThrow();
    expect(journey.currentScore).toBe(91);
    expect(journey.firstReviewedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(journey.lastReviewedAt).toBe("2026-01-05T00:00:00.000Z");
  });
});
