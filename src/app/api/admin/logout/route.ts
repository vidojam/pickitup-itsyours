import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { destroyAdminSession } from "@/lib/admin-sessions";
import { auditLog } from "@/lib/audit-log";
import { getClientKey } from "@/lib/login-protection";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const value = request.cookies.get(ADMIN_COOKIE)?.value;
  if (value) {
    await destroyAdminSession(value);
  }

  auditLog("admin.logout", getClientKey(request));
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: ADMIN_COOKIE, value: "", path: "/", expires: new Date(0) });
  return response;
}
