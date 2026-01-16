import { config } from "$lib/server/config";
import { nodesService } from "$lib/server/services/nodes";

import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// Only allow in development
function checkDevMode() {
  if (!config.public.isDev) {
    throw new Error("Dev container controls only available in development");
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    checkDevMode();

    const { action } = await request.json();

    switch (action) {
      case "create": {
        // Create node (but don't start)
        const node = await nodesService.createNode(locals.user);
        if (!node) {
          return json({ error: "Failed to create node" }, { status: 500 });
        }

        // Now start containers
        const startResult = await nodesService.startContainers(locals.user);
        if (!startResult.success) {
          // Rollback: destroy the node we just created to avoid orphaned resources
          console.log(
            "[API] Container start failed, rolling back node creation",
          );
          await nodesService.destroyNode(locals.user);

          return json(
            {
              error: `Failed to start containers: ${startResult.error}. Node creation rolled back.`,
            },
            { status: startResult.statusCode },
          );
        }

        return json({ success: true, message: "Node created and started" });
      }

      case "start": {
        const result = await nodesService.startContainers(locals.user);
        if (!result.success) {
          return json({ error: result.error }, { status: result.statusCode });
        }
        return json({ success: true, message: "Containers started" });
      }

      case "stop": {
        const result = await nodesService.stopContainers(locals.user);
        if (!result.success) {
          return json({ error: result.error }, { status: result.statusCode });
        }
        return json({ success: true, message: "Containers stopped" });
      }

      case "destroy": {
        const result = await nodesService.destroyNode(locals.user);
        if (!result.success) {
          return json({ error: result.error }, { status: result.statusCode });
        }
        return json({ success: true, message: "Node destroyed" });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Container control error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return json({ error: errorMessage }, { status: 500 });
  }
};
