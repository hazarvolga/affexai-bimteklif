import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const releaseDirectory = fileURLToPath(new URL('../../drizzle-release/', import.meta.url));
export const baselineSource = fileURLToPath(new URL('../../drizzle/meta/0036_snapshot.json', import.meta.url));
export const ledgerSchema = 'teklifpro_release';
export const require = createRequire(import.meta.url);
export const drizzleApi: typeof import('drizzle-kit/api') = require('drizzle-kit/api');
