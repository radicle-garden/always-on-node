import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { usersService } from '$lib/server/services/users';

export const GET: RequestHandler = async ({ params }) => {
	const { handle } = params;

	if (!handle) {
		return json({ success: false, error: 'Handle is required' }, { status: 400 });
	}

	const result = await usersService.retrieveUserByHandle(handle, true);

	return json(
		{
			success: result.success,
			content: result.content,
			error: result.error
		},
		{ status: result.statusCode }
	);
};
