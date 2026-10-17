import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthoringAdvisory,
  computeFinishLayerShrinkage,
  detectAuthoringSoftware,
} from "./authoring-software-diagnostics";

const header = (fileNameArgs: string, extra = "") => `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME(${fileNameArgs});
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
${extra}
ENDSEC;
END-ISO-10303-21;`;

test("Golden 1: Allplan, FILE_NAME originating_system alanından tespit edilir", () => {
  const text = header(
    "'model.ifc','2026-10-01T10:00:00',('Mimar'),('Ofis'),'ALLPLAN 2026','Allplan','' ",
  );
  const d = detectAuthoringSoftware(text);
  assert.equal(d.family, "allplan");
  assert.equal(d.evidence, "file_name_header");
});

test("Golden 2: Revit, preprocessor/originating alanından tespit edilir", () => {
  const text = header(
    "'a.ifc','2026-10-01T10:00:00',(''),(''),'20230308_1515(x64) - Exporter 23.3.0.0','Autodesk Revit 2023 (ENU)',''",
  );
  assert.equal(detectAuthoringSoftware(text).family, "revit");
});

test("Golden 3: Archicad (Graphisoft) tespit edilir", () => {
  const text = header("'b.ifc','2026-10-01',(''),(''),'Graphisoft IFC Exporter','ARCHICAD-64 27.0.0',''");
  assert.equal(detectAuthoringSoftware(text).family, "archicad");
});

test("Golden 4: başlıkta yoksa IFCAPPLICATION kaydından tespit edilir", () => {
  const text = header(
    "'c.ifc','2026-10-01',(''),(''),'','',''",
    "#5=IFCAPPLICATION(#1,'2026','Allplan 2026','ALLPLAN');",
  );
  const d = detectAuthoringSoftware(text);
  assert.equal(d.family, "allplan");
  assert.equal(d.evidence, "ifc_application");
});

test("Golden 5: bilgi yoksa unknown, tanınmayan yazılım other döner", () => {
  assert.equal(detectAuthoringSoftware(header("'d.ifc','2026-10-01',(''),(''),'','',''")).family, "unknown");
  assert.equal(
    detectAuthoringSoftware(header("'e.ifc','2026-10-01',(''),(''),'x','FooCAD 9',''")).family,
    "other",
  );
});

test("Golden 6: Revit uyarısı model kontrolü önerir ve sabit sapma yüzdesi iddia etmez", () => {
  const adv = buildAuthoringAdvisory({
    family: "revit",
    rawOriginatingSystem: "Autodesk Revit",
    rawPreprocessorVersion: null,
    rawApplicationName: null,
    evidence: "file_name_header",
  });
  assert.equal(adv.tone, "caution");
  const text = JSON.stringify(adv);
  assert.ok(!/%\s?10|%\s?15|10\s?[–-]\s?15/.test(text), "uydurma sapma yüzdesi içermemeli");
  assert.ok(adv.disclaimer.includes("saha gözlemi"));
});

test("Golden 7: Allplan için 'garantili doğru' iddiası yapılmaz", () => {
  const adv = buildAuthoringAdvisory({
    family: "allplan",
    rawOriginatingSystem: "Allplan",
    rawPreprocessorVersion: null,
    rawApplicationName: null,
    evidence: "file_name_header",
  });
  assert.ok(adv.points.some((p) => p.includes("garanti etmez")));
  assert.ok(!/kesin doğru|%100/i.test(JSON.stringify(adv)));
});

test("Golden 8: 10 × 10 m odada 2 cm duvar katmanı → 9,96 × 9,96 = 99,20 m² (−%0,80)", () => {
  const r = computeFinishLayerShrinkage({ lengthM: 10, widthM: 10, wallLayerThicknessCm: 2 });
  assert.ok(r);
  assert.equal(r.netAreaM2, 100);
  assert.equal(r.modeledFloorAreaM2, 99.2);
  assert.equal(r.differenceM2, 0.8);
  assert.equal(r.differencePercent, 0.8);
});

