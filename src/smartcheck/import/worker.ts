import { run } from "graphile-worker";
import { processSmartCheckDocument } from "./processor";
import { graphileWorkerSchema } from "./config";

export const workerTaskList = {
  process_smartcheck_document: async (payload: unknown) =>
    processSmartCheckDocument(payload as { companyId: string; documentId: string; processingRunId: string }),
};

export async function startWorker() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  return run({
    connectionString,
    schema: graphileWorkerSchema(),
    concurrency: parseInt(process.env.SMARTCHECK_WORKER_CONCURRENCY || "2", 10),
    pollInterval: 1000,
    taskList: workerTaskList,
  });
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
  await startWorker();
}
