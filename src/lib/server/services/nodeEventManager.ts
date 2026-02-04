import type { ResultPromise } from "execa";
import { execa } from "execa";

import { createServiceLogger } from "../logger";

import { createLineBuffer } from "./lineBuffer";

const log = createServiceLogger("NodeEventManager");

export interface ProcessSpawner {
  spawn(userId: number, containerName: string): ResultPromise;
}

const defaultProcessSpawner: ProcessSpawner = {
  spawn(_userId: number, containerName: string) {
    return execa("podman", [
      "exec",
      "-e",
      "RAD_PASSPHRASE=",
      "-e",
      "RAD_HOME=/radicle",
      containerName,
      "rad",
      "node",
      "events",
    ]);
  },
};

let processSpawner: ProcessSpawner = defaultProcessSpawner;

export interface EventFilter {
  eventTypes?: string[];
}

interface ControllerState {
  controller: ReadableStreamDefaultController;
  filter?: EventFilter;
}

interface ProcessState {
  userId: number;
  process: ReturnType<typeof execa>;
  controllers: Map<ReadableStreamDefaultController, ControllerState>;
}

const processMap = new Map<number, ProcessState>();
const spawningProcesses = new Set<number>();
const encoder = new TextEncoder();

export function subscribe(
  userId: number,
  containerName: string,
  controller: ReadableStreamDefaultController,
  filter?: EventFilter,
): () => void {
  let state = processMap.get(userId);

  if (!state) {
    // Check if already spawning to prevent race condition.
    if (spawningProcesses.has(userId)) {
      throw new Error(
        "Process is already being spawned for this user, please retry",
      );
    }

    try {
      spawningProcesses.add(userId);
      state = spawnProcess(userId, containerName);
      processMap.set(userId, state);
    } catch (error) {
      log.error("Failed to spawn process", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      spawningProcesses.delete(userId);
    }
  }

  state.controllers.set(controller, { controller, filter });

  // Verify process didn't terminate while we were subscribing
  if (!processMap.has(userId)) {
    state.controllers.delete(controller);
    throw new Error("Process terminated while subscribing, please retry");
  }

  log.info("Subscriber added", {
    userId,
    totalControllers: state.controllers.size,
    filter: filter?.eventTypes?.join(",") || "none",
  });

  return () => {
    unsubscribe(userId, controller);
  };
}

function unsubscribe(
  userId: number,
  controller: ReadableStreamDefaultController,
): void {
  const state = processMap.get(userId);
  if (!state) return;

  state.controllers.delete(controller);

  log.info("Subscriber removed", {
    userId,
    remainingControllers: state.controllers.size,
  });

  if (state.controllers.size === 0) {
    log.info("No more subscribers, killing process", { userId });
    state.process.kill("SIGTERM");
    processMap.delete(userId);
  }
}

function spawnProcess(userId: number, containerName: string): ProcessState {
  log.info("Spawning rad node events process", {
    userId,
    containerName,
  });

  const childProcess = processSpawner.spawn(userId, containerName);

  const state: ProcessState = {
    userId,
    process: childProcess,
    controllers: new Map(),
  };

  if (childProcess.stdout) {
    const lineBuffer = createLineBuffer(line => {
      try {
        const event = JSON.parse(line);
        broadcastEvent(userId, event);
      } catch (e) {
        log.warn("Failed to parse event JSON", {
          userId,
          line,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });

    childProcess.stdout.on("data", (chunk: Buffer) => {
      lineBuffer.push(chunk);
    });

    childProcess.stdout.on("end", () => {
      lineBuffer.flush();
    });
  }

  if (childProcess.stderr) {
    childProcess.stderr.on("data", (chunk: Buffer) => {
      log.warn("Process stderr", {
        userId,
        stderr: chunk.toString(),
      });
    });
  }

  const cleanupProcess = (reason: string) => {
    log.info("Process terminating", { userId, reason });

    const state = processMap.get(userId);
    if (state) {
      for (const [controller] of state.controllers) {
        try {
          controller.close();
        } catch {
          // Controller already closed
        }
      }
      state.controllers.clear();
    }

    processMap.delete(userId);
  };

  childProcess.on("exit", (code, signal) => {
    cleanupProcess(`exit code=${code} signal=${signal}`);
  });

  childProcess.on("error", error => {
    cleanupProcess(`error: ${error.message}`);
  });

  childProcess.catch(error => {
    log.warn("Process promise rejected", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return state;
}

function matchesFilter(
  event: { type?: string },
  filter?: EventFilter,
): boolean {
  if (!filter?.eventTypes || filter.eventTypes.length === 0) {
    return true;
  }
  // Events without type field don't match any filter
  if (event.type === undefined) {
    return false;
  }
  return filter.eventTypes.includes(event.type);
}

function broadcastEvent(userId: number, event: unknown): void {
  const state = processMap.get(userId);
  if (!state) return;

  const eventObj = event as { type?: string };
  const closedControllers: ReadableStreamDefaultController[] = [];

  for (const [controller, controllerState] of state.controllers) {
    if (!matchesFilter(eventObj, controllerState.filter)) {
      continue;
    }

    const message = `event: nodeEvent\ndata: ${JSON.stringify(event)}\n\n`;
    const encoded = encoder.encode(message);

    try {
      controller.enqueue(encoded);
    } catch {
      closedControllers.push(controller);
    }
  }

  if (closedControllers.length > 0) {
    for (const controller of closedControllers) {
      state.controllers.delete(controller);
    }

    log.debug("Removed closed controllers", {
      userId,
      count: closedControllers.length,
      remaining: state.controllers.size,
    });

    if (state.controllers.size === 0) {
      log.info("No more active controllers, killing process", { userId });
      state.process.kill("SIGTERM");
      processMap.delete(userId);
    }
  }
}

export const testExports = {
  resetState() {
    processMap.clear();
    spawningProcesses.clear();
  },

  setProcessSpawner(spawner: ProcessSpawner) {
    processSpawner = spawner;
  },

  resetProcessSpawner() {
    processSpawner = defaultProcessSpawner;
  },
};
