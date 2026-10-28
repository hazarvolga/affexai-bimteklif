import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { calculateLineBreakdown, calculateQuotationTotals } from "../../../lib/calculations";
import { calculateQuotationFinancials, escalationPremiumFor } from "../../../lib/financial-calculations";
import { calculateTaxAdvisory } from "../../../lib/tax-advisory";
import { ts500LapLength } from "../../../academy/lap-length";
import { evaluateSupplierPrice } from "../../../server/market-intelligence/price-memory";
import { CALC_MODULES } from "./calculation-content";
import { ROADMAP_SECTIONS, ROADMAP_SOURCE_SECTIONS, ROADMAP_SOURCES } from "./roadmap-content";
import { CALC_REVIEW_META, CALC_REVIEW_EVIDENCE, CALC_REVIEW_CHANGELOG } from "./calculation-review";

const tr = (value: number) => value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moduleText = (id: string) => JSON.stringify(CALC_MODULES.find(module => module.id === id));

test("engineering review binds every module to a version, evidence and explicit acceptance gaps", () => {
  assert.match(CALC_REVIEW_META.version, /^BIM-CALC-\d{4}-\d{2}-\d{2}\.\d+$/);
  assert.match(CALC_REVIEW_META.implementationBaseline, /^[a-f0-9]{40}$/);
  assert.ok(CALC_REVIEW_CHANGELOG.length >= 5);
  assert.equal(CALC_REVIEW_CHANGELOG[0]?.revision, "Rev. 1");
  assert.equal(CALC_REVIEW_CHANGELOG.at(-1)?.version, CALC_REVIEW_META.version);
  assert.deepEqual(Object.keys(CALC_REVIEW_EVIDENCE).sort(), CALC_MODULES.map(module => module.id).sort());
  for (const [id, evidence] of Object.entries(CALC_REVIEW_EVIDENCE)) {
    assert.ok(evidence.scope.trim() && evidence.pending.trim(), id);
    assert.ok(evidence.testFiles.length > 0, id);
    for (const file of evidence.testFiles) assert.ok(existsSync(file), `${id}: evidence ${file} missing`);
  }
});

test("every calculation module is reviewable: source, references, example and an existing file", () => {
  const ids = new Set<string>();
  for (const module of CALC_MODULES) {
    assert.ok(!ids.has(module.id), `duplicate ${module.id}`);
    ids.add(module.id);
    assert.ok(module.sourceFiles.length && module.references.length, module.id);
    assert.ok(module.example.result.trim() && module.example.inputs.length, module.id);
    assert.ok(module.formulas.length || module.rules, `${module.id} needs formulas or rules`);
    for (const file of module.sourceFiles) assert.ok(existsSync(file.split(" ")[0]), `${module.id}: ${file} missing`);
  }
  assert.ok(CALC_MODULES.length >= 18);
});

test("documented examples match what the application computes today", () => {
  const line = calculateLineBreakdown({ quantity: 12.5, unitPrice: 1840.35, discountPercent: 7.5, vatPercent: 20 });
  assert.ok(moduleText("teklif-satir").includes(tr(line.total)));
  const totals = calculateQuotationTotals([{ quantity: 12.5, unitPrice: 1840.35, discountPercent: 7.5, vatPercent: 20 }, { quantity: 3, unitPrice: 0.335, discountPercent: 0, vatPercent: 20 }]);
  assert.ok(moduleText("teklif-satir").includes(tr(totals.grandTotal)));
  assert.ok(moduleText("eskalasyon").includes(tr(escalationPremiumFor(1_000_000, 12, 2))));
  const fin = calculateQuotationFinancials([
    { quantity: 100, unitPrice: 4000, costUnitPrice: 2800, wastePercent: 3, costCategory: "material", discountPercent: 5 },
    { quantity: 1, unitPrice: 150000, costUnitPrice: 90000, costCategory: "labor" },
    { quantity: 1, unitPrice: 80000, costUnitPrice: 60000, costCategory: "subcontractor" },
  ], { projectDurationMonths: 8, escalationVolatilityPercent: 1.5, carbonRiskPremiumPercent: 2, informationDeliveryCostPercent: 1 });
  assert.ok(moduleText("maliyet-marj").includes(tr(fin.profit)) && moduleText("maliyet-marj").includes(`%${tr(fin.margin)}`));
  assert.equal(calculateTaxAdvisory(100000, 20, 40).payableTotal, 112000);
  assert.equal(ts500LapLength({ fck: 30, barDiameterMm: 16, bond: "good", splicedRatio: 1 }).l0Mm, 823);
  assert.equal(ts500LapLength({ fck: 25, barDiameterMm: 20, bond: "poor", splicedRatio: 0.5 }).l0Mm, 1315);
  const samples = [100, 104, 98, 101, 99].map(amount => ({ amount, positionCode: "X", description: "d", unit: "m3", region: null }));
  const outlier = evaluateSupplierPrice(140, { positionCode: "X", description: "d", unit: "m3", region: null }, samples, 0.2);
  assert.deepEqual([outlier.outlierScore, outlier.outlierStatus], [8, "outlier"]);
});

