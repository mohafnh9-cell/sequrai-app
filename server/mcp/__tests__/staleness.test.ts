import { describe, expect, it } from "vitest";
import { getStalenessInfo } from "@/server/mcp/staleness";
import { createFakeAdmin, type FakeTables } from "./fake-admin";

const PROJECT_1 = "11111111-1111-4111-8111-111111111111";

function tables(overrides: Partial<FakeTables> = {}): FakeTables {
  return {
    projects: [{ id: PROJECT_1, github_repo: "acme/alpha" }],
    github_webhooks: [
      { project_id: PROJECT_1, active: true, callback_url: null, last_delivery_at: "2026-01-01T00:00:00.000Z" },
    ],
    repository_sync_status: [
      { project_id: PROJECT_1, commit_sha: null, connection_status: "connected", last_error: null },
    ],
    repository_scan_state: [],
    scans: [],
    ...overrides,
  };
}

describe("getStalenessInfo", () => {
  it("marks the verdict stale the instant a push is detected — before any scan starts", async () => {
    // repository_sync_status is written immediately on webhook receipt, so a
    // newer detected commit must be visible even with zero scan activity.
    const admin = createFakeAdmin(
      tables({
        repository_sync_status: [
          { project_id: PROJECT_1, commit_sha: "new-sha", connection_status: "connected", last_error: null },
        ],
        repository_scan_state: [],
      })
    );
    const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
    expect(info.freshnessStatus).toBe("stale");
    expect(info.stale).toBe(true);
    expect(info.latestDetectedCommitSha).toBe("new-sha");
    expect(info.reviewInProgress).toBe(false);
  });

  it("reports reviewInProgress while an active scan is running for the detected commit", async () => {
    const admin = createFakeAdmin(
      tables({
        repository_sync_status: [
          { project_id: PROJECT_1, commit_sha: "new-sha", connection_status: "connected", last_error: null },
        ],
        repository_scan_state: [{ repository_id: PROJECT_1, active_scan_id: "scan-1", last_commit_sha: "old-sha" }],
      })
    );
    const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
    expect(info.reviewInProgress).toBe(true);
    expect(info.stale).toBe(true);
  });

  it("preserves the stale state after a scan fails — detected commit must not be discarded", async () => {
    // On failure, scan-job-runner resets active_scan_id to null but leaves
    // last_commit_sha untouched; repository_sync_status.commit_sha (written
    // before the scan ran) still reflects the newer, unreviewed push.
    const admin = createFakeAdmin(
      tables({
        repository_sync_status: [
          { project_id: PROJECT_1, commit_sha: "new-sha", connection_status: "connected", last_error: null },
        ],
        repository_scan_state: [{ repository_id: PROJECT_1, active_scan_id: null, last_commit_sha: "old-sha" }],
      })
    );
    const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
    expect(info.freshnessStatus).toBe("stale");
    expect(info.reviewInProgress).toBe(false);
    expect(info.latestDetectedCommitSha).toBe("new-sha");
  });

  it("clears stale only once the reviewed commit matches the detected commit", async () => {
    const admin = createFakeAdmin(
      tables({
        repository_sync_status: [
          { project_id: PROJECT_1, commit_sha: "new-sha", connection_status: "connected", last_error: null },
        ],
      })
    );
    const stillStale = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
    expect(stillStale.freshnessStatus).toBe("stale");

    const current = await getStalenessInfo(admin as never, PROJECT_1, "new-sha");
    expect(current.freshnessStatus).toBe("current");
    expect(current.stale).toBe(false);
  });

  describe("unknown freshness — never invented as current", () => {
    it("reports unknown when no webhook has ever been registered for a connected repository", async () => {
      const admin = createFakeAdmin(
        tables({ github_webhooks: [], repository_sync_status: [] })
      );
      const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
      expect(info.freshnessStatus).toBe("unknown");
      expect(info.stale).toBe(true);
    });

    it("reports unknown when the registered webhook is inactive", async () => {
      const admin = createFakeAdmin(
        tables({ github_webhooks: [{ project_id: PROJECT_1, active: false, callback_url: null }] })
      );
      const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
      expect(info.freshnessStatus).toBe("unknown");
    });

    it("reports unknown when repository_sync_status shows a connection issue", async () => {
      const admin = createFakeAdmin(
        tables({
          repository_sync_status: [
            { project_id: PROJECT_1, commit_sha: null, connection_status: "connection_issue", last_error: "invalid_github_connection" },
          ],
        })
      );
      const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
      expect(info.freshnessStatus).toBe("unknown");
    });

    it("reports unknown when repository_sync_status has never recorded a push at all", async () => {
      const admin = createFakeAdmin(tables({ repository_sync_status: [] }));
      const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
      expect(info.freshnessStatus).toBe("unknown");
    });

    it("does not treat unconnected (non-GitHub) projects as unknown — there is nothing to detect drift against", async () => {
      const admin = createFakeAdmin(
        tables({
          projects: [{ id: PROJECT_1, github_repo: null }],
          github_webhooks: [],
          repository_sync_status: [],
        })
      );
      const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
      expect(info.freshnessStatus).toBe("current");
    });
  });

  it("reports unknown when the registered webhook's callback URL no longer matches the deployed URL", async () => {
    // The exact real-world regression this fix addresses: a webhook stays
    // "active" and has delivered before, but was registered against a URL
    // (e.g. a stale preview deployment or localhost) that no longer matches
    // what this deployment expects — GitHub can no longer reach it.
    const previous = process.env.GITHUB_WEBHOOK_URL;
    process.env.GITHUB_WEBHOOK_URL = "https://sequrai-app.vercel.app/api/webhooks/github";
    try {
      const admin = createFakeAdmin(
        tables({
          github_webhooks: [
            {
              project_id: PROJECT_1,
              active: true,
              callback_url: "http://localhost:3000/api/webhooks/github",
              last_delivery_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        })
      );
      const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
      expect(info.freshnessStatus).toBe("unknown");
    } finally {
      process.env.GITHUB_WEBHOOK_URL = previous;
    }
  });

  it("treats a failed automatic review for a newer commit as stale, not merely unknown", async () => {
    const admin = createFakeAdmin(
      tables({
        repository_sync_status: [
          { project_id: PROJECT_1, commit_sha: "old-sha", connection_status: "connected", last_error: null },
        ],
        scans: [
          { repository_id: PROJECT_1, review_type: "automatic", status: "failed", commit_sha: "failed-sha", created_at: "2026-02-02" },
        ],
      })
    );
    const info = await getStalenessInfo(admin as never, PROJECT_1, "old-sha");
    expect(info.reviewFailed).toBe(true);
    expect(info.freshnessStatus).toBe("stale");
  });
});
