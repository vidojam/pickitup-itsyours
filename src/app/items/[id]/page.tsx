import { formatOfferAmount } from "@/lib/constants";
import { ItemsFeed } from "@/components/ItemsFeed";
import { UnlockFlow } from "@/components/UnlockFlow";
import { getItemById } from "@/lib/store";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItemById(id);

  if (!item) {
    notFound();
  }

  const canUnlock = item.status === "available";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/items" className="text-sm underline">
        Back to Available Items
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3" aria-label="Item photos">
          {item.imageUrls.map((imageUrl, index) => (
            <Image
              key={imageUrl}
              src={imageUrl}
              alt={`Curbside item photo ${index + 1}`}
              width={900}
              height={700}
              className="h-72 w-full rounded-lg border border-gray-300 object-cover"
            />
          ))}
        </section>
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Sidewalk Garbage Items at the location</h1>
          <p className="text-2xl font-bold text-gray-900">Offer: {formatOfferAmount(item.offerAmount)}</p>
          <p className="text-sm text-gray-700">Time Viewed: {item.timeViewed}</p>
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm">
            Pickup Location: {canUnlock ? "[Hidden until $5.00 authorization succeeds]" : "No longer available"}
          </p>
          {!canUnlock ? (
            <p className="rounded-md border border-gray-300 p-3 text-sm">
              This item is currently {item.status} and cannot be unlocked.
            </p>
          ) : (
            <UnlockFlow itemId={item.id} offerAmount={item.offerAmount} />
          )}
        </section>
      </div>
      <section className="space-y-3 border-t border-gray-200 pt-6" aria-label="Other available locations">
        <h2 className="text-xl font-bold">Other Available Locations</h2>
        <ItemsFeed excludeId={item.id} />
      </section>
    </main>
  );
}
