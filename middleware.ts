import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin-session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/mobile-login")) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("pickitup_admin")?.value;
  // Stateless check (signature + expiry) only — edge runtime has no fs access.
  // Revocation is enforced server-side via isAdminAuthenticated in API routes.
  if (!cookie || !(await verifySessionToken(cookie))) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
