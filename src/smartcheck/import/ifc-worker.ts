import { assertProductionEnvironment, validateSmartcheckStorageEnvironment } from "../../server/config/production";
import { run } from "graphile-worker";
import { processSmartCheckDocument } from "./processor";
import { graphileWorkerSchema } from "./config";
import { withDisabledGraphileCron } from "./worker-config";
import { captureError, initErrorTracking } from "../../server/observability/error-tracking";

export const ifcWorkerTaskList = {
  process_smartcheck_ifc_document: async (payload: unknown, helpers: { job: { id: string } }) => {
    const job = payload as { companyId: string; documentId: string; processingRunId: string };
    try {
      return await processSmartCheckDocument(job, helpers.job.id);
    } catch (error) {
      // Graphile retries the job; the failure still reaches error tracking each time.
      captureError(error, { task: "process_smartcheck_ifc_document", processingRunId: job.processingRunId });
      throw error;
    }
  },
};

export async function startIfcWorker() {
  assertProductionEnvironment();
  if (process.env.NODE_ENV === "production" && !validateSmartcheckStorageEnvironment().valid) throw new Error("INVALID_WORKER_STORAGE");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const concurrency = Number(process.env.SMARTCHECK_IFC_WORKER_CONCURRENCY || "1");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error("INVALID_WORKER_CONCURRENCY");
  return run(withDisabledGraphileCron({
    connectionString,
    schema: graphileWorkerSchema(),
    concurrency,
    maxPoolSize: concurrency + 2,
    pollInterval: 1000,
    taskList: ifcWorkerTaskList,
  }));
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (
    process.argv[1].endsWith("ifc-worker.ts") ||
    process.argv[1].endsWith("ifc-worker.mjs") ||
    process.argv[1].endsWith("ifc-worker.js") ||
    process.argv[1].endsWith("ifc-worker")
  )
);

if (isDirectRun) {
  initErrorTracking("ifc-worker");
  await startIfcWorker();
}
