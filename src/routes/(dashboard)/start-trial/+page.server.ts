import { config } from "$lib/server/config";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {
    stripePriceId: config.stripePriceId,
  };
};
