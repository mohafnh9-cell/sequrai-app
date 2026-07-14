import { DEFAULT_IGNORED_SEGMENTS, SOURCE_EXTENSIONS } from "./constants";

export interface ScanConfig {
  maxFileBytes: number;
  maxTotalBytes: number;
  maxFiles: number;
  maxDurationMs: number;
  ignoredSegments: string[];
  includeExtensions?: string[];
  now: () => number;
}

export type ScanConfigInput = Partial<Omit<ScanConfig, "now">> & { now?: () => number };

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 10 * 1024 * 1024,
  maxFiles: 2_000,
  maxDurationMs: 5_000,
  ignoredSegments: DEFAULT_IGNORED_SEGMENTS,
  includeExtensions: [...SOURCE_EXTENSIONS],
  now: () => Date.now(),
};

export function resolveConfig(input: ScanConfigInput = {}): ScanConfig {
  return {
    ...DEFAULT_SCAN_CONFIG,
    ...input,
    ignoredSegments: [...(input.ignoredSegments ?? DEFAULT_SCAN_CONFIG.ignoredSegments)],
    now: input.now ?? DEFAULT_SCAN_CONFIG.now,
  };
}
