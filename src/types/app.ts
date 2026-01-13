export type UserProfile = {
  handle: string;
  description: string;
  created_at: string;
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
  created_at: string;
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
  created_at: string;
  deleted: boolean;
  connect_address: string | null;
};

export type SeededRadicleRepository = {
  id: number;
  repository_id: string;
  seeding: boolean;
  seeding_start: string;
  seeding_end: string | null;
  node_id: number;
};
