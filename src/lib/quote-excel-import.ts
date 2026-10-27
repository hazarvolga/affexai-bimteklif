/**
 * Excel (.xlsx) ve CSV dosyalarından teklif kalemlerini (QuoteItem) içe aktarma motoru.
 *
 * Güvenlik ve Doğruluk İlkeleri:
 * - 5 MB dosya boyutu sınırı (tarayıcı bellek güvenliği).
 * - exceljs yalnızca .xlsx seçilince dinamik yüklenir.
 * - Formül hücrelerinin hesaplanmış sonucu (.result) okunur.
 * - Türkçe (1.250,50) ve uluslararası (1,250.50) sayı biçimleri güvenle çözülür.
 * - Hiçbir birim fiyat veya miktar uydurulmaz; eksik fiyat 0 ₺ olarak işaretlenir.
 * - Antetli düz icmal, katlara göre pivot ve TOKİ/Allplan tekrarlayan poz bloklarını destekler.
 */
import type { QuoteItem } from "@/types";
import { calculateLineItemTotal } from "./calculations";
import { parseCsv, serializeCsv } from "./tabular-data";

export const MAX_QUOTE_IMPORT_BYTES = 5 * 1024 * 1024;

export type SheetCell = string | number | null;

export interface QuoteImportResult {
  items: Partial<QuoteItem>[];
  projectName?: string;
  totalImported: number;
  skippedRowCount: number;
  warnings: string[];
  errors: string[];
}

const KNOWN_UNITS = new Set([
  "m2", "m²", "m3", "m³", "mt", "m", "ton", "t", "kg", "adet", "ad", "set", "takım", "takim",
  "gun", "gün", "ay", "saat", "lt", "litre", "paket", "pkt", "torba", "sefer", "boy",
]);

function isKnownUnitValue(raw: string): boolean {
  const clean = raw.trim().toLocaleLowerCase("tr-TR").replace(/\.$/, "");
  return KNOWN_UNITS.has(clean);
}

function normalizeUnit(raw: string): string {
  const clean = raw.trim().toLocaleLowerCase("tr-TR").replace(/\.$/, "");
  if (clean === "m²") return "m2";
  if (clean === "m³") return "m3";
  if (clean === "ad" || clean === "adet" || clean === "boy") return "adet";
  if (clean === "mt" || clean === "m") return "mt";
  return clean || "adet";
}

