import assert from "node:assert/strict";
import test from "node:test";
import {
  isPermanentFailureCode,
  queueFailureLabel,
  settleIfcJobFailure,
  smartCheckFailureMessage,
} from "./failure-policy";

const NO_QUANTITY = "IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE";

test("a model without admissible quantities stops without a retry or an error report", () => {
  const captured: unknown[] = [];

  settleIfcJobFailure(new Error(NO_QUANTITY), error => captured.push(error));

  assert.deepEqual(captured, []);
});

test("errors carrying a permanent worker code stop without a retry", () => {
  const unsupported = Object.assign(new Error("Unsupported IFC schema"), { code: "IFC_SCHEMA_UNSUPPORTED" });
  const empty = Object.assign(new Error("No supported structural entities"), { code: "IFC_EMPTY_MODEL" });

  assert.doesNotThrow(() => settleIfcJobFailure(unsupported, () => undefined));
  assert.doesNotThrow(() => settleIfcJobFailure(empty, () => undefined));
});

test("other failures are reported and rethrown so the queue retries them", () => {
  const timeout = Object.assign(new Error("IFC extraction timed out"), { code: "IFC_TIMEOUT" });
  const captured: unknown[] = [];

  assert.throws(() => settleIfcJobFailure(timeout, error => captured.push(error)), /timed out/);

  assert.deepEqual(captured, [timeout]);
});

test("a model without admissible quantities gets guidance instead of the raw code", () => {
  const message = smartCheckFailureMessage(new Error(NO_QUANTITY));

  assert.doesNotMatch(message ?? "", /IFC_NO_ADMISSIBLE/);
  assert.match(message ?? "", /miktar/);
  assert.match(message ?? "", /Base Quantities/);
});

test("failure message leaves other errors to the existing handling", () => {
  assert.equal(smartCheckFailureMessage(new Error("TENANT_COMPANY_MISSING")), null);
  assert.equal(smartCheckFailureMessage("not an error"), null);
});

test("queue shows the stored reason only for permanent failures", () => {
  assert.equal(queueFailureLabel({ errorCode: NO_QUANTITY, errorMessage: "Neden" }), "Neden");
  assert.equal(queueFailureLabel({ errorCode: NO_QUANTITY, errorMessage: null }), "İşleme hatası");
  assert.equal(queueFailureLabel({ errorCode: "TENANT_COMPANY_MISSING", errorMessage: "TENANT_COMPANY_MISSING" }), "İşleme hatası");
  assert.equal(queueFailureLabel({ errorCode: null, errorMessage: null }), "İşleme hatası");
});

test("permanent code check covers only failures that repeat on the same file", () => {
  assert.equal(isPermanentFailureCode(NO_QUANTITY), true);
  assert.equal(isPermanentFailureCode("IFC_TIMEOUT"), false);
  assert.equal(isPermanentFailureCode("IFC_OOM"), false);
  assert.equal(isPermanentFailureCode(null), false);
});
