import { run } from "graphile-worker";
import { processSmartCheckDocument } from "./processor";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

await run({
  connectionString,
  concurrency: 2,
  pollInterval: 1000,
  taskList: {
    process_smartcheck_document: async (payload) => processSmartCheckDocument(payload as { companyId: string; documentId: string; processingRunId: string }),
  },
});
