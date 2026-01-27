import { usersService } from "$lib/server/services/users";

import { fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

interface ResetPasswordFormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export const load: PageServerLoad = async ({ params }) => {
  const { token } = params;

  const result = await usersService.verifyPasswordResetToken(token);

  if (!result.success) {
    redirect(303, "/login?pw-reset=invalid");
  }

  return { token };
};

export const actions = {
  default: async ({ request, params }) => {
    const { token } = params;
    const data = await request.formData();
    const password = data.get("password")?.toString();
    const confirmPassword = data.get("confirmPassword")?.toString();

    const errors: ResetPasswordFormErrors = {};

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

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors });
    }

    const result = await usersService.resetPassword(token, password!);

    if (!result.success) {
      if (result.error === "Invalid or expired reset link") {
        redirect(303, "/login?pw-reset=invalid");
      }
      return fail(result.statusCode, {
        errors: { general: result.error } as ResetPasswordFormErrors,
      });
    }

    redirect(303, "/login?pw-reset=success");
  },
} satisfies Actions;
