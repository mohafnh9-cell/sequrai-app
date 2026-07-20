import "server-only";

export type UserWorkspaceRow = {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
  role: string;
  membership_created_at: string;
};
