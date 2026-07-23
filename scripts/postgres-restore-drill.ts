import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { URL } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { Client } = pg;
const ROOT = process.cwd();
const TARGET_DATABASE = "teklifpro_restore_drill_local";
const DEFAULT_TARGET_URL = `postgresql://hazarekiz@localhost:5432/${TARGET_DATABASE}`;
const REPORT_PATH = path.join(ROOT, "docs/architecture/generated/postgres-restore-drill.json");

type Target = {
  url: string;
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
};

type Snapshot = {
  schemaSha256: string;
  tableCount: number;
  enumCount: number;
  rowCount: number;
};

function parseArgs() {
  const flags = new Set(process.argv.slice(2));
  return { prepare: flags.has("--prepare"), plan: flags.has("--plan") };
}

function parseTarget(rawUrl: string, label: string): Target {
  const parsed = new URL(rawUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error(`${label} must be a PostgreSQL URL`);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) throw new Error(`${label} must include a database name`);
  return {
    url: rawUrl,
    host: parsed.hostname || "localhost",
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username || process.env.USER || "postgres"),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    database,
  };
}

function maintenance(target: Target): Target {
  const parsed = new URL(target.url);
  parsed.pathname = "/postgres";
  return { ...target, database: "postgres", url: parsed.toString() };
}

function envFor(target: Target): NodeJS.ProcessEnv {
  return { ...process.env, ...(target.password ? { PGPASSWORD: target.password } : {}) };
}

function run(command: string, args: string[], target: Target): string {
  return execFileSync(command, args, {
    cwd: ROOT,
    env: envFor(target),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(target: Target, text: string, values: unknown[] = []) {
  const client = new Client({ connectionString: target.url });
  await client.connect();
  try {
    return await client.query<T>(text, values);
  } finally {
    await client.end();
  }
}

async function exists(target: Target) {
  const result = await query<{ exists: boolean }>(maintenance(target), "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists", [target.database]);
  return result.rows[0]?.exists === true;
}

async function hasObjects(target: Target) {
  const result = await query<{ count: string }>(target, `
    SELECT count(*)::text AS count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  `);
  return Number(result.rows[0]?.count ?? 0) > 0;
}

async function ensureTarget(target: Target) {
  if (target.database !== TARGET_DATABASE) throw new Error(`Refusing restore target ${target.database}; expected ${TARGET_DATABASE}`);
  if (await exists(target)) {
    if (await hasObjects(target)) throw new Error(`Restore target ${target.database} already contains objects; refusing overwrite`);
    return;
  }
  run("createdb", ["--host", target.host, "--port", target.port, "--username", target.user, target.database], maintenance(target));
}

function resolvePgDump(serverMajor: number) {
  const candidates = [
    process.env.PG_DUMP,
    `/usr/local/opt/postgresql@${serverMajor}/bin/pg_dump`,
    `/opt/homebrew/opt/postgresql@${serverMajor}/bin/pg_dump`,
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const root of [`/usr/local/Cellar/postgresql@${serverMajor}`, `/opt/homebrew/Cellar/postgresql@${serverMajor}`, "/usr/local/Cellar/postgresql", "/opt/homebrew/Cellar/postgresql"]) {
    if (!fs.existsSync(root)) continue;
    for (const version of fs.readdirSync(root).sort().reverse()) candidates.push(path.join(root, version, "bin/pg_dump"));
  }
  candidates.push("pg_dump");
  for (const candidate of candidates) {
    try {
      const version = execFileSync(candidate, ["--version"], { encoding: "utf8" });
      if (Number(version.match(/PostgreSQL[^0-9]*(\d+)/)?.[1]) === serverMajor) return candidate;
    } catch {
      // Continue until a major-version-matched client is found.
    }
  }
  throw new Error(`No pg_dump client matching PostgreSQL server major ${serverMajor} was found; set PG_DUMP explicitly`);
}

async function serverMajor(target: Target) {
  const result = await query<{ version: string }>(target, "SELECT current_setting('server_version_num') AS version");
  const major = Math.floor(Number(result.rows[0]?.version ?? 0) / 10000);
  if (!major) throw new Error("Could not determine PostgreSQL server major");
  return major;
}

function dumpSchema(target: Target, major: number) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "teklifpro-restore-drill-"));
  const dumpPath = path.join(directory, `${target.database}.sql`);
  run(resolvePgDump(major), [
    "--schema-only",
    "--no-owner",
    "--no-privileges",
    "--exclude-schema=graphile_worker",
    "--file",
    dumpPath,
    "--host",
    target.host,
    "--port",
    target.port,
    "--username",
    target.user,
    target.database,
  ], target);
  const schemaSha256 = crypto.createHash("sha256").update(fs.readFileSync(dumpPath)).digest("hex");
  return { directory, dumpPath, schemaSha256 };
}

