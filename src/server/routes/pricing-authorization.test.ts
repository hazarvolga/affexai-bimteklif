import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthorizationInput } from "./pricing";

test("vendor catalog import cannot self-authorize commercial quotation permission", () => {
  const supplier = resolveAuthorizationInput({ sourceType: "supplier_quote", sourceDocumentHash: "a".repeat(64), actorUserId: "actor", allowTenantAuthorization: true });
  assert.equal(supplier.authorizationStatus, "pending");
  assert.equal(supplier.authorizationScope, null);
  assert.equal(supplier.authorizationEvidenceHash, null);

  const tenantActual = resolveAuthorizationInput({ sourceType: "company_actual", sourceDocumentHash: "b".repeat(64), actorUserId: "actor", allowTenantAuthorization: true });
  assert.equal(tenantActual.authorizationStatus, "authorized");
});
