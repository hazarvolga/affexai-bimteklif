export const REQUIRED_GRAPHILE_WORKER_MIGRATION = 18;

export function assertGraphileWorkerSchemaRevision(latest: number | null | undefined): void {
  if ((latest ?? 0) < REQUIRED_GRAPHILE_WORKER_MIGRATION) {
    throw new Error(`Graphile Worker schema migration ${REQUIRED_GRAPHILE_WORKER_MIGRATION} is required`);
  }
}
