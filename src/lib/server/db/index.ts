import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { config } from "../config";

import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let client: postgres.Sql | null = null;

export async function initializeDatabase() {
  if (db) {
    return db;
  }

  console.log(`[Database] Initializing database connection`);

  client = postgres(config.databaseUrl);
  db = drizzle(client, { schema });

  console.log("[Database] Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("[Database] Migrations applied successfully");
  } catch (error) {
    console.error("[Database] Migration failed:", error);
    throw error;
  }

  console.log("[Database] Database initialized successfully");

  return db;
}

export async function getDb() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export { schema };
