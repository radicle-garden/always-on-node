import type { WeeklyActivity } from "$lib/commit";
import { groupCommitsByWeek } from "$lib/commit";
import { config } from "$lib/server/config";
import { createHttpdClient } from "$lib/server/httpdClient";
import { createServiceLogger } from "$lib/server/logger";
import {
  type Repo,
  getNodeStatus,
  getSeededReposForNode,
  seedRepo,
  unseedRepo,
} from "$lib/server/services/nodes";
import { stripeService } from "$lib/server/services/stripe";
import { usersService } from "$lib/server/services/users";
import { parseRepositoryId } from "$lib/utils";
import type { NodeStatus, PublicNodeInfo, UserProfile } from "$types/app";

import { error, fail } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

const log = createServiceLogger("Nodes");

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

  let repos: Repo[] = [];
  const nodeStatuses: Record<string, NodeStatus> = {};

  for (const node of profile.nodes || []) {
    const seededResult = await getSeededReposForNode(node.node_id);
    if (seededResult.success && seededResult.content !== undefined) {
      repos = [...repos, ...seededResult.content];
    }

    if (isMe && currentUser) {
      const fullNode = currentUser.nodes.find(n => n.node_id === node.node_id);
      const nodeAgeMs = fullNode?.created_at
        ? Date.now() - new Date(fullNode.created_at).getTime()
        : Infinity;

      try {
        const statusResult = await getNodeStatus(node.node_id, currentUser);
        if (statusResult.success && statusResult.content) {
          const nodeStatus = statusResult.content.nodeStatus;
          const isBooting =
            nodeStatus.isRunning &&
            nodeStatus.peers === 0 &&
            nodeAgeMs < config.nodeBootingTimeoutMs;
          nodeStatuses[node.node_id] = {
            isRunning: nodeStatus.isRunning,
            peers: nodeStatus.peers,
            sinceSeconds: nodeStatus.sinceSeconds ?? 0,
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

  for (const repo of repos) {
    if (repo.fetching) {
      repositories.push({
        rid: repo.rid,
        name: "",
        description: "",
        seeding: 0,
        issues: { open: 0, closed: 0 },
        patches: { open: 0, merged: 0, draft: 0, archived: 0 },
        syncing: true,
      });
    } else {
      try {
        const repoData = await httpdClient.getByRid(repo.rid);
        const projectData = repoData.payloads["xyz.radicle.project"];

        let lastCommitTime: number | undefined;
        try {
          const commitInfo = await httpdClient.getCommitBySha(
            repo.rid,
            projectData.meta.head,
          );
          lastCommitTime = commitInfo.commit.committer.time;
        } catch {
          // Ignore commit fetch errors
        }

        const commits = await httpdClient.getActivity(repo.rid);

        repositories.push({
          rid: repo.rid,
          name: projectData.data.name,
          description: projectData.data.description,
          seeding: repoData.seeding,
          issues: projectData.meta.issues,
          patches: projectData.meta.patches,
          lastCommit: lastCommitTime ? { time: lastCommitTime } : undefined,
          activity: groupCommitsByWeek(commits.activity),
        });
      } catch (e) {
        log.warn("Failed to fetch repo", { rid: repo.rid, error: e });
        repositories.push({
          rid: repo.rid,
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

    const seededResult = await getSeededReposForNode(nodeId);
    if (seededResult.success && seededResult.content !== undefined) {
      const alreadySeeded = seededResult.content.find(r => r.rid === fullRid);
      if (alreadySeeded) {
        return fail(400, { error: "This repository is already seeded" });
      }
    }

    const result = await seedRepo(nodeId, fullRid);

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

    const result = await unseedRepo(
      nodeId,
      `${parsedRid.prefix}${parsedRid.pubkey}`,
    );

    if (!result.success) {
      return fail(result.statusCode, { error: result.error });
    }

    return { success: true };
  },
} satisfies Actions;
