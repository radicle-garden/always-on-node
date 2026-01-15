import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  email_verified: boolean("email_verified").notNull().default(false),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted: boolean("deleted").notNull().default(false),
  handle: text("handle").notNull().unique(),
  description: text("description"),
});

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

export const seededRadicleRepositories = pgTable("seeded_radicle_repository", {
  id: serial("id").primaryKey(),
  repository_id: text("repository_id").notNull(),
  node_id: integer("node_id")
    .notNull()
    .references(() => nodes.id),
  seeding: boolean("seeding").notNull(),
  seeding_start: timestamp("seeding_start", { withTimezone: true }).notNull(),
  seeding_end: timestamp("seeding_end", { withTimezone: true }),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  nodes: many(nodes),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  user: one(users, {
    fields: [nodes.user_id],
    references: [users.id],
  }),
  seededRepositories: many(seededRadicleRepositories),
}));

export const seededRadicleRepositoriesRelations = relations(
  seededRadicleRepositories,
  ({ one }) => ({
    node: one(nodes, {
      fields: [seededRadicleRepositories.node_id],
      references: [nodes.id],
    }),
  }),
);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type SeededRadicleRepository =
  typeof seededRadicleRepositories.$inferSelect;
export type NewSeededRadicleRepository =
  typeof seededRadicleRepositories.$inferInsert;
