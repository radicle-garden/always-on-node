import { and, eq, or } from "drizzle-orm";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { config } from "../config";
import { getDb, schema } from "../db";
import { type User, profileFromUser, setPassword } from "../entities";

import { emailService } from "./email";

interface ServiceResult<T> {
  success: boolean;
  content?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export async function retrieveUserByHandle(
  username: string,
  publicProfile: boolean,
): Promise<ServiceResult<User | object>> {
  try {
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.handle, username),
        eq(schema.users.deleted, false),
      ),
      with: {
        nodes: {
          where: eq(schema.nodes.deleted, false),
        },
      },
    });

    if (!user) {
      console.log(`[Users] No user found with handle: ${username}`);
      return {
        success: false,
        error: `No user found with handle: ${username}`,
        statusCode: 404,
      };
    }

    return {
      success: true,
      content: publicProfile ? profileFromUser(user, user.nodes) : user,
      statusCode: 200,
    };
  } catch (err) {
    console.error(`[Users] Failed to retrieve user ${username}:`, err);
    return {
      success: false,
      error: "Failed to retrieve user",
      statusCode: 500,
    };
  }
}

export async function createNewUser(
  handle: string,
  email: string,
  password: string,
): Promise<ServiceResult<User | null>> {
  try {
    const db = await getDb();

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: or(eq(schema.users.email, email), eq(schema.users.handle, handle)),
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return {
          success: false,
          error: "A user with this email already exists",
          content: null,
          statusCode: 400,
        };
      }
      if (existingUser.handle === handle) {
        return {
          success: false,
          error: "A user with this handle already exists",
          content: null,
          statusCode: 400,
        };
      }
    }

    // Validate handle format
    const handleRegex = /^[a-zA-Z]+[a-zA-Z0-9_-]+$/;
    if (!handleRegex.test(handle)) {
      return {
        success: false,
        error:
          "Username must start with a letter and can only contain letters, numbers, dashes and underscores",
        content: null,
        statusCode: 400,
      };
    }

    console.log(
      `[Users] Creating user with handle: ${handle} and email: ${email}`,
    );

    const [savedUser] = await db
      .insert(schema.users)
      .values({
        handle,
        email,
        email_verified: false,
        password_hash: setPassword(password),
        deleted: false,
      })
      .returning();

    if (!savedUser) {
      console.warn(`[Users] Failed to save user`);
      return {
        success: false,
        error: `Failed to save user`,
        content: null,
        statusCode: 500,
      };
    }

    console.log(
      `[Users] New user: ${savedUser.email} signed up with id: ${savedUser.id}`,
    );

    const emailResult = await emailService.sendVerificationEmail(
      savedUser.id.toString(),
      savedUser.email,
      savedUser.handle,
    );

    if (!emailResult.success) {
      console.warn(
        `[Users] Failed to send email verification code to ${savedUser.email}`,
      );
      // Don't fail the registration, but log the error
    }

    return {
      success: true,
      message: `Successfully created user with id: ${savedUser.id}`,
      content: savedUser,
      statusCode: 201,
    };
  } catch (instErr) {
    console.warn(`[Users] User insert error:`, instErr);
    return {
      success: false,
      error: `User insert error`,
      content: null,
      statusCode: 500,
    };
  }
}

export async function verifyEmailAddress(
  jsonWebToken: string,
): Promise<ServiceResult<void>> {
  try {
    const db = await getDb();
    const userToVerify = jwt.verify(
      jsonWebToken,
      config.appSecret,
    ) as JwtPayload;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userToVerify.id),
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
        statusCode: 200,
      };
    }

    await db
      .update(schema.users)
      .set({ email_verified: true })
      .where(eq(schema.users.id, user.id));

    console.log(
      `[Users] Successfully verified email address for user: ${user.id}`,
    );
    return {
      success: true,
      message: `Email verified successfully. Please complete payment to activate your node.`,
      statusCode: 200,
    };
  } catch (e) {
    console.warn(`[Users] Failed to verify email address:`, e);
    return {
      success: false,
      error: `Failed to verify email address`,
      statusCode: 500,
    };
  }
}

