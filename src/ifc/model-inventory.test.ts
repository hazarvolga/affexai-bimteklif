import assert from "node:assert/strict";
import test from "node:test";
import { buildModelInventory } from "./model-inventory";

const inventory = [
  { ifcClass: "IfcWall", count: 427 },
  { ifcClass: "IfcSlab", count: 173 },
  { ifcClass: "IfcCovering", count: 661 },
  { ifcClass: "IfcSpace", count: 178 },
  { ifcClass: "IfcDoor", count: 162 },
  { ifcClass: "IfcWindow", count: 93 },
  { ifcClass: "IfcRailing", count: 144 },
  { ifcClass: "IfcStair", count: 5 },
];
const elements = [...Array.from({ length: 160 }, () => ({ type: "IfcSlab" })), ...Array.from({ length: 3 }, () => ({ type: "IfcCovering" }))];
const apartments = [{ roomCount: 8 }, { roomCount: 9 }] as never[];
const openings = [...Array.from({ length: 2 }, () => ({ kind: "door" })), { kind: "window" }] as never[];

const rows = buildModelInventory({ inventory, elements, apartments, openings });
const row = (name: string) => rows.find(item => item.ifcClass === name)!;

test("a class with quantity evidence is in the icmal, and the rest of its elements are named", () => {
  assert.deepEqual([row("IfcSlab").status, row("IfcSlab").total, row("IfcSlab").counted], ["in_icmal", 173, 160]);
  assert.match(row("IfcSlab").note, /13 eleman.*kanıtsız/);
});

test("a class whose elements all lack quantity evidence is not counted, and says why", () => {
  assert.equal(row("IfcWall").status, "not_counted");
  assert.match(row("IfcWall").note, /Kanıtlı miktar yok/);
});

test("rooms, doors and windows are listed elsewhere, with what reached that list", () => {
  assert.deepEqual([row("IfcSpace").status, row("IfcSpace").counted], ["listed", 17]);
  assert.match(row("IfcSpace").note, /161 oda.*bölüme atanmamış/);
  assert.deepEqual([row("IfcDoor").status, row("IfcDoor").counted, row("IfcWindow").counted], ["listed", 2, 1]);
});

test("classes the product does not take off are shown as not counted", () => {
  for (const name of ["IfcRailing", "IfcStair"]) {
    assert.equal(row(name).status, "not_counted");
    assert.match(row(name).note, /metraja girmiyor/i);
  }
  assert.equal(row("IfcRailing").label, "Korkuluk");
});

test("an old record without an inventory gives no rows instead of zeros", () => {
  assert.deepEqual(buildModelInventory({ inventory: undefined, elements, apartments, openings }), []);
});
