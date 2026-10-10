import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import dotenv from 'dotenv';
import { and, eq, sql } from 'drizzle-orm';
import { useTestIsolation } from '../../server/routes/test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
useTestIsolation();

test('draft editing enforces ownership, concurrency and provenance atomically', async t => {
  const [{ db }, s, { registerQuotationEditRoutes }, { checkRole }, { AuthService }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../../server/routes/quotation-edit'),
    import('../../server/middleware/auth'), import('../auth/authService'),
  ]);
  const [company, other] = await db.insert(s.companies).values([{ name: 'Edit A' }, { name: 'Edit B' }]).returning();
  const [user, viewer] = await db.insert(s.users).values([
    { email: 'edit@example.test', fullName: 'Editor', emailVerified: new Date() },
    { email: 'view@example.test', fullName: 'Viewer', emailVerified: new Date() },
  ]).returning();
  await db.insert(s.memberships).values([
    { companyId: company.id, userId: user.id, role: 'manager' },
    { companyId: other.id, userId: user.id, role: 'owner' },
    { companyId: company.id, userId: viewer.id, role: 'viewer' },
  ]);
  const [client, otherClient] = await db.insert(s.clients).values([
    { companyId: company.id, name: 'Customer A', type: 'company' }, { companyId: other.id, name: 'Customer B', type: 'company' },
  ]).returning();
  const token = (companyId = company.id, userId = user.id) => AuthService.generateToken({ userId, companyId, role: 'manager' });
  const app = express();
  app.use(express.json());
  registerQuotationEditRoutes(app, checkRole(['owner', 'admin', 'manager']));
  const server = createServer(app);
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const request = (id: string, body?: unknown, authorization = token()) => fetch(`http://127.0.0.1:${address.port}/api/quotations/${id}/edit`, {
    method: body === undefined ? 'GET' : 'PATCH',
    headers: { Authorization: `Bearer ${authorization}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const fixture = async (fields: Partial<typeof s.quotations.$inferInsert> = {}) => {
    const [quote] = await db.insert(s.quotations).values({ companyId: company.id, clientId: client.id,
      projectName: 'Before', quoteNumber: crypto.randomUUID(), expiryDate: new Date('2027-01-01'),
      subtotal: '100', discountTotal: '0', vatTotal: '20', grandTotal: '120', ...fields }).returning();
    const [item] = await db.insert(s.quotationItems).values({ companyId: company.id, quotationId: quote.id,
      description: 'Old', unit: 'adet', quantity: '1', unitPrice: '100', total: '100' }).returning();
    return { quote, item };
  };
  const payload = (quote: typeof s.quotations.$inferSelect) => ({ ...quote, updatedAt: quote.updatedAt.toISOString(),
    projectName: 'Edited', status: 'draft', date: quote.date.toISOString(), expiryDate: quote.expiryDate.toISOString(),
    items: [{ description: 'New', unit: 'adet', quantity: 2, unitPrice: 50, discountPercent: 10, vatPercent: 20 }],
  });
  await t.test('foreign tenant and viewer cannot read or edit; foreign client is rejected', async () => {
    const { quote } = await fixture();
    for (const body of [undefined, payload(quote)]) {
      assert.equal((await request(quote.id, body, token(other.id))).status, 404);
      assert.equal((await request(quote.id, body, token(company.id, viewer.id))).status, 403);
    }
    assert.equal((await request(quote.id, { ...payload(quote), clientId: otherClient.id })).status, 400);
  });
  await t.test('latest manual draft recalculates totals without consuming quota', async () => {
    const { quote } = await fixture();
    await db.insert(s.quotationFinancials).values({ quotationId: quote.id, totalCost: '10', totalPrice: '100', profit: '90', margin: '90', riskLevel: 'low' });
    const usageBefore = await db.select().from(s.usageRecords);
    const response = await request(quote.id, payload(quote));
    assert.equal(response.status, 200, await response.clone().text());
    const saved = await response.json();
    assert.equal(saved.id, quote.id);
    assert.equal(saved.status, 'draft');
    assert.equal(Number(saved.grandTotal), 108);
    assert.notEqual(saved.updatedAt, quote.updatedAt.toISOString());
    const items = await db.select().from(s.quotationItems).where(eq(s.quotationItems.quotationId, quote.id));
    assert.equal(items.length, 1);
    assert.equal(items[0].description, 'New');
    assert.equal(Number(items[0].total), 90);
    assert.deepEqual(await db.select().from(s.usageRecords), usageBefore);
    assert.equal(await db.query.quotationFinancials.findFirst({ where: eq(s.quotationFinancials.quotationId, quote.id) }), undefined);
    assert.equal((await request(quote.id, payload(quote))).status, 409);
  });
  await t.test('nonlatest, nondraft and malformed versions are rejected', async () => {
    for (const fields of [{ isLatest: false }, { status: 'sent' as const }]) {
      const { quote } = await fixture(fields);
      assert.equal((await request(quote.id, payload(quote))).status, 409);
    }
    const { quote } = await fixture();
    assert.equal((await request(quote.id, { ...payload(quote), updatedAt: 'bad' })).status, 400);
    assert.equal((await request(quote.id, { ...payload(quote), status: 'sent' })).status, 400);
    const results = await Promise.all([request(quote.id, payload(quote)), request(quote.id, payload(quote))]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  });
  await t.test('source metadata and evidence cannot be destroyed', async () => {
    const { quote, item } = await fixture();
    await db.update(s.quotationItems).set({ quantitySource: 'imported', sourceReference: 'IFC' }).where(eq(s.quotationItems.id, item.id));
    assert.equal((await request(quote.id, payload(quote))).status, 409);
    await db.update(s.quotationItems).set({ quantitySource: 'manual', sourceReference: null }).where(eq(s.quotationItems.id, item.id));
    await db.insert(s.quotationItemEvidence).values({ companyId: company.id, quotationId: quote.id, quotationItemId: item.id,
      evidenceType: 'quantity', evidenceKey: crypto.randomUUID(), createdByUserId: user.id });
    const evidence = await db.select().from(s.quotationItemEvidence).where(eq(s.quotationItemEvidence.quotationId, quote.id));
    assert.equal((await request(quote.id)).status, 409);
    assert.equal((await request(quote.id, payload(quote))).status, 409);
    assert.deepEqual(await db.select().from(s.quotationItemEvidence).where(eq(s.quotationItemEvidence.quotationId, quote.id)), evidence);
    assert.ok(await db.query.quotationItems.findFirst({ where: eq(s.quotationItems.id, item.id) }));
  });
  await t.test('item insertion failure rolls back header and deleted items', async () => {
    const { quote, item } = await fixture();
    await db.execute(sql`CREATE FUNCTION reject_edit_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$`);
    await db.execute(sql`CREATE TRIGGER reject_edit_item BEFORE INSERT ON quotation_items FOR EACH ROW EXECUTE FUNCTION reject_edit_item()`);
    try {
      assert.equal((await request(quote.id, payload(quote))).status, 500);
      assert.deepEqual(await db.query.quotations.findFirst({ where: eq(s.quotations.id, quote.id) }), quote);
      assert.deepEqual(await db.query.quotationItems.findFirst({ where: and(eq(s.quotationItems.id, item.id), eq(s.quotationItems.companyId, company.id)) }), item);
    } finally {
      await db.execute(sql`DROP TRIGGER reject_edit_item ON quotation_items`);
      await db.execute(sql`DROP FUNCTION reject_edit_item()`);
    }
  });
});
