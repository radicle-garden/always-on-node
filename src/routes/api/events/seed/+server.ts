import { onSeedComplete } from "$lib/server/services/seedEvents";

import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rid = url.searchParams.get("rid");
  const nodeId = url.searchParams.get("nodeId");

  if (!rid || !nodeId) {
    return new Response("Missing rid or nodeId parameter", { status: 400 });
  }

  const userOwnsNode = locals.user.nodes.some(n => n.node_id === nodeId);
  if (!userOwnsNode) {
    return new Response("Forbidden", { status: 403 });
  }

  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      unsubscribe = onSeedComplete(event => {
        if (event.rid === rid && event.nodeId === nodeId && !closed) {
          closed = true;
          const data = JSON.stringify(event);
          controller.enqueue(
            encoder.encode(`event: seedComplete\ndata: ${data}\n\n`),
          );
          unsubscribe?.();
          controller.close();
        }
      });
    },
    cancel() {
      closed = true;
      unsubscribe?.();
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
