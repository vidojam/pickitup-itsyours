"use client";

import { Item } from "@/lib/types";
import { FormEvent, useEffect, useState } from "react";

export function AdminDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    const response = await fetch("/api/admin/items", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load admin inventory.");
    }
    const data = (await response.json()) as { items: Item[] };
    setItems(data.items ?? []);
  };

  useEffect(() => {
    loadItems()
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "Unable to load inventory.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const onPublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/items", {
        method: "POST",
        body: form,
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to publish item.");
      }

      event.currentTarget.reset();
      await loadItems();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to publish item.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Inventory</h1>
        <button type="button" onClick={logout} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          Log Out
        </button>
      </div>

      <form onSubmit={onPublish} className="space-y-4 rounded-lg border border-gray-300 p-4">
        <h2 className="text-lg font-semibold">Publish New Listing</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Photo Upload</label>
          <input name="photo" type="file" accept="image/*" required className="w-full rounded-md border border-gray-300 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Time Viewed</label>
          <input name="timeViewed" type="datetime-local" required className="w-full rounded-md border border-gray-300 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Exact GPS Location / Address</label>
          <input name="address" type="text" required className="w-full rounded-md border border-gray-300 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select name="category" required className="w-full rounded-md border border-gray-300 p-2">
            <option value="Furniture">Furniture</option>
            <option value="Appliance">Appliance</option>
            <option value="Misc">Misc</option>
          </select>
        </div>
        <button type="submit" disabled={submitting} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Publishing..." : "Publish"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Inventory Status</h2>
        {loading ? <p className="text-sm text-gray-600">Loading inventory...</p> : null}
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium">{item.category} · {item.status}</p>
              <p className="text-xs text-gray-600">Time Viewed: {item.timeViewed}</p>
              <p className="text-xs text-gray-600">Address: {item.address}</p>
            </article>
          ))}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-gray-600">No listings yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
