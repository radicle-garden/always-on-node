import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { clearSessionCookie } from '$lib/server/services/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies);

	return json({ success: true, message: 'Logged out successfully' });
};
