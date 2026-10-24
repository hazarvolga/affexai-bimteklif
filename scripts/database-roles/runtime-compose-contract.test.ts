import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const credentials = Object.freeze({
  BIMMETRAJ_APP_DB_PASSWORD: "app-role-password-0123456789abcdef",
  BIMMETRAJ_CONTROL_DB_PASSWORD: "control-role-password-0123456789abc",
  BIMMETRAJ_WORKER_DB_PASSWORD: "worker-role-password-0123456789abc",
  BIMMETRAJ_MIGRATOR_DB_PASSWORD: "migrator-role-password-0123456789a",
  BIMMETRAJ_BACKUP_DB_PASSWORD: "backup-role-password-0123456789abcd",
  SERVICE_PASSWORD_64_POSTGRES: "bootstrap-password-0123456789abcdef",
  RELEASE_WORKERS_DRAINED: "true",
});
const expected = Object.freeze({
  app: ["DATABASE_URL", "bimmetraj_app"],
  worker: ["DATABASE_URL", "bimmetraj_worker"],
  "ifc-worker": ["DATABASE_URL", "bimmetraj_worker"],
  migrate: ["RELEASE_DATABASE_URL", "bimmetraj_migrator"],
} as const);

type RenderedService = { environment?: Record<string, string>; profiles?: string[]; command?: string[] };

