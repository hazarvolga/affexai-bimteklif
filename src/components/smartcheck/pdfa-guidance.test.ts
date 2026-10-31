import assert from "node:assert/strict";
import test from "node:test";
import { pdfaNextStep } from "./pdfa-guidance";

test("non-compliant PDF tells the user to re-export from the authoring software", () => {
  assert.match(pdfaNextStep("completed", false), /PDF\/A-2b olarak yeniden dışa aktarıp/);
});

test("compliant PDF asks for no re-export", () => {
  assert.doesNotMatch(pdfaNextStep("completed", true), /yeniden/);
});

test("an unknown result does not claim the file is non-compliant", () => {
  for (const message of [pdfaNextStep("completed", null), pdfaNextStep("unavailable", null)]) {
    assert.doesNotMatch(message, /yeniden dışa aktarıp/);
  }
});

test("every message says the product does not convert and keeps the original", () => {
  for (const message of [pdfaNextStep("completed", false), pdfaNextStep("completed", true), pdfaNextStep("unavailable", null)]) {
    assert.match(message, /PDF dönüştürmez/);
    assert.match(message, /asıl dosya değiştirilmedi/i);
  }
});
