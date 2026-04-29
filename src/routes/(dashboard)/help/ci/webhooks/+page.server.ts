import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user!; // Layout ensures user exists.

  return {
    nodeId: user.nodes.at(0)?.node_id,
  };
};
