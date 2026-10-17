import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalibrated202645Dataset,
  buildCalmIfcDatasetFromElements,
} from "./calm-icmal";
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

test("buildCalmIfcDatasetFromElements explodes multi-layer IfcCovering and converts SKIRTINGBOARD to mtül", () => {
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
});
