import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "user",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    email_verified: boolean("email_verified").notNull().default(false),
    password_hash: text("password_hash").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted: boolean("deleted").notNull().default(false),
    handle: text("handle").notNull(),
    description: text("description"),
  },
  table => [
    uniqueIndex("user_email_unique_idx")
      .on(table.email)
      .where(sql`${table.deleted} IS NOT TRUE`),
    uniqueIndex("user_handle_unique_idx")
      .on(table.handle)
      .where(sql`${table.deleted} IS NOT TRUE`),
  ],
);

export const nodes = pgTable("node", {
  id: serial("id").primaryKey(),
  did: text("did").notNull(),
  alias: text("alias").notNull(),
  ssh_public_key: text("ssh_public_key").notNull(),
  node_id: text("node_id").notNull().unique(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
  connect_address: text("connect_address"),
});

export const stripeCustomers = pgTable("stripe_customer", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  stripe_customer_id: text("stripe_customer_id").notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stripeSubscriptions = pgTable("stripe_subscription", {
  id: serial("id").primaryKey(),
  stripe_customer_id: integer("stripe_customer_id")
    .notNull()
    .references(() => stripeCustomers.id),
  stripe_subscription_id: text("stripe_subscription_id").notNull().unique(),
  stripe_price_id: text("stripe_price_id").notNull(),
  status: text("status").notNull(),
  current_period_start: timestamp("current_period_start", {
    withTimezone: true,
  }).notNull(),
  current_period_end: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  cancel_at_period_end: boolean("cancel_at_period_end")
    .notNull()
    .default(false),
  cancel_at: timestamp("cancel_at", { withTimezone: true }),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  trial_start: timestamp("trial_start", { withTimezone: true }),
  trial_end: timestamp("trial_end", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  nodes: many(nodes),
  stripeCustomer: one(stripeCustomers, {
    fields: [users.id],
    references: [stripeCustomers.user_id],
  }),
}));

export const nodesRelations = relations(nodes, ({ one }) => ({
  user: one(users, {
    fields: [nodes.user_id],
    references: [users.id],
  }),
}));

export const stripeCustomersRelations = relations(
  stripeCustomers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [stripeCustomers.user_id],
      references: [users.id],
    }),
    subscriptions: many(stripeSubscriptions),
  }),
);

export const stripeSubscriptionsRelations = relations(
  stripeSubscriptions,
  ({ one }) => ({
    customer: one(stripeCustomers, {
      fields: [stripeSubscriptions.stripe_customer_id],
      references: [stripeCustomers.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type StripeSubscription = typeof stripeSubscriptions.$inferSelect;
