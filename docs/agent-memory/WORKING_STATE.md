# Working State

Last updated: 2026-08-02

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
- Added a UI-independent IFC type boundary plus SmartCheck evidence adapter.
  The adapter admits only property-backed IFC quantities into pending-review
  rows compatible with `normalized_quantity_rows`, preserves STEP/globalId
  provenance in the row evidence payload, marks missing price as a review
  finding, and blocks all demo/estimated elements from SmartCheck evidence row
  admission.
- Added the first server-side IFC SmartCheck admission guard: `.ifc` uploads
  now have a separate 100 MB size limit, STEP/`FILE_SCHEMA(('IFC...'))`
  signature validation, accepted IFC MIME types, and upload/complete route
  support.
- Moved the legacy IFC parser out of the React component into a UI-independent
  parser module, then added the IFC worker branch in SmartCheck processing.
  Uploaded IFC content is checksum-verified, parsed server-side, converted into
  an `ifc_evidence` processing artifact, and property-backed rows are persisted
  as `pending_review` `normalized_quantity_rows`. If no admissible
  property-backed quantity evidence exists, the run fails closed with
  `IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE` after storing the blocked-element
  artifact.
- Added an IFC HTTP integration scenario to the existing SmartCheck route test:
  it uploads a minimal `.ifc`, completes checksum validation, confirms preview
  uses the processing artifact path, queues processing, runs the worker, then
  verifies `ifc_evidence` artifact metadata and one tenant-isolated
  `ifc_property` pending-review row. The HTTP integration test now first
  verifies local PostgreSQL reachability; when `DATABASE_URL` exists but the DB
  is down, it skips cleanly instead of failing with `ECONNREFUSED`.
- Added IFC QTO volume extraction for `IfcElementQuantity` /
  `IfcQuantityVolume` and made parser source priority explicit:
  QTO volume evidence wins first, approved Allplan/Pset property evidence is
  fallback, and demo estimates remain last. SmartCheck evidence rows now
  preserve QTO-backed quantities as `ifc_qto` and report QTO/property counts
  separately in artifact metadata.
- Added a geometry fallback admission guard. Future geometry-derived IFC
  quantities can be represented as `quantitySource: "geometry"`, but they are
  blocked from SmartCheck evidence rows until deterministic unit handling,
  opening deductions, net/gross rules, tolerance limits, and reviewer evidence
  are implemented. Artifact metadata now tracks `geometryBlockedCount`.
- Added explicit rebar/formwork admission guards. `IfcReinforcingBar` elements
  are blocked from SmartCheck evidence rows until bar length/mass evidence,
  diameter grouping, unit conversion, lap/waste policy, and reviewer-backed
  BVBS/TS 708 validation exist. Derived formwork values remain metadata-only
  blocked estimates and are counted via `formworkEstimateBlockedCount`.
- Added a shared IFC evidence policy display helper and surfaced policy status
  in the browser IFC parser UI. The UI now summarizes QTO accepted, property
  accepted, estimate blocked, geometry blocked, rebar blocked, and formwork
  blocked counts, and the element table labels each row with its SmartCheck
  admission status instead of showing only raw `property`/`estimate` source
  text.

Verified:

- `pnpm exec tsx --test src/ifc/quotation-transfer.test.ts
  src/ifc/parser-gates.test.ts src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts` -> 12/12 passing with the local
  sample present.
- `pnpm exec tsx --test src/ifc/quotation-transfer.test.ts
  src/ifc/parser-gates.test.ts src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts`
  -> 14/14 passing with the local sample present; SmartCheck evidence adapter
  emits 160 property-backed slab rows with approximately
  `322.374717498415 m3` total quantity and blocks the remaining estimated
  elements.
- `pnpm exec tsx --test src/smartcheck/import/file-security.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts`
  -> 17/17 passing.
- `pnpm exec tsx --test src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts
  src/ifc/smartcheck-processing.test.ts` -> 21/21 passing.
- `pnpm exec tsx --test src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts
  src/ifc/smartcheck-processing.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 21/21 passing and 2/2
  HTTP integration tests skipped because local PostgreSQL at `DATABASE_URL` was
  not reachable in this session.
- `pnpm exec tsx --test src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/qto-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts
  src/ifc/smartcheck-processing.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 25/25 passing and 2/2
  HTTP integration tests skipped because local PostgreSQL at `DATABASE_URL` was
  not reachable in this session.
- `pnpm exec tsx --test src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/qto-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts
  src/ifc/smartcheck-processing.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 26/26 passing and 2/2
  HTTP integration tests skipped because local PostgreSQL at `DATABASE_URL` was
  not reachable in this session.
- `pnpm exec tsx --test src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/qto-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts
  src/ifc/smartcheck-processing.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 27/27 passing and 2/2
  HTTP integration tests skipped because local PostgreSQL at `DATABASE_URL` was
  not reachable in this session.
