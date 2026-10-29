/** Keep the local session intact unless the server confirms revocation. */
export async function endBrowserSession(
  request: () => Promise<{ ok: boolean }>,
  clearSession: () => void,
): Promise<boolean> {
  try {
    const response = await request();
    if (!response.ok) return false;
    clearSession();
    return true;
  } catch {
    return false;
  }
}
