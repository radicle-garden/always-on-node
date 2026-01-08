import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { profileFromUser } from '$lib/server/entities';
import { authenticateUser, setSessionCookie } from '$lib/server/services/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ success: false, message: 'Email and password are required' }, { status: 400 });
		}

		const { user, error } = await authenticateUser(email, password);

		if (!user) {
			return json({ success: false, message: error || 'Authentication failed' }, { status: 401 });
		}

		setSessionCookie(cookies, user.id);

		return json({
			success: true,
			content: profileFromUser(user, user.nodes)
		});
	} catch (err) {
		console.error('[API] Login error:', err);
		return json({ success: false, message: 'Login failed' }, { status: 500 });
	}
};
