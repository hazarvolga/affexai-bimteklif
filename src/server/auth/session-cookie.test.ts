import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../../services/auth/authService';
import { createAuthenticate } from '../middleware/auth';
import {
  ADMIN_COOKIE, SESSION_COOKIE, bodyToken, clearSessionCookies, isSameOriginMutation, parseCookies, readSessionToken,
  restoreAdminSession, setSessionCookies,
} from './session-cookie';

const userId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const token = () => AuthService.generateToken({ userId, companyId, role: 'owner' });

function recorder() {
  const headers: string[] = [];
  return { headers, append: (_name: string, value: string) => { headers.push(value); } };
}

test('çerez ayrıştırma bozuk girdiyi yok sayar ve ilk değeri korur', () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies('a=1; b=%E0%A4%A; c=3; a=2'), { a: '1', c: '3' });
  assert.equal(parseCookies(`${SESSION_COOKIE}=${encodeURIComponent('x.y.z')}`)[SESSION_COOKIE], 'x.y.z');
});

test('oturum çerezi HttpOnly, SameSite=Strict ve /api yolu ile yazılır; üretimde Secure', () => {
  const dev = recorder();
  setSessionCookies(dev, 'tok', { env: { NODE_ENV: 'development' } });
  assert.equal(dev.headers.length, 1);
  assert.match(dev.headers[0], /^bm_session=tok; Path=\/api; HttpOnly; SameSite=Strict; Max-Age=604800$/);

  const prod = recorder();
  setSessionCookies(prod, 'tok', { isSuperAdmin: true, env: { NODE_ENV: 'production' } });
  assert.equal(prod.headers.length, 2);
  assert.ok(prod.headers.every(value => /; Secure$/.test(value) && /HttpOnly/.test(value)));
  assert.ok(prod.headers.some(value => value.startsWith(`${ADMIN_COOKIE}=`)));
});

test('impersonation yalnız bm_session yazar, 15 dakika yaşar ve bm_admin değişmez', () => {
  const res = recorder();
  setSessionCookies(res, 'imp', { impersonation: true, isSuperAdmin: true, env: { NODE_ENV: 'production' } });
  assert.equal(res.headers.length, 1);
  assert.match(res.headers[0], /^bm_session=imp;.*Max-Age=900/);
});

test('çıkış iki çerezi de siler; admin oturumu yoksa geri yükleme çıkış yapar', () => {
  const out = recorder();
  clearSessionCookies(out, { NODE_ENV: 'production' });
  assert.equal(out.headers.length, 2);
  assert.ok(out.headers.every(value => /=; Path=\/api;.*Max-Age=0/.test(value)));

  const none = recorder();
  assert.equal(restoreAdminSession(none, undefined, { NODE_ENV: 'production' }), false);
  assert.equal(none.headers.length, 2);

  const back = recorder();
  assert.equal(restoreAdminSession(back, 'admintok', { NODE_ENV: 'production' }), true);
  assert.equal(back.headers.length, 1);
  assert.match(back.headers[0], /^bm_session=admintok;/);
});

test('jeton seçimi: Bearer çerezden önceliklidir; yönetim bağlamı bm_admin çerezini seçer', () => {
  const cookie = `${SESSION_COOKIE}=user; ${ADMIN_COOKIE}=admin`;
  assert.deepEqual(readSessionToken({ headers: { authorization: 'Bearer abc', cookie } }), { token: 'abc', source: 'bearer' });
  assert.deepEqual(readSessionToken({ headers: { cookie }, originalUrl: '/api/quotations' }), { token: 'user', source: 'cookie' });
  assert.deepEqual(readSessionToken({ headers: { cookie }, originalUrl: '/api/admin/plans' }), { token: 'admin', source: 'cookie' });
  assert.deepEqual(readSessionToken({ headers: { cookie, 'x-bm-context': 'admin' }, originalUrl: '/api/auth/me' }), { token: 'admin', source: 'cookie' });
  assert.deepEqual(readSessionToken({ headers: { cookie: `${SESSION_COOKIE}=only` }, originalUrl: '/api/admin/plans' }), { token: 'only', source: 'cookie' });
  assert.equal(readSessionToken({ headers: {} }), null);
});

