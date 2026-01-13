import { clearSessionCookie } from "$lib/server/services/auth";

import { redirect } from "@sveltejs/kit";

import type { Actions } from "./$types";

export const actions = {
  default: async ({ cookies }) => {
    clearSessionCookie(cookies);
    redirect(303, "/login");
  },
} satisfies Actions;
