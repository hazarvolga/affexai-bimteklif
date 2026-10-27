/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 *
 * Dinamik ExcelJS (.xlsx) müşteri okuyucu, şablon üretici ve dışa aktarıcı.
 * T45 paket boyutu bütçesini korumak için `exceljs` yalnız bu modül çağrıldığında yüklenir.
 */

import {
  MAX_CLIENT_IMPORT_BYTES,
  parseClientRows,
  normalizeImportedClientStage,
  type ClientColumnMapping,
  type ClientImportResult,
  type ClientSheetCell,
} from "./client-excel-import";
import { CLIENT_STAGE_MAP, formatClientNotesForExport } from "./client-notes";
import { isLegacyXls, LEGACY_XLS_MESSAGE } from "./spreadsheet-format";
import { neutralizeSpreadsheetFormula } from "./tabular-data";

export const CLIENT_TEMPLATE_SHEET = "Müşteriler";

function cellToValue(value: unknown): ClientSheetCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as {
      result?: unknown;
      text?: unknown;
      richText?: Array<{ text: string }>;
      hyperlink?: string;
      model?: { value?: unknown };
      error?: unknown;
    };
    if (v.error !== undefined) return null;
    if (v.result !== undefined) return cellToValue(v.result);
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.model && v.model.value !== undefined) return cellToValue(v.model.value);
  }
  return String(value);
}

/** .xlsx dosyasını tarayıcıda dinamik exceljs ile okur. */
export async function parseClientXlsx(
  data: ArrayBuffer | Uint8Array,
  fileName = "musteriler.xlsx",
  overrideMapping?: Partial<ClientColumnMapping>,
): Promise<ClientImportResult> {
  const size = data.byteLength;
  if (size > MAX_CLIENT_IMPORT_BYTES) {
    return {
      clients: [],
      headers: [],
      detectedMapping: {
        headerRowIndex: -1,
        nameCol: null,
        firstNameCol: null,
        lastNameCol: null,
        companyCol: null,
        typeCol: null,
        emailCol: null,
        phoneCol: null,
        addressCol: null,
        stageCol: null,
        notesCol: null,
      },
      rawRows: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: [`Dosya ${Math.round(MAX_CLIENT_IMPORT_BYTES / 1024 / 1024)} MB sınırını aşıyor.`],
    };
  }

  const head = new Uint8Array(data instanceof ArrayBuffer ? data.slice(0, 8) : data.slice(0, 8));
  if (isLegacyXls(fileName, head)) {
    return {
      clients: [],
      headers: [],
      detectedMapping: {
        headerRowIndex: -1,
        nameCol: null,
        firstNameCol: null,
        lastNameCol: null,
        companyCol: null,
        typeCol: null,
        emailCol: null,
        phoneCol: null,
        addressCol: null,
        stageCol: null,
        notesCol: null,
      },
      rawRows: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: [LEGACY_XLS_MESSAGE],
    };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data as ArrayBuffer, { ignoreNodes: ["mergeCells"] } as unknown as undefined);
  } catch {
    return {
      clients: [],
      headers: [],
      detectedMapping: {
        headerRowIndex: -1,
        nameCol: null,
        firstNameCol: null,
        lastNameCol: null,
        companyCol: null,
        typeCol: null,
        emailCol: null,
        phoneCol: null,
        addressCol: null,
        stageCol: null,
        notesCol: null,
      },
      rawRows: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: ["Dosya geçerli bir .xlsx değil."],
    };
  }

  let sheet = workbook.worksheets.find((w) => {
    const n = w.name.toLocaleLowerCase("tr-TR");
    return (
      !n.includes("örnek") &&
      !n.includes("ornek") &&
      !n.includes("nasıl") &&
      !n.includes("nasil") &&
      (n.includes("müşteri") ||
        n.includes("musteri") ||
        n.includes("cari") ||
        n.includes("client") ||
        n.includes("firma") ||
        n.includes("rehber"))
    );
  });
  if (!sheet) {
    sheet = workbook.worksheets.find((w) => {
      const n = w.name.toLocaleLowerCase("tr-TR");
      return !n.includes("örnek") && !n.includes("ornek") && !n.includes("nasıl") && !n.includes("nasil");
    });
  }
  if (!sheet) {
    sheet = workbook.worksheets[0];
  }
  if (!sheet) {
    return {
      clients: [],
      headers: [],
      detectedMapping: {
        headerRowIndex: -1,
        nameCol: null,
        firstNameCol: null,
        lastNameCol: null,
        companyCol: null,
        typeCol: null,
        emailCol: null,
        phoneCol: null,
        addressCol: null,
        stageCol: null,
        notesCol: null,
      },
      rawRows: [],
      totalImported: 0,
      skippedRowCount: 0,
      warnings: [],
      errors: ["Çalışma sayfası bulunamadı."],
    };
  }

  const rows: ClientSheetCell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const maxCol = Math.min(64, row.cellCount);
    const values: ClientSheetCell[] = [];
    for (let c = 1; c <= maxCol; c += 1) {
      const cell = row.getCell(c);
      const master = cell.isMerged && cell.master ? cell.master : cell;
      values.push(cellToValue(master.value));
    }
    rows[rowNumber - 1] = values;
  });

  return parseClientRows(rows, fileName, overrideMapping);
}

