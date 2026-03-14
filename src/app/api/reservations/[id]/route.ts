import { getReservationDetails } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const details = await getReservationDetails(id);
  if (!details) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  return NextResponse.json({ details });
}
