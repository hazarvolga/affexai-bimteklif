import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import crypto from 'node:crypto';
import { inspectWorkerHeartbeatRlsViolations } from '../../../scripts/database-roles/inspect';

const ownerUrl = process.env.HEARTBEAT_TEST_OWNER_URL;
const workerUrl = process.env.HEARTBEAT_TEST_WORKER_URL;
const controlUrl = process.env.HEARTBEAT_TEST_CONTROL_URL;
const appUrl = process.env.HEARTBEAT_TEST_APP_URL;

test('restricted worker heartbeat and control summary', { skip: !ownerUrl || !workerUrl || !controlUrl || !appUrl }, async () => {
  for (const raw of [ownerUrl!, workerUrl!, controlUrl!, appUrl!]) {
    const url = new URL(raw);
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.pathname, '/teklifpro_migration_restore_test');
  }
  const clients = [ownerUrl!, workerUrl!, controlUrl!, appUrl!].map(connectionString => new pg.Client({ connectionString }));
  await Promise.all(clients.map(c => c.connect()));
  const [owner, worker, control, app] = clients;
  const id = crypto.randomUUID();
  const secondId = crypto.randomUUID();
  const quotaIds = Array.from({ length: 33 }, () => crypto.randomUUID());
  try {
    const empty = await control.query('select * from public.bimmetraj_worker_heartbeat_summary()');
    assert.equal(empty.rows.length, 2);
    assert.deepEqual(await inspectWorkerHeartbeatRlsViolations(owner), []);
    assert.equal(empty.rows.find(r => r.kind === 'ifc-worker').last_seen, null);
    await worker.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [id, 'ifc-worker', 'abc1234', 'build']);
    const found = (await control.query('select * from public.bimmetraj_worker_heartbeat_summary()')).rows.find(r => r.kind === 'ifc-worker');
    assert.equal(found.revision, 'abc1234');
    assert.equal(Number(found.active_instances), 1);
    await worker.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [secondId, 'ifc-worker', null, null]);
    assert.equal(Number((await control.query('select * from public.bimmetraj_worker_heartbeat_summary()')).rows.find(r => r.kind === 'ifc-worker').active_instances), 2);
    await owner.query("update public.worker_process_heartbeats set seen_at = clock_timestamp() - interval '2 minutes' where instance_id = any($1::uuid[])", [[id, secondId]]);
    const stale = (await control.query('select * from public.bimmetraj_worker_heartbeat_summary()')).rows.find(r => r.kind === 'ifc-worker');
    assert.equal(Number(stale.active_instances), 0);
    assert.ok(stale.last_seen);
    await assert.rejects(worker.query('select * from public.worker_process_heartbeats'));
    await assert.rejects(app.query('select * from public.bimmetraj_worker_heartbeat_summary()'));
    await assert.rejects(control.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [crypto.randomUUID(), 'worker', null, null]));
    await assert.rejects(worker.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [crypto.randomUUID(), 'worker', 'secret / invalid', 'build']));
    const pool = new pg.Pool({ connectionString: workerUrl, max: 8 });
    try {
      const attempts = await Promise.allSettled(quotaIds.map(id => pool.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [id, 'worker', null, null])));
      assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 32);
      assert.equal(attempts.filter(item => item.status === 'rejected').length, 1);
      const count = await owner.query("select count(*)::int count from public.worker_process_heartbeats where kind='worker'");
      assert.equal(count.rows[0].count, 32);
      const retained = attempts.findIndex(item => item.status === 'fulfilled');
      const before = await owner.query('select seen_at from public.worker_process_heartbeats where instance_id=$1', [quotaIds[retained]]);
      await worker.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [quotaIds[retained], 'worker', null, null]);
      const after = await owner.query('select seen_at from public.worker_process_heartbeats where instance_id=$1', [quotaIds[retained]]);
      assert.equal(before.rows[0].seen_at.getTime(), after.rows[0].seen_at.getTime());
      await assert.rejects(worker.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [quotaIds[retained], 'ifc-worker', null, null]));
      // Restart after the old process heartbeat expires can replace the oldest stale slot.
      await owner.query("update public.worker_process_heartbeats set seen_at = clock_timestamp() - interval '91 seconds' where instance_id=$1", [quotaIds[retained]]);
      const rejected = attempts.findIndex(item => item.status === 'rejected');
      await worker.query('select public.bimmetraj_worker_heartbeat($1,$2,$3,$4)', [quotaIds[rejected], 'worker', null, null]);
      assert.equal((await owner.query('select 1 from public.worker_process_heartbeats where instance_id=$1', [quotaIds[retained]])).rowCount, 0);
      assert.equal(Number((await control.query('select * from public.bimmetraj_worker_heartbeat_summary()')).rows.find(r => r.kind === 'worker').active_instances), 32);

    } finally { await pool.end(); }

  } finally {
    // Only disposable database, and the known test UUID.
    await owner.query('delete from public.worker_process_heartbeats where instance_id = any($1::uuid[])', [[id, secondId, ...quotaIds]]);
    await Promise.all(clients.map(c => c.end()));
  }
});
