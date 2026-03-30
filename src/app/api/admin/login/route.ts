import { getAdminToken, verifyAdminCredentials } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };

  if (!body.username || !body.password || !verifyAdminCredentials(body.username, body.password)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
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
