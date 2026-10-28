import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('registration trial is the flagged plan, not whichever free plan comes first', async () => {
  const [{ db }, { plans }, { selectTrialPlan }, { getControlDatabase }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./trial-plan'), import('../../db/control-plane')]);
  const control = getControlDatabase().db;
  const [legacyFree] = await db.insert(plans).values({ name: 'Free academy', monthlyQuoteLimit: 0, monthlyPrice: 0 }).returning();
  assert.equal((await control.transaction(tx => selectTrialPlan(tx)))?.id, legacyFree.id, 'before bootstrap the free plan remains the fallback');
  const [trial] = await db.insert(plans).values({ name: '14 Günlük Ücretsiz Deneme', monthlyQuoteLimit: 5, monthlyPrice: 0, isTrial: true }).returning();
  await db.insert(plans).values({ name: 'Another free', monthlyQuoteLimit: 1, monthlyPrice: 0 });
  assert.equal((await control.transaction(tx => selectTrialPlan(tx)))?.id, trial.id);
  await assert.rejects(db.insert(plans).values({ name: 'Second trial', monthlyQuoteLimit: 1, monthlyPrice: 0, isTrial: true }), 'only one trial plan may exist');
});

test('control role holds selected plan against concurrent deactivation until transaction completes', async () => {
  const [{ db }, { plans }, { selectTrialPlan }, { getControlDatabase }, { eq, sql }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./trial-plan'), import('../../db/control-plane'), import('drizzle-orm')]);
  const control = getControlDatabase().db;
  const [trial] = await db.select().from(plans).where(eq(plans.isTrial, true));
  assert.ok(trial);
  await control.transaction(async tx => {
    assert.equal((await selectTrialPlan(tx))?.id, trial.id);
    await assert.rejects(control.transaction(async contender => {
      await contender.execute(sql`SET LOCAL lock_timeout = '150ms'`);
      await contender.update(plans).set({ isActive: false }).where(eq(plans.id, trial.id));
    }), (error: any) => error?.cause?.code === '55P03');
  });
  await control.update(plans).set({ isActive: false }).where(eq(plans.id, trial.id));
});
