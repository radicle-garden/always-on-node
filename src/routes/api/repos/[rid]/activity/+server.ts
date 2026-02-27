import type { WeeklyActivity } from "$lib/commit";
import { groupCommitsByWeek } from "$lib/commit";
import { createHttpdClient } from "$lib/server/httpdClient";
import { logger } from "$lib/server/logger";

import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export interface ActivityResponse {
  activity: WeeklyActivity[];
  lastCommit?: { time: number; sha: string };
}

export const GET: RequestHandler = async ({ params, locals }) => {
  const currentUser = locals.user;

  if (!currentUser) {
    throw error(401, "Unauthorized");
  }

  const { rid } = params;

  if (!rid) {
    throw error(400, "Repository ID is required");
  }

  const httpdClient = createHttpdClient(currentUser.handle);

  try {
    const [repoData, commits] = await Promise.all([
      httpdClient.getByRid(rid),
      httpdClient.getActivity(rid),
    ]);

    const projectData = repoData.payloads["xyz.radicle.project"];

    let lastCommit: { time: number; sha: string } | undefined;
    if (commits.activity.length > 0) {
      lastCommit = {
        time: commits.activity[0],
        sha: projectData.meta.head,
      };
    }

    const response: ActivityResponse = {
      activity: groupCommitsByWeek(commits.activity),
      lastCommit,
    };

    return json(response);
  } catch (e) {
    logger.error("Failed to fetch activity data", { error: e, rid });
    throw error(500, "Failed to fetch activity data");
  }
};
