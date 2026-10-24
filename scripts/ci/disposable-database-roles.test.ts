import assert from 'node:assert/strict';
import test from 'node:test';
import { DATABASE_ROLE_MEMBERSHIPS, DATABASE_ROLE_SPECS } from '../database-roles/contract';
import { assertDisposableRoleContract, bootstrapDisposableRoles, validateDisposableRoleTarget } from './disposable-database-roles';

const roleRows = () => DATABASE_ROLE_SPECS.map((spec) => ({
  name: spec.name, can_login: spec.canLogin, ...spec.attributes,
}));
const memberships = () => DATABASE_ROLE_MEMBERSHIPS.map((edge) => ({
  role: edge.role, member: edge.member, admin: edge.adminOption,
  inherit: edge.inheritOption, set: edge.setOption,
}));
const client = (roles: object[] = roleRows(), edges: object[] = memberships()) => ({
  query: async (sql: string) => ({ rows: sql.includes('pg_auth_members') ? edges : roles }),
});

test('disposable bootstrap refuses unacknowledged, remote, shared and overriding targets', () => {
  const url = 'postgresql://postgres@127.0.0.1:5432/teklifpro_bootstrap_test';
  assert.equal(validateDisposableRoleTarget(url, 'test', 'true'), url);
  for (const unsafe of [url.replace('127.0.0.1', 'remote.example'), url.replace('teklifpro_bootstrap_test', 'teklifpro_local'), `${url}?host=remote.example`, `${url}?options=-crole=postgres`]) {
    assert.throws(() => validateDisposableRoleTarget(unsafe, 'test', 'true'));
  }
  assert.throws(() => validateDisposableRoleTarget(url, 'production', 'true'));
  assert.throws(() => validateDisposableRoleTarget(url, 'test', undefined));
});

test('role preflight accepts exactly the canonical role attributes and membership', async () => {
  await assertDisposableRoleContract(client());
});

test('role preflight catches the default INHERIT regression and missing roles', async () => {
  await assert.rejects(assertDisposableRoleContract(client(roleRows().map((role) => role.name === 'bimmetraj_app' ? { ...role, inherit: true } : role))), /bimmetraj_app.*inherit/i);
  await assert.rejects(assertDisposableRoleContract(client(roleRows().filter((role) => role.name !== 'bimmetraj_control'))), /bimmetraj_control.*missing/i);
});

test('role preflight rejects runtime membership and inherited migrator owner access', async () => {
  await assert.rejects(assertDisposableRoleContract(client(roleRows(), [...memberships(), { role: 'bimmetraj_owner', member: 'bimmetraj_app', admin: false, inherit: false, set: true }])), /membership/i);
  await assert.rejects(assertDisposableRoleContract(client(roleRows(), memberships().map((edge) => ({ ...edge, inherit: true })))), /membership/i);
});


test('cluster-wide bootstrap refuses unknown role provenance before mutation', async () => {
  const old = { node: process.env.NODE_ENV, ack: process.env.CI_DISPOSABLE_DATABASE };
  process.env.NODE_ENV = 'test';
  process.env.CI_DISPOSABLE_DATABASE = 'true';
  const statements: string[] = [];
  const fake = { query: async (sql: string) => {
    statements.push(sql);
    if (sql.includes('pg_control_system')) return { rows: [{ database: 'teklifpro_bootstrap_test', version: 16, administrator: true, system_identifier: '12345678901234567890' }] };
    return { rows: [{ name: 'bimmetraj_app', provenance: 'unrelated cluster' }] };
  } };
  try {
    await assert.rejects(bootstrapDisposableRoles(fake), /mismatched canonical provenance/);
    assert.equal(statements.length, 2);
    assert.ok(statements.every((sql) => /^select/i.test(sql.trim())));
  } finally {
    for (const [key, value] of [['NODE_ENV', old.node], ['CI_DISPOSABLE_DATABASE', old.ack]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
