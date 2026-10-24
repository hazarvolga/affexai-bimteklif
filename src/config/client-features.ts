/**
 * Phase 6 pilot. Server-side `PROGRESS_PAYMENTS_ENABLED=true` remains authoritative;
 * this Vite-only flag controls whether tenant navigation advertises the pilot.
 * `import.meta.env` is absent under Node tests; the flag then reads as off.
 */
export const PROGRESS_PAYMENTS_ENABLED = import.meta.env?.VITE_PROGRESS_PAYMENTS_ENABLED === 'true';
