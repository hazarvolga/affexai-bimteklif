/**
 * A deploy replaces the hashed script files. A tab opened before it asks for a name that no longer
 * exists, and the browser reports it as a failed dynamic import (or, behind the SPA fallback, as an
 * HTML file served as a script).
 */
const STALE_CHUNK_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to load module script/i,
];

export const STALE_CHUNK_MESSAGE = "Uygulama güncellendi; bu sekme eski sürümü kullanıyor. Sayfayı yenileyin.";

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && STALE_CHUNK_PATTERNS.some(pattern => pattern.test(error.message));
}
