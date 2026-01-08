import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { usersService } from '$lib/server/services/users';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { handle, email, password } = await request.json();

		// Validate required fields
		if (!handle || !email || !password) {
			return json(
				{ success: false, error: 'Handle, email, and password are required' },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json({ success: false, error: 'Invalid email format' }, { status: 400 });
		}

		// Validate password length
		if (password.length < 4) {
			return json(
				{ success: false, error: 'Password length must be at least 4 characters' },
				{ status: 400 }
			);
		}

		const result = await usersService.createNewUser(handle, email, password);

		if (!result.success) {
			return json({ success: false, error: result.error }, { status: result.statusCode });
		}

		return json(
			{
				success: true,
				message: result.message
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('[API] Signup error:', err);
		return json({ success: false, error: 'Signup failed' }, { status: 500 });
	}
};
