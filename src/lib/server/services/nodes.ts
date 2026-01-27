import { parseSeedCommandResult } from "$lib/utils";

import { and, eq } from "drizzle-orm";
import { execa } from "execa";
import fs from "fs";
import { readFile, readdir, rename, writeFile } from "fs/promises";
import path from "path";

import { DockerClient } from "@docker/node-sdk";

import { config } from "../config";
import { getDb, schema } from "../db";
import {
  type Node,
  type SeededRadicleRepository,
  type User,
  createNodeData,
  getRadHome,
  userStoragePath,
} from "../entities";

interface ServiceResult<T> {
  success: boolean;
  content?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

async function createNode(user: User): Promise<Node | null> {
  const nodeAlias = `${user.handle}_seed`;

  const temporaryRadHome = path.resolve(
    config.profileStoragePath,
    `radicle_${nodeAlias}`,
  );
  const radBinary = config.radBinaryPath;

  const env = {
    ...process.env,
    RAD_PASSPHRASE: "",
    RAD_HOME: temporaryRadHome,
  };

  try {
    console.log(`[Nodes] Creating radicle identity for ${user.handle}`);

    await execa(radBinary, ["auth", "--alias", nodeAlias], { env });

    const nodeId = (
      await execa(radBinary, ["self", "--nid"], { env })
    ).stdout.trim();
    const { stdout: sshPublicKey } = await execa(
      radBinary,
      ["self", "--ssh-key"],
      { env },
    );

    console.log(
      `[Nodes] Created a new profile! Public Key: ${sshPublicKey}, Node ID: ${nodeId}`,
    );

    try {
      const db = await getDb();
      console.log(`[Nodes] Creating new node with id: ${nodeId}`);

      const nodeData = createNodeData(nodeId, nodeAlias, user.id);
      const [persistedNode] = await db
        .insert(schema.nodes)
        .values(nodeData)
        .returning();

      const radPort = await assignAvailablePort(persistedNode);

      const radHome = getRadHome(user.handle);
      if (!radHome) {
        console.error(`[Nodes] Failed to get RAD_HOME for user ${user.handle}`);
        return null;
      }

      fs.mkdirSync(radHome, { recursive: true });
      const files = await readdir(temporaryRadHome);
      await Promise.all(
        files.map(file =>
          rename(path.join(temporaryRadHome, file), path.join(radHome, file)),
        ),
      );

      const configResult = await getConfigForNode(persistedNode.node_id);
      if (!configResult.success) {
        console.warn(
          `[Nodes] Failed to retrieve default node config for node ${persistedNode.node_id}`,
        );
        return null;
      }
      const currentConfig = configResult.content as {
        node: { externalAddresses: string[] };
      };

      console.log(
        `[Nodes] Updating node config for ${persistedNode.node_id}: ${JSON.stringify(currentConfig)}`,
      );
      if (persistedNode.connect_address) {
        currentConfig.node.externalAddresses.push(
          persistedNode.connect_address,
        );
      }

      const nodeConfigResult = await updateNodeConfig(
        user,
        persistedNode.node_id,
        currentConfig,
      );
      if (!nodeConfigResult.success) {
        console.warn(
          `[Nodes] Failed to update node config for node ${persistedNode.node_id}`,
        );
        return null;
      }

      const docker = await DockerClient.fromDockerHost(config.dockerHost);

      console.log(`[Nodes] Pulling container images for ${nodeAlias}...`);

      const nodeImage = config.radicleNodeContainer;
      const httpdImage = config.radicleHttpdContainer;
      const [nodeImageName, nodeImageTag] =
        config.radicleNodeContainer.split(":");
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
      console.log(`[Nodes] Images pulled successfully for ${nodeAlias}`);

      const nodeContainerName = `${nodeAlias}-node`;
      const nodeContainer = await docker.containerCreate(
        {
          Image: nodeImage,
          Env: [
            "RUST_LOG=debug",
            "RUST_BACKTRACE=1",
            "GIT_TRACE=1",
            "GIT_TRACE_PACKET=1",
            "RAD_HOME=/radicle",
            "RAD_PASSPHRASE=",
          ],
          Cmd: ["--log", "debug", "--listen", "0.0.0.0:8776"],
          ExposedPorts: {
            "8776/tcp": {},
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
              "8776/tcp": [{ HostPort: String(radPort) }],
            },
            RestartPolicy: {
              Name: "always",
            },
            UsernsMode: "keep-id:uid=11011,gid=11011",
          },
        },
        { name: nodeContainerName, platform: "linux/arm64" },
      );

      console.log(
        `[Nodes] Created node container ${nodeContainerName} with ID: ${nodeContainer.Id}`,
      );

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
        },
        { name: httpdContainerName, platform: "linux/arm64" },
      );

