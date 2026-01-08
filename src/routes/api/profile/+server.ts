import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	// Return user without password hash
	const { password_hash: _, ...safeUser } = user;

	return json({
		success: true,
		content: safeUser
	});
};
