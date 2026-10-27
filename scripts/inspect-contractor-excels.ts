/**
 * Müteahhit Excel Korpus Tarayıcı ve Teşhis Aracı (Katman 4).
 *
 * Kullanım:
 *   npm run excel:corpus
 *   npm run excel:corpus -- /özel/klasör/yolu
 *
 * Yeni müteahhit Excel dosyaları (/Users/hazarvolgaekiz/dev/lab/ALLPLAN-Eklentiler
 * veya belirtilen klasöre) eklendiğinde tüm dosyaları otomatik tarar, arketipini
 * (flat_table, multi_header_pivot, repeating_block_boq, hybrid_summary_and_blocks)
 * belirler ve hem SmartCheck hem de Teklif (CreateQuote) içe aktarma sonuçlarını raporlar.
 */
import fs from "node:fs";
import path from "node:path";
import { inspectDocument, parseDocument } from "../src/smartcheck/import/spreadsheet-parser";
import { validateRows } from "../src/smartcheck/import/normalize";
import { parseQuoteXlsx } from "../src/lib/quote-xlsx";

const DEFAULT_CORPUS_DIR = path.resolve(process.cwd(), "../../../lab/ALLPLAN-Eklentiler");

async function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CORPUS_DIR;
  if (!fs.existsSync(targetDir)) {
    console.error(`Klasör bulunamadı: ${targetDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
    .sort();

  console.log(`\n================================================================================`);
  console.log(`MÜTEAHHİT EXCEL KORPUS TARAMASI (${files.length} dosya)`);
  console.log(`Klasör: ${targetDir}`);
  console.log(`================================================================================\n`);

  let allPassed = true;

  for (const fileName of files) {
    const fullPath = path.join(targetDir, fileName);
    const content = fs.readFileSync(fullPath);

    try {
      const preview = await inspectDocument(content, "xlsx");
      const sheet = preview.sheets[0];
      if (!sheet) {
        console.log(`[HATA] ${fileName}: Çalışma sayfası bulunamadı.`);
        allPassed = false;
        continue;
      }

      const parsedAuto = await parseDocument(content, "xlsx", sheet.suggestedMapping);
      const validatedAuto = validateRows(parsedAuto.rows);
      const validQtyCount = validatedAuto.filter(
        (v) => v.normalized.quantity !== null && v.normalized.quantity > 0 && v.normalized.unit !== null,
      ).length;

      let hybridBlocksCount = 0;
      if (sheet.detectedArchetype === "hybrid_summary_and_blocks") {
        const parsedBlocks = await parseDocument(content, "xlsx", {
          ...sheet.suggestedMapping,
          tableMode: "repeating_blocks",
        });
        hybridBlocksCount = parsedBlocks.rows.length;
      }

      const quoteResult = await parseQuoteXlsx(content, fileName);

      console.log(`📄 Dosya: ${fullPath}`);
      console.log(`   ├─ Boyut & Şekil      : ${(content.byteLength / 1024).toFixed(1)} KB | ${sheet.rowCount} dolu satır × ${sheet.columnCount} sütun`);
      console.log(`   ├─ Tespit Arketipi    : ${sheet.detectedArchetype ?? "flat_table"}${sheet.repeatingBlockCount ? ` (${sheet.repeatingBlockCount} tekrarlayan poz bloğu)` : ""}`);
      console.log(`   ├─ Önerilen Eşleme    : Başlık Satırı=${sheet.suggestedMapping.headerRow ?? 1} | Poz="${sheet.suggestedMapping.positionCode ?? "-"}" | Açıklama="${sheet.suggestedMapping.description ?? "-"}" | Birim="${sheet.suggestedMapping.unit ?? "-"}" | Miktar="${sheet.suggestedMapping.quantity ?? "-"}"`);
      console.log(`   ├─ SmartCheck Çıktısı : ${parsedAuto.rows.length} kalem çıkarıldı (${validQtyCount} geçerli birim+miktar)${hybridBlocksCount ? ` | Tekrarlayan Blok Modu: ${hybridBlocksCount} poz bloğu` : ""}`);
      console.log(`   ├─ Teklif İçe Aktarım : ${quoteResult.totalImported} teklif kalemi (${quoteResult.errors.length} hata)`);
      if (parsedAuto.rows[0]) {
        const first = parsedAuto.rows[0];
        console.log(`   └─ Örnek İlk Kalem    : [${first.rawPositionCode || "-"}] ${first.rawDescription} -> ${first.rawQuantity} ${first.rawUnit} (${first.sourceCellRange})\n`);
      }

      if (parsedAuto.rows.length === 0 || quoteResult.totalImported === 0 || quoteResult.errors.length > 0) {
        allPassed = false;
      }
    } catch (error) {
      allPassed = false;
      console.error(`❌ [HATA] ${fullPath}:`, error instanceof Error ? error.message : error);
    }
  }

  if (!allPassed) {
    process.exit(1);
  }
}

void main();
