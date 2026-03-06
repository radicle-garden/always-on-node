/**
 * Shared DB query helpers used by both e2e and staging test suites.
 *
 * These are pure functions that take a db instance as their first parameter,
 * avoiding any framework-specific path aliases ($lib).
 */
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "../../src/lib/server/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

export type { Db };

export async function getUserByEmail(db: Db, email: string) {
  return db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
}

export async function deleteUserByEmail(db: Db, email: string) {
  await db.delete(schema.users).where(eq(schema.users.email, email));
}

export async function insertStripeCustomer(
  db: Db,
  userId: number,
  stripeCustomerId: string,
) {
  const [customer] = await db
    .insert(schema.stripeCustomers)
    .values({ user_id: userId, stripe_customer_id: stripeCustomerId })
    .returning();
  return customer;
}

export async function getSubscriptionByUserId(db: Db, userId: number) {
  return db.query.stripeCustomers.findFirst({
    where: eq(schema.stripeCustomers.user_id, userId),
    with: { subscriptions: true },
  });
}

export async function deleteStripeDataByUserId(db: Db, userId: number) {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(schema.stripeCustomers.user_id, userId),
  });
  if (customer) {
    await db
      .delete(schema.stripeSubscriptions)
      .where(eq(schema.stripeSubscriptions.stripe_customer_id, customer.id));
    await db
      .delete(schema.stripeCustomers)
      .where(eq(schema.stripeCustomers.user_id, userId));
  }
}

export async function deleteNodesByUserId(db: Db, userId: number) {
  await db.delete(schema.nodes).where(eq(schema.nodes.user_id, userId));
}

export async function softDeleteNodesByUserId(db: Db, userId: number) {
  await db
    .update(schema.nodes)
    .set({ deleted: true })
    .where(eq(schema.nodes.user_id, userId));
}

export async function softDeleteUserById(db: Db, userId: number) {
  await db
    .update(schema.users)
    .set({ deleted: true })
    .where(eq(schema.users.id, userId));
}

export async function getStripeCustomerIdByEmail(
  db: Db,
  email: string,
): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
    with: { stripeCustomer: true },
  });
  return user?.stripeCustomer?.stripe_customer_id ?? null;
}
