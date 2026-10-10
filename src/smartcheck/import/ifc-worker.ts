import { run } from "graphile-worker";
import { processSmartCheckDocument } from "./processor";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

await run({
  connectionString,
  concurrency: parseInt(process.env.SMARTCHECK_IFC_WORKER_CONCURRENCY || '1', 10),
  pollInterval: 1000,
  taskList: {
    process_smartcheck_ifc_document: async (payload) => processSmartCheckDocument(payload as { companyId: string; documentId: string; processingRunId: string }),
  },
});
