import { config } from "$lib/server/config";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    return {
      user: null,
      fqdn: config.public.fqdn,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _, ...safeUser } = user;

  return {
    user: safeUser,
    fqdn: config.public.fqdn,
  };
};
