/**
 * Tablo dosyası biçimi tespiti (Faz 1, C-2). Eski Excel (.xls, BIFF/OLE) dosyaları ExcelJS ile okunamaz;
 * kullanıcıya anlaşılmaz bir hata yerine ne yapacağı söylenir. Uzantısı değiştirilmiş eski dosya da
 * imzasından (D0 CF 11 E0 A1 B1 1A E1) tanınır.
 */

export type SpreadsheetKind = "xlsx" | "csv" | "xls" | "other";

export const LEGACY_XLS_MESSAGE =
  "Bu dosya eski Excel biçiminde (.xls). Excel'de dosyayı açıp Dosya → Farklı Kaydet → \"Excel Çalışma Kitabı (.xlsx)\" seçerek kaydedin ve yeni dosyayı yükleyin.";

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

function hasOleSignature(head: Uint8Array | null): boolean {
  return head !== null && head.length >= OLE_SIGNATURE.length && OLE_SIGNATURE.every((byte, index) => head[index] === byte);
}

export function isLegacyXls(fileName: string, head: Uint8Array | null): boolean {
  return /\.xls$/i.test(fileName.trim()) || hasOleSignature(head);
}

export function spreadsheetKind(fileName: string, head: Uint8Array | null): SpreadsheetKind {
  if (isLegacyXls(fileName, head)) return "xls";
  if (/\.xlsx$/i.test(fileName.trim())) return "xlsx";
  if (/\.csv$/i.test(fileName.trim())) return "csv";
  return "other";
}

/** Reads only the first bytes, enough for the signature check. */
export async function readFileHead(file: Blob, length = OLE_SIGNATURE.length): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, length).arrayBuffer());
}
