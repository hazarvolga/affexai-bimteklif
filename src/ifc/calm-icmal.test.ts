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

test("IFC tutarlılık kapısı: açıkta kalan (IfcBuildingElementProxy), eşleşmeyen kaplama ve ölçülemeyen elemanlar icmale dahil edilmez; poza eşleşme tek kaynak olarak calm-icmal'de hesaplanır", () => {
  const validSlab: ParsedIfcElement = {
    id: "10",
    guid: "SLAB_VALID_00000000001",
    type: "IfcSlab",
    materialLayers: ["Beton_C30"],
    ifcClass: "IfcSlab",
    name: "Betonarme Döşeme",
    storey: "Zemin Kat",
    storeySource: "ifc_spatial",
    volumeM3: 12.5,
    formworkM2: 40,
    rebarKg: 0,
    quantitySource: "qto",
    smartCheckStatus: "review",
    measured: true,
    measurementStatus: "ölçüldü",
    matchedPozCode: null,
    isUncovered: false,
  };
  const unmeasuredColumn: ParsedIfcElement = {
    id: "11",
    guid: "COL_UNMEASURED_0000001",
    type: "IfcColumn",
    ifcClass: "IfcColumn",
    name: "Ölçüsüz Kolon",
    storey: "Kat atanmamış",
    storeySource: "estimate",
    volumeM3: 0,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "estimate",
    smartCheckStatus: "review",
    measured: false,
    measurementStatus: "ölçülemedi",
    matchedPozCode: null,
    isUncovered: true,
    uncoveredReason: "Geçerli net miktar ölçülemediği için icmale alınamadı.",
  };
  const unmappedCovering: ParsedIfcElement = {
    id: "12",
    guid: "COV_UNMAPPED_000000001",
    type: "IfcCovering",
    ifcClass: "IfcCovering",
    name: "Özel Akustik Kumaş Panel",
    storey: "Zemin Kat",
    storeySource: "ifc_spatial",
    volumeM3: 0,
    areaM2: 18.0,
    coveringPredefinedType: "WRAPPING",
    materialLayers: ["Akustik_Tekstil"],
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "qto",
    smartCheckStatus: "review",
    measured: true,
    measurementStatus: "ölçüldü",
    matchedPozCode: null,
    isUncovered: false,
  };
  const proxyElem: ParsedIfcElement = {
    id: "13",
    guid: "PROXY_ELEM_00000000001",
    type: "IfcBeam",
    ifcClass: "IfcBuildingElementProxy",
    name: "Özel Cephe Süsü",
    storey: "Zemin Kat",
    storeySource: "ifc_spatial",
    volumeM3: 2.4,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "qto",
    smartCheckStatus: "review",
    measured: true,
    measurementStatus: "ölçüldü",
    matchedPozCode: null,
    isUncovered: true,
    uncoveredReason: "IfcBuildingElementProxy genel/belirsiz eleman sınıfıdır; metraja alınmayan eleman olarak açıkta bırakıldı.",
  };

  const ds = buildCalmIfcDatasetFromElements(
    [validSlab, unmeasuredColumn, unmappedCovering, proxyElem],
    null,
    "consistency.ifc",
  );
  const allItems = ds.groups.flatMap((g) => g.items);
  assert.equal(allItems.length, 1);
  assert.equal(allItems[0].netQuantity, 12.5);
  assert.equal(allItems[0].pozCode, "15.150.1006");

  assert.ok(ds.consistencyReport);
  assert.equal(ds.consistencyReport.totalElementCount, 4);
  assert.equal(ds.consistencyReport.pozMatchedElementCount, 1);
  assert.equal(ds.consistencyReport.pozMatchedRatio, 0.25);
  const uncoveredGuids = new Set(ds.consistencyReport.uncoveredElements.map((u) => u.globalId));
  assert.deepEqual(
    uncoveredGuids,
    new Set(["COL_UNMEASURED_0000001", "COV_UNMAPPED_000000001", "PROXY_ELEM_00000000001"]),
  );
});



