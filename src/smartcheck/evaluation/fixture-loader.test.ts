import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { loadEvaluationFixture, discoverEvaluationFixtures, FixtureLocator } from './fixture-loader';
import { FixtureInfrastructureError } from './fixture-errors';
import { ExpectedRule } from './types';

// Yardımcı: Geçici dizin oluşturucu ve temizleyici
async function withTempDir(fn: (tempDir: string) => Promise<void>) {
  const tempRootDir = await fs.realpath(os.tmpdir());
  const tempDir = await fs.mkdtemp(path.join(tempRootDir, 'smartcheck-test-'));
  try {
    await fn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// Varsayılan geçerli manifest ve expected rules şablonları
const defaultManifest = {
  schemaVersion: 1,
  caseId: 'case-001',
  dataset: 'development',
  input: {
    file: 'input.pdf',
    mimeType: 'application/pdf',
    language: ['tr']
  },
  expectation: {
    outcome: 'rules_found',
    expectedRuleCount: 1
  },
  tags: ['test']
};

const defaultExpectedRules: ExpectedRule[] = [
  {
    id: 'rule-1',
    title: 'Rule 1',
    canonicalStatement: 'Check 1',
    discipline: 'Structure',
    objectType: 'column',
    parameter: 'size',
    operator: 'equals',
    expectedValue: '30x50',
    errorCategory: 'modeling_standard',
    severity: 'medium',
    scopeType: 'company',
    competencyArea: 'Area',
    sourceEvidence: [
      {
        sourceType: 'pdf',
        documentId: '11111111-1111-4111-8111-111111111111',
        pageNumber: 2,
        sourceText: 'evidence text',
        extractionConfidence: 0.9
      }
    ]
  }
];

// Helper: Fixture yapısını diske yazar
async function writeFixtureFiles(
  baseDir: string,
  version: string,
  dataset: string,
  caseId: string,
  manifest: any,
  expectedRules: any[],
  inputFileName = 'input.pdf',
  candidateOutput: any = { status: 'success', candidates: [] }
) {
  const caseDir = path.join(baseDir, version, dataset, caseId);
  await fs.mkdir(caseDir, { recursive: true });

  await fs.writeFile(path.join(caseDir, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  await fs.writeFile(path.join(caseDir, 'expected-rules.json'), JSON.stringify(expectedRules), 'utf8');
  await fs.writeFile(path.join(caseDir, 'candidate-output.json'), JSON.stringify(candidateOutput), 'utf8');

  // Input dosyası dummy olarak yazılır
  if (inputFileName && !inputFileName.includes('..') && !path.isAbsolute(inputFileName)) {
    const inputPath = path.join(caseDir, inputFileName);
    await fs.mkdir(path.dirname(inputPath), { recursive: true });
    await fs.writeFile(inputPath, 'dummy data', 'utf8');
  }
}

test('loader: load valid development fixture', async () => {
  await withTempDir(async (tempDir) => {
    const locator: FixtureLocator = {
      rootDir: tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-001'
    };

    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', defaultManifest, defaultExpectedRules);

    const fixture = await loadEvaluationFixture(locator);
    assert.strictEqual(fixture.manifest.caseId, 'case-001');
    assert.strictEqual(fixture.expectedRules.length, 1);
    assert.strictEqual(fixture.expectedRules[0].id, 'rule-1');
  });
});

test('loader: load valid no_rules fixture', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      expectation: { outcome: 'no_rules', expectedRuleCount: 0 }
    };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, []);

    const fixture = await loadEvaluationFixture({
      rootDir: tempDir,
      version: 'v1',
      dataset: 'development',
      caseId: 'case-001'
    });
    assert.strictEqual(fixture.expectedRules.length, 0);
    assert.strictEqual(fixture.manifest.expectation.outcome, 'no_rules');
  });
});

test('loader: load valid robustness fixture', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      dataset: 'robustness',
      expectation: { outcome: 'corrupt', expectedRuleCount: 0 }
    };
    await writeFixtureFiles(tempDir, 'v1', 'robustness', 'case-001', manifest, []);

    const fixture = await loadEvaluationFixture({
      rootDir: tempDir,
      version: 'v1',
      dataset: 'robustness',
      caseId: 'case-001'
    });
    assert.strictEqual(fixture.manifest.dataset, 'robustness');
    assert.strictEqual(fixture.manifest.expectation.outcome, 'corrupt');
  });
});

