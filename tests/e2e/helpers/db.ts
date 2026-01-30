import { getDb, schema } from "$lib/server/db";

import { eq } from "drizzle-orm";

export async function getTestDb() {
  return await getDb();
}

export async function getUserByEmail(email: string) {
  const db = await getTestDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  return user;
}

export async function deleteUserByEmail(email: string) {
  const db = await getTestDb();
  await db.delete(schema.users).where(eq(schema.users.email, email));
}
