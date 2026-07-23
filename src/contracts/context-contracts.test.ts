import assert from "node:assert/strict";
import test from "node:test";
import { contextContracts, validateContextContracts } from "./context-contracts";

test("context contract inventory is versioned and has one pilot write owner", () => {
  assert.deepEqual(validateContextContracts(), []);
  assert.equal(contextContracts.find((contract) => contract.context === "smartcheck")?.writeOwner, "express-pilot");
  assert.equal(contextContracts.find((contract) => contract.context === "smartcheck")?.cutoverStatus, "foundation");
});

test("context contract validator rejects duplicate routes and unsafe target writes", () => {
  const duplicate = [{
    context: "example",
    version: "example.v1",
    writeOwner: "express-pilot" as const,
    cutoverStatus: "foundation" as const,
    routes: [
      { method: "GET" as const, path: "/api/example", operation: "one", kind: "read" as const },
      { method: "GET" as const, path: "/api/example", operation: "two", kind: "read" as const },
    ],
  }];
  assert.deepEqual(validateContextContracts(duplicate), ["duplicate_route:example:GET /api/example"]);

  const unsafe = [{
    context: "example",
    version: "example.v1",
    writeOwner: "nestjs-target" as const,
    cutoverStatus: "foundation" as const,
    routes: [{ method: "POST" as const, path: "/api/example", operation: "write", kind: "write" as const }],
  }];
  assert.deepEqual(validateContextContracts(unsafe), ["unsafe_write_owner:example"]);
});
