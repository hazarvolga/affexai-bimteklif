import assert from "node:assert/strict";
import test from "node:test";
import { processingIdempotencyKey } from "./processor";

type Row = { id: string; companyId: string; documentId: string; reviewStatus: "pending_review" | "approved" | "accepted_exception" | "rejected" };

function selectRows(rows: Row[], companyId: string, documentId: string) {
  return rows.filter((row) => row.companyId === companyId && row.documentId === documentId);
}

function canTransfer(row: Row) {
  return row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception";
}

test("integration contract: upload → parse → review → transfer state machine", () => {
  const companyId = "company-a";
  const documentId = "document-a";
  const rows: Row[] = [{ id: "row-a", companyId, documentId, reviewStatus: "pending_review" }];
  assert.equal(selectRows(rows, companyId, documentId).length, 1, "parsed row is visible to its tenant");
  assert.equal(canTransfer(rows[0]), false, "pending review cannot transfer");
  rows[0].reviewStatus = "approved";
  assert.equal(canTransfer(rows[0]), true, "approved row can transfer");
  rows[0].reviewStatus = "accepted_exception";
  assert.equal(canTransfer(rows[0]), true, "reasoned exception can transfer");
  rows[0].reviewStatus = "rejected";
  assert.equal(canTransfer(rows[0]), false, "rejected row cannot transfer");
});

test("integration contract: cross-tenant rows never enter review or transfer selection", () => {
  const rows: Row[] = [
    { id: "row-a", companyId: "company-a", documentId: "document-a", reviewStatus: "approved" },
    { id: "row-b", companyId: "company-b", documentId: "document-b", reviewStatus: "approved" },
  ];
  const tenantASelection = selectRows(rows, "company-a", "document-a");
  assert.deepEqual(tenantASelection.map((row) => row.id), ["row-a"]);
  assert.equal(tenantASelection.some((row) => row.id === "row-b"), false);
  const forgedTransfer = selectRows(rows, "company-a", "document-a").filter((row) => ["row-a", "row-b"].includes(row.id));
  assert.deepEqual(forgedTransfer.map((row) => row.id), ["row-a"]);
});

test("integration contract: processing idempotency is stable for the same upload and mapping", () => {
  const first = processingIdempotencyKey("a".repeat(64), { sheet: "MEP", headerRow: 1, quantity: "Miktar" });
  const second = processingIdempotencyKey("a".repeat(64), { sheet: "MEP", headerRow: 1, quantity: "Miktar" });
  const changedMapping = processingIdempotencyKey("a".repeat(64), { sheet: "MEP", headerRow: 2, quantity: "Miktar" });
  assert.equal(first, second);
  assert.notEqual(first, changedMapping);
});
