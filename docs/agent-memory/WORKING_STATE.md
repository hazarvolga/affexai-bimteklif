# Working State

Last updated: 2026-07-24

## Repository

Workspace root:

`/Users/hazarekiz/Projects/TeklifPro/TeklifPro-repo`

Important external product docs:

`/Users/hazarekiz/Projects/TeklifPro/.proje_`

## Current App

The current root app is a working Vite + Express + Drizzle prototype.

Runtime notes from the last known working state:

- Dev server command: `PORT=3001 npm run dev`
- Browser URL: `http://localhost:3001`
- Health endpoint: `http://localhost:3001/api/health`
- Prototype DB: `postgres://hazarekiz@localhost:5432/teklifpro_local`
- Demo admin: `admin@teklifpro.ai` / `admin123`

Known local changes already made before this memory layer:

- `.env.local` supports `DATABASE_URL`.
- `server.ts` loads `.env.local`, supports `PORT`, and has a fixed health DB
  check.
- `src/db/index.ts` and `src/db/drizzle.config.ts` load `.env.local`.
- `src/lib/utils.ts` was added for shared `cn()`.
- `components/ui/sonner.tsx` imports React.

## Current User Direction

The user has decided to continue on the existing repo for the pilot phase.

Current active direction:

- Use the existing Vite + Express + Drizzle repo as the pilot development base.
- Production-harden the current app instead of immediately creating a new
  Next.js app.
- Keep the future Next.js migration as a later cutover project once product
  behavior is stable.

Long-term target remains:

- Next.js App Router.
- PostgreSQL.
- Prisma.
- Auth.js/NextAuth.
- Multi AI provider with OpenAI primary and Gemini fallback.

The user also wants an agent memory structure so future agents can work without
reading the entire codebase and full project history every session.

## Agent Memory Added

Added on 2026-05-14:

- `AGENTS.md` as the repo-level agent entrypoint.
- `docs/agent-memory/` for short canonical memory.
- `graphify-out/` for generated Graphify graph memory.

Graphify AST update has been run successfully:

- 199 nodes
- 186 edges
- 21 communities
- 80 files
- zero LLM/API token cost

GitNexus was mentioned by the user, but no local GitNexus installation or folder
was found during setup. If GitNexus becomes available later, connect it to this
same memory layer instead of creating a second source of truth.

## Phase Progress

### Phase 0 - Agent Memory And Pilot Roadmap

Commit: `52882be`

Status: completed.

Verified:

- `npm run lint`
- `graphify update .`

### Phase 1 - Backend Modularization, First Pass

Status: completed first pass.

Changes:

- `server.ts` is now a small process entrypoint.
- Express app setup moved to `src/server/app.ts`.
- Auth and role middleware moved to `src/server/middleware/auth.ts`.
- Usage limits/tracking moved to `src/server/middleware/usage.ts`.
- Auth routes moved to `src/server/routes/auth.ts`.
- Billing routes moved to `src/server/routes/billing.ts`.
- Company/team/industry/invitation routes moved to
  `src/server/routes/company.ts`.

Verified:

- `npm run lint`
- Smoke server on `PORT=3011 npm run dev`
- `curl -sS http://localhost:3011/api/health`

Note: port `3001` already had a Node process listening, so it was not touched.
The temporary `3011` verification server was stopped after the health check.

### Phase 2 - Tenant/Auth/RBAC Hardening, First Pass

Status: completed first pass.

Changes:

- Viewer role is now blocked from key mutation/paid-action endpoints by server
  role middleware.
- AI legacy endpoint `/api/ai/generate-quote` now requires auth, mutation role,
  and usage tracking.
- `/api/ai/improve-quotation` now requires auth, mutation role, and usage
  tracking.
- Client creation, quotation creation/revision/status, PDF generation, profit
  calculation, CRM mutations, regulation impact checks, and AI generation now
  require owner/admin/manager.
- Frontend raw `fetch` calls in quote detail and legacy quote editor now use
  `fetchWithAuth`.
- PDF download now fetches the protected PDF with auth and opens a blob URL.
- PDF service accepts an optional `companyId` and filters quote/client/items by
  company ownership.
- CRM deal analysis and revision item cloning received explicit tenant filters.

Verified:

- `npm run lint`
- Smoke server on `PORT=3011 npm run dev`
- `curl -sS http://localhost:3011/api/health`
- Authless `/api/ai/generate-quote` POST returns `401`.
- Authless `/api/profit/calculate` POST returns `401`.

Note: the temporary `3011` verification server was stopped after checks.

### Phase 3 - Quote Engine And PDF Reliability, First Pass

Status: completed first pass.

Changes:

- `src/lib/calculations.ts` now normalizes numeric input and rounds money
  consistently.
