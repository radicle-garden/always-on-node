import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

import { clearSessionCookie } from '$lib/server/services/auth';

export const actions = {
	default: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
