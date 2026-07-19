import * as path from 'node:path';
import { FixtureCandidateProvider } from './fixture-candidate-provider';
import { runDiscoveredEvaluationSuite, RunDiscoveredEvaluationSuiteOptions } from './orchestrator';
import { FixtureInfrastructureError } from './fixture-errors';
import {
  EvaluationError,
  EvaluationSuiteError,
  CandidateProvider,
  EvaluationSuiteResult
} from './types';

export interface EvaluationCliIo {
  cwd: string;
  writeStdout(text: string): void;
  writeStderr(text: string): void;
}

export interface EvaluationCliExecution {
  exitCode: number;
}

export interface EvaluationCliDependencies {
  createProvider(): CandidateProvider;
  runSuite(options: RunDiscoveredEvaluationSuiteOptions): Promise<EvaluationSuiteResult>;
}

export type EvaluationCliUsageErrorCode =
  | 'CLI_ARGUMENT_MISSING'
  | 'CLI_ARGUMENT_DUPLICATE'
  | 'CLI_ARGUMENT_UNKNOWN'
  | 'CLI_ARGUMENT_VALUE_MISSING'
  | 'CLI_ARGUMENT_VALUE_INVALID'
  | 'CLI_POSITIONAL_ARGUMENT_UNSUPPORTED';

export class EvaluationCliUsageError extends Error {
  constructor(
    public readonly code: EvaluationCliUsageErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'EvaluationCliUsageError';
  }
}

// Varsayılan bağımlılıklar
const defaultDependencies: EvaluationCliDependencies = {
  createProvider: () => new FixtureCandidateProvider(),
  runSuite: runDiscoveredEvaluationSuite
};

/**
 * Strict CLI Argument Parser
 */
function parseArgs(argv: readonly string[]) {
  let root: string | undefined;
  let version: string | undefined;
  let dataset: string | undefined;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--root') {
      if (root !== undefined) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_DUPLICATE', 'Duplicate --root option.');
      }
      if (i + 1 >= argv.length) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_MISSING', 'Value missing for --root option.');
      }
      const val = argv[i + 1];
      if (val.startsWith('--')) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_MISSING', 'Value missing for --root option.');
      }
      if (val.trim() === '') {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_INVALID', 'Value cannot be empty for --root option.');
      }
      root = val;
      i += 2;
    } else if (arg === '--version') {
      if (version !== undefined) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_DUPLICATE', 'Duplicate --version option.');
      }
      if (i + 1 >= argv.length) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_MISSING', 'Value missing for --version option.');
      }
      const val = argv[i + 1];
      if (val.startsWith('--')) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_MISSING', 'Value missing for --version option.');
      }
      if (val.trim() === '') {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_INVALID', 'Value cannot be empty for --version option.');
      }
      version = val;
      i += 2;
    } else if (arg === '--dataset') {
      if (dataset !== undefined) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_DUPLICATE', 'Duplicate --dataset option.');
      }
      if (i + 1 >= argv.length) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_MISSING', 'Value missing for --dataset option.');
      }
      const val = argv[i + 1];
      if (val.startsWith('--')) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_MISSING', 'Value missing for --dataset option.');
      }
      if (val.trim() === '') {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_INVALID', 'Value cannot be empty for --dataset option.');
      }
      if (val !== 'development' && val !== 'robustness' && val !== 'all') {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_INVALID', 'Invalid value for --dataset. Must be development, robustness, or all.');
      }
      dataset = val;
      i += 2;
    } else if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        throw new EvaluationCliUsageError('CLI_ARGUMENT_VALUE_INVALID', 'Options with equals sign are not supported.');
      }
      throw new EvaluationCliUsageError('CLI_ARGUMENT_UNKNOWN', `Unknown CLI option: ${arg}`);
    } else {
      throw new EvaluationCliUsageError('CLI_POSITIONAL_ARGUMENT_UNSUPPORTED', `Positional arguments are not supported: ${arg}`);
    }
  }

  if (root === undefined) {
    throw new EvaluationCliUsageError('CLI_ARGUMENT_MISSING', 'Required option --root is missing.');
  }
  if (version === undefined) {
    throw new EvaluationCliUsageError('CLI_ARGUMENT_MISSING', 'Required option --version is missing.');
  }
  if (dataset === undefined) {
    throw new EvaluationCliUsageError('CLI_ARGUMENT_MISSING', 'Required option --dataset is missing.');
  }

  return { root, version, dataset };
}

/**
 * Error'ları deterministic ve safe payload'lara map eder
 */
