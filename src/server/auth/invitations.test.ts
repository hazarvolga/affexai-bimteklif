import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invitationInput, invitationTokenHash, publicInvitation, deliverInvitation, acceptInvitation, issueInvitation, previewInvitation, invitationRateLimit, invitationErrorResponse, InvitationError } from './invitations';
import { createActionToken } from './security';
import { academyLearnerProfiles, companies, invitations, memberships, users } from '../../db/schema';
import { AuthService } from '../../services/auth/authService';
import { db } from '../../db';
import { PgDialect } from 'drizzle-orm/pg-core';

function acceptanceStore(existing?: { id: string; email: string; passwordHash: string; fullName: string }, failure = false) {
  const writes: any[] = [];
  const invite = { id: 'invite', companyId: 'tenant', email: 'a@b.test', role: 'manager', acceptedAt: null, expiresAt: new Date(Date.now() + 60000) };
  const tx: any = {
    execute: async () => {},
    select: () => ({ from: (table: unknown) => ({ where: (condition: any) => {
      if (table === invitations) return { for: async () => [invite] };
      if (table === companies) return Promise.resolve([{ id: 'tenant', name: 'Invited company' }]);
      if (table === memberships) return Promise.resolve([{ role: existing ? 'viewer' : 'manager' }]);
      if (table === academyLearnerProfiles) {
        const query = new PgDialect().sqlToQuery(condition);
        assert.deepEqual(query.params, [existing?.id ?? 'new-user', 'tenant']);
        assert.match(query.sql, / and /);
        return Promise.resolve([]);
      }
      return Promise.resolve(existing ? [existing] : []);
    } }) }),
    insert: (table: unknown) => ({ values: (value: any) => ({ onConflictDoNothing: (options: any) => {
      if (table === memberships) { if (failure) throw new Error('membership failed'); writes.push({ table, value, options }); return Promise.resolve(); }
      assert.equal(table, users);
      writes.push({ table, value });
      return { returning: async () => [{ id: 'new-user', ...value }] };
    } }) }),
    update: (table: unknown) => ({ set: (value: any) => ({ where: async () => { assert.equal(table, invitations); writes.push({ table, value }); } }) }),
  };
  return { writes, database: { transaction: async (callback: any) => { try { return await callback(tx); } catch (error) { writes.length = 0; throw error; } } } as any };
}

test('new invitee requires password, persists a hash, verifies email and consumes invitation atomically', async () => {
  const { token } = createActionToken();
  const missing = acceptanceStore();
  await assert.rejects(acceptInvitation(token, { fullName: 'Invitee' }, undefined, missing.database), /INVITATION_PASSWORD_REQUIRED/);
  assert.equal(missing.writes.length, 0);
  const store = acceptanceStore();
  const result = await acceptInvitation(token, { fullName: 'Invitee', password: 'Test-password-42' }, undefined, store.database);
  assert.equal(result.accepted, true);
  assert.equal(result.company.id, 'tenant');
  assert.equal(result.role, 'manager');
  assert.equal(AuthService.verifyToken(result.token).companyId, 'tenant');
  assert.equal('passwordHash' in result.user, false);
  assert.equal('passwordHash' in result, false);
  assert.equal(await AuthService.comparePassword('Test-password-42', store.writes[0].value.passwordHash), true);
  assert.ok(store.writes[0].value.emailVerified instanceof Date);
  assert.deepEqual(store.writes[1].value, { userId: 'new-user', companyId: 'tenant', role: 'manager' });
  assert.ok(store.writes[2].value.acceptedAt instanceof Date);
});

test('existing identity must authenticate; acceptance never updates password or existing membership role', async () => {
  const { token } = createActionToken();
  const existing = { id: 'existing', email: 'a@b.test', fullName: 'Existing', passwordHash: 'unchanged' };
  for (const actor of [undefined, { userId: 'attacker' }]) {
    const store = acceptanceStore(existing);
    await assert.rejects(acceptInvitation(token, { password: 'replacement' }, actor, store.database), /INVITATION_SIGN_IN_REQUIRED|INVITATION_IDENTITY_MISMATCH/);
    assert.equal(store.writes.length, 0);
  }
  const store = acceptanceStore(existing);
  const result = await acceptInvitation(token, { password: 'replacement' }, { userId: existing.id }, store.database);
  assert.equal(result.role, 'viewer');
  assert.equal(AuthService.verifyToken(result.token).role, 'viewer');
  assert.equal(result.user.id, existing.id);
  assert.equal(result.accountType, 'workspace');
  assert.equal(store.writes.some(write => write.table === users), false);
  assert.deepEqual(store.writes[0].options.target, [memberships.userId, memberships.companyId]);
  assert.equal(existing.passwordHash, 'unchanged');
});