test('loader: corrupt manifest JSON rejection', async () => {
  await withTempDir(async (tempDir) => {
    const caseDir = path.join(tempDir, 'v1', 'development', 'case-001');
    await fs.mkdir(caseDir, { recursive: true });
    await fs.writeFile(path.join(caseDir, 'manifest.json'), '{ bad json', 'utf8');
    await fs.writeFile(path.join(caseDir, 'expected-rules.json'), '[]', 'utf8');

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_JSON_INVALID'
    );
  });
});

test('loader: invalid manifest schema rejection', async () => {
  await withTempDir(async (tempDir) => {
    const badManifest = { ...defaultManifest, schemaVersion: 999 }; // Invalid version
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', badManifest, defaultExpectedRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_SCHEMA_INVALID'
    );
  });
});

test('loader: invalid expected rules schema rejection', async () => {
  await withTempDir(async (tempDir) => {
    const badRules = [{ id: 'rule-1' }]; // Missing required properties (e.g. title)
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', defaultManifest, badRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_SCHEMA_INVALID'
    );
  });
});

test('loader: dataset folder and manifest mismatch rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = { ...defaultManifest, dataset: 'blind-evaluation' }; // Path is development
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, defaultExpectedRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_DATASET_MISMATCH'
    );
  });
});

test('loader: case folder and manifest caseId mismatch rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = { ...defaultManifest, caseId: 'different-case' }; // Path is case-001
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, defaultExpectedRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_CASE_ID_MISMATCH'
    );
  });
});

test('loader: expectedRuleCount mismatch rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      expectation: { outcome: 'rules_found', expectedRuleCount: 99 } // expectedRules has length 1
    };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, defaultExpectedRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_EXPECTED_COUNT_MISMATCH'
    );
  });
});

test('loader: rules_found with count 0 rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      expectation: { outcome: 'rules_found', expectedRuleCount: 0 }
    };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, []);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_EXPECTED_COUNT_MISMATCH'
    );
  });
});

test('loader: no_rules with count >0 rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      expectation: { outcome: 'no_rules', expectedRuleCount: 1 }
    };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, defaultExpectedRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_EXPECTED_COUNT_MISMATCH'
    );
  });
});

test('loader: robustness outcome with count >0 rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      dataset: 'robustness',
      expectation: { outcome: 'corrupt', expectedRuleCount: 1 }
    };
    await writeFixtureFiles(tempDir, 'v1', 'robustness', 'case-001', manifest, defaultExpectedRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'robustness', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_EXPECTED_COUNT_MISMATCH'
    );
  });
});

test('loader: missing input file rejection', async () => {
  await withTempDir(async (tempDir) => {
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', defaultManifest, defaultExpectedRules, 'input.pdf');
    // Input dosyasını silelim
    const inputPath = path.join(tempDir, 'v1', 'development', 'case-001', 'input.pdf');
    await fs.unlink(inputPath);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_NOT_FOUND'
    );
  });
});

test('loader: absolute input path rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      input: { ...defaultManifest.input, file: '/absolute/input.pdf' }
    };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, defaultExpectedRules, '');

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PATH_INVALID'
    );
  });
});

test('loader: path traversal input path rejection', async () => {
  await withTempDir(async (tempDir) => {
    const manifest = {
      ...defaultManifest,
      input: { ...defaultManifest.input, file: '../input.pdf' }
    };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, defaultExpectedRules, '');

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_PATH_INVALID'
    );
  });
});

