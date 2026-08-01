import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

interface ChildProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

// Helper: Child process spawn helper
function runEvaluateCliProcess(
  args: string[],
  timeoutMs = 90000
): Promise<ChildProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/smartcheck/evaluation/cli-main.ts', ...args], {
      cwd: process.cwd(),
      shell: false,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Child process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('close', (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({
        exitCode,
        signal,
        stdout,
        stderr
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Helper: Geçici test dizini oluşturur (realpath ile resolve edilmiş)
async function createTempFixtureDir(): Promise<string> {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-proc-'));
  return await fs.realpath(p);
}

// Helper: Dosya checksum'ı hesaplar
async function calculateFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper: Fixture dosyalarını yazar
async function writeFixture(options: {
  tempDir: string;
  version: string;
  dataset: string;
  caseId: string;
  outcome: string;
  candidateOutputContent: any;
}) {
  const datasetDir = path.join(options.tempDir, options.version, options.dataset, options.caseId);
  await fs.mkdir(datasetDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    caseId: options.caseId,
    dataset: options.dataset,
    input: {
      file: 'input.pdf',
      mimeType: 'application/pdf',
      language: ['tr']
    },
    expectation: {
      outcome: options.outcome,
      expectedRuleCount: options.outcome === 'no_rules' || options.outcome === 'corrupt' || options.outcome === 'robustness_outcome' ? 0 : 1
    },
    tags: ['test']
  };

  const defaultRule = {
    id: 'rule-1',
    title: 'Rule 1',
    canonicalStatement: 'Statement',
    discipline: 'Architecture',
    objectType: 'column',
    parameter: 'size',
    operator: 'equals',
    expectedValue: '30x50',
    errorCategory: 'modeling_standard',
    severity: 'medium',
    scopeType: 'company',
    competencyArea: 'Structure',
    sourceEvidence: [
      {
        sourceType: 'pdf',
        documentId: '11111111-1111-4111-8111-111111111111',
        pageNumber: 2,
        sourceText: 'Evidence text',
        extractionConfidence: 0.95
      }
    ]
  };

  const rules = options.outcome === 'no_rules' || options.outcome === 'corrupt' || options.outcome === 'robustness_outcome' ? [] : [defaultRule];

  await fs.writeFile(path.join(datasetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(datasetDir, 'expected-rules.json'), JSON.stringify(rules, null, 2));
  await fs.writeFile(path.join(datasetDir, 'input.pdf'), 'dummy pdf content');
  await fs.writeFile(path.join(datasetDir, 'candidate-output.json'), JSON.stringify(options.candidateOutputContent, null, 2));
}

async function cleanDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

// === TEST SCENARIOS ===

test('cli-process: successful quality-gate completion (exit code 0)', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    // QG passing için: candidateId rule-1 ile eşleşmeli
    const candidateOutput = {
      status: 'success',
      candidates: [
        {
          candidateId: 'rule-1',
          title: 'Rule 1',
          canonicalStatement: 'Statement',
          discipline: 'Architecture',
          objectType: 'column',
          parameter: 'size',
          operator: 'equals',
          expectedValue: '30x50',
          errorCategory: 'modeling_standard',
          severity: 'medium',
          scopeType: 'company',
          competencyArea: 'Structure',
          sourceEvidence: [
            {
              sourceType: 'pdf',
              documentId: '11111111-1111-4111-8111-111111111111',
              pageNumber: 2,
              sourceText: 'Evidence text',
              extractionConfidence: 0.95
            }
          ]
        }
      ]
    };

    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-success',
      outcome: 'rules_found',
      candidateOutputContent: candidateOutput
    });

    const result = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'development'
    ]);

    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stderr, '');

    const out = JSON.parse(result.stdout);
    assert.strictEqual(out.status, 'completed');
    assert.strictEqual(out.result.summary.allQualityGatesPassed, true);
    assert.strictEqual(out.result.summary.totalCases, 1);
    assert.strictEqual(out.result.summary.passedCases, 1);

    // Newline format assertion: single newline at the end, not double
    assert.match(result.stdout, /\n$/);
    assert.doesNotMatch(result.stdout, /\n\n$/);
  } finally {
    await cleanDir(tempDir);
  }
});

test('cli-process: quality-gate failure (exit code 1)', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    // QG failing: expected rule var ancak candidates boş -> recall=0
    const candidateOutput = {
      status: 'success',
      candidates: []
    };

    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-failure',
      outcome: 'rules_found',
      candidateOutputContent: candidateOutput
    });

    const result = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'development'
    ]);

    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(result.stderr, '');

    const out = JSON.parse(result.stdout);
    assert.strictEqual(out.status, 'completed');
    assert.strictEqual(out.result.summary.allQualityGatesPassed, false);
    assert.strictEqual(out.result.summary.totalCases, 1);
    assert.strictEqual(out.result.summary.passedCases, 0);

    // Newline checks
    assert.match(result.stdout, /\n$/);
    assert.doesNotMatch(result.stdout, /\n\n$/);
  } finally {
    await cleanDir(tempDir);
  }
});

test('cli-process: usage error (exit code 2)', async () => {
  const result = await runEvaluateCliProcess([]);

  assert.strictEqual(result.exitCode, 2);
  assert.strictEqual(result.stdout, '');

  const err = JSON.parse(result.stderr);
  assert.strictEqual(err.status, 'error');
  assert.strictEqual(err.errorType, 'usage');
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_MISSING');
  assert.ok(err.message);

  // Stderr newline checks
  assert.match(result.stderr, /\n$/);
  assert.doesNotMatch(result.stderr, /\n\n$/);
});

