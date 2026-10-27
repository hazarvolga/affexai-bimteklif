/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 *
 * 3-Katmanlı Esnek Müşteri / Cari Excel (.xlsx) ve CSV İçe & Dışa Aktarma Adaptörü:
 * - Katman 1: İlk 30 satırda akıllı başlık taraması, Türkçe/İngilizce müteahhit terimleri sözlüğü,
 *   serbest metin aşama çevirici (Potansiyel, Görüşüldü, Teklifli, Pazarlık, Kazanıldı, Kaybedildi)
 *   ve Kurumsal (Şirket) / Bireysel tip çıkarımı.
 * - Katman 2: İçerik deseni (Regex Heuristics) ile başlık olmasa veya farklı olsa bile e-posta (@)
 *   ve telefon (+90 / 05xx / 02xx) sütunlarını yakalama; eşleşmeyen ekstra sütunları (Proje Adı,
 *   İlgili Kişi, Vergi No, Kaynak vb.) veri kaybı olmadan başlangıç aşama notuna dönüştürme.
 * - Katman 3: Kullanıcıya görsel önizleme ve sütun eşleştirme düzeltme olanağı sunan veri modeli.
 */

import { parseCsv, serializeCsv } from "./tabular-data";
import {
  appendClientStageNote,
  CLIENT_STAGE_MAP,
  formatClientNotesForExport,
  type ClientStageKey,
} from "./client-notes";

export const MAX_CLIENT_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_HEADER_SCAN_ROWS = 30;

export type ClientSheetCell = string | number | null;

export interface ImportedClientRow {
  rowNumber: number;
  name: string;
  type: "company" | "person";
  email: string | null;
  phone: string | null;
  address: string | null;
  pipelineStage: ClientStageKey;
  notes: string | null;
  rawStageText?: string;
  extraFieldsSummary?: string;
}

export interface ClientColumnHeader {
  index: number;
  label: string;
  sample: string;
}

export interface ClientColumnMapping {
  headerRowIndex: number;
  nameCol: number | null;
  firstNameCol: number | null;
  lastNameCol: number | null;
  companyCol: number | null;
  typeCol: number | null;
  emailCol: number | null;
  phoneCol: number | null;
  addressCol: number | null;
  stageCol: number | null;
  notesCol: number | null;
}

export interface ClientImportResult {
  clients: ImportedClientRow[];
  headers: ClientColumnHeader[];
  detectedMapping: ClientColumnMapping;
  rawRows: ClientSheetCell[][];
  totalImported: number;
  skippedRowCount: number;
  warnings: string[];
  errors: string[];
}

