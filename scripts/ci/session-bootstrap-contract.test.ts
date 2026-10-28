import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

test('CI bootstrap grants only control read access to revocations before role provision', async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.CI_DISPOSABLE_DATABASE, 'true');
  const raw = process.env.RELEASE_DATABASE_URL;
  assert.ok(raw);
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.pathname, '/teklifpro_bootstrap_test');
  const admin = new pg.Client({ connectionString: raw });
  const controlUrl = new URL(url); controlUrl.username = 'bimmetraj_control';
  const control = new pg.Client({ connectionString: controlUrl.toString() });
  await admin.connect(); await control.connect();
  try {
    const roles = await admin.query<{ role_name: string; can_select: boolean; can_insert: boolean; can_update: boolean; can_delete: boolean }>(`
      SELECT role_name,
        has_table_privilege(role_name, 'public.revoked_sessions', 'SELECT') can_select,
        has_table_privilege(role_name, 'public.revoked_sessions', 'INSERT') can_insert,
        has_table_privilege(role_name, 'public.revoked_sessions', 'UPDATE') can_update,
        has_table_privilege(role_name, 'public.revoked_sessions', 'DELETE') can_delete
      FROM unnest(ARRAY['bimmetraj_app','bimmetraj_control','bimmetraj_worker']) role_name ORDER BY role_name`);
    assert.deepEqual(roles.rows, [
      { role_name: 'bimmetraj_app', can_select: false, can_insert: false, can_update: false, can_delete: false },
      { role_name: 'bimmetraj_control', can_select: true, can_insert: false, can_update: false, can_delete: false },
      { role_name: 'bimmetraj_worker', can_select: false, can_insert: false, can_update: false, can_delete: false },
    ]);
    assert.equal((await control.query('SELECT token_hash FROM public.revoked_sessions WHERE token_hash=$1', ['a'.repeat(64)])).rowCount, 0);
    const { isSessionRevoked } = await import('../../src/server/auth/session-revocation');
    const { closeControlDatabase } = await import('../../src/db/control-plane');
    try { assert.equal(await isSessionRevoked('a'.repeat(64)), false); }
    finally { await closeControlDatabase(); }
  } finally { await control.end(); await admin.end(); }
});
