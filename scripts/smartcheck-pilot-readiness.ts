import path from "node:path";
import { readPilotAdmission, validatePilotAdmission } from "../src/smartcheck/pilot/readiness";

const manifestPath = process.argv.slice(2).find((argument) => argument !== "--");
if (!manifestPath) {
  console.error("Usage: pnpm smartcheck:pilot-check -- /secure/path/pilot-admission.json");
  process.exitCode = 2;
} else {
  try {
    const resolved = path.resolve(manifestPath);
    const errors = validatePilotAdmission(readPilotAdmission(resolved));
    if (errors.length) {
      console.error(`PILOT GATE: BLOCKED (${errors.length} issue${errors.length === 1 ? "" : "s"})`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log("PILOT GATE: ADMISSION EVIDENCE COMPLETE");
    }
  } catch (error) {
    console.error(`PILOT GATE: INVALID MANIFEST - ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
