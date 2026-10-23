import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const credentials = Object.freeze({
  BIMMETRAJ_APP_DB_PASSWORD: "app-role-password-0123456789abcdef",
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

type RenderedService = { environment?: Record<string, string> };

function renderCompose(source: string): Record<string, RenderedService> {
  const directory = mkdtempSync(path.join(tmpdir(), "bimmetraj-db-runtime-compose-"));
  try {
    const compose = path.join(directory, "compose.yaml");
    copyFileSync(path.resolve(source), compose);
    for (const file of [".env.app", ".env.worker", ".env.migrator", ".env.backup", ".env.postgres"]) {
      writeFileSync(path.join(directory, file), "RUNTIME_FIXTURE=not-a-secret\n", { mode: 0o600 });
    }
    mkdirSync(path.join(directory, "deploy", "backup"), { recursive: true });
    const output = execFileSync("docker", ["compose", "-f", compose, "config", "--format", "json"], {
      encoding: "utf8",
      timeout: 15_000,
      env: { ...process.env, ...credentials, BIMMETRAJ_EMPTY_ENV: "" },
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
      writeFileSync(path.join(directory, file), "RUNTIME_FIXTURE=not-a-secret\n", { mode: 0o600 });
    }
    mkdirSync(path.join(directory, "deploy", "backup"), { recursive: true });
    const environment = { ...process.env, ...credentials };
    delete environment[missing];
    return spawnSync("docker", ["compose", "-f", compose, "config", "--quiet"], {
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
    assert.doesNotMatch(source, /postgresql:\/\/bimmetraj:/, "bootstrap identity must not be a runtime URL");
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
        assert.ok(environment[key] === undefined || environment[key] === "", `${serviceName} cannot expose raw ${key}`);
      }
    }
  });

  test(`${compose} fails closed when any database credential or release acknowledgement is absent`, () => {
    for (const key of Object.keys(credentials) as (keyof typeof credentials)[]) {
      const result = renderWithout(compose, key);
      assert.notEqual(result.status, 0, `${compose} unexpectedly accepted missing ${key}`);
      assert.match(result.stderr, new RegExp(key));
    }
  });
}