/** İndirilebilir .xlsx Müşteri / Cari Şablonu üretir. */
export async function buildClientXlsxTemplate(): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMMetraj";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(CLIENT_TEMPLATE_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const columns = [
    { header: "Müşteri Adı / Ünvan", width: 38 },
    { header: "Tip (Şirket / Bireysel)", width: 22 },
    { header: "E-posta", width: 30 },
    { header: "Telefon", width: 20 },
    { header: "Adres / Şehir", width: 32 },
    { header: "Pipeline Aşaması", width: 22 },
    { header: "Görüşme ve Süreç Notları", width: 48 },
  ];
  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 28;

  // Örnek 2 satır ekleyelim ki kullanıcı hemen düzenleyip yükleyebilsin
  sheet.addRow([
    "Aras Yapı Denetim ve İnşaat A.Ş.",
    "Şirket",
    "ihale@arasyapi.com.tr",
    "+90 532 100 20 30",
    "Çankaya / Ankara",
    "Görüşüldü",
    "120 dairelik konut projesi kaba yapı ve ince işler metrajı için ilk toplantı yapıldı.",
  ]);
  sheet.addRow([
    "Kuzeyboru Mühendislik Ltd. Şti.",
    "Şirket",
    "satinalma@kuzeyboru.com.tr",
    "+90 533 222 33 44",
    "Nilüfer / Bursa",
    "Teklifli",
    "Endüstriyel tesis çelik ve betonarme keşif icmali sunuldu, revize bekleniyor.",
  ]);

  for (let r = 2; r <= 200; r += 1) {
    sheet.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Şirket,Bireysel"'],
      showErrorMessage: false,
    };
    sheet.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Potansiyel,Görüşüldü,Teklifli,Pazarlık,Kazanıldı,Kaybedildi"'],
      showErrorMessage: false,
    };
  }

  const guide = workbook.addWorksheet("Nasıl Doldurulur");
  guide.getColumn(1).width = 105;
  const lines = [
    "BIMMetraj Müşteri / Cari İçe Aktarma Şablonu — Rehber",
    "1. Kendi Excel listenizi olduğu gibi yükleyebilir veya bu şablondaki \"Müşteriler\" sayfasını kullanabilirsiniz.",
    "2. Sistem; Cari Ünvan, Firma, İşveren, İdare, Ad + Soyad, GSM, E-Mail, Durum gibi farklı sütun başlıklarını otomatik tanır.",
    "3. Pipeline Aşaması sütununa: Potansiyel, Görüşüldü, Teklifli, Pazarlık, Kazanıldı veya Kaybedildi yazabilirsiniz.",
    "4. Kendi Excel dosyanızda ekstra sütunlar (Proje Adı, İlgili Kişi, Vergi No, Kaynak vb.) varsa sistem bunları silmez; otomatik olarak müşteri notlarına ekler.",
  ];
  lines.forEach((line, idx) => {
    const cell = guide.getCell(idx + 1, 1);
    cell.value = line;
    if (idx === 0) cell.font = { bold: true, size: 13 };
  });

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

/** Mevcut müşteri listesini .xlsx dosyası olarak dışa aktarır. */
export async function exportClientsToXlsx(
  clients: ReadonlyArray<{
    name: string;
    type?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    pipelineStage?: string | null;
    notes?: string | null;
    createdAt?: string | number | null;
  }>,
): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMMetraj";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Müşteriler", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Müşteri Adı / Ünvan", width: 38 },
    { header: "Tip", width: 16 },
    { header: "E-posta", width: 30 },
    { header: "Telefon", width: 20 },
    { header: "Adres", width: 32 },
    { header: "Pipeline Aşaması", width: 20 },
    { header: "Aşama Notları", width: 52 },
    { header: "Kayıt Tarihi", width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  headerRow.height = 26;

  for (const c of clients) {
    const stageKey = normalizeImportedClientStage(c.pipelineStage);
    const stageLabel = CLIENT_STAGE_MAP[stageKey]?.label ?? "Potansiyel";
    sheet.addRow([
      neutralizeSpreadsheetFormula(c.name || ""),
      c.type === "person" ? "Bireysel" : "Şirket",
      neutralizeSpreadsheetFormula(c.email || ""),
      neutralizeSpreadsheetFormula(c.phone || ""),
      neutralizeSpreadsheetFormula(c.address || ""),
      stageLabel,
      neutralizeSpreadsheetFormula(formatClientNotesForExport(c.notes, stageKey)),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString("tr-TR") : "",
    ]);
  }

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
