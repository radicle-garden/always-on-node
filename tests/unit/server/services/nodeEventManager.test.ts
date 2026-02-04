import { subscribe, testExports } from "$lib/server/services/nodeEventManager";
import type { EventFilter } from "$lib/server/services/nodeEventManager";

import { EventEmitter } from "events";
import type { ResultPromise } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock logger to suppress output during tests.
vi.mock("$lib/server/logger", () => ({
  createServiceLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("nodeEventManager", () => {
  beforeEach(() => {
    createdProcesses = [];
    testExports.resetState();
    testExports.setProcessSpawner({
      spawn: () => {
        const process = new FakeProcess();
        createdProcesses.push(process);
        return process as unknown as ResultPromise;
      },
    });
  });

  afterEach(() => {
    testExports.resetProcessSpawner();
  });

  describe("process management", () => {
    it("spawns process on first subscribe", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      expect(createdProcesses).toHaveLength(1);
    });

    it("shares process between subscribers for same user", () => {
      const controller1 = new MockController();
      const controller2 = new MockController();

      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
      );
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      expect(createdProcesses).toHaveLength(1);
    });

    it("kills process when last subscriber unsubscribes", () => {
      const controller = new MockController();
      const unsubscribe = subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );
      const mockProcess = getLastProcess();

      unsubscribe();

      expect(mockProcess.killed).toBe(true);
      expect(mockProcess.killSignal).toBe("SIGTERM");
    });

    it("creates separate processes for different users", () => {
      subscribe(
        1,
        "container1",
        new MockController() as unknown as ReadableStreamDefaultController,
      );
      subscribe(
        2,
        "container2",
        new MockController() as unknown as ReadableStreamDefaultController,
      );

      expect(createdProcesses).toHaveLength(2);
    });

    it("allows multiple unsubscribe calls safely", () => {
      const unsubscribe = subscribe(
        1,
        "container1",
        new MockController() as unknown as ReadableStreamDefaultController,
      );

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe("event delivery", () => {
    it("delivers events to all subscribers", () => {
      const controller1 = new MockController();
      const controller2 = new MockController();

      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
      );
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit("data", Buffer.from('{"type":"test"}\n'));

      expect(controller1.enqueuedData).toHaveLength(1);
      expect(controller2.enqueuedData).toHaveLength(1);
    });

    it("filters events by type", () => {
      const controller1 = new MockController();
      const controller2 = new MockController();

      const filter: EventFilter = { eventTypes: ["typeA"] };
      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
        filter,
      );
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit("data", Buffer.from('{"type":"typeA"}\n'));
      mockProcess.stdout.emit("data", Buffer.from('{"type":"typeB"}\n'));

      expect(controller1.enqueuedData).toHaveLength(1);
      expect(controller2.enqueuedData).toHaveLength(2);
    });

    it("removes closed controllers automatically", () => {
      const controller1 = new MockController();
      const controller2 = new MockController();

      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
      );
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();

      controller1.close();

      mockProcess.stdout.emit("data", Buffer.from('{"type":"test"}\n'));

      expect(mockProcess.killed).toBe(false);
      expect(controller2.enqueuedData).toHaveLength(1);
    });

    it("treats empty eventTypes array as no filter", () => {
      const controller = new MockController();
      const filter: EventFilter = { eventTypes: [] };

      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
        filter,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit("data", Buffer.from('{"type":"typeA"}\n'));
      mockProcess.stdout.emit("data", Buffer.from('{"type":"typeB"}\n'));

      expect(controller.enqueuedData).toHaveLength(2);
    });

    it("handles events with null type field", () => {
      const controller = new MockController();
      const filter: EventFilter = { eventTypes: ["test"] };

      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
        filter,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit(
        "data",
        Buffer.from('{"type":null,"data":"x"}\n'),
      );

      expect(controller.enqueuedData).toHaveLength(0);
    });
  });

  describe("line buffering", () => {
    it("buffers incomplete JSON lines", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit("data", Buffer.from('{"type":'));

      expect(controller.enqueuedData).toHaveLength(0);

      mockProcess.stdout.emit("data", Buffer.from('"test"}\n'));

      expect(controller.enqueuedData).toHaveLength(1);
    });

    it("processes multiple events from single chunk", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();
      const multipleEvents =
        '{"type":"event1"}\n{"type":"event2"}\n{"type":"event3"}\n';
      mockProcess.stdout.emit("data", Buffer.from(multipleEvents));

      expect(controller.enqueuedData).toHaveLength(3);
    });

    it("handles malformed JSON gracefully", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();

      expect(() => {
        mockProcess.stdout.emit("data", Buffer.from("{invalid json\n"));
        mockProcess.stdout.emit("data", Buffer.from('{"type":"valid"}\n'));
      }).not.toThrow();

      expect(controller.enqueuedData).toHaveLength(1);
    });
  });

  describe("lifecycle", () => {
    it("closes all controllers when process exits", () => {
      const controller1 = new MockController();
      const controller2 = new MockController();

      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
      );
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();
      mockProcess.triggerExit(0, null);

      expect(controller1.closed).toBe(true);
      expect(controller2.closed).toBe(true);
    });

    it("cleans up on spawn failure", () => {
      testExports.setProcessSpawner({
        spawn: () => {
          throw new Error("Spawn failed");
        },
      });

      expect(() => {
        subscribe(
          1,
          "container1",
          new MockController() as unknown as ReadableStreamDefaultController,
        );
      }).toThrow("Spawn failed");

      testExports.setProcessSpawner({
        spawn: () => {
          const process = new FakeProcess();
          createdProcesses.push(process);
          return process as unknown as ResultPromise;
        },
      });

      expect(() => {
        subscribe(
          1,
          "container1",
          new MockController() as unknown as ReadableStreamDefaultController,
        );
      }).not.toThrow();
    });

    it("logs stderr output without crashing", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      const process = getLastProcess();

      expect(() => {
        process.stderr.emit("data", Buffer.from("warning message\n"));
        process.stderr.emit("data", Buffer.from("another warning\n"));
      }).not.toThrow();

      process.stdout.emit("data", Buffer.from('{"type":"test"}\n'));
      expect(controller.enqueuedData).toHaveLength(1);
    });

    it("prevents concurrent process spawning for same user", () => {
      let callCount = 0;

      testExports.setProcessSpawner({
        spawn: () => {
          callCount++;
          if (callCount === 1) {
            // First call succeeds
            const process = new FakeProcess();
            createdProcesses.push(process);
            return process as unknown as ResultPromise;
          }
          // Second call should never happen due to spawningProcesses check
          throw new Error("Should not spawn twice");
        },
      });

      // First subscribe succeeds
      const controller1 = new MockController();
      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
      );

      expect(callCount).toBe(1);

      // Second subscribe reuses existing process (doesn't throw)
      const controller2 = new MockController();
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      // Still only one spawn call
      expect(callCount).toBe(1);
      expect(createdProcesses).toHaveLength(1);
    });

    it("cleans up when process emits error event", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();

      mockProcess.triggerError(new Error("Process crashed"));

      expect(controller.closed).toBe(true);

      // New subscribe should create fresh process
      const controller2 = new MockController();
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      expect(createdProcesses).toHaveLength(2);
    });

    it("flushes remaining buffer when stdout ends", () => {
      const controller = new MockController();
      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();

      mockProcess.stdout.emit("data", Buffer.from('{"type":"test"}'));
      expect(controller.enqueuedData).toHaveLength(0);

      mockProcess.stdout.emit("end");

      expect(controller.enqueuedData).toHaveLength(1);
      const message = new TextDecoder().decode(controller.enqueuedData[0]);
      expect(message).toContain('"type":"test"');
    });
  });

  describe("edge cases", () => {
    it("does not deliver events without type field to filtered subscribers", () => {
      const controller = new MockController();
      const filter: EventFilter = { eventTypes: ["someType"] };

      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
        filter,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit("data", Buffer.from('{"data":"test"}\n'));

      expect(controller.enqueuedData).toHaveLength(0);
    });

    it("does not match events without type to empty string filter", () => {
      const controller = new MockController();
      const filter: EventFilter = { eventTypes: [""] };

      subscribe(
        1,
        "container1",
        controller as unknown as ReadableStreamDefaultController,
        filter,
      );

      const mockProcess = getLastProcess();
      mockProcess.stdout.emit("data", Buffer.from('{"data":"test"}\n'));

      expect(controller.enqueuedData).toHaveLength(0);
    });

    it("closes all controllers when process exits unexpectedly", () => {
      const controller1 = new MockController();
      const controller2 = new MockController();

      subscribe(
        1,
        "container1",
        controller1 as unknown as ReadableStreamDefaultController,
      );
      subscribe(
        1,
        "container1",
        controller2 as unknown as ReadableStreamDefaultController,
      );

      const mockProcess = getLastProcess();

      mockProcess.triggerExit(1, null);

      expect(controller1.closed).toBe(true);
      expect(controller2.closed).toBe(true);

      const controller3 = new MockController();
      subscribe(
        1,
        "container1",
        controller3 as unknown as ReadableStreamDefaultController,
      );

      const newProcess = getLastProcess();
      expect(newProcess).not.toBe(mockProcess);
      expect(createdProcesses).toHaveLength(2);

      // Only controller3 receives events (fresh process, no leaked controllers)
      newProcess.stdout.emit("data", Buffer.from('{"type":"test"}\n'));
      expect(controller1.enqueuedData).toHaveLength(0);
      expect(controller2.enqueuedData).toHaveLength(0);
      expect(controller3.enqueuedData).toHaveLength(1);
    });
  });
});

class FakeProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  killSignal: string | null = null;
  exitHandler: ((code: number | null, signal: string | null) => void) | null =
    null;
  errorHandler: ((error: Error) => void) | null = null;
  catchHandler: ((error: Error) => void) | null = null;

  kill(signal: string) {
    this.killed = true;
    this.killSignal = signal;
  }

  on(
    event: string,
    handler:
      | ((code: number | null, signal: string | null) => void)
      | ((error: Error) => void),
  ) {
    if (event === "exit") {
      this.exitHandler = handler as (
        code: number | null,
        signal: string | null,
      ) => void;
    } else if (event === "error") {
      this.errorHandler = handler as (error: Error) => void;
    }
    return this;
  }

  catch(handler: (error: Error) => void) {
    this.catchHandler = handler;
    return this;
  }

  triggerExit(code: number | null = 0, signal: string | null = null) {
    this.exitHandler?.(code, signal);
  }

  triggerError(error: Error) {
    this.errorHandler?.(error);
  }
}

class MockController {
  enqueuedData: Uint8Array[] = [];
  closed = false;

  enqueue(chunk: Uint8Array) {
    if (this.closed) throw new Error("Controller closed");
    this.enqueuedData.push(chunk);
  }

  close() {
    this.closed = true;
  }

  getMessages(): string[] {
    return this.enqueuedData.map(data => new TextDecoder().decode(data));
  }
}

let createdProcesses: FakeProcess[] = [];

function getLastProcess(): FakeProcess {
  const process = createdProcesses[createdProcesses.length - 1];
  if (!process) {
    throw new Error("No process has been created yet");
  }
  return process;
}
