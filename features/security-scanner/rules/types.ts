import type { FindingDraft, NormalizedFile, StackProfile } from "../types";

export interface RuleContext {
  files: readonly NormalizedFile[];
  stack: StackProfile;
  getFile(path: string): NormalizedFile | undefined;
}

export interface ScanRule {
  id: string;
  title: string;
  run(context: RuleContext): FindingDraft[] | Promise<FindingDraft[]>;
}
