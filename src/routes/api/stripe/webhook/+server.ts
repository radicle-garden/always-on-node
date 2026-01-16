import { config } from "$lib/server/config";
import { stripeService } from "$lib/server/services/stripe";

import Stripe from "stripe";

import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) {
      console.error("[Webhook] Missing stripe-signature header");
      return json(
        {
          error: "Missing signature",
          details: "stripe-signature header is required",
        },
        { status: 400 },
      );
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripeWebhookSecret,
    );
    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    const result = await stripeService.handleWebhookEvent(event);

    if (!result.success) {
      console.error(
        `[Webhook] Handler failed for ${event.type}: ${result.error}`,
      );
      return json(
        {
          error: result.error,
          eventType: event.type,
          eventId: event.id,
        },
        { status: result.statusCode },
      );
    }

    console.log(`[Webhook] Successfully processed ${event.type} (${event.id})`);
    return json({ received: true, eventType: event.type, eventId: event.id });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);

    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return json(
        {
          error: "Invalid signature",
          details: "Webhook signature verification failed",
          hint: "Check that STRIPE_WEBHOOK_SECRET matches your webhook endpoint",
        },
        { status: 400 },
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return json(
      {
        error: "Webhook handler failed",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
};
