import assert from "node:assert/strict";
import test from "node:test";
import {
  buildParcelCsvTemplate,
  computeFeasibility,
  exportFeasibilityCsv,
  parseParcelCsv,
  parseParcelRows,
  VILLA_MARKET_COST_BENCHMARK_2026,
  type FeasibilityInput,
} from "./pre-bim-feasibility";
import { parseCsv } from "./tabular-data";

const base = (over: Partial<FeasibilityInput> = {}): FeasibilityInput => ({
  parcels: [{ name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 }],
  landownerSharePercent: null,
  shareBase: null,
  netToGrossRatio: null,
  landownerUnitCount: null,
  promisedGrossPerUnitM2: null,
  unitCostTryPerM2: null,
  costSplit: null,
  ...over,
});

test("Golden 1: 1.000 m² arsa, TAKS 0,40 → 400 m² taban; KAKS 0,80 → 800 m² emsal; ≈2 kat", () => {
  const r = computeFeasibility(base());
  assert.equal(r.parcels[0].footprintM2, 400);
  assert.equal(r.parcels[0].emsalAreaM2, 800);
  assert.equal(r.parcels[0].approxFloorCount, 2);
  assert.equal(r.totalConstructionM2, 800);
});

test("Golden 2: çoklu parsel toplamı (1.000 m² 0,40/0,80 + 500 m² 0,35/1,50)", () => {
  const r = computeFeasibility(
    base({
      parcels: [
        { name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 },
        { name: "B", areaM2: 500, taks: 0.35, kaks: 1.5, emsalHariciAreaM2: 100 },
      ],
    }),
  );
  assert.equal(r.totalFootprintM2, 575);
  assert.equal(r.totalEmsalAreaM2, 1550);
  assert.equal(r.totalEmsalHariciM2, 100);
  assert.equal(r.totalConstructionM2, 1650);
});

test("Golden 3: kat karşılığı — emsal tabanı, %50 pay, net/brüt 0,85, 5 daire", () => {
  const r = computeFeasibility(
    base({
      parcels: [
        { name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 },
        { name: "B", areaM2: 500, taks: 0.35, kaks: 1.5, emsalHariciAreaM2: 0 },
      ],
      shareBase: "EMSAL",
      landownerSharePercent: 50,
      netToGrossRatio: 0.85,
      landownerUnitCount: 5,
    }),
  );
  assert.equal(r.shareBaseM2, 1550);
  assert.equal(r.landownerGrossM2, 775);
  assert.equal(r.contractorGrossM2, 775);
  assert.equal(r.landownerNetM2, 658.75);
  assert.equal(r.perUnitGrossM2, 155);
  assert.equal(r.perUnitNetM2, 131.75);
});

test("Golden 4: daire başına 165 m² vaat 155 m² kapasiteyi aşar → 10 m²/daire, 50 m² toplam; maliyeti birim maliyetle çarpılır", () => {
  const r = computeFeasibility(
    base({
      parcels: [
        { name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 },
        { name: "B", areaM2: 500, taks: 0.35, kaks: 1.5, emsalHariciAreaM2: 0 },
      ],
      shareBase: "EMSAL",
      landownerSharePercent: 50,
      landownerUnitCount: 5,
      promisedGrossPerUnitM2: 165,
      unitCostTryPerM2: 40000,
    }),
  );
  assert.equal(r.promise.status, "exceeds_capacity");
  assert.equal(r.promise.promisedTotalGrossM2, 825);
  assert.equal(r.promise.excessTotalM2, 50);
  assert.equal(r.promise.excessPerUnitM2, 10);
  assert.equal(r.promise.excessCostTry, 2_000_000);
});

test("Golden 5: kapasite içindeki vaat 'within_capacity' döner", () => {
  const r = computeFeasibility(
    base({
      shareBase: "EMSAL",
      landownerSharePercent: 50,
      landownerUnitCount: 2,
      promisedGrossPerUnitM2: 200,
    }),
  );
  assert.equal(r.landownerGrossM2, 400);
  assert.equal(r.promise.status, "within_capacity");
  assert.equal(r.promise.excessCostTry, null);
});

test("Golden 6: maliyet yüzde dağılımı yalnız beş kalem girilip toplam %100 ise gösterilir", () => {
  const ok = computeFeasibility(
    base({
      unitCostTryPerM2: 50000,
      costSplit: { kabaYapi: 30, inceYapi: 40, mekanik: 10, elektrik: 10, peyzajAltyapi: 10 },
    }),
  );
  assert.equal(ok.totalConstructionCostTry, 40_000_000);
  assert.equal(ok.costBreakdown?.length, 5);
  assert.equal(ok.costBreakdown?.find((l) => l.key === "kabaYapi")?.amountTry, 12_000_000);

  const bad = computeFeasibility(
    base({
      unitCostTryPerM2: 50000,
      costSplit: { kabaYapi: 30, inceYapi: 40, mekanik: 10, elektrik: 10, peyzajAltyapi: 5 },
    }),
  );
  assert.equal(bad.costBreakdown, null);
  assert.ok(bad.warnings.some((w) => w.includes("%100")));
});

