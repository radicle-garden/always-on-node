import { ResponseError } from "$lib/http-client/lib/fetcher";
import { createHttpdClient } from "$lib/server/httpdClient";
import { nodesService } from "$lib/server/services/nodes";
import { usersService } from "$lib/server/services/users";
import { parseNodeStatus } from "$lib/utils";
import type { PublicNodeInfo, UserProfile } from "$types/app";

import { error, fail } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

export interface NodeStatus {
  isRunning: boolean;
  peers: number;
  sinceSeconds: number;
}

export interface RepoInfo {
  rid: string;
  name: string;
  description: string;
  seeding: number;
  issues: { open: number; closed: number };
  patches: { open: number; merged: number; draft: number; archived: number };
  lastCommit?: { time: number };
  syncing?: boolean;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { handle } = params;
  const currentUser = locals.user;
  const isMe = currentUser?.handle === handle;

  let profile: UserProfile;
  if (isMe && currentUser) {
    profile = {
      handle: currentUser.handle,
      description: currentUser.description ?? "",
      created_at: currentUser.created_at,
      nodes: currentUser.nodes.map(
        (n): PublicNodeInfo => ({
          node_id: n.node_id,
          did: n.did,
          alias: n.alias,
          ssh_public_key: n.ssh_public_key,
          connect_address: n.connect_address ?? "",
        }),
      ),
    };
  } else {
    const result = await usersService.retrieveUserByHandle(handle, true);
    if (!result.success || !result.content) {
      throw error(result.statusCode, result.error || "User not found");
    }
    profile = result.content as UserProfile;
  }

  const seededRepositoryIds: string[] = [];
  const nodeStatuses: Record<string, NodeStatus> = {};

  for (const node of profile.nodes || []) {
    const seededResult = await nodesService.getSeededReposForNode(node.node_id);
    if (seededResult.success && seededResult.content) {
      const seeding = seededResult.content.filter(r => r.seeding);
      seededRepositoryIds.push(...seeding.map(r => r.repository_id));
    }

    if (isMe && currentUser) {
      try {
        const statusResult = await nodesService.getNodeStatus(
          node.node_id,
          currentUser,
        );
        if (statusResult.success && statusResult.content) {
          const { isRunning, peers, sinceSeconds } = parseNodeStatus(
            statusResult.content,
          );
          nodeStatuses[node.node_id] = {
            isRunning,
            peers,
            sinceSeconds: sinceSeconds ?? 0,
          };
        } else {
          nodeStatuses[node.node_id] = {
            isRunning: false,
            peers: 0,
            sinceSeconds: 0,
          };
        }
      } catch {
        nodeStatuses[node.node_id] = {
          isRunning: false,
          peers: 0,
          sinceSeconds: 0,
        };
      }
    }
  }

  const repositories: RepoInfo[] = [];
  const httpdClient = createHttpdClient(handle);

  for (const rid of seededRepositoryIds) {
    try {
      const repo = await httpdClient.getByRid(rid);
      const projectData = repo.payloads["xyz.radicle.project"];

      let lastCommitTime: number | undefined;
      try {
        const commitInfo = await httpdClient.getCommitBySha(
          rid,
          projectData.meta.head,
        );
        lastCommitTime = commitInfo.commit.committer.time;
      } catch {
        // Ignore commit fetch errors
      }

      repositories.push({
        rid: repo.rid,
        name: projectData.data.name,
        description: projectData.data.description,
        seeding: repo.seeding,
        issues: projectData.meta.issues,
        patches: projectData.meta.patches,
        lastCommit: lastCommitTime ? { time: lastCommitTime } : undefined,
      });
    } catch (e) {
      if (e instanceof ResponseError && e.status === 404) {
        console.info(`[Profile] Repo ${rid} not synced yet`);
        repositories.push({
          rid,
          name: "",
          description: "",
          seeding: 0,
          issues: { open: 0, closed: 0 },
          patches: { open: 0, merged: 0, draft: 0, archived: 0 },
          syncing: true,
        });
      } else {
        console.warn(`[Profile] Failed to fetch repo ${rid}:`, e);
        repositories.push({
          rid,
          name: "",
          description: "",
          seeding: 0,
          issues: { open: 0, closed: 0 },
          patches: { open: 0, merged: 0, draft: 0, archived: 0 },
        });
      }
    }
  }

  return {
    profile,
    repositories,
    nodeStatuses,
    isMe,
  };
};

export const actions = {
  seed: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "Unauthorized" });
    }

    const data = await request.formData();
    const nodeId = data.get("nodeId")?.toString();
    const rid = data.get("rid")?.toString();

    if (!nodeId || !rid) {
      return fail(400, { error: "Node ID and Repository ID are required" });
    }

    const result = await nodesService.seedRepo(nodeId, rid);

    if (!result.success) {
      return fail(result.statusCode, { error: result.error });
    }

    return { success: true };
  },

  unseed: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "Unauthorized" });
    }

    const data = await request.formData();
    const nodeId = data.get("nodeId")?.toString();
    const rid = data.get("rid")?.toString();

    if (!nodeId || !rid) {
      return fail(400, { error: "Node ID and Repository ID are required" });
    }

    const result = await nodesService.unseedRepo(nodeId, rid);

    if (!result.success) {
      return fail(result.statusCode, { error: result.error });
    }

    return { success: true };
  },
} satisfies Actions;
