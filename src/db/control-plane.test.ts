import assert from "node:assert/strict";
import test from "node:test";

import { closeControlDatabase, validateControlDatabaseUrls } from "./control-plane";

test("control-plane URL requires a distinct control role on the same PostgreSQL target", async () => {
  await closeControlDatabase();
  const app = "postgresql://bimmetraj_app:app@postgres:5432/bimmetraj_production";
  assert.doesNotThrow(() => validateControlDatabaseUrls(
    app,
    "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production",
  ));
  assert.throws(() => validateControlDatabaseUrls(app, app), /bimmetraj_control/);
  assert.throws(
    () => validateControlDatabaseUrls(app, "postgresql://bimmetraj_control:control@other:5432/bimmetraj_production"),
    /same PostgreSQL target/,
  );
  assert.throws(
    () => validateControlDatabaseUrls(app, "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production?user=bimmetraj_app"),
    /forbidden connection override/,
  );
  assert.throws(
    () => validateControlDatabaseUrls("postgresql://bimmetraj_control:app@postgres:5432/bimmetraj_production", "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production"),
    /DATABASE_URL must authenticate as bimmetraj_app/,
  );
  assert.throws(
    () => validateControlDatabaseUrls("https://bimmetraj_app:app@postgres:5432/bimmetraj_production", "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production"),
    /PostgreSQL URL/,
  );
  assert.throws(
    () => validateControlDatabaseUrls(`${app}?sslmode=require`, "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production?sslmode=disable"),
    /cannot weaken DATABASE_URL transport security/,
  );
  assert.throws(
    () => validateControlDatabaseUrls(`${app}?user=bimmetraj_control`, "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production"),
    /DATABASE_URL contains a forbidden connection override/,
  );
  assert.throws(
    () => validateControlDatabaseUrls(`${app}?host=evil`, "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production"),
    /DATABASE_URL contains a forbidden connection override/,
  );
  assert.throws(
    () => validateControlDatabaseUrls(`${app}?sslmode=require&sslmode=disable`, "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production?sslmode=require"),
    /duplicate connection option/,
  );
  assert.throws(
    () => validateControlDatabaseUrls(`${app}?sslmode=invalid`, "postgresql://bimmetraj_control:control@postgres:5432/bimmetraj_production?sslmode=require"),
    /unsupported sslmode/,
  );
  assert.doesNotThrow(() => validateControlDatabaseUrls(
    "postgresql://bimmetraj_app:app@postgres/bimmetraj_production",
    "postgresql://bimmetraj_control:control@postgres/bimmetraj_production",
  ));
});
