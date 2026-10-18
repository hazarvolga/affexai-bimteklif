import assert from "node:assert/strict";
import test from "node:test";
import { computeApartmentSubcontractorShield } from "./apartment-subcontractor-shield";
import type { ApartmentUnitScheduleItem } from "./types";

const apartment: ApartmentUnitScheduleItem = {
  unitCode: "D03",
  unitLabel: "Daire 03",
  storey: "1. Normal Kat",
  roomCount: 3,
  netSweepableM2: 100,
  balconyM2: 8,
  totalNetM2: 108,
  unitGrossM2: 120,
  generalGrossM2: 130,
  rooms: [
    { code: "D03-01", name: "Salon", storey: "1. Normal Kat", netAreaM2: 60, floorFinish: "Laminat Parke" },
    { code: "D03-02", name: "Mutfak", storey: "1. Normal Kat", netAreaM2: 40, floorFinish: "Seramik" },
    { code: "D03-03", name: "Balkon", storey: "1. Normal Kat", netAreaM2: 8, floorFinish: "Seramik", isBalcony: true },
  ],
};

test("Golden 1: Daire 03 şap 3 cm → 108 m² × 0,03 = 3,240 m³ ve 5 cm → 5,400 m³", () => {
  const r3 = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 3,
    plasterThicknessCm: null,
  });
  assert.equal(r3.screedAreaM2, 108);
  assert.equal(r3.screedVolumeM3, 3.24);
  const r5 = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 5,
    plasterThicknessCm: null,
  });
  assert.equal(r5.screedVolumeM3, 5.4);
});

test("Golden 2: kalınlık/dozaj girilmezse hacim ve çimento null döner (gizli varsayılan yok)", () => {
  const r = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: null,
    plasterThicknessCm: null,
  });
  assert.equal(r.screedVolumeM3, null);
  assert.equal(r.screedCementKg, null);
  assert.equal(r.plasterVolumeM3, null);
});

test("Golden 3: fire ve çimento dozajı kullanıcı girdisiyle uygulanır", () => {
  const r = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 5,
    plasterThicknessCm: null,
    wastePercent: 10,
    cementKgPerM3: 300,
  });
  assert.equal(r.screedVolumeM3, 5.4);
  assert.equal(r.screedVolumeWithWasteM3, 5.94);
  assert.equal(r.screedCementKg, 1782);
});

test("Golden 4: duvar sıvası alanı IFC'de yoksa uyarı; girilince boşluk düşülür", () => {
  const without = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 3,
    plasterThicknessCm: 2,
  });
  assert.equal(without.plasterNetAreaM2, null);
  assert.ok(without.warnings.some((w) => w.includes("Duvar sıvası alanı IFC mahal cetvelinde yoktur")));

  const withWall = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 3,
    plasterThicknessCm: 2,
    wallPlasterAreaM2: 250,
    wallOpeningDeductionM2: 20,
  });
  assert.equal(withWall.plasterNetAreaM2, 230);
  assert.equal(withWall.plasterVolumeM3, 4.6);
});

test("Golden 5: taşeron beyanı tavanı aşarsa fazla m² raporlanır; tolerans uygulanır", () => {
  const over = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 3,
    plasterThicknessCm: null,
    claims: { screedM2: 120, floorFinishM2: 108 },
  });
  assert.equal(over.claimChecks.screed.status, "exceeds_ceiling");
  assert.equal(over.claimChecks.screed.excessM2, 12);
  assert.equal(over.claimChecks.floorFinish.status, "within_ceiling");
  assert.equal(over.claimChecks.plaster.status, "not_declared");

  const tolerated = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 3,
    plasterThicknessCm: null,
    tolerancePercent: 12,
    claims: { screedM2: 120 },
  });
  assert.equal(tolerated.claimChecks.screed.status, "within_ceiling");
});

test("Golden 6: zemin kaplaması türe göre gruplanır ve geçersiz kalınlık reddedilir", () => {
  const r = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 25,
    plasterThicknessCm: -1,
  });
  assert.equal(r.screedVolumeM3, null);
  assert.equal(r.plasterVolumeM3, null);
  assert.deepEqual(
    r.floorFinishLines.map((l) => [l.floorFinish, l.areaM2, l.roomCount]),
    [
      ["Laminat Parke", 60, 1],
      ["Seramik", 48, 2],
    ],
  );
});

test("Golden 7: mahal listesi boş daire için tavan üretilmez", () => {
  const r = computeApartmentSubcontractorShield({
    apartment: { ...apartment, rooms: [] },
    screedThicknessCm: 3,
    plasterThicknessCm: 2,
    claims: { screedM2: 10 },
  });
  assert.equal(r.screedVolumeM3, null);
  assert.equal(r.claimChecks.screed.status, "not_declared");
  assert.ok(r.warnings.some((w) => w.includes("mahal")));
});

test("Golden 8: Şantiye şap standardı (325 kg/m³ çimento, %10 fire) ile şap çimento hesabı", () => {
  const r = computeApartmentSubcontractorShield({
    apartment,
    screedThicknessCm: 5, // 108 m² × 0,05 = 5,4 m³
    plasterThicknessCm: null,
    wastePercent: 10,
    cementKgPerM3: 325,
  });
  assert.equal(r.screedVolumeM3, 5.4);
  assert.equal(r.screedVolumeWithWasteM3, 5.94); // 5,4 × 1,10
  assert.equal(r.screedCementKg, 1930.5); // 5,94 × 325
});