- `pnpm exec tsx --test src/ifc/evidence-policy.test.ts
  src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/qto-extractor.test.ts
  src/ifc/parser/spatial-extractor.test.ts src/ifc/smartcheck-evidence.test.ts
  src/ifc/smartcheck-processing.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 29/29 passing and 2/2
  HTTP integration tests skipped because local PostgreSQL at `DATABASE_URL` was
  not reachable in this session.

### Phase - Verification Blocker Cleanup

Status: completed first pass.

Changes:

- Added the missing `firebase` dependency required by the Academy Firebase data
  helper imports.
- Fixed stale relative imports in Academy certificate/profile components.
- Fixed stale BIMPlan `types` imports and added the missing shared BIMPlan view,
  standard, document, timeline, and poz-code type contracts to `src/types.ts`.
- Explicitly denied the newly suggested `@firebase/util` build script in
  `pnpm-workspace.yaml`.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- `pnpm exec tsx --test src/ifc/evidence-policy.test.ts
  src/smartcheck/import/file-security.test.ts
  src/smartcheck/import/integration-contract.test.ts
  src/ifc/quotation-transfer.test.ts src/ifc/parser-gates.test.ts
  src/ifc/parser/quantity-extractor.test.ts
  src/ifc/parser/qto-extractor.test.ts src/ifc/parser/spatial-extractor.test.ts
  src/ifc/smartcheck-evidence.test.ts src/ifc/smartcheck-processing.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 29/29 passing and 2/2
  HTTP integration tests skipped because local PostgreSQL at `DATABASE_URL` was
  not reachable in this session.
- `git diff --check` passed after each code phase.
- `graphify update .` succeeded after each code phase.

### Phase - Full Verification Harness Cleanup

Status: completed first pass.

Changes:

- Added a shared PostgreSQL reachability test helper for DB-backed route
  integration tests.
- Updated market intelligence, pilot evidence, pricing, regulation impact,
  regulation alerts, source intelligence, and SmartCheck HTTP integration tests
  to skip cleanly when `DATABASE_URL` exists but local PostgreSQL is not
  reachable.
- Removed the SmartCheck evaluation process test dependency on a globally
  discoverable `npm` binary; the child process now launches through the current
  Node executable with the repo-local `tsx` loader.

Verified:

- Targeted harness check:
  `pnpm exec tsx --test src/server/routes/pricing.integration.test.ts
  src/server/routes/market-intelligence.integration.test.ts
  src/server/routes/pilot-evidence.integration.test.ts
  src/server/routes/regulation-impact.integration.test.ts
  src/server/routes/regulations.integration.test.ts
  src/server/routes/source-intelligence.integration.test.ts
  src/server/routes/smartcheck.integration.test.ts
  src/smartcheck/evaluation/cli-process.test.ts` -> 7/7 passing CLI process
  tests and 8 DB-backed tests skipped because local PostgreSQL at
  `DATABASE_URL` was not reachable in this session.
- `pnpm test` -> 333 tests, 325 passing, 8 skipped, 0 failed. The 8 skipped
  tests are DB-backed HTTP integration tests skipped because local PostgreSQL at
  `DATABASE_URL` was not reachable in this session.
- `pnpm run build` -> passed.
- `pnpm lint` -> passed (`tsc --noEmit`).

Not verified / still blocked:

- Browser UI verification, authenticated upload/process route E2E with a real
  local PostgreSQL database, real Graphile worker execution, and database-backed
  review/transfer flow were not completed in this slice.
- The local sample IFC remains untracked under `ifc-document-sample/`.

### Phase - Local Docker PostgreSQL DB-Backed Verification

Status: completed first pass.

Local service setup:

- Docker Desktop was available at `/Applications/Docker.app`, but the `docker`
  CLI was not on `PATH`.
- Started Docker Desktop and used the bundled CLI at
  `/Applications/Docker.app/Contents/Resources/bin/docker`.
- Created `teklifpro-postgres-local` from `postgres:15` with named volume
  `teklifpro_postgres_local_data`, local port `5432`, user `hazarekiz`, and
  database `teklifpro_local`.
- Restored `backups/teklifpro_local_pre_smartcheck_20260719_114911.dump` into
  the new local DB and applied current Drizzle migrations with
  `pnpm exec drizzle-kit migrate --config=src/db/drizzle.config.ts`.
- Post-migration smoke read showed 63 public tables, 35 Drizzle migration rows,
  and the 3 baseline companies from the restored local backup.
- Added local setup notes at `docs/development/local-postgres-docker.md`.

Changes:

- Fixed the SmartCheck IFC HTTP integration fixture so its minimal IFC STEP
  lines match the parser contract for OwnerHistory-backed property sets,
  property relations, storeys, and spatial containment.

Verified:

