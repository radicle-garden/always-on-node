import { config } from '../config';
import { getDb, schema } from '../db';
import {
	createNodeData,
	getRadHome,
	type Node,
	type SeededRadicleRepository,
	type User
} from '../entities';
import { DockerClient } from '@docker/node-sdk';
import { exec } from 'child_process';
import { and, eq } from 'drizzle-orm';
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

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
		`radicle_${nodeAlias}`
	);
	const radBinary = config.radBinaryPath;

	const env = {
		...process.env,
		RAD_PASSPHRASE: '',
		RAD_HOME: temporaryRadHome
	};

	try {
		console.log(`[Nodes] Creating radicle identity for ${user.handle}`);

		await execAsync(`${radBinary} auth --alias ${nodeAlias}`, { env });

		const nodeId = (
			await execAsync(`${radBinary} self --nid`, { env })
		).stdout.trim();
		const { stdout: sshPublicKey } = await execAsync(
			`${radBinary} self --ssh-key`,
			{ env }
		);

		console.log(
			`[Nodes] Created a new profile! Public Key: ${sshPublicKey}, Node ID: ${nodeId}`
		);

		try {
			const db = getDb();
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
			await execAsync(`mv ${temporaryRadHome}/* ${radHome}/`);

			const configResult = await getConfigForNode(persistedNode.node_id);
			if (!configResult.success) {
				console.warn(
					`[Nodes] Failed to retrieve default node config for node ${persistedNode.node_id}`
				);
				return null;
			}
			const currentConfig = configResult.content as {
				node: { externalAddresses: string[] };
			};

			console.log(
				`[Nodes] Updating node config for ${persistedNode.node_id}: ${JSON.stringify(currentConfig)}`
			);
			if (persistedNode.connect_address) {
				currentConfig.node.externalAddresses.push(
					persistedNode.connect_address
				);
			}

			const nodeConfigResult = await updateNodeConfig(
				user,
				persistedNode.node_id,
				currentConfig
			);
			if (!nodeConfigResult.success) {
				console.warn(
					`[Nodes] Failed to update node config for node ${persistedNode.node_id}`
				);
				return null;
			}

			const docker = await DockerClient.fromDockerHost(config.dockerHost);

			console.log(`[Nodes] Pulling container images for ${nodeAlias}...`);

			const nodeImage = config.radicleNodeContainer;
			const httpdImage = config.radicleHttpdContainer;
			const [nodeImageName, nodeImageTag] =
				config.radicleNodeContainer.split(':');
			const [httpdImageName, httpdImageTag] =
				config.radicleHttpdContainer.split(':');

			const nodeImagePull = docker.imageCreate({
				fromImage: nodeImageName,
				tag: nodeImageTag,
				platform: 'linux/arm64'
			});
			const httpdImagePull = docker.imageCreate({
				fromImage: httpdImageName,
				tag: httpdImageTag,
				platform: 'linux/arm64'
			});

			await nodeImagePull.wait();
			await httpdImagePull.wait();
			console.log(`[Nodes] Images pulled successfully for ${nodeAlias}`);

			const nodeContainerName = `${nodeAlias}-node`;
			const nodeContainer = await docker.containerCreate(
				{
					Image: nodeImage,
					Env: [
						'RUST_LOG=debug',
						'RUST_BACKTRACE=1',
						'GIT_TRACE=1',
						'GIT_TRACE_PACKET=1',
						'RAD_HOME=/radicle',
						'RAD_PASSPHRASE='
					],
					Cmd: ['--log', 'debug', '--listen', '0.0.0.0:8776'],
					ExposedPorts: {
						'8776/tcp': {}
					},
					HostConfig: {
						Binds: [`${radHome}:/radicle`],
						PortBindings: {
							'8776/tcp': [{ HostPort: String(radPort) }]
						},
						RestartPolicy: {
							Name: 'always'
						},
						UsernsMode: 'keep-id:uid=11011,gid=11011'
					},
				},
				{ name: nodeContainerName, platform: 'linux/arm64' }
			);

			console.log(
				`[Nodes] Created node container ${nodeContainerName} with ID: ${nodeContainer.Id}`
			);

			const httpdContainerName = `${nodeAlias}-httpd`;
			const httpdContainer = await docker.containerCreate(
				{
					Image: httpdImage,
					Env: ['RUST_LOG=debug', 'RUST_BACKTRACE=1', 'RAD_HOME=/radicle'],
					Cmd: ['--listen', `/radicle/httpd.sock`],
					HostConfig: {
						Binds: [`${radHome}:/radicle`],
						RestartPolicy: {
							Name: 'always'
						},
						UsernsMode: 'keep-id:uid=11011,gid=11011'
					},
					User: '11011:11011'
				},
				{ name: httpdContainerName, platform: 'linux/arm64' }
			);

			console.log(
				`[Nodes] Created httpd container ${httpdContainerName} with ID: ${httpdContainer.Id}`
			);

			await docker.containerStart(nodeContainer.Id);
			console.log(`[Nodes] Started node container ${nodeContainerName}`);

			await docker.containerStart(httpdContainer.Id);
			console.log(`[Nodes] Started httpd container ${httpdContainerName}`);

			return persistedNode;
		} catch (nodeInsertErr) {
			console.error(
				`[Nodes] Failed to insert node into database:`,
				nodeInsertErr
			);
			return null;
		}
	} catch (cliError) {
		const message =
			cliError instanceof Error ? cliError.message : String(cliError);
		console.error('[Nodes] Error during CLI steps:', message);
		return null;
	}
}

