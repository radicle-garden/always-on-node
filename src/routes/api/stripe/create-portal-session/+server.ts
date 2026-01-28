import { createServiceLogger } from "$lib/server/logger";
import { stripeService } from "$lib/server/services/stripe";

import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

const log = createServiceLogger("Stripe");

export const POST: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin = url.origin;
    const result = await stripeService.createCustomerPortalSession(
      locals.user.id,
      `${origin}/${locals.user.handle}`,
    );

    if (!result.success) {
      return json({ error: result.error }, { status: result.statusCode });
    }

    return json({ url: result.content });
  } catch (error) {
    log.error("Portal session error", { error });
    return json({ error: "Failed to create portal session" }, { status: 500 });
  }
};