- DB-backed integration test subset:
  `pnpm exec tsx --test src/server/routes/pricing.integration.test.ts
  src/server/routes/market-intelligence.integration.test.ts
  src/server/routes/pilot-evidence.integration.test.ts
  src/server/routes/regulation-impact.integration.test.ts
  src/server/routes/regulations.integration.test.ts
  src/server/routes/source-intelligence.integration.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 8/8 passing, 0 skipped,
  on the local Docker `teklifpro_local` database.
- `pnpm test` -> 333/333 passing, 0 skipped, with the local Docker DB running.
- `pnpm lint` -> passed (`tsc --noEmit`).
- `pnpm run build` -> passed.

Not verified / still blocked:

- Browser UI verification and real Graphile worker daemon execution were not
  completed in this slice; the worker processor is still invoked
  deterministically by the integration tests.
- The local sample IFC remains untracked under `ifc-document-sample/`.

Next recommended IFC work:

1. Run browser/UI verification for the IFC parser evidence policy cards once a
   local dev server/browser automation target is available.
2. Add a real Graphile Worker daemon smoke to prove queued jobs are picked up
   outside the deterministic in-test processor call.
3. Design deterministic geometry fallback acceptance rules before enabling
   geometry-derived volume/area rows.
4. Design and test a dedicated rebar evidence path before admitting
   `IfcReinforcingBar` quantities into review rows.

### Phase - IFC Browser Parser To Quote Transfer Hardening

Status: completed first pass.

Changes:

- The `/app/ifc-parser` transfer action now stores a compact session payload
  containing only the transfer summary, transfer metadata, and property/QTO
  evidence element count instead of the full parsed IFC element list.
- `/app/quotes/new` now consumes IFC transfer payloads defensively, removes the
  session payload after handling, pre-fills a safe project title/notes, and
  displays a visible "review required / verified değil" transfer notice.
- The legacy IFC estimate transfer helper now tolerates missing/corrupt summary
  inputs and keeps derived rebar/formwork blocked without explicit model
  evidence.

Verified:

- Focused IFC transfer tests:
  `pnpm exec tsx --test src/ifc/quotation-transfer.test.ts` -> 4/4 passing.
- `pnpm lint` -> passed (`tsc --noEmit`).
- `pnpm test` -> 335/335 passing, 0 skipped, with the local Docker DB running.
- `pnpm run build` -> passed.
- Browser automation on an authenticated local dev server confirmed
  `/app/quotes/new` renders after a compact IFC transfer payload, creates 4
  review-required quote rows for the local `e-proje_4x3.ifc` summary, pre-fills
  `IFC Ön Analiz Teklifi`, and shows the 160 property/QTO evidence count without
  product page errors.

Not verified / still open:

- The current browser-parser quote transfer path is still a legacy
  `demo_estimate` path; it does not write SmartCheck DB rows.
- A separate dev-server issue can still surface Vite HMR websocket warnings when
  another local process already owns the HMR port; that is not part of this
  product transfer fix.

### Phase - SmartCheck IFC Upload UI And Worker Review Rows

Status: completed first pass.

Changes:

- `/app/smartcheck` now accepts `.ifc` files in the visible file picker.
- IFC uploads use `model/ifc` when the browser does not provide a MIME type.
- IFC files bypass spreadsheet preview and column mapping, then queue backend
  processing directly after checksum completion.
- The UI now explains that only IFC property/QTO evidence is admitted and that
  geometry estimates, derived formwork, and rebar remain blocked.
- Shared queueing logic is used by both spreadsheet processing and IFC
  processing.
- Local development docs now describe the feature gate plus
  `pnpm smartcheck:worker` requirement for seeing IFC review rows in the UI.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- API + real Graphile worker smoke on local Docker PostgreSQL:
  `e-proje_4x3.ifc` uploaded as `model/ifc`, processing run succeeded, and
  `/api/smartcheck/documents/:id/rows` returned 160 `ifc_property`
  `pending_review` rows.
- Browser automation on `/app/smartcheck` selected
  `ifc-document-sample/e-proje_4x3.ifc`, clicked `IFC yükle ve işle`, and
  confirmed 160 review rows rendered with IFC source references and no
  product page errors.

Not verified / still open:

- End-to-end transfer from DB-backed IFC SmartCheck rows into an actual draft
  quotation was not completed in this slice because rows currently require price
  evidence/correction or accepted-exception review before transfer.
- The local Graphile worker saw stale jobs from older test runs with
  `TENANT_DOCUMENT_RUN_MISMATCH`; new IFC jobs still completed successfully.
  A later maintenance phase can add safe stale/invalid job cleanup tooling.

### Phase - SmartCheck Human Review To Draft Quote Creation

Status: completed first pass.

Changes:

- Confirmed current behavior: SmartCheck does not auto-create a quotation before
  human review. It transfers only `approved` or `accepted_exception` rows.
- Added a backend contract and endpoint for creating a new draft quotation from
  human-reviewed SmartCheck rows:
  `/api/smartcheck/documents/:id/transfer-to-new-quotation`.
- The new endpoint can use an existing `clientId` or create a controlled
  `clientName` record, then creates a draft quotation and transfers selected
  reviewed rows with the same quantity/price evidence records used by the
  existing transfer endpoint.
- `/app/smartcheck` now shows two post-review paths: create a new draft quote
  and transfer, or transfer to an existing draft quote.
- Replaced `window.prompt` review actions with an inline human-review form for
  approve/correct, accepted exception, and rejection decisions.
- Completed queue cards now expose `Sonuçları aç`, so a finished IFC processing
  run can be reopened and its persisted evidence rows can be reviewed without
  re-uploading the file.
- The frontend transfer actions now tolerate empty/non-JSON backend responses
  and show a user-facing toast instead of throwing a blank-page style error.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- Focused contract + HTTP/PostgreSQL SmartCheck tests passed:
  `pnpm exec tsx --test src/contracts/smartcheck.test.ts src/server/routes/smartcheck.integration.test.ts`.
- Browser automation on `/app/smartcheck` with the real local IFC file confirmed:
  completed queue item can be opened, an IFC row can be accepted as a justified
  exception from the inline review form, the post-review transfer panel appears,
  a new draft quotation is created, and `Teklif taslağını aç` opens the quote
  detail page without a blank page.
- Direct local API verification on `http://localhost:3013` confirmed
  `/api/smartcheck/documents/:id/transfer-to-new-quotation` returns `201` with a
  generated `quotationId`, `clientId`, and one transferred IFC item.