function restoreSchema(dumpPath: string, target: Target) {
  run("psql", ["--host", target.host, "--port", target.port, "--username", target.user, "--dbname", target.database, "--set", "ON_ERROR_STOP=1", "--file", dumpPath], target);
}

async function snapshot(target: Target, schemaSha256: string): Promise<Snapshot> {
  const tables = await query<{ schema: string; table: string }>(target, `
    SELECT table_schema AS schema, table_name AS table
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'graphile_worker')
  `);
  let rowCount = 0;
  for (const table of tables.rows) {
    const identifier = `"${table.schema.replaceAll('"', '""')}"."${table.table.replaceAll('"', '""')}"`;
    const result = await query<{ count: string }>(target, `SELECT count(*)::text AS count FROM ${identifier}`);
    rowCount += Number(result.rows[0]?.count ?? 0);
  }
  const enums = await query<{ count: string }>(target, `
    SELECT count(*)::text AS count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e' AND n.nspname = 'public'
  `);
  return { schemaSha256, tableCount: tables.rows.length, enumCount: Number(enums.rows[0]?.count ?? 0), rowCount };
}

async function main() {
  const args = parseArgs();
  const source = parseTarget(process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL ?? "", "SOURCE_DATABASE_URL");
  const target = parseTarget(process.env.RESTORE_DRILL_DATABASE_URL ?? DEFAULT_TARGET_URL, "RESTORE_DRILL_DATABASE_URL");
  if (source.database === target.database) throw new Error("Restore source and target must be different");
  if (args.plan) {
    console.log(JSON.stringify({ source: source.database, target: target.database, mode: "schema-only", prepare: args.prepare }, null, 2));
    return;
  }
  if (args.prepare) await ensureTarget(target);
  else if (!(await exists(target))) throw new Error(`Restore target ${target.database} does not exist; run with --prepare first`);

  const major = await serverMajor(source);
  const sourceDump = dumpSchema(source, major);
  if (args.prepare) restoreSchema(sourceDump.dumpPath, target);
  const targetDump = dumpSchema(target, major);
  const sourceSnapshot = await snapshot(source, sourceDump.schemaSha256);
  const targetSnapshot = await snapshot(target, targetDump.schemaSha256);
  const report = {
    contract: "postgres-restore-drill.v1",
    mode: "schema-only",
    sourceDatabase: source.database,
    targetDatabase: target.database,
    targetGuard: TARGET_DATABASE,
    source: sourceSnapshot,
    target: targetSnapshot,
    schemaParity: sourceSnapshot.schemaSha256 === targetSnapshot.schemaSha256,
    status: sourceSnapshot.schemaSha256 === targetSnapshot.schemaSha256 && sourceSnapshot.tableCount === targetSnapshot.tableCount && sourceSnapshot.enumCount === targetSnapshot.enumCount && targetSnapshot.rowCount === 0 ? "pass" : "drift",
  } as const;
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.rmSync(sourceDump.directory, { recursive: true, force: true });
  fs.rmSync(targetDump.directory, { recursive: true, force: true });
  console.log(`PostgreSQL restore drill: ${report.status}; report=${path.relative(ROOT, REPORT_PATH)}`);
  if (report.status !== "pass") throw new Error("Schema-only restore drill failed parity or empty-target checks");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
