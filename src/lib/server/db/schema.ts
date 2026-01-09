import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('user', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	email_verified: integer('email_verified', { mode: 'boolean' })
		.notNull()
		.default(false),
	password_hash: text('password_hash').notNull(),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
	handle: text('handle').notNull().unique(),
	description: text('description')
});

export const nodes = sqliteTable('node', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	did: text('did').notNull(),
	alias: text('alias').notNull(),
	ssh_public_key: text('ssh_public_key').notNull(),
	node_id: text('node_id').notNull().unique(),
	user_id: integer('user_id')
		.notNull()
		.references(() => users.id),
	created_at: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
	connect_address: text('connect_address')
});

export const seededRadicleRepositories = sqliteTable(
	'seeded_radicle_repository',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		repository_id: text('repository_id').notNull(),
		node_id: integer('node_id')
			.notNull()
			.references(() => nodes.id),
		seeding: integer('seeding', { mode: 'boolean' }).notNull(),
		seeding_start: text('seeding_start').notNull(),
		seeding_end: text('seeding_end')
	}
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	nodes: many(nodes)
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
	user: one(users, {
		fields: [nodes.user_id],
		references: [users.id]
	}),
	seededRepositories: many(seededRadicleRepositories)
}));

export const seededRadicleRepositoriesRelations = relations(
	seededRadicleRepositories,
	({ one }) => ({
		node: one(nodes, {
			fields: [seededRadicleRepositories.node_id],
			references: [nodes.id]
		})
	})
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