Not verified / still open:

- Bulk review / multi-select transfer is not implemented; the current pilot UI
  still reviews rows one by one before transferring all reviewed rows.
- The dev server must be restarted after adding new backend routes; Vite HMR can
  refresh the frontend while the Express route table remains stale.

### Phase - SmartCheck Manual Price Snapshot Seed

Status: completed first pass.

Changes:

- Kept the price catalog evidence-bound: SmartCheck still does not invent prices
  from IFC. The first catalog source path is a user-entered manual price
  snapshot with `manual_override` source provenance.
- `/app/smartcheck` now exposes a post-review "Fiyat kanıtı / katalog tohumu"
  panel where the user can select a reviewed row, enter a unit price/currency,
  optional source name and validity date, then create an advisory price
  snapshot from the existing pricing APIs.
- Newly created manual snapshots are immediately selected for the reviewed row
  so the subsequent quote transfer carries both the snapshot ID and the unit
  price.
- SmartCheck transfer to an existing or new draft quotation now uses the
  selected price snapshot amount as `unitPrice`/default `costUnitPrice` when no
  explicit override is supplied; transferred items are marked
  `priceSnapshotStatus=attached` and `priceSource=snapshot`.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- Focused DB-backed tests passed:
  `pnpm exec tsx --test src/server/routes/smartcheck.integration.test.ts src/server/routes/pricing.integration.test.ts`.
- Direct local API verification on `http://localhost:3013` created a
  `manual_override` source, advisory snapshot, SmartCheck draft quotation, and
  confirmed the transferred item had `unitPrice=4321.00`,
  `priceSnapshotStatus=attached`, and the created `priceSnapshotId`.
- Headless browser verification on `/app/smartcheck` created a manual price
  snapshot from the rendered UI, transferred reviewed IFC rows to a new draft
  quotation, opened the quote detail URL, and confirmed the `2468` price was
  visible.

Not verified / still open:

- CSV/Excel bulk price catalog import UI is not implemented yet; this phase only
  covers manual row-level catalog seeding.
- Automatic fuzzy matching from description/unit/position to best historical
  price is not implemented yet; current UI lists exact/general snapshot options.

### Phase - SmartCheck CSV Price Catalog Import MVP

Status: completed first pass.

Changes:

- Added `POST /api/pricing/catalog/import` for bulk price catalog ingestion.
  The endpoint creates one price source and up to 500 advisory price snapshots
  in a single transaction; it rejects official-reference imports from this
  user-controlled path and never creates approved snapshots directly.
- Bulk imports keep tenant boundaries: imported snapshots are scoped by
  `companyId`, duplicate snapshot keys under the same source are reused, and
  import audit metadata is recorded.
- Hardened pricing date parsing with a bounded year range so malformed browser
  date values cannot crash Postgres timestamp insertion.
- `/app/smartcheck` now exposes CSV price catalog import independent of reviewed
  metraj rows, with both CSV file selection and paste-from-Excel/CSV text input.
  Turkish CSV headers such as `Poz No`, `Açıklama`, `Birim`, `Birim Fiyat`,
  `Para Birimi` are normalized correctly.
- Imported catalog rows appear as advisory price snapshots; users still decide
  which snapshot to attach to reviewed SmartCheck rows before quote transfer.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- Focused DB-backed pricing tests passed:
  `pnpm exec tsx --test src/server/routes/pricing.integration.test.ts`.
