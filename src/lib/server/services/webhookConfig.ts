import { and, eq, isNull } from "drizzle-orm";
import { execa } from "execa";
import path from "path";
import YAML from "yaml";

import { config } from "../config";
import { getDb, schema } from "../db";
import { createServiceLogger } from "../logger";

const log = createServiceLogger("WebhookConfig");

/**
 * Look up the shared secret for a webhook callback.
 *
 * 1. Check the `webhook_repo_configuration` table (DB-sourced configs).
 * 2. Fall back to decrypting `.radicle/webhooks/*.yaml` from the bare repo
 *    on disk using the node's private key.
 *
 * Returns `null` if no secret is found from either source.
 */
export async function getWebhookSecret(
  nodeId: string,
  repoId: string,
  sha: string,
  context: string,
): Promise<string | null> {
  const dbSecret = await getSecretFromDb(nodeId, repoId, context);
  if (dbSecret !== null) {
    return dbSecret;
  }

  return await getSecretFromRepo(nodeId, repoId, sha, context);
}

async function getSecretFromDb(
  nodeId: string,
  repoId: string,
  context: string,
): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.query.webhookRepoConfigurations.findFirst({
      where: and(
        eq(schema.webhookRepoConfigurations.node_id, nodeId),
        eq(schema.webhookRepoConfigurations.repo_id, repoId),
        eq(schema.webhookRepoConfigurations.context, context),
        isNull(schema.webhookRepoConfigurations.deleted_at),
      ),
    });

    if (row?.secret) {
      log.debug("Found webhook secret in DB", { nodeId, repoId, context });
      return row.secret;
    }

    return null;
  } catch (error) {
    log.error("Failed to query webhook_repo_configuration", {
      error: String(error),
      nodeId,
      repoId,
      context,
    });
    throw error;
  }
}

/**
 * Derive the radHome for a node, then read and decrypt
 * `.radicle/webhooks/*.yaml` from the bare repo storage to find the
 * matching webhook secret.
 */
async function getSecretFromRepo(
  nodeId: string,
  repoId: string,
  sha: string,
  context: string,
): Promise<string | null> {
  const db = await getDb();
  const node = await db.query.nodes.findFirst({
    where: and(
      eq(schema.nodes.node_id, nodeId),
      eq(schema.nodes.deleted, false),
    ),
    with: { user: true },
  });

  if (!node?.user) {
    log.warn("Node not found for repo secret lookup", { nodeId });
    return null;
  }

  const radHome = path.resolve(config.profileStoragePath, node.user.handle);
  // The bare repo is stored without the `rad:` prefix.
  const bareRepoId = repoId.replace(/^rad:/, "");
  const repoPath = path.join(radHome, "storage", bareRepoId);
  const keyPath = path.join(radHome, "keys", "radicle");

  // List webhook config files at the specific commit.
  const webhookFiles = await listWebhookFiles(repoPath, sha);
  if (webhookFiles.length === 0) {
    log.debug("No webhook config files found in repo", {
      nodeId,
      repoId,
      sha,
    });
    return null;
  }

  for (const filePath of webhookFiles) {
    const secret = await decryptAndMatchWebhook(
      repoPath,
      sha,
      filePath,
      keyPath,
      context,
    );
    if (secret !== null) {
      log.debug("Found webhook secret in repo", {
        nodeId,
        repoId,
        context,
        filePath,
      });
      return secret;
    }
  }

  log.debug("No matching webhook context found in repo", {
    nodeId,
    repoId,
    context,
  });
  return null;
}

/**
 * List `.radicle/webhooks/*.yaml` files at a specific commit in a bare repo.
 */
async function listWebhookFiles(
  repoPath: string,
  sha: string,
): Promise<string[]> {
  const { stdout } = await execa(
    "git",
    ["ls-tree", "-r", "--name-only", sha, "--", ".radicle/webhooks/"],
    { cwd: repoPath },
  );
  if (!stdout.trim()) {
    return [];
  }
  return stdout
    .split("\n")
    .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
}

/**
 * Read an encrypted webhook YAML from the bare repo at a specific commit,
 * decrypt it with the node's private key (age), parse YAML, and check if
 * it matches the given context.
 *
 * Returns the shared_secret if context matches, null otherwise.
 */
async function decryptAndMatchWebhook(
  repoPath: string,
  sha: string,
  filePath: string,
  keyPath: string,
  context: string,
): Promise<string | null> {
  // Read encrypted file content from git at the specific commit
  const { stdout: encrypted } = await execa(
    "git",
    ["show", `${sha}:${filePath}`],
    { cwd: repoPath, encoding: "buffer" },
  );

  // Decrypt using age with the node's private key
  const { stdout: decrypted } = await execa("age", ["-d", "-i", keyPath], {
    input: encrypted,
    encoding: "utf8",
  });

  return parseWebhookYaml(decrypted, context);
}

/**
 * Parse a decrypted webhook YAML config and extract the shared_secret
 * for the given context (webhook name).
 *
 * Expected format:
 * ```yaml
 * ---
 * webhook_name:
 *   payload_url: https://...
 *   content_type: application/json
 *   shared_secret: <secret>
 * ```
 */
function parseWebhookYaml(yamlContent: string, context: string): string | null {
  const parsed = YAML.parse(yamlContent);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const webhook = parsed[context];
  if (!webhook || typeof webhook !== "object") {
    return null;
  }

  return typeof webhook.shared_secret === "string"
    ? webhook.shared_secret
    : null;
}

export const testExports = { parseWebhookYaml };