export function cleanClientHeader(str: string): string {
  return str
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\u0307/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_HEADERS = new Set([
  "musteri adi", "musteri", "musteri unvani", "cari unvan", "cari adi", "cari",
  "firma adi", "firma unvani", "unvan", "ad soyad", "adi soyadi", "isim soyisim",
  "tam ad", "isveren", "idare", "kurum", "kurum adi", "client", "client name",
  "customer", "customer name", "name", "full name",
]);
const FIRST_NAME_HEADERS = new Set(["ad", "adi", "isim", "first name", "firstname"]);
const LAST_NAME_HEADERS = new Set(["soyad", "soyadi", "soyisim", "last name", "lastname", "surname"]);
const COMPANY_HEADERS = new Set(["firma", "sirket", "sirket adi", "kurulus", "company", "company name", "organization"]);
const CONTACT_PERSON_HEADERS = new Set(["ilgili kisi", "yetkili", "yetkili kisi", "kontak", "irtibat kisisi", "contact person"]);
const TYPE_HEADERS = new Set(["tip", "tur", "musteri tipi", "cari tipi", "kurumsal bireysel", "type", "client type"]);
const EMAIL_HEADERS = new Set(["e posta", "eposta", "e mail", "email", "mail", "iletisim e posta", "kurumsal e posta"]);
const PHONE_HEADERS = new Set([
  "telefon", "tel", "tel no", "telefon no", "gsm", "cep", "cep telefonu",
  "mobil", "irtibat", "irtibat tel", "whatsapp", "phone", "phone number", "mobile",
]);
const ADDRESS_HEADERS = new Set([
  "adres", "acik adres", "fatura adresi", "santiye adresi", "lokasyon",
  "konum", "sehir", "il", "ilce", "il ilce", "address", "city", "location",
]);
const STAGE_HEADERS = new Set([
  "durum", "asama", "pipeline", "pipeline adimi", "pipeline durumu",
  "satis asamasi", "statu", "musteri durumu", "stage", "status", "pipeline stage",
]);
const NOTES_HEADERS = new Set([
  "not", "notlar", "aciklama", "aciklamalar", "gorusme notu",
  "gorusme notlari", "detay", "ozet", "notes", "note", "description", "comments",
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?90[\s.-]*)?(?:\(?0?[2-5]\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|\b0?[2-5]\d{9}\b)/;

export function normalizeImportedClientStage(raw: string | null | undefined): ClientStageKey {
  if (!raw || !raw.trim()) return "lead";
  const c = cleanClientHeader(raw);
  if (!c) return "lead";
  if (
    c.includes("kazan") || c.includes("alindi") || c.includes("sozlesme") ||
    c.includes("onaylan") || c.includes("imza") || c === "won" || c === "aktif" || c === "aktif musteri"
  ) return "won";
  if (
    c.includes("kaybed") || c.includes("kayip") || c.includes("iptal") ||
    c.includes("red") || c.includes("vazgec") || c === "lost" || c === "pasif"
  ) return "lost";
  if (
    c.includes("pazarlik") || c.includes("muzakere") || c.includes("revize") ||
    c.includes("karsi teklif") || c.includes("degerlendirme") || c === "negotiation"
  ) return "negotiation";
  if (
    c.includes("teklif") || c.includes("fiyat veril") || c.includes("sunuldu") ||
    c === "quotation sent" || c === "proposal sent" || c === "quoted"
  ) return "quotation_sent";
  if (
    c.includes("gorusul") || c.includes("gorusme") || c.includes("aran") ||
    c.includes("iletisim") || c.includes("toplanti") || c.includes("ziyaret") ||
    c.includes("randevu") || c === "contacted"
  ) return "contacted";
  return "lead";
}

const CORPORATE_MARKERS = [
  "ltd", "limited", "a s", "anonim", "insaat", "yapi", "mimarlik", "muhendislik",
  "taahhut", "grup", "group", "holding", "belediye", "belediyesi", "mudurlugu",
  "bakanligi", "idare", "gayrimenkul", "proje", "sanayi", "ticaret", "sti",
  "inc", "llc", "gmbh", "corp", "as",
];

/**
 * Açık tip sütunu veya müşteri ünvanından Şirket (`company`) / Bireysel (`person`) çıkarımı yapar.
 */
export function inferClientType(name: string, explicitType?: string | null): "company" | "person" {
  if (explicitType && explicitType.trim()) {
    const t = cleanClientHeader(explicitType);
    if (
      t.includes("bireysel") ||
      t.includes("sahis") ||
      t.includes("kisi") ||
      t.includes("gercek") ||
      t === "person" ||
      t === "individual"
    ) {
      return "person";
    }
    if (
      t.includes("sirket") ||
      t.includes("kurumsal") ||
      t.includes("firma") ||
      t.includes("tuzel") ||
      t === "company" ||
      t === "corporate"
    ) {
      return "company";
    }
  }

  const cleanedName = ` ${cleanClientHeader(name)} `;
  for (const marker of CORPORATE_MARKERS) {
    if (cleanedName.includes(` ${marker} `)) return "company";
  }
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 3 && !/\d/.test(name)) {
    return "person";
  }
  return "company";
}

function classifyHeaderCell(cleaned: string): keyof Omit<ClientColumnMapping, "headerRowIndex"> | "contactPerson" | null {
  if (!cleaned) return null;
  if (NAME_HEADERS.has(cleaned)) return "nameCol";
  if (FIRST_NAME_HEADERS.has(cleaned)) return "firstNameCol";
  if (LAST_NAME_HEADERS.has(cleaned)) return "lastNameCol";
  if (COMPANY_HEADERS.has(cleaned)) return "companyCol";
  if (CONTACT_PERSON_HEADERS.has(cleaned)) return "contactPerson";
  if (TYPE_HEADERS.has(cleaned)) return "typeCol";
  if (EMAIL_HEADERS.has(cleaned) || cleaned.includes("eposta") || cleaned.includes("e posta") || cleaned.includes("email")) {
    return "emailCol";
  }
  if (PHONE_HEADERS.has(cleaned) || cleaned.includes("telefon") || cleaned.includes("gsm")) {
    return "phoneCol";
  }
  if (ADDRESS_HEADERS.has(cleaned) || cleaned.includes("adres")) {
    return "addressCol";
  }
  if (STAGE_HEADERS.has(cleaned) || cleaned.includes("asama") || cleaned.includes("durum")) {
    return "stageCol";
  }
  if (NOTES_HEADERS.has(cleaned) || cleaned.includes("aciklama") || cleaned.includes("notlar")) {
    return "notesCol";
  }
  return null;
}

function detectHeaderAndMapping(rows: ClientSheetCell[][]): ClientColumnMapping {
  let bestRow = -1;
  let bestScore = 0;
  let bestMapping: ClientColumnMapping = {
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
  };

  const scanLimit = Math.min(rows.length, MAX_HEADER_SCAN_ROWS);
  for (let r = 0; r < scanLimit; r += 1) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const candidate: ClientColumnMapping = {
      headerRowIndex: r,
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
    };
    let score = 0;

    for (let c = 0; c < row.length; c += 1) {
      const raw = String(row[c] ?? "").trim();
      if (!raw || raw.length > 60) continue;
      const cleaned = cleanClientHeader(raw);
      const role = classifyHeaderCell(cleaned);
      if (!role) continue;

      if (role === "contactPerson") {
        if (candidate.nameCol === null) {
          candidate.nameCol = c;
          score += 2;
        }
      } else if (candidate[role] === null) {
        candidate[role] = c;
        score += role === "nameCol" || role === "companyCol" ? 3 : 2;
      }
    }

    if (score > bestScore && (candidate.nameCol !== null || candidate.companyCol !== null || candidate.firstNameCol !== null || score >= 4)) {
      bestScore = score;
      bestRow = r;
      bestMapping = candidate;
    }
  }

  // Eğer hem Firma hem Ad Soyad/İlgili Kişi sütunu varsa ve nameCol boşsa companyCol'u ana ad yap
  if (bestMapping.nameCol === null && bestMapping.companyCol !== null) {
    bestMapping.nameCol = bestMapping.companyCol;
  }

  // Katman 2: İçerik Deseni (Regex Heuristics) — e-posta, telefon ve isim sütunlarını veriden doğrula / tamamla
  const dataStart = bestRow >= 0 ? bestRow + 1 : 0;
  const sampleRows = rows.slice(dataStart, dataStart + 25).filter((r) => r && r.some((cell) => String(cell ?? "").trim() !== ""));
  const maxCols = sampleRows.reduce((max, r) => Math.max(max, r.length), 0);

  if (sampleRows.length > 0 && maxCols > 0) {
    const emailHits = new Array<number>(maxCols).fill(0);
    const phoneHits = new Array<number>(maxCols).fill(0);
    const textHits = new Array<number>(maxCols).fill(0);

    for (const row of sampleRows) {
      for (let c = 0; c < maxCols; c += 1) {
        const val = String(row[c] ?? "").trim();
        if (!val) continue;
        if (EMAIL_REGEX.test(val)) emailHits[c] += 1;
        else if (PHONE_REGEX.test(val)) phoneHits[c] += 1;
        else if (val.length >= 3 && !/^\d+$/.test(val)) textHits[c] += 1;
      }
    }

    if (bestMapping.emailCol === null) {
      const bestEmailCol = emailHits.findIndex((hits) => hits > 0 && hits >= Math.ceil(sampleRows.length * 0.25));
      if (bestEmailCol >= 0) bestMapping.emailCol = bestEmailCol;
    }
    if (bestMapping.phoneCol === null) {
      const bestPhoneCol = phoneHits.findIndex((hits, idx) => idx !== bestMapping.emailCol && hits > 0 && hits >= Math.ceil(sampleRows.length * 0.25));
      if (bestPhoneCol >= 0) bestMapping.phoneCol = bestPhoneCol;
    }
    if (bestMapping.nameCol === null && bestMapping.firstNameCol === null) {
      const bestTextCol = textHits.findIndex(
        (hits, idx) => idx !== bestMapping.emailCol && idx !== bestMapping.phoneCol && hits > 0,
      );
      if (bestTextCol >= 0) bestMapping.nameCol = bestTextCol;
    }
  }

  bestMapping.headerRowIndex = bestRow;
  return bestMapping;
}

function buildColumnHeaders(rows: ClientSheetCell[][], headerRowIndex: number): ClientColumnHeader[] {
  const maxCols = rows.slice(0, 35).reduce((m, r) => Math.max(m, r ? r.length : 0), 0);
  const headerRow = headerRowIndex >= 0 ? rows[headerRowIndex] ?? [] : [];
  const dataStart = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const headers: ClientColumnHeader[] = [];

  for (let c = 0; c < maxCols; c += 1) {
    const rawLabel = String(headerRow[c] ?? "").trim();
    let sample = "";
    for (let r = dataStart; r < Math.min(rows.length, dataStart + 15); r += 1) {
      const cellVal = String(rows[r]?.[c] ?? "").trim();
      if (cellVal) {
        sample = cellVal.slice(0, 45);
        break;
      }
    }
    if (!rawLabel && !sample) continue;
    headers.push({
      index: c,
      label: rawLabel || `Sütun ${c + 1}`,
      sample,
    });
  }
  return headers;
}

/**
 * Ham hücre matrisini 3 katmanlı müşteri adaptörüyle ayrıştırır.
 * Kullanıcı Katman 3 önizleme ekranında sütun eşleştirmesini değiştirirse `overrideMapping` ile yeniden çağrılır.
 */
export function parseClientRows(
  rows: ClientSheetCell[][],
  fileName = "musteriler",
  overrideMapping?: Partial<ClientColumnMapping>,
): ClientImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const nonEmptyRows = rows.filter((r) => r && r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));

  if (nonEmptyRows.length === 0) {
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
      rawRows: rows,
      totalImported: 0,
      skippedRowCount: 0,
      warnings,
      errors: ["Dosya boş veya okunabilir müşteri satırı bulunamadı."],
    };
  }

  const autoMapping = detectHeaderAndMapping(rows);
  const mapping: ClientColumnMapping = {
    ...autoMapping,
    ...overrideMapping,
  };
  const headers = buildColumnHeaders(rows, mapping.headerRowIndex);
  const startRow = mapping.headerRowIndex >= 0 ? mapping.headerRowIndex + 1 : 0;

  if (mapping.headerRowIndex < 0) {
    warnings.push("Standart başlık satırı saptanamadı; sütunlar içerik desenine (e-posta, telefon, ünvan) göre otomatik eşleştirildi.");
  }

  const usedCoreCols = new Set<number>(
    [
      mapping.nameCol,
      mapping.firstNameCol,
      mapping.lastNameCol,
      mapping.companyCol,
      mapping.typeCol,
      mapping.emailCol,
      mapping.phoneCol,
      mapping.addressCol,
      mapping.stageCol,
      mapping.notesCol,
    ].filter((c): c is number => c !== null && c >= 0),
  );

  const clients: ImportedClientRow[] = [];
  let skippedRowCount = 0;

  for (let r = startRow; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }

    const readCol = (col: number | null): string =>
      col !== null && col >= 0 ? String(row[col] ?? "").trim() : "";

    let name = readCol(mapping.nameCol);
    const firstName = readCol(mapping.firstNameCol);
    const lastName = readCol(mapping.lastNameCol);
    const companyName = readCol(mapping.companyCol);

    if (!name && (firstName || lastName)) {
      name = `${firstName} ${lastName}`.trim();
    }
    if (!name && companyName) {
      name = companyName;
    }

    // Eğer Firma sütunu ayrıysa ve ana ad kişi adıysa, Firma adını ana ad yapıp kişiyi nota ekleyelim
    let secondaryContactNote = "";
    if (
      companyName &&
      name &&
      companyName !== name &&
      mapping.companyCol !== mapping.nameCol
    ) {
      secondaryContactNote = `İlgili Kişi: ${name}`;
      name = companyName;
    } else if (firstName && lastName && name === companyName) {
      secondaryContactNote = `İlgili Kişi: ${firstName} ${lastName}`.trim();
    }

    // Başlık tekrarı veya toplam satırlarını atla
    const cleanedName = cleanClientHeader(name);
    if (
      !name ||
      NAME_HEADERS.has(cleanedName) ||
      cleanedName === "toplam" ||
      cleanedName === "genel toplam" ||
      cleanedName.startsWith("bu sayfa yalniz ornektir")
    ) {
      skippedRowCount += 1;
      continue;
    }

    let email = readCol(mapping.emailCol) || null;
    let phone = readCol(mapping.phoneCol) || null;

    // Katman 2: Hücre içinde birleşik telefon + e-posta varsa ayrıştır
    if (!email || !phone) {
      for (let c = 0; c < row.length; c += 1) {
        const cellText = String(row[c] ?? "").trim();
        if (!cellText) continue;
        if (!email) {
          const emailMatch = cellText.match(EMAIL_REGEX);
          if (emailMatch) email = emailMatch[0].toLowerCase();
        }
        if (!phone && c !== mapping.nameCol) {
          const phoneMatch = cellText.match(PHONE_REGEX);
          if (phoneMatch) phone = phoneMatch[0].trim();
        }
      }
    }

    const rawType = readCol(mapping.typeCol);
    const type = inferClientType(name, rawType || (companyName ? "company" : undefined));
    const address = readCol(mapping.addressCol) || null;
    const rawStageText = readCol(mapping.stageCol);
    const pipelineStage = normalizeImportedClientStage(rawStageText);
    const directNotes = readCol(mapping.notesCol);

    // Eşleşmeyen ekstra sütunları (Proje Adı, Vergi No, Kaynak vb.) sıfır veri kaybıyla nota ekle
    const extraPairs: string[] = [];
    if (secondaryContactNote) extraPairs.push(secondaryContactNote);
    for (const h of headers) {
      if (usedCoreCols.has(h.index)) continue;
      const val = String(row[h.index] ?? "").trim();
      if (!val || val === email || val === phone || val === name) continue;
      extraPairs.push(`${h.label}: ${val}`);
    }

    const extraFieldsSummary = extraPairs.length > 0 ? extraPairs.join(" | ") : undefined;
    const combinedNoteParts: string[] = [];
    if (directNotes) combinedNoteParts.push(directNotes);
    if (extraFieldsSummary) combinedNoteParts.push(`Ek Bilgiler (${fileName}): ${extraFieldsSummary}`);

    const combinedNoteText = combinedNoteParts.join("\n").trim();
    const structuredNotes = combinedNoteText
      ? appendClientStageNote(null, {
          stage: pipelineStage,
          content: combinedNoteText,
        })
      : null;

    clients.push({
      rowNumber: r + 1,
      name: name.slice(0, 255),
      type,
      email: email ? email.slice(0, 255) : null,
      phone: phone ? phone.slice(0, 50) : null,
      address: address ? address.slice(0, 1000) : null,
      pipelineStage,
      notes: structuredNotes,
      rawStageText: rawStageText || undefined,
      extraFieldsSummary,
    });
  }

  if (clients.length === 0 && errors.length === 0) {
    errors.push("Dosyada içe aktarılabilecek geçerli müşteri satırı bulunamadı.");
  }

  return {
    clients,
    headers,
    detectedMapping: mapping,
    rawRows: rows,
    totalImported: clients.length,
    skippedRowCount,
    warnings,
    errors,
  };
}

