import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export function validateControlDatabaseUrls(databaseUrl: string, controlDatabaseUrl: string): void {
  const runtime = new URL(databaseUrl);
  const control = new URL(controlDatabaseUrl);
  for (const key of control.searchParams.keys()) {
    if (!["sslmode", "application_name", "connect_timeout"].includes(key)) {
      throw new Error("CONTROL_DATABASE_URL contains a forbidden connection override");
    }
  }
  if (decodeURIComponent(control.username) !== "bimmetraj_control") {
    throw new Error("CONTROL_DATABASE_URL must authenticate as bimmetraj_control");
  }
  if (runtime.hostname !== control.hostname || runtime.port !== control.port || runtime.pathname !== control.pathname) {
    throw new Error("DATABASE_URL and CONTROL_DATABASE_URL must address the same PostgreSQL target");
  }
  if (runtime.toString() === control.toString()) {
    throw new Error("CONTROL_DATABASE_URL must use the distinct bimmetraj_control identity");
  }
}

const connectControlDatabase = (pool: pg.Pool) => drizzle(pool, { schema });
let singleton: { pool: pg.Pool; db: ReturnType<typeof connectControlDatabase> } | null = null;

export function getControlDatabase() {
  if (singleton) return singleton;
  const databaseUrl = process.env.DATABASE_URL;
  const isolatedTestUrl = process.env.NODE_ENV === "test"
    && databaseUrl?.includes("search_path%3Dteklifpro_test_") ? databaseUrl : undefined;
  const controlDatabaseUrl = process.env.CONTROL_DATABASE_URL || isolatedTestUrl;
  if (!databaseUrl || !controlDatabaseUrl) {
    throw new Error("DATABASE_URL and CONTROL_DATABASE_URL are required for control-plane mutations");
  }
  if (!isolatedTestUrl) validateControlDatabaseUrls(databaseUrl, controlDatabaseUrl);
  const pool = new pg.Pool({
    connectionString: controlDatabaseUrl,
    max: Number.parseInt(process.env.CONTROL_PG_POOL_MAX || "2", 10),
    connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || "5000", 10),
    idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS || "10000", 10),
    statement_timeout: Number.parseInt(process.env.PG_STATEMENT_TIMEOUT_MS || "30000", 10),
  });
  singleton = { pool, db: connectControlDatabase(pool) };
  return singleton;
}

export async function closeControlDatabase(): Promise<void> {
  if (!singleton) return;
  const current = singleton;
  singleton = null;
  await current.pool.end();
}
