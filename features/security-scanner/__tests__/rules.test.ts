import { describe, expect, it } from "vitest";
import { RuleRegistry, scanRepository, type ScanRule } from "../index";

describe("critical deterministic rules", () => {
  it("finds exposed and client-public secrets with redacted evidence", async () => {
    const result = await scanRepository([
      { path: ".env", content: "STRIPE_SECRET_KEY=sk_live_abcdefghijklmnopqrstuvwxyz\nNEXT_PUBLIC_API_SECRET=very-secret-value" },
      { path: "config.ts", content: "const SERVICE_API_KEY = 'hardcoded-production-key'" },
    ]);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["secrets.exposed", "secrets.public-env"]),
    );
    expect(result.findings.map((finding) => finding.evidence).join(" ")).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(result.findings.map((finding) => finding.evidence).join(" ")).not.toContain("very-secret-value");
    expect(result.findings.map((finding) => finding.evidence).join(" ")).not.toContain("hardcoded-production-key");
  });

  it("detects injection primitives", async () => {
    const result = await scanRepository([
      { path: "api/users.ts", content: "db.query(`SELECT * FROM users WHERE id = ${req.query.id}`)\nexec(`convert ${req.body.name}`)\nreadFile(req.query.path)" },
    ]);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["injection.sql", "injection.command", "injection.path-traversal"]),
    );
  });

  it("detects platform authorization and browser risks", async () => {
    const result = await scanRepository([
      { path: "database/policy.sql", content: "ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;\nCREATE POLICY open ON notes USING (true);" },
      { path: "firestore.rules", content: "allow read, write: if true;" },
      { path: "components/Preview.tsx", content: "return <div dangerouslySetInnerHTML={{ __html: userHtml }} />" },
      { path: "server/cors.ts", content: "app.use(cors({ origin: '*' }))" },
      { path: "server/jwt.ts", content: "jwt.verify(token, key, { algorithms: ['none'] })" },
    ]);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "supabase.rls", "firebase.rules", "web.next-xss", "web.permissive-cors", "auth.insecure-jwt",
      ]),
    );
  });

  it("detects a service-role reference in client code and missing RLS", async () => {
    const result = await scanRepository([
      {
        path: "components/Admin.tsx",
        content: '"use client";\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;',
      },
      {
        path: "database/users.sql",
        content: "CREATE TABLE public.user_profiles (id uuid primary key);",
      },
    ]);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["supabase.service-role-client", "supabase.rls-missing"]),
    );
    expect(result.findings.map((finding) => finding.evidence).join(" ")).not.toContain(
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
    );
  });

  it("does not flag example env files, docs, or identifier assignments as hard-coded secrets", async () => {
    const result = await scanRepository([
      {
        path: ".env.example",
        content:
          "GITHUB_WEBHOOK_SECRET=generate-a-long-random-secret\nSUPABASE_SERVICE_ROLE_KEY=your-service-role-key",
      },
      { path: "README.md", content: '"SEQURAI_API_KEY": "seq_live_...",' },
      { path: "brain/production-journey/focus.ts", content: 'secrets: "focus.secretManagement",' },
      {
        path: "brain/production-verdict/status-rules.ts",
        content: "const exposedSecret = input.findings.some((f) => f.title.includes('secret'));",
      },
      { path: "app/api/webhooks/github/route.ts", content: "const secret = webhookSecret();" },
      { path: "app/api/github/connect/route.ts", content: "accessToken: providerToken," },
      { path: "config.ts", content: "const SERVICE_API_KEY = 'hardcoded-production-key';" },
    ]);
    const exposed = result.findings.filter((finding) => finding.ruleId === "secrets.exposed");
    expect(exposed).toHaveLength(1);
    expect(exposed[0]?.location.path).toBe("config.ts");
  });

  it("reports capability catalog entries without CVE claims", async () => {
    const result = await scanRepository([
      { path: "package.json", content: '{"dependencies":{"vm2":"1.0.0","other":"git+https://example.invalid/repo.git"}}' },
    ]);
    const dependencyFindings = result.findings.filter((finding) => finding.ruleId === "dependencies.local-catalog");
    expect(dependencyFindings).toHaveLength(2);
    expect(dependencyFindings.every((finding) => finding.metadata?.claimsCve === false)).toBe(true);
    expect(dependencyFindings.some((finding) => /CVE/i.test(finding.description))).toBe(false);
  });
});

describe("rule isolation", () => {
  it("continues after a rule throws", async () => {
    const broken: ScanRule = { id: "a.broken", title: "broken", run: () => { throw new Error("failure"); } };
    const healthy: ScanRule = {
      id: "b.healthy", title: "healthy",
      run: () => [{
        ruleId: "b.healthy", title: "Found", description: "Found", severity: "low", confidence: "high",
        category: "test", location: { path: "a.ts", line: 1 }, remediation: "Fix",
      }],
    };
    const result = await scanRepository([{ path: "a.ts", content: "x" }], {
      registry: new RuleRegistry([broken, healthy]),
    });
    expect(result.findings).toHaveLength(1);
    expect(result.metrics.ruleFailures).toBe(1);
    expect(result.omissions).toContainEqual(expect.objectContaining({ reason: "rule-error", ruleId: "a.broken" }));
  });
});
