import { and, eq, or } from "drizzle-orm";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { config } from "../config";
import { getDb, schema } from "../db";
import { type User, profileFromUser, setPassword } from "../entities";
import { createServiceLogger } from "../logger";

import { emailService } from "./email";

const log = createServiceLogger("Users");

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
      log.warn("No user found with handle", { handle: username });
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
    log.error("Failed to retrieve user", { handle: username, error: err });
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
          error: "Someone has an account with this email already",
          content: null,
          statusCode: 400,
        };
      }
      if (existingUser.handle === handle) {
        return {
          success: false,
          error: "Someone has an account with this username already",
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

    log.info("Creating user", { handle, email });

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
      log.warn("Failed to save user");
      return {
        success: false,
        error: `Failed to save user`,
        content: null,
        statusCode: 500,
      };
    }

    log.info("New user signed up", {
      email: savedUser.email,
      userId: savedUser.id,
    });

    const emailResult = await emailService.sendVerificationEmail(
      savedUser.id.toString(),
      savedUser.email,
      savedUser.handle,
    );

    if (!emailResult.success) {
      log.warn("Failed to send email verification code", {
        email: savedUser.email,
      });
      // Don't fail the registration, but log the error
    }

    return {
      success: true,
      message: `Successfully created user with id: ${savedUser.id}`,
      content: savedUser,
      statusCode: 201,
    };
  } catch (instErr) {
    log.error("User insert error", { error: instErr });
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
      log.warn("User not found", { userId: userToVerify.id });
      return { success: false, error: `User not found`, statusCode: 404 };
    }

    if (user.email_verified) {
      log.info("Email already verified", { userId: user.id });
      return {
        success: true,
        statusCode: 200,
      };
    }

    await db
      .update(schema.users)
      .set({ email_verified: true })
      .where(eq(schema.users.id, user.id));

    log.info("Successfully verified email address", { userId: user.id });
    return {
      success: true,
      message: `Email verified successfully. Please complete payment to activate your node.`,
      statusCode: 200,
    };
  } catch (e) {
    log.error("Failed to verify email address", { error: e });
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
      log.warn("User not found", { userId: decoded.id });
      return {
        success: false,
        error: "Invalid or expired reset link",
        statusCode: 404,
      };
    }

    if (user.email !== decoded.email) {
      log.warn("Token email mismatch", { userId: user.id });
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
    log.warn("Failed to verify password reset token", { error: e });
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

    log.info("Successfully reset password", { userId });
    return {
      success: true,
      message: "Password reset successfully",
      statusCode: 200,
    };
  } catch (e) {
    log.error("Failed to reset password", { error: e });
    return {
      success: false,
      error: "Couldn't reset password",
      statusCode: 500,
    };
  }
}

export async function resendVerificationEmail(
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
      log.info("Verification email resend requested for non-existent email", {
        email,
      });
      // Return success to avoid leaking information about registered emails
      return {
        success: true,
        statusCode: 200,
      };
    }

    if (user.email_verified) {
      log.info(
        "Verification email resend requested for already verified user",
        {
          email,
        },
      );
      return {
        success: true,
        statusCode: 200,
      };
    }

    const emailResult = await emailService.sendVerificationEmail(
      user.id.toString(),
      user.email,
      user.handle,
    );

    if (!emailResult.success) {
      log.warn("Failed to resend verification email", { email });
      return {
        success: false,
        error: "Couldn't send verification email",
        statusCode: 500,
      };
    }

    log.info("Verification email resent", { email });
    return {
      success: true,
      statusCode: 200,
    };
  } catch (e) {
    log.error("Failed to resend verification email", { error: e });
    return {
      success: false,
      error: "Couldn't resend verification email",
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
      log.info("Password reset requested for non-existent email", { email });
      return {
        success: true,
        statusCode: 200,
      };
    }

    const emailResult = await emailService.sendPasswordResetEmail(
      user.id.toString(),
      user.email,
    );

    if (!emailResult.success) {
      log.warn("Failed to send password reset email", { email });
      return {
        success: false,
        error: "Couldn't send password reset email",
        statusCode: 500,
      };
    }

    log.info("Password reset email sent", { email });
    return {
      success: true,
      statusCode: 200,
    };
  } catch (e) {
    log.error("Failed to process password reset request", { error: e });
    return {
      success: false,
      error: "Couldn't process password reset request",
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
    log.warn("Failed to retrieve user with subscription", { userId, error: e });
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
  resendVerificationEmail,
  retrieveUserWithSubscription,
};
