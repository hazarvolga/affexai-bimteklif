import { test } from 'node:test';
import assert from 'assert';
import { runEvaluationCliEntry, EvaluationCliProcessRuntime } from './cli-entry';
import { runEvaluationCli } from './cli';

// Helper: Mock process runtime üretici
function createMockRuntime(argv: string[] = []): EvaluationCliProcessRuntime & {
  stdout: string[];
  stderr: string[];
  exitCodes: number[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCodes: number[] = [];

  return {
    argv,
    cwd() {
      return '/virtual/cwd';
    },
    writeStdout(text) {
      stdout.push(text);
    },
    writeStderr(text) {
      stderr.push(text);
    },
    setExitCode(code) {
      exitCodes.push(code);
    },
    stdout,
    stderr,
    exitCodes
  };
}

test('cli-entry: first two argv arguments are sliced and order is preserved', async () => {
  const runtime = createMockRuntime(['node', 'main.ts', '--root', './fixtures', '--version', 'v1']);
  let receivedArgv: readonly string[] = [];

  const runCliMock = async (argv: readonly string[]) => {
    receivedArgv = argv;
    return { exitCode: 0 };
  };

  await runEvaluationCliEntry(runtime, { runCli: runCliMock as any });

  assert.deepStrictEqual(receivedArgv, ['--root', './fixtures', '--version', 'v1']);
});

test('cli-entry: original argv is not mutated', async () => {
  const originalArgv = ['node', 'main.ts', '--root', './fixtures'];
  const runtime = createMockRuntime([...originalArgv]);

  const runCliMock = async () => {
    return { exitCode: 0 };
  };

  await runEvaluationCliEntry(runtime, { runCli: runCliMock as any });

  assert.deepStrictEqual(runtime.argv, originalArgv);
});

test('cli-entry: cwd and writers are directed without modification', async () => {
  const runtime = createMockRuntime(['node', 'main.ts']);
  let receivedCwd = '';

  const runCliMock = async (argv: readonly string[], io: any) => {
    receivedCwd = io.cwd;
    io.writeStdout('stdout text');
    io.writeStderr('stderr text');
    return { exitCode: 0 };
  };

  await runEvaluationCliEntry(runtime, { runCli: runCliMock as any });

  assert.strictEqual(receivedCwd, '/virtual/cwd');
  assert.deepStrictEqual(runtime.stdout, ['stdout text']);
  assert.deepStrictEqual(runtime.stderr, ['stderr text']);
});

test('cli-entry: exit code mapping matches cli execution outcomes', async () => {
  const exitCodesToTest = [0, 1, 2, 3, 4, 5, 10];

  for (const expectedCode of exitCodesToTest) {
    const runtime = createMockRuntime(['node', 'main.ts']);
    const runCliMock = async () => {
      return { exitCode: expectedCode };
    };

    await runEvaluationCliEntry(runtime, { runCli: runCliMock as any });
    assert.deepStrictEqual(runtime.exitCodes, [expectedCode]);
  }
});

test('cli-entry: runCli rejection is caught and yields exit code 10 without extra writes', async () => {
  const runtime = createMockRuntime(['node', 'main.ts']);
  const runCliMock = async () => {
    throw new Error('CRITICAL_REJECTION');
  };

  await runEvaluationCliEntry(runtime, { runCli: runCliMock as any });

  assert.deepStrictEqual(runtime.exitCodes, [10]);
  assert.deepStrictEqual(runtime.stdout, []);
  assert.deepStrictEqual(runtime.stderr, []);
});

test('cli-entry: writer exceptions are caught and exit code 10 is set once', async () => {
  const runtime = createMockRuntime(['node', 'main.ts']);
  let setExitCodeCalls = 0;

  const badRuntime: EvaluationCliProcessRuntime = {
    argv: ['node', 'main.ts'],
    cwd: () => '/cwd',
    writeStdout() {
      throw new Error('IO_ERR');
    },
    writeStderr() {
      throw new Error('IO_ERR');
    },
    setExitCode(code) {
      setExitCodeCalls++;
      assert.strictEqual(code, 10);
    }
  };

  const runCliMock = async (argv: readonly string[], io: any) => {
    io.writeStdout('trigger error');
    return { exitCode: 0 };
  };

  await runEvaluationCliEntry(badRuntime, { runCli: runCliMock as any });
  assert.strictEqual(setExitCodeCalls, 1);
});

test('cli-entry: dependency runCli is called exactly once', async () => {
  const runtime = createMockRuntime(['node', 'main.ts']);
  let calls = 0;

  const runCliMock = async () => {
    calls++;
    return { exitCode: 0 };
  };

  await runEvaluationCliEntry(runtime, { runCli: runCliMock as any });
  assert.strictEqual(calls, 1);
});

test('cli-entry: default runCli dependency is runEvaluationCli', async () => {
  const runtime = createMockRuntime(['node', 'main.ts']);
  // Bu test default dependencies composition doğruluğunu kontrol eder.
  // Parametresiz çağrı yapıldığında default dependency olarak runEvaluationCli atanır.
  // Boş argümanlar geçildiğinden parser hata fırlatır (usage error) ve exitCode 2 olur.
  await runEvaluationCliEntry(runtime);
  assert.deepStrictEqual(runtime.exitCodes, [2]);
});

test('cli-entry: normal exit-code setter exception propagates and does not call setExitCode again', async () => {
  let setExitCodeCalls = 0;
  const badRuntime: EvaluationCliProcessRuntime = {
    argv: ['node', 'main.ts'],
    cwd: () => '/cwd',
    writeStdout() {},
    writeStderr() {},
    setExitCode() {
      setExitCodeCalls++;
      throw new Error('SETTER_ERR');
    }
  };

  const runCliMock = async () => {
    return { exitCode: 0 };
  };

  await assert.rejects(
    runEvaluationCliEntry(badRuntime, { runCli: runCliMock as any }),
    /SETTER_ERR/
  );
  assert.strictEqual(setExitCodeCalls, 1);
});

test('cli-entry: rejection fallback exit-code setter exception propagates and does not call setExitCode again', async () => {
  let setExitCodeCalls = 0;
  const badRuntime: EvaluationCliProcessRuntime = {
    argv: ['node', 'main.ts'],
    cwd: () => '/cwd',
    writeStdout() {},
    writeStderr() {},
    setExitCode() {
      setExitCodeCalls++;
      throw new Error('FALLBACK_SETTER_ERR');
    }
  };

  const runCliMock = async () => {
    throw new Error('REJECTION_ERR');
  };

  await assert.rejects(
    runEvaluationCliEntry(badRuntime, { runCli: runCliMock as any }),
    /FALLBACK_SETTER_ERR/
  );
  assert.strictEqual(setExitCodeCalls, 1);
});
