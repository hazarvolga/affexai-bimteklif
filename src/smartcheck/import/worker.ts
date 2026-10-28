import { attachProcessHeartbeat } from "./process-heartbeat";
import { cleanupExpiredPendingUploads, startPendingUploadCleanup } from "./upload-cleanup";
import { createStorageAdapter } from "./storage";
import { assertProductionEnvironment, validateSmartcheckStorageEnvironment } from "../../server/config/production";
import { run } from "graphile-worker";
import { processSmartCheckDocument } from "./processor";
import { graphileWorkerSchema } from "./config";
import { withDisabledGraphileCron } from "./worker-config";
import { captureError, initErrorTracking } from "../../server/observability/error-tracking";

export const workerTaskList = {
  process_smartcheck_document: async (payload: unknown, helpers: { job: { id: string } }) => {
    const job = payload as { companyId: string; documentId: string; processingRunId: string };
    try {
      return await processSmartCheckDocument(job, helpers.job.id);
    } catch (error) {
      // Graphile retries the job; the failure still reaches error tracking each time.
      captureError(error, { task: "process_smartcheck_document", processingRunId: job.processingRunId });
      throw error;
    }
  },
};

export async function startWorker() {
  assertProductionEnvironment(process.env, { requireControlDatabase: false });
  if (process.env.NODE_ENV === "production" && !validateSmartcheckStorageEnvironment().valid) throw new Error("INVALID_WORKER_STORAGE");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const concurrency = Number(process.env.SMARTCHECK_WORKER_CONCURRENCY || "2");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error("INVALID_WORKER_CONCURRENCY");
  const runner = await run(withDisabledGraphileCron({
    connectionString,
    schema: graphileWorkerSchema(),
    concurrency,
    maxPoolSize: concurrency + 2,
    pollInterval: 1000,
    taskList: workerTaskList,
  }));
  attachProcessHeartbeat(connectionString, "worker", runner.promise);
  const cleanup = startPendingUploadCleanup(() => cleanupExpiredPendingUploads(createStorageAdapter()), () => console.error("Pending upload cleanup failed"));
  void runner.promise.then(() => cleanup.stop(), () => cleanup.stop());
  return runner;
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (
    process.argv[1].endsWith("worker.ts") ||
    process.argv[1].endsWith("worker.mjs") ||
    process.argv[1].endsWith("worker.js") ||
    process.argv[1].endsWith("worker")
  ) &&
  !process.argv[1].includes("ifc-worker")
);

if (isDirectRun) {
  initErrorTracking("worker");
  await startWorker();
}
