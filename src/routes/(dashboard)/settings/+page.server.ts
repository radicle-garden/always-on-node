import { config } from "$lib/server/config";
import { clearSessionCookie } from "$lib/server/services/auth";
import { stripeService } from "$lib/server/services/stripe";
import { type CanDeleteResult, usersService } from "$lib/server/services/users";

import { fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const currentUser = locals.user;

  let subscriptionStatus = null;
  let canDeleteAccount: CanDeleteResult = {
    canDelete: false,
    reason: "Not logged in",
  };

  if (currentUser) {
    const statusResult = await stripeService.getSubscriptionStatus(
      currentUser.id,
    );
    if (statusResult.success && statusResult.content) {
      subscriptionStatus = statusResult.content;
    }

    const deleteResult = await usersService.canDeleteAccount(currentUser.id);
    if (deleteResult.success && deleteResult.content) {
      canDeleteAccount = deleteResult.content;
    }
  }
  return {
    subscriptionStatus,
    stripePriceId: config.stripePriceId,
    canDeleteAccount,
  };
};

export const actions = {
  deleteAccount: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      return fail(401, { deleteError: "Unauthorized" });
    }

    const data = await request.formData();
    const password = data.get("password")?.toString();

    if (!password) {
      return fail(400, { deleteError: "Password is required" });
    }

    const result = await usersService.deleteUser(locals.user.id, password);

    if (!result.success) {
      return fail(result.statusCode, { deleteError: result.error });
    }

    clearSessionCookie(cookies);
    redirect(303, "/login?deleted=true");
  },
} satisfies Actions;
