import * as nodeEventManager from "$lib/server/services/nodeEventManager";
import type { EventFilter } from "$lib/server/services/nodeEventManager";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!locals.user.nodes || locals.user.nodes.length === 0) {
    return new Response("No nodes found for user", { status: 404 });
  }

  const containerName = `${locals.user.nodes[0].alias}-node`;

  const eventTypesParam = url.searchParams.get("eventTypes");
  const filter: EventFilter | undefined = eventTypesParam
    ? { eventTypes: eventTypesParam.split(",").filter(Boolean) }
    : undefined;

  let cleanup: (() => void) | undefined;
  const stream = new ReadableStream({
    start(controller) {
      try {
        cleanup = nodeEventManager.subscribe(
          locals.user!.id,
          containerName,
          controller,
          filter,
        );
      } catch (error) {
        controller.error(error);
        throw error;
      }
    },
    cancel() {
      cleanup?.();
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
