import "server-only";

export function buildProjectReportUrl(projectId: string): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;
  return `${appUrl.replace(/\/$/, "")}/projects/${projectId}`;
}

export function buildProjectHistoryUrl(projectId: string): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;
  return `${appUrl.replace(/\/$/, "")}/projects/${projectId}?tab=history`;
}