test("Golden 9: geçersiz girdilerde null döner", () => {
  assert.equal(computeFinishLayerShrinkage({ lengthM: 0, widthM: 5, wallLayerThicknessCm: 2 }), null);
  assert.equal(computeFinishLayerShrinkage({ lengthM: 5, widthM: 5, wallLayerThicknessCm: -1 }), null);
  assert.equal(computeFinishLayerShrinkage({ lengthM: 0.02, widthM: 5, wallLayerThicknessCm: 2 }), null);
});

test("Golden 10: parseIfcText özetine kaynak yazılımı taşır ve Calm veri setine uyarı olarak bağlanır", async () => {
  const { parseIfcText } = await import("./parser/legacy-parser");
  const { buildCalmIfcDatasetFromElements } = await import("./calm-icmal");
  const text = header(
    "'f.ifc','2026-10-01',(''),(''),'Exporter','Autodesk Revit 2024',''",
    "#10=IFCWALL('0abc',$,'Duvar',$,$,$,$,$,$);",
  );
  const { elements, summary } = parseIfcText(text);
  assert.equal(summary.authoringSoftware?.family, "revit");
  const dataset = buildCalmIfcDatasetFromElements(elements, summary, "f.ifc");
  assert.equal(dataset.authoringAdvisory?.family, "revit");
  assert.equal(dataset.authoringAdvisory?.tone, "caution");
});

test("Golden 11: gerçek dosya başlıkları — Revit adı yalnız IfcApplication'da, Allplan başlığı boş", async () => {
  const { classifyAuthoringSoftware } = await import("./authoring-software-diagnostics");
  // Ifc4_Revit_STR.ifc gerçek başlığı
  const revit = classifyAuthoringSoftware({
    originatingSystem: "21.0.0.383 - Exporter 21.0.0.383 - Alternate UI 21.0.0.383",
    preprocessorVersion: "The EXPRESS Data Manager Version 5.02.0100.07 : 28 Aug 2013",
    applicationNames: ["Autodesk Revit 2021 (ENU)"],
  });
  assert.equal(revit.family, "revit");
  assert.equal(revit.evidence, "ifc_application");
  // Allplan modeli: originating_system boş, preprocessor ODA
  const allplan = classifyAuthoringSoftware({
    originatingSystem: null,
    preprocessorVersion: "ODA SDAI 25.4",
    applicationNames: ["Allplan"],
  });
  assert.equal(allplan.family, "allplan");
  assert.equal(
    classifyAuthoringSoftware({ originatingSystem: null, preprocessorVersion: null, applicationNames: [] }).family,
    "unknown",
  );
});

test("Golden 12: sunucu (Python) yolu — ham başlık artifact'a ve Calm veri setine uyarı olarak taşınır", async () => {
  const { buildIfcSmartCheckEvidenceArtifact } = await import("./smartcheck-evidence");
  const { buildCalmIfcDatasetFromArtifact } = await import("./calm-icmal");
  const summary = {
    parseStatus: "failed",
    extractionMode: "demo_estimate",
    totalElements: 0,
    elementsWithPozNoCount: 0,
    elementsMissingPozNoCount: 0,
    trPsetCsb: { source: null },
    authoringSoftwareRaw: {
      originatingSystem: "21.0.0.383 - Exporter 21.0.0.383",
      preprocessorVersion: null,
      applicationNames: ["Autodesk Revit 2021 (ENU)"],
    },
  };
  const artifact = buildIfcSmartCheckEvidenceArtifact([], summary as never, { fileName: "m.ifc" } as never);
  assert.equal(artifact.summary.authoringSoftware?.family, "revit");
  const dataset = buildCalmIfcDatasetFromArtifact(artifact);
  assert.equal(dataset.authoringAdvisory?.family, "revit");
  assert.equal(dataset.authoringAdvisory?.tone, "caution");
});
