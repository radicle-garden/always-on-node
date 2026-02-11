import { and, eq } from "drizzle-orm";
import { execa } from "execa";
import fs from "fs";
import getPort, { portNumbers } from "get-port";
import path from "path";

import { DockerClient } from "@docker/node-sdk";

import { config } from "../config";
import { getDb, schema } from "../db";
import type { Node, User } from "../entities";
import { createServiceLogger } from "../logger";

type NodeStatus =
  | {
      isRunning: boolean;
      peers: number;
      since: number;
      sinceSeconds?: undefined;
    }
  | {
      isRunning: boolean;
      peers: number;
      sinceSeconds: number;
      since?: undefined;
    };

type RadEnv = {
  RAD_PASSPHRASE: string;
  RAD_HOME: string;
  TZ?: string;
};

const log = createServiceLogger("Nodes");

interface ServiceResult<T> {
  success: boolean;
  content?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export function getRadHome(username: string): string | undefined {
  return path.resolve(config.profileStoragePath, username);
}

function userStoragePath(username: string): string | undefined {
  return path.resolve(config.profileStoragePath, username, "storage");
}

function createNodeData(
  nodeId: string,
  alias: string,
  userId: number,
): {
  node_id: string;
  alias: string;
  user_id: number;
  deleted: boolean;
} {
  return {
    node_id: nodeId,
    alias: alias,
    user_id: userId,
    deleted: false,
  };
}

async function allocateNodePort(userId: number): Promise<number> {
  const nodePort = await getPort({
    host: "0.0.0.0",
    port: portNumbers(config.nodePortRangeStart, config.nodePortRangeEnd),
  });

  if (
    nodePort < config.nodePortRangeStart ||
    nodePort > config.nodePortRangeEnd
  ) {
    log.error("No available ports in configured range", {
      nodePort,
      rangeStart: config.nodePortRangeStart,
      rangeEnd: config.nodePortRangeEnd,
      userId,
    });
    throw new Error(
      `No available ports in configured range ${config.nodePortRangeStart}-${config.nodePortRangeEnd}`,
    );
  }

  return nodePort;
}

/**
 * Example seed command result:
 * ```
 * ✓ Seeding policy updated for rad:z2X8Sn1o4pL7zVmXjcEvfUkiLS5jc with scope 'all'
 * Fetching rad:z2X8Sn1o4pL7zVmXjcEvfUkiLS5jc from the network, found 2 potential seed(s).
 * ✗ Target not met: could not fetch from [z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo, z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7], and required 2 more seed(s)
 * ```
 */
function parseSeedCommandResult(
  result: { stdout: string; stderr: string } | null,
): boolean {
  if (!result) {
    return false;
  }
  const lines = result.stdout.split("\n");
  if (lines.some(line => line.includes("✗ Target not met"))) {
    return false;
  }
  return true;
}

async function createNode(user: User): Promise<Node | null> {
  const nodeAlias = `${user.handle}_seed`;

  const radHome = getRadHome(user.handle);
  if (!radHome) {
    log.warn(`Failed to get RAD_HOME for user ${user.handle}`, {
      userId: user.id,
    });
    return null;
  }

  fs.mkdirSync(radHome, { recursive: true });

  const radBinary = config.radBinaryPath;

  const env = {
    ...process.env,
    RAD_PASSPHRASE: "",
    RAD_HOME: radHome,
  };

  try {
    log.info(`Creating radicle identity for ${user.handle}`, {
      userId: user.id,
    });

    await execa(radBinary, ["auth", "--alias", nodeAlias], { env });

    const nodeId = (
      await execa(radBinary, ["self", "--nid"], { env })
    ).stdout.trim();

    log.info("Created a new profile", {
      nodeId,
      userId: user.id,
    });

    const nodePort = await allocateNodePort(user.id);

    const nodeFqdn = `${user.handle}.${config.fqdn}`;
    await updateConfig(nodePort, env, nodeFqdn, config.nodePreferredSeeds);

    try {
      const db = await getDb();
      log.info("Creating new node", { nodeId, userId: user.id });

      const nodeData = createNodeData(nodeId, nodeAlias, user.id);
      const [persistedNode] = await db
        .insert(schema.nodes)
        .values(nodeData)
        .returning();

      try {
        await createContainers(
          nodeAlias,
          user.id,
          nodePort,
          radHome,
          nodeId,
          user.handle,
        );
      } catch (error) {
        log.error("[Nodes] Couldn't create containers", {
          userId: user.id,
          error: String(error),
        });
        return null;
      }

      return persistedNode;
    } catch (nodeInsertErr) {
      log.error("Failed to insert node into database", {
        error: String(nodeInsertErr),
        userId: user.id,
      });
      return null;
    }
  } catch (cliError) {
    const message =
      cliError instanceof Error ? cliError.message : String(cliError);
    log.error(`Error during CLI steps: ${message}`, { userId: user.id });
    return null;
  }
}

async function createContainers(
  nodeAlias: string,
  userId: number,
  nodePort: number,
  radHome: string,
  nodeId: string,
  userHandle: string,
) {
  const docker = await DockerClient.fromDockerHost(config.dockerHost);

  log.debug(`Pulling container images for ${nodeAlias}`, {
    userId,
  });

  const nodeImage = config.radicleNodeContainer;
  const httpdImage = config.radicleHttpdContainer;
  const [nodeImageName, nodeImageTag] = config.radicleNodeContainer.split(":");
  const [httpdImageName, httpdImageTag] =
    config.radicleHttpdContainer.split(":");

  const nodeImagePull = docker.imageCreate({
    fromImage: nodeImageName,
    tag: nodeImageTag,
    platform: "linux/arm64",
  });
  const httpdImagePull = docker.imageCreate({
    fromImage: httpdImageName,
    tag: httpdImageTag,
    platform: "linux/arm64",
  });

  await nodeImagePull.wait();
  await httpdImagePull.wait();
  log.debug(`Images pulled successfully for ${nodeAlias}`, {
    userId,
  });

  const nodeContainerName = `${nodeAlias}-node`;
  const nodeContainer = await docker.containerCreate(
    {
      Image: nodeImage,
      Env: ["RUST_BACKTRACE=1", "RAD_HOME=/radicle", "RAD_PASSPHRASE="],
      Cmd: [
        "--log-logger",
        "structured",
        "--log-format",
        "json",
        "--listen",
        "0.0.0.0:8776",
      ],
      ExposedPorts: {
        [`${nodePort}/tcp`]: {},
      },
      Healthcheck: {
        Test: ["CMD-SHELL", "/usr/local/bin/radicle-healthcheck"],
        Interval: 10_000_000_000, // ns
        Timeout: 5_000_000_000, // ns
        Retries: 10,
      },
      HostConfig: {
        Binds: [`${radHome}:/radicle`],
        PortBindings: {
          [`${nodePort}/tcp`]: [{ HostPort: String(nodePort) }],
        },
        RestartPolicy: {
          Name: "always",
        },
        UsernsMode: "keep-id:uid=11011,gid=11011",
      },
      Labels: {
        app: "garden",
        component: "radicle-node",
        garden_user: userHandle,
        node_id: nodeId,
      },
    },
    { name: nodeContainerName, platform: "linux/arm64" },
  );

  log.info(`Created node container ${nodeContainerName}`, {
    containerId: nodeContainer.Id,
    userId,
  });

  const httpdContainerName = `${nodeAlias}-httpd`;
  const httpdContainer = await docker.containerCreate(
    {
      Image: httpdImage,
      Env: ["RUST_LOG=debug", "RUST_BACKTRACE=1", "RAD_HOME=/radicle"],
      Cmd: ["--listen", `/radicle/httpd.sock`],
      HostConfig: {
        Binds: [`${radHome}:/radicle`],
        RestartPolicy: {
          Name: "always",
        },
        UsernsMode: "keep-id:uid=11011,gid=11011",
      },
      Labels: {
        app: "garden",
        component: "radicle-httpd",
        garden_user: userHandle,
        node_id: nodeId,
      },
    },
    { name: httpdContainerName, platform: "linux/arm64" },
  );

  log.info(`Created httpd container ${httpdContainerName}`, {
    containerId: httpdContainer.Id,
    userId,
  });

  log.info(
    "Containers created but not started. Will be started after subscription is active.",
    {
      userId,
    },
  );
}

async function execNodeCommand(
  node: Node,
  radSubcommand: string,
  args: string[] = [],
): Promise<{ stdout: string; stderr: string } | null> {
  const containerName = `${node.alias}-node`;

  try {
    const { stdout, stderr } = await execa("podman", [
      "exec",
      "-e",
      "RAD_PASSPHRASE=",
      "-e",
      "RAD_HOME=/radicle",
      containerName,
      "rad",
      radSubcommand,
      ...args,
    ]);

    log.debug("Node command output", { stdout, userId: node.user_id });
    if (stderr) {
      log.warn("Node command stderr", { stderr, userId: node.user_id });
    }

    return { stdout, stderr };
  } catch (cliError: unknown) {
    const errorMessage =
      cliError instanceof Error ? cliError.message : String(cliError);
    log.warn("Failed to run command in container", {
      error: errorMessage,
      userId: node.user_id,
    });
    return null;
  }
}

export async function getNodeStatus(
  nodeId: string,
  user: User,
): Promise<ServiceResult<{ nodeStatus: NodeStatus; size?: number }>> {
  try {
    const db = await getDb();
    const node = await db.query.nodes.findFirst({
      where: and(
        eq(schema.nodes.node_id, nodeId),
        eq(schema.nodes.deleted, false),
      ),
      with: { user: true },
    });

    if (!node || node.user?.id !== user.id) {
      log.warn("No active node found", { nodeId, userId: user.id });
      return {
        success: false,
        error: `No active node found with node_id: ${nodeId}`,
        statusCode: 404,
      };
    }

    const result = await execNodeCommand(node, "node", ["status"]);
    if (!result) {
      return {
        success: false,
        error: `Failed to retrieve node status for node ${nodeId}`,
        statusCode: 500,
      };
    }

    let size: number | undefined; // Bytes.
    const storagePath = userStoragePath(node.user.handle);

    if (storagePath) {
      try {
        const { stdout: duOutput } = await execa("du", ["-sk", storagePath]);
        // Parse du output format: "1234\t/path/to/storage".
        // -s: summarize total size
        // -k: report size in kilobytes
        const sizeParts = duOutput.trim().split(/\s+/);
        const sizeInKb = Number.parseInt(sizeParts[0], 10);

        if (!Number.isNaN(sizeInKb) && sizeInKb >= 0) {
          size = sizeInKb * 1024; // Convert to bytes.
        } else {
          log.warn("Invalid du output", { nodeId, duOutput, userId: user.id });
        }
      } catch (duError) {
        log.warn("Failed to get storage size", {
          nodeId,
          error: String(duError),
          userId: user.id,
        });
      }
    }

    return {
      success: true,
      content: { nodeStatus: parseNodeStatus(result.stdout), size },
      statusCode: 200,
    };
  } catch (dbError) {
    log.error("Failed to retrieve node", {
      nodeId,
      error: String(dbError),
      userId: user.id,
    });
    return {
      success: false,
      error: `Failed to retrieve node ${nodeId}`,
      statusCode: 500,
    };
  }
}

function parseNodeStatus(status: string): NodeStatus {
  if (!status) {
    return {
      isRunning: false,
      peers: 0,
      since: 0,
    };
  }

  try {
    const lines = status.split("\n");
    const isRunning =
      lines.filter(line => line.includes("Node is running")).length >= 1;
    const peers = lines.filter(line => line.includes("✓")).length - 2;

    const timeUnits = ["second", "minute", "hour", "day", "month", "year"];
    const timeUnitValues = {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400,
      month: 2592000,
      year: 31536000,
    };

    const timeLines = lines.filter(line =>
      timeUnits.some(unit => line.includes(unit)),
    );

    const timeValues = timeLines
      .map(line => {
        for (const unit of timeUnits) {
          const match = line.match(
            new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}s?`),
          );
          if (match) {
            const value = parseFloat(match[1]);
            return {
              value,
              unit,
              seconds:
                value * timeUnitValues[unit as keyof typeof timeUnitValues],
            };
          }
        }
        return null;
      })
      .filter(Boolean) as Array<{
      value: number;
      unit: string;
      seconds: number;
    }>;

    const longestTime = timeValues.sort((a, b) => b.seconds - a.seconds)[0];
    const sinceSeconds = longestTime ? longestTime.seconds : 0;

    return {
      isRunning,
      peers,
      sinceSeconds,
    };
  } catch {
    return {
      isRunning: false,
      peers: 0,
      sinceSeconds: 0,
    };
  }
}

export type Repo = {
  rid: string;
  fetching: boolean;
};

export async function getSeededReposForNode(
  nodeId: string,
): Promise<ServiceResult<Repo[]>> {
  try {
    const db = await getDb();
    const node = await db.query.nodes.findFirst({
      where: and(
        eq(schema.nodes.node_id, nodeId),
        eq(schema.nodes.deleted, false),
      ),
    });
    if (!node) {
      log.warn("No node found", { nodeId });
      return {
        success: false,
        error: `No node found with node_id: ${nodeId}`,
        statusCode: 404,
      };
    }

    const lsResult = await execNodeCommand(node, "ls", ["--all"]);

    if (!lsResult) {
      log.warn("Failed to get repo list for node", {
        nodeId,
        userId: node.user_id,
      });
    }

    const lsRids: string[] =
      lsResult?.stdout.match(/\brad:[a-zA-Z0-9]+\b/g) ?? [];

    log.debug("Retrieved seeded repositories", {
      nodeId,
      count: lsRids.length,
      userId: node.user_id,
    });

    const seedResult = await execNodeCommand(node, "seed");

    if (!seedResult) {
      log.warn("Failed to get seed policy table for node", {
        nodeId,
        userId: node.user_id,
      });
    }

    const seedRids: string[] =
      seedResult?.stdout.match(/\brad:[a-zA-Z0-9]+\b/g) ?? [];

    const setLsRids = new Set(lsRids);
    const fetchingRids = seedRids.filter(item => !setLsRids.has(item));
    const repos = [
      ...lsRids.map(r => {
        return { rid: r, fetching: false };
      }),
      ...fetchingRids.map(r => {
        return { rid: r, fetching: true };
      }),
    ];

    return {
      success: true,
      content: repos,
      statusCode: 200,
    };
  } catch (dbError) {
    log.error("Failed to retrieve seeded repositories", {
      nodeId,
      error: String(dbError),
    });
    return {
      success: false,
      error: `Failed to retrieve seeded repositories for node ${nodeId}`,
      statusCode: 500,
    };
  }
}

export async function seedRepo(
  nodeId: string,
  repositoryId: string,
): Promise<ServiceResult<void>> {
  const db = await getDb();
  const node = await db.query.nodes.findFirst({
    where: and(
      eq(schema.nodes.node_id, nodeId),
      eq(schema.nodes.deleted, false),
    ),
  });

  if (!node) {
    log.warn("No active node found", { nodeId });
    return {
      success: false,
      error: `No active node found with node_id: ${nodeId}`,
      statusCode: 404,
    };
  }

  const seededRepos = await getSeededReposForNode(nodeId);

  if (
    seededRepos.success &&
    seededRepos.content !== undefined &&
    seededRepos.content.find(r => {
      return r.rid === repositoryId;
    })
  ) {
    return {
      success: true,
      message: `Repository ${repositoryId} already seeded by node ${nodeId}`,
      statusCode: 304,
    };
  }

  // Execute the seeding command asynchronously without blocking the API response.
  // The `rad seed` command is synchronous and will attempt to fetch the repository
  // until completion. However, it first updates the seeding policy table, so if
  // the command is interrupted or aborted, the radicle-node daemon will retry
  // fetching based on the updated policy. We return immediately with 202 (Accepted)
  // since seeding may take considerable time.
  //
  // The spawned process (podman exec) and the promise continue running on the
  // Node.js event loop after the HTTP response is sent, as long as the SvelteKit
  // server process remains alive.
  void execNodeCommand(node, "seed", [repositoryId])
    .then(seedResult => {
      const success = parseSeedCommandResult(seedResult);

      if (!success) {
        log.error("Seeding failed", {
          repositoryId,
          nodeId,
          userId: node.user_id,
        });
        return;
      }

      log.info("Seed command completed successfully", {
        repositoryId,
        nodeId,
        userId: node.user_id,
      });
    })
    .catch(error => {
      log.error("Seed operation failed with exception", {
        error: String(error),
        repositoryId,
        nodeId,
        userId: node.user_id,
      });
    });

  return {
    success: true,
    message: `Enqueued repository ${repositoryId} for seeding`,
    statusCode: 202,
  };
}

export async function unseedRepo(
  nodeId: string,
  repositoryId: string,
): Promise<ServiceResult<void>> {
  const db = await getDb();
  const node = await db.query.nodes.findFirst({
    where: and(
      eq(schema.nodes.node_id, nodeId),
      eq(schema.nodes.deleted, false),
    ),
  });

  if (!node) {
    log.warn("No active node found", { nodeId });
    return {
      success: false,
      error: `No active node found with node_id: ${nodeId}`,
      statusCode: 404,
    };
  }

  const seededRepos = await getSeededReposForNode(nodeId);

  if (
    seededRepos.success &&
    seededRepos.content !== undefined &&
    !seededRepos.content.find(r => {
      return r.rid === repositoryId;
    })
  ) {
    return {
      success: false,
      error: `No seeded repository found with repository_id: ${repositoryId} by node ${nodeId}`,
      statusCode: 404,
    };
  }

  const unseedResult = await execNodeCommand(node, "unseed", [repositoryId]);
  if (!unseedResult) {
    log.error("Failed to unseed repository", {
      repositoryId,
      nodeId,
      userId: node.user_id,
    });
    return {
      success: false,
      error: `Failed to unseed repository ${repositoryId} by node ${nodeId}`,
      statusCode: 500,
    };
  }

  const cleanResult = await execNodeCommand(node, "clean", [
    repositoryId,
    "--no-confirm",
  ]);
  if (!cleanResult) {
    log.warn("Failed to clean repository", {
      repositoryId,
      nodeId,
      userId: node.user_id,
    });
  }

  return {
    success: true,
    message: `Successfully unseeded repository ${repositoryId} by node ${nodeId}`,
    statusCode: 200,
  };
}

export async function stopContainers(user: User): Promise<ServiceResult<void>> {
  try {
    const nodeAlias = `${user.handle}_seed`;
    const nodeContainerName = `${nodeAlias}-node`;
    const httpdContainerName = `${nodeAlias}-httpd`;

    const docker = await DockerClient.fromDockerHost(config.dockerHost);

    try {
      const nodeContainer = await docker.containerInspect(nodeContainerName);
      if (nodeContainer.State?.Running && nodeContainer.Id) {
        await docker.containerStop(nodeContainer.Id);
        log.info(`Stopped node container ${nodeContainerName}`, {
          userId: user.id,
        });
      }
    } catch {
      log.warn(
        `Node container ${nodeContainerName} not found or already stopped`,
        {
          userId: user.id,
        },
      );
    }

    try {
      const httpdContainer = await docker.containerInspect(httpdContainerName);
      if (httpdContainer.State?.Running && httpdContainer.Id) {
        await docker.containerStop(httpdContainer.Id);
        log.info(`Stopped httpd container ${httpdContainerName}`, {
          userId: user.id,
        });
      }
    } catch {
      log.warn(
        `HTTPD container ${httpdContainerName} not found or already stopped`,
        {
          userId: user.id,
        },
      );
    }

    return { success: true, message: "Containers stopped", statusCode: 200 };
  } catch (error) {
    log.error("Failed to stop containers", {
      error: String(error),
      userId: user.id,
    });
    return {
      success: false,
      error: "Failed to stop containers",
      statusCode: 500,
    };
  }
}

async function startContainers(user: User): Promise<ServiceResult<void>> {
  try {
    const nodeAlias = `${user.handle}_seed`;
    const nodeContainerName = `${nodeAlias}-node`;
    const httpdContainerName = `${nodeAlias}-httpd`;

    const docker = await DockerClient.fromDockerHost(config.dockerHost);

    try {
      const nodeContainer = await docker.containerInspect(nodeContainerName);
      if (!nodeContainer.State?.Running && nodeContainer.Id) {
        await docker.containerStart(nodeContainer.Id);
        log.info(`Started node container ${nodeContainerName}`, {
          userId: user.id,
        });
      }
    } catch {
      log.warn(`Node container ${nodeContainerName} not found`, {
        userId: user.id,
        category: "nodeCreation",
      });
      return {
        success: false,
        error: "Node container not found",
        statusCode: 404,
      };
    }

    try {
      const httpdContainer = await docker.containerInspect(httpdContainerName);
      if (!httpdContainer.State?.Running && httpdContainer.Id) {
        await docker.containerStart(httpdContainer.Id);
        log.info(`Started httpd container ${httpdContainerName}`, {
          userId: user.id,
        });
      }
    } catch {
      log.warn(`HTTPD container ${httpdContainerName} not found`, {
        userId: user.id,
        category: "nodeCreation",
      });
      return {
        success: false,
        error: "HTTPD container not found",
        statusCode: 404,
      };
    }

    return { success: true, message: "Containers started", statusCode: 200 };
  } catch (error) {
    log.error("Failed to start containers", {
      error: String(error),
      userId: user.id,
      category: "nodeCreation",
    });
    return {
      success: false,
      error: "Failed to start containers",
      statusCode: 500,
    };
  }
}

export async function ensureNodeActiveForUser(
  userId: number,
): Promise<ServiceResult<void>> {
  try {
    const db = await getDb();

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        nodes: {
          where: eq(schema.nodes.deleted, false),
        },
      },
    });

    if (!user) {
      log.warn("User not found", { userId, category: "nodeCreation" });
      return {
        success: false,
        error: "User not found",
        statusCode: 404,
      };
    }

    if (user.nodes.length > 0) {
      log.info("User has existing node, starting containers", { userId });
      const startResult = await startContainers(user);

      // If containers don't exist (404), the node DB entry exists but
      // containers were destroyed - recreate containers.
      if (!startResult.success && startResult.statusCode === 404) {
        log.info("Containers not found, recreating containers", { userId });
        const existingNode = user.nodes[0];
        const radHome = getRadHome(user.handle);
        if (!radHome) {
          return {
            success: false,
            error: "Failed to get RAD_HOME",
            statusCode: 500,
          };
        }
        const env = {
          ...process.env,
          RAD_PASSPHRASE: "",
          RAD_HOME: radHome,
        };
        let nodePort: number;

        // If it's a newer container the node will have the port in its config.
        //
        // Otherwise default to getting a new port and resetting the node
        // config.
        //
        // Once we've migrated prod/staging all nodes should have set
        // listenAddress:port in their configs and it should be safe to
        // remove this fallback.
        try {
          nodePort = await getPortFromConfig(env);
        } catch {
          nodePort = await allocateNodePort(userId);

          const nodeFqdn = `${user.handle}.${config.fqdn}`;
          await updateConfig(
            nodePort,
            env,
            nodeFqdn,
            config.nodePreferredSeeds,
          );
          log.info("Migrated old db based profile to config based profile", {
            userId,
            nodePort,
            nodeFqdn,
          });
        }

        try {
          await createContainers(
            existingNode.alias,
            user.id,
            nodePort,
            radHome,
            existingNode.node_id,
            user.handle,
          );
        } catch (error) {
          log.error("[Nodes] Couldn't create containers", {
            userId,
            error: String(error),
          });
          return {
            success: false,
            error: `Failed to recreate containers: ${String(error)}`,
            statusCode: 500,
          };
        }

        log.info("Containers recreated, starting containers", { userId });
        return await startContainers(user);
      }

      return startResult;
    }

    log.info("Creating node for user", { userId });
    const node = await createNode(user);

    if (!node) {
      // Race condition check: another process might have created the node.
      // Re-query to see if node now exists.
      const refreshedUser = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        with: {
          nodes: {
            where: eq(schema.nodes.deleted, false),
          },
        },
      });

      if (refreshedUser && refreshedUser.nodes.length > 0) {
        log.info("Node created by another process, starting containers", {
          userId,
        });
        return await startContainers(refreshedUser);
      }

      log.warn(`Failed to create node for ${user.handle}`, {
        userId,
        category: "nodeCreation",
      });
      return {
        success: false,
        error: "Failed to create node",
        statusCode: 500,
      };
    }

    log.info("Node created, starting containers", { userId });
    return await startContainers(user);
  } catch (error) {
    log.warn("Failed to ensure node active for user", {
      userId,
      error: String(error),
      category: "nodeCreation",
    });
    return {
      success: false,
      error: "Failed to activate node",
      statusCode: 500,
    };
  }
}

async function updateConfig(
  port: number,
  env: RadEnv,
  nodeFqdn: string,
  preferredSeeds: string[],
): Promise<void> {
  await execa(config.radBinaryPath, ["config", "unset", "node.listen"], {
    env,
  });

  await execa(
    config.radBinaryPath,
    ["config", "push", "node.listen", `0.0.0.0:${port}`],
    {
      env,
    },
  );

  await execa(
    config.radBinaryPath,
    ["config", "push", "node.externalAddresses", `${nodeFqdn}:${port}`],
    {
      env,
    },
  );

  await execa(config.radBinaryPath, ["config", "unset", "preferredSeeds"], {
    env,
  });

  for (const seed of preferredSeeds) {
    await execa(
      config.radBinaryPath,
      ["config", "push", "preferredSeeds", seed],
      {
        env,
      },
    );
  }
}

export async function getPortFromConfig(env: RadEnv): Promise<number> {
  const { stdout: configGetStdout } = await execa(
    config.radBinaryPath,
    ["config", "get", "node.listen"],
    {
      env,
    },
  );
  const listenAddress = configGetStdout.trim();
  const parts = listenAddress.split(":");
  if (parts.length < 2) {
    throw new Error(
      `Invalid listen address format in config: "${listenAddress}". Expected format: "host:port"`,
    );
  }
  const portString = parts[parts.length - 1];
  const port = Number(portString);
  if (isNaN(port)) {
    throw new Error(
      `Invalid port number in listen address: "${listenAddress}". Port "${portString}" is not a number.`,
    );
  }
  if (port < 1 || port > 65535) {
    throw new Error(`Port number out of valid range (1-65535): ${port}`);
  }
  return port;
}

export const testExports = { parseNodeStatus };
