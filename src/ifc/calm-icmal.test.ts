import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalmIfcDatasetFromElements,
  parseSmartCheckRowToPseudoElement,
} from "./calm-icmal";
import { buildCalibrated202645Dataset } from "./calibrated-2026-45-fixture";
import type { ParsedIfcElement } from "./types";

test("buildCalibrated202645Dataset returns 5 quiet contractor groups and 16 residential apartments", () => {
  const ds = buildCalibrated202645Dataset();
  assert.equal(ds.residentialUnitCount, 16);
  assert.equal(ds.groups.length, 5);

  const flatItems = ds.groups.flatMap((g) => g.items);
  const sap = flatItems.find((i) => i.id === "sap-3cm");
  const parke = flatItems.find((i) => i.id === "laminat-parke");
  const fayans = flatItems.find((i) => i.id === "duvar-fayans");
  const kabaSiva = flatItems.find((i) => i.id === "kaba-siva");
  const parkeSup = flatItems.find((i) => i.id === "parke-supurgelik");

  assert.ok(sap);
  assert.equal(sap.netQuantity, 1761.33);
  assert.equal(sap.unit, "m²");

  assert.ok(parke);
  assert.equal(parke.netQuantity, 921.11);

  assert.ok(fayans);
  assert.equal(fayans.netQuantity, 1175.15);
  assert.equal(fayans.grossQuantity, 1318.4);
  assert.equal(fayans.deductedOpeningQuantity, 143.25);

  assert.ok(kabaSiva);
  assert.equal(kabaSiva.netQuantity, 4775.62);

  assert.ok(parkeSup);
  assert.equal(parkeSup.netQuantity, 893.54);
  assert.equal(parkeSup.unit, "mtül");
});

test("buildCalmIfcDatasetFromElements explodes multi-layer IfcCovering, converts SKIRTINGBOARD to mtül, and dynamically builds apartment schedule", () => {
  const sampleElements: ParsedIfcElement[] = [
    {
      id: "101",
      guid: "cov-floor-1",
      type: "IfcCovering",
      name: "Döşeme Kaplaması Salon",
      storey: "Zemin Kat",
      storeySource: "ifc_spatial",
      volumeM3: 2.0,
      areaM2: 25.0,
      materialLayers: ["XPS_5CM", "Şap_3CM", "Laminat_Parke"],
      coveringPredefinedType: "FLOORING",
      spaceCode: "K00_D01_005",
      spaceName: "SALON",
      zoneName: "D01",
      formworkM2: 0,
      rebarKg: 0,
      quantitySource: "qto",
      smartCheckStatus: "pass",
    },
    {
      id: "102",
      guid: "cov-wall-1",
      type: "IfcCovering",
      name: "Mutfak Duvar Kaplaması",
      storey: "Zemin Kat",
      storeySource: "ifc_spatial",
      volumeM3: 0.7,
      areaM2: 35.4,
      grossAreaM2: 40.68,
      openingAreaM2: 5.28,
      materialLayers: ["Sıva_2CM", "Fayans_a"],
      coveringPredefinedType: "CLADDING",
      spaceCode: "K00_D01_006",
      spaceName: "MUTFAK",
      zoneName: "D01",
      formworkM2: 0,
      rebarKg: 0,
      quantitySource: "qto",
      smartCheckStatus: "pass",
    },
    {
      id: "103",
      guid: "cov-skirt-1",
      type: "IfcCovering",
      name: "Parke Süpürgelik",
      storey: "Zemin Kat",
      storeySource: "ifc_spatial",
      volumeM3: 0.01,
      areaM2: 1.164,
      lengthM: 19.4,
      materialLayers: ["Parke_Süpürgelik"],
      coveringPredefinedType: "SKIRTINGBOARD",
      spaceCode: "K00_D01_005",
      spaceName: "SALON",
      zoneName: "D01",
      formworkM2: 0,
      rebarKg: 0,
      quantitySource: "property",
      smartCheckStatus: "pass",
    },
  ];

  const ds = buildCalmIfcDatasetFromElements(sampleElements, null, "Test_Konut.ifc");
  const flat = ds.groups.flatMap((g) => g.items);

  const sap = flat.find((i) => i.id === "sap-3cm");
  const parke = flat.find((i) => i.id === "laminat-parke");
  const xps = flat.find((i) => i.id === "xps-ses-yalitimi");
  const fayans = flat.find((i) => i.id === "duvar-fayans");
  const siva2cm = flat.find((i) => i.id === "duvar-ic-siva-2cm");
  const supurgelik = flat.find((i) => i.id === "parke-supurgelik");

  assert.equal(sap?.netQuantity, 25);
  assert.equal(parke?.netQuantity, 25);
  assert.equal(xps?.netQuantity, 25);
  assert.equal(fayans?.netQuantity, 35.4);
  assert.equal(fayans?.grossQuantity, 40.68);
  assert.equal(fayans?.deductedOpeningQuantity, 5.28);
  assert.equal(siva2cm?.netQuantity, 35.4);
  assert.equal(supurgelik?.netQuantity, 19.4);
  assert.equal(supurgelik?.unit, "mtül");

  // Dynamic apartment schedule from D01 FLOORING element
  assert.equal(ds.apartments.length, 1);
  assert.equal(ds.apartments[0].unitCode, "D01");
  assert.equal(ds.apartments[0].netSweepableM2, 25);
});

