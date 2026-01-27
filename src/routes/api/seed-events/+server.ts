import { onSeedComplete } from "$lib/server/services/seedEvents";

import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
  const rid = url.searchParams.get("rid");

  if (!rid) {
    return new Response("Missing rid parameter", { status: 400 });
  }

  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      unsubscribe = onSeedComplete(event => {
        if (event.rid === rid && !closed) {
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
