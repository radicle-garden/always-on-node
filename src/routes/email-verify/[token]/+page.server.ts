import { usersService } from "$lib/server/services/users";

import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const { token } = params;

  const result = await usersService.verifyEmailAddress(token);

  if (result.success) {
    throw redirect(303, "/login?verified=true");
  } else {
    throw redirect(303, "/login?verified=false");
  }
};