- Headless browser smoke on `http://127.0.0.1:3013/app/smartcheck` pasted a
  Turkish-header CSV price row, imported it through the rendered UI, and
  confirmed via `/api/pricing/snapshots?positionCode=M-BROWSER-001` that one
  advisory snapshot was created with `amount=12500.5`.

Not verified / still open:

- Native XLSX price catalog import is still not implemented; the MVP supports
  CSV file or pasted CSV/Excel text.
- Automatic fuzzy matching from imported catalog rows to IFC/SmartCheck rows is
  still the next logical phase.

### Phase - SmartCheck Price Snapshot Suggestions

Status: completed first pass.

Changes:

- Added a tenant-scoped read-only `POST /api/pricing/snapshot-suggestions`
  endpoint. It evaluates up to 100 reviewed SmartCheck rows against the tenant's
  advisory/approved price snapshots and returns ranked suggestions without
  mutating quotation prices.
- Added deterministic price matching rules:
  exact position + normalized unit is a high-confidence safe candidate;
  description + normalized unit can become a fuzzy/strong advisory candidate;
  position matches with unit mismatch are returned as `review_required` with an
  explicit `UNIT_MISMATCH` warning.
- Normalized common Turkish/BIM pricing units including `Ad.`, `mt`, `m²` and
  `m^3`, and added light Turkish suffix stemming so descriptions like
  `Bakır tesisat borusu` can match `Bakır boru` without inventing a price.
- `/app/smartcheck` now lets the reviewer fetch price suggestions after row
  approval, inspect match confidence/source/warnings per row, manually select a
  suggested snapshot, or bulk-apply only uyarısız high-confidence suggestions.
- CSV catalog import clears stale suggestion UI state so users explicitly
  refresh suggestions after adding new price evidence.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- Focused deterministic pricing test passed:
  `pnpm exec tsx --test src/smartcheck/pricing/snapshots.test.ts`.
- DB-backed pricing integration passed against local Docker Postgres:
  `pnpm exec tsx --test src/server/routes/pricing.integration.test.ts` -> 2
  tests, 2 pass, 0 skipped.
- Headless browser smoke on `http://127.0.0.1:3013/app/smartcheck` registered a
  temporary verified workspace, uploaded and processed a CSV SmartCheck file via
  the real worker, approved the resulting row, imported a matching advisory
  price catalog, fetched price suggestions from the rendered UI, displayed a
  `Güvenli aday`, and bulk-applied the selected snapshot.
- Full test suite passed:
  `pnpm test` -> 337 tests, 328 pass, 0 fail, 9 skipped.
- Production build passed:
  `pnpm run build`.

### Phase - SmartCheck Suggested Price Transfer Smoke

Status: completed.

Verified:

- Headless browser smoke on `http://127.0.0.1:3013/app/smartcheck` seeded a
  temporary verified tenant, uploaded and processed a CSV SmartCheck file via
  the real worker, approved the row, imported a matching advisory catalog
  snapshot, fetched/applied the UI `Güvenli aday`, created a new draft quote
  from the rendered UI, opened the quote detail page, and verified the project
  name rendered without a blank page.
- Direct DB verification after the UI transfer confirmed the generated
  quotation item kept the SmartCheck row provenance and selected price evidence:
  `sourceQuantityRowId` matched the reviewed row, `priceSnapshotId` matched the
  suggested snapshot, `priceSnapshotStatus="attached"`, and `unitPrice=12500`.
- Temporary smoke users/companies with `smartcheck-transfer-*` and
  `smartcheck-suggestion-*` prefixes were checked and cleaned after the run.

Not verified / still open:

- This smoke used CSV SmartCheck rows as the fast worker-backed path. The same
  suggested-snapshot transfer behavior is now also covered with the user's
  larger IFC sample in the next phase.

### Phase - SmartCheck IFC Suggested Price Transfer Smoke

Status: completed.

Verified:

- Headless browser smoke used the real local
  `ifc-document-sample/e-proje_4x3.ifc` file through the SmartCheck HTTP upload
  and worker path. The worker completed successfully and returned 160 admitted
  IFC evidence rows.
- The selected IFC row was `IFC-SLAB-CONCRETE`, unit `m³`, quantity source
  `ifc_property`, quantity `0.0174`. Because the row had 2 open IFC policy
  findings, the smoke used explicit `accepted_exception` review before transfer
  rather than silently approving it.
- A tenant-scoped advisory price catalog snapshot was imported for the selected
  IFC row's position/unit, the rendered SmartCheck UI displayed a
  `Güvenli aday`, bulk-applied it, created a new draft quote, and opened the
  quote detail route without a blank page.
- Direct DB verification confirmed the quote item preserved IFC row provenance
  and the selected advisory price evidence: `sourceQuantityRowId` matched the
  IFC row, `priceSnapshotId` matched the suggested snapshot,
  `priceSnapshotStatus="attached"`, and `unitPrice=3210`.
- Temporary smoke users/companies with `smartcheck-ifc-transfer-*`,
  `smartcheck-transfer-*`, and `smartcheck-suggestion-*` prefixes were checked
  and cleaned after the run.

