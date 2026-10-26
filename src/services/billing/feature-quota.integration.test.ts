import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('package limits gate PDF reservations atomically and released reservations free the slot', async () => {
  const [{ db }, schema, { reserveFeatureUsage, releaseFeatureUsage }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./feature-quota')]);
  const [company] = await db.insert(schema.companies).values({ name: 'PDF quota' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'pdf-quota@example.test', fullName: 'PDF tester' }).returning();
  const [plan] = await db.insert(schema.plans).values({ name: 'Two PDFs', monthlyQuoteLimit: 5, monthlyPrice: 100, monthlyPdfLimit: 2 }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01') });
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED')));
  const granted = results.filter(result => result.status === 'fulfilled');
  assert.equal(granted.length, 2);
  for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.code, 'PDF_QUOTA_EXCEEDED');
  await releaseFeatureUsage(company.id, (granted[0] as PromiseFulfilledResult<{ id: string }>).value.id);
  assert.equal((await reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED')).limit, 2);
  const rows = await db.select().from(schema.usageLogs).where(and(eq(schema.usageLogs.companyId, company.id), eq(schema.usageLogs.feature, 'PDF_GENERATED')));
  assert.equal(rows.length, 2);
});

test('the enterprise package gets its own AI allowance instead of the starter 20', async () => {
  const [{ db }, schema, { reserveAiUsage }, { canonicalPlans }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./ai-quota'), import('./plan-catalog')]);
  const enterprise = canonicalPlans[4];
  const [company] = await db.insert(schema.companies).values({ name: 'Enterprise AI' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'enterprise-ai@example.test', fullName: 'Enterprise' }).returning();
  const [plan] = await db.insert(schema.plans).values({ name: enterprise.name, monthlyQuoteLimit: enterprise.monthlyQuoteLimit, monthlyPrice: enterprise.monthlyPrice, monthlyAiLimit: enterprise.monthlyAiLimit }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01') });
  await db.insert(schema.usageLogs).values({ companyId: company.id, userId: user.id, feature: 'AI_QUOTATION_GENERATED', count: 20 });
  const reservation = await reserveAiUsage(company.id, user.id);
  assert.deepEqual([reservation.current, reservation.limit], [21, enterprise.monthlyAiLimit]);
  assert.ok((enterprise.monthlyAiLimit ?? 0) > 20, 'the enterprise catalog AI limit must exceed the starter 20');
  const report = await import('./usage-report').then(module => module.readBillingUsage({ companyId: company.id, userId: user.id }));
  const pdf = report.usage.find(row => row.feature === 'PDF_GENERATED');
  assert.equal(pdf?.enforced, true);
  assert.equal(pdf?.limit, 20, 'unset PDF column falls back to the legacy limit');
});

test('re-rendering the same quotation version reuses its PDF reservation; a new version or a released one consumes again', async () => {
  const [{ db }, schema, { reserveFeatureUsage, releaseFeatureUsage }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./feature-quota')]);
  const [company] = await db.insert(schema.companies).values({ name: 'PDF versions' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'pdf-versions@example.test', fullName: 'PDF versions' }).returning();
  const [plan] = await db.insert(schema.plans).values({ name: 'Two PDFs', monthlyQuoteLimit: 5, monthlyPrice: 100, monthlyPdfLimit: 2 }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01') });
  const quoteA = { quotationId: '11111111-1111-4111-8111-11111111111a', versionKey: '1:2026-10-26T10:00:00.000Z' };
  const rows = () => db.select().from(schema.usageLogs).where(and(eq(schema.usageLogs.companyId, company.id), eq(schema.usageLogs.feature, 'PDF_GENERATED')));

  const first = await reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED', quoteA);
  assert.equal(first.reused, false);
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED', quoteA)));
  assert.ok(concurrent.every(reservation => reservation.reused && reservation.id === first.id), 'same version never consumes twice');
  assert.equal((await rows()).length, 1);
  const stored = (await rows())[0];
  assert.deepEqual([stored.quotationId, stored.quotationVersionKey], [quoteA.quotationId, quoteA.versionKey]);

  const nextVersion = await reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED', { ...quoteA, versionKey: '2:2026-10-26T11:00:00.000Z' });
  assert.equal(nextVersion.reused, false);
  assert.equal(nextVersion.current, 2);
  // The allowance is used up, but re-rendering an already counted version still works.
  assert.equal((await reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED', quoteA)).reused, true);
  await assert.rejects(reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED', { ...quoteA, versionKey: '3:2026-10-26T12:00:00.000Z' }), { code: 'PDF_QUOTA_EXCEEDED' });

  // A failed render releases its reservation; the next render of that version consumes again.
  await releaseFeatureUsage(company.id, nextVersion.id);
  assert.equal((await reserveFeatureUsage(company.id, user.id, 'PDF_GENERATED', { ...quoteA, versionKey: '2:2026-10-26T11:00:00.000Z' })).reused, false);
  assert.equal((await rows()).length, 2);
});

test('a quotation key without a version (or the reverse) is rejected by the database', async () => {
  const [{ db }, schema] = await Promise.all([import('../../db'), import('../../db/schema')]);
  const [company] = await db.insert(schema.companies).values({ name: 'PDF key pair' }).returning();
  await assert.rejects(db.insert(schema.usageLogs).values({ companyId: company.id, feature: 'PDF_GENERATED', quotationId: '11111111-1111-4111-8111-11111111111b' }));
  await assert.rejects(db.insert(schema.usageLogs).values({ companyId: company.id, feature: 'PDF_GENERATED', quotationVersionKey: '1:x' }));
});
