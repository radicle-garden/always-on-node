import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
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
  alias: text("alias").notNull(),
  node_id: text("node_id").notNull().unique(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
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

// Webhook adapter tables — owned by Garden, read/written by the CI broker adapter.

export const webhookTriggerEvents = pgTable("webhook_trigger_event", {
  uuid: text("uuid").primaryKey(),
  event_type: text("event_type"),
  repo_id: text("repo_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }),
});

export const webhooks = pgTable(
  "webhook",
  {
    uuid: text("uuid").primaryKey(),
    event_uuid: text("event_uuid")
      .notNull()
      .references(() => webhookTriggerEvents.uuid),
    url: text("url"),
    name: text("name"),
    content_type: text("content_type"),
    request_headers: text("request_headers"),
    request_payload: text("request_payload"),
  },
  table => [index("webhook_event_uuid_idx").on(table.event_uuid)],
);

export const webhookInvocations = pgTable(
  "webhook_invocation",
  {
    uuid: text("uuid").primaryKey(),
    webhook_uuid: text("webhook_uuid")
      .notNull()
      .references(() => webhooks.uuid),
    response_status_code: integer("response_status_code"),
    response_headers: text("response_headers"),
    response_payload: text("response_payload"),
    error_message: text("error_message"),
    timestamp: timestamp("timestamp", { withTimezone: true }),
  },
  table => [
    index("webhook_invocation_webhook_uuid_idx").on(table.webhook_uuid),
  ],
);

export const webhookRepoConfigurations = pgTable(
  "webhook_repo_configuration",
  {
    node_id: text("node_id").notNull(),
    repo_id: text("repo_id").notNull(),
    url: text("url"),
    context: text("context").notNull(),
    content_type: text("content_type"),
    secret: text("secret"),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  table => [
    uniqueIndex("webhook_repo_configuration_unique_idx").on(
      table.node_id,
      table.repo_id,
      table.context,
    ),
  ],
);

export const repoCommitStatuses = pgTable(
  "repo_commit_status",
  {
    node_id: text("node_id").notNull(),
    repo_id: text("repo_id").notNull(),
    sha: text("sha").notNull(),
    state: text("state").notNull(),
    description: text("description"),
    target_url: text("target_url"),
    context: text("context").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    primaryKey({
      columns: [table.node_id, table.repo_id, table.sha, table.context],
    }),
  ],
);

export type User = typeof users.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type StripeSubscription = typeof stripeSubscriptions.$inferSelect;
export type WebhookTriggerEvent = typeof webhookTriggerEvents.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookInvocation = typeof webhookInvocations.$inferSelect;
export type WebhookRepoConfiguration =
  typeof webhookRepoConfigurations.$inferSelect;
export type RepoCommitStatus = typeof repoCommitStatuses.$inferSelect;