Not verified / still open:

- The quote detail page rendered the generated project name, but the raw `3210`
  price text was not asserted from the page because visible formatting can vary.
  Price correctness was verified directly from the database item record.

### Phase - SmartCheck Workflow Summary UI

Status: completed first pass.

Changes:

- Added an `Operasyon özeti` strip to `/app/smartcheck` so users can see the
  current workflow gate before taking the next action.
- The summary shows four human-controlled gates: evidence rows, human review,
  price evidence, and draft quotation.
- The next-action text is derived from the current state and keeps the key pilot
  rule visible: SmartCheck can suggest or attach price evidence, but it does not
  invent final prices.
- The UI now counts open findings, pending reviews, matched/safe price
  suggestions, and selected price evidence.

Verified:

- `pnpm lint` -> passed (`tsc --noEmit`).
- `pnpm run build` -> passed.
- Headless browser smoke on `http://127.0.0.1:3013/app/smartcheck` with a
  temporary verified tenant confirmed the rendered UI contains
  `Operasyon özeti` and all four workflow steps.

Not verified / still open:

- Browser smoke covered the initial/empty workflow state. A second visual pass
  with a populated 160-row IFC run would still be useful for spacing and
  copy-density checks, but the populated IFC transfer behavior was already
  verified in the previous phase.

### Phase - SmartCheck Safe Bulk Review

Status: completed first pass.

Changes:

- Added a tenant-scoped bulk review endpoint:
  `/api/smartcheck/documents/:id/bulk-review`.
- Bulk review is intentionally narrow: it only accepts `status=approved`, only
  for rows in `pending_review`, and blocks any row with open findings.
- `/app/smartcheck` now shows a `Bulgusuzları toplu onayla` action in the
  operation summary so clean CSV/XLSX rows can move through review faster.
- IFC rows with missing price/source-policy findings still require explicit
  row-level correction or justified exception before transfer.

Verified:

- `pnpm exec tsx --test src/contracts/smartcheck.test.ts
  src/server/routes/smartcheck.integration.test.ts` -> 4/4 passing against
  local Docker PostgreSQL, including tenant-boundary checks and the IFC
  open-finding bulk-review block.
- `pnpm lint` -> passed (`tsc --noEmit`).
- `pnpm run build` -> passed.
- Headless browser smoke on `http://127.0.0.1:3014/app/smartcheck` with a
  temporary verified tenant/document confirmed the rendered bulk-review button
  approved only the bulgusuz row and left the bulgulu row in `pending_review`.

Not verified / still open:

- The browser smoke used a seeded two-row document for speed. A later populated
  160-row IFC visual pass is still useful for spacing/performance, but IFC rows
  with policy findings are deliberately excluded from bulk approval.

### Phase - 2026-08-21 UX Production-Readiness Pass + First Customer Simulation

Status: paused mid-session by user request ("ara verelim biraz" — take a break).
This section is the handoff for continuing next session.

