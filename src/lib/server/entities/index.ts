import bcrypt from "bcrypt";

import type { Node, User } from "../db/schema";

export type { Node, User };

export interface INode {
  node_id: string;
  alias: string;
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
export function publicNodeInfo(node: Node): INode {
  return {
    node_id: node.node_id,
    alias: node.alias,
  };
}
