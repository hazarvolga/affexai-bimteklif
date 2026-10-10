import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { plans, subscriptions } from "../../db/schema";

export const SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES = 25 * 1024 * 1024;
export const SMARTCHECK_MAX_IFC_FILE_BYTES = 100 * 1024 * 1024;
export const SMARTCHECK_MAX_FILE_BYTES = Math.max(SMARTCHECK_MAX_SPREADSHEET_FILE_BYTES, SMARTCHECK_MAX_IFC_FILE_BYTES);

export function smartcheckImportEnabled(companyId: string, isCompanyDbEnabled = false): boolean {
  if (process.env.SMARTCHECK_IMPORT_ENABLED !== "true") return false;
  if (isCompanyDbEnabled) return true;
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

export interface TenantIfcLimits {
  maxFileBytes: number;
  maxConcurrent: number;
  monthlyLimit: number | null;
}

export function getTenantIfcLimits(_companyId?: string, overrides?: Partial<TenantIfcLimits>): TenantIfcLimits {
  const envMaxMb = parseInt(process.env.SMARTCHECK_MAX_IFC_FILE_MB || "100", 10);
  const envMaxConcurrent = parseInt(process.env.SMARTCHECK_IFC_MAX_CONCURRENT || "2", 10);
  const envMonthly = process.env.SMARTCHECK_IFC_MONTHLY_LIMIT ? parseInt(process.env.SMARTCHECK_IFC_MONTHLY_LIMIT, 10) : null;
  return {
    maxFileBytes: overrides?.maxFileBytes ?? envMaxMb * 1024 * 1024,
    maxConcurrent: overrides?.maxConcurrent ?? envMaxConcurrent,
    monthlyLimit: overrides?.monthlyLimit !== undefined ? overrides.monthlyLimit : envMonthly,
  };
}

export async function fetchTenantIfcLimits(companyId: string): Promise<TenantIfcLimits> {
  const envMaxMb = parseInt(process.env.SMARTCHECK_MAX_IFC_FILE_MB || "100", 10);
  const envMaxConcurrent = parseInt(process.env.SMARTCHECK_IFC_MAX_CONCURRENT || "2", 10);
  const envMonthly = process.env.SMARTCHECK_IFC_MONTHLY_LIMIT ? parseInt(process.env.SMARTCHECK_IFC_MONTHLY_LIMIT, 10) : null;

  try {
    const [sub] = await db
      .select({
        planId: subscriptions.planId,
        bonusIfcLimit: subscriptions.bonusIfcLimit,
        planIfcLimit: plans.monthlyIfcLimit,
        planMaxFileMb: plans.ifcMaxFileMb,
        planMaxConcurrent: plans.ifcMaxConcurrent,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.companyId, companyId));

    if (!sub || !sub.planId) {
      return getTenantIfcLimits(companyId);
    }

    const maxMb = Math.min(sub.planMaxFileMb ?? envMaxMb, envMaxMb);
    const maxConcurrent = Math.min(sub.planMaxConcurrent ?? envMaxConcurrent, envMaxConcurrent);
    const monthlyLimit = sub.planIfcLimit != null ? sub.planIfcLimit + (sub.bonusIfcLimit || 0) : envMonthly;

    return {
      maxFileBytes: maxMb * 1024 * 1024,
      maxConcurrent,
      monthlyLimit,
    };
  } catch {
    return getTenantIfcLimits(companyId);
  }
}
