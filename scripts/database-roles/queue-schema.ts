import { runMigrations } from "graphile-worker";

export const QUEUE_SCHEMA = "teklifpro_queue";

/**
 * Installs or upgrades the Graphile Worker queue schema owned by bimmetraj_owner.
 *
 * Role provisioning requires the queue functions to exist, and on a fresh database nothing has
 * created them yet: the worker itself runs as bimmetraj_worker and may not create schemas. The
 * administrator session assumes the NOLOGIN owner role so every queue object is owner-owned,
 * exactly as transferManagedObjects leaves a migrated legacy database. Re-running is a no-op.
 */
export async function installQueueSchemaAsOwner(administratorUrl: string): Promise<void> {
  const ownerSession = new URL(administratorUrl);
  ownerSession.searchParams.set("options", "-c role=bimmetraj_owner");
  await runMigrations({ connectionString: ownerSession.toString(), schema: QUEUE_SCHEMA });
}
