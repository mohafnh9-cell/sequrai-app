type ResumeInput = {
  hasProjects: boolean;
  firstProjectId?: string | null;
  githubConnected?: boolean;
};

/** Where to send a user who has a workspace but no Production Verdict yet. */
export function onboardingResumePath(input: ResumeInput): string {
  if (input.hasProjects && input.firstProjectId) {
    return `/onboarding?step=review&projectId=${input.firstProjectId}`;
  }
  if (input.githubConnected) {
    return "/onboarding?step=repository";
  }
  return "/onboarding?step=github";
}
