import { config } from '../config';
import * as schema from './schema';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteDb: Database.Database | null = null;

export function initializeDatabase() {
	if (db) {
		return db;
	}

	const dbPath = config.databaseStoragePath + '/garden_app.sqlite';
	console.log(`[Database] Initializing database at ${dbPath}`);

	sqliteDb = new Database(dbPath);

	// Enable WAL mode for better concurrency
	sqliteDb.pragma('journal_mode = WAL');

	db = drizzle(sqliteDb, { schema });

	// Create tables if they don't exist
	sqliteDb.exec(`
		CREATE TABLE IF NOT EXISTS user (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			email_verified INTEGER NOT NULL DEFAULT 0,
			password_hash TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			deleted INTEGER NOT NULL DEFAULT 0,
			handle TEXT NOT NULL UNIQUE,
			description TEXT
		);

		CREATE TABLE IF NOT EXISTS node (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			did TEXT NOT NULL,
			alias TEXT NOT NULL,
			ssh_public_key TEXT NOT NULL,
			node_id TEXT NOT NULL UNIQUE,
			user_id INTEGER NOT NULL REFERENCES user(id),
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			deleted INTEGER NOT NULL DEFAULT 0,
			connect_address TEXT
		);

		CREATE TABLE IF NOT EXISTS seeded_radicle_repository (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			repository_id TEXT NOT NULL,
			node_id INTEGER NOT NULL REFERENCES node(id),
			seeding INTEGER NOT NULL,
			seeding_start TEXT NOT NULL,
			seeding_end TEXT
		);
	`);

	console.log('[Database] Database initialized successfully');

	return db;
}

export function getDb() {
	if (!db) {
		return initializeDatabase();
	}
	return db;
}

export { schema };