test("parseSmartCheckRowToPseudoElement accurately converts sample project rows without falling back to 2026_45", () => {
  const sampleRows = [
    {
      rawDescription: "IfcSlab · MM-DSM-zemin (Zemin Kat Betonarme Döşeme — Beton_C25)",
      rawUnit: "m3",
      rawQuantity: "6.40",
      rawPositionCode: "15.150.1005",
      formulaJson: {},
    },
    {
      rawDescription: "IfcCovering · MM-KPL-seramik_zemin (Mahal Zemin Seramik Kaplama — Seramik_A1)",
      rawUnit: "m2",
      rawQuantity: "32.50",
      rawPositionCode: "15.390.1002",
      formulaJson: {},
    },
  ];
  const elements = sampleRows.map((r, i) => parseSmartCheckRowToPseudoElement(r, i));
  const ds = buildCalmIfcDatasetFromElements(elements, null, "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc");
  const flat = ds.groups.flatMap((g) => g.items);
  assert.equal(flat.length, 2);
  assert.equal(ds.apartments.length, 0);
});

test("customer IFC files containing 2026_45 in filename compute strictly from actual elements and never leak calibrated reference data", () => {
  const sampleRows = [
    {
      rawDescription: "IfcSlab · MM-DSM-zemin (Zemin Kat Betonarme Döşeme — Beton_C30)",
      rawUnit: "m3",
      rawQuantity: "12.80",
      rawPositionCode: "15.150.1006",
      formulaJson: {},
    },
  ];
  const elements = sampleRows.map((r, i) => parseSmartCheckRowToPseudoElement(r, i));
  const ds = buildCalmIfcDatasetFromElements(elements, null, "Proje_2026_450_Musteri.ifc");
  const flat = ds.groups.flatMap((g) => g.items);

  assert.equal(flat.length, 1);
  assert.equal(flat[0].netQuantity, 12.8);
  assert.equal(ds.apartments.length, 0);
  assert.equal(ds.residentialUnitCount, 0);
});


