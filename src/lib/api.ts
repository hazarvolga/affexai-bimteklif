import { toast } from 'sonner';

/**
 * Oturum HttpOnly çerezlerdedir (sunucu `bm_session` / `bm_admin` yazar); JavaScript jetonu göremez.
 * `bm_authed` yalnız "oturum açıldı" ipucudur (kimlik bilgisi değildir): anonim ziyaretçilerde gereksiz
 * `/api/auth/me` çağrısını ve 401 yönlendirmesini önler.
 */
const SESSION_HINT_KEY = 'bm_authed';

let sessionExpiredHandled = false;

/** Önceki sürümlerin localStorage'da bıraktığı jetonlar çalınabilir; açılışta silinir. */
export function purgeLegacyTokens(): void {
  try {
    for (const key of ['token', 'superadmin_token', 'admin_session_backup']) localStorage.removeItem(key);
  } catch { /* depolama kapalı */ }
}

export function hasSessionHint(): boolean {
  try { return localStorage.getItem(SESSION_HINT_KEY) === '1'; } catch { return false; }
}

export function setSessionHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch { /* depolama kapalı: ipucu olmadan çalışır */ }
}

/** Yönetim bağlamı: sunucu `bm_admin` çerezini bu başlıkla seçer (yetki vermez). */
export function isAdminContext(url?: string): boolean {
  return (typeof url === 'string' && url.startsWith('/api/admin')) ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
}

function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  if (window.location.pathname.startsWith('/login')) return;
  sessionExpiredHandled = true;
  setSessionHint(false);
  toast.error('Oturumunuz sona erdi. Devam etmek için tekrar giriş yapın.');
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?next=${next}`);
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.delete('Authorization');
  if (isAdminContext(url)) headers.set('X-BM-Context', 'admin');
  // Preserve explicit binary/S3 content types. The previous unconditional
  // JSON header corrupted SmartCheck CSV/XLSX uploads in the browser.
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await drainBody(await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  }));

  if (response.status === 401 && hasSessionHint()) handleSessionExpired();

  return response;
}

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * API yanıtları `Cache-Control: no-store` taşır; tarayıcı önbelleği artık gövdeyi tüketmez. Gövdesi okunmayan
 * bir yanıt (iptal edilen efekt, hata dalı) bağlantıyı açık bırakır. Gövde burada bir kez okunur ve aynı durum,
 * başlık ve içerikle yeni bir yanıt döner; çağıranlar eskisi gibi `json()` / `blob()` kullanır.
 */
async function drainBody(response: Response): Promise<Response> {
  const body = NULL_BODY_STATUSES.has(response.status) ? null : await response.arrayBuffer();
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
