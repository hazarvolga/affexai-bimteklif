import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import test from 'node:test';
import dotenv from 'dotenv';
import { skipIfDatabaseUnavailable } from './test-db-reachability';
import { useTestIsolation } from './test-isolation';

dotenv.config({ path: '.env.local' });
dotenv.config();
useTestIsolation();

test('invitations are private, hashed, single-use and preserve existing account credentials', { timeout: 30_000 }, async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.AUTH_EMAIL_WEBHOOK_URL, '', 'isolation must disable external email');
  const [{ createApiApp }, schema, { db }, { getControlDatabase }, { AuthService }, security] = await Promise.all([
    import('../app'), import('../../db/schema'), import('../../db'), import('../../db/control-plane'), import('../../services/auth/authService'), import('../auth/security'),
  ]);
  const { and, eq } = await import('drizzle-orm');
  const suffix = crypto.randomUUID();
  const [company] = await db.insert(schema.companies).values({ name: `Invite Co ${suffix}` }).returning();
  const [otherCompany] = await db.insert(schema.companies).values({ name: `Other Co ${suffix}` }).returning();
  const [inviter] = await db.insert(schema.users).values({ emailVerified: new Date(), email: `inviter-${suffix}@example.test`, fullName: 'Inviter' }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: inviter.id, role: 'owner' });
  const ownerToken = AuthService.generateToken({ userId: inviter.id, companyId: company.id, role: 'owner' });
  const existingPassword = await AuthService.hashPassword('Existing-password-42');
  const [existing] = await db.insert(schema.users).values({ emailVerified: new Date(), email: `existing-${suffix}@example.test`, fullName: 'Existing', passwordHash: existingPassword }).returning();
  await db.insert(schema.memberships).values({ companyId: otherCompany.id, userId: existing.id, role: 'viewer' });
  const existingToken = AuthService.generateToken({ userId: existing.id, companyId: otherCompany.id, role: 'viewer' });
  const server = http.createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const post = (path: string, body: unknown, token?: string) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const issue = async (email: string, role = 'manager') => {
    const response = await post('/api/invitations', { email, role }, ownerToken);
    assert.equal(response.status, 201);
    const body = await response.json() as any;
    assert.equal(body.delivery.status, 'development');
    assert.equal('token' in body.invitation, false);
    return { ...body.invitation, raw: new URL(body.delivery.devInvitationUrl).pathname.split('/').at(-1)! };
  };

  assert.equal((await fetch(`${base}/api/invitations`)).status, 401);
  assert.equal((await fetch(`${base}/api/invitations`, { headers: { Authorization: `Bearer ${existingToken}` } })).status, 403);
  assert.equal((await post('/api/invitations', { email: 'bad', role: 'viewer' }, ownerToken)).status, 400);
  assert.equal((await post('/api/invitations', { email: 'a@b.test', role: 'owner' }, ownerToken)).status, 400);
  const invite = await issue(`invitee-${suffix}@example.test`);
  const stored = await db.query.invitations.findFirst({ where: eq(schema.invitations.id, invite.id) });
  assert.equal(stored?.token, `sha256:${security.hashActionToken(invite.raw)}`);
  const preview = await fetch(`${base}/api/invitations/${invite.raw}`);
  assert.equal(preview.status, 200);
  assert.equal('token' in await preview.json(), false);
  assert.equal((await post(`/api/invitations/${invite.raw}/accept`, { fullName: 'Invitee' })).status, 400);
  const outcomes = await Promise.all([1, 2].map(() => post(`/api/invitations/${invite.raw}/accept`, { fullName: 'Invitee', password: 'New-password-42' })));
  assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]);
  const accepted = await outcomes.find(r => r.status === 200)!.json() as any;
  assert.equal('passwordHash' in accepted, false);
  const newUser = await db.query.users.findFirst({ where: eq(schema.users.id, accepted.id) });
  assert.equal(await AuthService.comparePassword('New-password-42', newUser!.passwordHash!), true);
  assert.ok(newUser?.emailVerified);
  const membership = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.userId, accepted.id), eq(schema.memberships.companyId, company.id)) });
  assert.equal(membership?.role, 'manager');

  await getControlDatabase().db.insert(schema.academyLearnerProfiles).values({ userId: existing.id, companyId: otherCompany.id, termsVersion: 'test', termsAcceptedAt: new Date(), privacyVersion: 'test', privacyAcceptedAt: new Date() });
  const existingInvite = await issue(existing.email);
  assert.equal((await post(`/api/invitations/${existingInvite.raw}/accept`, { password: 'replacement' })).status, 401);
  assert.equal((await post(`/api/invitations/${existingInvite.raw}/accept`, {}, ownerToken)).status, 403);
  const acceptedResponse = await post(`/api/invitations/${existingInvite.raw}/accept`, { password: 'replacement' }, existingToken);
  assert.equal(acceptedResponse.status, 200);
  const acceptedSession = await acceptedResponse.json() as any;
  assert.equal(acceptedSession.company.id, company.id);
  assert.equal(acceptedSession.role, 'manager');
  assert.equal(acceptedSession.accountType, 'workspace');
  assert.equal(acceptedSession.user.id, existing.id);
  assert.equal('passwordHash' in acceptedSession.user, false);
  assert.equal('verificationToken' in acceptedSession.user, false);
  assert.equal(AuthService.verifyToken(acceptedSession.token).companyId, company.id);
  assert.equal(AuthService.verifyToken(acceptedSession.token).role, 'manager');
  // Repeated /me requests model reloads; query hints must not override token scope.
  for (const path of ['/api/auth/me', `/api/auth/me?companyId=${otherCompany.id}`]) {
    const profileResponse = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${acceptedSession.token}` } });
    assert.equal(profileResponse.status, 200);
    const profile = await profileResponse.json() as any;
    assert.equal(profile.company.id, company.id);
    assert.equal(profile.role, 'manager');
    assert.equal(profile.accountType, 'workspace');
    assert.equal(profile.learnerProfile, null);
    assert.equal(profile.user.id, existing.id);
    assert.equal('passwordHash' in profile.user, false);
  }
  const originalProfile = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${existingToken}` } });
  const originalSession = await originalProfile.json() as any;
  assert.equal(originalSession.company.id, otherCompany.id);
  assert.equal(originalSession.role, 'viewer');
  assert.equal(originalSession.accountType, 'academy_learner');
  assert.ok(originalSession.learnerProfile);
  const foreignToken = AuthService.generateToken({ userId: inviter.id, companyId: otherCompany.id, role: 'owner' });
  const foreignProfile = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${foreignToken}` } });
  assert.equal(foreignProfile.status, 403);
  assert.equal('company' in await foreignProfile.json(), false);
  const unchanged = await db.query.users.findFirst({ where: eq(schema.users.id, existing.id) });
  assert.equal(unchanged?.passwordHash, existingPassword);
  assert.equal((await db.query.memberships.findFirst({ where: and(eq(schema.memberships.userId, existing.id), eq(schema.memberships.companyId, otherCompany.id)) }))?.role, 'viewer');
  const repeat = await issue(existing.email, 'admin');
  const repeatedResponse = await post(`/api/invitations/${repeat.raw}/accept`, {}, existingToken);
  assert.equal(repeatedResponse.status, 200);
  const repeatedSession = await repeatedResponse.json() as any;
  assert.equal(repeatedSession.role, 'manager');
  assert.equal(AuthService.verifyToken(repeatedSession.token).role, 'manager');
  assert.equal((await db.query.memberships.findFirst({ where: and(eq(schema.memberships.userId, existing.id), eq(schema.memberships.companyId, company.id)) }))?.role, 'manager');

  const legacyToken = crypto.randomBytes(32).toString('hex');
  await db.insert(schema.invitations).values({ companyId: company.id, email: `legacy-${suffix}@example.test`, role: 'viewer', token: legacyToken, invitedBy: inviter.id, expiresAt: new Date(Date.now() + 60000) });
  const legacy = await post(`/api/invitations/${legacyToken}/accept`, { fullName: 'Legacy', password: 'New-password-42' });
  assert.equal((await legacy.json() as any).code, 'INVITATION_REISSUE_REQUIRED');
  const old = await issue(`reissue-${suffix}@example.test`);
  const replacement = await issue(old.email);
  assert.notEqual(old.raw, replacement.raw);
  assert.equal((await post(`/api/invitations/${old.raw}/accept`, { fullName: 'Expired', password: 'New-password-42' })).status, 400);
  const list = await fetch(`${base}/api/invitations`, { headers: { Authorization: `Bearer ${ownerToken}` } });
  const listed = await list.json() as any[];
  assert.ok(listed.every(row => !('token' in row) && !('invitedBy' in row)));
  assert.ok(listed.some(row => row.status === 'reissue_required'));

  const tenantlessLearnerToken = AuthService.generateToken({ userId: existing.id, companyId: null, role: null });
  const tenantlessLearnerResponse = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${tenantlessLearnerToken}` } });
  assert.equal(tenantlessLearnerResponse.status, 200);
  const tenantlessLearner = await tenantlessLearnerResponse.json() as any;
  assert.equal(tenantlessLearner.company, null, 'tenantless session must not select an arbitrary membership');
  assert.equal(tenantlessLearner.role, null);
  assert.equal(tenantlessLearner.accountType, 'academy_learner');
  assert.ok(tenantlessLearner.learnerProfile);
  const [superAdmin] = await db.insert(schema.users).values({ emailVerified: new Date(), email: `super-${suffix}@example.test`, fullName: 'Super Admin', isSuperAdmin: true, emailVerified: new Date() }).returning();
  const tenantlessAdminToken = AuthService.generateToken({ userId: superAdmin.id, companyId: null, role: null });
  const tenantlessAdminResponse = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${tenantlessAdminToken}` } });
  assert.equal(tenantlessAdminResponse.status, 200);
  const tenantlessAdmin = await tenantlessAdminResponse.json() as any;
  assert.equal(tenantlessAdmin.company, null);
  assert.equal(tenantlessAdmin.role, null);
  assert.equal(tenantlessAdmin.user.isSuperAdmin, true);
});

test('failed invitation delivery expires the persisted row and invalidates its link', { timeout: 30_000 }, async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  assert.equal(process.env.NODE_ENV, 'test');
  const [{ db }, schema, invitationService, { eq }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../auth/invitations'), import('drizzle-orm'),
  ]);
  const originalWebhook = process.env.AUTH_EMAIL_WEBHOOK_URL;
  t.after(() => { if (originalWebhook === undefined) delete process.env.AUTH_EMAIL_WEBHOOK_URL; else process.env.AUTH_EMAIL_WEBHOOK_URL = originalWebhook; });
  process.env.AUTH_EMAIL_WEBHOOK_URL = 'https://invitation-transport.invalid/test';
  const suffix = crypto.randomUUID();
  const [company] = await db.insert(schema.companies).values({ name: `Delivery Co ${suffix}` }).returning();
  const [inviter] = await db.insert(schema.users).values({ emailVerified: new Date(), email: `delivery-owner-${suffix}@example.test`, fullName: 'Inviter' }).returning();
  const captured: string[] = [];
  let failure: 'http' | 'network' = 'http';
  const transport = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://invitation-transport.invalid/test');
    const message = JSON.parse(String(options?.body));
    assert.equal(message.template, 'invitation');
    const raw = new URL(message.url).pathname.split('/').at(-1)!;
    captured.push(raw);
    const row = await db.query.invitations.findFirst({ where: eq(schema.invitations.token, invitationService.invitationTokenHash(raw)) });
    assert.ok(row && row.expiresAt > new Date(), 'invitation must exist before transport is attempted');
    if (failure === 'network') throw new Error('mock network failure');
    return new Response('', { status: 503 });
  });
  for (const mode of ['http', 'network'] as const) {
    failure = mode;
    const result = await invitationService.issueInvitation(company.id, inviter.id, { email: `delivery-${mode}-${suffix}@example.test`, role: 'viewer' });
    assert.equal(result.delivery.status, 'failed');
    assert.equal('devInvitationUrl' in result.delivery, false);
    assert.equal(result.invitation.status, 'expired');
    const persisted = await db.query.invitations.findFirst({ where: eq(schema.invitations.id, result.invitation.id) });
    assert.ok(persisted && persisted.expiresAt <= new Date());
    assert.equal(persisted.acceptedAt, null);
    const raw = captured.at(-1)!;
    await assert.rejects(invitationService.previewInvitation(raw), { code: 'INVALID_INVITATION' });
    await assert.rejects(invitationService.acceptInvitation(raw, { fullName: 'Invitee', password: 'New-password-42' }), { code: 'INVALID_INVITATION' });
    assert.equal(await db.query.users.findFirst({ where: eq(schema.users.email, result.invitation.email) }), undefined);
  }
  assert.equal(transport.mock.callCount(), 2);
});

test('concurrent distinct invitations for one new email create only one account and require login for the other', { timeout: 30_000 }, async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  assert.equal(process.env.NODE_ENV, 'test');
  const [{ db }, schema, invitationService, { AuthService }, { eq }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../auth/invitations'), import('../../services/auth/authService'), import('drizzle-orm'),
  ]);
  const originalWebhook = process.env.AUTH_EMAIL_WEBHOOK_URL;
  t.after(() => { if (originalWebhook === undefined) delete process.env.AUTH_EMAIL_WEBHOOK_URL; else process.env.AUTH_EMAIL_WEBHOOK_URL = originalWebhook; });
  process.env.AUTH_EMAIL_WEBHOOK_URL = 'https://invitation-transport.invalid/test';
  const rawTokens: string[] = [];
  const transport = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://invitation-transport.invalid/test');
    const message = JSON.parse(String(options?.body));
    assert.equal(message.template, 'invitation');
    rawTokens.push(new URL(message.url).pathname.split('/').at(-1)!);
    return new Response('', { status: 202 });
  });
  const suffix = crypto.randomUUID();
  const email = `concurrent-${suffix}@example.test`;
  const [inviter] = await db.insert(schema.users).values({ emailVerified: new Date(), email: `concurrent-owner-${suffix}@example.test`, fullName: 'Inviter' }).returning();
  const companies = await db.insert(schema.companies).values([{ name: `Concurrent A ${suffix}` }, { name: `Concurrent B ${suffix}` }]).returning();
  const first = await invitationService.issueInvitation(companies[0].id, inviter.id, { email, role: 'viewer' });
  const second = await invitationService.issueInvitation(companies[1].id, inviter.id, { email, role: 'manager' });
  assert.equal(first.delivery.status, 'accepted');
  assert.equal(second.delivery.status, 'accepted');
  assert.equal(transport.mock.callCount(), 2);
  assert.notEqual(rawTokens[0], rawTokens[1]);
  const passwords = ['First-password-42', 'Second-password-42'];
  const outcomes = await Promise.allSettled(rawTokens.map((raw, index) => invitationService.acceptInvitation(raw, { fullName: 'Concurrent Invitee', password: passwords[index] })));
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  const winner = outcomes.findIndex(outcome => outcome.status === 'fulfilled');
  const loser = 1 - winner;
  const rejected = outcomes[loser];
  assert.ok(rejected.status === 'rejected');
  assert.equal(rejected.reason.code, 'INVITATION_SIGN_IN_REQUIRED');
  assert.equal(rejected.reason.status, 401);
  const accounts = await db.select().from(schema.users).where(eq(schema.users.email, email));
  assert.equal(accounts.length, 1);
  const account = accounts[0];
  assert.equal(await AuthService.comparePassword(passwords[winner], account.passwordHash!), true);
  assert.equal(await AuthService.comparePassword(passwords[loser], account.passwordHash!), false);
  const memberRows = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, account.id));
  assert.equal(memberRows.length, 1);
  assert.equal(memberRows[0].companyId, companies[winner].id);
  const invitationIds = [first.invitation.id, second.invitation.id];
  assert.ok((await db.query.invitations.findFirst({ where: eq(schema.invitations.id, invitationIds[winner]) }))?.acceptedAt);
  assert.equal((await db.query.invitations.findFirst({ where: eq(schema.invitations.id, invitationIds[loser]) }))?.acceptedAt, null);
  // The losing link remains usable after authentication, without changing credentials.
  await invitationService.acceptInvitation(rawTokens[loser], { password: passwords[loser] }, { userId: account.id });
  assert.equal((await db.select().from(schema.memberships).where(eq(schema.memberships.userId, account.id))).length, 2);
  assert.equal((await db.query.users.findFirst({ where: eq(schema.users.id, account.id) }))?.passwordHash, account.passwordHash);
});
