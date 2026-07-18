type CategoryGuidance = {
  preserve: string[];
  doNotModify: string[];
  regressionTests: string[];
  buildRequirements: string[];
};

const DEFAULT_GUIDANCE: CategoryGuidance = {
  preserve: [
    "Existing user-facing functionality and navigation flows.",
    "Current API contracts consumed by the frontend.",
    "Database schema unless this issue explicitly requires a migration.",
    "Existing third-party integrations and environment variable names.",
  ],
  doNotModify: [
    "Unrelated files, routes, or components.",
    "Project architecture or folder structure.",
    "Existing business logic outside the affected area.",
    "Styling or UI layout outside what is required for the fix.",
  ],
  regressionTests: [
    "Authorized users can still access protected resources.",
    "Unauthorized users are still blocked appropriately.",
    "Existing happy-path flows continue to work.",
    "Error states remain handled without exposing sensitive data.",
  ],
  buildRequirements: ["npm run build", "npm run typecheck", "npm test", "npm run lint"],
};

const CATEGORY_GUIDANCE: Record<string, Partial<CategoryGuidance>> = {
  authentication: {
    preserve: [
      "Existing sign-in, sign-up, and session refresh flows.",
      "Current auth provider configuration and callback URLs.",
      "User identity fields and session token shape.",
    ],
    regressionTests: [
      "Valid credentials still authenticate successfully.",
      "Invalid credentials are rejected without leaking account details.",
      "Expired or missing sessions redirect to sign-in.",
      "Protected routes remain inaccessible without authentication.",
    ],
  },
  authorization: {
    preserve: [
      "Existing role and permission model.",
      "Row-level security policies for unrelated tables.",
      "API authorization checks on other endpoints.",
    ],
    regressionTests: [
      "Users can only access their own resources.",
      "Cross-tenant or cross-user access attempts are denied.",
      "Admin-only routes remain restricted to authorized roles.",
    ],
  },
  security: {
    preserve: [
      "Public endpoints that are intentionally unauthenticated.",
      "Existing input validation on unrelated forms.",
      "Current logging and monitoring hooks.",
    ],
    regressionTests: [
      "Malicious or malformed input is rejected safely.",
      "Rate limits or throttles apply only to intended endpoints.",
      "No new sensitive data appears in logs or client responses.",
    ],
  },
  data_protection: {
    preserve: [
      "Existing secret and environment variable naming conventions.",
      "Encryption or hashing already applied to unrelated secrets.",
      "Current deployment environment configuration.",
    ],
    doNotModify: [
      "Committed secrets in git history (rotate and remove from active use instead).",
      "Production credentials in client bundles.",
    ],
    regressionTests: [
      "No secrets or service-role keys are exposed in client bundles.",
      "Environment variables are read only on the server where required.",
      "Rotated credentials work in development and production.",
    ],
  },
  secrets: {
    preserve: DEFAULT_GUIDANCE.preserve,
    doNotModify: [
      "Client-side code paths unless moving secret usage server-side.",
      "Git history (rotate credentials; do not rewrite history unless requested).",
    ],
    regressionTests: [
      "Server-only secrets are not importable from client components.",
      "Build output contains no raw API keys or service role tokens.",
    ],
  },
  deployment: {
    preserve: [
      "Current hosting configuration and environment separation.",
      "CI/CD pipeline steps unrelated to this fix.",
      "Production domain and redirect settings.",
    ],
    regressionTests: [
      "Application builds and starts in production mode.",
      "Environment-specific configuration loads correctly.",
      "Health checks and deployment hooks still pass.",
    ],
  },
  database: {
    preserve: [
      "Existing migrations and seed data.",
      "Unrelated table schemas and indexes.",
      "Database connection pooling configuration.",
    ],
    doNotModify: ["Unrelated tables, views, or RLS policies."],
    regressionTests: [
      "Migrations apply cleanly on a fresh database.",
      "Existing queries return expected results.",
      "RLS policies enforce the intended access model.",
    ],
  },
};

export function guidanceForCategory(category: string): CategoryGuidance {
  const key = category.toLowerCase().replace(/\s+/g, "_");
  const match =
    CATEGORY_GUIDANCE[key] ??
    Object.entries(CATEGORY_GUIDANCE).find(([name]) => key.includes(name))?.[1] ??
    {};

  return {
    preserve: match.preserve ?? DEFAULT_GUIDANCE.preserve,
    doNotModify: match.doNotModify ?? DEFAULT_GUIDANCE.doNotModify,
    regressionTests: match.regressionTests ?? DEFAULT_GUIDANCE.regressionTests,
    buildRequirements: match.buildRequirements ?? DEFAULT_GUIDANCE.buildRequirements,
  };
}
