import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));

function resolveReleaseDir(): string {
  if (process.env.DRIZZLE_RELEASE_DIR) return process.env.DRIZZLE_RELEASE_DIR;
  const cwdDir = path.resolve(process.cwd(), 'drizzle-release');
  if (existsSync(cwdDir)) return cwdDir;
  const oneUp = fileURLToPath(new URL('../drizzle-release/', import.meta.url));
  if (existsSync(oneUp)) return oneUp;
  return fileURLToPath(new URL('../../drizzle-release/', import.meta.url));
}

export const releaseDirectory = resolveReleaseDir();
export const baselineSource = fileURLToPath(new URL('../../drizzle/meta/0036_snapshot.json', import.meta.url));
export const ledgerSchema = 'teklifpro_release';