test("Golden 7: girilmeyen değer için gizli varsayılan yok — her şey null / not_evaluated", () => {
  const r = computeFeasibility(base());
  assert.equal(r.landownerGrossM2, null);
  assert.equal(r.perUnitNetM2, null);
  assert.equal(r.totalConstructionCostTry, null);
  assert.equal(r.costBreakdown, null);
  assert.equal(r.promise.status, "not_evaluated");
  assert.ok(r.warnings.some((w) => w.includes("Pay tabanını")));
});

test("Golden 8: geçersiz parsel (TAKS > 1) hata verir ve toplamlara girmez", () => {
  const r = computeFeasibility(
    base({
      parcels: [
        { name: "Bozuk", areaM2: 1000, taks: 1.5, kaks: 0.8 },
        { name: "İyi", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 },
      ],
    }),
  );
  assert.equal(r.parcels[0].valid, false);
  assert.ok(r.parcels[0].errors.some((e) => e.includes("TAKS")));
  assert.equal(r.totalEmsalAreaM2, 800);
});

test("Golden 9: emsal harici girilmezse uyarı verilir ve 0 sayılır", () => {
  const r = computeFeasibility(base({ parcels: [{ name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8 }] }));
  assert.equal(r.totalEmsalHariciM2, 0);
  assert.ok(r.warnings.some((w) => w.includes("emsal harici alan girilmedi")));
});

test("Golden 10: CSV şablonu örnek satır içermez; TR biçimli CSV okunur", () => {
  const tpl = buildParcelCsvTemplate();
  assert.equal(tpl.split(/\r?\n/).filter((l) => l.trim()).length, 1);

  const csv = "parsel_adi;alan_m2;taks;kaks;emsal_harici_m2\r\nParsel 12;1.250,50;0,40;0,80;150\r\nParsel 13;abc;0,3;1;\r\n";
  const parsed = parseParcelCsv(csv);
  assert.equal(parsed.parcels.length, 1);
  assert.deepEqual(parsed.parcels[0], {
    name: "Parsel 12",
    areaM2: 1250.5,
    taks: 0.4,
    kaks: 0.8,
    emsalHariciAreaM2: 150,
  });
  assert.equal(parsed.errors.length, 1);
  assert.ok(parsed.errors[0].includes("Satır 3"));
});

test("Golden 11: eksik sütunlu CSV reddedilir; dışa aktarım BOM ve ; ayracı kullanır", () => {
  assert.ok(parseParcelCsv("a;b\r\n1;2").errors[0].includes("Eksik sütun"));
  const out = exportFeasibilityCsv(computeFeasibility(base()));
  assert.ok(out.startsWith("\uFEFF"));
  assert.ok(out.includes('"A";"400";"800";"0";"800";"2"'));
});

test("T30: fizibilite CSV çıktısı formül, ayraç, tırnak ve satır sonunu güvenli taşır", () => {
  const result = computeFeasibility(base({
    parcels: [{ name: '=1+1; "Parsel"\r\nİkinci satır 🏗️', areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 }],
  }));
  const rows = parseCsv(exportFeasibilityCsv(result), { delimiter: ";" });

  assert.equal(rows[1]?.length, 10);
  assert.equal(rows[1]?.[0], '\'=1+1; "Parsel"\r\nİkinci satır 🏗️');
});

test("Golden 12: parseParcelRows sayı hücrelerini ve metin sayıları (Türkçe) aynı şekilde okur", () => {
  const r = parseParcelRows([
    ["parsel_adi", "alan_m2", "taks", "kaks", "emsal_harici_m2"],
    ["A", 1000, 0.4, 0.8, null],
    ["B", "1.250,50", "0,35", "1,5", "100"],
    ["", null, null, null, null],
    ["C", "x", 0.3, 1, null],
  ]);
  assert.equal(r.parcels.length, 2);
  assert.deepEqual(r.parcels[0], { name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: null });
  assert.equal(r.parcels[1].areaM2, 1250.5);
  assert.equal(r.parcels[1].kaks, 1.5);
  assert.equal(r.errors.length, 1);
  assert.ok(r.errors[0].includes("Satır 5"));
});

