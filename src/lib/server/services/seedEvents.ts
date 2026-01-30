import { EventEmitter } from "events";

import { config } from "../config";

export const seedEventEmitter = new EventEmitter();

seedEventEmitter.setMaxListeners(config.sseMaxListeners);

export interface SeedCompleteEvent {
  rid: string;
  nodeId: string;
  success: boolean;
}

export function emitSeedComplete(event: SeedCompleteEvent): void {
  seedEventEmitter.emit("seedComplete", event);
}

export function onSeedComplete(
  callback: (event: SeedCompleteEvent) => void,
): () => void {
  seedEventEmitter.on("seedComplete", callback);
  return () => seedEventEmitter.off("seedComplete", callback);
}
