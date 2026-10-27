import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { inspectDocument, parseDocument } from "./spreadsheet-parser";
import { validateRows } from "./normalize";
import { parseQuoteXlsx } from "../../lib/quote-xlsx";

describe("Turkish contractor Excel multi-archetype adapter & corpus", () => {
  it("Archetype A (flat_table): parses antet title block, row-16 merged headers, and positionCode description fallback", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("İcmal");
    ws.getCell("B2").value = "İcmal Metraj Kaba ve İnce Yapı";
    ws.mergeCells("B2:H2");
    ws.getCell("B6").value = "Proje: 2026_45";
    ws.getCell("B16").value = "Malzeme Pozu";
    ws.mergeCells("B16:C16");
    ws.getCell("D16").value = "Poz Açıklaması";
    ws.mergeCells("D16:E16");
    ws.getCell("F16").value = "Birim";
    ws.mergeCells("F16:G16");
    ws.getCell("H16").value = "Net Metraj";

    // Row 17: Malzeme Pozu filled, Poz Açıklaması blank
    ws.getCell("B17").value = "Astar_2mm";
    ws.mergeCells("B17:C17");
    ws.getCell("F17").value = "m²";
    ws.mergeCells("F17:G17");
    ws.getCell("H17").value = 659.852;

    // Row 18: Both filled
    ws.getCell("B18").value = "Beton_C25";
    ws.mergeCells("B18:C18");
    ws.getCell("D18").value = "Beton Duvar";
    ws.mergeCells("D18:E18");
    ws.getCell("F18").value = "m²";
    ws.mergeCells("F18:G18");
    ws.getCell("H18").value = 32.952;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const preview = await inspectDocument(buffer, "xlsx");
    const sheet = preview.sheets[0]!;

    assert.equal(sheet.detectedArchetype, "flat_table");
    assert.equal(sheet.suggestedMapping.headerRow, 16);
    assert.equal(sheet.suggestedMapping.positionCode, "Malzeme Pozu");
    assert.equal(sheet.suggestedMapping.description, "Poz Açıklaması");
    assert.equal(sheet.suggestedMapping.unit, "Birim");
    assert.equal(sheet.suggestedMapping.quantity, "Net Metraj");

    const parsed = await parseDocument(buffer, "xlsx", {});
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]?.rawPositionCode, "Astar_2mm");
    assert.equal(parsed.rows[0]?.rawDescription, "Astar_2mm");
    assert.equal(parsed.rows[1]?.rawDescription, "Beton Duvar");

    const quoteRes = await parseQuoteXlsx(buffer, "icmal.xlsx");
    assert.equal(quoteRes.errors.length, 0);
    assert.equal(quoteRes.totalImported, 2);
  });

  it("Archetype B (multi_header_pivot): parses 2-row storey pivot headers, shifted merged data columns, and multi-unit continuation rows", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Kat İcmal");
    ws.getCell("A2").value = "İcmal Metrajı - Katlara Göre";
    ws.getCell("A15").value = "Poz No";
    ws.mergeCells("A15:B16");
    ws.getCell("C15").value = "İmalatın Tanımı";
    ws.mergeCells("C15:D16");
    ws.getCell("F15").value = "Birim";
    ws.mergeCells("F15:G16");
    ws.getCell("I15").value = "Katlar";
    ws.mergeCells("I15:L15");
    ws.getCell("I16").value = "B01-01";
    ws.getCell("J16").value = "K01-01";
    ws.getCell("K16").value = "K02-01";
    ws.getCell("L16").value = "Toplam";

    // Row 18: Data with shifted description (col D) and unit (col G)
    ws.getCell("A18").value = "Beton_C30";
    ws.getCell("D18").value = "Şantiyede Beton Dökümü";
    ws.getCell("G18").value = "m²";
    ws.getCell("I18").value = 799.312;
    ws.getCell("J18").value = 799.312;
    ws.getCell("L18").value = 1598.624;

    // Row 19: Multi-unit continuation row (blank Poz/Tanım, different unit m³)
    ws.getCell("G19").value = "m³";
    ws.getCell("I19").value = 0.936;
    ws.getCell("L19").value = 0.936;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const preview = await inspectDocument(buffer, "xlsx");
    const sheet = preview.sheets[0]!;

    assert.equal(sheet.detectedArchetype, "multi_header_pivot");
    assert.equal(sheet.suggestedMapping.headerRow, 16);
    assert.equal(sheet.suggestedMapping.quantity, "Toplam");

    const parsed = await parseDocument(buffer, "xlsx", {});
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]?.rawPositionCode, "Beton_C30");
    assert.equal(parsed.rows[0]?.rawUnit, "m²");
    assert.equal(parsed.rows[0]?.rawQuantity, "1598.624");
    assert.equal(parsed.rows[1]?.rawUnit, "m³");
    assert.equal(parsed.rows[1]?.rawQuantity, "0.936");
    assert.match(parsed.rows[1]?.rawDescription ?? "", /Şantiyede Beton Dökümü/);

    const quoteRes = await parseQuoteXlsx(buffer, "kat-icmal.xlsx");
    assert.equal(quoteRes.errors.length, 0);
    assert.equal(quoteRes.totalImported, 2);
  });

  it("Archetype C (repeating_block_boq): extracts repeating TOKİ/Kamu Poz blocks and Genel Toplam quantities", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("TOKİ Kaba");
    ws.getCell("A2").value = "TOKİ - KABA YAPI METRAJI";
    ws.getCell("A13").value = "Açıklama:";
    ws.getCell("D13").value = "BU LİSTE SADECE KABA MALZEMELERİ HESAPLAR ( BOŞLUKLAR HESABA KATILMIŞTIR ) NET METRAJ HESAPLANMIŞTIR";

    // Block 1 (Row 15..20)
    ws.getCell("A15").value = "POZ NO";
    ws.getCell("D15").value = "Beton_C25";
    ws.getCell("L15").value = "BİRİMİ";
    ws.getCell("P15").value = "m²";
    ws.getCell("A16").value = "İMALATIN ADI";
    ws.getCell("D16").value = "Beton Duvar";
    ws.getCell("L16").value = "METRAJ NO";
    ws.getCell("A17").value = "ID";
    ws.getCell("D17").value = "İSİM";
    ws.getCell("F17").value = "ADET";
    ws.getCell("G17").value = "EN";
    ws.getCell("I17").value = "BOY";
    ws.getCell("J17").value = "YÜKS.";
    ws.getCell("L17").value = "AZI";
    ws.getCell("P17").value = "ÇOĞU";
    ws.getCell("D19").value = "Ara Toplam:";
    ws.getCell("N19").value = 32.952;
    ws.getCell("Q19").value = "m²";
    ws.getCell("D20").value = "Genel Toplam:";
    ws.getCell("N20").value = 32.952;
    ws.getCell("Q20").value = "m²";

    // Block 2 (Row 22..26)
    ws.getCell("A22").value = "POZ NO";
    ws.getCell("D22").value = "C30/37";
    ws.getCell("L22").value = "BİRİMİ";
    ws.getCell("P22").value = "m³";
    ws.getCell("A23").value = "İMALATIN ADI";
    ws.getCell("D23").value = "Şantiyede Beton Dökümü";
    ws.getCell("L23").value = "METRAJ NO";
    ws.getCell("D26").value = "Genel Toplam:";
    ws.getCell("N26").value = 133.155;
    ws.getCell("Q26").value = "m³";

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const preview = await inspectDocument(buffer, "xlsx");
    const sheet = preview.sheets[0]!;

    assert.equal(sheet.detectedArchetype, "repeating_block_boq");
    assert.equal(sheet.repeatingBlockCount, 2);

    const parsed = await parseDocument(buffer, "xlsx", {});
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]?.rawPositionCode, "Beton_C25");
    assert.equal(parsed.rows[0]?.rawDescription, "Beton Duvar");
    assert.equal(parsed.rows[0]?.rawUnit, "m²");
    assert.equal(parsed.rows[0]?.rawQuantity, "32.952");
    assert.equal(parsed.rows[1]?.rawPositionCode, "C30/37");
    assert.equal(parsed.rows[1]?.rawQuantity, "133.155");

    const quoteRes = await parseQuoteXlsx(buffer, "toki-kaba.xlsx");
    assert.equal(quoteRes.errors.length, 0);
    assert.equal(quoteRes.totalImported, 2);
  });

  it("Archetype D (hybrid_summary_and_blocks): supports both top summary table and bottom repeating Poz blocks without cross-contamination", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("TOKİ İnce Hibrit");

    // Top summary table at Row 18..20 where "Malzeme" spans A18:C18 and unit is in col C
    ws.getCell("A18").value = "Malzeme";
    ws.mergeCells("A18:C18");
    ws.getCell("D18").value = "B01-01";
    ws.getCell("W18").value = "Toplam";

    ws.getCell("A19").value = "Astar_2mm";
    ws.getCell("C19").value = "m²";
    ws.getCell("D19").value = 622.43;
    ws.getCell("W19").value = 654.59;

    ws.getCell("A20").value = "Laminat_Parke";
    ws.getCell("C20").value = "m²";
    ws.getCell("D20").value = 238.89;
    ws.getCell("W20").value = 881.47;

    // Bottom repeating Poz block at Row 23..27
    ws.getCell("B23").value = "POZ NO:";
    ws.getCell("G23").value = "Astar_2mm";
    ws.getCell("V23").value = "BİRİMİ";
    ws.getCell("Z23").value = "m²";
    ws.getCell("B24").value = "İMALATIN ADI:";
    ws.getCell("G24").value = "İç Cephe Astar Uygulaması";
    ws.getCell("V24").value = "METRAJ NO";
    ws.getCell("F27").value = "Genel Toplam:";
    ws.getCell("V27").value = 654.59;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const preview = await inspectDocument(buffer, "xlsx");
    const sheet = preview.sheets[0]!;

    assert.equal(sheet.detectedArchetype, "hybrid_summary_and_blocks");
    assert.equal(sheet.repeatingBlockCount, 1);

    const parsedSummary = await parseDocument(buffer, "xlsx", sheet.suggestedMapping);
    assert.equal(parsedSummary.rows.length, 2);
    assert.equal(parsedSummary.rows[0]?.rawDescription, "Astar_2mm");
    assert.equal(parsedSummary.rows[0]?.rawUnit, "m²");
    assert.equal(parsedSummary.rows[0]?.rawQuantity, "654.59");

    const parsedBlocks = await parseDocument(buffer, "xlsx", {
      ...sheet.suggestedMapping,
      tableMode: "repeating_blocks",
    });
    assert.equal(parsedBlocks.rows.length, 1);
    assert.equal(parsedBlocks.rows[0]?.rawPositionCode, "Astar_2mm");
    assert.equal(parsedBlocks.rows[0]?.rawDescription, "İç Cephe Astar Uygulaması");
    assert.equal(parsedBlocks.rows[0]?.rawQuantity, "654.59");
  });

  it("Real-world local corpus (/Users/hazarvolgaekiz/dev/lab/ALLPLAN-Eklentiler): dynamically validates all contractor .xlsx files when present", async () => {
    const corpusDir = path.resolve(process.cwd(), "../../../lab/ALLPLAN-Eklentiler");
    if (!fs.existsSync(corpusDir)) return;

    const files = fs
      .readdirSync(corpusDir)
      .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
      .sort();

    assert.ok(files.length >= 4, `Expected at least 4 real contractor Excel files in ${corpusDir}`);

    for (const fileName of files) {
      const fullPath = path.join(corpusDir, fileName);
      const content = fs.readFileSync(fullPath);

      const preview = await inspectDocument(content, "xlsx");
      const sheet = preview.sheets[0];
      assert.ok(sheet, `${fileName}: preview sheet must exist`);

      const parsed = await parseDocument(content, "xlsx", sheet.suggestedMapping);
      assert.ok(parsed.rows.length > 0, `${fileName}: SmartCheck must extract > 0 rows`);

      const validated = validateRows(parsed.rows);
      const validCount = validated.filter(
        (v) => v.normalized.quantity !== null && v.normalized.quantity > 0 && v.normalized.unit !== null,
      ).length;
      assert.ok(validCount > 0, `${fileName}: SmartCheck must have > 0 validated rows with unit and positive quantity`);

      const quoteResult = await parseQuoteXlsx(content, fileName);
      assert.equal(quoteResult.errors.length, 0, `${fileName}: Quote import must have 0 errors`);
      assert.ok(quoteResult.totalImported > 0, `${fileName}: Quote import must extract > 0 items`);
    }
  });
});
