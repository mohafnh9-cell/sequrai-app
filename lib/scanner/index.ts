import type { ScanFinding, ScanResult } from "@/types";

// ─── Pattern-based security scanner (Phase 1 - Mock/Semi-real) ───────────────
//
// Architecture is designed to be replaced with real AST-based analysis in v2.
// Each detector returns an array of findings. The engine composes them.

// Exposed secrets patterns
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?[a-zA-Z0-9._-]{20,}/g, label: "Supabase Service Role Key" },
  { pattern: /sk-[a-zA-Z0-9]{48}/g, label: "OpenAI API Key" },
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, label: "Stripe Live Secret Key" },
  { pattern: /GITHUB_TOKEN\s*=\s*["']?gh[ps]_[a-zA-Z0-9]{36}/g, label: "GitHub Token" },
  { pattern: /AWS_SECRET_ACCESS_KEY\s*=\s*["']?[a-zA-Z0-9+/]{40}/g, label: "AWS Secret Key" },
  { pattern: /password\s*[:=]\s*["'][^"']{8,}/gi, label: "Hardcoded Password" },
  { pattern: /api[_-]?key\s*[:=]\s*["'][a-zA-Z0-9._-]{16,}/gi, label: "API Key in code" },
  { pattern: /private[_-]?key\s*[:=]\s*["'][^"']{20,}/gi, label: "Private Key" },
];

// Vulnerable dependency patterns (simplified CVE simulation)
const VULNERABLE_DEPS: Record<string, { version: string; cve: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" }> = {
  "lodash": { version: "<4.17.21", cve: "CVE-2021-23337", severity: "HIGH" },
  "axios": { version: "<1.6.0", cve: "CVE-2023-45857", severity: "MEDIUM" },
  "express": { version: "<4.19.0", cve: "CVE-2024-29041", severity: "MEDIUM" },
  "next": { version: "<14.1.0", cve: "CVE-2024-34351", severity: "HIGH" },
  "jsonwebtoken": { version: "<9.0.0", cve: "CVE-2022-23529", severity: "HIGH" },
  "sharp": { version: "<0.32.6", cve: "CVE-2023-4863", severity: "CRITICAL" },
};

export function detectSecrets(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const { pattern, label } of SECRET_PATTERNS) {
    const matches = code.match(pattern);
    if (matches) {
      const lines = code.split("\n");
      const lineNumber = lines.findIndex((line) => pattern.test(line)) + 1;
      pattern.lastIndex = 0;

      findings.push({
        severity: "CRITICAL",
        category: "SECRETS",
        title: `Exposed ${label}`,
        description: `A ${label} was found hardcoded in your source code. This credential could be extracted by anyone with access to the repository.`,
        impact:
          "An attacker who gains access to this key can impersonate your application, access or modify data, incur costs, or take over accounts.",
        recommendation: `1. Immediately rotate/revoke the exposed credential.\n2. Move it to environment variables (process.env.YOUR_KEY).\n3. Never commit .env files — add them to .gitignore.\n4. Consider using a secrets scanner in your CI/CD pipeline.`,
        filePath: filePath ?? "Unknown file",
        lineNumber: lineNumber > 0 ? lineNumber : undefined,
        codeSnippet: matches[0]?.substring(0, 100),
      });
    }
  }

  return findings;
}

export function detectCORSIssues(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  const wildcardCors = /Access-Control-Allow-Origin['":\s]+\*/g;
  const corsAnyOrigin = /origin:\s*['"]?\*['"]?/gi;

  if (wildcardCors.test(code) || corsAnyOrigin.test(code)) {
    findings.push({
      severity: "HIGH",
      category: "CORS",
      title: "Permissive CORS Policy (Wildcard Origin)",
      description:
        "Your application allows requests from any origin (*). This means any website can make authenticated requests to your API on behalf of your users.",
      impact:
        "Cross-site request forgery (CSRF) attacks, data theft, and unauthorized API access from malicious websites.",
      recommendation:
        "1. Replace * with specific allowed origins.\n2. Use an allowlist: ['https://yourdomain.com', 'https://staging.yourdomain.com'].\n3. Never use * with credentials (withCredentials: true).",
      filePath: filePath ?? "API configuration",
    });
  }

  return findings;
}

export function detectMissingSecurityHeaders(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  const hasCSP = /Content-Security-Policy/i.test(code);
  const hasHSTS = /Strict-Transport-Security/i.test(code);
  const hasXFrame = /X-Frame-Options/i.test(code);
  const hasXContentType = /X-Content-Type-Options/i.test(code);

  const missing: string[] = [];
  if (!hasCSP) missing.push("Content-Security-Policy (CSP)");
  if (!hasHSTS) missing.push("Strict-Transport-Security (HSTS)");
  if (!hasXFrame) missing.push("X-Frame-Options");
  if (!hasXContentType) missing.push("X-Content-Type-Options");

  if (missing.length > 0) {
    findings.push({
      severity: "MEDIUM",
      category: "CONFIG",
      title: `Missing Security Headers: ${missing.slice(0, 2).join(", ")}`,
      description: `Your application is missing critical HTTP security headers: ${missing.join(", ")}.`,
      impact:
        "Increased attack surface for XSS, clickjacking, MIME sniffing attacks, and protocol downgrade attacks.",
      recommendation: `Add these headers to your Next.js config:\n\nasync headers() {\n  return [{\n    source: '/(.*)',\n    headers: [\n      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },\n      { key: 'X-Content-Type-Options', value: 'nosniff' },\n      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },\n    ]\n  }]\n}`,
      filePath: filePath ?? "next.config.ts",
    });
  }

  return findings;
}

export function detectSQLInjection(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  // Detect string interpolation in SQL-like queries
  const patterns = [
    /\$\{[^}]+\}.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)/gi,
    /(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM).*\$\{[^}]+\}/gi,
    /query\s*\(\s*[`"'].*\$\{/gi,
    /\.raw\s*\(\s*[`"'].*\$\{/gi,
    /prisma\.\$queryRaw.*\$\{/gi,
  ];

  for (const pattern of patterns) {
    if (pattern.test(code)) {
      const lines = code.split("\n");
      const lineNumber = lines.findIndex((line) => new RegExp(pattern.source, "gi").test(line)) + 1;

      findings.push({
        severity: "CRITICAL",
        category: "SQL_INJECTION",
        title: "Potential SQL Injection via String Interpolation",
        description:
          "User-controlled data appears to be directly interpolated into a SQL query without parameterization.",
        impact:
          "An attacker can manipulate the SQL query to bypass authentication, extract all data, modify or delete records, or execute commands on the database server.",
        recommendation:
          "Always use parameterized queries or prepared statements:\n\n// Bad:\nconst result = await db.query(`SELECT * FROM users WHERE id = ${userId}`)\n\n// Good (Prisma):\nconst result = await prisma.user.findUnique({ where: { id: userId } })\n\n// Good (raw with params):\nconst result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`",
        filePath: filePath ?? "Database query",
        lineNumber: lineNumber > 0 ? lineNumber : undefined,
      });
      break;
    }
  }

  return findings;
}

export function detectSupabaseRLSIssues(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  // Detect service role key usage in client-side code
  const serviceRoleInClient = /createClient.*service_role|service_role.*createClient/gi;
  const disabledRLS = /disable\s+row\s+level\s+security|rls\s+disabled/gi;
  const noRLSComment = /TODO.*rls|FIXME.*rls|rls.*todo/gi;

  if (serviceRoleInClient.test(code)) {
    findings.push({
      severity: "CRITICAL",
      category: "SUPABASE_RLS",
      title: "Supabase Service Role Key Used in Client-Side Code",
      description:
        "The Supabase service_role key bypasses Row Level Security and is being used in client-accessible code.",
      impact:
        "Complete database access without any authorization checks. Any user can read, modify, or delete all data in your database.",
      recommendation:
        "1. Never use SUPABASE_SERVICE_ROLE_KEY in client-side code.\n2. Use NEXT_PUBLIC_SUPABASE_ANON_KEY for client access.\n3. Use service role key only in server-side code (API routes, server actions).\n4. Implement proper RLS policies for all tables.",
      filePath: filePath ?? "Supabase client",
    });
  }

  if (disabledRLS.test(code)) {
    findings.push({
      severity: "HIGH",
      category: "SUPABASE_RLS",
      title: "Row Level Security (RLS) Disabled",
      description:
        "A Supabase table has Row Level Security explicitly disabled, allowing any authenticated or anonymous user to access all rows.",
      impact:
        "Users can access data belonging to other users. Complete data isolation is broken.",
      recommendation:
        "1. Enable RLS: ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;\n2. Create appropriate policies for SELECT, INSERT, UPDATE, DELETE.\n3. Example: CREATE POLICY 'Users see own data' ON profiles FOR SELECT USING (auth.uid() = user_id);",
      filePath: filePath ?? "Database migration",
    });
  }

  return findings;
}

export function detectFirebaseIssues(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  const insecureRule = /allow\s+read\s*,\s*write\s*:\s*if\s+true/g;
  const publicRead = /allow\s+read\s*:\s*if\s+true/g;

  if (insecureRule.test(code)) {
    findings.push({
      severity: "CRITICAL",
      category: "FIREBASE_RULES",
      title: "Firebase Rules: Public Read/Write Access",
      description:
        'Firebase security rules allow anyone to read and write all data (`allow read, write: if true`).',
      impact:
        "Anyone on the internet can read, modify, or delete all your Firebase data without authentication.",
      recommendation:
        "Replace insecure rules with authentication checks:\n\n// Bad:\nallow read, write: if true;\n\n// Good:\nallow read, write: if request.auth != null;\n\n// Better (only own data):\nallow read, write: if request.auth.uid == resource.data.userId;",
      filePath: filePath ?? "firestore.rules",
    });
  } else if (publicRead.test(code)) {
    findings.push({
      severity: "HIGH",
      category: "FIREBASE_RULES",
      title: "Firebase Rules: Public Read Access",
      description: "Firebase security rules allow anyone to read data without authentication.",
      impact: "All your Firebase data is publicly readable without any authentication.",
      recommendation:
        "Add authentication requirement to read rules:\nallow read: if request.auth != null;",
      filePath: filePath ?? "firestore.rules",
    });
  }

  return findings;
}

export function detectAuthIssues(code: string, filePath?: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  // Missing auth checks in API routes
  const hasAuthCheck =
    /getUser|getSession|auth\.user|currentUser|requireAuth|withAuth|auth\(\)/gi.test(code);
  const isApiRoute = /export.*(?:GET|POST|PUT|DELETE|PATCH)/g.test(code);
  const accessesDB =
    /prisma\.|supabase\.|db\.|mongoose\.|sequelize\./gi.test(code);

  if (isApiRoute && accessesDB && !hasAuthCheck) {
    findings.push({
      severity: "HIGH",
      category: "AUTH",
      title: "API Route Lacks Authentication Check",
      description:
        "An API route accesses the database without verifying the user's identity or session.",
      impact:
        "Unauthenticated users could access, modify, or delete data. Potential complete data breach.",
      recommendation:
        "Add authentication check at the start of every protected API route:\n\nconst { data: { user } } = await supabase.auth.getUser();\nif (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });",
      filePath: filePath ?? "API route",
    });
  }

  return findings;
}

// ─── Package.json vulnerability scanner ──────────────────────────────────────

export function detectVulnerableDependencies(packageJson: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(packageJson);
  } catch {
    return findings;
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  for (const [depName, vulnInfo] of Object.entries(VULNERABLE_DEPS)) {
    if (allDeps[depName]) {
      findings.push({
        severity: vulnInfo.severity,
        category: "DEPENDENCIES",
        title: `Vulnerable Dependency: ${depName}`,
        description: `${depName} has a known vulnerability (${vulnInfo.cve}). Affected versions: ${vulnInfo.version}.`,
        impact: `Security vulnerability in ${depName} could be exploited to compromise your application.`,
        recommendation: `Update ${depName} to the latest version:\n\nnpm update ${depName}\n\nor specify a safe version in package.json.`,
        filePath: "package.json",
      });
    }
  }

  return findings;
}

// ─── Calculate security score ─────────────────────────────────────────────────

export function calculateScore(findings: ScanFinding[]): number {
  if (findings.length === 0) return 100;

  const deductions = findings.reduce((total, finding) => {
    switch (finding.severity) {
      case "CRITICAL":
        return total + 25;
      case "HIGH":
        return total + 15;
      case "MEDIUM":
        return total + 8;
      case "LOW":
        return total + 3;
      default:
        return total;
    }
  }, 0);

  return Math.max(0, 100 - deductions);
}

// ─── Main scanner entry point ─────────────────────────────────────────────────

export async function runSecurityScan(input: {
  repoUrl?: string;
  projectName: string;
  // In mock mode, we use sample code. In real mode, we'd fetch from GitHub.
  sampleCode?: string;
  packageJsonContent?: string;
}): Promise<ScanResult> {
  const findings: ScanFinding[] = [];

  // Use provided code or generate mock findings based on project type
  const codeToScan = input.sampleCode ?? generateMockCode(input.projectName);
  const packageJson = input.packageJsonContent ?? generateMockPackageJson();

  // Run all detectors
  findings.push(...detectSecrets(codeToScan, "src/lib/supabase.ts"));
  findings.push(...detectCORSIssues(codeToScan, "next.config.ts"));
  findings.push(...detectMissingSecurityHeaders(codeToScan, "next.config.ts"));
  findings.push(...detectSQLInjection(codeToScan, "app/api/users/route.ts"));
  findings.push(...detectSupabaseRLSIssues(codeToScan, "lib/supabase/client.ts"));
  findings.push(...detectFirebaseIssues(codeToScan, "firestore.rules"));
  findings.push(...detectAuthIssues(codeToScan, "app/api/data/route.ts"));
  findings.push(...detectVulnerableDependencies(packageJson));

  const score = calculateScore(findings);
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;

  const summary =
    findings.length === 0
      ? "No security issues detected. Your project looks secure!"
      : `Found ${findings.length} security issue${findings.length !== 1 ? "s" : ""}: ${criticalCount} critical, ${highCount} high. Security score: ${score}/100.`;

  return { findings, score, summary };
}

// ─── Mock code generator (used when no real code is available) ────────────────

function generateMockCode(projectName: string): string {
  // Intentionally contains some vulnerabilities for demo purposes
  return `
// ${projectName} - Sample code for security analysis

import { createClient } from '@supabase/supabase-js'

// Potential issue: service role key in client code
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  
)

// CORS configuration
export async function middleware(req) {
  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}

// API route without auth check
export async function GET(req) {
  const users = await prisma.user.findMany()
  return Response.json(users)
}

// SQL with string interpolation
async function getUser(userId) {
  const result = await db.query(\`SELECT * FROM users WHERE id = \${userId}\`)
  return result
}
`;
}

function generateMockPackageJson(): string {
  return JSON.stringify({
    dependencies: {
      next: "13.5.0",
      react: "18.2.0",
      "react-dom": "18.2.0",
      lodash: "4.17.20",
      axios: "1.3.0",
    },
    devDependencies: {
      typescript: "5.0.0",
    },
  });
}