async function updateNodeConfig(
	user: User,
	nodeId: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	nodeConfig: any
): Promise<ServiceResult<void>> {
	const db = getDb();
	console.log(
		`[Nodes] Updating node config for ${nodeId}: ${JSON.stringify(nodeConfig)}`
	);

	const node = await db.query.nodes.findFirst({
		where: and(
			eq(schema.nodes.node_id, nodeId),
			eq(schema.nodes.deleted, false)
		),
		with: { user: true }
	});

	if (!node || node.user?.id !== user.id) {
		console.warn(
			`[Nodes] No active node found with node_id: ${nodeId} for user`
		);
		return {
			success: false,
			error: `No active node found with node_id: ${nodeId}`,
			statusCode: 404
		};
	}

	try {
		const radHome = getRadHome(node.user?.handle ?? '');
		await writeFile(
			`${radHome}/config.json`,
			JSON.stringify(nodeConfig, null, 2),
			'utf8'
		);

		return {
			success: true,
			message: `Node config updated for ${nodeId}`,
			statusCode: 202
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
		const db = getDb();
		const node = await db.query.nodes.findFirst({
			where: and(
				eq(schema.nodes.node_id, nodeId),
				eq(schema.nodes.deleted, false)
			)
		});
		const user = await db.query.users.findFirst({
			where: and(
				eq(schema.users.id, node?.user_id ?? 0),
				eq(schema.users.deleted, false)
			)
		});

		if (!node) {
			console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
			return {
				success: false,
				error: `No active node found with node_id: ${nodeId}`,
				statusCode: 404
			};
		}

		const radHome = getRadHome(user?.handle ?? '');
		const nodeConfig = JSON.parse(
			await readFile(`${radHome}/config.json`, 'utf8')
		);

		return { success: true, content: nodeConfig, statusCode: 200 };
	} catch (error) {
		const errorMessage = `Error retrieving node config: ${error} for ${nodeId}`;
		console.error(errorMessage);
		return { success: false, error: errorMessage, statusCode: 500 };
	}
}

async function getNodeById(nodeId: string): Promise<ServiceResult<Node>> {
	try {
		const db = getDb();
		const node = await db.query.nodes.findFirst({
			where: and(
				eq(schema.nodes.node_id, nodeId),
				eq(schema.nodes.deleted, false)
			)
		});

		if (!node) {
			console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
			return {
				success: false,
				error: `No active node found with node_id: ${nodeId}`,
				statusCode: 404
			};
		}

		return { success: true, content: node, statusCode: 200 };
	} catch (dbError) {
		const errorMessage = `Failed to retrieve node ${nodeId}`;
		console.warn(errorMessage, dbError);
		return { success: false, error: errorMessage, statusCode: 500 };
	}
}

async function execNodeCommand(
	node: Node,
	command: string
): Promise<{ stdout: string; stderr: string } | null> {
	const containerName = `${node.alias}-node`;

	try {
		const docker = await DockerClient.fromDockerHost(config.dockerHost);

		const { Writable } = await import('stream');
		let stdoutData = '';
		let stderrData = '';

		const stdoutStream = new Writable({
			write(chunk, _encoding, callback) {
				stdoutData += chunk.toString();
				callback();
			}
		});

		const stderrStream = new Writable({
			write(chunk, _encoding, callback) {
				stderrData += chunk.toString();
				callback();
			}
		});

		const execInstance = await docker.containerExec(containerName, {
			Cmd: ['rad', ...command.split(' ')],
			AttachStdout: true,
			AttachStderr: true,
			Env: ['RAD_PASSPHRASE=', 'RAD_HOME=/radicle']
		});

		await docker.execStart(execInstance.Id, stdoutStream, stderrStream, {
			Detach: false
		});

		console.log(`[Nodes] Node command output:\n${stdoutData}`);
		if (stderrData) {
			console.warn(`[Nodes] Node command stderr:\n${stderrData}`);
		}

		return { stdout: stdoutData, stderr: stderrData };
	} catch (cliError: unknown) {
		const errorMessage =
			cliError instanceof Error ? cliError.message : String(cliError);
		console.warn(`[Nodes] Failed to run command in container: ${errorMessage}`);
		return null;
	}
}

async function getNodeStatus(
	nodeId: string,
	user: User
): Promise<ServiceResult<string>> {
	try {
		const db = getDb();
		const node = await db.query.nodes.findFirst({
			where: and(
				eq(schema.nodes.node_id, nodeId),
				eq(schema.nodes.deleted, false)
			),
			with: { user: true }
		});

		if (!node || node.user?.id !== user.id) {
			console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
			return {
				success: false,
				error: `No active node found with node_id: ${nodeId}`,
				statusCode: 404
			};
		}

		const result = await execNodeCommand(node, 'node status');
		if (result) {
			return { success: true, content: result.stdout, statusCode: 200 };
		} else {
			return {
				success: false,
				error: `Failed to retrieve node status for node ${nodeId}`,
				statusCode: 500
			};
		}
	} catch (dbError) {
		const errorMessage = `Failed to retrieve node ${nodeId}`;
		console.warn(errorMessage, dbError);
		return { success: false, error: errorMessage, statusCode: 500 };
	}
}

async function getSeededReposForNode(
	nodeId: string
): Promise<ServiceResult<SeededRadicleRepository[]>> {
	try {
		const db = getDb();
		const node = await db.query.nodes.findFirst({
			where: and(
				eq(schema.nodes.node_id, nodeId),
				eq(schema.nodes.deleted, false)
			),
			with: {
				seededRepositories: {
					where: eq(schema.seededRadicleRepositories.seeding, true)
				}
			}
		});

		if (!node) {
			console.warn(`[Nodes] No node found with node_id: ${nodeId}`);
			return {
				success: false,
				error: `No node found with node_id: ${nodeId}`,
				statusCode: 404
			};
		}

		const seededRepos = node.seededRepositories || [];

		console.log(
			`[Nodes] Retrieved seeded repositories for node ${nodeId}: ${JSON.stringify(seededRepos)}`
		);
		return {
			success: true,
			content: seededRepos,
			statusCode: 200
		};
	} catch (dbError) {
		const errorMessage = `Failed to retrieve seeded repositories for node ${nodeId}`;
		console.warn(errorMessage, dbError);
		return { success: false, error: errorMessage, statusCode: 500 };
	}
}

async function seedRepo(
	nodeId: string,
	repositoryId: string
): Promise<ServiceResult<void>> {
	const db = getDb();
	const node = await db.query.nodes.findFirst({
		where: and(
			eq(schema.nodes.node_id, nodeId),
			eq(schema.nodes.deleted, false)
		)
	});

	if (!node) {
		console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
		return {
			success: false,
			error: `No active node found with node_id: ${nodeId}`,
			statusCode: 404
		};
	}

	const seededRepo = await db.query.seededRadicleRepositories.findFirst({
		where: and(
			eq(schema.seededRadicleRepositories.repository_id, repositoryId),
			eq(schema.seededRadicleRepositories.node_id, node.id),
			eq(schema.seededRadicleRepositories.seeding, true)
		)
	});

	if (seededRepo) {
		return {
			success: true,
			message: `Repository ${repositoryId} already seeded by node ${nodeId}`,
			statusCode: 304
		};
	}

	const result = await execNodeCommand(node, `seed ${repositoryId}`);
	if (!result) {
		return {
			success: false,
			error: `Failed to seed repository ${repositoryId} by node ${nodeId}`,
			statusCode: 500
		};
	}

	await db.insert(schema.seededRadicleRepositories).values({
		repository_id: repositoryId,
		node_id: node.id,
		seeding: true,
		seeding_start: new Date().toISOString()
	});

	return {
		success: true,
		message: `Successfully seeded repository ${repositoryId} by node ${nodeId}`,
		statusCode: 200
	};
}

async function unseedRepo(
	nodeId: string,
	repositoryId: string
): Promise<ServiceResult<void>> {
	const db = getDb();
	const node = await db.query.nodes.findFirst({
		where: and(
			eq(schema.nodes.node_id, nodeId),
			eq(schema.nodes.deleted, false)
		)
	});

	if (!node) {
		console.warn(`[Nodes] No active node found with node_id: ${nodeId}`);
		return {
			success: false,
			error: `No active node found with node_id: ${nodeId}`,
			statusCode: 404
		};
	}

	const seededRepo = await db.query.seededRadicleRepositories.findFirst({
		where: and(
			eq(schema.seededRadicleRepositories.repository_id, repositoryId),
			eq(schema.seededRadicleRepositories.node_id, node.id),
			eq(schema.seededRadicleRepositories.seeding, true)
		)
	});

	if (!seededRepo) {
		return {
			success: false,
			error: `No seeded repository found with repository_id: ${repositoryId} by node ${nodeId}`,
			statusCode: 404
		};
	}

	const result = await execNodeCommand(node, `unseed ${repositoryId}`);
	if (!result) {
		return {
			success: false,
			error: `Failed to unseed repository ${repositoryId} by node ${nodeId}`,
			statusCode: 500
		};
	}

	await db
		.update(schema.seededRadicleRepositories)
		.set({
			seeding: false,
			seeding_end: new Date().toISOString()
		})
		.where(eq(schema.seededRadicleRepositories.id, seededRepo.id));

	return {
		success: true,
		message: `Successfully unseeded repository ${repositoryId} by node ${nodeId}`,
		statusCode: 200
	};
}

async function assignAvailablePort(node: Node): Promise<number> {
	const db = getDb();
	const nodeEntryId = node.id;
	const externalPort = 7000 + Number(nodeEntryId);
	const connectAddress = `${config.nodesConnectFQDN}:${externalPort}`;

	await db
		.update(schema.nodes)
		.set({ connect_address: connectAddress })
		.where(eq(schema.nodes.id, node.id));

	return externalPort;
}

export const nodesService = {
	createNode,
	updateNodeConfig,
	getConfigForNode,
	getNodeById,
	execNodeCommand,
	getNodeStatus,
	getSeededReposForNode,
	seedRepo,
	unseedRepo,
	assignAvailablePort
};
