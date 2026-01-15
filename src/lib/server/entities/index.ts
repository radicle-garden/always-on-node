import bcrypt from "bcrypt";
import { Buffer } from "buffer";
import { base58btc } from "multiformats/bases/base58";
import path from "path";

import { config } from "../config";
import type { Node, SeededRadicleRepository, User } from "../db/schema";

export type { Node, SeededRadicleRepository, User };

export interface INode {
  node_id: string;
  did: string;
  alias: string;
  ssh_public_key: string;
  connect_address: string | null;
}

export interface IUser {
  handle: string;
  nodes: INode[];
  created_at: Date;
  description: string | null;
}

// User helper functions
export function setPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

export function profileFromUser(user: User, nodes: Node[] = []): IUser {
  return {
    handle: user.handle,
    nodes: nodes.map(node => publicNodeInfo(node)),
    description: user.description,
    created_at: user.created_at,
  };
}

// Node helper functions
export function createNodeData(
  nodeId: string,
  alias: string,
  userId: number,
): {
  node_id: string;
  did: string;
  alias: string;
  ssh_public_key: string;
  user_id: number;
  deleted: boolean;
} {
  return {
    node_id: nodeId,
    did: `did:key:${nodeId}`,
    alias: alias,
    ssh_public_key: extractSshPublicKeyFromDid(nodeId),
    user_id: userId,
    deleted: false,
  };
}

export function getRadHome(username: string): string | undefined {
  return path.resolve(config.profileStoragePath, username);
}

export function userStoragePath(username: string): string | undefined {
  return path.resolve(config.profileStoragePath, username, "storage");
}

function extractSshPublicKeyFromDid(nodeId: string): string {
  if (!nodeId) {
    return "";
  }
  const decoded = base58btc.decode(nodeId);

  // Ed25519 multicodec prefix: 0xed 0x01
  const ED25519_PREFIX = Uint8Array.from([0xed, 0x01]);
  const prefixLen = ED25519_PREFIX.length;

  const prefix = decoded.slice(0, prefixLen);
  if (!prefix.every((byte, i) => byte === ED25519_PREFIX[i])) {
    throw new Error("Unsupported key type or invalid prefix");
  }

  const keyBytes = decoded.slice(prefixLen);

  return encodeSshEd25519(keyBytes);
}

function encodeSshEd25519(publicKey: Uint8Array): string {
  const keyType = "ssh-ed25519";

  const writeSshString = (data: string | Uint8Array): Buffer => {
    const buf =
      typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(buf.length, 0);
    return Buffer.concat([len, buf]);
  };

  const sshBuf = Buffer.concat([
    writeSshString(keyType),
    writeSshString(publicKey),
  ]);

  return `${keyType} ${sshBuf.toString("base64")}`;
}

export function publicNodeInfo(node: Node): INode {
  return {
    node_id: node.node_id,
    did: node.did,
    alias: node.alias,
    ssh_public_key: node.ssh_public_key,
    connect_address: node.connect_address,
  };
}
