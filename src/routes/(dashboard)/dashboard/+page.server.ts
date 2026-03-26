import { Fetcher } from "$lib/http-client/lib/fetcher";
import { Client } from "$lib/http-client/lib/repo";
import { config } from "$lib/server/config";
import { createServiceLogger } from "$lib/server/logger";
import {
  type Repo,
  getNodeStatus,
  getSeededReposForNode,
  seedRepo,
  unseedRepo,
} from "$lib/server/services/nodes";
import { stripeService } from "$lib/server/services/stripe";
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
  syncing?: boolean;
  visibility?: "public" | "private";
  head?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
  const currentUser = locals.user;

  if (!currentUser) {
    throw error(404, "Not found");
  }

  const profile: UserProfile = {
    handle: currentUser.handle,
    description: currentUser.description ?? "",
    created_at: currentUser.created_at,
    nodes: currentUser.nodes.map(
      (n): PublicNodeInfo => ({
        node_id: n.node_id,
        alias: n.alias,
      }),
    ),
  };

  let repos: Repo[] = [];
  const nodeStatuses: Record<string, NodeStatus> = {};

  for (const node of profile.nodes || []) {
    const seededResult = await getSeededReposForNode(node.node_id);
    if (seededResult.success && seededResult.content !== undefined) {
      repos = [...repos, ...seededResult.content];
    }

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

  const repositories: RepoInfo[] = [];
  const httpdClient = new Client(
    new Fetcher({
      hostname: `${currentUser.handle}.${config.fqdn}`,
      port: config.httpdPort,
      scheme: config.httpdScheme,
    }),
  );

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
    } else if (repo.visibility === "private") {
      repositories.push({
        rid: repo.rid,
        name: "",
        description: "",
        seeding: 0,
        issues: { open: 0, closed: 0 },
        patches: { open: 0, merged: 0, draft: 0, archived: 0 },
        visibility: "private",
      });
    } else {
      try {
        const repoData = await httpdClient.getByRid(repo.rid);
        const projectData = repoData.payloads["xyz.radicle.project"];

        repositories.push({
          rid: repo.rid,
          name: projectData.data.name,
          description: projectData.data.description,
          seeding: repoData.seeding,
          issues: projectData.meta.issues,
          patches: projectData.meta.patches,
          visibility:
            repoData.visibility.type === "private" ? "private" : "public",
          head: projectData.meta.head,
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
  const statusResult = await stripeService.getSubscriptionStatus(
    currentUser.id,
  );
  if (statusResult.success && statusResult.content) {
    subscriptionStatus = statusResult.content;
  }

  return {
    profile,
    repositories,
    nodeStatuses,
    subscriptionStatus,
    stripePriceId: config.stripePriceId,
    publicServiceHostPort: config.public.publicServiceHostPort,
    userMaxDiskUsageBytes: config.public.userMaxDiskUsageBytes,
    httpdScheme: config.httpdPublicScheme,
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
