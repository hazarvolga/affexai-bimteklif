import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'os';
import { FixtureCandidateProvider } from './fixture-candidate-provider';
import { FixtureInfrastructureError } from './fixture-errors';
import { EvaluationFixture } from './types';

// Yardımcı: Geçici dizin oluşturucu ve temizleyici
async function withTempDir(fn: (tempDir: string) => Promise<void>) {
  const tempRootDir = await fs.realpath(os.tmpdir());
  const tempDir = await fs.mkdtemp(path.join(tempRootDir, 'smartcheck-provider-test-'));
  try {
    await fn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// Mock EvaluationFixture oluşturucu
function createMockFixture(caseDirectory: string, candidateOutputPath: string): EvaluationFixture {
  return {
    manifest: {} as any,
    expectedRules: [],
    fixtureRoot: '',
    caseDirectory,
    manifestPath: '',
    inputPath: '',
    expectedRulesPath: '',
    candidateOutputPath
  };
}

test('provider: read valid success envelope', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'success-case');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    const mockOutput = {
      status: 'success',
      candidates: [
        { candidateId: 'cand-1', title: 'Rule 1' },
        { candidateId: 'cand-2', title: 'Rule 2' }
      ]
    };
    await fs.writeFile(outputPath, JSON.stringify(mockOutput), 'utf8');

    const provider = new FixtureCandidateProvider();
    const result = await provider.evaluate(createMockFixture(caseDir, outputPath));

    assert.strictEqual(result.status, 'success');
    assert.strictEqual((result as any).candidates.length, 2);
    assert.strictEqual((result as any).candidates[0].candidateId, 'cand-1');
  });
});

test('provider: read valid failure envelopes', async () => {
  await withTempDir(async (tempDir) => {
    const provider = new FixtureCandidateProvider();

    // Unsupported
    const unsuppDir = path.join(tempDir, 'unsupported');
    await fs.mkdir(unsuppDir, { recursive: true });
    const unsuppPath = path.join(unsuppDir, 'candidate-output.json');
    await fs.writeFile(unsuppPath, JSON.stringify({ status: 'unsupported', errorCode: 'FORMAT_UNSUPPORTED' }), 'utf8');
    const result1 = await provider.evaluate(createMockFixture(unsuppDir, unsuppPath));
    assert.strictEqual(result1.status, 'unsupported');
    assert.strictEqual((result1 as any).errorCode, 'FORMAT_UNSUPPORTED');

    // Corrupt
    const corruptDir = path.join(tempDir, 'corrupt');
    await fs.mkdir(corruptDir, { recursive: true });
    const corruptPath = path.join(corruptDir, 'candidate-output.json');
    await fs.writeFile(corruptPath, JSON.stringify({ status: 'corrupt', errorCode: 'PDF_CORRUPT' }), 'utf8');
    const result2 = await provider.evaluate(createMockFixture(corruptDir, corruptPath));
    assert.strictEqual(result2.status, 'corrupt');

    // Password Protected
    const pwdDir = path.join(tempDir, 'password-protected');
    await fs.mkdir(pwdDir, { recursive: true });
    const pwdPath = path.join(pwdDir, 'candidate-output.json');
    await fs.writeFile(pwdPath, JSON.stringify({ status: 'password_protected', errorCode: 'PDF_PASSWORD_REQUIRED' }), 'utf8');
    const result3 = await provider.evaluate(createMockFixture(pwdDir, pwdPath));
    assert.strictEqual(result3.status, 'password_protected');

    // Parse Failure
    const parseDir = path.join(tempDir, 'parse-failure');
    await fs.mkdir(parseDir, { recursive: true });
    const parsePath = path.join(parseDir, 'candidate-output.json');
    await fs.writeFile(parsePath, JSON.stringify({ status: 'parse_failure', errorCode: 'PARSER_FAILED' }), 'utf8');
    const result4 = await provider.evaluate(createMockFixture(parseDir, parsePath));
    assert.strictEqual(result4.status, 'parse_failure');
  });
});