test("Golden 13: Saha imar kuralı — emsal harici alan emsalin %30'unu aşarsa uyarı verilir", () => {
  // 1.000 m² arsa, TAKS 0,40, KAKS 0,80 → 800 m² emsal.
  // %30 üst sınır: 240 m². 250 m² girildiğinde açık uyarı verilmelidir.
  const r = computeFeasibility(
    base({
      parcels: [{ name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 250 }],
    }),
  );
  assert.equal(r.totalEmsalAreaM2, 800);
  assert.equal(r.totalEmsalHariciM2, 250);
  assert.ok(
    r.warnings.some((w) => w.includes("%30'unu") && w.includes("240 m²") && w.includes("Planlı Alanlar İmar Yönetmeliği")),
  );
});

test("Golden 14: 27 kalemlik 6-villa maliyet referansı tam ve tutarlıdır", () => {
  const benchmark = VILLA_MARKET_COST_BENCHMARK_2026;
  assert.equal(benchmark.items.length, 27);
  // 2 basamağa yuvarlanmış 27 kalemin toplamı Excel yuvarlaması nedeniyle %99,98'dir.
  const totalPercent = benchmark.items.reduce((sum, item) => sum + item.percent, 0);
  assert.ok(Math.abs(totalPercent - 100) <= 0.05);
  const totalSample = benchmark.items.reduce((sum, item) => sum + item.sampleAmountTry, 0);
  assert.equal(Math.round(totalSample * 100) / 100, 4135752.77);
  assert.equal(benchmark.sampleTotalCostTry, 4135752.77);
});