test('CSRF: değiştirici istek aynı-origin kanıtı ister; okuma istekleri ister istemez', () => {
  const env = { PUBLIC_APP_URL: 'https://bimmetraj.com' };
  assert.equal(isSameOriginMutation({ headers: {}, method: 'GET' }, env), true);
  assert.equal(isSameOriginMutation({ headers: {}, method: 'POST' }, env), false);
  assert.equal(isSameOriginMutation({ headers: { 'sec-fetch-site': 'cross-site' }, method: 'POST' }, env), false);
  assert.equal(isSameOriginMutation({ headers: { 'sec-fetch-site': 'same-origin' }, method: 'POST' }, env), true);
  assert.equal(isSameOriginMutation({ headers: { origin: 'https://evil.example', host: 'bimmetraj.com' }, method: 'DELETE' }, env), false);
  assert.equal(isSameOriginMutation({ headers: { origin: 'https://bimmetraj.com', host: 'bimmetraj.com' }, method: 'PATCH' }, env), true);
  assert.equal(isSameOriginMutation({ headers: { origin: 'https://bimmetraj.com', host: 'internal:3000' }, method: 'POST' }, env), true);
  assert.equal(isSameOriginMutation({ headers: { origin: 'not a url' }, method: 'POST' }, env), false);
});

test('tarayıcıya jeton gövdede verilmez, API istemcisine verilir', () => {
  assert.equal(bodyToken({ headers: { 'sec-fetch-site': 'same-origin' } }, 'tok'), undefined);
  assert.equal(bodyToken({ headers: {} }, 'tok'), 'tok');
});

function authenticateWith(req: Record<string, unknown>) {
  const authenticate = createAuthenticate({
    isSessionRevoked: async () => false,
    findUser: async () => ({ email: 'o@example.test', emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: false }),
    findMembership: async () => ({ role: 'owner' as const }),
    isImpersonationRevoked: async () => false,
    findSubscription: async () => ({ status: 'active' }),
  });
  return new Promise<{ status: number; body?: unknown; passed: boolean }>(resolve => {
    let status = 200;
    const res: any = {
      status(code: number) { status = code; return this; },
      json(body: unknown) { resolve({ status, body, passed: false }); return this; },
    };
    void authenticate(req, res, (error?: unknown) => resolve({ status, passed: !error }));
  });
}

test('authenticate: çerez GET isteğini kabul eder', async () => {
  const result = await authenticateWith({ method: 'GET', headers: { cookie: `${SESSION_COOKIE}=${token()}` }, originalUrl: '/api/quotations' });
  assert.equal(result.passed, true);
});

test('authenticate: çerezle gelen cross-site POST 403 CSRF_ORIGIN_MISMATCH alır', async () => {
  const result = await authenticateWith({ method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${token()}`, origin: 'https://evil.example', host: 'bimmetraj.com' }, originalUrl: '/api/quotations' });
  assert.equal(result.passed, false);
  assert.equal(result.status, 403);
  assert.equal((result.body as { code: string }).code, 'CSRF_ORIGIN_MISMATCH');
});

test('authenticate: çerezle gelen same-origin POST kabul edilir', async () => {
  const result = await authenticateWith({ method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${token()}`, 'sec-fetch-site': 'same-origin' }, originalUrl: '/api/quotations' });
  assert.equal(result.passed, true);
});

test('authenticate: Bearer ile gelen POST için origin kanıtı aranmaz (API istemcisi)', async () => {
  const result = await authenticateWith({ method: 'POST', headers: { authorization: `Bearer ${token()}` }, originalUrl: '/api/quotations' });
  assert.equal(result.passed, true);
});

test('authenticate: jeton yoksa 401', async () => {
  const result = await authenticateWith({ method: 'GET', headers: {}, originalUrl: '/api/quotations' });
  assert.equal(result.status, 401);
});