test('membership failure rolls back user creation and token consumption', async () => {
  const store = acceptanceStore(undefined, true);
  await assert.rejects(acceptInvitation(createActionToken().token, { fullName: 'Invitee', password: 'Test-password-42' }, undefined, store.database), /membership failed/);
  assert.deepEqual(store.writes, []);
});

test('invitation validates normalized email and disallows owner or unknown roles', () => {
  assert.deepEqual(invitationInput.parse({ email: ' Person@Example.test ', role: 'manager' }), { email: 'person@example.test', role: 'manager' });
  for (const role of ['owner', 'member', 'super_admin']) assert.equal(invitationInput.safeParse({ email: 'a@b.test', role }).success, false);
  assert.equal(invitationInput.safeParse({ email: 'bad' }).success, false);
});

test('new tokens use a versioned hash and reject legacy plaintext token format', () => {
  const { token, tokenHash } = createActionToken();
  assert.equal(invitationTokenHash(token), `sha256:${tokenHash}`);
  assert.throws(() => invitationTokenHash('a'.repeat(64)), /INVITATION_REISSUE_REQUIRED/);
});

test('list DTO redacts secrets and marks legacy invitations for reissue', () => {
  const value: any = { id: 'id', email: 'a@b.test', role: 'viewer', token: 'plaintext', companyId: 'tenant', invitedBy: 'user', expiresAt: new Date(Date.now() + 10000), acceptedAt: null, createdAt: new Date() };
  const dto = publicInvitation(value);
  assert.equal(dto.status, 'reissue_required');
  assert.equal('token' in dto, false);
  assert.equal('invitedBy' in dto, false);
});

test('delivery uses invitation template and reports webhook acceptance, not inbox delivery', async () => {
  const env = { NODE_ENV: 'production', AUTH_EMAIL_WEBHOOK_URL: 'https://mail.example.test/hook', AUTH_EMAIL_WEBHOOK_SECRET: 'w'.repeat(48) };
  const calls: any[] = [];
  const transport = async (...args: any[]) => { calls.push(args); return new Response('', { status: 202 }); };
  assert.deepEqual(await deliverInvitation('a@b.test', 'https://app.example.test/invite/token', env, transport as typeof fetch), { status: 'accepted' });
  assert.equal(JSON.parse(calls[0][1].body).template, 'invitation');
  assert.equal(calls[0][1].headers.Authorization, `Bearer ${'w'.repeat(48)}`);
  await assert.rejects(deliverInvitation('a@b.test', 'url', { NODE_ENV: 'production' }, transport as typeof fetch), { code: 'EMAIL_DELIVERY_UNAVAILABLE' });
  assert.deepEqual(await deliverInvitation('a@b.test', 'url', { NODE_ENV: 'test' }, transport as typeof fetch), { status: 'development', devInvitationUrl: 'url' });
  assert.deepEqual(await deliverInvitation('a@b.test', 'url', env, (async () => { throw new Error('private'); }) as typeof fetch), { status: 'failed' });
});

test('accept checks expiry and consumed state after row locking inside transaction', async () => {
  const { token } = createActionToken();
  for (const invite of [undefined, { acceptedAt: new Date(), expiresAt: new Date(Date.now() + 10000) }, { acceptedAt: null, expiresAt: new Date(0) }]) {
    let locked = false;
    const tx: any = { select: () => ({ from: () => ({ where: () => ({ for: async (mode: string) => { assert.equal(mode, 'update'); locked = true; return invite ? [invite] : []; } }) }) }) };
    await assert.rejects(acceptInvitation(token, {}, undefined, { transaction: async (fn: any) => fn(tx) } as any), /INVALID_INVITATION/);
    assert.equal(locked, true);
  }
});

