import { createServiceLogger } from "$lib/server/logger";
import { stripeService } from "$lib/server/services/stripe";

import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

const log = createServiceLogger("Stripe");

export const POST: RequestHandler = async ({ request, locals, url }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return json({ error: "Price ID is required" }, { status: 400 });
    }

    const origin = url.origin;
    const result = await stripeService.createCheckoutSession(
      locals.user.id,
      priceId,
      `${origin}/${locals.user.handle}?checkout=success`,
      `${origin}/${locals.user.handle}?checkout=canceled`,
    );

    if (!result.success) {
      return json({ error: result.error }, { status: result.statusCode });
    }

    return json({ url: result.content });
  } catch (error) {
    log.error("Checkout session error", { error });
    return json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
};
