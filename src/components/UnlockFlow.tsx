"use client";

import { TermsBox } from "@/components/TermsBox";
import { PickupDecision } from "@/components/PickupDecision";
import { getMapUrl } from "@/lib/location";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useState } from "react";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function UnlockForm({ itemId }: { itemId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);

  const unlock = async () => {
    if (!acceptedTerms) {
      setError("You must agree to the Terms of Use/Disclaimer before unlocking.");
      return;
    }
    if (!stripe || !elements) {
      setError("Stripe is not ready.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const intentResponse = await fetch("/api/stripe/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId }),
      });

      const intentData = (await intentResponse.json()) as {
        clientSecret?: string;
        paymentIntentId?: string;
        error?: string;
      };

      if (!intentResponse.ok || !intentData.clientSecret || !intentData.paymentIntentId) {
        throw new Error(intentData.error ?? "Unable to authorize card.");
      }

      const card = elements.getElement(CardElement);
      if (!card) {
        throw new Error("Card input is required.");
      }

      const confirmation = await stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: {
          card,
        },
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message ?? "Card authorization failed.");
      }

      if (!confirmation.paymentIntent) {
        throw new Error("Payment authorization failed.");
      }

      const reservationResponse = await fetch("/api/reservations/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          paymentIntentId: confirmation.paymentIntent.id,
        }),
      });

      const reservationData = (await reservationResponse.json()) as {
        reservationId?: string;
        location?: string;
        error?: string;
      };

      if (!reservationResponse.ok || !reservationData.location || !reservationData.reservationId) {
        throw new Error(reservationData.error ?? "Unable to lock item.");
      }

      setLocation(reservationData.location);
      setReservationId(reservationData.reservationId);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to unlock location.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <TermsBox />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        <span>I agree to the Terms of Use/Disclaimer.</span>
      </label>

      {!location ? (
        <div className="space-y-3 rounded-lg border border-gray-300 p-4">
          <p className="text-sm text-gray-700">
            Enter card details to place a $5.00 authorization hold.
          </p>
          <div className="rounded-md border border-gray-300 p-3">
            <CardElement />
          </div>
          <button
            type="button"
            onClick={unlock}
            disabled={loading}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Authorizing..."
              : "Unlock Location for $5 (You won't be charged yet)."}
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-300 p-4">
          <p className="text-sm font-medium text-green-700">Spot locked. Other users can no longer claim this item.</p>
          <p className="text-sm">
            <span className="font-semibold">GPS Map Location:</span>{" "}
            <a href={getMapUrl(location)} target="_blank" rel="noreferrer" className="underline">
              Open map
            </a>
          </p>
          {reservationId ? (
            <p className="text-sm">
              If you need this later, open: {" "}
              <Link href={`/pickup/${reservationId}`} className="underline">
                /pickup/{reservationId}
              </Link>
            </p>
          ) : null}
          {reservationId ? <PickupDecision reservationId={reservationId} /> : null}
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function UnlockFlow({ itemId }: { itemId: string }) {
  if (!stripePromise) {
    return (
      <p className="rounded-lg border border-gray-300 p-4 text-sm text-red-600">
        Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configuration.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <UnlockForm itemId={itemId} />
    </Elements>
  );
}
