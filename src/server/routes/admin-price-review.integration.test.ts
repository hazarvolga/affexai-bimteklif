import { priceSourceIdentity } from '../crawler/source-identity';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { useTestIsolation } from './test-isolation';
import { skipIfDatabaseUnavailable } from './test-db-reachability';

useTestIsolation();

test('price review commits audit, source and prices together and serializes competing approvals', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, { db }, schema, { AuthService }, { eq, sql }] = await Promise.all([
    import('../app'), import('../../db'), import('../../db/schema'), import('../../services/auth/authService'), import('drizzle-orm'),
  ]);
  const server = createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const [admin] = await db.insert(schema.users).values({ email: `${randomUUID()}@example.test`, fullName: 'Admin', isSuperAdmin: true, emailVerified: new Date() }).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({ name: 'Source', code: randomUUID(), category: 'official_gazette', reviewStatus:'verified',reviewEvidenceReference:'https://example.test/permission',reviewScope:'Teklif kullanimi',reviewAllowsQuotations:true,reviewedByUserId:admin.id,reviewedAt:new Date(), authorizationStatus: 'authorized', authorizationEvidenceHash:'b'.repeat(64), authorizedAt:new Date() }).returning();
  const old = randomUUID(), first = randomUUID(), second = randomUUID();
  await db.insert(schema.priceFeedStaging).values([old, first, second].map((id, i) => ({ id, sourceId: source.id, contentHash:'a'.repeat(64),sourceIdentity:priceSourceIdentity(source), itemCode: 'A', itemName: 'Fixture', unit: 'm', crawledPrice: '100.00', sourceUrl: 'https://example.test/price', notes: '[live-html-v1] fixture', status: i === 0 ? 'approved' : 'pending' })));
  const token = AuthService.generateToken({ userId: admin.id, companyId: null, role: null });
  const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const path = '/api/admin/pricing-sources/staging';
  await db.execute(sql`CREATE FUNCTION reject_price_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'price_feed_%' THEN RAISE EXCEPTION 'simulated audit failure'; END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER reject_price_review_audit BEFORE INSERT ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION reject_price_review_audit()`);
  try {
    assert.equal((await post(`${path}/${first}/review`, { action: 'approve' })).status, 500);
    assert.equal((await post(`${path}/bulk-review`, { action: 'approve', sourceId: source.id })).status, 500);
    const rows = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId, source.id));
    assert.deepEqual(rows.map(row => [row.id, row.status]).sort(), [[old, 'approved'], [first, 'pending'], [second, 'pending']].sort());
    const [unchanged] = await db.select().from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id, source.id));
    assert.equal(unchanged.authorizationStatus, 'authorized');
    assert.equal(unchanged.authorizationEvidenceHash, 'b'.repeat(64));
  } finally {
    await db.execute(sql`DROP TRIGGER reject_price_review_audit ON admin_audit_logs`);
    await db.execute(sql`DROP FUNCTION reject_price_review_audit()`);
  }
  await db.execute(sql`CREATE FUNCTION delay_price_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'approved' THEN PERFORM pg_sleep(0.2); END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER delay_price_approval BEFORE UPDATE ON price_feed_staging FOR EACH ROW EXECUTE FUNCTION delay_price_approval()`);
  try {
    const responses = await Promise.all([first, second].map(id => post(`${path}/${id}/review`, { action: 'approve' })));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 200]);
    const reviewed = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId, source.id));
    assert.equal(reviewed.filter(row => row.status === 'approved').length, 1);
    const logs = await db.select().from(schema.adminAuditLogs).where(eq(schema.adminAuditLogs.adminId, admin.id));
    assert.equal(logs.filter(row => row.action === 'price_feed_approve').length, 2);
  } finally {
    await db.execute(sql`DROP TRIGGER delay_price_approval ON price_feed_staging`);
    await db.execute(sql`DROP FUNCTION delay_price_approval()`);
  }

  const firstPending = randomUUID(), secondPending = randomUUID();
  await db.insert(schema.priceFeedStaging).values([
    { id: firstPending, sourceId: source.id, itemCode: 'B', itemName: 'B', unit: 'm', crawledPrice: '100', status: 'pending' },
    { id: secondPending, sourceId: source.id, itemCode: 'C', itemName: 'C', unit: 'm', crawledPrice: '100', status: 'pending' },
  ]);
  await db.execute(sql`CREATE FUNCTION delay_bulk_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.item_code = 'B' AND NEW.status = 'rejected' THEN PERFORM pg_sleep(0.8); END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER delay_bulk_review BEFORE UPDATE ON price_feed_staging FOR EACH ROW EXECUTE FUNCTION delay_bulk_review()`);
  try {
    const review = post(`${path}/bulk-review`, { action: 'reject', sourceId: source.id });
    let sleeping = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event = 'PgSleep' AND query ILIKE '%price_feed_staging%'`);
      if (result.rows[0]?.n) { sleeping = true; break; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(sleeping, true, 'bulk review must reach delayed first update');
    let deleted = false;
    const deletion = db.delete(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.id, secondPending)).returning().then(rows => { deleted = true; return rows; });
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(deleted, false, 'concurrent delete must wait for selected review rows');
    const response = await review;
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { processedCount: number }).processedCount, 2);
    assert.equal((await deletion).length, 1);
  } finally {
    await db.execute(sql`DROP TRIGGER delay_bulk_review ON price_feed_staging`);
    await db.execute(sql`DROP FUNCTION delay_bulk_review()`);
  }

  const suppressed = randomUUID();
  await db.insert(schema.priceFeedStaging).values({ id: suppressed, sourceId: source.id, itemCode: 'D', itemName: 'D', unit: 'm', crawledPrice: '100', status: 'pending' });
  await db.execute(sql`CREATE FUNCTION suppress_price_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.item_code = 'D' THEN RETURN NULL; END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER suppress_price_update BEFORE UPDATE ON price_feed_staging FOR EACH ROW EXECUTE FUNCTION suppress_price_update()`);
  try {
    assert.equal((await post(`${path}/${suppressed}/review`, { action: 'reject' })).status, 500);
    assert.equal((await post(`${path}/bulk-review`, { action: 'reject', sourceId: source.id })).status, 500);
    const [row] = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.id, suppressed));
    assert.equal(row.status, 'pending', 'zero-row update must not produce a successful audit');
  } finally {
    await db.execute(sql`DROP TRIGGER suppress_price_update ON price_feed_staging`);
    await db.execute(sql`DROP FUNCTION suppress_price_update()`);
  }

  const remaining = randomUUID();
  await db.insert(schema.priceFeedStaging).values({ id: remaining, sourceId: source.id, itemCode: 'E', itemName: 'E', unit: 'm', crawledPrice: '100', status: 'pending' });
  // The catalog importer acquires the source lock before deleting staging.
  // Reproduce that order while a bulk review starts on another connection.
  const importer = db.transaction(async tx => {
    await tx.select({ id: schema.pricingDataSources.id }).from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id, source.id)).for('update');
    await tx.execute(sql`SELECT pg_sleep(0.5)`);
    await tx.delete(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.id, suppressed));
  });
  let importerSleeping = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event = 'PgSleep' AND query ILIKE '%SELECT pg_sleep%'`);
    if (result.rows[0]?.n) { importerSleeping = true; break; }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.equal(importerSleeping, true, 'importer must hold the source lock');
  const reviewAfterImport = post(`${path}/bulk-review`, { action: 'reject', sourceId: source.id });
  await importer;
  const response = await reviewAfterImport;
  assert.equal(response.status, 200, 'source-then-staging lock order avoids a deadlock');
  assert.equal((await response.json() as { processedCount: number }).processedCount, 1);
});