- Server-side quotation creation recalculates item totals and quotation totals
  instead of trusting client-submitted totals.
- Added `npm run test` using `tsx --test`.
- Added calculation tests in `src/lib/calculations.test.ts`.
- PDF browser lifecycle now closes Puppeteer in a `finally` block.

Verified:

- `npm run test` with 3 passing calculation tests.
- `npm run lint`
- Smoke server on `PORT=3011 npm run dev`
- `curl -sS http://localhost:3011/api/health`

Note: the temporary `3011` verification server was stopped after checks.

### Phase 4 - Multi AI Provider Layer, First Pass

Status: completed first pass.

Changes:

- Added provider interface under `src/services/ai/providers/types.ts`.
- Added `OpenAIProvider` as primary provider when `OPENAI_API_KEY` is present.
- Added `GeminiProvider` preserving the existing Gemini behavior as fallback.
- Added `AIProviderRouter` for ordered fallback behavior.
- Updated `AIService` to use the provider router.
- Legacy `/api/ai/generate-quote` now routes through `AIService` instead of a
  direct Gemini call.
- `.env.example` documents `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Added provider router tests.

Verified:

- `npm run test` with 5 passing tests.
- `npm run lint`

### Phase 5 - Pilot Deploy/Security/Observability Readiness

Status: completed documentation pass.

Changes:

- Added Coolify/VPS pilot deploy checklist.
- Added pilot security checklist.
- Added pilot observability plan.
- Added `JWT_SECRET`, `SENTRY_DSN`, and `LOG_LEVEL` placeholders to
  `.env.example`.

Verified:

- `npm run test`
- `npm run lint`
- `npm run build`
- `graphify update .`

Build notes:

- Vite build passed.
- Build emitted existing CSS import-order and large chunk warnings. They do not
  fail the build, but should be addressed before a polished production deploy.

### Phase 6 - Remaining Domain Route Modularization

Status: completed.

Changes:

- `src/server/app.ts` reduced to app assembly, health, Vite/static serving, and
  seed bootstrap.
- Added route modules:
  - `src/server/routes/crm.ts`
  - `src/server/routes/regulations.ts`
  - `src/server/routes/profit.ts`
  - `src/server/routes/ai.ts`
  - `src/server/routes/clients.ts`
  - `src/server/routes/quotations.ts`
- Preserved server-side guards and tenant filters from previous phases.

Verified:

- `npm run lint`
- `npm run test`
- `npm run build`
- Smoke server on `PORT=3011 npm run dev`
- `curl -sS http://localhost:3011/api/health`
- Authless `/api/ai/generate-quote` POST returns `401`.

Note: the temporary `3011` verification server was stopped after checks.

## 2026-07-24 Rebaseline — SmartCheck pilot state

Faz 0–9 evidence-first SmartCheck rollout local/sentetik kanıtlarla tamamlandı.
Latest commit: `28b6264 test(smartcheck): add browser acceptance evidence`.

Verified in the current checkout:

- 295/295 TypeScript tests;
- `pnpm lint` (TypeScript no-emit);
- `pnpm build`;
- `pnpm exec drizzle-kit check --config=src/db/drizzle.config.ts`;
- `git diff --check`;
- real local browser flow: SmartCheck upload → worker processing → review →
  quotation transfer → revision → PDF blob tab;
- cross-tenant and isolated HTTP/PostgreSQL integration suites.

Current production boundary:

- local storage/synthetic fixtures are not production S3 evidence;
- five customer-permissioned MEP files are still absent;
- technical reviewer identity/scope/decision records are still absent;
- production S3 credentials, lifecycle/retention, encryption and restore drill
  are still absent.

The next execution phase is F10 pilot admission, followed by F11–F12 controlled
file waves and operational hardening. The Next.js/NestJS migration remains a
strangler cutover after measured pilot parity, not a pre-pilot rewrite.

F10 technical preflight hardening is now implemented locally: admission dates
are pin-able, consent/retention dates are checked, MEP discipline and unique
reviewers are required, reviewer decision must be `approved`, and S3 prefixes
must be safe tenant-scoped paths. The CLI supports deterministic `--as-of` and
machine-readable `--json` output. The placeholder manifest remains blocked by
design; real customer, reviewer and S3 evidence is still external.

F11 pilot evidence API parity is also implemented: future consent, expired
retention, zero expected rows and incomplete documents fail closed before a
pilot case is created. The real HTTP/PostgreSQL integration test covers these
negative paths plus measurement, reviewer, idempotency and tenant isolation.

F12 worker operations hardening is implemented: stale queued/running runs are
reported in the operator queue, and a tenant-scoped `recover-stale` action marks
the run `failed/WORKER_STALE` before the existing explicit retry path creates a
new job. No automatic mutation or scheduler was added for the first pilot.

