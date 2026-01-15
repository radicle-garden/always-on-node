import { initializeDatabase } from "$lib/server/db";
import { getUserFromSession } from "$lib/server/services/auth";

import type { Handle } from "@sveltejs/kit";

// Initialize database on server start
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Ensure database is initialized
  await ensureDbInitialized();

  // Get user from session cookie
  const user = await getUserFromSession(event.cookies);
  event.locals.user = user;

  const response = await resolve(event);
  return response;
};
