import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

const LINK_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes

// Raw tokens never touch disk — only their SHA-256 hex digest is stored.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminMobileLink(): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_LIFETIME_MS).toISOString();

  const db = getDb();
  db.prepare("DELETE FROM admin_mobile_links WHERE expiresAt <= ?").run(new Date().toISOString());
  db.prepare("INSERT INTO admin_mobile_links (tokenHash, expiresAt) VALUES (?, ?)").run(
    hashToken(token),
    expiresAt,
  );

  return { token, expiresAt };
}

export async function consumeAdminMobileLink(token: string): Promise<boolean> {
  const db = getDb();
  // Single atomic DELETE — no TOCTOU between check and consume.
  const result = db
    .prepare("DELETE FROM admin_mobile_links WHERE tokenHash = ? AND expiresAt > ?")
    .run(hashToken(token), new Date().toISOString());
  return result.changes === 1;
}
