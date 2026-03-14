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
    return NextResponse.json({ error: "Unable to finalize reservation." }, { status: 409 });
  }

  return NextResponse.json({
    status: result.reservation.status,
    itemStatus: result.item.status,
  });
}
