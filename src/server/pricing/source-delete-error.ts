const REVIEW_HISTORY_CONSTRAINT = 'global_price_source_review_events_source_id_pricing_data_source';

/** Drizzle wraps the PostgreSQL foreign-key error in `cause`. */
export function isSourceReviewHistoryConflict(error: unknown): boolean {
  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : error;
  return !!cause && typeof cause === 'object' && 'code' in cause && cause.code === '23503'
    && 'constraint' in cause && cause.constraint === REVIEW_HISTORY_CONSTRAINT;
}
