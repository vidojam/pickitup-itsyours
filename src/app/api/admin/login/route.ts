import { ADMIN_COOKIE, verifyAdminCredentials } from "@/lib/admin-auth";
import {
  clearFailures,
  getClientKey,
  isRateLimited,
  isSameOrigin,
  recordFailure,
} from "@/lib/login-protection";
import { createAdminSession } from "@/lib/admin-sessions";
import { auditLog } from "@/lib/audit-log";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const clientKey = getClientKey(request);
  const limit = isRateLimited(clientKey);
  if (limit.limited) {
    auditLog("login.rate_limited", clientKey);
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { username?: string; password?: string };

  if (!body.username || !body.password || !verifyAdminCredentials(body.username, body.password)) {
    recordFailure(clientKey);
    auditLog("login.failure", clientKey, { username: body.username ?? "" });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  clearFailures(clientKey);
  auditLog("login.success", clientKey, { username: body.username });
  const { token, expiresAtMs } = await createAdminSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAtMs),
  });
  return response;
}
