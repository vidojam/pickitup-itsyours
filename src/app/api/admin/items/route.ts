import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createItem, listItems } from "@/lib/store";
import { ItemCategory } from "@/lib/types";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ALLOWED_CATEGORIES: ItemCategory[] = ["Furniture", "Appliance", "Misc"];

async function savePhoto(file: File) {
  const uploadsDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDirectory, { recursive: true });

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(uploadsDirectory, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  return `/uploads/${filename}`;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("photo");
  const timeViewed = form.get("timeViewed");
  const location = form.get("location");
  const category = form.get("category");

  if (!(file instanceof File) || typeof timeViewed !== "string" || typeof location !== "string" || typeof category !== "string") {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!ALLOWED_CATEGORIES.includes(category as ItemCategory)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const imageUrl = await savePhoto(file);
  const item = await createItem({
    imageUrl,
    timeViewed,
    location,
    category: category as ItemCategory,
  });

  return NextResponse.json({ item });
}
