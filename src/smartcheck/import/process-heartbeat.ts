import crypto from 'node:crypto';
import pg from 'pg';
import { readBuildRevision } from '../../server/observability/error-tracking';

interface HeartbeatLifecycle {
  runner: Promise<unknown>;
  write: () => Promise<unknown>;
  close: () => Promise<unknown>;
  schedule: (callback: () => void) => () => void;
}

/** Health reporting is best effort and never stops job processing. */
export function startProcessHeartbeat({ runner, write, close, schedule }: HeartbeatLifecycle): () => void {
  let stopped = false;
  let pending = false;
  const beat = () => {
    if (stopped || pending) return;
    pending = true;
    void write().catch(() => console.error('Worker heartbeat unavailable')).finally(() => { pending = false; });
  };
  const cancel = schedule(beat);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancel();
    void close().catch(() => console.error('Worker heartbeat shutdown failed'));
  };
  beat();
  void runner.then(stop, stop);
  return stop;
}

export function attachProcessHeartbeat(connectionString: string, kind: 'worker' | 'ifc-worker', runner: Promise<unknown>) {
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 3000, query_timeout: 3000 });
  const instanceId = crypto.randomUUID();
  const build = readBuildRevision();
  // Build identity is a bounded declaration, not evidence of the running OCI digest.
  const revision = build.revision && /^[a-fA-F0-9]{7,64}$/.test(build.revision) ? build.revision : null;
  return startProcessHeartbeat({ runner,
    write: () => pool.query('select public.bimmetraj_worker_heartbeat($1::uuid, $2::text, $3::text, $4::text)', [instanceId, kind, revision, revision ? build.revisionSource : null]),
    close: () => pool.end(),
    schedule: callback => { const timer = setInterval(callback, 30_000); timer.unref(); return () => clearInterval(timer); },
  });
}
