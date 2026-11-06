"use client";

import { formatOfferAmount } from "@/lib/constants";
import Link from "next/link";
import { useState } from "react";

export function PickupDecision({ reservationId, amount }: { reservationId: string; amount: number }) {
  const [selection, setSelection] = useState<"picked" | "missing" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitDecision = async (decision: "picked" | "missing") => {
    setSelection(decision);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${reservationId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to finalize decision.");
      }

      setResult(
        decision === "picked"
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
      <p className="text-sm">
        Picking it up charges your card {formatOfferAmount(amount)}. If nothing is there, the hold
        is released and you pay nothing.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => submitDecision("picked")}
          disabled={submitting || !!result}
          className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting && selection === "picked" ? "Submitting..." : "Garbage Picked Up"}
        </button>
        <button
          type="button"
          onClick={() => submitDecision("missing")}
          disabled={submitting || !!result}
          className="rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {submitting && selection === "missing"
            ? "Submitting..."
            : "Garbage Item Not Picked Up at this location"}
        </button>
      </div>

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
