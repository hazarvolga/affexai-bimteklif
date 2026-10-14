export function parseTurkishPrice(raw: string): number | null {
  if (!raw || raw.length > 4096) return null;
  // Locate each currency marker once and scan adjacent digits without backtracking.
  const marker = /TL|₺|USD|\$|EUR|€/gi;
  let match: string[] | null = null;
  let currency: RegExpExecArray | null;
  while ((currency = marker.exec(raw)) !== null) {
    let end = currency.index;
    while (end > 0 && /\s/.test(raw[end - 1])) end--;
    let start = end;
    while (start > 0 && /[\d.,]/.test(raw[start - 1])) start--;
    if (start < end) { match = ['', raw.slice(start, end)]; break; }
    start = marker.lastIndex;
    while (start < raw.length && /\s/.test(raw[start])) start++;
    end = start;
    while (end < raw.length && /[\d.,]/.test(raw[end])) end++;
    if (start < end) { match = ['', raw.slice(start, end)]; break; }
  }

  if (!match) return null;
  let numStr = match[1].trim();

  // If contains both . and ,
  if (numStr.includes(".") && numStr.includes(",")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
      // 38.200,50 (TR standard: dot=thousand, comma=decimal)
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      // 38,200.50 (US standard: comma=thousand, dot=decimal)
      numStr = numStr.replace(/,/g, "");
    }
  } else if (numStr.includes(",")) {
    const parts = numStr.split(",");
    if (parts.length === 2 && parts[1].length === 3) {
      // 38,200 -> thousand separator
      numStr = numStr.replace(/,/g, "");
    } else {
      // 25,50 -> decimal separator
      numStr = numStr.replace(",", ".");
    }
  } else if (numStr.includes(".")) {
    const parts = numStr.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      // 38.200 -> thousand separator
      numStr = numStr.replace(/\./g, "");
    }
  }

  const val = parseFloat(numStr);
  if (!Number.isFinite(val) || val <= 0) return null;
  // Self-contained (serialized into the parser worker): same half-cent rule as
  // roundMoney in lib/calculations; toFixed(2) would turn 12345.675 into .67.
  const text = String(val);
  return Math.round(text.includes("e") ? val * 100 : Number(`${text}e2`)) / 100;
}

export function inferCrawledItemUnit(itemName: string, sourceCode = "", sourceName = "", rawUnit = ""): string {
  const cleanRaw = rawUnit.trim().toLowerCase();
  if (cleanRaw === "m3" || cleanRaw === "m³") return "m³";
  if (cleanRaw === "m2" || cleanRaw === "m²") return "m²";
  if (
    cleanRaw &&
    cleanRaw !== "inceleme gerekli" &&
    cleanRaw !== "kaynak birimi" &&
    cleanRaw !== "birim" &&
    cleanRaw !== "-"
  ) {
    return rawUnit.trim();
  }
  const combined = `${itemName} ${sourceCode} ${sourceName}`.toLowerCase();
  if (/\b(m3|m³)\b/i.test(itemName)) return "m³";
  if (/\b(m2|m²)\b/i.test(itemName)) return "m²";
  if (/\b(ton)\b/i.test(itemName)) return "ton";
  if (/\b(kg)\b/i.test(itemName)) return "kg";
  if (/\b(adet|ad)\b/i.test(itemName)) return "adet";
  if (/\b(c\s*1[468]|c\s*2[05]|c\s*3[05]|c\s*4[05]|c\s*50|beton|grobeton|şap)\b/i.test(combined) || sourceCode.includes("concrete")) return "m³";
  if (/\b(demir|çelik|steel|nervür|kangal|filmaşin)\b/i.test(combined) || sourceCode.includes("steel")) return "ton";
  if (/\b(çimento|kireç|alçı)\b/i.test(combined)) return "ton";
  if (/\b(kalıp|sıva|boya|duvar|yalıtım)\b/i.test(combined)) return "m²";
  return "birim";
}

