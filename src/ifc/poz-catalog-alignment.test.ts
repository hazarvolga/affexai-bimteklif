import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildQuoteCsvTemplate } from "../lib/quote-excel-import";

interface CatalogRow { itemCode: string; itemName: string; unit: string }

function officialConstructionRows(): Map<string, CatalogRow> {
  const catalogs = JSON.parse(readFileSync("src/server/crawler/data/csb-2026-official-catalogs.json", "utf8"));
  const rows = new Map<string, CatalogRow>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const row = node as Partial<CatalogRow>;
    if (row.itemCode && row.itemName && row.unit) rows.set(row.itemCode, row as CatalogRow);
    Object.values(node).forEach(walk);
  };
  walk(catalogs.csb_2026_mart_insaat_bf);
  return rows;
}

const canonicalUnit = (unit: string) => unit.replace("m2", "m²").replace("m3", "m³");

test("every fixed Calm poz exists in the official 2026 catalog with the same unit", () => {
  const rows = officialConstructionRows();
  const source = readFileSync("src/ifc/calm-icmal.ts", "utf8");
  const specs = [...source.matchAll(/pozCode: "(\d{2}\.\d{3}\.\d{4})",\s*unit: "([^"]+)"/g)];
  assert.ok(specs.length >= 8, "expected the fixed finish positions");
  for (const [, code, unit] of specs) {
    assert.ok(rows.has(code), `${code} is not in the official catalog`);
    assert.equal(canonicalUnit(rows.get(code)!.unit), canonicalUnit(unit), code);
  }
});

test("fixed Calm positions describe the work they are used for", () => {
  const rows = officialConstructionRows();
  for (const [code, work] of [
    ["15.250.1111", /şap/i], ["15.190.1014", /epoksi/i], ["15.380.1006", /seramik duvar/i], ["15.390.1008", /60 x 60/],
    ["15.275.1112", /iç cephe sıvası/i], ["15.275.1117", /kaba sıva/i], ["15.280.1011", /saten alçı/i], ["15.540.1525", /saten alçılı.*plastik/i],
  ] as const) assert.match(rows.get(code)?.itemName ?? "", work, code);
});

test("the downloadable quote template only shows real positions with matching work", () => {
  const rows = officialConstructionRows();
  const lines = buildQuoteCsvTemplate().trim().split(/\r?\n/).slice(1).map(line => line.split(";").map(cell => cell.replace(/^"|"$/g, "")));
  assert.equal(lines.length, 4);
  for (const [code, , unit] of lines) {
    assert.ok(rows.has(code), `${code} is not in the official catalog`);
    assert.equal(canonicalUnit(rows.get(code)!.unit), canonicalUnit(unit), code);
  }
  assert.match(rows.get(lines[0][0])!.itemName, /25\/30/);
  assert.match(rows.get(lines[1][0])!.itemName, /nervürlü beton çelik/i);
  assert.match(rows.get(lines[2][0])!.itemName, /plywood/i);
  assert.match(rows.get(lines[3][0])!.itemName, /sıva/i);
});
