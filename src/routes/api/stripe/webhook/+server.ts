import { config } from "$lib/server/config";
import { createServiceLogger } from "$lib/server/logger";
import { stripeService } from "$lib/server/services/stripe";

import Stripe from "stripe";

import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

const log = createServiceLogger("Stripe");

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) {
      log.warn("Missing stripe-signature header");
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
    log.info("Received event", { eventType: event.type, eventId: event.id });

    const result = await stripeService.handleWebhookEvent(event);

    if (!result.success) {
      log.error("Handler failed", {
        eventType: event.type,
        error: result.error,
      });
      return json(
        {
          error: result.error,
          eventType: event.type,
          eventId: event.id,
        },
        { status: result.statusCode },
      );
    }

    log.info("Successfully processed event", {
      eventType: event.type,
      eventId: event.id,
    });
    return json({ received: true, eventType: event.type, eventId: event.id });
  } catch (error) {
    log.error("Error processing webhook", { error });

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
