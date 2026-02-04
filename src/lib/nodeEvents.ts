export interface NodeEvent {
  type: string;
  [key: string]: unknown;
}

export type EventCallback = (event: NodeEvent) => void;
export interface FilterOptions {
  eventTypes?: string[];
}

interface Connection {
  eventSource: EventSource;
  callbacks: Set<EventCallback>;
}

const connections = new Map<string, Connection>();

function getFilterKey(filter?: FilterOptions): string {
  if (!filter?.eventTypes || filter.eventTypes.length === 0) {
    return "";
  }
  return JSON.stringify(filter.eventTypes.slice().sort());
}

function buildUrl(filter?: FilterOptions): string {
  const base = "/api/events/node";
  if (!filter?.eventTypes || filter.eventTypes.length === 0) {
    return base;
  }
  const params = new URLSearchParams({
    eventTypes: filter.eventTypes.join(","),
  });
  return `${base}?${params}`;
}

function createConnection(filter?: FilterOptions): Connection {
  const key = getFilterKey(filter);
  const eventSource = new EventSource(buildUrl(filter));
  const callbacks = new Set<EventCallback>();

  const connection: Connection = { eventSource, callbacks };

  eventSource.addEventListener("nodeEvent", e => {
    let event: NodeEvent;
    try {
      event = JSON.parse(e.data);
    } catch {
      return;
    }

    const callbacksCopy = Array.from(callbacks);
    for (const callback of callbacksCopy) {
      try {
        callback(event);
      } catch {
        // Isolate callback errors.
      }
    }
  });

  eventSource.onerror = () => {
    connections.delete(key);
    eventSource.close();
  };

  connections.set(key, connection);
  return connection;
}

function getOrCreateConnection(filter?: FilterOptions): Connection {
  const key = getFilterKey(filter);
  const existing = connections.get(key);

  if (existing && existing.eventSource.readyState === EventSource.OPEN) {
    return existing;
  }

  if (existing) {
    existing.eventSource.close();
    connections.delete(key);
  }

  return createConnection(filter);
}

function cleanupConnection(key: string, connection: Connection): void {
  if (connection.callbacks.size === 0) {
    connection.eventSource.close();
    connections.delete(key);
  }
}

export function subscribe(
  callback: EventCallback,
  filter?: FilterOptions,
): () => void {
  const key = getFilterKey(filter);
  const connection = getOrCreateConnection(filter);
  connection.callbacks.add(callback);
  return () => {
    connection.callbacks.delete(callback);
    cleanupConnection(key, connection);
  };
}

export const testExports = {
  resetConnections() {
    connections.clear();
  },
};
