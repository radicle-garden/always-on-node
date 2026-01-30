import { createServiceLogger } from "$lib/server/logger";
import {
  authenticateUser,
  getUserFromSession,
  setSessionCookie,
} from "$lib/server/services/auth";
import { stripeService } from "$lib/server/services/stripe";

import { fail, isRedirect, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

const log = createServiceLogger("Auth");

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

async function getRedirectUrl(userId: number, handle: string): Promise<string> {
  const subscriptionResult = await stripeService.getSubscriptionStatus(userId);
  if (subscriptionResult.success && subscriptionResult.content) {
    const { hasSubscription } = subscriptionResult.content;
    if (hasSubscription) {
      return `/${handle}`;
    }
  }
  return "/start-trial";
}

export const load: PageServerLoad = async ({ cookies }) => {
  const user = await getUserFromSession(cookies);
  if (user) {
    const redirectUrl = await getRedirectUrl(user.id, user.handle);
    redirect(303, redirectUrl);
  }
  return {};
};

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get("email")?.toString()?.trim();
    const password = data.get("password")?.toString();

    const errors: LoginFormErrors = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { email, errors });
    }

    try {
      const { user, error } = await authenticateUser(email!, password!);

      if (!user) {
        return fail(401, {
          email,
          errors: {
            general: error || "Invalid credentials",
          } as LoginFormErrors,
        });
      }

      setSessionCookie(cookies, user.id, user.created_at);

      const redirectUrl = await getRedirectUrl(user.id, user.handle);
      redirect(303, redirectUrl);
    } catch (err) {
      if (isRedirect(err)) {
        throw err;
      }
      log.error("Login error", { error: err });
      return fail(500, {
        email,
        errors: {
          general: "Login failed. Please try again.",
        } as LoginFormErrors,
      });
    }
  },
} satisfies Actions;
