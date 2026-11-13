import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algorithm, salt, hash] = stored.split("$");
    if (algorithm !== "scrypt" || !salt || !hash) return false;
    const derived = scryptSync(password, salt, KEY_LENGTH);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
