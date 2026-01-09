import type { PageServerLoad } from './$types';

import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (user) {
		redirect(303, `/${user.handle}`);
	} else {
		redirect(303, '/login');
	}
};
