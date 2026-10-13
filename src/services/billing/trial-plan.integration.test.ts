import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('registration trial is the flagged plan, not whichever free plan comes first', async () => {
  const [{ db }, { plans }, { selectTrialPlan }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./trial-plan')]);
  const [legacyFree] = await db.insert(plans).values({ name: 'Free academy', monthlyQuoteLimit: 0, monthlyPrice: 0 }).returning();
  assert.equal((await db.transaction(tx => selectTrialPlan(tx)))?.id, legacyFree.id, 'before bootstrap the free plan remains the fallback');
  const [trial] = await db.insert(plans).values({ name: '14 Günlük Ücretsiz Deneme', monthlyQuoteLimit: 5, monthlyPrice: 0, isTrial: true }).returning();
  await db.insert(plans).values({ name: 'Another free', monthlyQuoteLimit: 1, monthlyPrice: 0 });
  assert.equal((await db.transaction(tx => selectTrialPlan(tx)))?.id, trial.id);
  await assert.rejects(db.insert(plans).values({ name: 'Second trial', monthlyQuoteLimit: 1, monthlyPrice: 0, isTrial: true }), 'only one trial plan may exist');
});
