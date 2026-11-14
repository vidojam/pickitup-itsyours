import { decideReservation, getReservationById } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { decision?: "picked" | "missing" };

  if (!body.decision || !["picked", "missing"].includes(body.decision)) {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }

  const reservation = await getReservationById(id);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (reservation.status !== "authorized") {
    return NextResponse.json({ error: "Reservation already finalized." }, { status: 409 });
  }

  const stripe = getStripe();

  if (body.decision === "picked") {
    await stripe.paymentIntents.capture(reservation.paymentIntentId);
  } else {
    await stripe.paymentIntents.cancel(reservation.paymentIntentId);
  }

  const result = await decideReservation({
    reservationId: id,
    decision: body.decision,
  });

  if (!result) {
    // If a "picked" capture succeeded but the store update failed, refund immediately
    // rather than leaving an untracked charge. The webhook may also reconcile this, but
    // an explicit refund is the safer recovery path.
    if (body.decision === "picked") {
      await stripe.refunds.create({ payment_intent: reservation.paymentIntentId }).catch(() => null);
    }
    return NextResponse.json({ error: "Unable to finalize reservation." }, { status: 409 });
  }

  return NextResponse.json({
    status: result.reservation.status,
    itemStatus: result.item.status,
  });
}
