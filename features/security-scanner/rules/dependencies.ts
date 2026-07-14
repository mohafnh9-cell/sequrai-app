import type { FindingDraft } from "../types";
import type { ScanRule } from "./types";

export interface DependencyCatalogEntry {
  package: string;
  risk: string;
  recommendation: string;
  obsoleteBefore?: string;
}

// Capability-based review catalog only. It deliberately contains no CVE claims or
// vulnerable-version ranges; those require a current, authoritative advisory feed.
export const LOCAL_DEPENDENCY_CATALOG: readonly DependencyCatalogEntry[] = [
  {
    package: "node-serialize",
    risk: "Deserializing untrusted data can invoke executable JavaScript behavior.",
    recommendation: "Use JSON data and explicit schema validation instead of executable serialization.",
  },
  {
    package: "vm2",
    risk: "In-process isolation is not a security boundary for untrusted code.",
    recommendation: "Do not execute untrusted code, or isolate it outside the application process.",
  },
  {
    package: "shelljs",
    risk: "Shell command helpers require strict separation of commands and untrusted input.",
    recommendation: "Prefer non-shell APIs and allowlisted argument arrays.",
  },
  {
    package: "next",
    obsoleteBefore: "14.0.0",
    risk: "This major line is outside the local baseline maintained for the scanner.",
    recommendation: "Plan and test an upgrade to a currently supported Next.js release.",
  },
  {
    package: "jsonwebtoken",
    obsoleteBefore: "9.0.0",
    risk: "This major line is outside the local baseline maintained for the scanner.",
    recommendation: "Upgrade to a supported major version after reviewing its migration notes.",
  },
];

export const dependencyRule: ScanRule = {
  id: "dependencies.local-catalog",
  title: "Dependency risk catalog",
  run: ({ getFile }) => {
    const file = getFile("package.json");
    if (!file) return [];
    let manifest: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    try {
      manifest = JSON.parse(file.content) as typeof manifest;
    } catch {
      return [];
    }
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
    };
    const findings: FindingDraft[] = [];
    for (const entry of LOCAL_DEPENDENCY_CATALOG) {
      const installed = dependencies[entry.package];
      if (!installed) continue;
      if (entry.obsoleteBefore && !isClearlyOlder(installed, entry.obsoleteBefore)) continue;
      findings.push({
        ruleId: "dependencies.local-catalog",
        title: entry.obsoleteBefore
          ? `Outdated dependency baseline: ${entry.package}`
          : `Review security-sensitive dependency: ${entry.package}`,
        description: entry.risk,
        severity: entry.obsoleteBefore ? "low" : "info",
        confidence: "high",
        category: "dependencies",
        location: { path: file.path, line: lineOf(file.content, `"${entry.package}"`) },
        evidence: `${entry.package}: ${installed}`,
        remediation: entry.recommendation,
        fingerprintMaterial: entry.package,
        metadata: {
          advisorySource: "local-baseline",
          claimsCve: false,
          ...(entry.obsoleteBefore ? { minimumBaseline: entry.obsoleteBefore } : {}),
        },
      });
    }
    for (const [name, version] of Object.entries(dependencies)) {
      if (!/^(?:https?:|git\+|git:|github:)/i.test(version)) continue;
      findings.push({
        ruleId: "dependencies.local-catalog",
        title: `Non-registry dependency: ${name}`,
        description: "A dependency is installed directly from a remote URL or VCS reference, reducing lockfile provenance guarantees.",
        severity: "low",
        confidence: "high",
        category: "supply-chain",
        location: { path: file.path, line: lineOf(file.content, `"${name}"`) },
        evidence: `${name}: remote reference`,
        remediation: "Pin an immutable commit and verify provenance, or use a trusted registry release.",
        fingerprintMaterial: name,
        metadata: { claimsCve: false },
      });
    }
    return findings;
  },
};

function lineOf(content: string, value: string): number {
  const index = content.indexOf(value);
  return index < 0 ? 1 : content.slice(0, index).split("\n").length;
}

function isClearlyOlder(versionRange: string, baseline: string): boolean {
  const installed = versionRange.match(/\d+(?:\.\d+){0,2}/)?.[0];
  if (!installed) return false;
  const left = installed.split(".").map(Number);
  const right = baseline.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}
