import * as fs from 'fs/promises';
import * as path from 'path';
import {
  EvaluationFixture,
  EvaluationManifest,
  EvaluationManifestSchema,
  ExpectedRule,
  ExpectedRuleSchema,
  DatasetType
} from './types';
import { FixtureInfrastructureError } from './fixture-errors';
import { createFingerprint } from './matcher';

export interface FixtureLocator {
  rootDir: string;
  version: string;
  dataset: DatasetType;
  caseId: string;
}

const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isPathInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export function isPathInsideOrEqual(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

/**
  * Bir yolun sembolik bağ (symlink) olup olmadığını lstat ile kontrol eder.
  */
async function checkSymlink(targetPath: string): Promise<void> {
  try {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) {
      throw new FixtureInfrastructureError(
        'FIXTURE_SYMLINK_REJECTED',
        `Symlinks are rejected for evaluation fixtures: ${targetPath}`
      );
    }
  } catch (err) {
    if (err instanceof FixtureInfrastructureError) {
      throw err;
    }
  }
}

/**
 * Tek bir Evaluation Fixture yükler.
 */
export async function loadEvaluationFixture(
  locator: FixtureLocator
): Promise<EvaluationFixture> {
  const { rootDir, version, dataset, caseId } = locator;

  // Segment doğrulamaları (Açık ve güvenli segment desen kontrolü)
  if (!SAFE_SEGMENT_PATTERN.test(version) || version === '.' || version === '..') {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Invalid version segment: ${version}`
    );
  }

  if (dataset !== 'development' && dataset !== 'blind-evaluation' && dataset !== 'robustness') {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Invalid dataset segment: ${dataset}`
    );
  }

  if (!SAFE_SEGMENT_PATTERN.test(caseId) || caseId === '.' || caseId === '..') {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Invalid caseId segment: ${caseId}`
    );
  }

  // Güvenilir root directory realpath ile canonical hale getirilir
  let canonicalRoot: string;
  try {
    canonicalRoot = await fs.realpath(rootDir);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Root directory not found: ${rootDir}`,
      err
    );
  }

  // Ara dizin yolları oluşturulur
  const versionDir = path.resolve(canonicalRoot, version);
  const datasetDir = path.resolve(versionDir, dataset);
  const caseDir = path.resolve(datasetDir, caseId);

  // Ara dizinlerin symlink olup olmadığı kontrol edilir (Ara dizin symlink kaçışı engeli)
  await checkSymlink(versionDir);
  await checkSymlink(datasetDir);
  await checkSymlink(caseDir);

  // Klasörün gerçekten var olup olmadığını ve directory olup olmadığını kontrol et
  let caseDirStat;
  try {
    caseDirStat = await fs.stat(caseDir);
    if (!caseDirStat.isDirectory()) {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        `Case path is not a directory: ${caseDir}`
      );
    }
  } catch (err) {
    if (err instanceof FixtureInfrastructureError) throw err;
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Case directory not found: ${caseDir}`,
      err
    );
  }

  // Case directory canonical hale getirilip root içinde kalıp kalmadığı doğrulanır
  let canonicalCaseDir: string;
  try {
    canonicalCaseDir = await fs.realpath(caseDir);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Could not resolve case realpath: ${caseDir}`,
      err
    );
  }

  if (!isPathInside(canonicalRoot, canonicalCaseDir)) {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Case directory escapes root containment: ${canonicalCaseDir}`
    );
  }

  const manifestPath = path.resolve(caseDir, 'manifest.json');
  const expectedRulesPath = path.resolve(caseDir, 'expected-rules.json');
  const candidateOutputPath = path.resolve(caseDir, 'candidate-output.json');

  // Dosyaların symlink olup olmadığını kontrol et
  await checkSymlink(manifestPath);
  await checkSymlink(expectedRulesPath);
  await checkSymlink(candidateOutputPath);

  // Dosyaların varlığını kontrol et
  try {
    await fs.access(manifestPath);
  } catch {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Manifest file not found: ${manifestPath}`
    );
  }

  try {
    await fs.access(expectedRulesPath);
  } catch {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Expected rules file not found: ${expectedRulesPath}`
    );
  }

  // Manifest canonical realpath containment kontrolü
  let canonicalManifestPath: string;
  try {
    canonicalManifestPath = await fs.realpath(manifestPath);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Could not resolve manifest realpath: ${manifestPath}`,
      err
    );
  }

  if (!isPathInsideOrEqual(canonicalCaseDir, canonicalManifestPath)) {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Manifest escapes case directory containment: ${canonicalManifestPath}`
    );
  }

  // Expected rules canonical realpath containment kontrolü
  let canonicalExpectedRulesPath: string;
  try {
    canonicalExpectedRulesPath = await fs.realpath(expectedRulesPath);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Could not resolve expected rules realpath: ${expectedRulesPath}`,
      err
    );
  }

  if (!isPathInsideOrEqual(canonicalCaseDir, canonicalExpectedRulesPath)) {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Expected rules escapes case directory containment: ${canonicalExpectedRulesPath}`
    );
  }

  // Manifest oku ve doğrula
  let manifestRaw: string;
  try {
    manifestRaw = await fs.readFile(manifestPath, 'utf8');
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_JSON_INVALID',
      `Manifest file could not be read: ${manifestPath}`,
      err
    );
  }

  let manifestParsed: unknown;
  try {
    manifestParsed = JSON.parse(manifestRaw);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_JSON_INVALID',
      `Manifest JSON parsing failed: ${manifestPath}`,
      err
    );
  }

  const manifestResult = EvaluationManifestSchema.safeParse(manifestParsed);
  if (!manifestResult.success) {
    throw new FixtureInfrastructureError(
      'FIXTURE_SCHEMA_INVALID',
      `Manifest schema is invalid: ${manifestPath}`,
      manifestResult.error
    );
  }
  const manifest = manifestResult.data;

  // Manifest cross-validation'ları
  if (manifest.dataset !== dataset) {
    throw new FixtureInfrastructureError(
      'FIXTURE_DATASET_MISMATCH',
      `Dataset in manifest (${manifest.dataset}) does not match path dataset (${dataset})`
    );
  }

  if (manifest.caseId !== caseId) {
    throw new FixtureInfrastructureError(
      'FIXTURE_CASE_ID_MISMATCH',
      `Case ID in manifest (${manifest.caseId}) does not match path caseId (${caseId})`
    );
  }

  // Input file traversal ve güvenlik kontrolü
  const inputFileName = manifest.input.file;
  const inputSegments = inputFileName.split(/[\/\\]/);
  for (const seg of inputSegments) {
    if (!SAFE_SEGMENT_PATTERN.test(seg) || seg === '.' || seg === '..') {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        `Invalid input file path segment: ${seg}`
      );
    }
  }

  const inputPath = path.resolve(caseDir, inputFileName);

  // Giriş dosyası symlink mi ve mevcut mu?
  await checkSymlink(inputPath);

  // Canonical caseDir ve inputPath containment doğrulaması
  let canonicalInputPath: string;
  try {
    canonicalInputPath = await fs.realpath(inputPath);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Input file not found: ${inputPath}`,
      err
    );
  }

  if (!isPathInsideOrEqual(canonicalCaseDir, canonicalInputPath)) {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Input path escapes case directory boundary: ${canonicalInputPath}`
    );
  }

  // candidate-output.json realpath ve containment doğrulaması
  let canonicalCandidateOutputPath: string;
  try {
    canonicalCandidateOutputPath = await fs.realpath(candidateOutputPath);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Candidate output file not found: ${candidateOutputPath}`,
      err
    );
  }

  if (!isPathInsideOrEqual(canonicalCaseDir, canonicalCandidateOutputPath)) {
    throw new FixtureInfrastructureError(
      'FIXTURE_PATH_INVALID',
      `Candidate output path escapes case directory boundary: ${canonicalCandidateOutputPath}`
    );
  }

  let inputStat;
  try {
    inputStat = await fs.stat(canonicalInputPath);
    if (inputStat.isDirectory()) {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        `Input path is a directory, expected a file: ${inputPath}`
      );
    }
  } catch (err) {
    if (err instanceof FixtureInfrastructureError) throw err;
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Input file not found: ${inputPath}`,
      err
    );
  }

  // Expected Rules oku ve doğrula
  let expectedRaw: string;
  try {
    expectedRaw = await fs.readFile(expectedRulesPath, 'utf8');
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_JSON_INVALID',
      `Expected rules JSON could not be read: ${expectedRulesPath}`,
      err
    );
  }

  let expectedParsed: unknown;
  try {
    expectedParsed = JSON.parse(expectedRaw);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_JSON_INVALID',
      `Expected rules JSON parsing failed: ${expectedRulesPath}`,
      err
    );
  }

  if (!Array.isArray(expectedParsed)) {
    throw new FixtureInfrastructureError(
      'FIXTURE_SCHEMA_INVALID',
      `Expected rules must be an array: ${expectedRulesPath}`
    );
  }

  const expectedRules: ExpectedRule[] = [];
  for (let i = 0; i < expectedParsed.length; i++) {
    const item = expectedParsed[i];
    const ruleResult = ExpectedRuleSchema.safeParse(item);
    if (!ruleResult.success) {
      throw new FixtureInfrastructureError(
        'FIXTURE_SCHEMA_INVALID',
        `Expected rule at index ${i} is invalid: ${expectedRulesPath}`,
        ruleResult.error
      );
    }
    expectedRules.push(ruleResult.data);
  }

  // Expected rule count eşleşme doğrulaması
  if (manifest.expectation.expectedRuleCount !== expectedRules.length) {
    throw new FixtureInfrastructureError(
      'FIXTURE_EXPECTED_COUNT_MISMATCH',
      `Manifest expectedRuleCount (${manifest.expectation.expectedRuleCount}) does not match expected-rules array length (${expectedRules.length})`
    );
  }

  // Outcome ve kural sayı limitleri doğrulaması
  const outcome = manifest.expectation.outcome;
  if (outcome === 'rules_found' && expectedRules.length === 0) {
    throw new FixtureInfrastructureError(
      'FIXTURE_EXPECTED_COUNT_MISMATCH',
      'Outcome "rules_found" requires at least 1 expected rule'
    );
  }

  if (outcome === 'no_rules' && expectedRules.length > 0) {
    throw new FixtureInfrastructureError(
      'FIXTURE_EXPECTED_COUNT_MISMATCH',
      'Outcome "no_rules" requires exactly 0 expected rules'
    );
  }

  const failureOutcomes = ['unsupported', 'corrupt', 'password_protected', 'parse_failure'];
  if (failureOutcomes.includes(outcome) && expectedRules.length > 0) {
    throw new FixtureInfrastructureError(
      'FIXTURE_EXPECTED_COUNT_MISMATCH',
      `Failure outcome "${outcome}" requires exactly 0 expected rules`
    );
  }

  // Expected Rules unique ID ve unique fingerprint kontrolü
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const rule of expectedRules) {
    if (seenIds.has(rule.id)) {
      throw new FixtureInfrastructureError(
        'FIXTURE_DUPLICATE_EXPECTED_ID',
        `Duplicate expected rule ID found: ${rule.id}`
      );
    }
    seenIds.add(rule.id);

    const fp = createFingerprint(rule);
    if (seenFingerprints.has(fp)) {
      throw new FixtureInfrastructureError(
        'FIXTURE_DUPLICATE_EXPECTED_FINGERPRINT',
        `Duplicate expected fingerprint found: ${fp} (ID: ${rule.id})`
      );
    }
    seenFingerprints.add(fp);
  }

  return {
    manifest,
    expectedRules,
    fixtureRoot: canonicalRoot,
    caseDirectory: caseDir,
    manifestPath,
    inputPath,
    expectedRulesPath,
    candidateOutputPath
  };
}

/**
 * Belirli bir root dizini altındaki tüm evaluation fixture'larını tarar.
 */
export async function discoverEvaluationFixtures(options: {
  rootDir: string;
  version: string;
  dataset: DatasetType | 'all';
}): Promise<EvaluationFixture[]> {
  const { rootDir, version, dataset } = options;

  let canonicalRoot: string;
  try {
    canonicalRoot = await fs.realpath(rootDir);
  } catch (err) {
    throw new FixtureInfrastructureError(
      'FIXTURE_NOT_FOUND',
      `Root directory not found: ${rootDir}`,
      err
    );
  }

  const datasets: DatasetType[] =
    dataset === 'all'
      ? ['development', 'blind-evaluation', 'robustness']
      : [dataset];

  const fixtures: EvaluationFixture[] = [];
  const seenCaseIds = new Set<string>();

  for (const ds of datasets) {
    const datasetDir = path.resolve(canonicalRoot, version, ds);

    // Dizin varlığını kontrol et
    let exists = false;
    try {
      const s = await fs.stat(datasetDir);
      exists = s.isDirectory();
    } catch {
      exists = false;
    }

    if (!exists) continue;

    // Dizin altındaki klasörleri listele
    let entries: string[];
    try {
      entries = await fs.readdir(datasetDir);
    } catch (err) {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        `Could not read dataset directory: ${datasetDir}`,
        err
      );
    }

    for (const entry of entries) {
      const entryPath = path.resolve(datasetDir, entry);
      const s = await fs.stat(entryPath);
      if (!s.isDirectory()) continue;

      // Fixture'ı yüklemeyi dene
      let fixture: EvaluationFixture;
      try {
        fixture = await loadEvaluationFixture({
          rootDir: canonicalRoot,
          version,
          dataset: ds,
          caseId: entry
        });
      } catch (err) {
        // Eğer manifest veya rules dosyaları eksikse/bozuksa discovery crash edebilir veya skip edebilir.
        // Kriter gereği: "Hatalı fixture tanımlarını kontrollü olarak reddetmek"
        // Discovery sırasında bozuk bir fixture varsa hata fırlatılması istenir.
        throw err;
      }

      // Duplicate caseId kontrolü
      if (seenCaseIds.has(fixture.manifest.caseId)) {
        throw new FixtureInfrastructureError(
          'FIXTURE_DUPLICATE_CASE_ID',
          `Duplicate case ID "${fixture.manifest.caseId}" discovered across datasets`
        );
      }
      seenCaseIds.add(fixture.manifest.caseId);

      fixtures.push(fixture);
    }
  }

  // Discovery sonucu stabil sıralanmalı: dataset (artan) -> caseId (artan)
  fixtures.sort((a, b) => {
    const dsCompare = a.manifest.dataset.localeCompare(b.manifest.dataset);
    if (dsCompare !== 0) return dsCompare;
    return a.manifest.caseId.localeCompare(b.manifest.caseId);
  });

  return fixtures;
}
