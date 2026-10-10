import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { useTestIsolation } from '../routes/test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
useTestIsolation();

test('admin aggregates legacy duplicates and multiple owners into one tenant row', async () => {
  const [{ db }, schema, { readAdminTenants }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('./stats'),
  ]);
  const isolated = String((await db.execute(sql`SELECT current_schema() AS name`)).rows[0].name);
  assert.match(isolated, /^teklifpro_test_[a-f0-9]{32}$/);
  // Exercise pre-migration duplicates only inside this owned disposable schema.
  await db.execute(sql`ALTER TABLE ${sql.identifier(isolated)}.usage_records DROP CONSTRAINT IF EXISTS usage_records_company_id_period_key`);
  const [company, zeroCompany] = await db.insert(schema.companies).values([{ name: 'Legacy stats' }, { name: 'Zero stats' }]).returning();
  const owners = await db.insert(schema.users).values([
    { email: 'a@example.test', fullName: 'Owner A' }, { email: 'b@example.test', fullName: 'Owner B' },
  ]).returning();
  await db.insert(schema.memberships).values(owners.map(user => ({ companyId: company.id, userId: user.id, role: 'owner' as const })));
  const [plan] = await db.insert(schema.plans).values({ name: 'Zero', monthlyQuoteLimit: 0, monthlyPrice: 0 }).returning();
  await db.insert(schema.subscriptions).values([
    { companyId: company.id, plan: 'starter', bonusQuoteLimit: 2, currentPeriodStart: new Date('2020-01-01Z') },
    { companyId: zeroCompany.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01Z') },
  ]);
  const period = String((await db.execute(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM') AS period`)).rows[0].period);
  await db.insert(schema.usageRecords).values([
    { companyId: company.id, period, quoteCount: 3 }, { companyId: company.id, period, quoteCount: 4 },
    { companyId: company.id, period: '2000-01', quoteCount: 900 }, { companyId: zeroCompany.id, period, quoteCount: 50 },
  ]);
  const rows = await readAdminTenants();
  assert.equal(rows.filter(row => row.id === company.id).length, 1);
  const legacy = rows.find(row => row.id === company.id)!;
  assert.equal(legacy.current_usage, 7);
  assert.equal(legacy.quota_limit, 22);
  assert.equal(legacy.quota_period, period);
  assert.equal(legacy.owner_email, 'a@example.test, b@example.test');
  const zero = rows.find(row => row.id === zeroCompany.id)!;
  assert.equal(zero.quota_limit, 0);
  assert.equal(zero.quota_reason, 'QUOTA_EXCEEDED');
});