function renderCompose(source: string): Record<string, RenderedService> {
  const directory = mkdtempSync(path.join(tmpdir(), "bimmetraj-db-runtime-compose-"));
  try {
    const compose = path.join(directory, "compose.yaml");
    copyFileSync(path.resolve(source), compose);
    for (const file of [".env.app", ".env.worker", ".env.migrator", ".env.backup", ".env.postgres"]) {
      writeFileSync(path.join(directory, file), "RUNTIME_FIXTURE=not-a-secret\nAPP_PROVIDER_SENTINEL=must-not-leak\n", { mode: 0o600 });
    }
    mkdirSync(path.join(directory, "deploy", "backup"), { recursive: true });
    const output = execFileSync("docker", ["compose", "--profile", "operator", "-f", compose, "config", "--format", "json"], {
      encoding: "utf8",
      timeout: 15_000,
      env: { ...process.env, ...credentials, DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER: "1234567890123456789", BIMMETRAJ_EMPTY_ENV: "" },
    });
    return JSON.parse(output).services;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function renderWithout(source: string, missing: keyof typeof credentials) {
  const directory = mkdtempSync(path.join(tmpdir(), "bimmetraj-db-runtime-missing-"));
  try {
    const compose = path.join(directory, "compose.yaml");
    copyFileSync(path.resolve(source), compose);
    for (const file of [".env.app", ".env.worker", ".env.migrator", ".env.backup", ".env.postgres"]) {
      writeFileSync(path.join(directory, file), "RUNTIME_FIXTURE=not-a-secret\nAPP_PROVIDER_SENTINEL=must-not-leak\n", { mode: 0o600 });
    }
    mkdirSync(path.join(directory, "deploy", "backup"), { recursive: true });
    const environment = { ...process.env, ...credentials };
    delete environment[missing];
    return spawnSync("docker", ["compose", "--profile", "operator", "-f", compose, "config", "--format", "json"], {
      encoding: "utf8",
      timeout: 15_000,
      env: environment,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const compose of ["compose.coolify.yaml", "compose.example.yaml"]) {
  test(`${compose} assigns a distinct least-privilege database identity to every runtime`, () => {
    const source = readFileSync(path.resolve(compose), "utf8");
    assert.doesNotMatch(source, /postgresql:\/\/bimmetraj_owner:/, "NOLOGIN owner must never be a connection identity");

    const services = renderCompose(compose);
    for (const [serviceName, [key, user]] of Object.entries(expected)) {
      const value = services[serviceName]?.environment?.[key];
      assert.ok(value, `${serviceName}.${key} is required`);
      const url = new URL(value);
      assert.equal(url.username, user, `${serviceName}.${key} role`);
      assert.equal(url.hostname, "postgres", `${serviceName}.${key} host`);
      assert.equal(url.port, "5432", `${serviceName}.${key} port`);
      assert.equal(url.pathname, "/bimmetraj_production", `${serviceName}.${key} database`);
    }
    const controlUrl = services.app?.environment?.CONTROL_DATABASE_URL;
    assert.ok(controlUrl, "app.CONTROL_DATABASE_URL is required");
    assert.equal(new URL(controlUrl).username, "bimmetraj_control");
    for (const service of ["worker", "ifc-worker", "migrate", "backup", "postgres"]) {
      assert.equal(services[service]?.environment?.CONTROL_DATABASE_URL, undefined, `${service} cannot receive the control-plane database identity`);
    }

    const roleAdmin = services["role-admin"];
    assert.ok(roleAdmin, "one-shot operator role administration service is required");
    assert.ok(roleAdmin.profiles?.includes("operator"), "role administration must be opt-in");
    assert.deepEqual(roleAdmin.command, ["node", "dist/database-roles-cli.mjs", "inspect"]);
    const roleEnvironment = roleAdmin.environment ?? {};
    assert.equal(roleEnvironment.RUNTIME_FIXTURE, undefined, "operator service must not inherit env files");
    assert.equal(roleEnvironment.APP_PROVIDER_SENTINEL, undefined, "operator service must not inherit app secrets");
    assert.equal(roleEnvironment.POSTGRES_PASSWORD, undefined, "operator service must not inherit postgres env file secrets");
    assert.match(source, /profiles:\s*\[operator\]/, "role-admin must be outside normal startup");
    const adminUrl = roleEnvironment.DATABASE_ROLE_ADMIN_URL;
    assert.ok(adminUrl, "role-admin must receive the isolated bootstrap database URL");
    assert.equal(new URL(adminUrl).username, "bimmetraj");
    assert.equal(new URL(adminUrl).hostname, "postgres");
    assert.equal(new URL(adminUrl).pathname, "/bimmetraj_production");
    assert.equal(roleEnvironment.DATABASE_ROLE_INSPECT_URL, adminUrl);
    assert.equal(roleEnvironment.DATABASE_ROLE_ALLOW_PROVISION, "true");
    assert.equal(roleEnvironment.DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER, "1234567890123456789");
    assert.equal(roleEnvironment.DATABASE_ROLE_EXPECTED_DATABASE, "bimmetraj_production");
    assert.equal(roleEnvironment.DATABASE_ROLE_REQUIRED_MARKER, "teklifpro_release.migrations");
    for (const key of ["BIMMETRAJ_APP_DB_PASSWORD", "BIMMETRAJ_CONTROL_DB_PASSWORD", "BIMMETRAJ_WORKER_DB_PASSWORD", "BIMMETRAJ_MIGRATOR_DB_PASSWORD", "BIMMETRAJ_BACKUP_DB_PASSWORD"]) {
      assert.equal(roleEnvironment[key], credentials[key as keyof typeof credentials]);
    }
    const dockerfile = readFileSync(path.resolve("Dockerfile"), "utf8");
    assert.match(dockerfile, /scripts\/database-roles\/cli\.ts/);
    assert.match(dockerfile, /outfile=dist\/database-roles-cli\.mjs/);

    const backup = services.backup?.environment ?? {};
    assert.equal(backup.PGUSER, "bimmetraj_backup");
    assert.equal(backup.PGPASSWORD, credentials.BIMMETRAJ_BACKUP_DB_PASSWORD);
    assert.equal(backup.PGHOST, "postgres");
    assert.equal(backup.PGDATABASE, "bimmetraj_production");
    assert.equal(services.migrate?.environment?.RELEASE_WORKERS_DRAINED, "true");
    for (const service of ["app", "worker", "ifc-worker", "backup", "postgres"]) {
      assert.ok(!services[service]?.environment?.RELEASE_WORKERS_DRAINED, `${service} cannot retain release drain acknowledgement`);
    }

    for (const [serviceName, service] of Object.entries(services)) {
      if (serviceName === "postgres") continue;
      const environment = service.environment ?? {};
      assert.equal(environment.POSTGRES_PASSWORD, undefined, `${serviceName} cannot receive bootstrap password`);
      for (const key of Object.keys(credentials).filter((key) => key.endsWith("_DB_PASSWORD") || key === "SERVICE_PASSWORD_64_POSTGRES")) {
        if (serviceName === "role-admin") continue;
        assert.ok(environment[key] === undefined || environment[key] === "", `${serviceName} cannot expose raw ${key}`);
      }
    }
  });

  test(`${compose} handles absent build-time credentials without weakening release gating`, () => {
    for (const key of Object.keys(credentials) as (keyof typeof credentials)[]) {
      const result = renderWithout(compose, key);
      if (key === "RELEASE_WORKERS_DRAINED") {
        assert.notEqual(result.status, 0, `${compose} unexpectedly accepted missing release acknowledgement`);
        assert.match(result.stderr, new RegExp(key));
        continue;
      }

      if (compose === "compose.example.yaml") {
        assert.notEqual(result.status, 0, `${compose} unexpectedly accepted missing ${key}`);
        assert.match(result.stderr, new RegExp(key));
        continue;
      }

      assert.equal(result.status, 0, `${compose} must render during image build when runtime-only ${key} is absent: ${result.stderr}`);
      const services = JSON.parse(result.stdout).services as Record<string, RenderedService>;
      if (key === "BIMMETRAJ_APP_DB_PASSWORD") assert.equal(new URL(services.app?.environment?.DATABASE_URL ?? "").password, "");
      if (key === "BIMMETRAJ_CONTROL_DB_PASSWORD") assert.equal(new URL(services.app?.environment?.CONTROL_DATABASE_URL ?? "").password, "");
      if (key === "BIMMETRAJ_WORKER_DB_PASSWORD") assert.equal(new URL(services.worker?.environment?.DATABASE_URL ?? "").password, "");
      if (key === "BIMMETRAJ_MIGRATOR_DB_PASSWORD") assert.equal(new URL(services.migrate?.environment?.RELEASE_DATABASE_URL ?? "").password, "");
      if (key === "BIMMETRAJ_BACKUP_DB_PASSWORD") assert.equal(services.backup?.environment?.PGPASSWORD, "");
      if (key === "SERVICE_PASSWORD_64_POSTGRES") {
        assert.equal(new URL(services["role-admin"]?.environment?.DATABASE_ROLE_ADMIN_URL ?? "").password, "");
        assert.equal(services.postgres?.environment?.POSTGRES_PASSWORD, "");
      }
    }
  });
}
