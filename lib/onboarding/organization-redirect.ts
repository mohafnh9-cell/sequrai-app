export function resolveOrganizationRedirect(step?: string | null): string {
  const nextStep = step?.trim() || "github";
  return `/onboarding?step=${nextStep}`;
}
