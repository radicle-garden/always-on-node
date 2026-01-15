import { and, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import type { Cookies } from "@sveltejs/kit";

import { config } from "../config";
import { getDb, schema } from "../db";
import { type Node, type User, verifyPassword } from "../entities";

const SESSION_COOKIE_NAME = "garden_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 2 weeks in seconds

export interface SessionData {
  userId: number;
  userCreatedAt: string;
  createdAt: number;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ user: (User & { nodes: Node[] }) | null; error?: string }> {
  const db = await getDb();

  try {
    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.email, email),
        eq(schema.users.deleted, false),
      ),
      with: {
        nodes: {
          where: eq(schema.nodes.deleted, false),
        },
      },
    });

    if (!user) {
      return { user: null, error: "User not found." };
    }

    if (!user.email_verified) {
      return {
        user: null,
        error: "Please verify your email address to login.",
      };
    }

    if (!verifyPassword(password, user.password_hash)) {
      return { user: null, error: "Incorrect username or password." };
    }

    return { user };
  } catch (err) {
    console.error("[Auth] Error authenticating user:", err);
    return { user: null, error: "Authentication failed." };
  }
}

export function createSession(userId: number, userCreatedAt: string): string {
  const sessionData: SessionData = {
    userId,
    userCreatedAt,
    createdAt: Date.now(),
  };

  return jwt.sign(sessionData, config.appSecret, {
    expiresIn: SESSION_MAX_AGE,
  });
}

export function verifySession(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, config.appSecret) as SessionData;
    return decoded;
  } catch {
    return null;
  }
}

export async function getUserFromSession(
  cookies: Cookies,
): Promise<(User & { nodes: Node[] }) | null> {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME);

  if (!sessionToken) {
    return null;
  }

  const sessionData = verifySession(sessionToken);
  if (!sessionData) {
    return null;
  }

  const db = await getDb();
  const user = await db.query.users.findFirst({
    where: and(
      eq(schema.users.id, sessionData.userId),
      eq(schema.users.deleted, false),
    ),
    with: {
      nodes: {
        where: eq(schema.nodes.deleted, false),
      },
    },
  });

  if (!user) {
    return null;
  }

  if (user.created_at !== sessionData.userCreatedAt) {
    return null;
  }

  if (!user.email_verified) {
    return null;
  }

  return user;
}

export function setSessionCookie(
  cookies: Cookies,
  userId: number,
  userCreatedAt: string,
): void {
  const token = createSession(userId, userCreatedAt);

  cookies.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
}

export { SESSION_COOKIE_NAME };
