const VALUE_ASSIGNMENT = /((?:api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*["']?)([^"'\s,;]{4,})/gi;
const KNOWN_TOKEN = /\b(?:sk_(?:live|test)_[A-Za-z0-9]{8,}|gh[oprsu]_[A-Za-z0-9_]{12,}|AKIA[A-Z0-9]{12,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g;

export function maskSecret(value: string): string {
  if (value.length <= 6) return "[REDACTED]";
  return `${value.slice(0, 3)}…${value.slice(-2)}`;
}

export function redactEvidence(value: string, maxLength = 240): string {
  const redacted = value
    .replace(VALUE_ASSIGNMENT, (_, prefix: string, secret: string) => `${prefix}${maskSecret(secret)}`)
    .replace(KNOWN_TOKEN, (secret) => maskSecret(secret));
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}…` : redacted;
}
