import { execa } from "execa";

import { createServiceLogger } from "../logger";

const log = createServiceLogger("NodeEventManager");

interface ProcessState {
  userId: number;
  process: ReturnType<typeof execa>;
  controllers: Set<ReadableStreamDefaultController>;
}

const processMap = new Map<number, ProcessState>();
const spawningProcesses = new Set<number>();
const encoder = new TextEncoder();

export function subscribe(
  userId: number,
  containerName: string,
  controller: ReadableStreamDefaultController,
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

  state.controllers.add(controller);

  // Verify process didn't terminate while we were subscribing
  if (!processMap.has(userId)) {
    state.controllers.delete(controller);
    throw new Error("Process terminated while subscribing, please retry");
  }

  log.info("Subscriber added", {
    userId,
    totalControllers: state.controllers.size,
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

  const childProcess = execa("podman", [
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

  const state: ProcessState = {
    userId,
    process: childProcess,
    controllers: new Set(),
  };

  if (childProcess.stdout) {
    let buffer = "";

    const processLine = (line: string) => {
      if (line.trim()) {
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
      }
    };

    childProcess.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        processLine(line);
      }
    });

    childProcess.stdout.on("end", () => {
      // Process any remaining data in buffer
      if (buffer.trim()) {
        processLine(buffer);
      }
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
      for (const controller of state.controllers) {
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

function broadcastEvent(userId: number, event: unknown): void {
  const state = processMap.get(userId);
  if (!state) return;

  const message = `event: nodeEvent\ndata: ${JSON.stringify(event)}\n\n`;
  const encoded = encoder.encode(message);

  const closedControllers: ReadableStreamDefaultController[] = [];

  for (const controller of state.controllers) {
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
