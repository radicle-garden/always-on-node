import { getDb, schema } from "$lib/server/db";
import { createServiceLogger } from "$lib/server/logger";
import { getWebhookSecret } from "$lib/server/services/webhookConfig";

import crypto from "crypto";
import { sql } from "drizzle-orm";

import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

const log = createServiceLogger("CommitStatus");

const VALID_STATES = new Set(["pending", "running", "success", "failure"]);

export const POST: RequestHandler = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Garden-Signature-256");

  if (!signature) {
    log.warn("Missing X-Garden-Signature-256 header");
    return json({ error: "Missing signature header" }, { status: 400 });
  }

  let body: {
    node_id?: string;
    repo_id?: string;
    sha?: string;
    context?: string;
    state?: string;
    description?: string;
    target_url?: string;
  };

  try {
    body = JSON.parse(rawBody);
  } catch {
    log.warn("Invalid JSON");
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { node_id, repo_id, sha, context, state, description, target_url } =
    body;

  if (!node_id || !repo_id || !sha || !context || !state) {
    log.warn("Missing required fields");
    return json(
      {
        error: "Missing required fields",
        details: "node_id, repo_id, sha, context, and state are required",
      },
      { status: 400 },
    );
  }

  if (!VALID_STATES.has(state)) {
    log.warn(`Invalid State ${state}`);
    return json(
      {
        error: "Invalid state",
        details: `state must be one of: ${[...VALID_STATES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Look up the webhook secret
  let secret: string | null;
  try {
    secret = await getWebhookSecret(node_id, repo_id, sha, context);
  } catch (error) {
    log.error("Failed to look up webhook secret", {
      error: String(error),
      node_id,
      repo_id,
      context,
    });
    return json({ error: "Internal server error" }, { status: 500 });
  }

  if (!secret) {
    log.warn("No webhook secret found", { node_id, repo_id, context });
    return json({ error: "No webhook configuration found" }, { status: 404 });
  }

  // Verify HMAC-SHA256 signature
  const expectedSig =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      log.warn("HMAC verification failed", { node_id, repo_id, context });
      log.debug("HMAC verification failed (details)", {
        node_id,
        repo_id,
        context,
        signature,
        expectedSig,
        rawBody,
      });
      return json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    log.warn("HMAC verification error (length mismatch)", {
      node_id,
      repo_id,
      context,
    });
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  // Upsert repo_commit_status
  try {
    const db = await getDb();
    await db
      .insert(schema.repoCommitStatuses)
      .values({
        node_id,
        repo_id,
        sha,
        context,
        state,
        description: description ?? null,
        target_url: target_url ?? null,
      })
      .onConflictDoUpdate({
        target: [
          schema.repoCommitStatuses.node_id,
          schema.repoCommitStatuses.repo_id,
          schema.repoCommitStatuses.sha,
          schema.repoCommitStatuses.context,
        ],
        set: {
          state,
          description: description ?? null,
          target_url: target_url ?? null,
          updated_at: sql`now()`,
        },
      });

    log.info("Commit status updated", {
      node_id,
      repo_id,
      sha,
      context,
      state,
    });
    return json({ updated: true, state });
  } catch (error) {
    log.error("Failed to upsert commit status", {
      error: String(error),
      node_id,
      repo_id,
      sha,
      context,
    });
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
