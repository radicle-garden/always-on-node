import { stripeService } from "$lib/server/services/stripe";

import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (user) {
    const subscriptionResult = await stripeService.getSubscriptionStatus(
      user.id,
    );
    if (subscriptionResult.success && subscriptionResult.content) {
      const { hasSubscription } = subscriptionResult.content;
      if (hasSubscription) {
        redirect(303, `/dashboard`);
      }
    }
    redirect(303, "/start-trial");
  }

  return {};
};
