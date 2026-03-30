"use client";

import { formatOfferAmount } from "@/lib/constants";
import Link from "next/link";
import { useState } from "react";

export function PickupDecision({ reservationId, amount }: { reservationId: string; amount: number }) {
  const [selection, setSelection] = useState<"picked" | "missing" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitDecision = async () => {
    if (!selection) {
      setError("Select one checkbox option.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservationId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision: selection }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to finalize decision.");
      }

      setResult(
        selection === "picked"
          ? `Success. Your card has been charged ${formatOfferAmount(amount)}.`
          : "Hold released. You were not charged.",
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to submit decision.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-gray-300 p-4">
      <h3 className="text-lg font-semibold">On-Site Decision</h3>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={selection === "picked"}
          onChange={() => setSelection(selection === "picked" ? "" : "picked")}
        />
        <span>I picked it up. Charge me {formatOfferAmount(amount)}.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={selection === "missing"}
          onChange={() => setSelection(selection === "missing" ? "" : "missing")}
        />
        <span>Item was not here. Release the hold.</span>
      </label>

      <button
        type="button"
        onClick={submitDecision}
        disabled={submitting || !!result}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Decision"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {result ? (
        <div className="space-y-2">
          <p className="text-sm text-green-700">{result}</p>
          <Link href="/items" className="text-sm font-medium underline">
            Return to available items
          </Link>
        </div>
      ) : null}
    </section>
  );
}
