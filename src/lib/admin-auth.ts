import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifySessionToken } from "./admin-session-token";
import { isAdminSessionActive } from "./admin-sessions";

export const ADMIN_COOKIE = "pickitup_admin";

export const DEFAULT_ADMIN_USERNAME = "admin";

// Hash both sides to equal length so timingSafeEqual is usable on arbitrary strings.
function safeStringEqual(a: string, b: string) {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

// Expected format: scrypt:<base64 salt>:<base64 hash> (see scripts/hash-admin-password.mjs)
function verifyScryptHash(password: string, stored: string) {
  const [scheme, saltB64, hashB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) {
    throw new Error("Invalid ADMIN_PASSWORD_HASH format. Expected scrypt:<salt>:<hash>.");
  }
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function verifyAdminPassword(password: string) {
  const hashed = process.env.ADMIN_PASSWORD_HASH;
  if (hashed) {
    return verifyScryptHash(password, hashed);
  }

  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) {
    throw new Error("Missing ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) environment variable.");
  }
  return safeStringEqual(password, plain);
}

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
}

export function verifyAdminCredentials(username: string, password: string) {
  // Evaluate both checks unconditionally to avoid a username-probing timing shortcut.
  const usernameOk = safeStringEqual(username, getAdminUsername());
  const passwordOk = verifyAdminPassword(password);
  return usernameOk && passwordOk;
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  if (!value) {
    return false;
  }

  const session = await verifySessionToken(value);
  if (!session) {
    return false;
  }

  return isAdminSessionActive(session.sessionId);
}
