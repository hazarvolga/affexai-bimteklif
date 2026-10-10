import { sql } from "drizzle-orm";
import type { db as database } from "../../db";

const tables = {
  usage_records_company_id_period_key: "usage_records",
  usage_records_quote_count_nonnegative: "usage_records",
  subscriptions_bonus_quote_limit_nonnegative: "subscriptions",
} as const;

// The caller must repair its own legacy fixture rows before the callback exits.
export async function withLegacyQuotaConstraint(
  db: typeof database,
  constraint: keyof typeof tables,
  run: () => Promise<void>,
) {
  const schema = String((await db.execute(sql`SELECT current_schema() AS schema`)).rows[0].schema);
  if (!/^teklifpro_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Legacy fixture constraints require an isolated test schema");
  const table = tables[constraint];
  const { rows: [original] } = await db.execute<{ definition: string }>(sql`
    SELECT pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = ${schema} AND t.relname = ${table} AND c.conname = ${constraint}`);
  const target = sql`${sql.identifier(schema)}.${sql.identifier(table)}`;
  if (original) await db.execute(sql`ALTER TABLE ${target} DROP CONSTRAINT ${sql.identifier(constraint)}`);
  try {
    await run();
  } finally {
    if (original) await db.execute(sql`ALTER TABLE ${target} ADD CONSTRAINT ${sql.identifier(constraint)} ${sql.raw(original.definition)}`);
  }
}
