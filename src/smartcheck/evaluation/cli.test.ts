import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { runEvaluationCli, EvaluationCliIo, EvaluationCliDependencies, EvaluationCliUsageError } from './cli';
import { FixtureInfrastructureError } from './fixture-errors';
import {
  EvaluationError,
  EvaluationSuiteError,
  CandidateProvider,
  EvaluationSuiteResult,
  RuleCandidateEvaluationInput
} from './types';

// Helper: UUID içeren varsayılan candidate
const defaultCandidate: RuleCandidateEvaluationInput = {
  candidateId: 'cand-1',
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

// Helper: Geçici test dizini oluşturur (forbidden regex'le eşleşmeyen prefix)
async function createTempFixtureDir(): Promise<string> {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-cli-'));
  return await fs.realpath(p);
}

// Helper: Fixture dosyalarını yazar
async function writeFixture(options: {
  tempDir: string;
  version: string;
  dataset: string;
  caseId: string;
  outcome: string;
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
      expectedRuleCount: options.outcome === 'no_rules' || options.outcome === 'corrupt' ? 0 : 1
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

  const rules = options.outcome === 'no_rules' || options.outcome === 'corrupt' ? [] : [defaultRule];

  await fs.writeFile(path.join(datasetDir, 'manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(datasetDir, 'expected-rules.json'), JSON.stringify(rules));
  await fs.writeFile(path.join(datasetDir, 'input.pdf'), 'dummy pdf content');
  await fs.writeFile(path.join(datasetDir, 'candidate-output.json'), JSON.stringify({ status: 'success', candidates: [] }));
}

async function cleanDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

// Helper: Mock IO üretici
function createMockIo(cwd = '/mock-cwd'): any {
  let stdoutData = '';
  let stderrData = '';
  return {
    cwd,
    writeStdout(text) {
      stdoutData += text;
    },
    writeStderr(text) {
      stderrData += text;
    },
    get stdout() {
      return stdoutData;
    },
    get stderr() {
      return stderrData;
    }
  } as any;
}

// Helper: Default mock suite result üretici
function createMockSuiteResult(allQualityGatesPassed: boolean): EvaluationSuiteResult {
  return {
    summary: {
      totalCases: 1,
      passedCases: allQualityGatesPassed ? 1 : 0,
      failedCases: allQualityGatesPassed ? 0 : 1,
      passRate: allQualityGatesPassed ? 1.0 : 0.0,
      allQualityGatesPassed,
      ruleExtractionCases: 1,
      robustnessCases: 0,
      unexpectedProviderFailureCases: 0
    },
    cases: []
  };
}

// Helper: Mock dependencies üretici
function createMockDependencies(
  result: EvaluationSuiteResult | Error,
  providerOverride?: CandidateProvider
): EvaluationCliDependencies {
  return {
    createProvider() {
      return providerOverride || ({ evaluate: async () => ({ status: 'success', candidates: [] }) } as any);
    },
    async runSuite() {
      if (result instanceof Error) {
        throw result;
      }
      return result;
    }
  };
}

// === Argument Parser Testleri ===

test('cli: strict argument parser - valid arguments accepted', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 0);
  assert.strictEqual(io.stderr, '');
});

test('cli: strict argument parser - root missing', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorType, 'usage');
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_MISSING');
});

test('cli: strict argument parser - version missing', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_MISSING');
});

test('cli: strict argument parser - dataset missing', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_MISSING');
});

test('cli: strict argument parser - unknown option', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all', '--extra'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_UNKNOWN');
});

test('cli: strict argument parser - positional argument rejected', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all', 'positional'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_POSITIONAL_ARGUMENT_UNSUPPORTED');
});

test('cli: strict argument parser - duplicate options rejected', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  // duplicate root
  const res1 = await runEvaluationCli(['--root', './a', '--root', './b', '--version', 'v1', '--dataset', 'all'], io, deps);
  assert.strictEqual(res1.exitCode, 2);

  // duplicate version
  const res2 = await runEvaluationCli(['--root', './a', '--version', 'v1', '--version', 'v2', '--dataset', 'all'], io, deps);
  assert.strictEqual(res2.exitCode, 2);

  // duplicate dataset
  const res3 = await runEvaluationCli(['--root', './a', '--version', 'v1', '--dataset', 'all', '--dataset', 'development'], io, deps);
  assert.strictEqual(res3.exitCode, 2);
});

test('cli: strict argument parser - missing option values', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_VALUE_MISSING');
});

test('cli: strict argument parser - value replaces with option rejected', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', '--version', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_VALUE_MISSING');
});

test('cli: strict argument parser - empty or whitespace value rejected', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', '   ', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_VALUE_INVALID');
});

test('cli: strict argument parser - invalid dataset value rejected', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'invalid_ds'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_VALUE_INVALID');
});

test('cli: strict argument parser - equals sign options syntax rejected', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root=./fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_VALUE_INVALID');
});

test('cli: strict argument parser - input argv array not mutated', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];
  const argvCopy = [...argv];

  await runEvaluationCli(argv, io, deps);
  assert.deepStrictEqual(argv, argvCopy);
});


// === Successful Execution Testleri ===

test('cli: successful execution - all quality gates passed exits 0', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 0);
  assert.strictEqual(io.stderr, '');
  assert.ok(io.stdout.includes('"status": "completed"'));
});

test('cli: successful execution - any quality gate failure exits 1', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(false));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 1);
  assert.strictEqual(io.stderr, '');
  assert.ok(io.stdout.includes('"status": "completed"'));
});