Branch: `feat/smartcheck-evaluation-baseline`. All work below is pushed to the
existing Draft PR `#1` (https://github.com/hazarvolga/TeklifPro/pull/1) —
never created a new PR, always pushed incrementally to update it.

#### Completed and committed this session

1. Full UX/IA audit (via `/frontend-developer`) → fixed mock-data dashboards,
   fake stats, dead controls, guest-login fallback masking real auth failures,
   `window.confirm` usage, missing 404/error boundary, nav taxonomy
   (`refactor(nav)`, `a18cefa`, `04de039`, `3c0bb72`, `fdd1a43`, `342a70a`).
2. `cedac47 feat(ifc): read Tr_Pset_CSB property set for e-PYS regulation
   readiness` — IFC parser now extracts PozNo/TAKS/KAKS/ÇekmeÖn/ÇekmeYan per
   the draft Turkish e-Proje-Teslim regulation
   (`E-Proje-Teslim/ozet.md`, effective 01 Ekim 2026). This directly matters
   because the app's "5 dakikada 2D ön-keşif" marketing claim needs real data
   backing once the regulation is enforced — this feature is the first step,
   not a full compliance solution.
3. `e5d13b1 feat(pilot): auto-provision company/user account on pilot
   conversion` — `/pilot` funnel now has a real "convert application to
   account" path (`POST /api/pilot-applications/:id/convert`), reusing the
   existing `authActionTokens` password-set flow. Full integration test at
   `src/server/routes/pilot.integration.test.ts`, passing against real
   Postgres.
4. `ac0c81e feat(ifc): replace flat 1000+ row element list with grouped
   review summary` — `/app/ifc-parser`'s element table was unreviewable at
   1180 rows on the real sample file; now grouped by IFC type (max 5 groups)
   with drill-down. Plan file (now stale/complete):
   `~/.claude/plans/temporal-kindling-marshmallow.md`.

#### First-customer simulation — completed and verified, not a code change

Ran `/private/tmp/claude-501/.../scratchpad/seed-first-customer.mjs`
(scratchpad only, not committed — script content is in the prior session
transcript if it needs to be re-run) against real local Postgres:

- Public pilot form → admin converts → real company/user/membership/
  subscription provisioned → customer sets password via existing
  reset-password flow → customer logs in for real
  (`mehmet.aydin@aydinyapi.example.com` / `AydinYapi2026!`,
  company "Aydın Yapı İnşaat Ltd. Şti.").
- Customer created 3 real CRM clients, 3 real quotations with realistic
  construction line items (concrete, rebar, formwork, brick, steel structure,
  insulation), moved through real status lifecycle (draft/sent/won).
- Verified live in browser: Dashboard aggregates, Quotes list, QuoteDetail's
  AI Financial Intelligence panel (real computed margin: Toplam Maliyet
  3.616.218 TRY, Brüt Kâr 926.732 TRY, Kâr Marjı %20,4 — not a placeholder),
  Clients list, and the Kârlılık Analizi aggregate page. All render correct,
  non-mocked data end to end.
- Confirmed working-as-intended (not a bug): unauthenticated `/app/pilot-
  applications` 401s without a forced redirect loop, per the Faz 2 session-
  expiry fix.

#### New bugs discovered during this deep real-data testing — ALL 5 FIXED

User said (2026-08-21): "sen karar ver, her başarılı adımdan sonra commit
ederek ilerleyelim, temiz bir git yapımız olsun" — agent decided fix order,
one commit per successfully-verified fix. All 5 are now done, each its own
pushed commit on `feat/smartcheck-evaluation-baseline`:

1. **`aad9ab0` fix(auth): provision membership on invite accept and fix
   null-check bug** — `POST /api/invitations/:token/accept`
   (`src/server/routes/company.ts`) never inserted into `memberships`, so an
   accepted invite left the user authenticated with `companyId: null, role:
   null`. A second, independent bug in the same handler: both the lookup and
   accept queries used `eq(invitations.acceptedAt, null)`, which compiles to
   `= NULL` in Postgres (always false) instead of `IS NULL` — invite lookup
   could never match any row. Fixed both; added
   `src/server/routes/company-invitation.integration.test.ts` (new file, 0
   prior invite-accept coverage existed) covering same-second issuance,
   duplicate accept, expired invite, and the loose `invitations.role`
   ("member", not a valid membership role enum value) falling back safely to
   `"viewer"`.
2. **`b8ae87e` fix(auth): stop false session-expiry on same-second password
   reset** — `src/server/middleware/auth.ts:29` compared JWT `iat` (second
   precision) directly against `passwordChangedAt` (ms precision); floored
   `passwordChangedAt` to the same second before comparing. New test:
   `src/server/middleware/auth.integration.test.ts`.
3. **`06b1be2` fix(academy): stop /app/academy/certificates crashing on
   load** — `AcademyCertificatesPage.tsx` never passed `examAttempts` to
   `CertificatesViewer` (and passed a nonexistent `onVerifyCertificate` prop
   instead of `onUpdateTrainee`), so `examAttempts.reduce(...)` threw on
   every load. Root-caused via an Explore agent that also flagged this was
   invisible to `tsc` because `@types/react` was missing (see #5).
4. **`7ddc908` feat(crm): add deal creation endpoint and wire the "Yeni
   Fırsat" flow** — `POST /api/crm/deals` did not exist anywhere
   (`grep -r "insert(deals)"` was zero matches); added a tenant-scoped
   creation endpoint plus a create-deal dialog on `/app/crm`, wired to both
   the header button and the empty-pipeline CTA. Verified live: created a
   real deal against a seeded client, confirmed it renders in the Lead
   column with the correct value. Still open/not wired (flagged, not
   fixed): the per-lead "FIRSATA DÖNÜŞTÜR" (lead→deal convert) button, the
   per-stage-column "KART EKLE" quick-add, and the "Yenİ Lead Ekle" card are
   all still dead no-op buttons on `/app/crm` — separate follow-up.
5. **`29291b1` fix(types): install @types/react and fix the 10 latent bugs
   it exposed** — installed `@types/react`/`@types/react-dom` (React 19
   versions). This surfaced exactly 10 `tsc` errors, all genuine bugs, none
   noise: `Lock` icon used but never imported in `StudentProfile.tsx`
   (silently resolved to the ambient DOM lib's unrelated global `Lock`
   interface); `TechnicalPanel` didn't forward the `id` prop 4 call sites
   were already passing; `AcademyProfilePage.tsx` passed nonexistent
   `onSelectLesson`/`onViewCertificate` props to `StudentProfile` and
   omitted the two actually-required ones (`lessonTimes`, `onUpdateTrainee`)
   — the missing `lessonTimes` crashed `/app/academy/profile` on every load
   with `Object.values(undefined)`, same bug class as #3 on a sibling page;
   `CreateQuote.tsx`'s demo template used `costCategory: "service"`, not a
   member of the real 5-value union (fixed to `"labor"`); `LessonViewerPage`
   was missing `AIBIMCompanion`'s `courseTitle` and `CADDiagramViewer`'s
   `lessonTitle`. Verified 0 `tsc` errors, full suite, build, and live
   browser checks on all three previously-broken pages.

New, separate finding surfaced while verifying #5 in the browser (not
fixed, flagged only): `CADDiagramViewer.tsx`'s `/api/lesson-diagram` fetch
(`src/components/academy/CADDiagramViewer.tsx:47-58`) 500s locally (almost
certainly a missing local Gemini API key) and then throws
`SyntaxError: Unexpected end of JSON input` trying to `res.json()` an empty
error body — caught by the component's own try/catch, so it degrades
gracefully to an "OFFLINE CAD MATRIX" fallback rather than crashing the
page, but the fetch call should still check `res.ok` before parsing JSON.

#### Local environment notes (this session, reusable)

- Docker Postgres: container `teklifpro-postgres`, image `postgres:16`, env
  `POSTGRES_USER=hazarekiz POSTGRES_DB=teklifpro_local
  POSTGRES_HOST_AUTH_METHOD=trust`, port 5432 — matches `.env.local`'s
  `DATABASE_URL=postgres://hazarekiz@localhost:5432/teklifpro_local`.
- **Critical**: the 36 tracked Drizzle migrations are deltas against a
  baseline that was never itself captured as a migration. Fresh-DB bootstrap
  order: restore
  `backups/teklifpro_local_pre_smartcheck_schema_20260719_114911.sql` first
  (schema-only `pg_dump`), THEN run `drizzle-kit migrate`. Migrating from
  empty fails with `relation "memberships" does not exist`.
- `tsx server.ts` (dev command, no `--watch`) does not hot-reload backend
  Express route changes — Vite HMR only covers the frontend. After editing
  anything under `src/server/`, do a `preview_stop`/`preview_start` cycle (or
  restart the process) before testing new/changed routes in the browser.
- `.claude/launch.json` has the `teklifpro-dev` preview config (port 3000,
  `autoPort: true`).

#### Untracked files present in git status — not part of this session's work, do not commit blindly

`E-Proje-Teslim/`, `e-proje_4x3.ifc` (39MB sample IFC, user-provided),
`graphify-out/2026-08-02/`, `ifc-document-sample/`. These predate/are
separate from the fixes above — stage explicit file lists for the invite-
accept fix and later work, never `git add -A`.

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

### UX Rearchitecture: Iceberg Model & Premium SaaS Approach
As of 2026-10-08, the project has formally adopted the "Iceberg UX" (Buzdağı Modeli) strategy for all user-facing flows:
- **Design:** Apple/Stripe-tier premium SaaS UI with extensive whitespace, clean typography, and micro-interactions. No more raw Excel grids or complex dashboard clutter.
- **Flow:** Simple, wizard-like (tunnel) processes. E.g., the IFC Quote process is now a strict 4-step wizard: Upload -> Review (SmartCheck) -> Price -> Quote.
- **Hidden Power:** Advanced BIM features (3D viewing, SmartCheck rules, ISO 19650 compliance) are completely hidden under the hood. They are only exposed contextually via slide-over panels or tooltips when action is required (e.g., "3 elements missing POZ numbers").
- **Implementation Status:** The IFC parser flow is now fully migrated to this paradigm (`DosyadanTeklifDemo.tsx`), connected to the real `legacy-parser`, and routes properly to `/app/quotes/new` for final Drizzle insertion.

## 2026-10-08 Current-State GAP Rebaseline

The repository-wide GAP report was refreshed at
`docs/GAP_RAPORU_2026-10-08.md` against commit `74e52f4`.

Current decision:

- Local development remains viable; local `/api/health` returned 200 with the
  TeklifPro PostgreSQL database connected.
- Customer pilot, production release and Next.js/NestJS strangler cutover are
  NO-GO until the report's P0 gates are closed.
- `pnpm run build` and Drizzle metadata check passed.
- `pnpm run lint` failed with 14 TypeScript errors.
- The full test run reported 349 tests: 344 passed, 4 failed and 1 cancelled.
  Registration DTO and super-admin pilot-conversion contract failures were
  reproduced in isolation. SmartCheck HTTP integration also failed on the
  local Graphile Worker schema and did not terminate cleanly.
- `pnpm audit --prod` reported 65 advisories: 1 critical, 32 high, 27 moderate
  and 5 low.
- Primary P0 themes: release gates, auth/membership verification, fresh-DB
  migrations, quotation transactionality, PDF renderer isolation, quota
  integrity, invitation security, reproducible app/worker deployment and real
  five-file/S3/reviewer pilot evidence.

No application code, production service or database data was changed during
the GAP analysis. The recommended next step is report Phase 0: restore a green
lint/test baseline before feature expansion.
