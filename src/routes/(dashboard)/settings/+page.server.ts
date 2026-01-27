import { config } from "$lib/server/config";
import { stripeService } from "$lib/server/services/stripe";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const currentUser = locals.user;

  let subscriptionStatus = null;
  if (currentUser) {
    const statusResult = await stripeService.getSubscriptionStatus(
      currentUser.id,
    );
    if (statusResult.success && statusResult.content) {
      subscriptionStatus = statusResult.content;
    }
  }
  return {
    subscriptionStatus,
    stripePriceId: config.stripePriceId,
  };
};
