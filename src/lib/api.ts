import { toast } from 'sonner';

let sessionExpiredHandled = false;

function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  if (window.location.pathname.startsWith('/login')) return;
  sessionExpiredHandled = true;
  localStorage.removeItem('token');
  toast.error('Oturumunuz sona erdi. Devam etmek için tekrar giriş yapın.');
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?next=${next}`);
}

export function getActiveAuthToken(url?: string): string | null {
  const isAdminContext =
    (typeof url === 'string' && url.startsWith('/api/admin')) ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  if (isAdminContext) {
    return (
      localStorage.getItem('superadmin_token') ||
      localStorage.getItem('admin_session_backup') ||
      localStorage.getItem('token')
    );
  }
  return localStorage.getItem('token');
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getActiveAuthToken(url);
  const headers = new Headers(options.headers);
  headers.set('Authorization', token ? `Bearer ${token}` : '');
  // Preserve explicit binary/S3 content types. The previous unconditional
  // JSON header corrupted SmartCheck CSV/XLSX uploads in the browser.
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    if (url.startsWith('/api/admin')) {
      localStorage.removeItem('superadmin_token');
    }
    handleSessionExpired();
  }

  return response;
}
