import { getUserFromSession } from "$lib/server/services/auth";
import { usersService } from "$lib/server/services/users";

import { fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

interface RegisterFormErrors {
  handle?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
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
    const handle = data.get("handle")?.toString()?.trim();
    const email = data.get("email")?.toString()?.trim();
    const password = data.get("password")?.toString();
    const confirmPassword = data.get("confirmPassword")?.toString();
    const terms = data.get("terms")?.toString() === "on";

    const errors: RegisterFormErrors = {};

    if (!handle) {
      errors.handle = "Username is required";
    }

    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!terms) {
      errors.terms = "You must accept the terms of service";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { handle, email, errors });
    }

    const result = await usersService.createNewUser(handle!, email!, password!);

    if (!result.success) {
      return fail(result.statusCode, {
        handle,
        email,
        errors: { general: result.error } as RegisterFormErrors,
      });
    }

    return { success: true, email };
  },
} satisfies Actions;
