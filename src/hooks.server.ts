import { initializeDatabase } from "$lib/server/db";
import { createServiceLogger } from "$lib/server/logger";
import { getUserFromSession } from "$lib/server/services/auth";
import { ensureNodeActiveForUser } from "$lib/server/services/nodes";
import { stripeService } from "$lib/server/services/stripe";

import type { Handle, ServerInit } from "@sveltejs/kit";

const log = createServiceLogger("Hooks");

export const init: ServerInit = async () => {
  await initializeDatabase();
  const usersWithActiveSubscriptions =
    await stripeService.getUsersWithActiveSubscription();
  log.info("Found users with active subscriptions", {
    count: usersWithActiveSubscriptions.length,
  });
  for (const user of usersWithActiveSubscriptions) {
    try {
      log.info("Ensuring node active for user", { userId: user.id });
      await ensureNodeActiveForUser(user.id);
    } catch (e) {
      log.error("Error activating node for user", {
        userId: user.id,
        error: e,
      });
    }
  }
};

export const handle: Handle = async ({ event, resolve }) => {
  const user = await getUserFromSession(event.cookies);
  event.locals.user = user;

  const response = await resolve(event);
  return response;
};
