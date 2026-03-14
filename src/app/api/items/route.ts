import { listItems } from "@/lib/store";
import { ItemStatus } from "@/lib/types";
import { NextResponse } from "next/server";

const ALLOWED_STATUSES: ItemStatus[] = ["available", "pending", "completed", "missing"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ItemStatus | null;

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const items = await listItems(status ?? undefined);
  return NextResponse.json({ items });
}
