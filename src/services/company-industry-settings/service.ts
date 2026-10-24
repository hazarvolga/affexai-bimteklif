import { and, asc, eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";
import { pool } from "../../db";
import * as schema from "../../db/schema";
import { companyIndustrySettings, industries } from "../../db/schema";
import { withTenantTransaction, type TenantContext } from "../../db/tenant-context";

export class CompanyIndustrySettingsServiceError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export type CompanyIndustryActor = Readonly<{ companyId: string; userId: string; role: string }>;
export type CompanyIndustrySettingDto = Readonly<{
  industryId: string;
  preferredModel: string | null;
  customRules: string | null;
  isEnabled: boolean;
}>;

type Executor = NodePgDatabase<typeof schema>;
export type CompanyIndustryTenantTransactionRunner = <T>(
  database: pg.Pool,
  context: TenantContext,
  work: (client: pg.PoolClient) => Promise<T>,
) => Promise<T>;

function settingDto(row: typeof companyIndustrySettings.$inferSelect): CompanyIndustrySettingDto {
  return {
    industryId: row.industryId,
    preferredModel: row.preferredModel,
    customRules: row.customRules,
    isEnabled: row.isEnabled,
  };
}

function postgresCode(error: unknown): string | undefined {
  let current = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

export class CompanyIndustrySettingsService {
  constructor(
    private readonly database: pg.Pool = pool,
    private readonly tenantTransaction: CompanyIndustryTenantTransactionRunner = withTenantTransaction,
  ) {}

  private transaction<T>(actor: CompanyIndustryActor, work: (tx: Executor) => Promise<T>): Promise<T> {
    return this.tenantTransaction(this.database, actor, (client) => work(drizzle(client, { schema })));
  }

  async list(actor: CompanyIndustryActor): Promise<CompanyIndustrySettingDto[]> {
    return this.transaction(actor, async (tx) => {
      const rows = await tx.select().from(companyIndustrySettings)
        .where(eq(companyIndustrySettings.companyId, actor.companyId))
        .orderBy(asc(companyIndustrySettings.industryId));
      return rows.map(settingDto);
    });
  }

  async setEnabled(actor: CompanyIndustryActor, input: Readonly<{ industryId: string; isEnabled: boolean }>): Promise<CompanyIndustrySettingDto> {
    return this.transaction(actor, async (tx) => {
      const [industry] = await tx.select({ id: industries.id }).from(industries)
        .where(and(eq(industries.id, input.industryId), eq(industries.enabled, true)));
      if (!industry) {
        throw new CompanyIndustrySettingsServiceError(404, "INDUSTRY_NOT_FOUND", "Sektör bulunamadı veya kullanıma kapalı.");
      }
      try {
        const [setting] = await tx.insert(companyIndustrySettings)
          .values({ companyId: actor.companyId, industryId: input.industryId, isEnabled: input.isEnabled })
          .onConflictDoUpdate({
            target: [companyIndustrySettings.companyId, companyIndustrySettings.industryId],
            set: { isEnabled: input.isEnabled },
          })
          .returning();
        if (!setting) throw new Error("Industry setting upsert returned no row");
        return settingDto(setting);
      } catch (error) {
        if (postgresCode(error) === "23503") {
          throw new CompanyIndustrySettingsServiceError(503, "INDUSTRY_CATALOG_UNAVAILABLE", "Sektör kataloğu geçici olarak kullanılamıyor.", { cause: error });
        }
        throw error;
      }
    });
  }
}
