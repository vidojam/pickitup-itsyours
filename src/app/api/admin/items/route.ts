import { isAdminAuthenticated } from "@/lib/admin-auth";
import { OFFER_AMOUNTS } from "@/lib/constants";
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
  const files = form
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const timeViewed = form.get("timeViewed");
  const location = form.get("location");
  const category = form.get("category");
  const offerAmountValue = form.get("offerAmount");

  const offerAmount = typeof offerAmountValue === "string" ? Number(offerAmountValue) : NaN;

  if (
    files.length < 1 ||
    files.length > 3 ||
    typeof timeViewed !== "string" ||
    typeof location !== "string" ||
    typeof category !== "string" ||
    !OFFER_AMOUNTS.includes(offerAmount as (typeof OFFER_AMOUNTS)[number])
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!ALLOWED_CATEGORIES.includes(category as ItemCategory)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const imageUrls = await Promise.all(files.map((file) => savePhoto(file)));
  const item = await createItem({
    imageUrls,
    offerAmount,
    timeViewed,
    location,
    category: category as ItemCategory,
  });

  return NextResponse.json({ item });
}
