import {
  createReservation,
  decideReservation,
  findReservationByIntent,
  getItemById,
  relistReservation,
} from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

// Reconciles Stripe state with the app store when the client-side confirm
// request never lands or a capture/cancel happens outside the decision route.

async function handleAuthorized(intent: Stripe.PaymentIntent) {
  const existing = await findReservationByIntent(intent.id);
  if (existing) {
    return;
  }

  const itemId = intent.metadata.itemId;
  const item = itemId ? await getItemById(itemId) : null;

  const valid =
    item &&
    item.status === "available" &&
    intent.amount === item.offerAmount &&
    intent.currency === "usd";

  if (!valid) {
    await getStripe().paymentIntents.cancel(intent.id).catch(() => null);
    return;
  }

  const created = await createReservation({
    itemId: item.id,
    paymentIntentId: intent.id,
    amount: intent.amount,
  });

  if (!created && !(await findReservationByIntent(intent.id))) {
    await getStripe().paymentIntents.cancel(intent.id).catch(() => null);
  }
}

async function handleFinalized(intent: Stripe.PaymentIntent, decision: "picked" | "missing") {
  const reservation = await findReservationByIntent(intent.id);
  if (!reservation || reservation.status !== "authorized") {
    return;
  }
  await decideReservation({ reservationId: reservation.id, decision });
}

async function handleCanceled(intent: Stripe.PaymentIntent) {
  // "automatic" = Stripe expired the uncaptured hold; relist instead of marking missing.
  if (intent.cancellation_reason === "automatic") {
    const reservation = await findReservationByIntent(intent.id);
    if (reservation) {
      await relistReservation(reservation.id);
    }
    return;
  }
  await handleFinalized(intent, "missing");
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      await handleAuthorized(event.data.object);
      break;
    case "payment_intent.succeeded":
      await handleFinalized(event.data.object, "picked");
      break;
    case "payment_intent.canceled":
      await handleCanceled(event.data.object);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
