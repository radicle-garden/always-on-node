import { config } from "$lib/server/config";
import { getPortFromConfig, getRadHome } from "$lib/server/services/nodes";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user!; // Layout ensures user exists.

  const radHome = getRadHome(user.handle);

  const env = {
    ...process.env,
    RAD_PASSPHRASE: "",
    RAD_HOME: radHome!,
  };

  let connectAddress: string | undefined = undefined;

  try {
    const port = await getPortFromConfig(env);
    connectAddress = user.nodes[0]
      ? `${user.nodes[0].node_id}@${config.fqdn}:${port}`
      : undefined;
  } catch {
    // Ignore.
  }

  const nodeId = user.nodes.at(0)?.node_id;

  return {
    user,
    nodeId,
    connectAddress,
  };
};