      console.log(
        `[Nodes] Created httpd container ${httpdContainerName} with ID: ${httpdContainer.Id}`,
      );

      console.log(
        `[Nodes] Containers created but not started. Will be started after subscription is active.`,
      );

      return persistedNode;
    } catch (nodeInsertErr) {
      console.error(
        `[Nodes] Failed to insert node into database:`,
        nodeInsertErr,
      );
      return null;
    }
  } catch (cliError) {
    const message =
      cliError instanceof Error ? cliError.message : String(cliError);
    console.error("[Nodes] Error during CLI steps:", message);
    return null;
  }
}

async function updateNodeConfig(
  user: User,
  nodeId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeConfig: any,
): Promise<ServiceResult<void>> {
  const db = await getDb();
  console.log(
    `[Nodes] Updating node config for ${nodeId}: ${JSON.stringify(nodeConfig)}`,
  );

  const node = await db.query.nodes.findFirst({
    where: and(
      eq(schema.nodes.node_id, nodeId),
      eq(schema.nodes.deleted, false),
    ),
    with: { user: true },
  });

  if (!node || node.user?.id !== user.id) {
    console.warn(
      `[Nodes] No active node found with node_id: ${nodeId} for user`,
    );
    return {
      success: false,
      error: `No active node found with node_id: ${nodeId}`,
      statusCode: 404,
    };
  }

  try {
    const radHome = getRadHome(node.user?.handle ?? "");
    await writeFile(
      `${radHome}/config.json`,
      JSON.stringify(nodeConfig, null, 2),
      "utf8",
    );

    return {
      success: true,
      message: `Node config updated for ${nodeId}`,
      statusCode: 202,
    };
  } catch (error) {
    const errorMessage = `Failed to validate/write node config for ${nodeId}:`;
    console.error(errorMessage, error);
    return { success: false, error: errorMessage, statusCode: 500 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getConfigForNode(nodeId: string): Promise<ServiceResult<any>> {
  try {
    const db = await getDb();
    const node = await db.query.nodes.findFirst({
      where: and(
        eq(schema.nodes.node_id, nodeId),
        eq(schema.nodes.deleted, false),
      ),
    });
    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.id, node?.user_id ?? 0),
        eq(schema.users.deleted, false),
      ),
    });

    if (!node) {
      console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
      return {
        success: false,
        error: `No active node found with node_id: ${nodeId}`,
        statusCode: 404,
      };
    }

    const radHome = getRadHome(user?.handle ?? "");
    const nodeConfig = JSON.parse(
      await readFile(`${radHome}/config.json`, "utf8"),
    );

    return { success: true, content: nodeConfig, statusCode: 200 };
  } catch (error) {
    const errorMessage = `Error retrieving node config: ${error} for ${nodeId}`;
    console.error(errorMessage);
    return { success: false, error: errorMessage, statusCode: 500 };
  }
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

    console.log(`[Nodes] Node command output:\n${stdout}`);
    if (stderr) {
      console.warn(`[Nodes] Node command stderr:\n${stderr}`);
    }

    return { stdout, stderr };
  } catch (cliError: unknown) {
    const errorMessage =
      cliError instanceof Error ? cliError.message : String(cliError);
    console.warn(`[Nodes] Failed to run command in container: ${errorMessage}`);
    return null;
  }
}

async function getNodeStatus(
  nodeId: string,
  user: User,
): Promise<ServiceResult<{ stdout: string; size?: number }>> {
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
      console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
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
          console.warn(
            `[Nodes] Invalid du output for node ${nodeId}: "${duOutput}"`,
          );
        }
      } catch (duError) {
        console.warn(
          `[Nodes] Failed to get storage size for node ${nodeId}:`,
          duError,
        );
      }
    }

    return {
      success: true,
      content: { stdout: result.stdout, size },
      statusCode: 200,
    };
  } catch (dbError) {
    const errorMessage = `Failed to retrieve node ${nodeId}`;
    console.warn(errorMessage, dbError);
    return { success: false, error: errorMessage, statusCode: 500 };
  }
}

