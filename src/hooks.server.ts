import type { Handle } from '@sveltejs/kit';

import { initializeDatabase } from '$lib/server/db';
import { getUserFromSession } from '$lib/server/services/auth';

// Initialize database on server start
let dbInitialized = false;

function ensureDbInitialized() {
	if (!dbInitialized) {
		initializeDatabase();
		dbInitialized = true;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Ensure database is initialized
	ensureDbInitialized();

	// Get user from session cookie
	const user = await getUserFromSession(event.cookies);
	event.locals.user = user;

	const response = await resolve(event);
	return response;
};
