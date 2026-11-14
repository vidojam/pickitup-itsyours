import { NextRequest, NextResponse } from "next/server";

// Session tokens are 32 random bytes encoded as base64url (43 chars, URL-safe alphabet).
// Edge runtime has no SQLite access, so this is a format gate only — it blocks casual
// access and broken/missing cookies. Real authentication is enforced in every API route
// via isAdminAuthenticated(), which does the full DB lookup.
const SESSION_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/mobile-login")) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("pickitup_admin")?.value;
  if (!cookie || !SESSION_TOKEN_RE.test(cookie)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
