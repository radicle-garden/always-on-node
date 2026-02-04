import type { NodeEvent } from "$lib/nodeEvents";
import { subscribe, testExports } from "$lib/nodeEvents";

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("nodeEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.reset();
    testExports.resetConnections();
  });

  describe("connection pooling", () => {
    it("creates one connection per unique filter", () => {
      subscribe(vi.fn());
      expectConnectionCount(1);

      subscribe(vi.fn());
      expectConnectionCount(1);

      subscribe(vi.fn(), { eventTypes: ["typeA"] });
      expectConnectionCount(2);
    });

    it("normalizes filter order when pooling connections", () => {
      subscribe(vi.fn(), { eventTypes: ["typeA", "typeB"] });
      subscribe(vi.fn(), { eventTypes: ["typeB", "typeA"] });

      expectConnectionCount(1);
    });

    it("treats empty eventTypes as no filter", () => {
      subscribe(vi.fn());
      subscribe(vi.fn(), { eventTypes: [] });

      expectConnectionCount(1);
    });

    it("creates connection immediately on subscribe", () => {
      const callback = vi.fn();
      subscribe(callback);

      expectConnectionCount(1);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("URL building", () => {
    it("builds correct URL without filter", () => {
      subscribe(vi.fn());
      expectUrl("/api/events/node");
    });

    it("builds correct URL with single event type", () => {
      subscribe(vi.fn(), { eventTypes: ["canonicalRefUpdated"] });
      expectUrl("/api/events/node?eventTypes=canonicalRefUpdated");
    });

    it("builds correct URL with multiple event types", () => {
      subscribe(vi.fn(), { eventTypes: ["typeA", "typeB"] });
      expectUrl("/api/events/node?eventTypes=typeA%2CtypeB");
    });
  });

  describe("event delivery", () => {
    it("delivers events to single subscriber", () => {
      const callback = vi.fn();
      subscribe(callback);

      const event = testEvent({ foo: "bar" });
      triggerNodeEvent(event);

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(event);
    });

    it("delivers events to all subscribers on same connection", () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];
      callbacks.forEach(cb => subscribe(cb));

      const event = testEvent({ data: 123 });
      triggerNodeEvent(event);

      callbacks.forEach(cb => expect(cb).toHaveBeenCalledWith(event));
    });

    it("isolates events between different filters", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribe(callback1, { eventTypes: ["typeA"] });
      subscribe(callback2, { eventTypes: ["typeB"] });

      MockEventSource.instances[0]?._triggerEvent(EVENT_TYPE, testEvent());

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe("connection lifecycle", () => {
    it("keeps connection open while any subscriber exists", () => {
      const unsubscribe1 = subscribe(vi.fn());
      subscribe(vi.fn());

      unsubscribe1();

      expect(closedConnectionCount()).toBe(0);
    });

    it("closes connection when last subscriber unsubscribes", () => {
      const unsubscribe1 = subscribe(vi.fn());
      const unsubscribe2 = subscribe(vi.fn());

      unsubscribe1();
      expect(closedConnectionCount()).toBe(0);

      unsubscribe2();
      expect(closedConnectionCount()).toBe(1);
    });

    it("manages multiple connections independently", () => {
      const unsubscribe1 = subscribe(vi.fn(), { eventTypes: ["typeA"] });
      const unsubscribe2 = subscribe(vi.fn(), { eventTypes: ["typeB"] });

      unsubscribe1();

      expect(MockEventSource.instances[0]?.readyState).toBe(
        MockEventSource.CLOSED,
      );
      expect(MockEventSource.instances[1]?.readyState).toBe(
        MockEventSource.OPEN,
      );

      unsubscribe2();
      expect(closedConnectionCount()).toBe(2);
    });
  });

  describe("unsubscribe", () => {
    it("stops event delivery after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(callback);

      triggerNodeEvent(testEvent());
      expect(callback).toHaveBeenCalledOnce();

      unsubscribe();
      triggerNodeEvent(testEvent());
      expect(callback).toHaveBeenCalledOnce();
    });

    it("is idempotent", () => {
      const unsubscribe = subscribe(vi.fn());

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();

      expect(closedConnectionCount()).toBe(1);
    });

    it("only affects the unsubscribed callback", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribe(callback1);
      subscribe(callback2);

      unsubscribe1();
      triggerNodeEvent(testEvent());

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe("closed connection handling", () => {
    it("creates new connection when previous is closed", () => {
      const unsubscribe = subscribe(vi.fn());
      unsubscribe();

      expect(closedConnectionCount()).toBe(1);

      subscribe(vi.fn());

      expectConnectionCount(2);
      expect(lastConnection()?.readyState).toBe(MockEventSource.OPEN);
    });

    it("reuses new connection for subsequent subscribers", () => {
      const unsubscribe = subscribe(vi.fn());
      unsubscribe();

      subscribe(vi.fn());
      expectConnectionCount(2);

      subscribe(vi.fn());
      expectConnectionCount(2);
    });
  });

  describe("error handling", () => {
    it("closes connection on EventSource error", () => {
      subscribe(vi.fn());

      triggerError();

      expect(lastConnection()?.readyState).toBe(MockEventSource.CLOSED);
    });

    it("creates fresh connection after error", () => {
      const unsubscribe = subscribe(vi.fn());

      triggerError();
      expect(closedConnectionCount()).toBe(1);

      unsubscribe();
      subscribe(vi.fn());

      expectConnectionCount(2);
      expect(lastConnection()?.readyState).toBe(MockEventSource.OPEN);
    });

    it("allows unsubscribe after error", () => {
      const unsubscribe1 = subscribe(vi.fn());
      const unsubscribe2 = subscribe(vi.fn());

      triggerError();

      expect(() => {
        unsubscribe1();
        unsubscribe2();
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles rapid subscribe/unsubscribe cycles", () => {
      const unsubs = [
        subscribe(vi.fn()),
        subscribe(vi.fn()),
        subscribe(vi.fn()),
      ];

      unsubs[0]();
      const unsub4 = subscribe(vi.fn());
      unsubs[1]();
      unsubs[2]();
      unsub4();

      expect(closedConnectionCount()).toBe(1);
      expectConnectionCount(1);
    });

    it("handles unsubscribe before any events", () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(callback);

      unsubscribe();
      triggerNodeEvent(testEvent());

      expect(callback).not.toHaveBeenCalled();
    });

    it("handles callback unsubscribing itself during event", () => {
      let unsubscribe: (() => void) | null = null;
      const callback1 = vi.fn(() => {
        unsubscribe?.();
      });
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      unsubscribe = subscribe(callback1);
      subscribe(callback2);
      subscribe(callback3);

      expect(() => {
        triggerNodeEvent(testEvent());
      }).not.toThrow();

      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
      expect(callback3).toHaveBeenCalledOnce();
    });
  });

  describe("error handling edge cases", () => {
    describe("JSON parsing", () => {
      it("handles malformed JSON without crashing", () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        subscribe(callback1);
        subscribe(callback2);

        expect(() => {
          triggerRawNodeEvent("invalid json {");
        }).not.toThrow();

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
      });

      it("handles empty string data without crashing", () => {
        const callback = vi.fn();
        subscribe(callback);

        expect(() => {
          triggerRawNodeEvent("");
        }).not.toThrow();

        expect(callback).not.toHaveBeenCalled();
      });

      it("handles non-JSON strings gracefully", () => {
        const callback = vi.fn();
        subscribe(callback);

        expect(() => {
          triggerRawNodeEvent("not json at all");
        }).not.toThrow();

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe("connection state handling", () => {
      it("creates new connection when existing is CONNECTING", () => {
        const callback1 = vi.fn();
        subscribe(callback1);

        lastConnection().readyState = MockEventSource.CONNECTING;

        const callback2 = vi.fn();
        subscribe(callback2);

        expect(MockEventSource.instances.length).toBe(2);
        expect(lastConnection().readyState).toBe(MockEventSource.OPEN);
      });

      it("only reuses OPEN connections", () => {
        const callback1 = vi.fn();
        subscribe(callback1);

        lastConnection().readyState = MockEventSource.CONNECTING;

        const callback2 = vi.fn();
        subscribe(callback2);

        expect(MockEventSource.instances.length).toBe(2);
      });

      it("treats CONNECTING as stale during cleanup", () => {
        const unsubscribe = subscribe(vi.fn());

        lastConnection().readyState = MockEventSource.CONNECTING;

        unsubscribe();

        const callback2 = vi.fn();
        subscribe(callback2);

        expect(MockEventSource.instances.length).toBe(2);
        expect(lastConnection().readyState).toBe(MockEventSource.OPEN);
      });
    });

    describe("callback error isolation", () => {
      it("continues calling callbacks if one throws", () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn(() => {
          throw new Error("Callback 2 error");
        });
        const callback3 = vi.fn();

        subscribe(callback1);
        subscribe(callback2);
        subscribe(callback3);

        expect(() => {
          triggerNodeEvent(testEvent());
        }).not.toThrow();

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        expect(callback3).toHaveBeenCalled();
      });

      it("isolates multiple failing callbacks", () => {
        const callback1 = vi.fn(() => {
          throw new Error("Error 1");
        });
        const callback2 = vi.fn(() => {
          throw new Error("Error 2");
        });
        const callback3 = vi.fn();

        subscribe(callback1);
        subscribe(callback2);
        subscribe(callback3);

        expect(() => {
          triggerNodeEvent(testEvent());
        }).not.toThrow();

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        expect(callback3).toHaveBeenCalled();
      });
    });

    describe("filter key generation", () => {
      it("does not collide filters with commas in event type names", () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        subscribe(callback1, { eventTypes: ["a,b"] });
        subscribe(callback2, { eventTypes: ["a", "b"] });

        expect(MockEventSource.instances.length).toBe(2);

        MockEventSource.instances[0]?._triggerEvent(EVENT_TYPE, testEvent());

        expect(callback1).toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
      });

      it("handles complex collision scenarios", () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const callback3 = vi.fn();

        subscribe(callback1, { eventTypes: ["x,y,z"] });
        subscribe(callback2, { eventTypes: ["x,y", "z"] });
        subscribe(callback3, { eventTypes: ["x", "y,z"] });

        expect(MockEventSource.instances.length).toBe(3);
      });
    });

    describe("callback set modification", () => {
      it("does not call newly subscribed callbacks during current event", () => {
        const callback3 = vi.fn();
        const callback1 = vi.fn(() => {
          subscribe(callback3);
        });
        const callback2 = vi.fn();

        subscribe(callback1);
        subscribe(callback2);

        triggerNodeEvent(testEvent());

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        expect(callback3).not.toHaveBeenCalled();

        triggerNodeEvent(testEvent());
        expect(callback3).toHaveBeenCalledOnce();
      });
    });
  });
});

class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  url: string;
  readyState: number = MockEventSource.OPEN;
  onerror: ((event: Event) => void) | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  _triggerEvent(type: string, data: unknown): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = { data: JSON.stringify(data) } as MessageEvent;
      listeners.forEach(listener => listener(event));
    }
  }

  _triggerRawEvent(type: string, dataString: string): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = { data: dataString } as MessageEvent;
      listeners.forEach(listener => listener(event));
    }
  }

  _triggerError(): void {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  static reset(): void {
    MockEventSource.instances = [];
  }
}

globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

const EVENT_TYPE = "nodeEvent";

function connectionCount() {
  return MockEventSource.instances.length;
}

function closedConnectionCount() {
  return MockEventSource.instances.filter(
    i => i.readyState === MockEventSource.CLOSED,
  ).length;
}

function lastConnection() {
  return MockEventSource.instances[MockEventSource.instances.length - 1];
}

function triggerNodeEvent(data: NodeEvent) {
  lastConnection()?._triggerEvent(EVENT_TYPE, data);
}

function triggerRawNodeEvent(dataString: string) {
  lastConnection()?._triggerRawEvent(EVENT_TYPE, dataString);
}

function triggerError() {
  lastConnection()?._triggerError();
}

function expectConnectionCount(expected: number) {
  expect(connectionCount()).toBe(expected);
}

function expectUrl(expected: string) {
  expect(lastConnection()?.url).toBe(expected);
}

function testEvent(overrides?: Partial<NodeEvent>): NodeEvent {
  return { type: "testEvent", ...overrides };
}