test('cli: successful execution - stdout exact single call & newline check', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  await runEvaluationCli(argv, io, deps);
  assert.ok(io.stdout.endsWith('\n'));
  // Sonda tek bir newline olduğunu doğrulamak için double newline olmadığını kontrol edelim
  assert.ok(!io.stdout.endsWith('\n\n'));
});

test('cli: successful execution - stdout contains no dynamic transient metadata', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  await runEvaluationCli(argv, io, deps);
  const out = JSON.parse(io.stdout);
  assert.strictEqual(out.timestamp, undefined);
  assert.strictEqual(out.runId, undefined);
  assert.strictEqual(out.duration, undefined);
});


// === Concrete Composition Testleri (Default Dependencies) ===

test('cli: concrete composition - discover development fixture and complete successfully', async () => {
  const tempDir = await createTempFixtureDir();
  try {
    await writeFixture({
      tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-1',
      outcome: 'rules_found'
    });

    const io = createMockIo(tempDir);
    // Relative path resolve edilebilmeli
    const argv = ['--root', '.', '--version', 'v1', '--dataset', 'development'];

    const exec = await runEvaluationCli(argv, io);
    // Provider evaluate default mockup mock-fixture files okumayı dener.
    // Default defaultDependencies mock folder real candidate-output.json kullanır.
    // candidate-output.json boş '{}' olduğundan valid candidate 0, expected count 1 -> recall 0 -> QG fail exits 1.
    assert.strictEqual(exec.exitCode, 1);
    assert.strictEqual(io.stderr, '');
  } finally {
    await cleanDir(tempDir);
  }
});


// === Error Mapping Testleri ===

test('cli: error mapping - usage error mapping exits 2', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(new EvaluationCliUsageError('CLI_ARGUMENT_MISSING', 'err'));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 2);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.status, 'error');
  assert.strictEqual(err.errorType, 'usage');
  assert.strictEqual(err.errorCode, 'CLI_ARGUMENT_MISSING');
  assert.strictEqual(err.message, 'Required CLI argument is missing.');
});

test('cli: error mapping - fixture error mapping exits 3', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(new FixtureInfrastructureError('FIXTURE_NOT_FOUND', 'err'));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 3);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorType, 'fixture');
  assert.strictEqual(err.errorCode, 'FIXTURE_NOT_FOUND');
  assert.strictEqual(err.message, 'Evaluation fixture was not found.');
});

test('cli: error mapping - evaluator error mapping exits 4', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(new EvaluationError('EVALUATION_DUPLICATE_CANDIDATE_ID', 'err'));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 4);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorType, 'evaluation');
  assert.strictEqual(err.errorCode, 'EVALUATION_DUPLICATE_CANDIDATE_ID');
  assert.strictEqual(err.message, 'Candidate provider returned duplicate candidate identifiers.');
});

test('cli: error mapping - suite error mapping exits 5', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(new EvaluationSuiteError('EVALUATION_SUITE_EMPTY', 'err'));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 5);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorType, 'suite');
  assert.strictEqual(err.errorCode, 'EVALUATION_SUITE_EMPTY');
  assert.strictEqual(err.message, 'No evaluation fixtures were discovered.');
});

test('cli: error mapping - unknown exception mapping exits 10', async () => {
  const io = createMockIo();
  const deps = createMockDependencies(new Error('CRITICAL_FATAL'));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 10);
  const err = JSON.parse(io.stderr);
  assert.strictEqual(err.errorType, 'internal');
  assert.strictEqual(err.errorCode, 'CLI_INTERNAL_ERROR');
  assert.strictEqual(err.message, 'An unexpected internal error occurred.');
  assert.strictEqual(err.stack, undefined);
  assert.strictEqual(err.cause, undefined);
});

test('cli: error mapping - plain object exception code mapping rejected as internal', async () => {
  const io = createMockIo();
  // plain object code throw edilirse unknown internal error sayılmalıdır
  const deps = {
    createProvider() { return {} as any; },
    async runSuite() {
      throw { code: 'FIXTURE_PATH_INVALID' };
    }
  };
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  const exec = await runEvaluationCli(argv, io, deps);
  assert.strictEqual(exec.exitCode, 10);
});


// === IO ve Determinizm ===

test('cli: IO and determinism - writeStdout exception propagates', async () => {
  const io: EvaluationCliIo = {
    cwd: '/mock-cwd',
    writeStdout() {
      throw new Error('STDOUT_WRITE_FAILED');
    },
    writeStderr() {}
  };
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  await assert.rejects(
    runEvaluationCli(argv, io, deps),
    /STDOUT_WRITE_FAILED/
  );
});

test('cli: IO and determinism - writeStderr exception propagates', async () => {
  const io: EvaluationCliIo = {
    cwd: '/mock-cwd',
    writeStdout() {},
    writeStderr() {
      throw new Error('STDERR_WRITE_FAILED');
    }
  };
  const deps = createMockDependencies(new Error('FATAL'));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  await assert.rejects(
    runEvaluationCli(argv, io, deps),
    /STDERR_WRITE_FAILED/
  );
});

test('cli: IO and determinism - io and options objects are not mutated', async () => {
  const io = createMockIo();
  const originalCwd = io.cwd;
  const originalWriteStdout = io.writeStdout;
  const originalWriteStderr = io.writeStderr;
  const deps = createMockDependencies(createMockSuiteResult(true));
  const argv = ['--root', './fixtures', '--version', 'v1', '--dataset', 'all'];

  await runEvaluationCli(argv, io, deps);

  assert.strictEqual(io.cwd, originalCwd);
  assert.strictEqual(io.writeStdout, originalWriteStdout);
  assert.strictEqual(io.writeStderr, originalWriteStderr);
});
