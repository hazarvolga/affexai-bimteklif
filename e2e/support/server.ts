/**
 * Playwright webServer for the T43 E2E suite: real Express API + Vite SPA +
 * in-process Graphile IFC worker over a disposable PostgreSQL schema.
 * Same isolation contract as scripts/e2e-core-flow-smoke.ts (shared databases
 * are refused). Playwright stops it with SIGTERM; cleanup drops the schema.
 *
 *   pnpm exec tsx e2e/support/server.ts
 */
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import { Logger, run, type Runner } from 'graphile-worker';
import { createServer as createViteServer } from 'vite';
import { createTestIsolation } from '../../src/server/routes/test-isolation';
import { E2E_ADMIN, E2E_BASE_URL, E2E_CLIENT_NAME, E2E_COMPANY_NAME, E2E_OWNER, E2E_PASSWORD, E2E_PORT } from './fixture';

dotenv.config({ path: '.env.local', quiet: true });
const sourceUrl = process.env.TEST_ISOLATION_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('E2E server needs DATABASE_URL or TEST_ISOLATION_SOURCE_DATABASE_URL (local test database)');

const isolation = await createTestIsolation(sourceUrl);
Object.assign(process.env, {
  DATABASE_URL: isolation.databaseUrl,
  CONTROL_DATABASE_URL: isolation.controlDatabaseUrl,
  ...(isolation.workerDatabaseUrl ? { WORKER_DATABASE_URL: isolation.workerDatabaseUrl } : {}),
  GRAPHILE_WORKER_SCHEMA: isolation.workerSchema,
  SMARTCHECK_LOCAL_STORAGE_DIR: isolation.storageDir,
  SMARTCHECK_IMPORT_ENABLED: 'true',
  // Production IFC engine (IfcOpenShell via workers/ifc); needs the pinned Python requirements.
  SMARTCHECK_IFC_ENGINE: process.env.SMARTCHECK_IFC_ENGINE ?? 'ifcopenshell',
  AUTH_EMAIL_WEBHOOK_URL: '',
  PUBLIC_APP_URL: E2E_BASE_URL,
  NODE_ENV: 'test',
});

let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
let worker: Runner | undefined;
let database: typeof import('../../src/db').db | undefined;
let stopping: Promise<void> | undefined;

async function seed(db: typeof import('../../src/db').db): Promise<void> {
  const [schema, { AuthService }] = await Promise.all([import('../../src/db/schema'), import('../../src/services/auth/authService')]);
  const passwordHash = await AuthService.hashPassword(E2E_PASSWORD);
  const [company] = await db.insert(schema.companies).values({ name: E2E_COMPANY_NAME, smartcheckMaxWastePercent: '20' }).returning();
  const [owner, admin] = await db.insert(schema.users).values([
    { ...E2E_OWNER, emailVerified: new Date(), passwordHash },
    { ...E2E_ADMIN, emailVerified: new Date(), passwordHash, isSuperAdmin: true },
  ]).returning();
  await db.insert(schema.memberships).values([
    { userId: owner.id, companyId: company.id, role: 'owner' },
    { userId: admin.id, companyId: company.id, role: 'owner' },
  ]);
  const [plan] = await db.insert(schema.plans).values({
    name: 'E2E Plan', monthlyPrice: 100, monthlyQuoteLimit: 20, monthlyPdfLimit: 20,
    monthlyIfcLimit: 10, ifcMaxFileMb: 50, ifcMaxConcurrent: 1, isActive: true,
  }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, status: 'active', currentPeriodStart: new Date('2020-01-01') });
  await db.insert(schema.clients).values({ companyId: company.id, name: E2E_CLIENT_NAME, type: 'company' });
  // Isolation clones table shapes only; the editor defaults to the migration-seeded 'residential' industry.
  await db.insert(schema.industries).values({
    id: 'residential', name: 'Konut İnşaatı', description: 'E2E fixture copy of the release-migration catalog row.',
    configJson: JSON.stringify({ source: 'INITIAL_PLUGINS', calculationModel: 'material_heavy', pdfTemplateId: 'default_construction' }),
  });
}

async function stop(): Promise<void> {
  stopping ??= (async () => {
    try {
      await worker?.stop();
      if (server) await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeAllConnections(); });
      await vite?.close();
    } finally {
      try {
        await import('../../src/db/control-plane').then(({ closeControlDatabase }) => closeControlDatabase());
        await database?.$client.end();
      } finally { await isolation.cleanup(); }
    }
  })();
  return stopping;
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => { void stop().then(() => process.exit(0), (error: unknown) => { console.error('E2E cleanup failed:', error); process.exit(1); }); });
}

try {
  const [{ createApiApp }, { db }, { ifcWorkerTaskList }] = await Promise.all([
    import('../../src/server/app'), import('../../src/db'), import('../../src/smartcheck/import/ifc-worker'),
  ]);
  database = db;
  await seed(db);
  worker = await run({
    connectionString: process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL,
    schema: isolation.workerSchema,
    concurrency: 1,
    pollInterval: 500,
    noHandleSignals: true,
    logger: new Logger(() => () => {}),
    taskList: ifcWorkerTaskList,
  });
  const app = createApiApp();
  vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa', logLevel: 'error' });
  app.use(vite.middlewares);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(E2E_PORT, '127.0.0.1', resolve));
  console.log(`E2E server ready on ${E2E_BASE_URL} (schema ${isolation.workerSchema})`);
} catch (error) {
  console.error('E2E server failed to start:', error);
  await stop();
  process.exit(1);
}
