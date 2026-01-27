import type { WeeklyActivity } from "$lib/commit";
import { groupCommitsByWeek } from "$lib/commit";
import { ResponseError } from "$lib/http-client/lib/fetcher";
import { config } from "$lib/server/config";
import { createHttpdClient } from "$lib/server/httpdClient";
import { nodesService } from "$lib/server/services/nodes";
import { stripeService } from "$lib/server/services/stripe";
import { usersService } from "$lib/server/services/users";
import { parseNodeStatus, parseRepositoryId } from "$lib/utils";
import type { NodeStatus, PublicNodeInfo, UserProfile } from "$types/app";

import { error, fail } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

export interface RepoInfo {
  rid: string;
  name: string;
  description: string;
  seeding: number;
  issues: { open: number; closed: number };
  patches: { open: number; merged: number; draft: number; archived: number };
  lastCommit?: { time: number };
  syncing?: boolean;
  activity?: WeeklyActivity[];
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
      const fullNode = currentUser.nodes.find(n => n.node_id === node.node_id);
      const nodeAgeMs = fullNode?.created_at
        ? Date.now() - new Date(fullNode.created_at).getTime()
        : Infinity;

      try {
        const statusResult = await nodesService.getNodeStatus(
          node.node_id,
          currentUser,
        );
        if (statusResult.success && statusResult.content) {
          const { isRunning, peers, sinceSeconds } = parseNodeStatus(
            statusResult.content.stdout,
          );
          const isBooting =
            isRunning && peers === 0 && nodeAgeMs < config.nodeBootingTimeoutMs;
          nodeStatuses[node.node_id] = {
            isRunning,
            peers,
            sinceSeconds: sinceSeconds ?? 0,
            size: statusResult.content.size,
            isBooting,
          };
        } else {
          nodeStatuses[node.node_id] = {
            isRunning: false,
            peers: 0,
            sinceSeconds: 0,
            size: 0,
            isBooting: nodeAgeMs < config.nodeBootingTimeoutMs,
          };
        }
      } catch {
        nodeStatuses[node.node_id] = {
          isRunning: false,
          peers: 0,
          sinceSeconds: 0,
          size: 0,
          isBooting: nodeAgeMs < config.nodeBootingTimeoutMs,
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

      const commits = await httpdClient.getActivity(rid);

      repositories.push({
        rid: repo.rid,
        name: projectData.data.name,
        description: projectData.data.description,
        seeding: repo.seeding,
        issues: projectData.meta.issues,
        patches: projectData.meta.patches,
        lastCommit: lastCommitTime ? { time: lastCommitTime } : undefined,
        activity: groupCommitsByWeek(commits.activity),
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

  let subscriptionStatus = null;
  if (isMe && currentUser) {
    const statusResult = await stripeService.getSubscriptionStatus(
      currentUser.id,
    );
    if (statusResult.success && statusResult.content) {
      subscriptionStatus = statusResult.content;
    }
  }

  return {
    profile,
    repositories,
    nodeStatuses,
    isMe,
    subscriptionStatus,
    stripePriceId: config.stripePriceId,
    publicServiceHostPort: config.public.publicServiceHostPort,
    userMaxDiskUsageBytes: config.public.userMaxDiskUsageBytes,
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

    const parsedRid = parseRepositoryId(rid);
    if (!parsedRid) {
      return fail(400, { error: "Invalid Repository ID format" });
    }

    const fullRid = `${parsedRid.prefix}${parsedRid.pubkey}`;

    const result = await nodesService.seedRepo(nodeId, fullRid, success => {
      import("$lib/server/services/seedEvents").then(({ emitSeedComplete }) => {
        emitSeedComplete({ rid: fullRid, nodeId, success });
      });
    });

    if (!result.success) {
      return fail(result.statusCode, { error: result.error });
    }

    return { success: true, rid: fullRid };
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

    const parsedRid = parseRepositoryId(rid);
    if (!parsedRid) {
      return fail(400, { error: "Invalid Repository ID format" });
    }

    const result = await nodesService.unseedRepo(
      nodeId,
      `${parsedRid.prefix}${parsedRid.pubkey}`,
    );

    if (!result.success) {
      return fail(result.statusCode, { error: result.error });
    }

    return { success: true };
  },
} satisfies Actions;
