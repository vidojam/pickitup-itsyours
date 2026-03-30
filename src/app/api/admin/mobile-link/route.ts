import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminMobileLink } from "@/lib/admin-mobile-links";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, expiresAt } = await createAdminMobileLink();
  const url = new URL(`/admin/mobile-login?token=${token}`, request.url).toString();

  return NextResponse.json({ url, token, expiresAt });
}