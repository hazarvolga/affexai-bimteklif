import assert from "node:assert/strict";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseVeraPdfXml, runVeraPdfValidation } from "./verapdf-runner";

const fixtures = path.resolve("fixtures/phase-0/open-source/verapdf");

async function fakeVeraPdf(directory: string, mode: "normal" | "sleep" | "huge" | "exit2" = "normal", profileName = "PDF/A-2b validation profile", expectedFlavour = "2b", forcedExitCode?: 0 | 1): Promise<string> {
  const executable = path.join(directory, "verapdf-fixture.mjs");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("veraPDF 1.28.2"); process.exit(0); }
const expected = ["--format", "xml", "--flavour", "${expectedFlavour}", "--loglevel", "0", "--maxfailuresdisplayed", "100"];
if (!expected.every((value, index) => args[index] === value)) process.exit(64);
${mode === "sleep" ? "setTimeout(() => {}, 60000);" : ""}
${mode === "huge" ? "process.stdout.write('x'.repeat(4096));" : ""}
${mode === "normal" || mode === "exit2" ? `
const compliant = args.at(-1).endsWith("pdfa2b-pass.pdf");
const failed = compliant ? 0 : 1;
process.stdout.write(\`<?xml version="1.0" encoding="utf-8"?>
<report><buildInformation><releaseDetails id="core" version="1.28.2"/></buildInformation>
<jobs><job><validationReport profileName="${profileName}" statement="fixture &amp; deterministic" isCompliant="\${compliant}">
<details passedRules="101" failedRules="\${failed}" passedChecks="503" failedChecks="\${failed}"/></validationReport></job></jobs>
<batchSummary totalJobs="1" failedToParse="0" encrypted="0" outOfMemory="0" veraExceptions="0">
<validationReports compliant="\${compliant ? 1 : 0}" nonCompliant="\${failed}" failedJobs="0">1</validationReports></batchSummary></report>\`);
process.exit(${mode === "exit2" ? "2" : forcedExitCode === undefined ? "compliant ? 0 : 1" : String(forcedExitCode)});
` : ""}
`;
  await fs.writeFile(executable, script, { mode: 0o700 });
  return executable;
}

test("veraPDF report contract maps deterministic fake CLI output for the permitted PASS and FAIL fixtures", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "verapdf-runner-"));
  try {
    const executablePath = await fakeVeraPdf(directory);
    const passPath = path.join(fixtures, "pdfa2b-pass.pdf");
    const failPath = path.join(fixtures, "pdfa2b-fail.pdf");
    const [passBefore, failBefore] = await Promise.all([fs.readFile(passPath), fs.readFile(failPath)]);

    const pass = await runVeraPdfValidation(passPath, "pdfa2b-pass.pdf", { executablePath });
    const fail = await runVeraPdfValidation(failPath, "pdfa2b-fail.pdf", { executablePath });

    assert.equal(pass.tool.version, "1.28.2");
    assert.equal(pass.profile.code, "2b");
    assert.equal(pass.validation.isCompliant, true);
    assert.equal(pass.validation.scanComplete, true);
    assert.equal(pass.source.checksumSha256, "93ac7ed7dfcd86d81e7a4865220fc77eb2284297370aca5a87c10e2d3e75d10b");
    assert.equal(fail.validation.isCompliant, false);
    assert.equal(fail.validation.scanComplete, true);
    assert.equal(fail.validation.failedRules, 1);
    assert.equal(fail.source.checksumSha256, "f99e9e76b5fa37ff7376d870da793662c2346aec1aa4be63d170f58a26bc0e3d");
    assert.deepEqual(pass.conversion, { status: "disabled_requires_licensed_provider", outputCreated: false, sourceOverwritten: false });
    assert.deepEqual(await fs.readFile(passPath), passBefore);
    assert.deepEqual(await fs.readFile(failPath), failBefore);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("veraPDF runner rejects exit codes other than compliant 0 and noncompliant 1", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "verapdf-runner-exit-"));
  try {
    const executablePath = await fakeVeraPdf(directory, "exit2");
    await assert.rejects(
      runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath }),
      (error: unknown) => error instanceof Error && error.message === "VERAPDF_PROCESS_FAILED",
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("veraPDF runner rejects exit-code and XML compliance contradictions", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "verapdf-runner-exit-report-"));
  try {
    const compliantWithExitOne = await fakeVeraPdf(directory, "normal", "PDF/A-2b validation profile", "2b", 1);
    await assert.rejects(
      runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath: compliantWithExitOne }),
      (error: unknown) => error instanceof Error && error.message === "VERAPDF_EXIT_REPORT_MISMATCH",
    );

    await fs.rm(compliantWithExitOne);
    const noncompliantWithExitZero = await fakeVeraPdf(directory, "normal", "PDF/A-2b validation profile", "2b", 0);
    await assert.rejects(
      runVeraPdfValidation(path.join(fixtures, "pdfa2b-fail.pdf"), "pdfa2b-fail.pdf", { executablePath: noncompliantWithExitZero }),
      (error: unknown) => error instanceof Error && error.message === "VERAPDF_EXIT_REPORT_MISMATCH",
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("veraPDF runner accepts official profile conformance casing without weakening profile matching", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "verapdf-runner-profile-"));
  try {
    const upperCaseConformance = await fakeVeraPdf(directory, "normal", "PDF/A-2B validation profile");
    const report = await runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath: upperCaseConformance, profile: "2b" });
    assert.equal(report.profile.code, "2b");
    assert.equal(report.profile.name, "PDF/A-2B validation profile");

    await fs.rm(upperCaseConformance);
    const wrongConformance = await fakeVeraPdf(directory, "normal", "PDF/A-2A validation profile");
    await assert.rejects(
      runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath: wrongConformance, profile: "2b" }),
      (error: unknown) => error instanceof Error && error.message === "VERAPDF_PROFILE_MISMATCH",
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("veraPDF runner preserves exact part and conformance across every advertised profile", async () => {
  const profiles = {
    "1a": "PDF/A-1A validation profile", "1b": "PDF/A-1B validation profile",
    "2a": "PDF/A-2A validation profile", "2b": "PDF/A-2B validation profile", "2u": "PDF/A-2U validation profile",
    "3a": "PDF/A-3A validation profile", "3b": "PDF/A-3B validation profile", "3u": "PDF/A-3U validation profile",
    "4": "PDF/A-4 validation profile", "4e": "PDF/A-4E validation profile", "4f": "PDF/A-4F validation profile",
  } as const;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "verapdf-runner-profiles-"));
  try {
    for (const [profile, profileName] of Object.entries(profiles)) {
      const directory = path.join(root, profile);
      await fs.mkdir(directory);
      const executablePath = await fakeVeraPdf(directory, "normal", profileName, profile);
      const report = await runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath, profile: profile as keyof typeof profiles });
      assert.equal(report.profile.code, profile);
      assert.equal(report.profile.name, profileName);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("configured real veraPDF CLI validates the permitted upstream PDF/A-2b PASS and FAIL fixtures", async testContext => {
  const executablePath = process.env.VERAPDF_CLI_PATH;
  if (!executablePath) {
    testContext.skip("VERAPDF_CLI_PATH is not configured; real veraPDF/Java integration gate is unavailable.");
    return;
  }
  if (!path.isAbsolute(executablePath)) {
    testContext.skip("VERAPDF_CLI_PATH is configured but is not absolute; fail-closed runner will reject it.");
    return;
  }
  try {
    await fs.access(executablePath, fsConstants.X_OK);
  } catch {
    testContext.skip("VERAPDF_CLI_PATH does not point to an executable file; real integration gate is unavailable.");
    return;
  }

  const pass = await runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath });
  const fail = await runVeraPdfValidation(path.join(fixtures, "pdfa2b-fail.pdf"), "pdfa2b-fail.pdf", { executablePath });
  assert.equal(pass.status, "completed");
  assert.equal(pass.tool.status, "available");
  assert.ok(pass.tool.version);
  assert.equal(pass.profile.code, "2b");
  assert.equal(pass.validation.scanComplete, true);
  assert.equal(pass.validation.isCompliant, true);
  assert.equal(fail.status, "completed");
  assert.equal(fail.validation.scanComplete, true);
  assert.equal(fail.validation.isCompliant, false);
  assert.equal(pass.conversion.status, "disabled_requires_licensed_provider");
  assert.equal(fail.conversion.status, "disabled_requires_licensed_provider");
});

test("veraPDF runner reports missing configuration and executable as explicitly unavailable", async () => {
  const inputPath = path.join(fixtures, "pdfa2b-pass.pdf");
  const previous = process.env.VERAPDF_CLI_PATH;
  delete process.env.VERAPDF_CLI_PATH;
  try {
    const notConfigured = await runVeraPdfValidation(inputPath, "pdfa2b-pass.pdf");
    assert.equal(notConfigured.status, "unavailable");
    assert.equal(notConfigured.unavailableReason, "not_configured");
    assert.equal(notConfigured.validation.isCompliant, null);
    assert.equal(notConfigured.validation.scanComplete, false);

    const missing = await runVeraPdfValidation(inputPath, "pdfa2b-pass.pdf", { executablePath: path.join(os.tmpdir(), "missing-verapdf-cli") });
    assert.equal(missing.status, "unavailable");
    assert.equal(missing.unavailableReason, "executable_unavailable");
  } finally {
    if (previous === undefined) delete process.env.VERAPDF_CLI_PATH;
    else process.env.VERAPDF_CLI_PATH = previous;
  }
});

test("veraPDF runner bounds execution time and machine-readable output", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "verapdf-runner-"));
  try {
    await fs.mkdir(path.join(directory, "slow"));
    const slow = await fakeVeraPdf(path.join(directory, "slow"), "sleep");
    await assert.rejects(
      runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath: slow, timeoutMs: 25 }),
      (error: unknown) => error instanceof Error && error.message === "VERAPDF_TIMEOUT",
    );

    await fs.mkdir(path.join(directory, "huge"));
    const huge = await fakeVeraPdf(path.join(directory, "huge"), "huge");
    await assert.rejects(
      runVeraPdfValidation(path.join(fixtures, "pdfa2b-pass.pdf"), "pdfa2b-pass.pdf", { executablePath: huge, maxOutputBytes: 1024 }),
      (error: unknown) => error instanceof Error && error.message === "VERAPDF_OUTPUT_TOO_LARGE",
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("veraPDF XML parser rejects DTD/entity input and incomplete scans", () => {
  assert.throws(() => parseVeraPdfXml(`<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><report></report>`), /VERAPDF_INVALID_XML/);
  const incomplete = parseVeraPdfXml(`<?xml version="1.0"?><report><jobs><validationReport profileName="PDF/A-2b validation profile" isCompliant="true"><details passedRules="1" failedRules="0" passedChecks="1" failedChecks="0"/></validationReport></jobs><batchSummary totalJobs="1" failedToParse="1" encrypted="0" outOfMemory="0" veraExceptions="0"><validationReports compliant="0" nonCompliant="0" failedJobs="1">0</validationReports></batchSummary></report>`);
  assert.equal(incomplete.scanComplete, false);

  const contradictory = parseVeraPdfXml(`<?xml version="1.0"?><report><jobs><validationReport profileName="PDF/A-2b validation profile" isCompliant="true"><details passedRules="1" failedRules="1" passedChecks="1" failedChecks="1"/></validationReport></jobs><batchSummary totalJobs="1" failedToParse="0" encrypted="0" outOfMemory="0" veraExceptions="0"><validationReports compliant="1" nonCompliant="0" failedJobs="0">1</validationReports></batchSummary></report>`);
  assert.equal(contradictory.scanComplete, false);
});
