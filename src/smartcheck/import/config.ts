import path from "node:path";

export const SMARTCHECK_MAX_FILE_BYTES = 25 * 1024 * 1024;

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
