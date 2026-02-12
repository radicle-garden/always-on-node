import { config } from "$lib/server/config";
import { stripeService } from "$lib/server/services/stripe";

import { redirect } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) {
    redirect(303, "/login");
  }

  const subscriptionResult = await stripeService.getSubscriptionStatus(user.id);
  const hasSubscription =
    subscriptionResult.success && subscriptionResult.content?.hasSubscription;

  const isStartTrialPage = url.pathname === "/start-trial";
  const isCheckoutSuccess = url.searchParams.get("checkout") === "success";

  if (isStartTrialPage && hasSubscription) {
    redirect(303, `/${user.handle}`);
  }

  const allowedWithoutSubscription = ["/start-trial", "/help", "/settings"];
  const isAllowedPage = allowedWithoutSubscription.includes(url.pathname);

  if (!hasSubscription && !isAllowedPage && !isCheckoutSuccess) {
    redirect(303, "/start-trial");
  }

  return {
    fqdn: config.fqdn,
  };
};
