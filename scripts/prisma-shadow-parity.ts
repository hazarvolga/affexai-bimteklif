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
const REPOSITORY_ROOT = process.cwd();
const SHADOW_SCHEMA_PATH = path.join(REPOSITORY_ROOT, "prisma/shadow/schema.prisma");
const DEFAULT_TARGET_URL = "postgresql://hazarekiz@localhost:5432/teklifpro_next_local";
const DEFAULT_REPORT_PATH = path.join(
  REPOSITORY_ROOT,
  "docs/architecture/generated/prisma-shadow-parity.json",
);
const REQUIRED_TARGET_DATABASE = "teklifpro_next_local";

type DatabaseTarget = {
  url: string;
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
};

type ExpectedColumn = {
  name: string;
  type: string;
};

type ExpectedModel = {
  name: string;
  table: string;
  columns: ExpectedColumn[];
};

type ActualColumn = {
  name: string;
  type: string;
};

type ModelParity = {
  model: string;
  table: string;
  missingColumns: string[];
  extraColumns: string[];
  typeMismatches: Array<{ column: string; expected: string; actual: string }>;
  status: "pass" | "drift";
};

type ParityReport = {
  contract: "prisma-shadow-parity.v1";
  sourceDatabase: string;
  targetDatabase: string;
  targetGuard: "teklifpro_next_local";
  schemaDumpSha256?: string;
  targetSchemaDumpSha256?: string;
  schemaDumpParity?: boolean;
  models: ModelParity[];
  status: "pass" | "drift";
};

function parseArgs(argv: string[]) {
  const flags = new Set(argv.slice(2));
  const reportArg = argv.find((arg) => arg.startsWith("--report="));
  return {
    prepare: flags.has("--prepare"),
    plan: flags.has("--plan"),
    reportPath: reportArg ? path.resolve(reportArg.slice("--report=".length)) : DEFAULT_REPORT_PATH,
  };
}

