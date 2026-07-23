import dotenv from "dotenv";
import { assertProductionEnvironment, validateSmartcheckStorageEnvironment } from "../src/server/config/production";
import { createStorageAdapter } from "../src/smartcheck/import/storage";
import { runStorageSmoke } from "../src/smartcheck/import/storage-smoke";

dotenv.config({ path: ".env.local" });
dotenv.config();

const environment = { ...process.env, NODE_ENV: "production", SMARTCHECK_IMPORT_ENABLED: "true" };
const storage = validateSmartcheckStorageEnvironment(environment);
if (!storage.valid) {
  console.error("SMARTCHECK STORAGE SMOKE: BLOCKED");
  for (const error of storage.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  try {
    assertProductionEnvironment(environment);
    const result = await runStorageSmoke(createStorageAdapter(), process.env.SMARTCHECK_S3_SMOKE_PREFIX ?? "smartcheck-smoke");
    console.log(JSON.stringify({ status: "passed", ...result }, null, 2));
  } catch (error) {
    console.error(`SMARTCHECK STORAGE SMOKE: FAILED - ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
