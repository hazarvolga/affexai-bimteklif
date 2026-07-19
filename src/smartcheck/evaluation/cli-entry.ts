import { runEvaluationCli } from './cli';

export interface EvaluationCliProcessRuntime {
  readonly argv: readonly string[];
  cwd(): string;
  writeStdout(text: string): void;
  writeStderr(text: string): void;
  setExitCode(code: number): void;
}

export interface EvaluationCliEntryDependencies {
  runCli: typeof runEvaluationCli;
}

/**
 * CLI process runtime'ı ile CLI Application Core arasında köprü kurar.
 */
export async function runEvaluationCliEntry(
  runtime: EvaluationCliProcessRuntime,
  dependencies: EvaluationCliEntryDependencies = {
    runCli: runEvaluationCli
  }
): Promise<void> {
  let execution: any;
  try {
    execution = await dependencies.runCli(
      runtime.argv.slice(2),
      {
        cwd: runtime.cwd(),
        writeStdout: (text) => runtime.writeStdout(text),
        writeStderr: (text) => runtime.writeStderr(text)
      }
    );
  } catch {
    runtime.setExitCode(10);
    return;
  }

  runtime.setExitCode(execution.exitCode);
}
