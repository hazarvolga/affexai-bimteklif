import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { inspectDocument } from "./processor";

const fixtureRoot = path.resolve(process.cwd(), "fixtures/smartcheck/pilot-v1");

describe("SmartCheck source preview", () => {
  it("returns bounded CSV shape, suggested mapping and formula provenance", async () => {
    const content = await fs.readFile(path.join(fixtureRoot, "mep-05-formula-safe.csv"));
    const preview = await inspectDocument(content, "csv");
    assert.equal(preview.kind, "csv");
    assert.equal(preview.sheets.length, 1);
    assert.equal(preview.sheets[0].name, "CSV");
    assert.equal(preview.sheets[0].suggestedMapping.description, "Açıklama");
    assert.equal(preview.sheets[0].sampleRows.length, 4);
    assert.equal(preview.sheets[0].formulaCells.length, 2);
    assert.equal(preview.sheets[0].sampleRows[1][4].startsWith("'="), true);
  });
});

it('rejects oversized spreadsheet cell before returning preview', async () => {
  const content = Buffer.from('Açıklama,Birim,Miktar\n' + 'x'.repeat(40_000) + ',m,1');
  await assert.rejects(inspectDocument(content, 'csv'), /SPREADSHEET_(CELL|RECORD)_LIMIT/);
});
