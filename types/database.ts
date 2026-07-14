// ─── Supabase Database Types ─────────────────────────────────────────────────
// These types mirror the Supabase schema exactly.
// Generated manually to avoid Supabase CLI dependency during development.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrgPlan = "FREE" | "BUILDER" | "STUDIO" | "AGENCY";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type ProjectFramework =
  | "NEXTJS"
  | "REACT"
  | "VUE"
  | "SVELTE"
  | "NUXT"
  | "REMIX"
  | "ASTRO"
  | "OTHER";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid";

// ─── Row Types (what comes out of the DB) ────────────────────────────────────

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
  production_url: string | null;
  framework: ProjectFramework | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: OrgPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Insert Types (what you send to create a row) ────────────────────────────

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at">;
export type OrganizationInsert = Omit<OrganizationRow, "id" | "created_at" | "updated_at" | "logo_url"> & {
  id?: string;
  logo_url?: string | null;
};
export type OrganizationMemberInsert = Omit<OrganizationMemberRow, "id" | "created_at"> & {
  id?: string;
};
export type ProjectInsert = Omit<ProjectRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type SubscriptionInsert = Omit<SubscriptionRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

// ─── Update Types ─────────────────────────────────────────────────────────────

export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at">>;
export type OrganizationUpdate = Partial<Omit<OrganizationRow, "id" | "created_at">>;
export type ProjectUpdate = Partial<Omit<ProjectRow, "id" | "organization_id" | "created_at">>;
export type SubscriptionUpdate = Partial<Omit<SubscriptionRow, "id" | "organization_id" | "created_at">>;

// ─── Joined / Extended Types ──────────────────────────────────────────────────

export type ProjectWithOrg = ProjectRow & {
  organization: OrganizationRow;
};

export type OrganizationWithMembership = OrganizationRow & {
  membership: OrganizationMemberRow;
  member_count: number;
  project_count: number;
};

export type MemberWithProfile = OrganizationMemberRow & {
  profile: ProfileRow;
};

// ─── UI / App Types ───────────────────────────────────────────────────────────

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isNew?: boolean;
  comingSoon?: boolean;
};

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

export type DashboardStats = {
  totalProjects: number;
  criticalIssues: number;
  securityScore: number | null;
  recentActivity: number;
};

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

// ─── Scanner types (reserved for future implementation) ───────────────────────

export type ScanFinding = {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category:
    | "SECRETS"
    | "SQL_INJECTION"
    | "XSS"
    | "CORS"
    | "SUPABASE_RLS"
    | "FIREBASE_RULES"
    | "DEPENDENCIES"
    | "AUTH"
    | "API_SECURITY"
    | "CONFIG";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  filePath?: string;
  lineNumber?: number;
  codeSnippet?: string;
};

export type ScanResult = {
  findings: ScanFinding[];
  score: number;
  summary: string;
};