test("roadmap covers the agreed topics, ministry questions and official sources", () => {
  const ids = ROADMAP_SECTIONS.map(section => section.id);
  for (const id of ["ozet", "mevzuat", "taslak-nihai", "yazilim", "mimari", "roller", "bakanlik", "yol-haritasi", "durum", "riskler", "5d", "revizyon-gunlugu"]) assert.ok(ids.includes(id), id);
  const ministry = ROADMAP_SECTIONS.find(section => section.id === "bakanlik")!;
  const questions = ministry.blocks.find(block => block.type === "list");
  assert.equal(questions?.type === "list" ? questions.items.length : 0, 6);
  assert.ok(ROADMAP_SOURCES.some(source => source.url?.includes("resmigazete.gov.tr/eskiler/2026/08/20260805-2")));
  assert.ok(!JSON.stringify(ROADMAP_SECTIONS).includes("%100"), "no unverifiable '100%' compliance claims");
});


test("Rev. 112 documents Phase 0 without claiming production or independent expert approval", () => {
  assert.equal(CALC_REVIEW_META.version, "BIM-CALC-2026-10-28.106");
  assert.equal(CALC_REVIEW_CHANGELOG.at(-1)?.revision, "Rev. 112");
  const revisions = CALC_REVIEW_CHANGELOG.map(item => Number(item.revision.match(/Rev\. (\d+)/)?.[1]));
  assert.ok(revisions.every((value, index) => index === 0 || value > revisions[index - 1]), "calculation revisions must be strictly increasing");
  const kik = CALC_REVIEW_CHANGELOG.at(-1)?.moduleDetails?.["kik-adt"];
  assert.match(JSON.stringify(kik), /0,90/);
  assert.match(JSON.stringify(kik), /beyan/);
  const journal = ROADMAP_SECTIONS.find(section => section.id === "revizyon-gunlugu")!;
  const tables = journal.blocks.filter(block => block.type === "table");
  assert.equal(tables.length, 2);
  for (const [index, table] of tables.entries()) {
    if (table.type !== "table") continue;
    const numbers = table.rows.map(row => Number(row[0].match(/Rev\. (\d+)/)?.[1]));
    assert.equal(numbers.at(-1), 112);
    assert.ok(numbers.every((value, rowIndex) => rowIndex === 0 || (index === 0 ? value > numbers[rowIndex - 1] : value >= numbers[rowIndex - 1])), "roadmap revisions must be ordered");
  }
});


test("technical revision matrix preserves each original row and its cell relationships", () => {
  const matrix = (sections: typeof ROADMAP_SECTIONS) => {
    const journal = sections.find(section => section.id === "revizyon-gunlugu")!;
    const tables = journal.blocks.filter(block => block.type === "table");
    const table = tables[1];
    if (table.type !== "table") throw new Error("matrix missing");
    return table.rows;
  };
  const original = matrix(ROADMAP_SOURCE_SECTIONS);
  const ordered = matrix(ROADMAP_SECTIONS);
  assert.deepEqual([...ordered].map(row => JSON.stringify(row)).sort(), [...original].map(row => JSON.stringify(row)).sort());
  const rev4Original = original.filter(row => /^Rev\. 4(?:\D|$)/.test(row[0]));
  const rev4Ordered = ordered.filter(row => /^Rev\. 4(?:\D|$)/.test(row[0]));
  assert.ok(rev4Original.length > 1);
  assert.deepEqual(rev4Ordered, rev4Original, "equal-revision rows retain source order");
});

test("corrected calculation revision numbers retain their historical aliases", () => {
  for (let newRevision = 107; newRevision <= 111; newRevision++) {
    const record = CALC_REVIEW_CHANGELOG.find(item => item.revision === `Rev. ${newRevision}`);
    assert.ok(record?.trigger.includes(`eski etiket: Rev. ${newRevision - 6}`));
  }
});
