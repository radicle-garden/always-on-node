import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return { user: null };
	}

	const { password_hash: _, ...safeUser } = user;

	return {
		user: safeUser
	};
};
