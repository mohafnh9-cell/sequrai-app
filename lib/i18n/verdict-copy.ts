import type { VerdictStatus } from "@/brain/production-verdict/schema";
import type { Translator } from "./types";

export function verdictStatusLabel(status: VerdictStatus, t: Translator): string {
  return t(`verdict.status.${status}.label`);
}

export function verdictStatusHeadline(status: VerdictStatus, t: Translator): string {
  return t(`verdict.status.${status}.headline`);
}

export function verdictStatusDescription(status: VerdictStatus, t: Translator): string {
  return t(`verdict.status.${status}.description`);
}

export function verdictStatusMessage(status: VerdictStatus, t: Translator): string {
  return t(`verdict.status.${status}.message`);
}