function parseDatabaseTarget(rawUrl: string, label: string): DatabaseTarget {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${label} must use a PostgreSQL URL`);
  }
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

function pgEnv(target: DatabaseTarget): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...(target.password ? { PGPASSWORD: target.password } : {}),
  };
}

function command(commandName: string, args: string[], target: DatabaseTarget): string {
  return execFileSync(commandName, args, {
    cwd: REPOSITORY_ROOT,
    env: pgEnv(target),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(target: DatabaseTarget, text: string, values: unknown[] = []) {
  const client = new Client({ connectionString: target.url });
  await client.connect();
  try {
    return await client.query<T>(text, values);
  } finally {
    await client.end();
  }
}

function parseEnums(source: string): Map<string, string> {
  const enums = new Map<string, string>();
  for (const match of source.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const body = match[2];
    const mapped = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? match[1];
    enums.set(match[1], mapped);
  }
  return enums;
}

function scalarType(type: string, rest: string, enums: Map<string, string>): string | null {
  const dbType = rest.match(/@db\.([A-Za-z0-9_]+)/)?.[1];
  if (dbType === "Uuid") return "uuid";
  if (dbType === "Text") return "text";
  if (dbType === "Timestamptz") return "timestamp with time zone";
  if (dbType === "Timestamp") return "timestamp without time zone";
  if (dbType === "Decimal") return "numeric";
  if (dbType === "Json") return "jsonb";
  if (type === "String") return "text";
  if (type === "Int") return "integer";
  if (type === "BigInt") return "bigint";
  if (type === "Boolean") return "boolean";
  if (type === "DateTime") return "timestamp without time zone";
  if (type === "Decimal") return "numeric";
  if (type === "Json") return "jsonb";
  if (enums.has(type)) return enums.get(type) ?? type;
  return null;
}

function parseExpectedModels(source: string): ExpectedModel[] {
  const enums = parseEnums(source);
  const models: ExpectedModel[] = [];
  for (const match of source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const body = match[2];
    const table = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? match[1];
    const columns: ExpectedColumn[] = [];
    for (const line of body.split("\n")) {
      const field = line.match(/^\s{2,}(\w+)\s+([A-Za-z][A-Za-z0-9_]*)(\[\])?(\?)?\s*(.*)$/);
      if (!field || field[3] || field[5].includes("@relation")) continue;
      const [, name, type, , , rest] = field;
      const mapped = rest.match(/@map\("([^"]+)"\)/)?.[1] ?? name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      const actualType = scalarType(type, rest, enums);
      if (actualType) columns.push({ name: mapped, type: actualType });
    }
    models.push({ name: match[1], table, columns });
  }
  return models;
}

async function databaseExists(target: DatabaseTarget): Promise<boolean> {
  const maintenance = { ...target, database: "postgres", url: new URL(target.url).toString().replace(`/${target.database}`, "/postgres") };
  const result = await query<{ exists: boolean }>(maintenance, "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists", [target.database]);
  return result.rows[0]?.exists === true;
}

async function databaseHasUserTables(target: DatabaseTarget): Promise<boolean> {
  const result = await query<{ count: string }>(target, `
    SELECT count(*)::text AS count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  `);
  return Number(result.rows[0]?.count ?? 0) > 0;
}

async function ensureTargetDatabase(target: DatabaseTarget) {
  if (target.database !== REQUIRED_TARGET_DATABASE) {
    throw new Error(`Refusing target database ${target.database}; expected ${REQUIRED_TARGET_DATABASE}`);
  }
  if (await databaseExists(target)) {
    if (await databaseHasUserTables(target)) {
      throw new Error(`Target ${target.database} already contains user objects; refusing reset or overwrite`);
    }
    return;
  }
  const maintenance = { ...target, database: "postgres", url: new URL(target.url).toString().replace(`/${target.database}`, "/postgres") };
  command("createdb", ["--host", target.host, "--port", target.port, "--username", target.user, target.database], maintenance);
}

function resolvePgDump(serverMajor: number): string {
  const candidates = [
    process.env.PG_DUMP,
    "/usr/local/opt/postgresql@" + serverMajor + "/bin/pg_dump",
    "/opt/homebrew/opt/postgresql@" + serverMajor + "/bin/pg_dump",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const cellarRoot of [
    `/usr/local/Cellar/postgresql@${serverMajor}`,
    `/opt/homebrew/Cellar/postgresql@${serverMajor}`,
    `/usr/local/Cellar/postgresql`,
    `/opt/homebrew/Cellar/postgresql`,
  ]) {
    if (!fs.existsSync(cellarRoot)) continue;
    for (const version of fs.readdirSync(cellarRoot).sort().reverse()) {
      candidates.push(path.join(cellarRoot, version, "bin/pg_dump"));
    }
  }
  candidates.push("pg_dump");
  for (const candidate of candidates) {
    try {
      const version = execFileSync(candidate, ["--version"], { encoding: "utf8" });
      if (Number(version.match(/PostgreSQL[^0-9]*(\d+)/)?.[1]) === serverMajor) return candidate;
    } catch {
      // Try the next installed client; the source server major is authoritative.
    }
  }
  throw new Error(`No pg_dump client matching PostgreSQL server major ${serverMajor} was found; set PG_DUMP explicitly`);
}

function dumpDatabaseSchema(source: DatabaseTarget, serverMajor: number): { path: string; sha256: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "teklifpro-shadow-"));
  const dumpPath = path.join(tempDir, "source-schema.sql");
  command(resolvePgDump(serverMajor), [
    "--schema-only",
    "--no-owner",
    "--no-privileges",
    "--exclude-schema=graphile_worker",
    "--file",
    dumpPath,
    "--host",
    source.host,
    "--port",
    source.port,
    "--username",
    source.user,
    source.database,
  ], source);
  const bytes = fs.readFileSync(dumpPath);
  return { path: dumpPath, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}

function restoreSchema(dumpPath: string, target: DatabaseTarget) {
  command("psql", [
    "--host",
    target.host,
    "--port",
    target.port,
    "--username",
    target.user,
    "--dbname",
    target.database,
    "--set",
    "ON_ERROR_STOP=1",
    "--file",
    dumpPath,
  ], target);
}

async function readActualColumns(target: DatabaseTarget): Promise<Map<string, ActualColumn[]>> {
  const result = await query<{ table_name: string; column_name: string; data_type: string; udt_name: string }>(target, `
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const byTable = new Map<string, ActualColumn[]>();
  for (const row of result.rows) {
    const type = row.data_type === "USER-DEFINED" ? row.udt_name : row.data_type;
    const list = byTable.get(row.table_name) ?? [];
    list.push({ name: row.column_name, type });
    byTable.set(row.table_name, list);
  }
  return byTable;
}

