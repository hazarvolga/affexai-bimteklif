import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { totpForCounter } from './mfa-crypto';

test('MFA enrollment, epoch enforcement, single-use challenge and recovery', { timeout: 60000 }, async () => {
  const raw = process.env.MFA_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test');
  process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
  const client = new pg.Client({ connectionString: raw }); await client.connect();
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) }); await worker.release();
  const systemId = (await client.query<{system_identifier:string}>('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier;
  const credentials = Object.fromEntries(['bimmetraj_migrator','bimmetraj_app','bimmetraj_control','bimmetraj_worker','bimmetraj_backup'].map(role=>[role,randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator'|'bimmetraj_app'|'bimmetraj_control'|'bimmetraj_worker'|'bimmetraj_backup',string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  try {
    await provisionDatabaseRoles(client, credentials, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: systemId, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  } catch (error) { await client.end(); throw error; }
  const appUrl = new URL(url); appUrl.username='bimmetraj_app'; appUrl.password=credentials.bimmetraj_app;
  const controlUrl = new URL(url); controlUrl.username='bimmetraj_control'; controlUrl.password=credentials.bimmetraj_control;
  process.env.DATABASE_URL = appUrl.toString(); process.env.CONTROL_DATABASE_URL = controlUrl.toString();
  const restricted = new pg.Client({connectionString:appUrl.toString()}); await restricted.connect();
  await assert.rejects(restricted.query('SELECT * FROM admin_mfa_accounts'), /permission denied/);
  await assert.rejects(restricted.query('SELECT * FROM admin_mfa_challenges'), /permission denied/);
  await restricted.end();
  const id = randomUUID(), email = `${id}@example.test`, password = 'correct-horse-battery-staple';
  const { AuthService } = await import('../../services/auth/authService');
  await client.query('INSERT INTO users(id,email,full_name,email_verified,is_super_admin,password_hash) VALUES ($1,$2,$3,now(),true,$4)', [id,email,'MFA admin',await AuthService.hashPassword(password)]);
  const express = (await import('express')).default;
  const { registerAuthRoutes } = await import('../routes/auth');
  const { authenticate } = await import('../middleware/auth');
  const { registerCompanyRoutes } = await import('../routes/company');
  const { createActionToken, rateLimitStorageKey } = await import('./security');
  const ipBucket = rateLimitStorageKey('mfa-verify-ip:127.0.0.1');
  await client.query('DELETE FROM rate_limit_buckets WHERE bucket_key=$1',[ipBucket]);
  const { pool } = await import('../../db');
  const { closeControlDatabase } = await import('../../db/control-plane');
  const app = express(); app.use(express.json()); registerAuthRoutes(app); registerCompanyRoutes(app); app.get('/probe', authenticate, (req,res) => res.json({ admin: req.user.isSuperAdmin }));
  const server = app.listen(0,'127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const old = AuthService.generateToken({ userId: id, companyId: null, role: null });
  const post = (path: string, body: unknown, bearer?: string) => fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(bearer ? {authorization:`Bearer ${bearer}`} : {})},body:JSON.stringify(body)});
  const probe = (token: string) => fetch(base+'/probe',{headers:{authorization:`Bearer ${token}`}});
  function decode(value: string): Buffer {
    let buffer = 0, bits = 0; const bytes: number[] = [];
    for (const c of value) { buffer = (buffer << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((buffer >>> bits) & 255); } }
    return Buffer.from(bytes);
  }
  const companyId = randomUUID(), otherId = randomUUID();
  try {
    const initialProbe = await probe(old); assert.equal(initialProbe.status,200,await initialProbe.text());
    assert.equal((await post('/api/auth/mfa/verify',{challenge:'bad',code:'123456'})).status,400);
    assert.equal((await post('/api/auth/mfa/verify',{challenge:'a'.repeat(43),code:'x'.repeat(41)})).status,400);
    assert.equal((await post('/api/auth/mfa/verify',{challenge:'a'.repeat(43),code:'123456'})).status,401);
    assert.equal((await post('/api/auth/mfa/enroll/confirm',{code:'123456',recoverySaved:true},old)).status,400,'no pending enrollment');

    assert.equal((await post('/api/auth/mfa/enroll/start',{password:'wrong'},old)).status,401);
    const staleStart = await post('/api/auth/mfa/enroll/start',{password},old); assert.equal(staleStart.status,200);
    const staleBody = await staleStart.json() as {secret:string};
    const staleCode = totpForCounter(decode(staleBody.secret), Math.floor(Date.now()/30000));
    await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[id,await AuthService.hashPassword('replacement-password')]);
    assert.notEqual((await post('/api/auth/mfa/enroll/confirm',{code:staleCode,recoverySaved:true},old)).status,200, 'password change invalidates pending enrollment');
    assert.equal((await client.query('SELECT mfa_epoch FROM users WHERE id=$1',[id])).rows[0].mfa_epoch,null);
    await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[id,await AuthService.hashPassword(password)]);
    const start = await post('/api/auth/mfa/enroll/start',{password},old); assert.equal(start.status,200);
    const {secret,recoveryCodes} = await start.json() as {secret:string;recoveryCodes:string[]}; assert.equal(recoveryCodes.length,10);
    const pending = (await client.query('SELECT pending_ciphertext, pending_recovery_hashes FROM admin_mfa_accounts WHERE user_id=$1',[id])).rows[0];
    assert.notEqual(pending.pending_ciphertext,secret); assert.ok(!JSON.stringify(pending).includes(recoveryCodes[0]));
    const code = totpForCounter(decode(secret), Math.floor(Date.now()/30000));
    assert.equal((await post('/api/auth/mfa/enroll/confirm',{code},old)).status,400, 'recovery acknowledgement required');
    const confirmation = await post('/api/auth/mfa/enroll/confirm',{code,recoverySaved:true},old); assert.equal(confirmation.status,200);
    const body = await confirmation.json() as {token:string};
    const { isMfaReady } = await import('./mfa-readiness');
    assert.equal(await isMfaReady(),true);
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64'); assert.equal(await isMfaReady(),false);
    delete process.env.MFA_ENCRYPTION_KEY; assert.equal(await isMfaReady(),false);
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
    assert.equal((await probe(old)).status,401);
    assert.equal((await probe(body.token)).status,200);
    const status = await fetch(base+'/api/auth/mfa/status',{headers:{authorization:`Bearer ${body.token}`}});
    assert.deepEqual(await status.json(),{enabled:true});
    assert.equal((await post('/api/auth/mfa/enroll/start',{password},body.token)).status,409,'enrolled account cannot enroll twice');

    // Real HTTP requests use the provisioned app/control roles and persisted invitations.
    await client.query('INSERT INTO companies(id,name) VALUES ($1,$2)', [companyId,'MFA invitation fixture']);
    await client.query('INSERT INTO users(id,email,full_name,email_verified,password_hash) VALUES ($1,$2,$3,now(),$4)', [otherId,`${otherId}@example.test`,'Other',await AuthService.hashPassword(password)]);
    await client.query('INSERT INTO memberships(user_id,company_id,role) VALUES ($1,$2,$3)', [otherId,companyId,'viewer']);
    const inviteAdmin = createActionToken(), inviteOther = createActionToken();
    for (const [invitation, invitedEmail] of [[inviteAdmin,email],[inviteOther,`${otherId}@example.test`]] as const) {
      await client.query("INSERT INTO invitations(company_id,email,role,token,invited_by,expires_at) VALUES ($1,$2,'viewer',$3,$4,now()+interval '1 hour')",[companyId,invitedEmail,`sha256:${invitation.tokenHash}`,id]);
    }
    const otherToken = AuthService.generateToken({userId:otherId,companyId,role:'viewer'});
    const otherStatus = await fetch(base+'/api/auth/mfa/status',{headers:{authorization:`Bearer ${otherToken}`}});
    assert.equal(otherStatus.status,403);
    assert.equal((await post('/api/auth/mfa/enroll/start',{password},otherToken)).status,403);
    assert.equal((await post('/api/auth/mfa/enroll/confirm',{code:'123456',recoverySaved:true},otherToken)).status,403);

    const wrongIdentity = await post(`/api/invitations/${inviteAdmin.token}/accept`,{},otherToken);
    assert.equal(wrongIdentity.status,403,await wrongIdentity.text());
    const adminClaims = AuthService.verifyToken(body.token);
    const impersonated = AuthService.generateImpersonationToken({userId:otherId,companyId,impersonatedBy:id,readOnly:false,mfaEpoch:adminClaims.mfaEpoch,mfaCredentialVersion:adminClaims.mfaCredentialVersion});
    const impersonationAccept = await post(`/api/invitations/${inviteOther.token}/accept`,{},impersonated);
    assert.equal(impersonationAccept.status,403,await impersonationAccept.text());
    const accepted = await post(`/api/invitations/${inviteAdmin.token}/accept`,{},body.token);
    assert.equal(accepted.status,200,await accepted.clone().text());
    const acceptedBody = await accepted.json() as {token:string};
    assert.equal(AuthService.verifyToken(acceptedBody.token).mfaEpoch,adminClaims.mfaEpoch);
    assert.equal(AuthService.verifyToken(acceptedBody.token).mfaCredentialVersion,adminClaims.mfaCredentialVersion);
    assert.equal((await probe(acceptedBody.token)).status,200,'new firm session retains verified MFA');
    const cookie = accepted.headers.get('set-cookie'); assert.ok(cookie?.includes('bm_session='));
    const cookieToken = decodeURIComponent(cookie!.match(/bm_session=([^;]+)/)![1]);
    assert.equal((await probe(cookieToken)).status,200,'browser cookie receives the valid MFA session');
    assert.equal((await client.query('SELECT accepted_at FROM invitations WHERE token=$1',[`sha256:${inviteOther.tokenHash}`])).rows[0].accepted_at,null);

    const challengeResponse = await post('/api/auth/login',{email,password}); assert.equal(challengeResponse.status,202);
    assert.equal(challengeResponse.headers.get('set-cookie'), null, 'no full session before MFA');
    const {challenge} = await challengeResponse.json() as {challenge:string};
    assert.equal((await post('/api/auth/mfa/verify',{challenge,code})).status,401, 'enrollment TOTP cannot be replayed');
    const verified = await post('/api/auth/mfa/verify',{challenge,code:recoveryCodes[0]}); assert.equal(verified.status,200);
    assert.equal((await post('/api/auth/mfa/verify',{challenge,code:recoveryCodes[1]})).status,401, 'challenge is single-use');
    const next = await post('/api/auth/login',{email,password}); const nextBody = await next.json() as {challenge:string};
    assert.equal((await post('/api/auth/mfa/verify',{challenge:nextBody.challenge,code:recoveryCodes[0]})).status,401, 'recovery code is single-use');
    const race1 = await post('/api/auth/login',{email,password}); const race2 = await post('/api/auth/login',{email,password});
    const c1 = (await race1.json() as {challenge:string}).challenge, c2 = (await race2.json() as {challenge:string}).challenge;
    const simultaneous = await Promise.all([post('/api/auth/mfa/verify',{challenge:c1,code:recoveryCodes[2]}),post('/api/auth/mfa/verify',{challenge:c2,code:recoveryCodes[2]})]);
    assert.deepEqual(simultaneous.map(response=>response.status).sort(), [200,401], 'recovery code cannot be raced');
    const t1 = await post('/api/auth/login',{email,password}); const t2 = await post('/api/auth/login',{email,password});
    const tc1 = (await t1.json() as {challenge:string}).challenge, tc2 = (await t2.json() as {challenge:string}).challenge;
    // Both HTTP handlers use the same fixed instant: crossing a real 30-second boundary
    // must not turn this replay/locking test into an expired-code test.
    const realNow = Date.now;
    const fixedNow = realNow();
    const raceCounter = Math.floor(fixedNow / 30000);
    const raceCode = totpForCounter(decode(secret), raceCounter);
    await client.query('UPDATE admin_mfa_accounts SET last_counter=$2 WHERE user_id=$1',[id,raceCounter-1]);
    Date.now = () => fixedNow;
    try {
      const otpRace = await Promise.all([post('/api/auth/mfa/verify',{challenge:tc1,code:raceCode}),post('/api/auth/mfa/verify',{challenge:tc2,code:raceCode})]);
      assert.deepEqual(otpRace.map(response=>response.status).sort(), [200,401], 'same TOTP counter cannot be raced');
      assert.equal((await client.query('SELECT last_counter FROM admin_mfa_accounts WHERE user_id=$1',[id])).rows[0].last_counter,raceCounter);
    } finally { Date.now = realNow; }
    const beforeReset = await post('/api/auth/login',{email,password}); const resetChallenge = (await beforeReset.json() as {challenge:string}).challenge;
    await client.query('UPDATE users SET password_hash=$2,password_changed_at=now() WHERE id=$1',[id,await AuthService.hashPassword('replacement-password')]);
    assert.equal((await post('/api/auth/mfa/verify',{challenge:resetChallenge,code:recoveryCodes[3]})).status,401, 'password reset invalidates earlier challenge');
    assert.equal((await probe(body.token)).status,401, 'password reset invalidates previously issued MFA session');
    const limits = await Promise.all(Array.from({length: 12}, () => post('/api/auth/mfa/verify',{challenge:'z'.repeat(43),code:'123456'})));
    const limited = limits.find(response => response.status === 429);
    assert.ok(limited, 'MFA verification is rate limited');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await client.query('DELETE FROM rate_limit_buckets WHERE bucket_key=$1',[ipBucket]);
    await client.query('DELETE FROM admin_audit_logs WHERE admin_id=$1',[id]);
    await client.query('DELETE FROM invitations WHERE company_id=$1',[companyId]);
    await client.query('DELETE FROM memberships WHERE company_id=$1',[companyId]);
    await client.query('DELETE FROM companies WHERE id=$1',[companyId]);
    await client.query('DELETE FROM users WHERE id IN ($1,$2)',[id,otherId]);
    await closeControlDatabase(); await pool.end(); await client.end();
  }
});
