import * as nodeEventManager from "$lib/server/services/nodeEventManager";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!locals.user.nodes || locals.user.nodes.length === 0) {
    return new Response("No nodes found for user", { status: 404 });
  }

  const containerName = `${locals.user.nodes[0].alias}-node`;

  const stream = new ReadableStream({
    start(controller) {
      try {
        const cleanup = nodeEventManager.subscribe(
          locals.user!.id,
          containerName,
          controller,
        );
        return cleanup;
      } catch (error) {
        controller.error(error);
        throw error;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
