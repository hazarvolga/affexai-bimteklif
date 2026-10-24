import assert from "node:assert/strict";
import test from "node:test";

import { validateControlDatabaseUrls } from "./control-plane";

test("control-plane URL requires a distinct control role on the same PostgreSQL target", () => {
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
});
