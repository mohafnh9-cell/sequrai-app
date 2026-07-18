import type { DemoScenarioId } from "./scenarios";

export function demoHref(path: string, scenario: DemoScenarioId): string {
  if (path === "/" || path === "") {
    return `/demo?scenario=${encodeURIComponent(scenario)}`;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const demoPath = normalized.startsWith("/demo") ? normalized : `/demo${normalized}`;
  const [pathname, existingQuery = ""] = demoPath.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set("scenario", scenario);
  return `${pathname}?${params.toString()}`;
}

export function demoProjectPath(
  projectId: string,
  scenario: DemoScenarioId,
  suffix = ""
): string {
  return demoHref(`/projects/${projectId}${suffix}`, scenario);
}
