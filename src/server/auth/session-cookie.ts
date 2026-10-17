/**
 * Tarayıcı oturumu için HttpOnly çerezler (Denetim P1-5).
 *
 * Eskiden JWT `localStorage`'da tutuluyordu: tek bir XSS süper admin dahil her oturumu çalabilirdi. Artık
 * tarayıcı oturumu JavaScript'in okuyamadığı çerezlerdedir:
 *  - `bm_session`: aktif çalışma alanı oturumu (kullanıcı veya impersonation)
 *  - `bm_admin`:   süper admin oturumu (impersonation sırasında da admin paneli bu oturumla çalışır)
 * `Authorization: Bearer` başlığı API istemcileri ve testler için geçerliliğini korur.
 *
 * CSRF: çerez `SameSite=Strict` taşır; ayrıca çerezle kimliklenen değiştirici isteklerde aynı-origin kanıtı
 * (`Sec-Fetch-Site: same-origin` veya eşleşen `Origin`) aranır.
 */

export const SESSION_COOKIE = 'bm_session';
export const ADMIN_COOKIE = 'bm_admin';
/** İstemci, çerez seçimi için yönetim bağlamını bu başlıkla bildirir; yetki vermez, yalnız hangi çerezin okunacağını seçer. */
export const CONTEXT_HEADER = 'x-bm-context';

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const IMPERSONATION_MAX_AGE_SECONDS = 15 * 60;
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in out) continue;
    try { out[name] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* geçersiz kodlama: yok say */ }
  }
  return out;
}

function cookieAttributes(maxAgeSeconds: number, secure: boolean): string {
  return `Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

function isSecureEnvironment(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === 'production' || (env.PUBLIC_APP_URL ?? '').startsWith('https://');
}

interface CookieResponse {
  append(name: string, value: string): unknown;
}

function serialize(name: string, token: string, maxAge: number, secure: boolean): string {
  return `${name}=${encodeURIComponent(token)}; ${cookieAttributes(maxAge, secure)}`;
}

export interface IssueOptions {
  /** Süper admin kendi oturumunu açtığında ayrıca `bm_admin` yazılır. */
  isSuperAdmin?: boolean;
  /** Impersonation oturumu 15 dakika yaşar; `bm_admin` değişmez. */
  impersonation?: boolean;
  env?: Record<string, string | undefined>;
}

export function setSessionCookies(res: CookieResponse, token: string, options: IssueOptions = {}): void {
  const secure = isSecureEnvironment(options.env);
  const maxAge = options.impersonation ? IMPERSONATION_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS;
  res.append('Set-Cookie', serialize(SESSION_COOKIE, token, maxAge, secure));
  if (options.isSuperAdmin && !options.impersonation) {
    res.append('Set-Cookie', serialize(ADMIN_COOKIE, token, maxAge, secure));
  }
}

export function clearSessionCookies(res: CookieResponse, env?: Record<string, string | undefined>): void {
  const secure = isSecureEnvironment(env);
  for (const name of [SESSION_COOKIE, ADMIN_COOKIE]) res.append('Set-Cookie', serialize(name, '', 0, secure));
}

/** Impersonation bitince `bm_session` yeniden süper adminin kendi oturumuna döner; `bm_admin` yoksa çıkış yapılır. */
export function restoreAdminSession(res: CookieResponse, adminToken: string | undefined, env?: Record<string, string | undefined>): boolean {
  if (!adminToken) { clearSessionCookies(res, env); return false; }
  res.append('Set-Cookie', serialize(SESSION_COOKIE, adminToken, SESSION_MAX_AGE_SECONDS, isSecureEnvironment(env)));
  return true;
}

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  url?: string;
}

function headerValue(req: RequestLike, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export type SessionSource = 'bearer' | 'cookie';

/** Kimlik doğrulama için kullanılacak jetonu ve kaynağını seçer. `Bearer` varsa çerezden önceliklidir. */
export function readSessionToken(req: RequestLike): { token: string; source: SessionSource } | null {
  const authorization = headerValue(req, 'authorization');
  const bearer = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] : undefined;
  if (bearer) return { token: bearer, source: 'bearer' };

  const cookies = parseCookies(headerValue(req, 'cookie'));
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
  const adminContext = headerValue(req, CONTEXT_HEADER) === 'admin' || path.startsWith('/api/admin');
  const token = adminContext ? cookies[ADMIN_COOKIE] || cookies[SESSION_COOKIE] : cookies[SESSION_COOKIE];
  return token ? { token, source: 'cookie' } : null;
}

/** Çerezle kimliklenen değiştirici istekte aynı-origin kanıtı arar (CSRF savunması). */
export function isSameOriginMutation(req: RequestLike, env: Record<string, string | undefined> = process.env): boolean {
  const method = (req.method ?? 'GET').toUpperCase();
  if (!UNSAFE_METHODS.has(method)) return true;
  if (headerValue(req, 'sec-fetch-site') === 'same-origin') return true;
  const origin = headerValue(req, 'origin');
  if (!origin) return false;
  let originHost: string;
  try { originHost = new URL(origin).host; } catch { return false; }
  if (originHost === headerValue(req, 'host')) return true;
  try { return Boolean(env.PUBLIC_APP_URL) && originHost === new URL(env.PUBLIC_APP_URL as string).host; } catch { return false; }
}

/**
 * Tarayıcılar her istekte `Sec-Fetch-Site` gönderir; API istemcileri ve testler göndermez. Tarayıcıya jetonu
 * yanıt gövdesinde vermeyiz (XSS ile `fetch` yanıtından okunamasın); yalnız HttpOnly çerez taşır.
 */
export function bodyToken(req: RequestLike, token: string): string | undefined {
  return headerValue(req, 'sec-fetch-site') ? undefined : token;
}
