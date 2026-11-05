import { isAdminAuthenticated } from "@/lib/admin-auth";
import { saveAdminPhoto } from "@/lib/admin-photo-storage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Photo is required." }, { status: 400 });
  }

  const url = await saveAdminPhoto(file);
  return NextResponse.json({ url });
}
