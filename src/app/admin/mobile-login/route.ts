import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { consumeAdminMobileLink } from "@/lib/admin-mobile-links";
import { createAdminSession } from "@/lib/admin-sessions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || !(await consumeAdminMobileLink(token))) {
    return NextResponse.redirect(new URL("/admin/login?error=mobile-link", origin));
  }

  const { token: sessionToken, expiresAtMs } = await createAdminSession();
  const response = NextResponse.redirect(new URL("/admin", origin));
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAtMs),
  });
  return response;
}