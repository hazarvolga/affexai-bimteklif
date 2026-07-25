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

  if (response.status === 401) {
    // In dev / demo review mode, do not kick user out to login on background API 401s
    console.warn('API returned 401 Unauthorized for:', url);
  }

  return response;
}
