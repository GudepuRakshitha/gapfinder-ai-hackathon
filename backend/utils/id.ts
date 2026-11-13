import { createHash, randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

/**
 * Stable UUID-shaped id derived from a namespace and a natural key.
 * Used so re-analysing the same syllabus updates topics in place instead of
 * orphaning quiz history and mastery records.
 */
export function deterministicId(...parts: string[]): string {
  const hash = createHash("sha1").update(parts.join("::")).digest();
  const hex = hash.toString("hex").slice(0, 32).split("");
  // RFC 4122 version 5 style bits
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20, 32),
  ].join("-");
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