function coveringFixture(guid: string, predef: string, layers: string[], areaM2: number): ParsedIfcElement {
  return {
    id: guid,
    guid,
    type: "IfcCovering",
    ifcClass: "IfcCovering",
    name: layers.join("+"),
    storey: "Zemin Kat",
    storeySource: "ifc_spatial",
    volumeM3: 0,
    areaM2,
    coveringPredefinedType: predef,
    materialLayers: layers,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: "qto",
    smartCheckStatus: "review",
    measured: true,
    measurementStatus: "ölçüldü",
    matchedPozCode: null,
    isUncovered: false,
  };
}

test("astar ve macun katmanları boya ve saten alçı kalemlerine eklenmez (aynı yüzey iki kez sayılmaz)", () => {
  const ceiling = coveringFixture("CEIL_LAYERED_0000001", "CEILING", ["Kaba_Sıva", "Macun_c", "Astar_2mm", "Plastik_Boya"], 10);
  const items = buildCalmIfcDatasetFromElements([ceiling], null, "x.ifc").groups.flatMap((g) => g.items);
  const byId = new Map(items.map((i) => [i.id, i.netQuantity]));
  assert.equal(byId.get("plastik-boya"), 10);
  assert.equal(byId.get("kaba-siva"), 10);
  assert.equal(byId.has("saten-alci"), false);
});

test("PredefinedType'ı olmayan seramik ve kaba olmayan tavan sıvası tahminle bir kaleme yerleştirilmez", () => {
  const seramik = coveringFixture("COV_SERAMIK_NOPREDEF1", "", ["Seramik_60x60"], 12);
  const tavanSiva = coveringFixture("COV_TAVAN_SIVA_00001", "CEILING", ["Ince_Sıva"], 8);
  const ds = buildCalmIfcDatasetFromElements([seramik, tavanSiva], null, "x.ifc");
  const items = ds.groups.flatMap((g) => g.items);
  assert.equal(items.length, 0);
  const uncovered = new Set(ds.consistencyReport?.uncoveredElements.map((u) => u.globalId));
  assert.ok(uncovered.has("COV_SERAMIK_NOPREDEF1"));
  assert.ok(uncovered.has("COV_TAVAN_SIVA_00001"));
});

test("modeldeki açık PozNo kural eşleşen kalemin pozunu değiştirmez; farklı pozlu miktarlar tek satırda karışmaz", () => {
  const base = { type: "IfcSlab", ifcClass: "IfcSlab", storey: "Zemin Kat", storeySource: "ifc_spatial", formworkM2: 0, rebarKg: 0, quantitySource: "qto", smartCheckStatus: "review", measured: true, measurementStatus: "ölçüldü", matchedPozCode: null, isUncovered: false } as const;
  const tagged: ParsedIfcElement = { ...base, materialLayers: ["Beton_C30"], id: "1", guid: "SLAB_TAGGED_0000000001", name: "Döşeme A", volumeM3: 5, pozNo: "15.150.9999" };
  const plain: ParsedIfcElement = { ...base, materialLayers: ["Beton_C30"], id: "2", guid: "SLAB_PLAIN_00000000001", name: "Döşeme B", volumeM3: 7 };
  const ds = buildCalmIfcDatasetFromElements([tagged, plain], null, "x.ifc");
  const items = ds.groups.flatMap((g) => g.items);
  assert.equal(items.length, 1);
  assert.equal(items[0].pozCode, "15.150.1006");
  assert.equal(items[0].netQuantity, 12);
  const placed = new Map((ds.elements ?? []).map((e) => [e.guid, e.matchedPozCode]));
  assert.equal(placed.get("SLAB_TAGGED_0000000001"), "15.150.1006");
});

test("hiçbir kurala uymayan kaplama yalnız açık PozNo etiketiyle, kendi pozuna ayrılmış satıra yerleşir", () => {
  const a = { ...coveringFixture("COV_TAGGED_A00000001", "WRAPPING", ["Akustik_Tekstil"], 4), pozNo: "15.999.0001" };
  const b = { ...coveringFixture("COV_TAGGED_B00000001", "WRAPPING", ["Akustik_Tekstil"], 6), pozNo: "15.999.0002" };
  const items = buildCalmIfcDatasetFromElements([a, b], null, "x.ifc").groups.flatMap((g) => g.items);
  const byPoz = new Map(items.map((i) => [i.pozCode, i.netQuantity]));
  assert.equal(byPoz.get("15.999.0001"), 4);
  assert.equal(byPoz.get("15.999.0002"), 6);
});