test('cli-process: fixture infrastructure error (exit code 3)', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    // Manifest JSON invalid olan bir durum
    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-corrupt',
      outcome: 'rules_found',
      candidateOutputContent: {}
    });

    // manifest.json'ı boz
    const datasetDir = path.join(tempDir, 'v1', 'development', 'case-corrupt');
    await fs.writeFile(path.join(datasetDir, 'manifest.json'), '{ corrupt json ... }');

    const result = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'development'
    ]);

    assert.strictEqual(result.exitCode, 3);
    assert.strictEqual(result.stdout, '');

    const err = JSON.parse(result.stderr);
    assert.strictEqual(err.status, 'error');
    assert.strictEqual(err.errorType, 'fixture');
    assert.strictEqual(err.errorCode, 'FIXTURE_JSON_INVALID');

    // Güvenli mesaj ve path sızdırmazlık kontrolleri
    assert.ok(!result.stderr.includes(tempDir));
    assert.ok(!result.stderr.includes('Users'));
    assert.ok(!result.stderr.includes('private'));
    assert.ok(!result.stderr.includes('case-corrupt'));
  } finally {
    await cleanDir(tempDir);
  }
});

test('cli-process: dataset option development is correctly resolved', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    const candidateOutput = { status: 'success', candidates: [] };
    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-dev',
      outcome: 'no_rules',
      candidateOutputContent: candidateOutput
    });

    const result = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'development'
    ]);

    assert.strictEqual(result.exitCode, 0);
    const out = JSON.parse(result.stdout);
    assert.strictEqual(out.result.summary.totalCases, 1);
  } finally {
    await cleanDir(tempDir);
  }
});

test('cli-process: dataset = all evaluates development and robustness', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    const candidateOutput = { status: 'success', candidates: [] };
    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-dev',
      outcome: 'no_rules',
      candidateOutputContent: candidateOutput
    });

    const failureOutput = {
      status: 'corrupt',
      errorCode: 'OCR_FAILED',
      safeMessage: 'OCR reading failed.'
    };

    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'robustness',
      caseId: 'case-rob',
      outcome: 'corrupt',
      candidateOutputContent: failureOutput
    });

    const result = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'all'
    ]);

    assert.strictEqual(result.exitCode, 0);
    const out = JSON.parse(result.stdout);
    // development ve robustness bir arada taranmış olmalı (totalCases = 2)
    assert.strictEqual(out.result.summary.totalCases, 2);
  } finally {
    await cleanDir(tempDir);
  }
});

test('cli-process: execution is strictly deterministic and fixture files are read-only', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    const candidateOutput = { status: 'success', candidates: [] };
    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-dev',
      outcome: 'no_rules',
      candidateOutputContent: candidateOutput
    });

    const datasetDir = path.join(tempDir, 'v1', 'development', 'case-dev');
    const manifestPath = path.join(datasetDir, 'manifest.json');
    const expectedRulesPath = path.join(datasetDir, 'expected-rules.json');
    const candidateOutputPath = path.join(datasetDir, 'candidate-output.json');
    const inputPath = path.join(datasetDir, 'input.pdf');

    // Run 1 öncesi checksum'ları al
    const hashManifest1 = await calculateFileHash(manifestPath);
    const hashRules1 = await calculateFileHash(expectedRulesPath);
    const hashCandidates1 = await calculateFileHash(candidateOutputPath);
    const hashInput1 = await calculateFileHash(inputPath);

    const result1 = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'development'
    ]);

    // Run 2 öncesi checksum'ları al (değişmediğini teyit etmek için)
    const hashManifest2 = await calculateFileHash(manifestPath);
    const hashRules2 = await calculateFileHash(expectedRulesPath);
    const hashCandidates2 = await calculateFileHash(candidateOutputPath);
    const hashInput2 = await calculateFileHash(inputPath);

    assert.strictEqual(hashManifest1, hashManifest2);
    assert.strictEqual(hashRules1, hashRules2);
    assert.strictEqual(hashCandidates1, hashCandidates2);
    assert.strictEqual(hashInput1, hashInput2);

    const result2 = await runEvaluateCliProcess([
      '--root', tempDir,
      '--version', 'v1',
      '--dataset', 'development'
    ]);

    // Checksums post Run 2
    const hashManifest3 = await calculateFileHash(manifestPath);
    const hashRules3 = await calculateFileHash(expectedRulesPath);
    const hashCandidates3 = await calculateFileHash(candidateOutputPath);
    const hashInput3 = await calculateFileHash(inputPath);

    assert.strictEqual(hashManifest1, hashManifest3);
    assert.strictEqual(hashRules1, hashRules3);
    assert.strictEqual(hashCandidates1, hashCandidates3);
    assert.strictEqual(hashInput1, hashInput3);

    // Determinizm: stdout format ve exitCode birebir eşit olmalı
    assert.strictEqual(result1.exitCode, result2.exitCode);
    assert.strictEqual(result1.stdout, result2.stdout);
    assert.strictEqual(result1.stderr, result2.stderr);

    const out = JSON.parse(result1.stdout);
    assert.strictEqual(out.timestamp, undefined);
    assert.strictEqual(out.runId, undefined);
    assert.strictEqual(out.duration, undefined);
  } finally {
    await cleanDir(tempDir);
  }
});
