import { NextRequest, NextResponse } from "next/server";

// Session tokens are 32 random bytes encoded as base64url (43 chars, URL-safe alphabet).
// Edge runtime has no SQLite access, so this is a format gate only — it blocks casual
// access and broken/missing cookies. Real authentication is enforced in every API route
// via isAdminAuthenticated(), which does the full DB lookup.
const SESSION_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login/logout routes are intentionally public.
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/mobile-login") ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("pickitup_admin")?.value;
  const valid = !!cookie && SESSION_TOKEN_RE.test(cookie);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
