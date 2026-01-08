import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { publicNodeInfo } from '$lib/server/entities';
import { nodesService } from '$lib/server/services/nodes';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const { nodeId } = params;

	if (!nodeId) {
		return json({ success: false, error: 'Node ID is required' }, { status: 400 });
	}

	const result = await nodesService.getNodeById(nodeId);

	return json(
		{
			success: result.success,
			content: result.content ? publicNodeInfo(result.content) : undefined,
			error: result.error
		},
		{ status: result.statusCode }
	);
};