test("T23: alan satırları kararlı kimlik/kategori/kaynak taşır; yalnız sınırlı muaf alan %30 havuzunu tüketir", () => {
  const r = computeFeasibility(base({
    parcels: [{
      name: "A",
      areaM2: 1000,
      taks: 0.4,
      kaks: 0.8,
      localPlanEvidence: {
        sourceReference: "Belediye imar durumu belge no 2026/42",
        asOf: "2026-10-20",
        limitedExemptCapPercent: 30,
        verificationStatus: "verified",
        issuer: "Test Belediyesi",
        documentId: "2026/42",
        sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
      areaLines: [
        { id: "emsal-konut", label: "Konut", category: "included", areaM2: 800, sourceReference: "Mimari alan cetveli A1" },
        { id: "sinirli-1", label: "Ortak alan", category: "limited_exempt", areaM2: 230, sourceReference: "Mimari alan cetveli A2" },
        { id: "tam-1", label: "Tam muaf alan", category: "fully_exempt", areaM2: 100, sourceReference: "Yerel plan notu 7" },
      ],
    }],
  }));

  assert.equal(r.parcels[0].limitedExemptAreaM2, 230);
  assert.equal(r.parcels[0].fullyExemptAreaM2, 100);
  assert.equal(r.parcels[0].limitedExemptPoolLimitM2, 240);
  assert.equal(r.parcels[0].arithmeticExemptionStatus, "within_limit");
  assert.equal(r.parcels[0].planningComplianceStatus, "within_limit");
  assert.equal(r.parcels[0].totalConstructionM2, 1130);
});

test("T23: kaynaklı emsale dahil alan KAKS kapasitesinden ayrı izlenir ve toplamda iki kez sayılmaz", () => {
  const r = computeFeasibility(base({ parcels: [{
    name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8,
    areaLines: [
      { id: "i", label: "Tasarlanan dahil alan", category: "included", areaM2: 700, sourceReference: "Alan cetveli" },
      { id: "l", label: "Sınırlı muaf", category: "limited_exempt", areaM2: 100, sourceReference: "Alan cetveli" },
    ],
  }] }));
  assert.equal(r.parcels[0].emsalAreaM2, 800, "KAKS kapasitesi korunur");
  assert.equal(r.parcels[0].declaredIncludedAreaM2, 700);
  assert.equal(r.parcels[0].totalConstructionM2, 800, "700 dahil + 100 sınırlı muaf");
});

test("T23: duplicate alan kimliği parseli geçersiz kılar; aynı alan iki kez sayılmaz", () => {
  const r = computeFeasibility(base({
    parcels: [{
      name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8,
      areaLines: [
        { id: "x", label: "Bir", category: "limited_exempt", areaM2: 10, sourceReference: "S1" },
        { id: "x", label: "İki", category: "fully_exempt", areaM2: 20, sourceReference: "S2" },
      ],
    }],
  }));
  assert.equal(r.parcels[0].valid, false);
  assert.match(r.parcels[0].errors.join(" "), /tekrar/i);
  assert.equal(r.totalConstructionM2, null);
});

test("T23: yerel plan kanıtı yokken yalnız aritmetik danışmanlık verilir, resmî uygunluk üretilmez", () => {
  const r = computeFeasibility(base({
    parcels: [{
      name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8,
      areaLines: [
        { id: "l1", label: "Sınırlı", category: "limited_exempt", areaM2: 250, sourceReference: "Alan cetveli" },
        { id: "f1", label: "Tam", category: "fully_exempt", areaM2: 500, sourceReference: "Kullanıcı beyanı" },
      ],
    }],
  }));
  assert.equal(r.parcels[0].arithmeticExemptionStatus, "exceeds_limit");
  assert.equal(r.parcels[0].planningComplianceStatus, "not_evaluated");
  assert.ok(r.warnings.some((w) => /yerel plan/i.test(w) && /değerlendirilmedi/i.test(w)));
  // M-14.4: the contractor-facing text carries no internal or cryptographic jargon.
  assert.ok(r.warnings.every((w) => !/artifact|SHA-256|not_evaluated/i.test(w)));
});

test("T23: serbest metin, geçersiz takvim tarihi veya kullanıcı beyanı resmî plan kanıtı sayılmaz", () => {
  const result = computeFeasibility(base({ parcels: [{
    name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8,
    localPlanEvidence: {
      sourceReference: "x", asOf: "2026-99-99", limitedExemptCapPercent: 30,
      verificationStatus: "user_asserted", issuer: "x", documentId: "x", sha256: "e".repeat(64),
    },
    areaLines: [{ id: "l", label: "Sınırlı", category: "limited_exempt", areaM2: 250, sourceReference: "kullanıcı" }],
  }] }));
  assert.equal(result.parcels[0].arithmeticExemptionStatus, "exceeds_limit");
  assert.equal(result.parcels[0].planningComplianceStatus, "not_evaluated");
});

test("T23: eski emsalHariciAreaM2 girdisi kaynaklı danışmanlık satırına sarılır ve tek kez sayılır", () => {
  const r = computeFeasibility(base({
    parcels: [{ name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 100 }],
  }));
  assert.equal(r.parcels[0].areaLines.length, 1);
  assert.equal(r.parcels[0].areaLines[0].category, "limited_exempt");
  assert.equal(r.parcels[0].areaLines[0].sourceReference, "legacy:emsalHariciAreaM2:user_input");
  assert.equal(r.parcels[0].totalConstructionM2, 900);
});

test("T23: eski toplam ile yeni alan satırları birlikte verilirse çift sayım riski reddedilir", () => {
  const r = computeFeasibility(base({ parcels: [{
    name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 100,
    areaLines: [{ id: "l", label: "Sınırlı", category: "limited_exempt", areaM2: 100, sourceReference: "S" }],
  }] }));
  assert.equal(r.parcels[0].valid, false);
  assert.match(r.parcels[0].errors.join(" "), /birlikte|çift/i);
});

test("T23: maliyet referansı tarih, konum, kaynak, örnek ve eskilik sinyali taşır", () => {
  const b = VILLA_MARKET_COST_BENCHMARK_2026;
  assert.match(b.asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(b.location.length > 0);
  assert.ok(b.source.length > 0);
  assert.equal(b.sample.projectType, "6-villa");
  assert.equal(b.sample.itemCount, 27);
  assert.equal(b.stale, true);
  assert.ok(b.staleReason.length > 0);
});

test("T23 CSV contract: muaf alan kategorileri, kaynakları ve yerel plan kanıtı kayıpsız okunur", () => {
  const csv = [
    "parsel_adi;alan_m2;taks;kaks;emsale_dahil_m2;emsale_dahil_kaynak;sinirli_muaf_m2;sinirli_muaf_kaynak;tam_muaf_m2;tam_muaf_kaynak;yerel_plan_kaynak;yerel_plan_tarih;yerel_plan_sinirli_muaf_orani",
    "A;1000;0,4;0,8;800;Alan cetveli A1;200;Alan cetveli A2;100;Plan notu 7;İmar durum no 42;2026-10-20;30",
  ].join("\r\n");
  const parsed = parseParcelCsv(csv);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.parcels[0].areaLines?.length, 3);
  assert.deepEqual(parsed.parcels[0].areaLines?.map((line) => line.category), ["included", "limited_exempt", "fully_exempt"]);
  assert.equal(parsed.parcels[0].areaLines?.[2].sourceReference, "Plan notu 7");
  assert.equal(parsed.parcels[0].localPlanEvidence?.asOf, "2026-10-20");
  assert.equal(parsed.parcels[0].localPlanEvidence?.limitedExemptCapPercent, 30);
});

test("T23 CSV contract: kategorili alan kaynak olmadan kabul edilmez", () => {
  const csv = [
    "parsel_adi;alan_m2;taks;kaks;sinirli_muaf_m2;sinirli_muaf_kaynak",
    "A;1000;0,4;0,8;200;",
  ].join("\r\n");
  const parsed = parseParcelCsv(csv);
  assert.equal(parsed.parcels.length, 0);
  assert.match(parsed.errors[0], /kaynak/i);
});

