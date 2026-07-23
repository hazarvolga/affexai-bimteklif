import assert from "node:assert/strict";
import test from "node:test";
import {
  SMARTCHECK_CONTRACT_VERSION,
  smartcheckCompleteRequestSchema,
  smartcheckMappingRequestSchema,
  smartcheckRowReviewRequestSchema,
  smartcheckTransferRequestSchema,
  smartcheckUploadRequestSchema,
} from "./smartcheck";

test("SmartCheck transport contracts are versioned and bounded", () => {
  assert.equal(SMARTCHECK_CONTRACT_VERSION, "smartcheck.v1");
  assert.equal(smartcheckUploadRequestSchema.safeParse({ fileName: "mep.xlsx", mimeType: "APPLICATION/XLSX", fileSizeBytes: "1024" }).success, true);
  assert.equal(smartcheckCompleteRequestSchema.safeParse({ checksumSha256: "A".repeat(64) }).success, true);
  assert.equal(smartcheckMappingRequestSchema.safeParse({ description: "Açıklama", quantity: "Miktar", headerRow: "2" }).success, true);
  assert.equal(smartcheckRowReviewRequestSchema.safeParse({ status: "accepted_exception", notes: "Reviewer gerekçesi", correction: { quantity: 2 } }).success, true);
  assert.equal(smartcheckTransferRequestSchema.safeParse({ quotationId: "quote-1", rowIds: ["row-1"], overrides: { "row-1": { unitPrice: "100" } } }).success, true);
});

test("SmartCheck transport contracts reject malformed or oversized boundary values", () => {
  assert.equal(smartcheckUploadRequestSchema.safeParse({ fileName: "", mimeType: "text/csv", fileSizeBytes: 1 }).success, false);
  assert.equal(smartcheckUploadRequestSchema.safeParse({ fileName: "mep.csv", mimeType: "text/csv", fileSizeBytes: 0 }).success, false);
  assert.equal(smartcheckCompleteRequestSchema.safeParse({ checksumSha256: "not-a-checksum" }).success, false);
  assert.equal(smartcheckMappingRequestSchema.safeParse({ headerRow: 101 }).success, false);
  assert.equal(smartcheckRowReviewRequestSchema.safeParse({ status: "approved", correction: { unknown: "field" } }).success, false);
  assert.equal(smartcheckTransferRequestSchema.safeParse({ quotationId: "quote-1", rowIds: [] }).success, false);
});
