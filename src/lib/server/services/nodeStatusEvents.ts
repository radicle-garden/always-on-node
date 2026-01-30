import type { NodeStatus } from "$types/app";

import { EventEmitter } from "events";

export const nodeStatusEmitter = new EventEmitter();

nodeStatusEmitter.setMaxListeners(100);

export interface NodeStatusChangeEvent {
  nodeId: string;
  status: NodeStatus;
}

export function emitNodeStatusChange(event: NodeStatusChangeEvent): void {
  nodeStatusEmitter.emit("nodeStatusChange", event);
}

export function onNodeStatusChange(
  callback: (event: NodeStatusChangeEvent) => void,
): () => void {
  nodeStatusEmitter.on("nodeStatusChange", callback);
  return () => nodeStatusEmitter.off("nodeStatusChange", callback);
}
