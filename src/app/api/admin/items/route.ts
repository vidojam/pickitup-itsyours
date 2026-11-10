import { isAdminAuthenticated } from "@/lib/admin-auth";
import { PhotoValidationError, saveAdminPhoto } from "@/lib/admin-photo-storage";
import { OFFER_AMOUNTS } from "@/lib/constants";
import { createItem, listItems } from "@/lib/store";
import { ItemCategory } from "@/lib/types";
import { NextResponse } from "next/server";

const ALLOWED_CATEGORIES: ItemCategory[] = ["Furniture", "Appliance", "Misc"];

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
  const uploadedImageUrls = form
    .getAll("imageUrls")
    .filter((entry): entry is string => typeof entry === "string" && entry.startsWith("/uploads/"));
  const timeViewed = form.get("timeViewed");
  const location = form.get("location");
  const category = form.get("category");
  const offerAmountValue = form.get("offerAmount");

  const offerAmount = typeof offerAmountValue === "string" ? Number(offerAmountValue) : NaN;

  if (
    files.length + uploadedImageUrls.length < 1 ||
    files.length + uploadedImageUrls.length > 3 ||
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

  let savedImageUrls: string[];
  try {
    savedImageUrls = await Promise.all(files.map((file) => saveAdminPhoto(file)));
  } catch (caught) {
    if (caught instanceof PhotoValidationError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    throw caught;
  }

  const imageUrls = [...uploadedImageUrls, ...savedImageUrls];
  const item = await createItem({
    imageUrls,
    offerAmount,
    timeViewed,
    location,
    category: category as ItemCategory,
  });

  return NextResponse.json({ item });
}