test("icmal oluşturucu girdi elemanlarını ve özet nesnesini değiştirmez; yerleşim sonucu yeni eleman kopyalarında döner", () => {
  const slab = Object.freeze({
    id: "1", guid: "SLAB_FROZEN_0000000001", type: "IfcSlab", ifcClass: "IfcSlab", name: "Döşeme", materialLayers: ["Beton_C30"], storey: "Zemin Kat",
    storeySource: "ifc_spatial", volumeM3: 3, formworkM2: 0, rebarKg: 0, quantitySource: "qto", smartCheckStatus: "review",
    measured: true, measurementStatus: "ölçüldü", matchedPozCode: null, isUncovered: false,
  }) as ParsedIfcElement;
  const odd = Object.freeze(coveringFixture("COV_FROZEN_UNMAPPED01", "WRAPPING", ["Akustik_Tekstil"], 2));
  const summary = Object.freeze({ openings: [] });
  const ds = buildCalmIfcDatasetFromElements(Object.freeze([slab, odd]) as ParsedIfcElement[], summary, "x.ifc");
  const byGuid = new Map((ds.elements ?? []).map((e) => [e.guid, e]));
  assert.equal(byGuid.get("SLAB_FROZEN_0000000001")?.matchedPozCode, "15.150.1006");
  assert.equal(byGuid.get("COV_FROZEN_UNMAPPED01")?.isUncovered, true);
  assert.equal(slab.matchedPozCode, null);
  assert.equal(odd.isUncovered, false);
  assert.equal("consistencyReport" in summary, false);
});

test("kapsam dışı sınıflar açıkta kalan sayısına katılmaz, ayrı sayaçta raporlanır", () => {
  const slab = { id: "1", guid: "SLAB_SCOPE_00000000001", type: "IfcSlab", ifcClass: "IfcSlab", name: "Döşeme", materialLayers: ["Beton_C30"], storey: "Zemin Kat", storeySource: "ifc_spatial", volumeM3: 3, formworkM2: 0, rebarKg: 0, quantitySource: "qto", smartCheckStatus: "review", measured: true, measurementStatus: "ölçüldü", matchedPozCode: null, isUncovered: false } as ParsedIfcElement;
  const odd = coveringFixture("COV_SCOPE_UNMAPPED001", "WRAPPING", ["Akustik_Tekstil"], 2);
  const consistencyReport = {
    totalElementCount: 2, measuredElementCount: 2, unmeasuredElementCount: 0, pozMatchedElementCount: 0, pozMatchedRatio: 0,
    uncoveredElementCount: 1, outOfScopeElementCount: 1, typeInheritedElementCount: 0, suppressedAssemblyPartCount: 0,
    highSeverityCount: 0, mediumSeverityCount: 0, findings: [], suppressedAssemblyParts: [],
    uncoveredElements: [{ globalId: "CW_SCOPE_000000000001", ifcClass: "IfcCurtainWall", name: "Cephe", storey: "Zemin Kat", reason: "kapsam dışı", scope: "out_of_scope" as const }],
  };
  const report = buildCalmIfcDatasetFromElements([slab, odd], { consistencyReport }, "x.ifc").consistencyReport;
  assert.equal(report?.uncoveredElementCount, 1);
  assert.equal(report?.outOfScopeElementCount, 1);
  assert.equal(report?.uncoveredElements.find((u) => u.globalId === "COV_SCOPE_UNMAPPED001")?.scope, "in_takeoff");
});

function structuralFixture(guid: string, type: ParsedIfcElement["type"], name: string, materialLayers: string[] | undefined, volumeM3: number): ParsedIfcElement {
  return {
    id: guid, guid, type, ifcClass: type, name, storey: "Zemin Kat", storeySource: "ifc_spatial",
    volumeM3, formworkM2: 0, rebarKg: 0, quantitySource: "qto", smartCheckStatus: "review",
    measured: true, measurementStatus: "ölçüldü", matchedPozCode: null, isUncovered: false,
    ...(materialLayers ? { materialLayers } : {}),
  };
}

