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

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
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
    handleSessionExpired();
  }

  return response;
}
