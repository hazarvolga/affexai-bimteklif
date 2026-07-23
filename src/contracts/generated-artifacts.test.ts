import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SMARTCHECK_CONTRACT_VERSION } from "./smartcheck";

function readArtifact(name: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/architecture/generated", name), "utf8")) as Record<string, any>;
}

test("generated JSON Schema and OpenAPI artifacts match the contract version", () => {
  const jsonSchema = readArtifact("smartcheck.v1.json");
  const openApi = readArtifact("teklifpro.openapi.json");
  assert.equal(jsonSchema.$id, "https://teklifpro.local/contracts/smartcheck.v1.json");
  assert.equal(openApi.openapi, "3.1.0");
  assert.equal(openApi.info.version, SMARTCHECK_CONTRACT_VERSION);
  assert.equal(Object.keys(jsonSchema.properties).length, 5);
  assert.equal(Object.keys(openApi.paths).length, 17);
  assert.ok(openApi.paths["/api/smartcheck/documents/{id}/transfer-to-quotation"].post);
  assert.equal(openApi.paths["/api/smartcheck/documents/{id}/transfer-to-quotation"].post["x-write-owner"], "express-pilot");
});
