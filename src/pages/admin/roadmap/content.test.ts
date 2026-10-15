import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { calculateLineBreakdown, calculateQuotationTotals } from "../../../lib/calculations";
import { calculateQuotationFinancials, escalationPremiumFor } from "../../../lib/financial-calculations";
import { calculateTaxAdvisory } from "../../../lib/tax-advisory";
import { ts500LapLength } from "../../../academy/lap-length";
import { evaluateSupplierPrice } from "../../../server/market-intelligence/price-memory";
import { CALC_MODULES } from "./calculation-content";
import { ROADMAP_SECTIONS, ROADMAP_SOURCES } from "./roadmap-content";
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
