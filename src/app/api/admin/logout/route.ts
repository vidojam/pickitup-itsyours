import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { verifySessionToken } from "@/lib/admin-session-token";
import { destroyAdminSession } from "@/lib/admin-sessions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const value = request.cookies.get(ADMIN_COOKIE)?.value;
  if (value) {
    const session = await verifySessionToken(value);
    if (session) {
      await destroyAdminSession(session.sessionId);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: "",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
