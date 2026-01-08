import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PublicNodeInfo, UserProfile } from '$types/app';

import { usersService } from '$lib/server/services/users';
import { nodesService } from '$lib/server/services/nodes';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { handle } = params;
	const currentUser = locals.user;
	const isMe = currentUser?.handle === handle;

	let profile: UserProfile;
	if (isMe && currentUser) {
		profile = {
			handle: currentUser.handle,
			description: currentUser.description ?? '',
			created_at: currentUser.created_at,
			nodes: currentUser.nodes.map((n): PublicNodeInfo => ({
				node_id: n.node_id,
				did: n.did,
				alias: n.alias,
				ssh_public_key: n.ssh_public_key,
				connect_address: n.connect_address ?? ''
			}))
		};
	} else {
		const result = await usersService.retrieveUserByHandle(handle, true);
		if (!result.success || !result.content) {
			throw error(result.statusCode, result.error || 'User not found');
		}
		profile = result.content as UserProfile;
	}

	const seededRepositories: Record<string, Awaited<ReturnType<typeof nodesService.getSeededReposForNode>>['content']> = {};

	for (const node of profile.nodes || []) {
		const seededResult = await nodesService.getSeededReposForNode(node.node_id);
		if (seededResult.success && seededResult.content) {
			seededRepositories[node.node_id] = seededResult.content.filter((r) => r.seeding);
		} else {
			seededRepositories[node.node_id] = [];
		}
	}

	return {
		profile,
		seededRepositories,
		isMe
	};
};
