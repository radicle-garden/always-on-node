import { getUserFromSession } from "$lib/server/services/auth";
import { usersService } from "$lib/server/services/users";

import { fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
  const user = await getUserFromSession(cookies);
  if (user) {
    redirect(303, `/${user.handle}`);
  }
  return {};
};

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get("email")?.toString()?.trim();

    const errors: ForgotPasswordFormErrors = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email address";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { email, errors });
    }

    const result = await usersService.requestPasswordReset(email!);

    if (!result.success) {
      return fail(result.statusCode, {
        email,
        errors: { general: result.error } as ForgotPasswordFormErrors,
      });
    }

    return { success: true, email, message: result.message };
  },
} satisfies Actions;
