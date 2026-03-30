import { getItemById } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { itemId?: string };

  if (!body.itemId) {
    return NextResponse.json({ error: "Missing itemId." }, { status: 400 });
  }

  const item = await getItemById(body.itemId);
  if (!item || item.status !== "available") {
    return NextResponse.json({ error: "Item is no longer available." }, { status: 409 });
  }

  const intent = await getStripe().paymentIntents.create({
    amount: item.offerAmount,
    currency: "usd",
    capture_method: "manual",
    payment_method_types: ["card"],
    metadata: {
      itemId: item.id,
    },
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  });
}
