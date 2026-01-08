import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { usersService } from '$lib/server/services/users';

export const load: PageServerLoad = async ({ params }) => {
	const { token } = params;

	const result = await usersService.verifyEmailAddress(token);

	if (result.success) {
		// Redirect to login with success message
		throw redirect(303, '/login?verified=true');
	} else {
		// Redirect to login with error message
		throw redirect(303, '/login?verified=false');
	}
};
