import type { NodeStatus } from "$types/app";

import { and, eq } from "drizzle-orm";

import { config } from "../config";
import { getDb, schema } from "../db";
import type { User } from "../entities";
import { createServiceLogger } from "../logger";

import { emitNodeStatusChange } from "./nodeStatusEvents";
import { getNodeStatus } from "./nodes";

const log = createServiceLogger("NodeStatusMonitor");

interface MonitoredNode {
  nodeId: string;
  user: User;
  lastStatus: NodeStatus | null;
  intervalId: ReturnType<typeof setInterval> | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

const monitoredNodes = new Map<string, MonitoredNode>();

export function startMonitoring(nodeId: string, user: User): () => void {
  if (monitoredNodes.has(nodeId)) {
    log.info("Node already being monitored", { nodeId, userId: user.id });
    return () => stopMonitoring(nodeId);
  }

  const monitored: MonitoredNode = {
    nodeId,
    user,
    lastStatus: null,
    intervalId: null,
    timeoutId: null,
  };

  monitoredNodes.set(nodeId, monitored);

  monitored.intervalId = setInterval(() => {
    pollNodeStatus(nodeId);
  }, config.nodeStatusPollIntervalMs);

  monitored.timeoutId = setTimeout(() => {
    log.info("Monitor timeout reached", { nodeId, userId: user.id });
    stopMonitoring(nodeId);
  }, config.nodeStatusMonitorTimeoutMs);

  pollNodeStatus(nodeId);

  log.info("Started monitoring node", {
    nodeId,
    userId: user.id,
    timeoutMs: config.nodeStatusMonitorTimeoutMs,
  });

  return () => stopMonitoring(nodeId);
}

function stopMonitoring(nodeId: string): void {
  const monitored = monitoredNodes.get(nodeId);
  if (!monitored) return;

  if (monitored.intervalId) {
    clearInterval(monitored.intervalId);
  }
  if (monitored.timeoutId) {
    clearTimeout(monitored.timeoutId);
  }
  monitoredNodes.delete(nodeId);
  log.info("Stopped monitoring node", { nodeId, userId: monitored.user.id });
}

async function pollNodeStatus(nodeId: string): Promise<void> {
  const monitored = monitoredNodes.get(nodeId);
  if (!monitored) return;

  try {
    const result = await getNodeStatus(nodeId, monitored.user);

    if (!result.success || !result.content) {
      log.warn("Failed to get node status during monitoring", {
        nodeId,
        userId: monitored.user.id,
        error: result.error,
      });
      return;
    }

    const nodeStatus = result.content.nodeStatus;

    const db = await getDb();
    const node = await db.query.nodes.findFirst({
      where: and(
        eq(schema.nodes.node_id, nodeId),
        eq(schema.nodes.deleted, false),
      ),
    });

    const nodeAgeMs = node?.created_at
      ? Date.now() - new Date(node.created_at).getTime()
      : Infinity;

    const currentStatus: NodeStatus = {
      isRunning: nodeStatus.isRunning,
      peers: nodeStatus.peers,
      sinceSeconds: nodeStatus.sinceSeconds ?? 0,
      size: result.content.size,
      isBooting:
        nodeStatus.isRunning &&
        nodeStatus.peers === 0 &&
        nodeAgeMs < config.nodeBootingTimeoutMs,
    };

    const lastStatus = monitored.lastStatus;

    const statusChanged =
      !lastStatus ||
      lastStatus.isRunning !== currentStatus.isRunning ||
      lastStatus.peers !== currentStatus.peers ||
      lastStatus.isBooting !== currentStatus.isBooting;

    if (statusChanged) {
      log.info("Node status changed", {
        userId: monitored.user.id,
        nodeId,
        previousPeers: lastStatus?.peers,
        currentPeers: currentStatus.peers,
        isBooting: currentStatus.isBooting,
        isRunning: currentStatus.isRunning,
      });

      monitored.lastStatus = currentStatus;
      emitNodeStatusChange({ nodeId, status: currentStatus });

      if (currentStatus.isRunning && currentStatus.peers > 0) {
        log.info("Node is now online, stopping monitor", {
          nodeId,
          userId: monitored.user.id,
        });
        stopMonitoring(nodeId);
      }
    }
  } catch (error) {
    log.error("Error polling node status", {
      nodeId,
      error,
      userId: monitored.user.id,
    });
  }
}