test('loader: case directory symlink rejection', async () => {
  await withTempDir(async (tempDir) => {
    // Windows/Unix symlink hatası ihtimali için try-catch
    try {
      const realCaseDir = path.join(tempDir, 'real-case');
      await fs.mkdir(realCaseDir, { recursive: true });
      await writeFixtureFiles(tempDir, 'v1', 'development', 'real-case', defaultManifest, defaultExpectedRules);

      const symlinkCaseDir = path.join(tempDir, 'v1', 'development', 'case-symlink');
      await fs.mkdir(path.dirname(symlinkCaseDir), { recursive: true });
      await fs.symlink(path.join(tempDir, 'v1', 'development', 'real-case'), symlinkCaseDir, 'dir');

      await assert.rejects(
        loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-symlink' }),
        (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_SYMLINK_REJECTED'
      );
    } catch (err: any) {
      // Symlink yetki veya OS hatası verirse skip edilir
      if (err.code === 'EPERM') return;
      throw err;
    }
  });
});

test('loader: manifest symlink rejection', async () => {
  await withTempDir(async (tempDir) => {
    try {
      const caseDir = path.join(tempDir, 'v1', 'development', 'case-001');
      await fs.mkdir(caseDir, { recursive: true });

      const realManifestPath = path.join(tempDir, 'real-manifest.json');
      await fs.writeFile(realManifestPath, JSON.stringify(defaultManifest), 'utf8');

      await fs.symlink(realManifestPath, path.join(caseDir, 'manifest.json'));
      await fs.writeFile(path.join(caseDir, 'expected-rules.json'), JSON.stringify(defaultExpectedRules), 'utf8');
      await fs.writeFile(path.join(caseDir, 'candidate-output.json'), '{}', 'utf8');
      await fs.writeFile(path.join(caseDir, 'input.pdf'), 'dummy', 'utf8');

      await assert.rejects(
        loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
        (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_SYMLINK_REJECTED'
      );
    } catch (err: any) {
      if (err.code === 'EPERM') return;
      throw err;
    }
  });
});

test('loader: input symlink rejection', async () => {
  await withTempDir(async (tempDir) => {
    try {
      const caseDir = path.join(tempDir, 'v1', 'development', 'case-001');
      await fs.mkdir(caseDir, { recursive: true });

      await fs.writeFile(path.join(caseDir, 'manifest.json'), JSON.stringify(defaultManifest), 'utf8');
      await fs.writeFile(path.join(caseDir, 'expected-rules.json'), JSON.stringify(defaultExpectedRules), 'utf8');
      await fs.writeFile(path.join(caseDir, 'candidate-output.json'), '{}', 'utf8');

      const realInputPath = path.join(tempDir, 'real-input.pdf');
      await fs.writeFile(realInputPath, 'dummy data', 'utf8');

      await fs.symlink(realInputPath, path.join(caseDir, 'input.pdf'));

      await assert.rejects(
        loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
        (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_SYMLINK_REJECTED'
      );
    } catch (err: any) {
      if (err.code === 'EPERM') return;
      throw err;
    }
  });
});

test('loader: duplicate expected rule ID rejection', async () => {
  await withTempDir(async (tempDir) => {
    const dupRules = [
      defaultExpectedRules[0],
      { ...defaultExpectedRules[0], title: 'Another title' } // Same ID 'rule-1'
    ];
    const manifest = { ...defaultManifest, expectation: { outcome: 'rules_found', expectedRuleCount: 2 } };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, dupRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_DUPLICATE_EXPECTED_ID'
    );
  });
});

test('loader: duplicate expected fingerprint rejection', async () => {
  await withTempDir(async (tempDir) => {
    const dupRules = [
      defaultExpectedRules[0],
      { ...defaultExpectedRules[0], id: 'rule-2' } // Same fingerprint payload, different ID
    ];
    const manifest = { ...defaultManifest, expectation: { outcome: 'rules_found', expectedRuleCount: 2 } };
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', manifest, dupRules);

    await assert.rejects(
      loadEvaluationFixture({ rootDir: tempDir, version: 'v1', dataset: 'development', caseId: 'case-001' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_DUPLICATE_EXPECTED_FINGERPRINT'
    );
  });
});

test('loader: discovery ordering is deterministic and datasets cross-case ID duplicate is rejected', async () => {
  await withTempDir(async (tempDir) => {
    // 1. İki farklı dataset altındaki case'leri oluştur (case-001 development, case-002 robustness)
    await writeFixtureFiles(tempDir, 'v1', 'development', 'case-001', defaultManifest, defaultExpectedRules);

    const manifest2 = { ...defaultManifest, caseId: 'case-002', dataset: 'robustness' };
    await writeFixtureFiles(tempDir, 'v1', 'robustness', 'case-002', manifest2, defaultExpectedRules);

    const discovered = await discoverEvaluationFixtures({
      rootDir: tempDir,
      version: 'v1',
      dataset: 'all'
    });

    assert.strictEqual(discovered.length, 2);
    // Sıralama: development artan -> robustness artan
    assert.strictEqual(discovered[0].manifest.dataset, 'development');
    assert.strictEqual(discovered[0].manifest.caseId, 'case-001');
    assert.strictEqual(discovered[1].manifest.dataset, 'robustness');
    assert.strictEqual(discovered[1].manifest.caseId, 'case-002');

    // 2. Duplicate case ID'nin (farklı dataset altında aynı caseId) reddedildiğini doğrula
    const manifestDup = { ...defaultManifest, caseId: 'case-001', dataset: 'robustness' };
    await writeFixtureFiles(tempDir, 'v1', 'robustness', 'case-001', manifestDup, defaultExpectedRules);

    await assert.rejects(
      discoverEvaluationFixtures({ rootDir: tempDir, version: 'v1', dataset: 'all' }),
      (err: any) => err instanceof FixtureInfrastructureError && err.code === 'FIXTURE_DUPLICATE_CASE_ID'
    );
  });
});
