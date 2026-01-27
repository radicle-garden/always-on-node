export type UserProfile = {
  handle: string;
  description: string;
  created_at: Date;
  nodes: PublicNodeInfo[];
};

export type PublicNodeInfo = {
  node_id: string;
  did: string;
  alias: string;
  ssh_public_key: string;
  connect_address: string;
};

export type User = {
  id: number;
  email: string;
  email_verified: boolean;
  handle: string;
  nodes: Node[];
  created_at: Date;
  deleted: boolean;
  description: string | null;
};

export type Node = {
  id: number;
  did: string;
  alias: string;
  ssh_public_key: string;
  node_id: string;
  user_id: number;
  created_at: Date;
  deleted: boolean;
  connect_address: string | null;
};

export type NodeStatus = {
  isRunning: boolean;
  peers: number;
  sinceSeconds: number;
  size?: number;
  isBooting?: boolean;
};

export type SeededRadicleRepository = {
  id: number;
  repository_id: string;
  seeding: boolean;
  seeding_start: Date;
  seeding_end: Date | null;
  node_id: number;
};
