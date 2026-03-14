import { createReservation, getItemById } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    itemId?: string;
    paymentIntentId?: string;
  };

  if (!body.itemId || !body.paymentIntentId) {
    return NextResponse.json({ error: "Missing required values." }, { status: 400 });
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

  if (intent.status !== "requires_capture") {
    return NextResponse.json({ error: "Payment authorization did not complete." }, { status: 409 });
  }

  const item = await getItemById(body.itemId);
  if (!item || item.status !== "available") {
    await stripe.paymentIntents.cancel(body.paymentIntentId).catch(() => null);
    return NextResponse.json({ error: "Item is no longer available." }, { status: 409 });
  }

  const created = await createReservation({
    itemId: body.itemId,
    paymentIntentId: body.paymentIntentId,
    amount: intent.amount,
  });

  if (!created) {
    await stripe.paymentIntents.cancel(body.paymentIntentId).catch(() => null);
    return NextResponse.json({ error: "Item is no longer available." }, { status: 409 });
  }

  return NextResponse.json({
    reservationId: created.reservation.id,
    location: created.item.location ?? created.item.address,
  });
}