test('issue stores only hash, expires prior tenant/email invitations and reports development link honestly', async (t) => {
  const original = { NODE_ENV: process.env.NODE_ENV, AUTH_EMAIL_WEBHOOK_URL: process.env.AUTH_EMAIL_WEBHOOK_URL };
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.NODE_ENV = 'test';
  delete process.env.AUTH_EMAIL_WEBHOOK_URL;
  let stored: any;
  let expired = false;
  const tx: any = {
    execute: async () => {},
    update: () => ({ set: () => ({ where: async (condition: any) => {
      const query = new PgDialect().sqlToQuery(condition);
      assert.deepEqual(query.params, ['tenant', 'a@b.test']);
      assert.match(query.sql, / and /);
      expired = true;
    } }) }),
    insert: () => ({ values: (value: any) => ({ returning: async () => { assert.equal(expired, true); stored = { id: 'id', createdAt: new Date(), acceptedAt: null, ...value }; return [stored]; } }) }),
  };
  t.mock.method(db, 'transaction', (async (fn: any) => fn(tx)) as any);
  const result = await issueInvitation('tenant', 'inviter', { email: 'A@b.test', role: 'viewer' });
  assert.equal(result.delivery.status, 'development');
  const raw = result.delivery.devInvitationUrl!.split('/').at(-1)!;
  assert.equal(stored.token, invitationTokenHash(raw));
  assert.equal('token' in result.invitation, false);
  await assert.rejects(issueInvitation('tenant', 'inviter', { email: 'bad' }), /INVALID_INVITATION_INPUT/);
});

test('preview accepts only hashed lookup, redacts secrets and announces existing-account sign-in', async (t) => {
  const { token } = createActionToken();
  t.mock.method(db.query.invitations, 'findFirst', (async (query: any) => {
    assert.deepEqual(new PgDialect().sqlToQuery(query.where).params, [invitationTokenHash(token)]);
    return { id: 'id', email: 'a@b.test', role: 'viewer', token: 'private', expiresAt: new Date(Date.now() + 60000), acceptedAt: null };
  }) as any);
  t.mock.method(db.query.users, 'findFirst', (async () => ({ id: 'existing' })) as any);
  const result = await previewInvitation(token);
  assert.equal(result.requiresSignIn, true);
  assert.equal('token' in result, false);
});

test('rate limiting denies exhausted and unavailable stores without authorizing requests', async () => {
  for (const mode of ['allowed', 'denied', 'failure']) {
    let status = 200;
    let passed = false;
    const res: any = { set() { return this; }, status(value: number) { status = value; return this; }, json() {} };
    await invitationRateLimit('accept', async () => {
      if (mode === 'failure') throw new Error('private database details');
      return { allowed: mode === 'allowed', retryAfterSeconds: 60 };
    })({ ip: '127.0.0.1' } as any, res, () => { passed = true; });
    assert.equal(passed, mode === 'allowed');
    assert.equal(status, mode === 'allowed' ? 200 : mode === 'denied' ? 429 : 503);
  }
});

test('invitation errors redact unexpected failure details', () => {
  let status = 200;
  let body: any;
  const res: any = { status(value: number) { status = value; return this; }, json(value: unknown) { body = value; } };
  invitationErrorResponse(new Error('private token and database detail'), res);
  assert.equal(status, 500);
  assert.equal(JSON.stringify(body).includes('private'), false);
  invitationErrorResponse(new InvitationError('INVITATION_IDENTITY_MISMATCH', 403), res);
  assert.equal(status, 403);
  assert.equal(body.code, 'INVITATION_IDENTITY_MISMATCH');
});

test('disabled email never dispatches invitations or supplies development links', async () => {
  let sent = false;
  await assert.rejects(deliverInvitation('a@b.test', 'url', { NODE_ENV: 'test', AUTH_EMAIL_DELIVERY_MODE: 'disabled' }, (async () => { sent = true; return new Response(); }) as typeof fetch), { code: 'EMAIL_DELIVERY_DISABLED', status: 503 });
  assert.equal(sent, false);
});
