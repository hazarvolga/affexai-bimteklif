#!/usr/bin/env tsx
/**
 * scripts/ifc-parity-compare.ts
 *
 * Compares output of Legacy IFC parser and Python IfcOpenShell extractor
 * across entity counts, volumes, property/qto recognitions and TR compliance.
 *
 * Usage:
 *   pnpm tsx scripts/ifc-parity-compare.ts --file <path-to-ifc>
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseIfcText } from "../src/ifc/parser/legacy-parser";
import { runPythonIfcExtractor } from "../src/smartcheck/import/ifc-python-runner";

async function main() {
  const fileArgIdx = process.argv.indexOf("--file");
  const filePath = fileArgIdx !== -1 && process.argv[fileArgIdx + 1]
    ? path.resolve(process.argv[fileArgIdx + 1])
    : path.resolve(process.cwd(), "harici-kaynaklar/klasorler-ve-ornekler/ifc-document-sample/e-proje_4x3.ifc");

  if (!existsSync(filePath)) {
    console.error(`ERROR: IFC file not found at: ${filePath}`);
    console.error(`Usage: pnpm tsx scripts/ifc-parity-compare.ts --file <path>`);
    process.exit(1);
  }

  console.log(`\n===============================================================`);
  console.log(` TeklifPro IFC Parser Parity Comparison`);
  console.log(` Target File: ${path.basename(filePath)} (${(readFileSync(filePath).length / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`===============================================================\n`);

  // 1. Run Legacy Parser
  console.log(`[1/2] Running Legacy TypeScript Parser...`);
  const startLegacy = Date.now();
  const fileText = readFileSync(filePath, "utf8");
  const legacyResult = parseIfcText(fileText);
  const legacyDuration = Date.now() - startLegacy;
  console.log(`  -> Finished in ${legacyDuration}ms. Found ${legacyResult.elements.length} elements.`);

  // 2. Run Python IfcOpenShell Extractor
  console.log(`[2/2] Running Python IfcOpenShell Extractor...`);
  const startPython = Date.now();
  const pythonResult = await runPythonIfcExtractor({
    inputPath: filePath,
    fileName: path.basename(filePath),
  });
  const pythonDuration = Date.now() - startPython;
  console.log(`  -> Finished in ${pythonDuration}ms. Found ${pythonResult.elements.length} elements.\n`);

  // 3. Comparison Metrics
  const ls = legacyResult.summary;
  const ps = pythonResult.summary;

  const rows = [
    { metric: "Total Elements", legacy: ls.totalElements, python: ps.totalElements },
    { metric: "Beam Count (IfcBeam)", legacy: ls.beamCount, python: ps.beamCount },
    { metric: "Column Count (IfcColumn)", legacy: ls.columnCount, python: ps.columnCount },
    { metric: "Slab Count (IfcSlab)", legacy: ls.slabCount, python: ps.slabCount },
    { metric: "Wall Count (IfcWall)", legacy: ls.wallCount, python: ps.wallCount },
    { metric: "Rebar Count (IfcReinforcingBar)", legacy: ls.rebarCount, python: ps.rebarCount },
    { metric: "Total Volume (m³)", legacy: ls.totalVolumeM3.toFixed(2), python: ps.totalVolumeM3.toFixed(2) },
    { metric: "Total Formwork (m²)", legacy: ls.totalFormworkM2.toFixed(2), python: ps.totalFormworkM2.toFixed(2) },
    { metric: "Elements With PozNo", legacy: ls.elementsWithPozNoCount, python: ps.elementsWithPozNoCount },
    { metric: "TR Pset TAKS", legacy: ls.trPsetCsb?.taks ?? "-", python: ps.trPsetCsb?.taks ?? "-" },
    { metric: "TR Pset KAKS", legacy: ls.trPsetCsb?.kaks ?? "-", python: ps.trPsetCsb?.kaks ?? "-" },
  ];

  console.log(`| Metrik | Legacy Parser | IfcOpenShell | Durum |`);
  console.log(`|---|---|---|---|`);
  for (const r of rows) {
    const match = String(r.legacy) === String(r.python);
    const status = match ? "✅ Eşit" : "⚠️ Farklı";
    console.log(`| ${r.metric} | ${r.legacy} | ${r.python} | ${status} |`);
  }

  console.log(`\nPerformans:`);
  console.log(`- Legacy Parser Süresi: ${legacyDuration}ms`);
  console.log(`- IfcOpenShell Süresi: ${pythonDuration}ms`);
  console.log(`- IfcOpenShell Sürümü: ${pythonResult.parserVersion}\n`);
}

main().catch((err) => {
  console.error("Parity comparison failed with error:", err);
  process.exit(1);
});
