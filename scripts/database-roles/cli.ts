import pg from "pg";
import { assertRoleBoundaries, inspectRoleBoundaries, sanitizeRoleReport } from "./inspect";
import { provisionDatabaseRoles, type DatabaseRoleCredentials } from "./provision";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "inspect" && mode !== "provision") throw new Error("Usage: cli.ts inspect|provision");
  const connectionString = required(mode === "inspect" ? "DATABASE_ROLE_INSPECT_URL" : "DATABASE_ROLE_ADMIN_URL");
  if (mode === "provision" && process.env.DATABASE_ROLE_ALLOW_PROVISION !== "true") {
    throw new Error("DATABASE_ROLE_ALLOW_PROVISION=true is required");
  }
  const client = new pg.Client({ connectionString, application_name: `bimmetraj-role-${mode}` });
  try {
    await client.connect();
    if (mode === "provision") {
      const credentials: DatabaseRoleCredentials = {
        bimmetraj_migrator: required("BIMMETRAJ_MIGRATOR_DB_PASSWORD"),
        bimmetraj_app: required("BIMMETRAJ_APP_DB_PASSWORD"),
        bimmetraj_worker: required("BIMMETRAJ_WORKER_DB_PASSWORD"),
        bimmetraj_backup: required("BIMMETRAJ_BACKUP_DB_PASSWORD"),
      };
      await provisionDatabaseRoles(client, credentials, {
        expectedDatabase: required("DATABASE_ROLE_EXPECTED_DATABASE"),
        expectedSystemIdentifier: required("DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER"),
        requiredMarkerRegclass: required("DATABASE_ROLE_REQUIRED_MARKER"),
      }, decodeURIComponent(new URL(connectionString).password));
    }
    const report = await inspectRoleBoundaries(client);
    assertRoleBoundaries(report);
    process.stdout.write(`${JSON.stringify(sanitizeRoleReport(report), null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Database role operation failed"}\n`);
  process.exitCode = 1;
});
