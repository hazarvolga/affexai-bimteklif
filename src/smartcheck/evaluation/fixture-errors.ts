export type FixtureInfrastructureErrorCode =
  | 'FIXTURE_NOT_FOUND'
  | 'FIXTURE_PATH_INVALID'
  | 'FIXTURE_SYMLINK_REJECTED'
  | 'FIXTURE_JSON_INVALID'
  | 'FIXTURE_SCHEMA_INVALID'
  | 'FIXTURE_DATASET_MISMATCH'
  | 'FIXTURE_CASE_ID_MISMATCH'
  | 'FIXTURE_EXPECTED_COUNT_MISMATCH'
  | 'FIXTURE_DUPLICATE_CASE_ID'
  | 'FIXTURE_DUPLICATE_EXPECTED_ID'
  | 'FIXTURE_DUPLICATE_EXPECTED_FINGERPRINT'
  | 'FIXTURE_PROVIDER_RESULT_INVALID'
  | 'FIXTURE_DUPLICATE_CANDIDATE_ID';

export class FixtureInfrastructureError extends Error {
  constructor(
    public readonly code: FixtureInfrastructureErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'FixtureInfrastructureError';
  }
}
