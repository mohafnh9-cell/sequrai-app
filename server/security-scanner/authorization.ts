export type RepositoryAccessInput = {
  authenticatedUserId: string;
  projectOrganizationId: string;
  membership:
    | { user_id: string; organization_id: string }
    | null
    | undefined;
};

export function canAccessRepository(input: RepositoryAccessInput): boolean {
  return Boolean(
    input.authenticatedUserId &&
      input.projectOrganizationId &&
      input.membership?.user_id === input.authenticatedUserId &&
      input.membership.organization_id === input.projectOrganizationId
  );
}
