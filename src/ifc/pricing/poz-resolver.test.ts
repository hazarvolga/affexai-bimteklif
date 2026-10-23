import assert from "node:assert/strict";
import test from "node:test";

import {
  defineManufacturingProfile,
  type ManufacturingProfile,
} from "./manufacturing-profile";
import {
  loadOfficialCsbPozCatalog,
  resolvePoz,
  type PozCatalogEntry,
} from "./poz-resolver";
import {
  getOfficialCsbCatalogById,
  listOfficialCsbCatalogs,
} from "../../server/crawler/csb-pdf-parser";

const catalogEntry = (
  itemCode: string,
  itemName: string,
  unit: string,
  price = "1.00",
): PozCatalogEntry => ({
  catalogId: "test-catalog",
  documentHash: "a".repeat(64),
  validityStart: "2026-01-01",
  validityEnd: "2026-12-31",
  itemCode,
  itemName,
  unit,
  price,
});

const profile = (
  input: Partial<ManufacturingProfile> & Pick<ManufacturingProfile, "profileId" | "proposedPozCode" | "quantityUnit">,
) =>
  defineManufacturingProfile({
    title: input.profileId,
    semantic: { requiredAll: [input.profileId] },
    ...input,
  });

test("manufacturing profile has no price field and rejects hidden hardcoded price input", () => {
  const valid = defineManufacturingProfile({
    profileId: "c30-ready-mix",
    title: "C30/37 hazır beton",
    proposedPozCode: "15.150.1006",
    quantityUnit: "m³",
    semantic: { requiredAll: ["hazır beton"] },
    conditions: { requiredAll: ["C 30/37"] },
  });

  assert.equal("price" in valid, false);
  assert.equal("unitPrice" in valid, false);
  assert.equal("defaultUnitPriceTry" in valid, false);
  assert.throws(
    () =>
      defineManufacturingProfile({
        profileId: "unsafe",
        title: "Unsafe",
        proposedPozCode: "15.150.1006",
        quantityUnit: "m³",
        semantic: { requiredAll: ["beton"] },
        defaultUnitPriceTry: 3450,
      } as never),
    /price/i,
  );
});

test("matches only one exact poz with compatible unit, semantics and conditions", () => {
  const result = resolvePoz(
    defineManufacturingProfile({
      profileId: "c30-ready-mix",
      title: "C30/37 hazır beton",
      proposedPozCode: "15.150.1006",
      quantityUnit: "m³",
      semantic: { requiredAll: ["hazır beton"], forbiddenAny: ["gazbeton"] },
      conditions: { requiredAll: ["C 30/37", "pompa"] },
    }),
    [
      catalogEntry(
        "15.150.1006",
        "Beton santralinde üretilen ve beton pompasıyla basılan, C 30/37 basınç dayanım sınıfında normal hazır beton dökülmesi",
        "m3",
        "3748.06",
      ),
      catalogEntry("15.150.1005", "C 25/30 normal hazır beton dökülmesi", "m³"),
    ],
  );

  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.entry.itemCode, "15.150.1006");
  assert.equal(result.entry.price, "3748.06");
});

test("fails closed when poz is absent, duplicated or profile has no explicit poz", () => {
  const base = profile({
    profileId: "beton",
    proposedPozCode: "15.150.1006",
    quantityUnit: "m³",
  });
  assert.equal(resolvePoz(base, []).reason, "poz_not_found");
  assert.equal(
    resolvePoz(base, [
      catalogEntry("15.150.1006", "beton", "m³"),
      { ...catalogEntry("15.150.1006", "beton", "m³"), catalogId: "second-catalog" },
    ]).reason,
    "ambiguous_poz",
  );
  assert.equal(
    resolvePoz(
      profile({ profileId: "beton", proposedPozCode: null, quantityUnit: "m³" }),
      [catalogEntry("15.150.1006", "beton", "m³")],
    ).reason,
    "missing_explicit_poz",
  );
});

test("rejects legacy gazbeton mapping because catalog is m² while quantity profile is m³", () => {
  const result = resolvePoz(
    profile({
      profileId: "gazbeton",
      proposedPozCode: "15.225.1004",
      quantityUnit: "m³",
      semantic: { requiredAll: ["gazbeton", "duvar"] },
    }),
    [catalogEntry("15.225.1004", "10 cm teçhizatsız gazbeton duvar blokları ile duvar yapılması", "m²")],
  );
  assert.equal(result.reason, "unit_mismatch");
});

test("rejects legacy skirting mapping to PVC sports flooring", () => {
  const result = resolvePoz(
    profile({
      profileId: "parke-supurgelik",
      proposedPozCode: "15.365.1102",
      quantityUnit: "mtül",
      semantic: { requiredAll: ["parke", "süpürgelik"], forbiddenAny: ["spor zemin"] },
    }),
    [catalogEntry("15.365.1102", "PVC esaslı spor zemin malzemeleri ile kapalı spor zeminlerde döşeme kaplaması", "m²")],
  );
  assert.equal(result.reason, "unit_mismatch");
});

test("rejects legacy laminate mapping to PVC floor despite the same m² unit", () => {
  const result = resolvePoz(
    profile({
      profileId: "laminat-parke",
      proposedPozCode: "15.365.1001",
      quantityUnit: "m²",
      semantic: { requiredAll: ["laminat", "parke"], forbiddenAny: ["PVC"] },
    }),
    [catalogEntry("15.365.1001", "2 mm kalınlıkta PVC esaslı yer döşeme malzemeleri ile döşeme kaplaması", "m²")],
  );
  assert.equal(result.reason, "semantic_mismatch");
});

test("rejects legacy XPS mapping to linear PVC rain gutter", () => {
  const result = resolvePoz(
    profile({
      profileId: "xps-yalitim",
      proposedPozCode: "15.315.1004",
      quantityUnit: "m²",
      semantic: { requiredAll: ["XPS", "ısı yalıtımı"], forbiddenAny: ["yağmur oluğu"] },
    }),
    [catalogEntry("15.315.1004", "Ø 100 mm çapında sert PVC yağmur oluğu temini ve yerine tesbiti", "m")],
  );
  assert.equal(result.reason, "unit_mismatch");
});

test("rejects a matching code and unit when a required manufacturing condition is missing", () => {
  const result = resolvePoz(
    defineManufacturingProfile({
      profileId: "porcelain-60x120",
      title: "60 x 120 porselen karo",
      proposedPozCode: "15.390.1005",
      quantityUnit: "m²",
      semantic: { requiredAll: ["porselen karo"] },
      conditions: { requiredAll: ["60 x 120"] },
    }),
    [catalogEntry("15.390.1005", "40 x 40 cm mat sırsız porselen karo ile döşeme kaplaması", "m²")],
  );
  assert.equal(result.reason, "condition_mismatch");
});

test("loads exact official catalog rows through the existing catalog API", () => {
  const entries = loadOfficialCsbPozCatalog(
    { getOfficialCsbCatalogById, listOfficialCsbCatalogs },
    ["csb_2026_mart_insaat_bf"],
  );
  const c30 = entries.filter((entry) => entry.itemCode === "15.150.1006");
  assert.equal(c30.length, 1);
  assert.equal(c30[0].unit, "m³");
  assert.match(c30[0].documentHash, /^[a-f0-9]{64}$/);
  assert.equal(c30[0].catalogId, "csb_2026_mart_insaat_bf");
});