function buildReport(
  expectedModels: ExpectedModel[],
  actual: Map<string, ActualColumn[]>,
  source: DatabaseTarget,
  target: DatabaseTarget,
  schemaDumpSha256?: string,
  targetSchemaDumpSha256?: string,
): ParityReport {
  const models = expectedModels.map((model): ModelParity => {
    const expected = new Map(model.columns.map((column) => [column.name, column.type]));
    const actualColumns = actual.get(model.table) ?? [];
    const actualMap = new Map(actualColumns.map((column) => [column.name, column.type]));
    const missingColumns = [...expected.keys()].filter((name) => !actualMap.has(name)).sort();
    const extraColumns = [...actualMap.keys()].filter((name) => !expected.has(name)).sort();
    const typeMismatches = [...expected.entries()]
      .filter(([name, type]) => actualMap.has(name) && actualMap.get(name) !== type)
      .map(([column, expectedType]) => ({ column, expected: expectedType, actual: actualMap.get(column) as string }))
      .sort((a, b) => a.column.localeCompare(b.column));
    return {
      model: model.name,
      table: model.table,
      missingColumns,
      extraColumns,
      typeMismatches,
      status: missingColumns.length || extraColumns.length || typeMismatches.length ? "drift" : "pass",
    };
  });
  return {
    contract: "prisma-shadow-parity.v1",
    sourceDatabase: source.database,
    targetDatabase: target.database,
    targetGuard: REQUIRED_TARGET_DATABASE,
    ...(schemaDumpSha256 ? { schemaDumpSha256 } : {}),
    ...(targetSchemaDumpSha256 ? { targetSchemaDumpSha256 } : {}),
    ...(schemaDumpSha256 && targetSchemaDumpSha256 ? { schemaDumpParity: schemaDumpSha256 === targetSchemaDumpSha256 } : {}),
    models,
    status: models.every((model) => model.status === "pass") && (!schemaDumpSha256 || !targetSchemaDumpSha256 || schemaDumpSha256 === targetSchemaDumpSha256) ? "pass" : "drift",
  };
}

function writeReport(reportPath: string, report: ParityReport) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const source = parseDatabaseTarget(process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL ?? "", "SOURCE_DATABASE_URL");
  const target = parseDatabaseTarget(process.env.SHADOW_DATABASE_URL ?? DEFAULT_TARGET_URL, "SHADOW_DATABASE_URL");
  if (source.database === target.database) throw new Error("Source and target databases must be different");
  const expected = parseExpectedModels(fs.readFileSync(SHADOW_SCHEMA_PATH, "utf8"));
  if (!expected.length) throw new Error("No Prisma models found in shadow schema");

  if (args.plan) {
    console.log(JSON.stringify({ source: source.database, target: target.database, models: expected.map((model) => model.table), prepare: args.prepare }, null, 2));
    return;
  }

  const serverVersionResult = await query<{ version: string }>(source, "SELECT current_setting('server_version_num') AS version");
  const serverMajor = Math.floor(Number(serverVersionResult.rows[0]?.version ?? 0) / 10000);
  if (!serverMajor) throw new Error("Could not determine source PostgreSQL server major");
  let schemaDumpSha256: string | undefined;
  let sourceDump: { path: string; sha256: string } | undefined;
  if (args.prepare) {
    await ensureTargetDatabase(target);
    sourceDump = dumpDatabaseSchema(source, serverMajor);
    schemaDumpSha256 = sourceDump.sha256;
    restoreSchema(sourceDump.path, target);
    console.log(`Isolated schema restored: ${source.database} -> ${target.database}`);
    console.log(`Schema dump SHA-256: ${schemaDumpSha256}`);
  } else if (!(await databaseExists(target))) {
    throw new Error(`Target ${target.database} does not exist; run with --prepare first`);
  } else {
    sourceDump = dumpDatabaseSchema(source, serverMajor);
    schemaDumpSha256 = sourceDump.sha256;
  }

  const targetDump = dumpDatabaseSchema(target, serverMajor);
  const report = buildReport(expected, await readActualColumns(target), source, target, schemaDumpSha256, targetDump.sha256);
  writeReport(args.reportPath, report);
  if (sourceDump) fs.rmSync(path.dirname(sourceDump.path), { recursive: true, force: true });
  fs.rmSync(path.dirname(targetDump.path), { recursive: true, force: true });
  console.log(`Prisma shadow parity: ${report.status}; report=${path.relative(REPOSITORY_ROOT, args.reportPath)}`);
  if (report.status !== "pass") {
    const drifted = report.models.filter((model) => model.status === "drift").map((model) => model.model).join(", ");
    throw new Error(`Prisma shadow schema drift detected in: ${drifted}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