async function getSeededReposForNode(
  nodeId: string,
): Promise<ServiceResult<SeededRadicleRepository[]>> {
  try {
    const db = await getDb();
    const node = await db.query.nodes.findFirst({
      where: and(
        eq(schema.nodes.node_id, nodeId),
        eq(schema.nodes.deleted, false),
      ),
      with: {
        seededRepositories: {
          where: eq(schema.seededRadicleRepositories.seeding, true),
        },
      },
    });

    if (!node) {
      console.warn(`[Nodes] No node found with node_id: ${nodeId}`);
      return {
        success: false,
        error: `No node found with node_id: ${nodeId}`,
        statusCode: 404,
      };
    }

    const seededRepos = node.seededRepositories || [];

    console.log(
      `[Nodes] Retrieved seeded repositories for node ${nodeId}: ${JSON.stringify(seededRepos)}`,
    );
    return {
      success: true,
      content: seededRepos,
      statusCode: 200,
    };
  } catch (dbError) {
    const errorMessage = `Failed to retrieve seeded repositories for node ${nodeId}`;
    console.warn(errorMessage, dbError);
    return { success: false, error: errorMessage, statusCode: 500 };
  }
}

async function seedRepo(
  nodeId: string,
  repositoryId: string,
  onSeedComplete?: (success: boolean) => void,
): Promise<ServiceResult<void>> {
  const db = await getDb();
  const node = await db.query.nodes.findFirst({
    where: and(
      eq(schema.nodes.node_id, nodeId),
      eq(schema.nodes.deleted, false),
    ),
  });

  if (!node) {
    console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
    return {
      success: false,
      error: `No active node found with node_id: ${nodeId}`,
      statusCode: 404,
    };
  }

  const seededRepo = await db.query.seededRadicleRepositories.findFirst({
    where: and(
      eq(schema.seededRadicleRepositories.repository_id, repositoryId),
      eq(schema.seededRadicleRepositories.node_id, node.id),
      eq(schema.seededRadicleRepositories.seeding, true),
    ),
  });

  if (seededRepo) {
    return {
      success: true,
      message: `Repository ${repositoryId} already seeded by node ${nodeId}`,
      statusCode: 304,
    };
  }

  execNodeCommand(node, "seed", [repositoryId]).then(result => {
    const success = parseSeedCommandResult(result);
    console.log(
      `[Nodes] Seed command completed for ${repositoryId}: ${success ? "success" : "failed"}`,
    );
    onSeedComplete?.(success);
  });

  await db.insert(schema.seededRadicleRepositories).values({
    repository_id: repositoryId,
    node_id: node.id,
    seeding: true,
    seeding_start: new Date(),
  });

  return {
    success: true,
    message: `Successfully seeded repository ${repositoryId} by node ${nodeId}`,
    statusCode: 200,
  };
}

async function unseedRepo(
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
    console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
    return {
      success: false,
      error: `No active node found with node_id: ${nodeId}`,
      statusCode: 404,
    };
  }

  const seededRepo = await db.query.seededRadicleRepositories.findFirst({
    where: and(
      eq(schema.seededRadicleRepositories.repository_id, repositoryId),
      eq(schema.seededRadicleRepositories.node_id, node.id),
      eq(schema.seededRadicleRepositories.seeding, true),
    ),
  });

  if (!seededRepo) {
    return {
      success: false,
      error: `No seeded repository found with repository_id: ${repositoryId} by node ${nodeId}`,
      statusCode: 404,
    };
  }

  const unseedResult = await execNodeCommand(node, "unseed", [repositoryId]);
  if (!unseedResult) {
    console.log(
      `[Nodes] Failed to unseed repository ${repositoryId} by node ${nodeId}`,
    );
    return {
      success: false,
      error: `Failed to unseed repository ${repositoryId} by node ${nodeId}`,
      statusCode: 500,
    };
  }

  // https://app.radicle.xyz/nodes/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5/tree/crates/radicle-cli/examples/rad-clean.md
  const cleanResult = await execNodeCommand(node, "clean", [
    repositoryId,
    "--no-confirm",
  ]);
  if (!cleanResult) {
    console.log(
      `[Nodes] Failed to clean repository ${repositoryId} by node ${nodeId}`,
    );
  }

  await db
    .update(schema.seededRadicleRepositories)
    .set({
      seeding: false,
      seeding_end: new Date(),
    })
    .where(eq(schema.seededRadicleRepositories.id, seededRepo.id));

  return {
    success: true,
    message: `Successfully unseeded repository ${repositoryId} by node ${nodeId}`,
    statusCode: 200,
  };
}

