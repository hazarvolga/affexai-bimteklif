import path from "node:path";

export const SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES = 25 * 1024 * 1024;
export const SMARTCHECK_MAX_IFC_FILE_BYTES = 100 * 1024 * 1024;
export const SMARTCHECK_MAX_FILE_BYTES = Math.max(SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES, SMARTCHECK_MAX_IFC_FILE_BYTES);

export function smartcheckImportEnabled(companyId: string): boolean {
  if (process.env.SMARTCHECK_IMPORT_ENABLED !== "true") return false;
  const allowlist = (process.env.SMARTCHECK_PILOT_COMPANY_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowlist.length === 0 || allowlist.includes(companyId);
}

export function localStorageRoot(): string {
  return path.resolve(process.env.SMARTCHECK_LOCAL_STORAGE_DIR ?? ".data/smartcheck");
}

export function graphileWorkerSchema(): string {
  return process.env.GRAPHILE_WORKER_SCHEMA || "teklifpro_queue";
}
