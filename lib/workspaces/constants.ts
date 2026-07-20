export const ACTIVE_WORKSPACE_COOKIE = "sequrai_active_workspace";
export const ACTIVE_WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Optional external documentation URL. When unset, the Documentation menu action is hidden. */
export function getWorkspaceDocumentationUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_DOCS_URL?.trim();
  if (!url) return null;
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}
