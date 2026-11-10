import { createReservation, findReservationByIntent, getItemById } from "@/lib/store";
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
  if (!item) {
    await stripe.paymentIntents.cancel(body.paymentIntentId).catch(() => null);
    return NextResponse.json({ error: "Item is no longer available." }, { status: 409 });
  }

  // Cross-check the intent against the item so a tampered/reused intent can't be attached.
  if (
    intent.amount !== item.offerAmount ||
    intent.currency !== "usd" ||
    intent.metadata.itemId !== item.id
  ) {
    await stripe.paymentIntents.cancel(body.paymentIntentId).catch(() => null);
    return NextResponse.json({ error: "Payment does not match this item." }, { status: 409 });
  }

  // Idempotent: the Stripe webhook may have already created this reservation.
  const existing = await findReservationByIntent(body.paymentIntentId);
  if (existing && existing.itemId === item.id) {
    return NextResponse.json({
      reservationId: existing.id,
      location: item.location ?? item.address,
    });
  }

  if (item.status !== "available") {
    await stripe.paymentIntents.cancel(body.paymentIntentId).catch(() => null);
    return NextResponse.json({ error: "Item is no longer available." }, { status: 409 });
  }

  const created = await createReservation({
    itemId: body.itemId,
    paymentIntentId: body.paymentIntentId,
    amount: intent.amount,
  });

  if (!created) {
    // Re-check before cancelling: the webhook may have won the race.
    const raced = await findReservationByIntent(body.paymentIntentId);
    if (raced && raced.itemId === item.id) {
      return NextResponse.json({
        reservationId: raced.id,
        location: item.location ?? item.address,
      });
    }
    await stripe.paymentIntents.cancel(body.paymentIntentId).catch(() => null);
    return NextResponse.json({ error: "Item is no longer available." }, { status: 409 });
  }

  return NextResponse.json({
    reservationId: created.reservation.id,
    location: created.item.location ?? created.item.address,
  });
}
