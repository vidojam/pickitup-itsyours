import { getAdminToken } from "@/lib/admin-auth";
import { consumeAdminMobileLink } from "@/lib/admin-mobile-links";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || !(await consumeAdminMobileLink(token))) {
    return NextResponse.redirect(new URL("/admin/login?error=mobile-link", origin));
  }

  const response = NextResponse.redirect(new URL("/admin", origin));
  response.cookies.set({
    name: "pickitup_admin",
    value: getAdminToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}