import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import pg from "pg";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const maxConnections = parseInt(process.env.PG_POOL_MAX || "10", 10);
const connectionTimeoutMillis = parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || "5000", 10);
const idleTimeoutMillis = parseInt(process.env.PG_IDLE_TIMEOUT_MS || "10000", 10);
const statementTimeout = parseInt(process.env.PG_STATEMENT_TIMEOUT_MS || "30000", 10);

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: maxConnections,
  connectionTimeoutMillis,
  idleTimeoutMillis,
  statement_timeout: statementTimeout,
});

export const db = drizzle(pool, { schema });
