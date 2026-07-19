import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  CandidateProviderResultSchema,
  type CandidateProvider,
  type CandidateProviderResult,
  type EvaluationFixture
} from './types';
import { FixtureInfrastructureError } from './fixture-errors';

async function checkSymlink(targetPath: string): Promise<void> {
  try {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) {
      throw new FixtureInfrastructureError(
        'FIXTURE_SYMLINK_REJECTED',
        `Symlink rejected: ${targetPath}`
      );
    }
  } catch (err) {
    if (err instanceof FixtureInfrastructureError) throw err;
  }
}

function isPathInsideOrEqual(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export class FixtureCandidateProvider implements CandidateProvider {
  async evaluate(
    fixture: EvaluationFixture
  ): Promise<CandidateProviderResult> {
    if (
      typeof fixture.caseDirectory !== 'string' ||
      fixture.caseDirectory.trim().length === 0
    ) {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        'Fixture case directory is required'
      );
    }
    const caseDir = fixture.caseDirectory;
    const outputPath = fixture.candidateOutputPath;

    // Basename doğrulama
    if (path.basename(outputPath) !== 'candidate-output.json') {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        'Candidate output filename must be candidate-output.json'
      );
    }

    // Symlink kontrolleri
    await checkSymlink(caseDir);
    await checkSymlink(outputPath);

    // Realpath containment kontrolleri
    let canonicalCaseDir: string;
    let canonicalOutputPath: string;
    try {
      canonicalCaseDir = await fs.realpath(caseDir);
      canonicalOutputPath = await fs.realpath(outputPath);
    } catch (err) {
      throw new FixtureInfrastructureError(
        'FIXTURE_NOT_FOUND',
        `Could not resolve path realpath: ${outputPath} or ${caseDir}`,
        err
      );
    }

    if (!isPathInsideOrEqual(canonicalCaseDir, canonicalOutputPath)) {
      throw new FixtureInfrastructureError(
        'FIXTURE_PATH_INVALID',
        `Candidate output path escapes case directory containment: ${canonicalOutputPath}`
      );
    }

    // Normal file kontrolü
    let stat;
    try {
      stat = await fs.stat(canonicalOutputPath);
      if (!stat.isFile()) {
        throw new FixtureInfrastructureError(
          'FIXTURE_PATH_INVALID',
          `Candidate output is not a file: ${canonicalOutputPath}`
        );
      }
    } catch (err) {
      if (err instanceof FixtureInfrastructureError) throw err;
      throw new FixtureInfrastructureError(
        'FIXTURE_NOT_FOUND',
        `Candidate output path not found: ${canonicalOutputPath}`,
        err
      );
    }

    // Dosya varlığını kontrol et
    try {
      await fs.access(outputPath);
    } catch {
      throw new FixtureInfrastructureError(
        'FIXTURE_NOT_FOUND',
        `Candidate output file not found: ${outputPath}`
      );
    }

    let rawData: string;
    try {
      rawData = await fs.readFile(outputPath, 'utf8');
    } catch (err) {
      throw new FixtureInfrastructureError(
        'FIXTURE_JSON_INVALID',
        `Candidate output file could not be read: ${outputPath}`,
        err
      );
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawData);
    } catch (err) {
      throw new FixtureInfrastructureError(
        'FIXTURE_JSON_INVALID',
        `Candidate output JSON parsing failed: ${outputPath}`,
        err
      );
    }

    const parseResult = CandidateProviderResultSchema.safeParse(parsedData);
    if (!parseResult.success) {
      throw new FixtureInfrastructureError(
        'FIXTURE_PROVIDER_RESULT_INVALID',
        `Candidate provider result envelope is invalid: ${outputPath}`,
        parseResult.error
      );
    }

    const providerResult = parseResult.data;

    // Eğer success ise candidates içindeki string candidateId değerlerinin benzersizliğini kontrol et
    if (providerResult.status === 'success') {
      const candidates = providerResult.candidates;
      const seenCandidateIds = new Set<string>();

      for (const cand of candidates) {
        if (cand && typeof cand === 'object') {
          const candObj = cand as Record<string, unknown>;
          if ('candidateId' in candObj && typeof candObj.candidateId === 'string') {
            const cId = candObj.candidateId;
            if (seenCandidateIds.has(cId)) {
              throw new FixtureInfrastructureError(
                'FIXTURE_DUPLICATE_CANDIDATE_ID',
                `Duplicate candidate ID found in provider output: ${cId}`
              );
            }
            seenCandidateIds.add(cId);
          }
        }
      }
    }

    return providerResult;
  }
}
