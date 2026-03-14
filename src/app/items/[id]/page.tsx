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
        <Image
          src={item.imageUrl}
          alt={`${item.category} item`}
          width={900}
          height={700}
          className="h-72 w-full rounded-lg border border-gray-300 object-cover"
        />
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">{item.category}</h1>
          <p className="text-sm text-gray-700">Time Viewed: {item.timeViewed}</p>
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm">
            Exact GPS Map Location: {canUnlock ? "[Hidden until authorization]" : "No longer available"}
          </p>
          {!canUnlock ? (
            <p className="rounded-md border border-gray-300 p-3 text-sm">
              This item is currently {item.status} and cannot be unlocked.
            </p>
          ) : (
            <UnlockFlow itemId={item.id} />
          )}
        </section>
      </div>
    </main>
  );
}
