import pg from "pg";
import { assertRoleBoundaries, inspectRoleBoundaries, sanitizeRoleReport } from "./inspect";
import { bootstrapFreshDatabaseRoles, bootstrapLegacyDatabaseRoles, provisionDatabaseRoles, type DatabaseRoleCredentials } from "./provision";
import { installQueueSchemaAsOwner } from "./queue-schema";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const mode = process.argv[2];
  // bootstrap-fresh and deploy-provision run as one-shot Compose services in the deploy graph
  // (db-bootstrap -> migrate -> db-provision); the others are operator-only.
  const modes = ["inspect", "provision", "bootstrap-legacy", "bootstrap-fresh", "deploy-provision"];
  if (!modes.includes(mode)) throw new Error(`Usage: cli.ts ${modes.join("|")}`);
  const connectionString = required(mode === "inspect" ? "DATABASE_ROLE_INSPECT_URL" : "DATABASE_ROLE_ADMIN_URL");
  if (mode !== "inspect" && process.env.DATABASE_ROLE_ALLOW_PROVISION !== "true") {
    throw new Error("DATABASE_ROLE_ALLOW_PROVISION=true is required");
  }
  const client = new pg.Client({ connectionString, application_name: `bimmetraj-role-${mode}` });
  try {
    await client.connect();
    if (mode !== "inspect") {
      const credentials: DatabaseRoleCredentials = {
        bimmetraj_migrator: required("BIMMETRAJ_MIGRATOR_DB_PASSWORD"),
        bimmetraj_app: required("BIMMETRAJ_APP_DB_PASSWORD"),
        bimmetraj_control: required("BIMMETRAJ_CONTROL_DB_PASSWORD"),
        bimmetraj_worker: required("BIMMETRAJ_WORKER_DB_PASSWORD"),
        bimmetraj_backup: required("BIMMETRAJ_BACKUP_DB_PASSWORD"),
      };
      const target = {
        expectedDatabase: required("DATABASE_ROLE_EXPECTED_DATABASE"),
        expectedSystemIdentifier: required("DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER"),
        requiredMarkerRegclass: required("DATABASE_ROLE_REQUIRED_MARKER"),
      };
      const administratorCredential = decodeURIComponent(new URL(connectionString).password);
      if (mode === "bootstrap-fresh") {
        const result = await bootstrapFreshDatabaseRoles(client, credentials, target, administratorCredential);
        process.stdout.write(result === "bootstrapped"
          ? "Fresh database: canonical roles created; release migrations may run as bimmetraj_migrator.\n"
          : "Database already carries the release ledger; fresh bootstrap skipped.\n");
        return;
      }
      if (mode === "deploy-provision") await installQueueSchemaAsOwner(connectionString);
      if (mode === "bootstrap-legacy") {
        await bootstrapLegacyDatabaseRoles(client, credentials, target, administratorCredential);
        process.stdout.write("Legacy idx8 role bootstrap committed; apply release migrations and then run full provision/inspect.\n");
        return;
      }
      await provisionDatabaseRoles(client, credentials, target, administratorCredential);
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