F15 foundation slice is now started without changing the pilot write owner:
versioned SmartCheck transport schemas live under `src/contracts`, generated
JSON Schema/OpenAPI artifacts are checked in, and a bounded-context contract
inventory plus Express route parity test rejects unsafe target writes before
`cutover-ready`. Complete F15 still requires an isolated Prisma shadow database
and Express–Nest parity/backup evidence.

The Prisma shadow schema is now present under `prisma/shadow/schema.prisma` and
passes both the database-free tenant contract validator and `prisma validate`.
No migration, `db push`, client generation or dual-write was performed; the
schema remains descriptive until the isolated `teklifpro_next_local` parity and
restore gates are approved.

On 2026-07-24 the isolated shadow harness was executed. A schema-only dump from
`teklifpro_local` was restored into `teklifpro_next_local`; source/target dump
hashes matched and all 13 selected Prisma models passed column/type parity. The
target contains no application rows. The harness refuses a non-target database,
refuses to overwrite a populated target, and keeps Express/Drizzle as the sole
write owner.

The same source schema now passes the separate restore drill into
`teklifpro_restore_drill_local`: 64 non-worker tables, 20 public enums, matching
schema hashes, and zero target rows. This remains schema-only evidence; full
data backup/restore and production S3 restore are still external operational
gates.

## 2026-08-01 IFC Evidence Safety Slice

Commits:

- `b1f7a39 fix(ifc): gate estimate quote transfer`
- `d9e871e test(ifc): add parser safety gates`
- `0359851 feat(ifc): extract approved property volumes`
- `f05a2c4 feat(ifc): resolve spatial storey containment`

Changes:

- Added `IFC_GAP_RAPORU.md` and refreshed Graphify metadata.
- Legacy browser IFC output is now explicitly classified as `demo_estimate` and
  `needs_review`.
- IFC transfer into `CreateQuote` no longer creates `verified` model items.
  It imports structural volume rows as `model_estimate` and skips derived rebar
  and formwork rows until explicit model/QTO/property/reviewer evidence exists.
- Real IFC uploads now fail closed when no supported structural elements are
  found; synthetic demo data is only available through the demo button.
- Added a committed golden manifest for `ifc-document-sample/e-proje_4x3.ifc`
  without committing the 37 MB sample file.
- Added IFC parser safety tests, quote transfer tests, Allplan/Pset volume
  property extraction tests, and storey containment tests.
- Parser now reads approved property volume evidence from `AllplanAttributes`
  and `Pset_SlabCommon/Hacim`; the local sample resolves 160 slab volume
  matches with a total of approximately `322.374717498415 m3`.
- Parser now resolves `IfcRelContainedInSpatialStructure` to
  `IfcBuildingStorey`; sample slab `#2250` resolves to
  `2025-00-MM-BETO-CP-MMP-B01-01-00 (-1.9 m)` instead of a modulo estimate.

Verified:

- `pnpm exec tsx --test src/ifc/quotation-transfer.test.ts
  src/ifc/parser-gates.test.ts src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts` -> 12/12 passing with the local
  sample present.
- `git diff --check` passed after each code phase.
- `graphify update .` succeeded after each code phase.

Not verified / still blocked:

- `pnpm lint` still fails with pre-existing module resolution errors in Academy
  Firebase imports, BIMPlan `../types` imports, and missing `firebase/*`
  dependencies. The IFC files added in this slice are not among the reported
  errors.
- Full `pnpm test`, production build, browser UI verification, SmartCheck
  document/run integration, worker processing, and database-backed review flow
  were not completed in this slice.
- The local sample IFC remains untracked under `ifc-document-sample/`.

Next recommended IFC work:

1. Add server/worker resource limits and checksum/upload contract for IFC files.
2. Bind IFC result provenance into the existing SmartCheck document/run/review
   evidence chain instead of browser `sessionStorage`.
3. Add QTO extraction before approved property fallback.
4. Keep rebar and formwork unavailable until explicit rebar/QTO/property or
   reviewed rule evidence exists.

## Do Not Touch

Do not stop, migrate, seed, truncate, or otherwise modify unrelated services or
databases. The user may be running other work at the same time.

Avoid destructive commands unless explicitly requested and confirmed.

## Historical Next Recommended Work (superseded by the 2026-07-24 rebaseline)

1. Finish the agent memory bootstrap.
2. Define the pilot readiness checklist for the current repo.
3. Modularize `server.ts` into route/service boundaries.
4. Add tenant/RBAC/usage-limit hardening around current API routes.
5. Add multi AI provider abstraction to the existing AI flows.
6. Add PDF/AI/auth security checks and tests.