/** CSV metninden müşteri listesini ayrıştırır. */
export function parseClientCsv(
  text: string,
  fileName = "musteriler.csv",
  overrideMapping?: Partial<ClientColumnMapping>,
): ClientImportResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
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
      errors: ["CSV dosyası boş."],
    };
  }
  try {
    return parseClientRows(parseCsv(trimmed), fileName, overrideMapping);
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
      errors: ["CSV tırnak veya satır yapısı geçersiz."],
    };
  }
}

/** .xlsx dosyasını dinamik client-xlsx / exceljs parçasından okur. */
export async function parseClientXlsx(
  data: ArrayBuffer | Uint8Array,
  fileName = "musteriler.xlsx",
  overrideMapping?: Partial<ClientColumnMapping>,
): Promise<ClientImportResult> {
  const { parseClientXlsx: impl } = await import("./client-xlsx");
  return impl(data, fileName, overrideMapping);
}

/** Müşteri içe aktarma için örnek CSV şablonu üretir. */
export function buildClientCsvTemplate(): string {
  return serializeCsv(
    [
      [
        "Müşteri Adı / Ünvan",
        "Tip (Şirket / Bireysel)",
        "E-posta",
        "Telefon",
        "Adres / Şehir",
        "Pipeline Aşaması",
        "Görüşme ve Süreç Notları",
      ],
      [
        "Aras Yapı Denetim ve İnşaat A.Ş.",
        "Şirket",
        "ihale@arasyapi.com.tr",
        "+90 532 100 20 30",
        "Çankaya / Ankara",
        "Görüşüldü",
        "120 dairelik konut projesi kaba yapı ve ince işler metrajı için ilk toplantı yapıldı.",
      ],
      [
        "Kuzeyboru Mühendislik Ltd. Şti.",
        "Şirket",
        "satinalma@kuzeyboru.com.tr",
        "+90 533 222 33 44",
        "Nilüfer / Bursa",
        "Teklifli",
        "Endüstriyel tesis çelik ve betonarme keşif icmali sunuldu, revize bekleniyor.",
      ],
      [
        "Ahmet Yılmaz",
        "Bireysel",
        "ahmet.yilmaz@ornek.com",
        "+90 542 333 44 55",
        "Urla / İzmir",
        "Potansiyel",
        "Müstakil villa anahtar teslim yapım teklifi talebi.",
      ],
    ],
    { delimiter: ";" },
  );
}

/** Mevcut müşteri listesini CSV olarak dışa aktarır. */
export function exportClientsToCsv(
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
): string {
  const rows: (string | number)[][] = [
    [
      "Müşteri Adı / Ünvan",
      "Tip",
      "E-posta",
      "Telefon",
      "Adres",
      "Pipeline Aşaması",
      "Aşama Notları",
      "Kayıt Tarihi",
    ],
  ];

  for (const c of clients) {
    const stageKey = normalizeImportedClientStage(c.pipelineStage);
    const stageLabel = CLIENT_STAGE_MAP[stageKey]?.label ?? "Potansiyel";
    rows.push([
      c.name || "",
      c.type === "person" ? "Bireysel" : "Şirket",
      c.email || "",
      c.phone || "",
      c.address || "",
      stageLabel,
      formatClientNotesForExport(c.notes, stageKey),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString("tr-TR") : "",
    ]);
  }

  return serializeCsv(rows, { delimiter: ";" });
}
