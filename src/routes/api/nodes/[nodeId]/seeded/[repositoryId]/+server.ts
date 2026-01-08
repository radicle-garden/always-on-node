import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { nodesService } from '$lib/server/services/nodes';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const { nodeId, repositoryId } = params;

	if (!nodeId || !repositoryId) {
		return json(
			{ success: false, error: 'Node ID and Repository ID are required' },
			{ status: 400 }
		);
	}

	const result = await nodesService.seedRepo(nodeId, repositoryId);

	return json(
		{
			success: result.success,
			message: result.message,
			error: result.error
		},
		{ status: result.statusCode }
	);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const { nodeId, repositoryId } = params;

	if (!nodeId || !repositoryId) {
		return json(
			{ success: false, error: 'Node ID and Repository ID are required' },
			{ status: 400 }
		);
	}

	const result = await nodesService.unseedRepo(nodeId, repositoryId);

	return json(
		{
			success: result.success,
			message: result.message,
			error: result.error
		},
		{ status: result.statusCode }
	);
};
