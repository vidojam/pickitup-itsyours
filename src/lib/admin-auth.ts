import { cookies } from "next/headers";

export const ADMIN_COOKIE = "pickitup_admin";

export const DEFAULT_ADMIN_USERNAME = "admin";

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET environment variable.");
  }
  return secret;
}

function createTokenValue() {
  return `${getSessionSecret()}:pickitup-admin`;
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("Missing ADMIN_PASSWORD environment variable.");
  }
  return password === expected;
}

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
}

export function verifyAdminCredentials(username: string, password: string) {
  return username === getAdminUsername() && verifyAdminPassword(password);
}

export function getAdminToken() {
  return createTokenValue();
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  return value === createTokenValue();
}
