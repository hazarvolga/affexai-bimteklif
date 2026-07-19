import { discoverEvaluationFixtures } from './fixture-loader';
import { runEvaluationSuite } from './runner';
import { DatasetType, CandidateProvider, EvaluationSuiteResult } from './types';

export interface RunDiscoveredEvaluationSuiteOptions {
  rootDir: string;
  version: string;
  dataset: DatasetType | 'all';
  provider: CandidateProvider;
}

/**
 * Fixture discovery ve suite runner katmanlarını birleştirir.
 */
export async function runDiscoveredEvaluationSuite(
  options: RunDiscoveredEvaluationSuiteOptions
): Promise<EvaluationSuiteResult> {
  const fixtures = await discoverEvaluationFixtures({
    rootDir: options.rootDir,
    version: options.version,
    dataset: options.dataset
  });

  return runEvaluationSuite({
    fixtures,
    provider: options.provider
  });
}
