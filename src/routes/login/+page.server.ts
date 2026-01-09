import type { Actions, PageServerLoad } from './$types';

import {
	authenticateUser,
	setSessionCookie,
	getUserFromSession
} from '$lib/server/services/auth';

import { fail, redirect, isRedirect } from '@sveltejs/kit';

interface LoginFormErrors {
	email?: string;
	password?: string;
	general?: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const user = await getUserFromSession(cookies);
	if (user) {
		redirect(303, `/${user.handle}`);
	}
	return {};
};

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString()?.trim();
		const password = data.get('password')?.toString();

		const errors: LoginFormErrors = {};

		if (!email) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Invalid email address';
		}

		if (!password) {
			errors.password = 'Password is required';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { email, errors });
		}

		try {
			const { user, error } = await authenticateUser(email!, password!);

			if (!user) {
				return fail(401, {
					email,
					errors: { general: error || 'Invalid credentials' } as LoginFormErrors
				});
			}

			setSessionCookie(cookies, user.id);
			redirect(303, `/${user.handle}`);
		} catch (err) {
			if (isRedirect(err)) {
				throw err;
			}
			console.error('[Login] Error:', err);
			return fail(500, {
				email,
				errors: {
					general: 'Login failed. Please try again.'
				} as LoginFormErrors
			});
		}
	}
} satisfies Actions;
