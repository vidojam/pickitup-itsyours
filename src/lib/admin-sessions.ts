import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(): Promise<{ token: string; expiresAtMs: number }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAtMs = Date.now() + SESSION_LIFETIME_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();

  const db = getDb();
  db.prepare("DELETE FROM admin_sessions WHERE expiresAt <= ?").run(new Date().toISOString());
  db.prepare("INSERT INTO admin_sessions (tokenHash, expiresAt) VALUES (?, ?)").run(
    hashToken(token),
    expiresAt,
  );

  return { token, expiresAtMs };
}

export async function isAdminSessionValid(token: string): Promise<boolean> {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM admin_sessions WHERE tokenHash = ? AND expiresAt > ?")
    .get(hashToken(token), new Date().toISOString());
  return row !== undefined;
}

export async function destroyAdminSession(token: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM admin_sessions WHERE tokenHash = ?").run(hashToken(token));
}
