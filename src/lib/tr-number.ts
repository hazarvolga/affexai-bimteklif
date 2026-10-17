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