test('provider: unknown status rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'unknown-case');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    await fs.writeFile(outputPath, JSON.stringify({ status: 'unknown_status' }), 'utf8');

    const provider = new FixtureCandidateProvider();
    await assert.rejects(
      provider.evaluate(createMockFixture(caseDir, outputPath)),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PROVIDER_RESULT_INVALID'
    );
  });
});

test('provider: corrupt JSON rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'corrupt-json-case');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    await fs.writeFile(outputPath, '{ bad json', 'utf8');

    const provider = new FixtureCandidateProvider();
    await assert.rejects(
      provider.evaluate(createMockFixture(caseDir, outputPath)),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_JSON_INVALID'
    );
  });
});

test('provider: candidates not array rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'not-array-case');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    await fs.writeFile(outputPath, JSON.stringify({ status: 'success', candidates: {} }), 'utf8');

    const provider = new FixtureCandidateProvider();
    await assert.rejects(
      provider.evaluate(createMockFixture(caseDir, outputPath)),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PROVIDER_RESULT_INVALID'
    );
  });
});

test('provider: duplicate string candidate ID rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'duplicate-id-case');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    const mockOutput = {
      status: 'success',
      candidates: [
        { candidateId: 'cand-1', title: 'Rule 1' },
        { candidateId: 'cand-1', title: 'Duplicate Rule' }
      ]
    };
    await fs.writeFile(outputPath, JSON.stringify(mockOutput), 'utf8');

    const provider = new FixtureCandidateProvider();
    await assert.rejects(
      provider.evaluate(createMockFixture(caseDir, outputPath)),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_DUPLICATE_CANDIDATE_ID'
    );
  });
});

test('provider: invalid or missing candidate ID is preserved without filtering', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'preserve-case');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    const mockOutput = {
      status: 'success',
      candidates: [
        { title: 'Missing candidateId' },
        { candidateId: 12345, title: 'Number candidateId' }
      ]
    };
    await fs.writeFile(outputPath, JSON.stringify(mockOutput), 'utf8');

    const provider = new FixtureCandidateProvider();
    const result = await provider.evaluate(createMockFixture(caseDir, outputPath));

    assert.strictEqual(result.status, 'success');
    assert.strictEqual((result as any).candidates.length, 2);
  });
});

// Güvenlik & Bypass Testleri
test('provider: missing caseDirectory rejection', async () => {
  const provider = new FixtureCandidateProvider();
  await assert.rejects(
    provider.evaluate({
      manifest: {} as any,
      expectedRules: [],
      fixtureRoot: '',
      caseDirectory: '',
      manifestPath: '',
      inputPath: '',
      expectedRulesPath: '',
      candidateOutputPath: '/some/path/candidate-output.json'
    }),
    (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PATH_INVALID'
  );
});

test('provider: candidateOutputPath outside caseDirectory rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'case-dir');
    await fs.mkdir(caseDir, { recursive: true });

    const outsidePath = path.join(tempDir, 'candidate-output.json');
    await fs.writeFile(outsidePath, JSON.stringify({ status: 'success', candidates: [] }), 'utf8');

    const provider = new FixtureCandidateProvider();
    await assert.rejects(
      provider.evaluate(createMockFixture(caseDir, outsidePath)),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PATH_INVALID'
    );
  });
});

test('provider: invalid basename rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'case-dir');
    await fs.mkdir(caseDir, { recursive: true });

    const badPath = path.join(caseDir, 'unsupported.json');
    await fs.writeFile(badPath, JSON.stringify({ status: 'success', candidates: [] }), 'utf8');

    const provider = new FixtureCandidateProvider();
    await assert.rejects(
      provider.evaluate(createMockFixture(caseDir, badPath)),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PATH_INVALID'
    );
  });
});

test('provider: correct failure envelope is accepted', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'case-dir');
    await fs.mkdir(caseDir, { recursive: true });
    const outputPath = path.join(caseDir, 'candidate-output.json');
    await fs.writeFile(outputPath, JSON.stringify({ status: 'unsupported' }), 'utf8');

    const provider = new FixtureCandidateProvider();
    const result = await provider.evaluate(createMockFixture(caseDir, outputPath));
    assert.strictEqual(result.status, 'unsupported');
  });
});
