import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { globalPriceSourceReviewEvents, priceSnapshots, priceSources, quotationItemEvidence } from './schema';

test('price permission and evidence references preserve company isolation and review history', () => {
  const refs = (table: Parameters<typeof getTableConfig>[0]) => getTableConfig(table).foreignKeys.map(key => ({ name: key.getName(), onDelete: key.onDelete }));
  const source = refs(priceSources);
  assert.ok(source.some(key => key.name.includes('created_by_user_id_company_id_memberships') && key.onDelete === 'restrict'));
  const snapshot = refs(priceSnapshots);
  assert.ok(snapshot.some(key => key.name.includes('price_source_id_company_id_price_sources') && key.onDelete === 'restrict'));
  const evidence = refs(quotationItemEvidence);
  assert.ok(evidence.some(key => key.name.includes('price_snapshot_id_company_id_price_snapshots') && key.onDelete === 'restrict'));
  const events = refs(globalPriceSourceReviewEvents);
  assert.ok(events.some(key => key.name.includes('source_id_pricing_data_sources') && key.onDelete === 'restrict'));
  assert.ok(events.some(key => key.name.includes('actor_user_id_users') && key.onDelete === 'restrict'));
});
