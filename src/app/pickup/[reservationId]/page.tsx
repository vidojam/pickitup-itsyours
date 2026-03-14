import { PickupDecision } from "@/components/PickupDecision";
import { getReservationDetails } from "@/lib/store";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PickupPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  const details = await getReservationDetails(reservationId);

  if (!details || !details.item) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/items" className="text-sm underline">
        Back to Available Items
      </Link>
      <h1 className="text-2xl font-bold">Pickup Decision</h1>
      <section className="space-y-2 rounded-lg border border-gray-300 p-4">
        <p className="text-sm font-medium">Address:</p>
        <p className="text-sm">{details.item.address}</p>
        <p className="text-sm text-gray-700">Current hold status: {details.reservation.status}</p>
      </section>
      {details.reservation.status === "authorized" ? (
        <PickupDecision reservationId={reservationId} />
      ) : (
        <p className="rounded-lg border border-gray-300 p-4 text-sm">
          This reservation is already finalized with status: {details.reservation.status}.
        </p>
      )}
    </main>
  );
}
