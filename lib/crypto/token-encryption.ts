import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function encryptionKey(): Buffer | null {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  }
  return key;
}

export function isTokenEncryptionEnabled(): boolean {
  return Boolean(process.env.GITHUB_TOKEN_ENCRYPTION_KEY);
}

export function encryptToken(plaintext: string): string {
  const key = encryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64url");
  return `${PREFIX}${payload}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;

  const key = encryptionKey();
  if (!key) {
    throw new Error("Encrypted GitHub token found but GITHUB_TOKEN_ENCRYPTION_KEY is not set");
  }

  const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
