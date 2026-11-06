/**
 * Publication rules shared by the lean Academy content tests (topics and guides).
 * A figure with a unit or a percentage may only appear after it is reviewed with the
 * yuksek-muhendis-mimar skill against an official source; until then it is not published.
 */
export const SOFTWARE_BRANDS = /Allplan|Revit|Archicad|Tekla|Navisworks|Solibri|Primavera|MS Project|Synchro|Dalux|Autodesk|Bentley|Nemetschek|Trimble/;

/** Turkish "%35" and "35 %" as well as numbers followed by a unit (mm, m², W/m²K, GB, puan, ...). */
export const UNVERIFIED_FIGURE = /%\s*\d|\d\s*%|\d+(?:[.,]\d+)?\s*(?:mm|cm|m²|m2|m³|m|kg|W\b|kWh|GB|MB|TL|₺|puan|metre|saniye)(?![a-zçğıöşü])/i;

export const RAW_FORMULA = /\$|\\[a-z]+|\^/;
export const DEVELOPER_NOTE = /kaynak HTML|native react|kaynakta /i;
export const OLD_NAME = /Teklif ?Pro|BIMPlan/;
export const EM_DASH = /—/;
export const OVERCLAIM = /yüksek lisans|AKTS|ECTS|garanti (?:eder|ediyor)|garantili|%\s*100|sıfırla|otomatik olarak (?:ekler|hesaplar|üretir)/i;

export const CONTENT_RULES: ReadonlyArray<readonly [string, RegExp]> = [
  ['yazılım markası', SOFTWARE_BRANDS],
  ['doğrulanmamış sayı', UNVERIFIED_FIGURE],
  ['ham formül', RAW_FORMULA],
  ['geliştirici notu', DEVELOPER_NOTE],
  ['eski ad', OLD_NAME],
  ['uzun tire', EM_DASH],
  ['abartılı iddia', OVERCLAIM],
];
