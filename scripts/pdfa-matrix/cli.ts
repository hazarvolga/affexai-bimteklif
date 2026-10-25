import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PdfaMatrixManifestSchema, runPdfaFixtureMatrix } from '../../src/smartcheck/pdf/pdfa-fixture-matrix';

// Runs the T32 fixture matrix through the production PDF artifact builder (structural
// preflight + real veraPDF). Usage: pdfa-matrix.mjs <fixtures-root>; exits 1 on any mismatch.
export async function main(args = process.argv.slice(2)) {
  const [fixturesRoot, ...extra] = args;
  if (!fixturesRoot || extra.length) throw new Error('Usage: pdfa-matrix.mjs <fixtures-root>');
  const root = path.resolve(fixturesRoot);
  const manifest = PdfaMatrixManifestSchema.parse(JSON.parse(await fs.readFile(path.join(root, 'phase-5/pdfa-matrix/manifest.json'), 'utf8')));
  const results = await runPdfaFixtureMatrix(root, manifest);
  const failed = results.filter(result => !result.passed);
  process.stdout.write(`${JSON.stringify({ task: manifest.task, profile: manifest.profile, validator: manifest.validator, passed: failed.length === 0, cases: results }, null, 2)}\n`);
  if (failed.length) throw new Error(`PDF/A matrix mismatches: ${failed.map(result => `${result.id} (${result.mismatches.join('; ')})`).join(', ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
