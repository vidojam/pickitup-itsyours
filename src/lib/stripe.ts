import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe() {
  if (client) {
    return client;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  client = new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });
  return client;
}