function mapError(error: unknown) {
  let errorType: 'usage' | 'fixture' | 'evaluation' | 'suite' | 'internal' = 'internal';
  let errorCode = 'CLI_INTERNAL_ERROR';
  let message = 'An unexpected internal error occurred.';
  let exitCode = 10;

  if (error instanceof EvaluationCliUsageError) {
    errorType = 'usage';
    errorCode = error.code;
    exitCode = 2;
    switch (error.code) {
      case 'CLI_ARGUMENT_MISSING':
        message = 'Required CLI argument is missing.';
        break;
      case 'CLI_ARGUMENT_DUPLICATE':
        message = 'Duplicate CLI argument provided.';
        break;
      case 'CLI_ARGUMENT_UNKNOWN':
        message = 'Unknown CLI option provided.';
        break;
      case 'CLI_ARGUMENT_VALUE_MISSING':
        message = 'Value missing for CLI argument.';
        break;
      case 'CLI_ARGUMENT_VALUE_INVALID':
        message = 'Invalid value provided for CLI argument.';
        break;
      case 'CLI_POSITIONAL_ARGUMENT_UNSUPPORTED':
        message = 'Positional arguments are not supported.';
        break;
      default:
        message = 'CLI argument usage validation failed.';
    }
  } else if (error instanceof FixtureInfrastructureError) {
    errorType = 'fixture';
    errorCode = error.code;
    exitCode = 3;
    switch (error.code) {
      case 'FIXTURE_NOT_FOUND':
        message = 'Evaluation fixture was not found.';
        break;
      case 'FIXTURE_PATH_INVALID':
        message = 'Fixture path validation failed.';
        break;
      case 'FIXTURE_JSON_INVALID':
        message = 'A fixture JSON file is invalid.';
        break;
      case 'FIXTURE_SCHEMA_INVALID':
        message = 'A fixture does not match the required schema.';
        break;
      case 'FIXTURE_DUPLICATE_CASE_ID':
        message = 'Duplicate case ID discovered across datasets.';
        break;
      default:
        message = 'Fixture infrastructure validation failed.';
    }
  } else if (error instanceof EvaluationError) {
    errorType = 'evaluation';
    errorCode = error.code;
    exitCode = 4;
    switch (error.code) {
      case 'EVALUATION_DUPLICATE_CANDIDATE_ID':
        message = 'Candidate provider returned duplicate candidate identifiers.';
        break;
      case 'EVALUATION_RAW_CANDIDATE_NOT_JSON_COMPATIBLE':
        message = 'Non-JSON compatible candidates encountered.';
        break;
      case 'EVALUATION_METRIC_INVARIANT_FAILED':
        message = 'Evaluation metric mathematical invariant checks failed.';
        break;
      default:
        message = 'Evaluation contract validation failed.';
    }
  } else if (error instanceof EvaluationSuiteError) {
    errorType = 'suite';
    errorCode = error.code;
    exitCode = 5;
    switch (error.code) {
      case 'EVALUATION_SUITE_EMPTY':
        message = 'No evaluation fixtures were discovered.';
        break;
      case 'EVALUATION_SUITE_DUPLICATE_CASE_ID':
        message = 'Duplicate case ID detected in suite runner.';
        break;
      case 'EVALUATION_SUITE_SUMMARY_INVARIANT_FAILED':
        message = 'Evaluation suite summary invariant checks failed.';
        break;
      default:
        message = 'Evaluation suite validation failed.';
    }
  }

  return {
    exitCode,
    payload: {
      status: 'error',
      errorType,
      errorCode,
      message
    }
  };
}

/**
 * CLI Core Execution entry point
 */
export async function runEvaluationCli(
  argv: readonly string[],
  io: EvaluationCliIo,
  dependencies: EvaluationCliDependencies = defaultDependencies
): Promise<EvaluationCliExecution> {
  let executionPayload: { status: 'completed'; result: EvaluationSuiteResult } | null = null;
  let exitCode = 0;
  let errorPayload: any = null;
  let errorExitCode = 0;

  try {
    const { root, version, dataset } = parseArgs(argv);
    const resolvedRoot = path.resolve(io.cwd, root);
    const provider = dependencies.createProvider();

    const result = await dependencies.runSuite({
      rootDir: resolvedRoot,
      version,
      dataset: dataset as any,
      provider
    });

    executionPayload = {
      status: 'completed',
      result
    };
    exitCode = result.summary.allQualityGatesPassed ? 0 : 1;
  } catch (error) {
    const mapped = mapError(error);
    errorPayload = mapped.payload;
    errorExitCode = mapped.exitCode;
  }

  if (errorPayload !== null) {
    io.writeStderr(JSON.stringify(errorPayload, null, 2) + '\n');
    return { exitCode: errorExitCode };
  }

  if (executionPayload !== null) {
    io.writeStdout(JSON.stringify(executionPayload, null, 2) + '\n');
    return { exitCode };
  }

  return { exitCode: 10 };
}
