import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getReservationById, refundReservation } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const reservation = await getReservationById(id);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (reservation.status !== "charged") {
    return NextResponse.json(
      { error: "Only captured charges can be refunded." },
      { status: 409 },
    );
  }

  await getStripe().refunds.create({ payment_intent: reservation.paymentIntentId });

  const result = await refundReservation(id);
  if (!result) {
    // Stripe refund succeeded but store update failed — log the Stripe refund for reconciliation.
    console.error(
      `Stripe refund issued for payment_intent ${reservation.paymentIntentId} but store update failed for reservation ${id}`,
    );
    return NextResponse.json({ error: "Refund issued but state update failed." }, { status: 500 });
  }

  return NextResponse.json({
    status: result.reservation.status,
    itemStatus: result.item.status,
  });
}
