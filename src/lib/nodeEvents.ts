export interface NodeEvent {
  type: string;
  [key: string]: unknown;
}

export type EventCallback = (event: NodeEvent) => void;
export type EventFilter = (event: NodeEvent) => boolean;

interface Subscriber {
  callback: EventCallback;
  filter?: EventFilter;
}

let eventSource: EventSource | null = null;
const subscribers = new Set<Subscriber>();

export function connect(): () => void {
  if (eventSource) {
    // Already connected
    return () => {};
  }

  eventSource = new EventSource("/api/events/node");

  eventSource.addEventListener("nodeEvent", e => {
    const event: NodeEvent = JSON.parse(e.data);

    // Broadcast to all subscribers
    for (const { callback, filter } of subscribers) {
      if (!filter || filter(event)) {
        callback(event);
      }
    }
  });

  return disconnect;
}

export function subscribe(
  callback: EventCallback,
  filter?: EventFilter,
): () => void {
  const subscriber: Subscriber = { callback, filter };
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

function disconnect(): void {
  eventSource?.close();
  eventSource = null;
  subscribers.clear();
}
