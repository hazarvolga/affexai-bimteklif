import path from "node:path";
import { readPilotAdmission, validatePilotAdmission } from "../src/smartcheck/pilot/readiness";

const args = process.argv.slice(2);
const manifestPath = args.find((argument) => argument !== "--" && !argument.startsWith("--as-of=") && argument !== "--json");
const jsonOutput = args.includes("--json");
const asOfArgument = args.find((argument) => argument.startsWith("--as-of="))?.slice("--as-of=".length);
const asOf = asOfArgument && /^\d{4}-\d{2}-\d{2}$/.test(asOfArgument) ? new Date(`${asOfArgument}T00:00:00.000Z`) : new Date(Number.NaN);
if (Number.isNaN(asOf.getTime())) {
  console.error("PILOT GATE: INVALID --as-of DATE");
  process.exitCode = 2;
}
if (!manifestPath) {
  console.error("Usage: pnpm smartcheck:pilot-check -- [--json] [--as-of=YYYY-MM-DD] /secure/path/pilot-admission.json");
  process.exitCode = 2;
} else if (process.exitCode !== 2) {
  try {
    const resolved = path.resolve(manifestPath);
    const errors = validatePilotAdmission(readPilotAdmission(resolved), { asOf });
    if (errors.length) {
      if (jsonOutput) console.log(JSON.stringify({ status: "blocked", asOf: asOf.toISOString().slice(0, 10), errors }, null, 2));
      else {
        console.error(`PILOT GATE: BLOCKED (${errors.length} issue${errors.length === 1 ? "" : "s"})`);
        for (const error of errors) console.error(`- ${error}`);
      }
      process.exitCode = 1;
    } else {
      if (jsonOutput) console.log(JSON.stringify({ status: "passed", asOf: asOf.toISOString().slice(0, 10) }, null, 2));
      else console.log("PILOT GATE: ADMISSION EVIDENCE COMPLETE");
    }
  } catch (error) {
    if (jsonOutput) console.log(JSON.stringify({ status: "invalid_manifest", asOf: asOf.toISOString().slice(0, 10), error: error instanceof Error ? error.message : String(error) }, null, 2));
    else console.error(`PILOT GATE: INVALID MANIFEST - ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
