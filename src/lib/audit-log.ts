import { getDb } from "./db";

export type AuditAction =
  | "login.success"
  | "login.failure"
  | "login.rate_limited"
  | "admin.logout"
  | "admin.item_created"
  | "admin.refund"
  | "payment.reserved"
  | "payment.decision"
  | "webhook.authorized"
  | "webhook.finalized"
  | "webhook.canceled";

export function auditLog(
  action: AuditAction,
  ip: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    getDb()
      .prepare("INSERT INTO audit_log (ts, action, ip, details) VALUES (?, ?, ?, ?)")
      .run(new Date().toISOString(), action, ip ?? null, JSON.stringify(details));
  } catch {
    // Audit log failure must never disrupt request handling.
  }
}