export function parseNumberCell(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const str = String(raw).trim().replace(/\s+/g, "").replace(/[₺$€]/g, "");
  if (!str) return null;

  // Türkçe biçim: 1.250,50 -> 1250.50
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(str)) {
    const n = Number(str.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // Standart virgüllü: 1,250.50 -> 1250.50
  if (/^-?\d{1,3}(,\d{3})*\.\d+$/.test(str)) {
    const n = Number(str.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  // Yalnızca virgüllü: 125,50 -> 125.50
  if (/^-?\d+,\d+$/.test(str)) {
    const n = Number(str.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // Düz sayı: 1250 / 1250.50
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

interface ColumnSpans {
  code: number[];
  description: number[];
  unit: number[];
  quantity: number[];
  unitPrice: number[];
  vat: number[];
  discount: number[];
}

function cleanHeader(str: string): string {
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
    .replace(/\s+/g, " ")
    .trim();
}

type CellSpan = { startCol: number; endCol: number; text: string; clean: string };

function getRowSpans(row: SheetCell[] | undefined): CellSpan[] {
  if (!row || row.length === 0) return [];
  const spans: CellSpan[] = [];
  for (let c = 0; c < row.length; c += 1) {
    const text = String(row[c] ?? "").trim();
    if (!text) continue;
    const prev = spans[spans.length - 1];
    if (prev && prev.endCol === c - 1 && prev.text === text) {
      prev.endCol = c;
    } else {
      spans.push({ startCol: c, endCol: c, text, clean: cleanHeader(text) });
    }
  }
  return spans;
}

function isRepeatingPozBlockStart(rows: SheetCell[][], r: number): boolean {
  const spans = getRowSpans(rows[r]);
  if (spans.length < 2) return false;
  const hasPoz = spans.some((s) => /^poz\s*(no|kodu)?\s*[:.]?$/.test(s.clean));
  const hasBirim = spans.some((s) => /^(birimi|birim|olcu birimi)\s*[:.]?$/.test(s.clean));
  if (!hasPoz || !hasBirim) return false;
  if (
    spans.some(
      (s) =>
        /^(imalatin\s*(adi|cinsi|tanimi)|is\s*kalemi\s*adi)\s*[:.]?$/.test(s.clean) ||
        s.clean === "katlar" ||
        s.clean === "toplam",
    )
  ) {
    return false;
  }

  const birimIdx = spans.findIndex((s) => /^(birimi|birim|olcu birimi)\s*[:.]?$/.test(s.clean));
  const afterBirim = birimIdx >= 0 ? spans[birimIdx + 1] : undefined;
  const hasUnitValueOnRow = Boolean(afterBirim && isKnownUnitValue(afterBirim.text));

  const nextSpans = getRowSpans(rows[r + 1]);
  const hasImalatOnNextRow = nextSpans.some(
    (s) =>
      /^(imalatin\s*(adi|cinsi|tanimi)|is\s*kalemi\s*adi)\s*[:.]?$/.test(s.clean) ||
      /^metraj\s*no\s*[:.]?$/.test(s.clean),
  );
  return hasUnitValueOnRow && hasImalatOnNextRow;
}

function findRepeatingBlockStarts(rows: SheetCell[][]): number[] {
  const starts: number[] = [];
  for (let r = 0; r < rows.length; r += 1) {
    if (isRepeatingPozBlockStart(rows, r)) starts.push(r);
  }
  return starts;
}

function parseRepeatingBlockQuoteRows(
  rows: SheetCell[][],
  blockStarts: number[],
  fileName: string,
  idFactory: () => string,
): QuoteImportResult {
  const items: Partial<QuoteItem>[] = [];
  const warnings: string[] = [];
  let skippedRowCount = 0;

  for (let i = 0; i < blockStarts.length; i += 1) {
    const startRow = blockStarts[i];
    const endRow = (blockStarts[i + 1] ?? rows.length) - 1;
    const row0Spans = getRowSpans(rows[startRow]);
    const row1Spans = getRowSpans(rows[startRow + 1]);

    const pozIdx = row0Spans.findIndex((s) => /^poz\s*(no|kodu)?\s*[:.]?$/.test(s.clean));
    const birimIdx = row0Spans.findIndex((s) => /^(birimi|birim|olcu birimi)\s*[:.]?$/.test(s.clean));

    let codeRaw = "";
    if (pozIdx >= 0) {
      const candidate = row0Spans[pozIdx + 1];
      if (candidate && (birimIdx < 0 || pozIdx + 1 < birimIdx) && !/^(birimi|birim)/.test(candidate.clean)) {
        codeRaw = candidate.text;
      }
    }

    let unitRaw = "";
    if (birimIdx >= 0 && row0Spans[birimIdx + 1]) {
      unitRaw = row0Spans[birimIdx + 1].text;
    }

    let descRaw = "";
    const imalatIdx = row1Spans.findIndex((s) =>
      /^(imalatin\s*(adi|cinsi|tanimi)|is\s*kalemi\s*adi)\s*[:.]?$/.test(s.clean),
    );
    const metrajNoIdx = row1Spans.findIndex((s) => /^metraj\s*no\s*[:.]?$/.test(s.clean));
    if (imalatIdx >= 0) {
      const candidate = row1Spans[imalatIdx + 1];
      if (candidate && (metrajNoIdx < 0 || imalatIdx + 1 < metrajNoIdx) && !/^metraj\s*no/.test(candidate.clean)) {
        descRaw = candidate.text;
      }
    }

    let genelQty: number | null = null;
    let araSum = 0;
    let hasAra = false;
    let binaQty: number | null = null;

    for (let r = startRow + 2; r <= endRow; r += 1) {
      const spans = getRowSpans(rows[r]);
      if (spans.length === 0) continue;

      const genelIdx = spans.findIndex((s) => /^genel\s*toplam\s*[:.]?$/.test(s.clean));
      if (genelIdx >= 0) {
        for (let k = genelIdx + 1; k < spans.length; k += 1) {
          const n = parseNumberCell(spans[k].text);
          if (n !== null) {
            genelQty = n;
            break;
          }
        }
        continue;
      }

      const araIdx = spans.findIndex((s) => /^ara\s*toplam\s*[:.]?$/.test(s.clean));
      if (araIdx >= 0) {
        for (let k = araIdx + 1; k < spans.length; k += 1) {
          const n = parseNumberCell(spans[k].text);
          if (n !== null) {
            araSum += n;
            hasAra = true;
            break;
          }
        }
        continue;
      }

      if (spans[0].clean === "bina:" || spans[0].clean === "bina") {
        const last = spans[spans.length - 1];
        const n = last ? parseNumberCell(last.text) : null;
        if (n !== null) binaQty = n;
      }
    }

    const quantity = genelQty ?? (hasAra ? Number(araSum.toFixed(4)) : binaQty);
    const effectiveDesc = descRaw || codeRaw;
    if (!effectiveDesc || quantity === null || quantity <= 0) {
      skippedRowCount += 1;
      continue;
    }

    const fullDescription = codeRaw && descRaw && codeRaw !== descRaw ? `[${codeRaw}] ${descRaw}` : effectiveDesc;
    warnings.push(`Satır ${startRow + 1} (${fullDescription.slice(0, 30)}): birim fiyat bulunamadı, 0 ₺ olarak kaydedildi.`);

    const item: Partial<QuoteItem> = {
      id: idFactory(),
      description: fullDescription,
      unit: normalizeUnit(unitRaw),
      quantity,
      unitPrice: 0,
      costUnitPrice: null,
      discountPercent: 0,
      vatPercent: 20,
      quantitySource: "manual",
      priceSource: "manual",
      sourceReference: `Excel/CSV içe aktarım (${fileName}, blok satır ${startRow + 1})`,
      verificationStatus: "unverified",
      wastePercent: 0,
      costCategory: "material",
    };
    item.total = calculateLineItemTotal(item);
    items.push(item);
  }

  return {
    items,
    totalImported: items.length,
    skippedRowCount,
    warnings,
    errors: [],
  };
}

function expandSpanIndices(lower: string[], matched: number[], maxWidth = 3): number[] {
  if (matched.length === 0) return [];
  const expanded: number[] = [];
  for (const startIdx of matched) {
    if (!expanded.includes(startIdx)) expanded.push(startIdx);
    const startVal = lower[startIdx];
    for (let c = startIdx + 1; c < Math.min(lower.length + maxWidth, startIdx + maxWidth); c += 1) {
      const nextVal = lower[c] ?? "";
      if (nextVal && nextVal !== startVal) break;
      if (!expanded.includes(c)) expanded.push(c);
    }
  }
  return expanded;
}

function findAllMatchingIndices(lower: string[], predicate: (c: string) => boolean): number[] {
  const indices: number[] = [];
  lower.forEach((cell, idx) => {
    if (cell && cell.length <= 45 && !cell.endsWith(":") && predicate(cell)) indices.push(idx);
  });
  return indices;
}

function findHeaderRow(
  rows: SheetCell[][],
  stopRow: number,
): { headerIndex: number; spans: ColumnSpans } | null {
  const limit = Math.min(50, stopRow);
  let bestMatch: { headerIndex: number; spans: ColumnSpans; score: number } | null = null;

  for (let r = 0; r < limit; r += 1) {
    const row = rows[r];
    if (!row) continue;
    const rowSpans = getRowSpans(row);
    if (rowSpans.length < 2) continue;
    if (isRepeatingPozBlockStart(rows, r)) continue;

    const prevRow = r > 0 ? rows[r - 1] ?? [] : [];
    const prevLower = prevRow.map((c) => cleanHeader(String(c ?? "")));
    const usePrevFallback = prevLower.some(
      (c) =>
        c.includes("poz") ||
        c.includes("tanim") ||
        c.includes("aciklama") ||
        c.includes("birim") ||
        c.includes("katlar"),
    );
    const maxLen = Math.max(row.length, usePrevFallback ? prevRow.length : 0);
    const lower: string[] = [];
    for (let c = 0; c < maxLen; c += 1) {
      const curr = cleanHeader(String(row[c] ?? ""));
      const prev = usePrevFallback ? cleanHeader(String(prevRow[c] ?? "")) : "";
      lower[c] = curr || prev;
    }

    let descCols = findAllMatchingIndices(
      lower,
      (c) =>
        c.includes("aciklama") ||
        c.includes("is kalemi") ||
        c.includes("description") ||
        c.includes("tanim") ||
        c.includes("imalat") ||
        c === "kalem",
    );
    if (descCols.length === 0) {
      descCols = findAllMatchingIndices(lower, (c) => c === "malzeme");
    }
    const qtyCols = findAllMatchingIndices(
      lower,
      (c) =>
        c.includes("miktar") ||
        c.includes("quantity") ||
        c.includes("net metraj") ||
        c.includes("metraj") ||
        c.includes("toplam") ||
        c.includes("volume") ||
        c === "adet",
    );

    if (descCols.length > 0 && qtyCols.length > 0) {
      let codeCols = findAllMatchingIndices(
        lower,
        (c) =>
          c.includes("poz no") ||
          c.includes("poz kodu") ||
          c.includes("malzeme pozu") ||
          c.includes("item no") ||
          c.includes("kod") ||
          c === "no" ||
          c === "poz",
      );
      let unitCols = findAllMatchingIndices(
        lower,
        (c) => c.includes("birim") || c.includes("unit") || c === "brm",
      );
      const priceCols = findAllMatchingIndices(
        lower,
        (c) =>
          c.includes("birim fiyat") ||
          c.includes("b.fiyat") ||
          c.includes("unit price") ||
          c.includes("fiyat") ||
          c.includes("rate") ||
          c.includes("price"),
      );
      const vatCols = findAllMatchingIndices(lower, (c) => c.includes("kdv") || c.includes("vat"));
      const discountCols = findAllMatchingIndices(
        lower,
        (c) => c.includes("iskonto") || c.includes("indirim") || c.includes("discount"),
      );

      // Exclude priceCols from unitCols (since "birim fiyat" also contains "birim")
      if (priceCols.length > 0) {
        const priceSet = new Set(priceCols);
        unitCols = unitCols.filter((c) => !priceSet.has(c));
      }

      // Data-driven unit column inference when a merged header like "Malzeme" spans over the unit column (e.g. V6 row 18)
      if (unitCols.length === 0) {
        const sampleRows = rows
          .slice(r + 1, Math.min(stopRow, r + 25))
          .filter((dRow) => dRow && dRow.some((cell) => String(cell ?? "").trim() !== ""));
        if (sampleRows.length >= 2) {
          for (let col = 0; col < maxLen; col += 1) {
            let nonEmpty = 0;
            let unitHits = 0;
            for (const sRow of sampleRows) {
              const val = String(sRow[col] ?? "").trim();
              if (!val) continue;
              nonEmpty += 1;
              if (isKnownUnitValue(val)) unitHits += 1;
            }
            if (nonEmpty >= 2 && unitHits / nonEmpty >= 0.65) {
              unitCols = [col];
              lower[col] = "birim";
              break;
            }
          }
        }
      }

      codeCols = expandSpanIndices(lower, codeCols, 3);
      descCols = expandSpanIndices(lower, descCols, 3);
      unitCols = expandSpanIndices(lower, unitCols, 3);
      const expandedQtyCols = expandSpanIndices(lower, qtyCols, 3);
      const expandedPriceCols = expandSpanIndices(lower, priceCols, 3);

      if (unitCols.length > 0) {
        const unitSet = new Set(unitCols);
        const filteredDesc = descCols.filter((c) => !unitSet.has(c));
        if (filteredDesc.length > 0) descCols = filteredDesc;
        const filteredCode = codeCols.filter((c) => !unitSet.has(c));
        if (filteredCode.length > 0) codeCols = filteredCode;
      }

      const hasDataRowBelow = rows
        .slice(r + 1, Math.min(stopRow, r + 15))
        .some((dRow) => dRow && dRow.some((cell) => parseNumberCell(cell) !== null));
      if (!hasDataRowBelow) continue;

      const score =
        (descCols.length ? 3 : 0) +
        (expandedQtyCols.length ? 3 : 0) +
        (unitCols.length ? 2 : 0) +
        (codeCols.length ? 2 : 0) +
        (expandedPriceCols.length ? 1 : 0);

      if (!bestMatch || score >= bestMatch.score) {
        bestMatch = {
          headerIndex: r,
          score,
          spans: {
            code: codeCols,
            description: descCols,
            unit: unitCols,
            quantity: expandedQtyCols,
            unitPrice: expandedPriceCols,
            vat: vatCols,
            discount: discountCols,
          },
        };
      }
    }
  }

  return bestMatch ? { headerIndex: bestMatch.headerIndex, spans: bestMatch.spans } : null;
}

function readSpanString(
  row: SheetCell[],
  cols: number[],
  validator?: (val: string) => boolean,
): string {
  if (cols.length === 0) return "";
  if (validator) {
    for (const c of cols) {
      const v = String(row[c] ?? "").trim();
      if (v && validator(v)) return v;
    }
  }
  for (const c of cols) {
    const v = String(row[c] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function readSpanCell(row: SheetCell[], cols: number[]): SheetCell {
  for (const c of cols) {
    const cell = row[c];
    if (cell !== null && cell !== undefined && String(cell).trim() !== "") {
      return cell;
    }
  }
  return null;
}

export function parseQuoteRows(
  rows: SheetCell[][],
  fileName = "dosya",
  idFactory: () => string = () => crypto.randomUUID(),
): QuoteImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const items: Partial<QuoteItem>[] = [];

  if (rows.length === 0) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings, errors: ["Dosya boş."] };
  }

  const repeatingBlockStarts = findRepeatingBlockStarts(rows);
  const firstBlockRow = repeatingBlockStarts.length > 0 ? repeatingBlockStarts[0] : rows.length;
  const headerInfo = findHeaderRow(rows, firstBlockRow);

  // If the workbook has no flat/pivot summary header before repeating blocks, parse the repeating blocks!
  if (!headerInfo && repeatingBlockStarts.length > 0) {
    return parseRepeatingBlockQuoteRows(rows, repeatingBlockStarts, fileName, idFactory);
  }

  let startRow = 0;
  let spans: ColumnSpans;

  if (headerInfo) {
    startRow = headerInfo.headerIndex + 1;
    spans = headerInfo.spans;
  } else {
    // Başlık bulunamadı; varsayılan kolon dizilimi tahmini: [0: Açıklama, 1: Birim, 2: Miktar, 3: Birim Fiyat]
    warnings.push("Standart başlık satırı saptanamadı; varsayılan kolon dizilimi (Açıklama, Birim, Miktar, Birim Fiyat) denendi.");
    spans = {
      code: [],
      description: [0],
      unit: [1],
      quantity: [2],
      unitPrice: [3],
      vat: [],
      discount: [],
    };
  }

  let skippedRowCount = 0;
  let lastNamedCode = "";
  let lastNamedDesc = "";
  let lastNamedUnit = "";
  const isMultiRowContractorSheet = startRow > 1;

  for (let r = startRow; r < firstBlockRow; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }

    const codeRaw = readSpanString(row, spans.code);
    let descRaw = readSpanString(
      row,
      spans.description.filter((c) => !spans.code.includes(c) || spans.description.length === spans.code.length),
    );
    if (!descRaw) {
      descRaw = readSpanString(row, spans.description);
    }
    const unitRaw = readSpanString(row, spans.unit, isKnownUnitValue);
    const qtyRaw = readSpanCell(row, spans.quantity);
    const priceRaw = readSpanCell(row, spans.unitPrice);
    const vatRaw = readSpanCell(row, spans.vat);
    const discountRaw = readSpanCell(row, spans.discount);

    let effectiveCode = codeRaw;
    let effectiveDesc = descRaw;

    if (isMultiRowContractorSheet) {
      if (!effectiveDesc && effectiveCode) {
        effectiveDesc = effectiveCode;
      } else if (!effectiveDesc && !effectiveCode && unitRaw && isKnownUnitValue(unitRaw)) {
        const qtyCheck = parseNumberCell(qtyRaw);
        if (qtyCheck !== null && qtyCheck > 0 && lastNamedDesc && lastNamedUnit && lastNamedUnit !== normalizeUnit(unitRaw)) {
          effectiveCode = lastNamedCode;
          effectiveDesc = `${lastNamedDesc} (${unitRaw})`;
        }
      }
    }

    if (!effectiveDesc) {
      skippedRowCount++;
      continue;
    }

    // Toplam satırlarını (Subtotal, Total, vb.) atla
    const lowerDesc = cleanHeader(effectiveDesc);
    if (
      lowerDesc === "toplam" ||
      lowerDesc === "genel toplam" ||
      lowerDesc === "ara toplam" ||
      lowerDesc === "toplam:" ||
      lowerDesc === "genel toplam:" ||
      lowerDesc === "ara toplam:" ||
      lowerDesc.startsWith("total")
    ) {
      skippedRowCount++;
      continue;
    }

    const quantity = parseNumberCell(qtyRaw);
    if (quantity === null || quantity <= 0) {
      warnings.push(`Satır ${r + 1} (${effectiveDesc.slice(0, 30)}): geçerli miktar bulunamadığı için atlandı.`);
      skippedRowCount++;
      continue;
    }

    lastNamedCode = effectiveCode;
    lastNamedDesc = effectiveDesc;
    lastNamedUnit = normalizeUnit(unitRaw);

    const unitPrice = parseNumberCell(priceRaw) ?? 0;
    if (unitPrice === 0 && priceRaw !== 0 && priceRaw !== "0") {
      warnings.push(`Satır ${r + 1} (${effectiveDesc.slice(0, 30)}): birim fiyat bulunamadı, 0 ₺ olarak kaydedildi.`);
    }

    const vat = parseNumberCell(vatRaw) ?? 20;
    const discount = parseNumberCell(discountRaw) ?? 0;

    const fullDescription =
      effectiveCode && effectiveCode !== effectiveDesc
        ? `[${effectiveCode}] ${effectiveDesc}`
        : effectiveDesc;

    const item: Partial<QuoteItem> = {
      id: idFactory(),
      description: fullDescription,
      unit: normalizeUnit(unitRaw),
      quantity,
      unitPrice,
      costUnitPrice: null,
      discountPercent: Math.min(100, Math.max(0, discount)),
      vatPercent: Math.min(100, Math.max(0, vat)),
      quantitySource: "manual",
      priceSource: "manual",
      sourceReference: `Excel/CSV içe aktarım (${fileName}, satır ${r + 1})`,
      verificationStatus: "unverified",
      wastePercent: 0,
      costCategory: "material",
    };
    item.total = calculateLineItemTotal(item);
    items.push(item);
  }

  return {
    items,
    totalImported: items.length,
    skippedRowCount,
    warnings,
    errors,
  };
}

/** CSV metnini satır ve hücrelere ayırır (noktalı virgül veya virgül destekli). */
export function parseQuoteCsv(text: string, fileName = "teklif.csv"): QuoteImportResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: ["CSV dosyası boş."] };
  }

  try {
    return parseQuoteRows(parseCsv(trimmed), fileName);
  } catch {
    return { items: [], totalImported: 0, skippedRowCount: 0, warnings: [], errors: ["CSV tırnak veya satır yapısı geçersiz."] };
  }
}

/** .xlsx dosyasını tarayıcıda dinamik quote-xlsx / exceljs parçasından okur. */
export async function parseQuoteXlsx(data: ArrayBuffer | Uint8Array, fileName = "teklif.xlsx"): Promise<QuoteImportResult> {
  const { parseQuoteXlsx: impl } = await import("./quote-xlsx");
  return impl(data, fileName);
}

/** Teklif hazırlama için standart CSV şablonu üretir. */
export function buildQuoteCsvTemplate(): string {
  return serializeCsv([
    ["Poz No", "İş Kalemi Açıklaması", "Birim", "Miktar", "Birim Fiyat (TL)", "KDV (%)", "İskonto (%)"],
    ["15.120.1001", "C25/30 Hazır Beton Dökülmesi", "m3", 1250, 3450, 20, 0],
    ["15.140.1002", "Nervürlü Donatı Çeliği Temini ve İşçiliği", "ton", 95, 42000, 20, 0],
    ["15.150.1005", "Plywood Kalıp Yapılması", "m2", 4800, 650, 20, 0],
    ["27.501.1001", "İç Cephe Alçı Sıva Yapılması", "m2", 3200, 185, 20, 0],
  ], { delimiter: ";" });
}