async function assignAvailablePort(node: Node): Promise<number> {
  const db = await getDb();
  const nodeEntryId = node.id;
  const externalPort = 7000 + Number(nodeEntryId);
  const connectAddress = `${config.nodesConnectFQDN}:${externalPort}`;

  await db
    .update(schema.nodes)
    .set({ connect_address: connectAddress })
    .where(eq(schema.nodes.id, node.id));

  return externalPort;
}

async function stopContainers(user: User): Promise<ServiceResult<void>> {
  try {
    const nodeAlias = `${user.handle}_seed`;
    const nodeContainerName = `${nodeAlias}-node`;
    const httpdContainerName = `${nodeAlias}-httpd`;

    const docker = await DockerClient.fromDockerHost(config.dockerHost);

    try {
      const nodeContainer = await docker.containerInspect(nodeContainerName);
      if (nodeContainer.State?.Running && nodeContainer.Id) {
        await docker.containerStop(nodeContainer.Id);
        console.log(`[Nodes] Stopped node container ${nodeContainerName}`);
      }
    } catch {
      console.warn(
        `[Nodes] Node container not found or already stopped: ${nodeContainerName}`,
      );
    }

    try {
      const httpdContainer = await docker.containerInspect(httpdContainerName);
      if (httpdContainer.State?.Running && httpdContainer.Id) {
        await docker.containerStop(httpdContainer.Id);
        console.log(`[Nodes] Stopped httpd container ${httpdContainerName}`);
      }
    } catch {
      console.warn(
        `[Nodes] HTTPD container not found or already stopped: ${httpdContainerName}`,
      );
    }

    return { success: true, message: "Containers stopped", statusCode: 200 };
  } catch (error) {
    console.error(`[Nodes] Failed to stop containers:`, error);
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
        console.log(`[Nodes] Started node container ${nodeContainerName}`);
      }
    } catch {
      console.warn(`[Nodes] Node container not found: ${nodeContainerName}`);
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
        console.log(`[Nodes] Started httpd container ${httpdContainerName}`);
      }
    } catch {
      console.warn(`[Nodes] HTTPD container not found: ${httpdContainerName}`);
      return {
        success: false,
        error: "HTTPD container not found",
        statusCode: 404,
      };
    }

    return { success: true, message: "Containers started", statusCode: 200 };
  } catch (error) {
    console.error(`[Nodes] Failed to start containers:`, error);
    return {
      success: false,
      error: "Failed to start containers",
      statusCode: 500,
    };
  }
}

async function ensureNodeActiveForUser(
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
      return {
        success: false,
        error: "User not found",
        statusCode: 404,
      };
    }

    if (user.nodes.length > 0) {
      console.log(
        `[Nodes] User ${userId} has existing node, starting containers`,
      );
      const startResult = await startContainers(user);

      // If containers don't exist (404), the node DB entry exists but
      // containers were destroyed - create a new node.
      if (!startResult.success && startResult.statusCode === 404) {
        console.log(
          `[Nodes] Containers not found for user ${userId}, creating new node`,
        );
        // Mark existing node as deleted since its containers are gone.
        await db
          .update(schema.nodes)
          .set({ deleted: true })
          .where(eq(schema.nodes.user_id, userId));

        const node = await createNode(user);
        if (!node) {
          return {
            success: false,
            error: "Failed to create replacement node",
            statusCode: 500,
          };
        }

        console.log(
          `[Nodes] New node created, starting containers for user ${userId}`,
        );
        return await startContainers(user);
      }

      return startResult;
    }

    console.log(`[Nodes] Creating node for user ${userId}`);
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
        console.log(
          `[Nodes] Node created by another process, starting containers for user ${userId}`,
        );
        return await startContainers(refreshedUser);
      }

      return {
        success: false,
        error: "Failed to create node",
        statusCode: 500,
      };
    }

    console.log(`[Nodes] Node created, starting containers for user ${userId}`);
    return await startContainers(user);
  } catch (error) {
    console.error(
      `[Nodes] Failed to ensure node active for user ${userId}:`,
      error,
    );
    return {
      success: false,
      error: "Failed to activate node",
      statusCode: 500,
    };
  }
}

export const nodesService = {
  createNode,
  updateNodeConfig,
  getConfigForNode,
  execNodeCommand,
  getNodeStatus,
  getSeededReposForNode,
  seedRepo,
  unseedRepo,
  assignAvailablePort,
  stopContainers,
  startContainers,
  ensureNodeActiveForUser,
};