export async function verifyPasswordResetToken(
  jsonWebToken: string,
): Promise<ServiceResult<{ userId: number; email: string }>> {
  try {
    const decoded = jwt.verify(jsonWebToken, config.appSecret) as JwtPayload;

    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, decoded.id),
    });

    if (!user) {
      console.warn(`[Users] User not found with id: ${decoded.id}`);
      return {
        success: false,
        error: "Invalid or expired reset link",
        statusCode: 404,
      };
    }

    if (user.email !== decoded.email) {
      console.warn(`[Users] Token email mismatch for user: ${user.id}`);
      return {
        success: false,
        error: "Invalid or expired reset link",
        statusCode: 400,
      };
    }

    return {
      success: true,
      content: { userId: user.id, email: user.email },
      statusCode: 200,
    };
  } catch (e) {
    console.warn(`[Users] Failed to verify password reset token:`, e);
    return {
      success: false,
      error: "Invalid or expired reset link",
      statusCode: 400,
    };
  }
}

export async function resetPassword(
  jsonWebToken: string,
  newPassword: string,
): Promise<ServiceResult<void>> {
  try {
    const tokenResult = await verifyPasswordResetToken(jsonWebToken);
    if (!tokenResult.success || !tokenResult.content) {
      return {
        success: false,
        error: tokenResult.error || "Invalid or expired reset link",
        statusCode: tokenResult.statusCode,
      };
    }

    const { userId } = tokenResult.content;

    if (!newPassword || newPassword.length < 4) {
      return {
        success: false,
        error: "Password must be at least 4 characters",
        statusCode: 400,
      };
    }

    const db = await getDb();
    await db
      .update(schema.users)
      .set({ password_hash: setPassword(newPassword) })
      .where(eq(schema.users.id, userId));

    console.log(`[Users] Successfully reset password for user: ${userId}`);
    return {
      success: true,
      message: "Password reset successfully",
      statusCode: 200,
    };
  } catch (e) {
    console.warn(`[Users] Failed to reset password:`, e);
    return {
      success: false,
      error: "Failed to reset password",
      statusCode: 500,
    };
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<ServiceResult<void>> {
  try {
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.email, email),
        eq(schema.users.deleted, false),
      ),
    });

    if (!user) {
      console.log(
        `[Users] Password reset requested for non-existent email: ${email}`,
      );
      return {
        success: true,
        message:
          "If an account exists with this email, a reset link has been sent",
        statusCode: 200,
      };
    }

    const emailResult = await emailService.sendPasswordResetEmail(
      user.id.toString(),
      user.email,
    );

    if (!emailResult.success) {
      console.warn(`[Users] Failed to send password reset email to ${email}`);
      return {
        success: false,
        error: "Failed to send password reset email",
        statusCode: 500,
      };
    }

    console.log(`[Users] Password reset email sent to: ${email}`);
    return {
      success: true,
      message:
        "If an account exists with this email, a reset link has been sent",
      statusCode: 200,
    };
  } catch (e) {
    console.warn(`[Users] Failed to process password reset request:`, e);
    return {
      success: false,
      error: "Failed to process password reset request",
      statusCode: 500,
    };
  }
}

export async function retrieveUserWithSubscription(userId: number) {
  try {
    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: and(eq(schema.users.id, userId), eq(schema.users.deleted, false)),
      with: {
        nodes: { where: eq(schema.nodes.deleted, false) },
        stripeCustomer: {
          with: {
            subscriptions: true,
          },
        },
      },
    });
    return user;
  } catch (e) {
    console.warn(
      `[Users] Failed to retrieve user with subscription for userId: ${userId}`,
      e,
    );
    return null;
  }
}

export const usersService = {
  retrieveUserByHandle,
  createNewUser,
  verifyEmailAddress,
  verifyPasswordResetToken,
  resetPassword,
  requestPasswordReset,
  retrieveUserWithSubscription,
};
