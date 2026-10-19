import test from "node:test";
import assert from "node:assert/strict";
import { elementQuantity, summarizeUncoveredQuantities } from "./uncovered-quantity";

test("elementQuantity yalnız modelin verdiği pozitif miktarı döner: önce hacim, sonra alan, sonra uzunluk", () => {
  assert.deepEqual(elementQuantity({ volumeM3: 2.5, areaM2: 9 }), { value: 2.5, unit: "m³" });
  assert.deepEqual(elementQuantity({ volumeM3: 0, areaM2: 9 }), { value: 9, unit: "m²" });
  assert.deepEqual(elementQuantity({ volumeM3: 0, lengthM: 4 }), { value: 4, unit: "mtül" });
  assert.equal(elementQuantity({ volumeM3: 0 }), undefined);
});

test("özet yalnız metraja giren açıkta kalanları birim bazında toplar; kapsam dışı kayıtlar çift sayım riski nedeniyle katılmaz", () => {
  const summary = summarizeUncoveredQuantities([
    { globalId: "a", ifcClass: "IfcWall", name: "", storey: "", reason: "", scope: "in_takeoff", quantity: { value: 5, unit: "m³" } },
    { globalId: "b", ifcClass: "IfcBeam", name: "", storey: "", reason: "", quantity: { value: 2.25, unit: "m³" } },
    { globalId: "c", ifcClass: "IfcCovering", name: "", storey: "", reason: "", scope: "in_takeoff", quantity: { value: 12, unit: "m²" } },
    { globalId: "d", ifcClass: "IfcStair", name: "", storey: "", reason: "", scope: "out_of_scope", quantity: { value: 3.5, unit: "m³" } },
    { globalId: "e", ifcClass: "IfcSlab", name: "", storey: "", reason: "", scope: "in_takeoff" },
  ]);
  assert.deepEqual(summary, [
    { unit: "m³", value: 7.25, count: 2 },
    { unit: "m²", value: 12, count: 1 },
  ]);
});
