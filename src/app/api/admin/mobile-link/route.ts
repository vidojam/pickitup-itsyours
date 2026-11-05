import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminMobileLink } from "@/lib/admin-mobile-links";
import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";

function getLanHostWithPort(port: string) {
  const interfaces = networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        return `${entry.address}:${port}`;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, expiresAt } = await createAdminMobileLink();
  const requestUrl = new URL(request.url);
  const mobileUrl = new URL(`/admin/mobile-login?token=${token}`, requestUrl);

  if (
    process.env.NODE_ENV !== "production" &&
    (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1")
  ) {
    const port = requestUrl.port || "3000";
    const lanHost = getLanHostWithPort(port);
    if (lanHost) {
      mobileUrl.host = lanHost;
    }
  }

  const url = mobileUrl.toString();

  return NextResponse.json({ url, token, expiresAt });
}