import { eq, and, or } from 'drizzle-orm';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { config } from '../config';
import { getDb, schema } from '../db';
import { profileFromUser, setPassword, type Node, type User } from '../entities';
import { emailService } from './email';
import { nodesService } from './nodes';

interface ServiceResult<T> {
	success: boolean;
	content?: T;
	error?: string;
	message?: string;
	statusCode: number;
}

export async function retrieveUserByHandle(
	username: string,
	publicProfile: boolean
): Promise<ServiceResult<User | object>> {
	try {
		const db = getDb();
		const user = await db.query.users.findFirst({
			where: and(eq(schema.users.handle, username), eq(schema.users.deleted, false)),
			with: {
				nodes: {
					where: eq(schema.nodes.deleted, false)
				}
			}
		});

		if (!user) {
			console.log(`[Users] No user found with handle: ${username}`);
			return {
				success: false,
				error: `No user found with handle: ${username}`,
				statusCode: 404
			};
		}

		return {
			success: true,
			content: publicProfile ? profileFromUser(user, user.nodes) : user,
			statusCode: 200
		};
	} catch (err) {
		console.error(`[Users] Failed to retrieve user ${username}:`, err);
		return {
			success: false,
			error: 'Failed to retrieve user',
			statusCode: 500
		};
	}
}

export async function createNewUser(
	handle: string,
	email: string,
	password: string
): Promise<ServiceResult<User | null>> {
	try {
		const db = getDb();

		// Check if user already exists
		const existingUser = await db.query.users.findFirst({
			where: or(eq(schema.users.email, email), eq(schema.users.handle, handle))
		});

		if (existingUser) {
			if (existingUser.email === email) {
				return {
					success: false,
					error: 'A user with this email already exists',
					content: null,
					statusCode: 400
				};
			}
			if (existingUser.handle === handle) {
				return {
					success: false,
					error: 'A user with this handle already exists',
					content: null,
					statusCode: 400
				};
			}
		}

		// Validate handle format
		const handleRegex = /^[a-zA-Z]+[a-zA-Z0-9_-]+$/;
		if (!handleRegex.test(handle)) {
			return {
				success: false,
				error:
					'Username must start with a letter and can only contain letters, numbers, dashes and underscores',
				content: null,
				statusCode: 400
			};
		}

		console.log(`[Users] Creating user with handle: ${handle} and email: ${email}`);

		const [savedUser] = await db
			.insert(schema.users)
			.values({
				handle,
				email,
				email_verified: false,
				password_hash: setPassword(password),
				deleted: false
			})
			.returning();

		if (!savedUser) {
			console.warn(`[Users] Failed to save user`);
			return {
				success: false,
				error: `Failed to save user`,
				content: null,
				statusCode: 500
			};
		}

		console.log(`[Users] New user: ${savedUser.email} signed up with id: ${savedUser.id}`);

		const emailResult = await emailService.sendVerificationEmail(
			savedUser.id.toString(),
			savedUser.email,
			savedUser.handle
		);

		if (!emailResult.success) {
			console.warn(`[Users] Failed to send email verification code to ${savedUser.email}`);
			// Don't fail the registration, but log the error
		}

		return {
			success: true,
			message: `Successfully created user with id: ${savedUser.id}`,
			content: savedUser,
			statusCode: 201
		};
	} catch (instErr) {
		console.warn(`[Users] User insert error:`, instErr);
		return {
			success: false,
			error: `User insert error`,
			content: null,
			statusCode: 500
		};
	}
}

export async function verifyEmailAddress(jsonWebToken: string): Promise<ServiceResult<void>> {
	try {
		const db = getDb();
		const userToVerify = jwt.verify(jsonWebToken, config.appSecret) as JwtPayload;

		const user = await db.query.users.findFirst({
			where: eq(schema.users.id, userToVerify.id)
		});

		if (!user) {
			console.warn(`[Users] User not found with id: ${userToVerify.id}`);
			return { success: false, error: `User not found`, statusCode: 404 };
		}

		if (user.email_verified) {
			console.log(`[Users] Email already verified for user: ${user.id}`);
			return {
				success: true,
				message: `Email already verified`,
				statusCode: 200
			};
		}

		await db
			.update(schema.users)
			.set({ email_verified: true })
			.where(eq(schema.users.id, user.id));

		const node = await nodesService.createNode(user);
		if (!node) {
			console.warn(`[Users] Failed to create node for user: ${user.id}`);
			return {
				success: false,
				error: `Failed to create node for user: ${user.id}`,
				statusCode: 500
			};
		}

		console.log(`[Users] Successfully verified email address for user: ${user.id}`);
		return {
			success: true,
			message: `Email verified successfully`,
			statusCode: 200
		};
	} catch (e) {
		console.warn(`[Users] Failed to verify email address:`, e);
		return {
			success: false,
			error: `Failed to verify email address`,
			statusCode: 500
		};
	}
}

export const usersService = {
	retrieveUserByHandle,
	createNewUser,
	verifyEmailAddress
};
