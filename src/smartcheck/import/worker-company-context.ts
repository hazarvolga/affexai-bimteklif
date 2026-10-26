import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { companies } from "../../db/schema";

export type WorkerCompanyContext = {
  companyExists: boolean;
  activeStandard: string | null;
  maxWaste: string | number | null;
};

async function fetchViaCapabilityFunction(companyId: string): Promise<WorkerCompanyContext> {
  const result = await db.execute<{
    company_exists: boolean;
    active_standard: string | null;
    smartcheck_max_waste_percent: string | null;
  }>(sql`select * from public.bimmetraj_worker_get_company_context(${companyId}::uuid)`);
  const row = result.rows[0];
  return {
    companyExists: row?.company_exists === true,
    activeStandard: row?.active_standard ?? null,
    maxWaste: row?.smartcheck_max_waste_percent ?? null,
  };
}

/**
 * Production workers use the narrow capability function because the worker
 * role intentionally has no direct authority on the companies table.
 * Local/test execution retains the table-backed path for schema-cloned fixtures,
 * and falls back to the capability function when running as `bimmetraj_worker`.
 */
export async function fetchWorkerCompanyContext(companyId: string): Promise<WorkerCompanyContext> {
  if (process.env.NODE_ENV === "production") {
    return fetchViaCapabilityFunction(companyId);
  }

  try {
    const [company] = await db
      .select({ activeStandard: companies.activeStandard, maxWaste: companies.smartcheckMaxWastePercent })
      .from(companies)
      .where(eq(companies.id, companyId));
    return {
      companyExists: Boolean(company),
      activeStandard: company?.activeStandard ?? null,
      maxWaste: company?.maxWaste ?? null,
    };
  } catch (error: any) {
    const code = error?.code ?? error?.cause?.code;
    if (code === "42501") {
      return fetchViaCapabilityFunction(companyId);
    }
    throw error;
  }
}
