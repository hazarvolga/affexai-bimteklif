import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { plans, subscriptions } from "../../db/schema";
import { readIfcEnvironmentLimits } from "../../server/config/ifc-limits";

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

export class IfcNotAvailableError extends Error {
  readonly status = 403;
  readonly code = "IFC_NOT_AVAILABLE";
  constructor(message = "Aktif bir IFC planı bulunmadığından IFC işlemleri kullanılamaz.") {
    super(message);
    this.name = "IfcNotAvailableError";
  }
}

export class IfcLimitsUnavailableError extends Error {
  readonly status = 503;
  readonly code = "IFC_LIMITS_UNAVAILABLE";
  constructor(message = "IFC limitleri şu anda doğrulanamıyor; lütfen daha sonra tekrar deneyin.") {
    super(message);
    this.name = "IfcLimitsUnavailableError";
  }
}

export interface TenantIfcLimits {
  maxFileBytes: number;
  maxConcurrent: number;
  monthlyLimit: number | null;
}

export async function fetchTenantIfcLimits(companyId: string, tx?: any): Promise<TenantIfcLimits> {
  let envLimits: TenantIfcLimits;
  try { envLimits = readIfcEnvironmentLimits(); }
  catch { throw new IfcLimitsUnavailableError(); }
  const envMaxMb = Math.floor(envLimits.maxFileBytes / (1024 * 1024));
  const envMaxConcurrent = envLimits.maxConcurrent;
  const envMonthly = envLimits.monthlyLimit;

  const dbClient = tx ?? db;

  let subRow: {
    planId: string | null;
    bonusIfcLimit: number | null;
    planIfcLimit: number | null;
    planMaxFileMb: number | null;
    planMaxConcurrent: number | null;
    planIsActive: boolean | null;
  } | undefined;

  try {
    const [row] = await dbClient
      .select({
        planId: subscriptions.planId,
        bonusIfcLimit: subscriptions.bonusIfcLimit,
        planIfcLimit: plans.monthlyIfcLimit,
        planMaxFileMb: plans.ifcMaxFileMb,
        planMaxConcurrent: plans.ifcMaxConcurrent,
        planIsActive: plans.isActive,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.companyId, companyId));
    subRow = row;
  } catch (error) {
    console.error(`[fetchTenantIfcLimits] DB error fetching subscription for company ${companyId}:`, error);
    throw new IfcLimitsUnavailableError();
  }

  let planMaxFileMb: number | null = null;
  let planMaxConcurrent: number | null = null;
  let planIfcLimit: number | null = null;
  let bonusIfcLimit = 0;

  if (subRow?.planId && subRow.planIsActive) {
    planMaxFileMb = subRow.planMaxFileMb;
    planMaxConcurrent = subRow.planMaxConcurrent;
    planIfcLimit = subRow.planIfcLimit;
    bonusIfcLimit = subRow.bonusIfcLimit || 0;
  } else {
    // Plansız firma politikası (kesin): subscriptions.plan_id boş olan firma,
    // en düşük fiyatlı AKTİF planın IFC limitlerini alır.
    let lowestActivePlan: {
      ifcMaxFileMb: number | null;
      ifcMaxConcurrent: number | null;
      monthlyIfcLimit: number | null;
    } | undefined;

    try {
      const [lowest] = await dbClient
        .select({
          ifcMaxFileMb: plans.ifcMaxFileMb,
          ifcMaxConcurrent: plans.ifcMaxConcurrent,
          monthlyIfcLimit: plans.monthlyIfcLimit,
        })
        .from(plans)
        .where(eq(plans.isActive, true))
        .orderBy(asc(plans.monthlyPrice), asc(plans.createdAt))
        .limit(1);
      lowestActivePlan = lowest;
    } catch (error) {
      console.error(`[fetchTenantIfcLimits] DB error fetching lowest active plan:`, error);
      throw new IfcLimitsUnavailableError();
    }

    if (!lowestActivePlan) {
      // Hiç aktif plan yoksa IFC kapalı: 403 IFC_NOT_AVAILABLE
      throw new IfcNotAvailableError();
    }

    planMaxFileMb = lowestActivePlan.ifcMaxFileMb;
    planMaxConcurrent = lowestActivePlan.ifcMaxConcurrent;
    planIfcLimit = lowestActivePlan.monthlyIfcLimit;
    bonusIfcLimit = 0;
  }

  // Env değerleri ÜST SINIR olarak uygulanır (Math.min mantığı)
  const effectiveMb = Math.min(planMaxFileMb ?? envMaxMb, envMaxMb);
  const effectiveConcurrent = Math.min(planMaxConcurrent ?? envMaxConcurrent, envMaxConcurrent);

  let effectiveMonthly: number | null = null;
  if (planIfcLimit != null) {
    const totalPlanWithBonus = planIfcLimit + bonusIfcLimit;
    effectiveMonthly = envMonthly != null ? Math.min(totalPlanWithBonus, envMonthly) : totalPlanWithBonus;
  } else {
    // Plan IFC limitini sınırsız (null) tanımlamışsa env üst sınır uygular
    effectiveMonthly = envMonthly;
  }

  if (![effectiveMb, effectiveConcurrent].every(value => Number.isSafeInteger(value) && value > 0)
      || (effectiveMonthly !== null && (!Number.isSafeInteger(effectiveMonthly) || effectiveMonthly < 0))) {
    throw new IfcLimitsUnavailableError();
  }
  return {
    maxFileBytes: effectiveMb * 1024 * 1024,
    maxConcurrent: effectiveConcurrent,
    monthlyLimit: effectiveMonthly,
  };
}
