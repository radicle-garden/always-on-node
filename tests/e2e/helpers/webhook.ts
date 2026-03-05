import Stripe from "stripe";

import {
  buildStripeClientConfig,
  buildStripeEvent,
} from "../../helpers/stripe";

const stripeClient = new Stripe(
  process.env.STRIPE_SECRET_SERVER_SIDE_KEY ?? "sk_test_placeholder",
  buildStripeClientConfig(),
);

export async function postWebhook(
  baseURL: string,
  eventType: string,
  data: object,
): Promise<Response> {
  const payload = JSON.stringify(buildStripeEvent(eventType, data));

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = stripeClient.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    timestamp,
  });

  return fetch(`${baseURL}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
}
