import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const drizzleApi: typeof import('drizzle-kit/api') = require('drizzle-kit/api');