test("yapısal elemanlar ada göre değil malzemeye göre sınıflandırılır; beton olmayan malzeme betonarme kalemine girmez", () => {
  const elements = [
    structuralFixture("SLAB_BETON_C30_000001", "IfcSlab", "Döşeme", ["Beton_C30"], 10),
    structuralFixture("WALL_YTONG_25_0000001", "IfcWall", "Duvar", ["Ytong_25cm"], 4),
    structuralFixture("WALL_YTONG_BACA_00001", "IfcWall", "Baca", ["Ytong_Baca"], 1),
    structuralFixture("WALL_PERDE_BETON_0001", "IfcWall", "Perde Duvar 20", ["Beton_C30"], 3),
    structuralFixture("BEAM_WOOD_PINE_000001", "IfcBeam", "Kiriş", ["Wood - pine"], 2),
    structuralFixture("WALL_STONE_MIXED_0001", "IfcWall", "Dış Duvar 20", ["Stone - limestone", "Insulation - plastic hard"], 5),
  ];
  const ds = buildCalmIfcDatasetFromElements(elements, null, "x.ifc");
  const items = new Map(ds.groups.flatMap((g) => g.items).map((i) => [i.id, i.netQuantity]));
  assert.equal(items.get("c30-betonarme"), 13);
  assert.equal(items.get("bims-ytong-duvar"), 5);
  const uncovered = new Map(ds.consistencyReport?.uncoveredElements.map((u) => [u.globalId, u.reason]));
  assert.match(uncovered.get("BEAM_WOOD_PINE_000001") ?? "", /Wood - pine/);
  assert.match(uncovered.get("WALL_STONE_MIXED_0001") ?? "", /katman/);
  assert.equal(uncovered.size, 2);
});

test("malzemesi olmayan yapısal eleman betonarme varsayılmaz ve MISSING_MATERIAL bulgusu üretir", () => {
  const ds = buildCalmIfcDatasetFromElements([structuralFixture("SLAB_NO_MATERIAL_0001", "IfcSlab", "Döşeme", undefined, 7)], null, "x.ifc");
  assert.equal(ds.groups.flatMap((g) => g.items).length, 0);
  const finding = ds.consistencyReport?.findings.find((f) => f.globalId === "SLAB_NO_MATERIAL_0001");
  assert.equal(finding?.code, "MISSING_MATERIAL");
  assert.equal(finding?.severity, "medium");
});

test("C30/37 dışındaki beton sınıfı kalemde kalır ama CONCRETE_CLASS_DIFFERS bulgusuyla işaretlenir", () => {
  const elements = [
    structuralFixture("SLAB_BETON_C35_000001", "IfcSlab", "Döşeme", ["Beton_C35"], 6),
    structuralFixture("SLAB_PREFAB_C45_00001", "IfcSlab", "Döşeme", ["concrete_prefab_C45_55"], 2),
    structuralFixture("COL_RC_NOCLASS_000001", "IfcColumn", "Kolon", ["Reinforced concrete - prefab white"], 1),
  ];
  const ds = buildCalmIfcDatasetFromElements(elements, null, "x.ifc");
  assert.equal(new Map(ds.groups.flatMap((g) => g.items).map((i) => [i.id, i.netQuantity])).get("c30-betonarme"), 9);
  const differs = ds.consistencyReport?.findings.filter((f) => f.code === "CONCRETE_CLASS_DIFFERS").map((f) => f.globalId).sort();
  assert.deepEqual(differs, ["SLAB_BETON_C35_000001", "SLAB_PREFAB_C45_00001"]);
});

test("açıkta kalan icmal kayıtları elemanın kendi miktarını fiyatsız olarak taşır", () => {
  const ds = buildCalmIfcDatasetFromElements([structuralFixture("BEAM_WOOD_QTY_0000001", "IfcBeam", "Kiriş", ["Wood - pine"], 2.4)], null, "x.ifc");
  const record = ds.consistencyReport?.uncoveredElements.find((u) => u.globalId === "BEAM_WOOD_QTY_0000001");
  assert.deepEqual(record?.quantity, { value: 2.4, unit: "m³" });
});
