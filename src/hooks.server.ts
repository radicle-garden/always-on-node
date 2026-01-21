import { initializeDatabase } from "$lib/server/db";
import { getUserFromSession } from "$lib/server/services/auth";
import { nodesService } from "$lib/server/services/nodes";
import { stripeService } from "$lib/server/services/stripe";

import type { Handle, ServerInit } from "@sveltejs/kit";

export const init: ServerInit = async () => {
  await initializeDatabase();
  const usersWithActiveSubscriptions =
    await stripeService.getUsersWithActiveSubscription();
  console.log(
    `[Hooks] Found ${usersWithActiveSubscriptions.length} users with active subscriptions`,
  );
  for (const user of usersWithActiveSubscriptions) {
    try {
      console.log(`[Hooks] Ensuring node active for user ${user.id}`);
      await nodesService.ensureNodeActiveForUser(user.id);
    } catch (e) {
      console.log(`[Hooks] Error activating node for user ${user.id}: ${e}`);
    }
  }
};

export const handle: Handle = async ({ event, resolve }) => {
  const user = await getUserFromSession(event.cookies);
  event.locals.user = user;

  const response = await resolve(event);
  return response;
};
