import assert from "node:assert/strict";
import test from "node:test";
import { parseRatioInput, resolveApartmentGross, sumResidentialGross } from "./apartment-gross";
import type { ApartmentUnitScheduleItem } from "./types";

const apt = (unitCode: string, totalNetM2: number, over: Partial<ApartmentUnitScheduleItem> = {}): ApartmentUnitScheduleItem => ({
  unitCode,
  unitLabel: unitCode,
  storey: "1. Kat",
  roomCount: 1,
  netSweepableM2: totalNetM2,
  balconyM2: 0,
  totalNetM2,
  unitGrossM2: null,
  generalGrossM2: null,
  rooms: [],
  ...over,
});

test("Golden 1: katsayı girilmezse brüt hesaplanmaz (uydurma çarpan yok)", () => {
  const r = resolveApartmentGross(apt("D01", 100), { unitRatio: null, generalRatio: null });
  assert.equal(r.unitGrossM2, null);
  assert.equal(r.generalGrossM2, null);
  assert.equal(r.unitSource, "none");
});

test("Golden 2: kullanıcı katsayısıyla brüt hesaplanır ve kaynağı işaretlenir", () => {
  const r = resolveApartmentGross(apt("D01", 100), { unitRatio: 1.15, generalRatio: 1.3 });
  assert.equal(r.unitGrossM2, 115);
  assert.equal(r.generalGrossM2, 130);
  assert.equal(r.unitSource, "user_ratio");
});

test("Golden 3: model brütü varsa katsayı onu ezmez", () => {
  const r = resolveApartmentGross(apt("D01", 100, { unitGrossM2: 118.4, generalGrossM2: 131 }), { unitRatio: 1.5, generalRatio: 1.5 });
  assert.equal(r.unitGrossM2, 118.4);
  assert.equal(r.unitSource, "model");
});

test("Golden 4: ortak alan/bodrum gibi konut olmayan birimlere katsayı uygulanmaz", () => {
  const r = resolveApartmentGross(apt("OAL", 80), { unitRatio: 1.15, generalRatio: 1.3 });
  assert.equal(r.unitGrossM2, null);
});

test("Golden 5: geçersiz katsayı (1'den küçük, 3'ten büyük, sayı değil) reddedilir", () => {
  assert.equal(parseRatioInput("0,9"), null);
  assert.equal(parseRatioInput("4"), null);
  assert.equal(parseRatioInput("abc"), null);
  assert.equal(parseRatioInput(""), null);
  assert.equal(parseRatioInput("1,132"), 1.132);
});

test("Golden 6: toplam yalnızca tüm konutların brütü biliniyorsa döner", () => {
  const list = [apt("D01", 100), apt("D02", 80), apt("OAL", 50)];
  assert.deepEqual(sumResidentialGross(list, { unitRatio: 1.1, generalRatio: null }), {
    totalUnitGrossM2: 198,
    totalGeneralGrossM2: null,
  });
  assert.equal(sumResidentialGross([], { unitRatio: 1.1, generalRatio: 1.2 }).totalUnitGrossM2, null);
});
