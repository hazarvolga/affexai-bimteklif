import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export function validateControlDatabaseUrls(databaseUrl: string, controlDatabaseUrl: string): void {
  const runtime = new URL(databaseUrl);
  const control = new URL(controlDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(runtime.protocol) || !['postgres:', 'postgresql:'].includes(control.protocol)) {
    throw new Error("DATABASE_URL and CONTROL_DATABASE_URL must be PostgreSQL URLs");
  }
  const allowedOptions = new Set(["sslmode", "application_name", "connect_timeout"]);
  for (const [label, url] of [["DATABASE_URL", runtime], ["CONTROL_DATABASE_URL", control]] as const) {
    const seen = new Set<string>();
    for (const key of url.searchParams.keys()) {
      if (seen.has(key)) throw new Error(`${label} contains a duplicate connection option`);
      seen.add(key);
      if (!allowedOptions.has(key)) {
        throw new Error(`${label} contains a forbidden connection override`);
      }
    }
  }
  if (decodeURIComponent(runtime.username) !== "bimmetraj_app") {
    throw new Error("DATABASE_URL must authenticate as bimmetraj_app");
  }
  if (decodeURIComponent(control.username) !== "bimmetraj_control") {
    throw new Error("CONTROL_DATABASE_URL must authenticate as bimmetraj_control");
  }
  const runtimePort = runtime.port || "5432";
  const controlPort = control.port || "5432";
  if (runtime.hostname.toLowerCase() !== control.hostname.toLowerCase() || runtimePort !== controlPort || runtime.pathname !== control.pathname) {
    throw new Error("DATABASE_URL and CONTROL_DATABASE_URL must address the same PostgreSQL target");
  }
  const sslStrength: Readonly<Record<string, number>> = Object.freeze({ disable: 0, allow: 1, prefer: 2, require: 3, "verify-ca": 4, "verify-full": 5 });
  const runtimeSsl = runtime.searchParams.get("sslmode") ?? "prefer";
  const controlSsl = control.searchParams.get("sslmode") ?? "prefer";
  if (!(runtimeSsl in sslStrength) || !(controlSsl in sslStrength)) {
    throw new Error("DATABASE_URL and CONTROL_DATABASE_URL contain an unsupported sslmode");
  }
  if (sslStrength[controlSsl]! < sslStrength[runtimeSsl]!) {
    throw new Error("CONTROL_DATABASE_URL cannot weaken DATABASE_URL transport security");
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
