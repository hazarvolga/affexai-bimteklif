import { runEvaluationCliEntry } from './cli-entry';

void runEvaluationCliEntry({
  argv: process.argv,
  cwd: () => process.cwd(),

  writeStdout(text: string) {
    process.stdout.write(text);
  },

  writeStderr(text: string) {
    process.stderr.write(text);
  },

  setExitCode(code: number) {
    process.exitCode = code;
  }
});
