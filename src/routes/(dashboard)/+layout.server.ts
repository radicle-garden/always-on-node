import { config } from "$lib/server/config";

import { redirect } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    redirect(303, "/login");
  }
  return {
    fqdn: config.fqdn,
  };
};
