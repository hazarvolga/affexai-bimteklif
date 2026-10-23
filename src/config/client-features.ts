/**
 * Phase 6 pilot. Server-side `PROGRESS_PAYMENTS_ENABLED=true` remains authoritative;
 * this Vite-only flag controls whether tenant navigation advertises the pilot.
 */
export const PROGRESS_PAYMENTS_ENABLED = import.meta.env.VITE_PROGRESS_PAYMENTS_ENABLED === 'true';
