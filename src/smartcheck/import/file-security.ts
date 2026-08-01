import crypto from "node:crypto";
import yauzl from "yauzl";
import { SMARTCHECK_MAX_IFC_FILE_BYTES, SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES } from "./config";

export type SmartCheckFileKind = "xlsx" | "csv" | "ifc";

const XLSX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream",
]);
const CSV_MIMES = new Set(["text/csv", "text/plain", "application/csv", "application/octet-stream"]);
const IFC_MIMES = new Set(["model/ifc", "application/ifc", "application/octet-stream", "text/plain"]);

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function detectAndValidateFile(buffer: Buffer, fileName: string, claimedMime: string): SmartCheckFileKind {
  if (buffer.length === 0) throw new Error("FILE_SIZE_INVALID");
  const extension = fileName.toLocaleLowerCase("tr-TR").split(".").pop();
  const isZip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  const text = sample.toString("utf8");
  if ((extension === "xlsx" || extension === "csv") && buffer.length > SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES) throw new Error("FILE_SIZE_INVALID");
  if (extension === "ifc" && buffer.length > SMARTCHECK_MAX_IFC_FILE_BYTES) throw new Error("FILE_SIZE_INVALID");
  if (extension === "xlsx" && isZip && XLSX_MIMES.has(claimedMime)) return "xlsx";
  const isText = !sample.includes(0) && (text.includes(",") || text.includes(";"));
  if (extension === "csv" && !isZip && isText && CSV_MIMES.has(claimedMime)) return "csv";
  const isIfcText = !sample.includes(0) && text.includes("ISO-10303-21") && /FILE_SCHEMA\s*\(\s*\(\s*'IFC/i.test(text);
  if (extension === "ifc" && !isZip && isIfcText && IFC_MIMES.has(claimedMime)) return "ifc";
  throw new Error("FILE_SIGNATURE_MISMATCH");
}

export function maxBytesForSmartCheckFileName(fileName: string): number {
  return fileName.toLocaleLowerCase("tr-TR").endsWith(".ifc")
    ? SMARTCHECK_MAX_IFC_FILE_BYTES
    : SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES;
}

export function sanitizeSpreadsheetText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function validateXlsxArchive(buffer: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) return reject(new Error("XLSX_CORRUPT"));
      let entries = 0;
      let totalUncompressed = 0;
      const fail = (code: string) => { zipFile.close(); reject(new Error(code)); };
      zipFile.on("error", () => reject(new Error("XLSX_CORRUPT")));
      zipFile.on("entry", (entry) => {
        entries += 1;
        totalUncompressed += entry.uncompressedSize;
        if ((entry.generalPurposeBitFlag & 0x1) !== 0) return fail("XLSX_ENCRYPTED");
        if (entries > 10_000 || totalUncompressed > 250 * 1024 * 1024 || totalUncompressed / Math.max(buffer.length, 1) > 100) {
          return fail("XLSX_ZIP_BOMB_RISK");
        }
        zipFile.readEntry();
      });
      zipFile.on("end", () => resolve());
      zipFile.readEntry();
    });
  });
}
