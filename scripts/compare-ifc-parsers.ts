#!/usr/bin/env tsx
/**
 * scripts/compare-ifc-parsers.ts
 *
 * Parity and benchmarking tool comparing the Legacy TypeScript IFC parser
 * against the Python IfcOpenShell extractor.
 *
 * Usage:
 *   pnpm tsx scripts/compare-ifc-parsers.ts [--file <path-to-ifc>]
 *   pnpm tsx scripts/compare-ifc-parsers.ts --synthetic-100mb
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseIfcText } from "../src/ifc/parser/legacy-parser";
import { runPythonIfcExtractor } from "../src/smartcheck/import/ifc-python-runner";

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function generateSynthetic100MbIfc(targetPath: string): number {
  console.log(`Generating ~100MB synthetic IFC file at ${targetPath}...`);
  const lines: string[] = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    "FILE_NAME('synthetic_100mb.ifc','2026-10-10T12:00:00',('TeklifPro'),('Platform'),'','','');",
    "FILE_SCHEMA(('IFC2X3'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCPROJECT('0000000000000000000001',$,'Synthetic 100MB Project',$,$,$,$,$,$);",
    "#2=IFCSITE('0000000000000000000002',$,'Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);",
    "#3=IFCBUILDING('0000000000000000000003',$,'Building',$,$,$,$,$,.ELEMENT.,$,$,$);",
    "#4=IFCBUILDINGSTOREY('0000000000000000000004',$,'Zemin Kat',$,$,$,$,$,.ELEMENT.,3.0);",
  ];

  let currentId = 10;
  // Each element group is ~500 bytes. ~200,000 groups would be ~100MB.
  // We can write in chunks to target ~100MB accurately.
  const targetSizeBytes = 100 * 1024 * 1024;
  let currentBytes = 0;

  for (const l of lines) {
    currentBytes += Buffer.byteLength(l + "\n");
  }

  // Generate repetitive structural elements until target size reached
  const elementTypes = ["IFCCOLUMN", "IFCBEAM", "IFCSLAB", "IFCWALL"];
  const chunk: string[] = [];

  while (currentBytes < targetSizeBytes) {
    const elemId = currentId++;
    const qtoId = currentId++;
    const relId = currentId++;
    const propId = currentId++;
    const type = elementTypes[elemId % elementTypes.length];
    const guid = `G${elemId.toString().padStart(21, "0")}`;

    const eLine = `#${elemId}=${type}('${guid}',$,'Elem-${elemId}',$,$,$,$,$,$);`;
    const pLine = `#${propId}=IFCQUANTITYVOLUME('NetVolume',$,$,1.25,$);`;
    const qLine = `#${qtoId}=IFCELEMENTQUANTITY('Q${elemId.toString().padStart(21, "0")}',$,'BaseQuantities',$,$,(#${propId}));`;
    const rLine = `#${relId}=IFCRELDEFINESBYPROPERTIES('R${elemId.toString().padStart(21, "0")}',$,$,$,(#${elemId}),#${qtoId});`;

    chunk.push(eLine, pLine, qLine, rLine);
    currentBytes += Buffer.byteLength(eLine + "\n" + pLine + "\n" + qLine + "\n" + rLine + "\n");

    if (chunk.length >= 10000) {
      lines.push(...chunk);
      chunk.length = 0;
    }
  }

  if (chunk.length > 0) {
    lines.push(...chunk);
  }

  lines.push("ENDSEC;");
  lines.push("END-ISO-10303-21;");

  const fullContent = lines.join("\n");
  writeFileSync(targetPath, fullContent, "utf8");
  return fullContent.length;
}

export async function runSyntheticMemoryBenchmark(): Promise<{
  fileSizeMb: number;
  initialRssMb: number;
  peakRssMb: number;
  initialHeapMb: number;
  peakHeapMb: number;
  memLimitSafe: boolean;
  heapLimitSafe: boolean;
}> {
  console.log(`\n===============================================================`);
  console.log(` TeklifPro IFC Worker 100 MB RSS Memory Benchmark`);
  console.log(` Target limits: RSS < 2048 MB (Docker mem_limit), Heap < 1024 MB`);
  console.log(`===============================================================\n`);

  const tmpDir = path.join(os.tmpdir(), `teklifpro-benchmark-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, "synthetic_100mb.ifc");

  try {
    if (global.gc) global.gc();
    const initialMem = process.memoryUsage();
    console.log(`Baseline Memory: RSS=${formatBytes(initialMem.rss)}, HeapUsed=${formatBytes(initialMem.heapUsed)}`);

    const sizeBytes = generateSynthetic100MbIfc(tmpFile);
    console.log(`Created synthetic IFC file: ${formatBytes(sizeBytes)}`);

    const startMem = process.memoryUsage();
    console.log(`Memory after file generation: RSS=${formatBytes(startMem.rss)}, HeapUsed=${formatBytes(startMem.heapUsed)}`);

    console.log(`Running Legacy Parser on 100 MB file...`);
    const startLegacy = Date.now();
    const ifcContent = readFileSync(tmpFile, "utf8");
    const parsedLegacy = parseIfcText(ifcContent);
    const legacyDuration = Date.now() - startLegacy;

    const legacyMem = process.memoryUsage();
    console.log(`Legacy Parser parsed ${parsedLegacy.elements.length} elements in ${legacyDuration}ms.`);
    console.log(`Memory after Legacy parse: RSS=${formatBytes(legacyMem.rss)}, HeapUsed=${formatBytes(legacyMem.heapUsed)}`);

    const peakRssMb = legacyMem.rss / (1024 * 1024);
    const peakHeapMb = legacyMem.heapUsed / (1024 * 1024);

    const memLimitSafe = peakRssMb < 2048;
    const heapLimitSafe = peakHeapMb < 1024;

    console.log(`\n---------------------------------------------------------------`);
    console.log(`Benchmark Sonuçları:`);
    console.log(`- Dosya Boyutu: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`- Peak RSS: ${peakRssMb.toFixed(2)} MB (Limit: 2048 MB) -> ${memLimitSafe ? "✅ GÜVENLİ" : "❌ AŞILDI"}`);
    console.log(`- Peak Heap: ${peakHeapMb.toFixed(2)} MB (Limit: 1024 MB) -> ${heapLimitSafe ? "✅ GÜVENLİ" : "❌ AŞILDI"}`);
    console.log(`---------------------------------------------------------------\n`);

    return {
      fileSizeMb: sizeBytes / (1024 * 1024),
      initialRssMb: initialMem.rss / (1024 * 1024),
      peakRssMb,
      initialHeapMb: initialMem.heapUsed / (1024 * 1024),
      peakHeapMb,
      memLimitSafe,
      heapLimitSafe,
    };
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

export async function compareIfcParsers(filePath: string) {
  if (!existsSync(filePath)) {
    console.error(`ERROR: IFC file not found at: ${filePath}`);
    process.exit(1);
  }

  const fileSizeMb = (readFileSync(filePath).length / (1024 * 1024)).toFixed(2);
  console.log(`\n===============================================================`);
  console.log(` TeklifPro IFC Parser Parity Comparison`);
  console.log(` Target File: ${path.basename(filePath)} (${fileSizeMb} MB)`);
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

  const ls = legacyResult.summary;
  const ps = pythonResult.summary;

  const rows = [
    { category: "Genel", metric: "Toplam Eleman", legacy: ls.totalElements, python: ps.totalElements, unit: "adet" },
    { category: "Eleman Sayısı", metric: "Kiriş (IfcBeam)", legacy: ls.beamCount, python: ps.beamCount, unit: "adet" },
    { category: "Eleman Sayısı", metric: "Kolon (IfcColumn)", legacy: ls.columnCount, python: ps.columnCount, unit: "adet" },
    { category: "Eleman Sayısı", metric: "Döşeme (IfcSlab)", legacy: ls.slabCount, python: ps.slabCount, unit: "adet" },
    { category: "Eleman Sayısı", metric: "Perde / Duvar (IfcWall)", legacy: ls.wallCount, python: ps.wallCount, unit: "adet" },
    { category: "Eleman Sayısı", metric: "Donatı (IfcReinforcingBar)", legacy: ls.rebarCount, python: ps.rebarCount, unit: "adet" },
    { category: "Hacim Dağılımı", metric: "Kiriş Hacmi", legacy: ls.beamVolumeM3.toFixed(2), python: ps.beamVolumeM3.toFixed(2), unit: "m³" },
    { category: "Hacim Dağılımı", metric: "Kolon Hacmi", legacy: ls.columnVolumeM3.toFixed(2), python: ps.columnVolumeM3.toFixed(2), unit: "m³" },
    { category: "Hacim Dağılımı", metric: "Döşeme Hacmi", legacy: ls.slabVolumeM3.toFixed(2), python: ps.slabVolumeM3.toFixed(2), unit: "m³" },
    { category: "Hacim Dağılımı", metric: "Duvar Hacmi", legacy: ls.wallVolumeM3.toFixed(2), python: ps.wallVolumeM3.toFixed(2), unit: "m³" },
    { category: "Toplam Hacim", metric: "Toplam Beton Hacmi", legacy: ls.totalVolumeM3.toFixed(2), python: ps.totalVolumeM3.toFixed(2), unit: "m³" },
    { category: "Kalıp Alanı", metric: "Toplam Kalıp Alanı (Ön Metraj)", legacy: ls.totalFormworkM2.toFixed(2), python: ps.totalFormworkM2.toFixed(2), unit: "m²" },
    { category: "Donatı Ağırlığı", metric: "Toplam Donatı Ağırlığı", legacy: ls.totalRebarKg.toFixed(2), python: ps.totalRebarKg.toFixed(2), unit: "kg" },
    { category: "Poz Bilgisi", metric: "Poz No Olan Elemanlar", legacy: ls.elementsWithPozNoCount, python: ps.elementsWithPozNoCount, unit: "adet" },
    { category: "e-PYS Uyum", metric: "TR Pset TAKS", legacy: ls.trPsetCsb?.taks ?? "-", python: ps.trPsetCsb?.taks ?? "-", unit: "" },
    { category: "e-PYS Uyum", metric: "TR Pset KAKS", legacy: ls.trPsetCsb?.kaks ?? "-", python: ps.trPsetCsb?.kaks ?? "-", unit: "" },
  ];

  console.log(`| Kategori | Metrik | Legacy Parser | IfcOpenShell | Birim | Durum |`);
  console.log(`|---|---|---|---|---|---|`);
  let totalDivergences = 0;
  for (const r of rows) {
    const match = String(r.legacy) === String(r.python);
    if (!match) totalDivergences++;
    const status = match ? "✅ Eşit" : "⚠️ Farklı";
    console.log(`| ${r.category} | ${r.metric} | ${r.legacy} | ${r.python} | ${r.unit} | ${status} |`);
  }

  console.log(`\nPerformans & Parite Durumu:`);
  console.log(`- Legacy Parser Çalışma Süresi: ${legacyDuration}ms`);
  console.log(`- IfcOpenShell Çalışma Süresi: ${pythonDuration}ms`);
  console.log(`- IfcOpenShell Sürümü: ${pythonResult.parserVersion}`);
  console.log(`- Genel Parite Durumu: ${totalDivergences === 0 ? "✅ TAM EŞLEŞME (MATCH)" : `⚠️ ${totalDivergences} METRİKTE FARK (DIVERGENCE)`}\n`);
}

async function main() {
  if (process.argv.includes("--synthetic-100mb") || process.argv.includes("--synthetic")) {
    await runSyntheticMemoryBenchmark();
    return;
  }

  const fileArgIdx = process.argv.indexOf("--file");
  const filePath = fileArgIdx !== -1 && process.argv[fileArgIdx + 1]
    ? path.resolve(process.argv[fileArgIdx + 1])
    : path.resolve(process.cwd(), "harici-kaynaklar/klasorler-ve-ornekler/ifc-document-sample/e-proje_4x3.ifc");

  await compareIfcParsers(filePath);
}

if (process.argv[1] && process.argv[1].endsWith("compare-ifc-parsers.ts")) {
  main().catch((err) => {
    console.error("Comparison failed:", err);
    process.exit(1);
  });
}
