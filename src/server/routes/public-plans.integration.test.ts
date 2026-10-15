import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from './test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
useTestIsolation();

test('public plan catalog exposes only active published plans in the configured order', async (t) => {
  const [{ db }, schema, { createApiApp }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../app'),
  ]);
  await db.insert(schema.plans).values([
    { name: 'Draft', monthlyQuoteLimit: 1, monthlyPrice: 100, isPublished: false, displayOrder: 1 },
    { name: 'Inactive', monthlyQuoteLimit: 1, monthlyPrice: 100, isActive: false, isPublished: true, displayOrder: 2 },
    { name: 'Later', monthlyQuoteLimit: 20, monthlyPrice: 2000, isPublished: true, displayOrder: 20, marketingBadge: 'Pro' },
    { name: 'First', monthlyQuoteLimit: 5, monthlyPrice: 0, isPublished: true, displayOrder: 10, isFeatured: true },
  ]);
  const server = createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/public/plans`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  const plans = await response.json() as Array<{ name: string; isPublished: boolean; isFeatured: boolean; marketingBadge: string | null }>;
  assert.deepEqual(plans.map((plan) => plan.name), ['First', 'Later']);
  assert.equal(plans[0].isFeatured, true);
  assert.equal(plans[1].marketingBadge, 'Pro');
});
