/**
 * Türkçe biçimli sayı ayrıştırıcı. "1.250.000,50", "1250000,5", "1 250 000" ve "1250000.5" okunur.
 * Geçersiz, boş veya sonsuz değerde null döner.
 */
export function parseTrNumber(raw: string): number | null {
  let t = raw.trim().replace(/[\s\u00A0]/g, "");
  if (t === "") return null;
  const hasComma = t.includes(",");
  const dots = (t.match(/\./g) ?? []).length;
  if (hasComma) {
    // Virgül ondalık ayıracıdır; noktalar binlik ayıracıdır.
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (dots > 1) {
    // 1.250.000 → yalnız binlik noktaları
    t = t.replace(/\./g, "");
  } else if (dots === 1 && /^\d{1,3}\.\d{3}$/.test(t)) {
    // 1.250 belirsizdir; Türkçe bağlamda binlik ayıracı kabul edilir.
    t = t.replace(".", "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Satır sonu, noktalı virgül veya sekmeyle ayrılmış sayı listesi. Geçersiz öğeleri ayrıca bildirir. */
export function parseTrNumberList(raw: string): { values: number[]; invalid: string[] } {
  const values: number[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[\n;\t]+/)) {
    if (part.trim() === "") continue;
    const n = parseTrNumber(part);
    if (n === null) invalid.push(part.trim());
    else values.push(n);
  }
  return { values, invalid };
}

const AMBIGUOUS_DOT = /^-?[1-9]\d{0,2}\.\d{3}$/;

function cleanNumberText(raw: string): string {
  return raw.trim().replace(/[\s\u00A0]/g, "").replace(/[₺$€]/g, "").replace(/^%|%$/g, "");
}

/** "1.250" is 1250 in a Turkish file and 1.25 in an English one; only the author can tell. */
export function isAmbiguousNumberText(raw: string): boolean {
  return AMBIGUOUS_DOT.test(cleanNumberText(raw));
}

/**
 * Number reader for imported text. Ambiguous input returns null so a caller can never store a
 * value that may be off by 1000; use isAmbiguousNumberText to tell the user why it was refused.
 */
export function parseImportNumber(raw: string): number | null {
  const text = cleanNumberText(raw);
  if (!text || AMBIGUOUS_DOT.test(text)) return null;
  let canonical: string | null = null;
  if (/^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(text)) canonical = text.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(text) || /^-?\d{1,3}(,\d{3}){2,}$/.test(text)) canonical = text.replace(/,/g, "");
  else if (/^-?\d+,\d+$/.test(text)) canonical = text.replace(",", ".");
  else if (/^-?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?$/i.test(text)) canonical = text;
  if (canonical === null) return null;
  const value = Number(canonical);
  return Number.isFinite(value) ? value : null;
}

/** For row and column detection: true for a readable number and for an ambiguous one. */
export function isNumberText(raw: string): boolean {
  return parseImportNumber(raw) !== null || isAmbiguousNumberText(raw);
}

/** Text for a numeric spreadsheet cell; its dot is a decimal point, so it must not read as ambiguous. */
export function numericCellText(value: number): string {
  const text = String(value);
  return AMBIGUOUS_DOT.test(text) ? `${text}0` : text;
}
