import { onNodeStatusChange } from "$lib/server/services/nodeStatusEvents";
import { startMonitoring } from "$lib/server/services/nodeStatusMonitor";

import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const nodeId = url.searchParams.get("nodeId");

  if (!nodeId) {
    return new Response("Missing nodeId parameter", { status: 400 });
  }

  const userOwnsNode = locals.user.nodes.some(n => n.node_id === nodeId);
  if (!userOwnsNode) {
    return new Response("Forbidden", { status: 403 });
  }

  let unsubscribeEvents: (() => void) | null = null;
  let unsubscribeMonitor: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      unsubscribeMonitor = startMonitoring(nodeId, locals.user!);

      unsubscribeEvents = onNodeStatusChange(event => {
        if (event.nodeId === nodeId && !closed) {
          const data = JSON.stringify(event.status);
          controller.enqueue(
            encoder.encode(`event: statusChange\ndata: ${data}\n\n`),
          );

          if (event.status.isRunning && event.status.peers > 0) {
            closed = true;
            unsubscribeEvents?.();
            unsubscribeMonitor?.();
            controller.close();
          }
        }
      });
    },
    cancel() {
      closed = true;
      unsubscribeEvents?.();
      unsubscribeMonitor?.();
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
