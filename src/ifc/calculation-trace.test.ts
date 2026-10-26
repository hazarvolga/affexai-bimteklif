import assert from "node:assert/strict";
import test from "node:test";
import type { CalmIcmalItem } from "./calm-icmal";
import { cetvelCsv, explainIcmalItem } from "./calculation-trace";

const base: CalmIcmalItem = {
  id: "c30-37-betonarme", groupKey: "structural", title: "C30/37 Betonarme", subtitle: "", pozCode: "15.150.1006", unit: "m³",
  netQuantity: 14.75, grossQuantity: 14.75, deductedOpeningQuantity: 0, grossAvailable: false, defaultUnitPriceTry: 0,
  formulaNote: "Yalnız beton katmanlı yapısal elemanlar", storeyBreakdown: [], sampleRooms: [],
  contributions: [
    { globalId: "G1", name: "Döşeme Z01", ifcClass: "IfcSlab", storeyLabel: "Zemin Kat", roomLabel: null, layer: null, netQuantity: 10.25, grossQuantity: null, openingQuantity: null, quantitySource: "qto" },
    { globalId: "G2", name: "Döşeme; 101", ifcClass: "IfcSlab", storeyLabel: "1. Kat", roomLabel: "Salon · D3-01", layer: null, netQuantity: 4.5, grossQuantity: null, openingQuantity: null, quantitySource: "geometry" },
  ],
};

test("açıklama eleman sayısını, kat sayısını ve miktar kaynaklarını sade dille söyler", () => {
  const steps = explainIcmalItem(base);
  assert.match(steps[0], /2 eleman/);
  assert.match(steps[0], /2 katta/);
  assert.match(steps.join(" "), /1 elemanın miktarı IFC ölçü setinden \(Qto\)/);
  assert.match(steps.join(" "), /1 elemanın miktarı geometriden hesaplandı/);
  assert.match(steps.join(" "), /brüt ve boşluk verisi yok/);
  assert.match(steps.at(-1) ?? "", /Yalnız beton katmanlı yapısal elemanlar/);
});

test("brüt verisi olan kalemde brüt − boşluk = net adımı sayılarla yazılır", () => {
  const steps = explainIcmalItem({ ...base, unit: "m²", grossAvailable: true, grossQuantity: 20, deductedOpeningQuantity: 5.25, netQuantity: 14.75 });
  assert.match(steps.join(" "), /Brüt 20,00 m² − boşluk 5,25 m² = net 14,75 m²/);
});

test("boşluk düşülmeyen kalemde 'boşluk yok' yalnız model kapı/pencere bilgisi taşıyorsa söylenir", () => {
  const item: CalmIcmalItem = { ...base, unit: "m²", grossAvailable: true, grossQuantity: 14.75, deductedOpeningQuantity: 0, netQuantity: 14.75 };
  assert.match(explainIcmalItem(item, { openings: "present" }).join(" "), /Bu kalemde düşülecek boşluk yok/);
  assert.match(explainIcmalItem(item, { openings: "none_in_model" }).join(" "), /Modelde kapı\/pencere yok; düşülecek boşluk yok/);
  for (const steps of [explainIcmalItem(item, { openings: "unknown" }), explainIcmalItem(item)]) {
    const text = steps.join(" ");
    assert.match(text, /kapı\/pencere bilgisi bulunamadı/);
    assert.match(text, /boşluk düşümü değerlendirilemedi/);
    assert.doesNotMatch(text, /düşülecek boşluk yok/);
  }
});

test("eleman listesi olmayan kalemde açıklama bunu açıkça söyler", () => {
  const steps = explainIcmalItem({ ...base, contributions: undefined });
  assert.match(steps[0], /eleman listesi bu kayıtta yok/);
});

test("metraj cetveli CSV'si Türkçe Excel'de açılır: BOM, noktalı virgül, virgüllü ondalık, kaçışlı alan", () => {
  const csv = cetvelCsv(base, { fileName: "proje.ifc", generatedAt: "24.10.2026 20:00" });
  assert.ok(csv.startsWith("﻿"));
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines[0], "Kalem;C30/37 Betonarme");
  assert.ok(lines.includes("Sıra;Eleman;GlobalId;IFC sınıfı;Kat;Mahal;Katman;Brüt;Boşluk;Net;Birim;Miktar kaynağı"));
  assert.ok(lines.includes('2;"Döşeme; 101";G2;IfcSlab;1. Kat;Salon · D3-01;;;;4,500;m³;Geometriden hesaplandı'));
  assert.ok(lines.includes(";;;;;;;;Toplam;14,750;m³;"));
});
