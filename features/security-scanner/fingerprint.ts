// FNV-1a is stable across runtimes and sufficient for non-cryptographic finding identity.
export function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function findingFingerprint(ruleId: string, path: string, line: number, material = ""): string {
  return stableHash(`${ruleId}\0${path.toLowerCase()}\0${line}\0${material.trim().toLowerCase()}`);
}