test("brüt/boşluk yalnızca modelden gelir: model verisi olan kalem grossAvailable=true, olmayan kalem çarpanla üretilmez", () => {
  const base = {
    guid: "g",
    type: "IfcCovering" as const,
    storey: "Zemin Kat",
    storeySource: "ifc_spatial" as const,
    volumeM3: 0.1,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "qto" as const,
    smartCheckStatus: "pass" as const,
    spaceCode: "K00_D01_006",
    spaceName: "MUTFAK",
    zoneName: "D01",
  };
  const withModelGross: ParsedIfcElement = {
    ...base,
    id: "1",
    name: "Duvar A",
    areaM2: 35.4,
    grossAreaM2: 40.68,
    openingAreaM2: 5.28,
    materialLayers: ["Fayans_a"],
    coveringPredefinedType: "CLADDING",
  };
  const withoutModelGross: ParsedIfcElement = {
    ...base,
    id: "2",
    name: "Duvar B",
    guid: "g2",
    areaM2: 10,
    materialLayers: ["Sıva_2CM"],
    coveringPredefinedType: "CLADDING",
  };
  const skirting: ParsedIfcElement = {
    ...base,
    id: "3",
    guid: "g3",
    name: "Süpürgelik",
    areaM2: 1,
    lengthM: 20,
    materialLayers: ["Parke_Süpürgelik"],
    coveringPredefinedType: "SKIRTINGBOARD",
  };
  const items = buildCalmIfcDatasetFromElements([withModelGross, withoutModelGross, skirting], null, "x.ifc").groups.flatMap(
    (g) => g.items,
  );

  const fayans = items.find((i) => i.id === "duvar-fayans")!;
  assert.equal(fayans.grossAvailable, true);
  assert.equal(fayans.grossQuantity, 40.68);
  assert.equal(fayans.deductedOpeningQuantity, 5.28);

  const siva = items.find((i) => i.id === "duvar-ic-siva-2cm")!;
  assert.equal(siva.netQuantity, 10);
  assert.equal(siva.grossAvailable, false);
  assert.equal(siva.grossQuantity, 10, "×1,115 gibi uydurma çarpan uygulanmamalı");
  assert.equal(siva.deductedOpeningQuantity, 0);

  const supurgelik = items.find((i) => i.id === "parke-supurgelik")!;
  assert.equal(supurgelik.netQuantity, 20);
  assert.equal(supurgelik.grossQuantity, 20, "×1,08 gibi uydurma çarpan uygulanmamalı");
  assert.equal(supurgelik.grossAvailable, false);
});

test("süpürgelik uzunluğu modelde yoksa alan ÷ 0,06 varsayımı formül notunda açıkça belirtilir", () => {
  const el: ParsedIfcElement = {
    id: "9",
    guid: "g9",
    type: "IfcCovering",
    name: "Süpürgelik",
    storey: "Zemin Kat",
    storeySource: "ifc_spatial",
    volumeM3: 0,
    areaM2: 1.2,
    materialLayers: ["Parke_Süpürgelik"],
    coveringPredefinedType: "SKIRTINGBOARD",
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "qto",
    smartCheckStatus: "pass",
  };
  const item = buildCalmIfcDatasetFromElements([el], null, "x.ifc").groups.flatMap((g) => g.items)[0];
  assert.equal(item.netQuantity, 20);
  assert.ok(item.formulaNote.includes("varsayımıyla türetildi"));
});

test("daire brüt alanı: IFC'den gelmez, sabit çarpanla üretilmez (null)", () => {
  const rooms: ParsedIfcElement[] = [
    {
      id: "r1",
      guid: "r1",
      type: "IfcCovering",
      name: "Zemin",
      storey: "Zemin Kat",
      storeySource: "ifc_spatial",
      volumeM3: 0,
      areaM2: 50,
      materialLayers: ["Laminat_Parke"],
      coveringPredefinedType: "FLOORING",
      spaceCode: "K00_D01_005",
      spaceName: "SALON",
      zoneName: "D01",
      formworkM2: 0,
      rebarKg: 0,
      quantitySource: "qto",
      smartCheckStatus: "pass",
    },
  ];
  const ds = buildCalmIfcDatasetFromElements(rooms, null, "x.ifc");
  const apt = ds.apartments.find((a) => a.unitCode === "D01");
  assert.ok(apt);
  assert.equal(apt.unitGrossM2, null);
  assert.equal(apt.generalGrossM2, null);
  assert.equal(ds.totalGeneralGrossM2, null);
});
