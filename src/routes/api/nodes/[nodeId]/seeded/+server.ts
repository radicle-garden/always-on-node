import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { nodesService } from '$lib/server/services/nodes';

export const GET: RequestHandler = async ({ params }) => {
	const { nodeId } = params;

	if (!nodeId) {
		return json({ success: false, error: 'Node ID is required' }, { status: 400 });
	}

	const result = await nodesService.getSeededReposForNode(nodeId);

	return json(
		{
			success: result.success,
			content: result.content,
			error: result.error
		},
		{ status: result.statusCode }
	);
};
