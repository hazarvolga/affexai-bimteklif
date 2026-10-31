import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('worker quota period follows the trial window and paid plans stay monthly', { timeout: 120_000 }, async () => {
  const raw = process.env.TRIAL_QUOTA_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && url.password && !url.search && !url.hash);
  const db = new pg.Client({ connectionString: raw }); await db.connect();
  const identity = await db.query<{ system_identifier: string }>('SELECT system_identifier::text FROM pg_control_system()');
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const queue = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) }); await queue.release();
  const roles = ['bimmetraj_migrator', 'bimmetraj_app', 'bimmetraj_control', 'bimmetraj_worker', 'bimmetraj_backup'] as const;
  const creds = Object.fromEntries(roles.map(role => [role, randomBytes(32).toString('hex')])) as Record<(typeof roles)[number], string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  await provisionDatabaseRoles(db, creds, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: identity.rows[0].system_identifier, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  const asRole = async (role: 'bimmetraj_app' | 'bimmetraj_worker') => {
    const roleUrl = new URL(url); roleUrl.username = role; roleUrl.password = creds[role];
    const client = new pg.Client({ connectionString: roleUrl.toString() }); await client.connect();
    return client;
  };
  const [trialCompany, paidCompany, trialPlan, paidPlan] = Array.from({ length: 4 }, () => randomUUID());
  await db.query("INSERT INTO companies(id,name) VALUES ($1,'Deneme'),($2,'Ucretli')", [trialCompany, paidCompany]);
  await db.query("UPDATE plans SET is_trial=false WHERE is_trial");
  await db.query("INSERT INTO plans(id,name,monthly_price,monthly_quote_limit,is_active,is_trial) VALUES ($1,$3,0,3,true,true),($2,$4,100,5,true,false)", [trialPlan, paidPlan, `trial-${trialPlan}`, `paid-${paidPlan}`]);
  await db.query("INSERT INTO subscriptions(company_id,plan,plan_id,status,current_period_start,current_period_end) VALUES ($1,'starter',$3,'active','2026-10-25 10:00','2026-11-08 10:00'),($2,'starter',$4,'active','2026-10-25 10:00','2027-10-25 10:00')", [trialCompany, paidCompany, trialPlan, paidPlan]);
  const worker = await asRole('bimmetraj_worker');
  const app = await asRole('bimmetraj_app');
  const period = async (company: string, at: string) => (await worker.query<{ p: string }>('SELECT public.bimmetraj_worker_get_quota_period($1,$2) AS p', [company, at])).rows[0].p;
  try {
    assert.equal(await period(trialCompany, '2026-10-30T00:00:00Z'), '2026-10-25');
    assert.equal(await period(trialCompany, '2026-11-02T00:00:00Z'), '2026-10-25');
    assert.equal(await period(paidCompany, '2026-11-02T00:00:00Z'), '2026-11');
    assert.equal(await period(randomUUID(), '2026-11-02T00:00:00Z'), '2026-11');
    await assert.rejects(app.query('SELECT public.bimmetraj_worker_get_quota_period($1,now())', [trialCompany]), /permission denied/);
  } finally { await worker.end(); await app.end(); await db.end(); }
});
