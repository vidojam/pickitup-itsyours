"use client";

import { formatOfferAmount } from "@/lib/constants";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Item } from "@/lib/types";

export function ItemsFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      const response = await fetch("/api/items?status=available", {
        cache: "no-store",
      });
      const data = (await response.json()) as { items: Item[] };
      setItems(data.items ?? []);
      setError(null);
    } catch {
      setError("Unable to load available items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();

    const eventSource = new EventSource("/api/inventory/stream");
    eventSource.addEventListener("inventory", () => {
      void loadItems();
    });

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading available items...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        No available items right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <Image
            src={item.imageUrls[0]}
            alt="Curbside item photo"
            width={600}
            height={300}
            className="h-48 w-full object-cover"
          />
          <div className="space-y-2 p-4">
            <p className="text-sm text-gray-700">Offer: {formatOfferAmount(item.offerAmount)}</p>
            <p className="text-xs text-gray-600">Time Viewed: {item.timeViewed}</p>
            <p className="text-xs text-gray-600">{item.imageUrls.length} photo{item.imageUrls.length === 1 ? "" : "s"}</p>
            <Link
              href={`/items/${item.id}`}
              className="inline-flex rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
            >
              View Item
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
