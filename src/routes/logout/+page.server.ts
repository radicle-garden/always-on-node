import type { Actions } from './$types';

import { clearSessionCookie } from '$lib/server/services/auth';

import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ cookies }) => {
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
} satisfies Actions;
