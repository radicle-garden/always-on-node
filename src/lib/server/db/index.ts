import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { config } from "../config";
import { createServiceLogger } from "../logger";

import * as schema from "./schema";

const log = createServiceLogger("Database");

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let client: postgres.Sql | null = null;

export async function initializeDatabase() {
  if (db) {
    return db;
  }

  log.info("Initializing database connection");

  client = postgres(config.databaseUrl);
  db = drizzle(client, { schema });

  log.info("Database connection established successfully");

  return db;
}

export async function getDb() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export { schema };
