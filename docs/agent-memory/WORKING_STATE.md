# Working State: BIMMetraj

Last updated: 2026-10-27. Keep this file to one page: current truth only. Move
history to `archive/` (latest: `archive/WORKING_STATE_until_2026-10-24.md`).

## Production

- `https://bimmetraj.com` on Coolify (app `ibjv2zbpecdcbd71lxo1vqd7`), Docker
  Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`, `migrate`,
  `backup`. Vercel files are legacy.
- **Live revision: `389446b` + Rev. 101 (`BIM-CALC-2026-10-27.95`), deployed 2026-10-27:**
  `/api/health` returns `status: ok`, `db: connected`, `revisionSource: build`
  and all readiness flags true. Release migrations `0022..0029` are applied in
  `bimmetraj_production`; all 5 containers (`app`, `worker`, `ifc-worker`,
  `backup`, `postgres`) are `Up` and healthy. Worker control-plane isolation
  (`D12`: `requireControlDatabase: false`) and live IFC worker quota completion
  (`D13`: `lockedIfcUsage` using `bimmetraj_worker_get_company_context`) are
  verified against 3 live IFC uploads (`ssss.ifc`, `Ifc4_SampleHouse_0_GroundFloor.ifc`,
  `Ifc4_SampleHouse_1_Roof.ifc` → `succeeded` / `awaiting_review`).
- The Rev. 72 deploy runs the role setup itself: `db-bootstrap` → `migrate` →
  `db-provision` (`compose.coolify.yaml`, `docs/operations/database-role-model.md`).
  The manual cutover runbook in `HANDOFF_2026-10-24_DEPLOY_CUTOVER.md` is now
  history.
- Secret rotation after the 2026-10-24 Developer View exposure (S3/backup keys,
  SMTP, PostgreSQL service password, JWT secret): **done by Hazar, 2026-10-25**.
- **Not yet confirmed after the cutover (Hazar):** `scripts/role-model-smoke.ts` against production;
  login/tenant/worker/IFC worker smoke; a backup → restore drill on the new role
  model; worker canary/drain followed by the authority-table ACL revoke (T41).
  Do not open Developer View again.
- Merging never deploys. Run `scripts/require-green-ci.sh <sha>` before Deploy.
  Before pressing Deploy, run `scripts/release-preflight.sh` (read-only): it lists
  unmerged/unpushed local branches, dirty worktrees, open PRs, checks CI on
  `origin/main` and prints how many commits live is behind main. It exits 1 when
  work is pending; `--allow-pending` only warns.

## Code (main / working branch)

- **Rev. 104 (`BIM-CALC-2026-10-27.98`) — Full 6-Phase Security Audit Remediation & Defense-in-Depth Hardening:**
  Closed all 5 validated findings (2 HIGH, 2 MEDIUM, 1 LOW) and 8 defense-in-depth hardening items from the `"standard"` profile security audit:
  1. **Academy Admin Enrollment Gate (`[HIGH]`):** `/api/academy/allplan/admin/enrollments` routes now require `requireVerifiedEmail`, `checkSuperAdmin()`, and `isAcademyRuntimeEnabled()`.
  2. **Progress Payment Two-Person Maker-Checker (`[HIGH]`):** `ProgressPaymentService.transition('approve')` rejects approval when `actor.userId` equals `submitted_by_user_id`, `created_by_user_id`, or any `progress_measurements.created_by_user_id`, and `correct()` preserves the original `created_by_user_id`.
  3. **CDE Workspace & Project Role Boundary (`[MEDIUM]`):** Added `createProjectRole` (`owner`/`admin`/`manager`) to CDE `POST` mutation routes and prevented workspace `viewer` members from holding non-`viewer` CDE roles.
  4. **Source & Market Intelligence Maker-Checker (`[MEDIUM]`):** Enforced two-person review (`run.requestedByUserId !== userId`, `snapshot.createdByUserId !== userId`, `submission.createdByUserId !== userId`), required non-empty review notes, and blocked approving `restricted` price sources.
  5. **Tenant Filter on `pilotApplications` (`[LOW]`):** Scoped `pilotApplications` count query in `GET /api/company/risk-calibration` by `provisionedCompanyId`.
  6. **Defense-in-Depth Hardening:** Blocked unverified-email `isSuperAdmin` auto-promotion on registration; forced `readOnly: true` and blocked mutating HTTP methods on impersonation sessions; replaced manual `x-forwarded-for` split with `clientAddress(req)` in `pilot.ts`; bounded `kati(e)` and `iter_pset_single_values` cycles + added `RLIMIT_AS`/`RLIMIT_CPU` in IFC workers; bounded `zlib.inflateSync` (`maxOutputLength: 16 MiB`) and temp file creation (`randomUUID`, `0o600`) in `csb-pdf-parser.ts`; enforced 128 KB input byte cap on `GeminiProvider` and stopped `AIProviderRouter` fallback on `AI_INPUT_TOO_LARGE`; applied minimal child-process `env` allowlists; removed `JWT_SECRET` from `worker` container (`requireControlDatabase: false`); and restricted `bimmetraj_worker` ACLs in `DATABASE_PUBLIC_RESTRICTED_TABLE_ACL`.
- **Rev. 103 (`048495f`, `BIM-CALC-2026-10-27.97`) — `/admin/pricing-sources`, Crawler & TÜİK SDMX 2.1 Integration:**
  `GET /api/admin/pricing-sources` auto-seeds `canonicalPricingSources` (`csb_yfk_2026`, `epys_ek6`, `market_concrete_marmara`, `market_steel_karabuk`, `tuik_ime`) when the table is empty, and `POST /api/admin/pricing-sources/sync-catalog` restores any missing canonical sources. Fixed `getOfficialCatalogCoverageReport` schema fields (`ingestedRowCount`, `totalRowsInBook`, `sha256`, `totalBooks`, `fullCoverageBooks`, `totalIngestedRows`) so Tabs 2 and 5 on `/admin/pricing-sources` render without error. Source verification, sealed catalog imports, staging reviews, and live crawls now populate `authorizationStatus = 'authorized'` and a 64-hex SHA-256 `authorizationEvidenceHash`, and `canApproveCrawlerPrice` accepts `row >= 1` plus `[licensed-pdf-v1]`, `[official-csb-catalog-v1]`, and `[tuik-sdmx-v1]`. Fixed `isPublicAddress` IPv6 global unicast (`2001::/16` allowed while `2001:db8::/32` and `2001:0::/32` remain blocked), validated HTTP redirects (up to 3 hops), and `gzip`/`deflate`/`br` decompression in `safe-fetch.ts`. Added `src/server/crawler/tuik-sdmx-adapter.ts` + UI modal supporting TÜİK Veri Portalı SDMX 2.1 (`DF_IME`, `DF_YI_UFE` 20 NACE Rev.2 sub-indices, `DF_TUFE` via SDMX-JSON 1.0/2.0, SDMX-CSV, or NSIWS OAuth2 REST).
- **Rev. 102 (`285dbcc`, `BIM-CALC-2026-10-27.96`) — 4-Layer Contractor Excel Multi-Archetype Adapter:**
  Supports `flat_table`, `multi_header_pivot`, `repeating_block_boq`, and `hybrid_summary_and_blocks` across SmartCheck & Quote Excel import; `ignoreNodes: ['mergeCells']` + span expansion cuts 13,626-row / 46,588-merge V6 parse time from 90s to 468ms; corpus scanner (`npm run excel:corpus`) and `src/smartcheck/import/contractor-excel-corpus.test.ts` (5/5 PASS) added.
- **Rev. 91–95 merged to `main` on 2026-10-27 (`78bf661`), deployed in Rev. 101.**
  PRs #21–#25 were merged top-down with merge commits (#25→#24→#23→#22 into
  their bases, then #21 into `main` after the combined CI passed). `main` now
  holds the expert preview + feedback, Faz 0 trust fixes (release 0028), Faz 1
  Excel-first / one entry / new quotation vs revision, the catalogue wizard and
  missing-price actions, contractor profit and overhead (release 0029) and the
  .xlsx exports. Live is still Rev. 72 (`f474e99`): a deploy must run
  0022–0029 with the app (checklist:
  `docs/operations/UZMAN_ONIZLEME_DEPLOY_VE_GERI_BILDIRIM_2026-10-26.md`; set
  `EXPERT_FEEDBACK_EMAIL`). Product plan and per-slice status:
  `docs/plans/URUN_YOL_HARITASI_MARKA_UZMAN_ONIZLEME_2026-10-26.md`.
  Verified before merge: full suite on a fresh PG16 with 0000–0029 (`1515`
  tests, `1500` PASS, `0` FAIL, coverage gate PASS), combined CI on #21 green,
  real-browser smokes `scripts/faz0-trust-ui-smoke.ts`,
  `faz1-excel-flow-smoke.ts`, `faz1-price-gap-smoke.ts`. Not verified: live
  data, expert review of the profit/overhead method. The CI image build now
  frees runner disk first (it failed twice with Errno 28). Old branches
  `feat/expert-feedback`, `feat/faz0-guven`, `feat/faz1-*` can be deleted.
  Rev. 96 (branch `feat/faz1-proje-turu`): KİK/4735 tools only for public
  tenders, "Gelişmiş" section on the quote form, CI T45 bundle step and runner
  disk cleanup (merged as #26, `03d41a1`). Rev. 97 (branch
  `feat/faz1-teklif-tablosu`): basic/detailed quote items table with row detail,
  `CreateQuote.tsx` split to 711 lines (`src/components/quote/`; merged as #27,
  `5ddcf27`). Rev. 98 (branch `feat/faz1-fizibilite`): parcel feasibility on
  `/app/arsa-fizibilitesi`, no errors on an untouched form (PR #28).
  Rev. 99 (branch `feat/faz1-demo`): public SmartCheck demo reordered to
  problem → source row → finding → fix → offer impact, m²→m³ example fixes the
  quantity, signed-out exit to `/` and `/register`. Demo data is duplicated in
  `demoData.ts` and `SmartCheckDemoContext.tsx` (context copy is live). PR #28
  and #29 merged (`67484bd`, `fb69c07`).
  Rev. 100 (branch `feat/faz1-firma-katalog`): manual quote lines can be picked
  from the company price catalogue (`CompanyCatalogPicker`); the server binds
  them to the approved snapshot via `resolveCatalogProvenance` (same rules as
  Calm transfer) and writes price evidence; editing price/unit/VAT drops the
  link client-side. Bound quotes stay non-editable in the form (existing rule).
  Rev. 101 (`189ee22`, `BIM-CALC-2026-10-27.95`): live production deployment of
  0022..0029 + worker control-plane isolation (`D12`) & `lockedIfcUsage` worker
  entitlement fix (`D13`).
  Rev. 102 (`BIM-CALC-2026-10-27.96`): 4-layer Turkish Contractor Excel Adapter
  (`flat_table`, `multi_header_pivot`, `repeating_block_boq`, `hybrid_summary_and_blocks`)
  with `ignoreNodes: ["mergeCells"]` (192x speedup on 46,588-merge workbooks),
  visual archetype/tableMode/row-click mapping + custom company template memory in
  `SmartCheckImportWorkspace.tsx`, and extensible corpus scanner (`npm run excel:corpus` /
  `scripts/inspect-contractor-excels.ts` + `src/smartcheck/import/contractor-excel-corpus.test.ts` `5/5 PASS`).
  Next: Faz 1 remainder (CalmIfcWorkspace / SmartCheckImportWorkspace split,
  demo data de-duplication), then the three-persona acceptance run.
- CI: the job runs with `NODE_ENV=test` (React development build). The T45
  bundle gate runs in its own production-build step (`REQUIRE_PRODUCTION_BUNDLE=true`).
- Latest roadmap revision: **Rev. 90** (`BIM-CALC-2026-10-25.84`): Faz 7 `T43` R+2..R+4 coverage ratchet closed (`src/pages/t43-ui-pages-and-components.test.ts` `6/6 PASS`, `src/pages/Dashboard.tsx` `D11` React Rules-of-Hooks fix, `coverage-thresholds.json` ratcheted to `project` lines **`82.58%`** floor `82%` / branches `75.01%` floor `75%` / functions `71.41%` floor `71%` and `UI` lines `74.77%` floor `74%`, `1427/1434` tests PASS, `0` FAIL) & Faz 11 `T56` complete traceability and final evidence matrix (`docs/audits/phase-11/final-evidence-matrix.json`, `docs/audits/phase-11/PHASE_11_T56_FINAL_EVIDENCE_MATRIX_2026-10-26.md`, `src/contracts/t56-final-evidence-matrix.test.ts` `3/3 PASS` binding `56/56` To-Do items [`39` `[x]` + `13` `PARTIAL` + `4` external-only], `31/31` audit IDs, `6/6` calculation engines, and `11` production defects `D01–D11`).
  Rev. 89 (`BIM-CALC-2026-10-25.83`): Faz 10 T53 source-backed market inventory & T54 comparable 6-stage capability matrix (`docs/audits/phase-10/market-inventory-register.json`, `docs/audits/phase-10/PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md`, `src/contracts/t53-t54-market-inventory.test.ts` `4/4 PASS`, and `scripts/phase-0-evidence-validator.test.ts` `23/23 PASS`; 12 products evaluated with `unverified_publicly` vs `pilot_l2_unapproved` discipline and `singleClaimPermitted = false` until `T50–T52` & `T55` legal review).
  Rev. 88 (`BIM-CALC-2026-10-25.82`): T45 performance & operating budget (`src/server/config/performance-budgets.ts` `BIM-PERF-2026-10-26.1` pre-registered budgets, `src/lib/quote-xlsx.ts` + `CreateQuote.tsx` dynamic import + `vite.config.ts` `manualChunks`/`modulePreload` isolating `940 kB` `exceljs` from `CreateQuote-*.js` `49.67 kB` and `index-*.js` `106.47 kB ≤ 120 kB`, and `src/contracts/t45-performance-budget.test.ts` `5/5 PASS`: 1,000-row XLSX + `256 MB` isolated worker `1,489.98 ms ≤ 2,500 ms` + `SPREADSHEET_BUSY` recovery, 20-request concurrent multi-tenant PG16 `p95 = 21.90 ms ≤ 250 ms`, queue claim `3.78 ms ≤ 150 ms`, Sentry PII scrub `p95 < 1 ms ≤ 5 ms`, AI router failover `< 5 ms ≤ 50 ms`).
  Rev. 87 (`BIM-CALC-2026-10-25.81`): T43 R+1 coverage ratchet (`project` lines `46.80% → 53.04%` floor `52%`, `HTTP API routes` lines `54.26% → 81.31%` floor `80%`, `1409/1416` tests PASS via `t43-route-ratchet.integration.test.ts`, `catalog-and-templates-integrity.test.ts`, `tenant-context.test.ts`, `control-plane.test.ts`) + 3 production bugs fixed in `auth.ts` (`login`/`me` tenantless Academy learner profile read via `getControlDatabase().db`) and `admin.ts` (`sync-catalog` `admin_audit_logs` insert outside control tx + `reports/usage` `topConsumers` via `getControlDatabase().db`).
  Rev. 86 (`BIM-CALC-2026-10-25.80`): T44 5-pillar recovery drill (`src/contracts/t44-recovery-drill.pgtest.ts` 1/1 PASS: worker crash/reclaim, poison DLQ quarantine, `bimmetraj_backup` `pg_dump --enable-row-security` + `pg_restore` `dumpDurationMs: 136 ms` / `restoreDurationMs: 351 ms`, failed migration atomic rollback + catalog signature verification, and `/api/health/ready` `503 SERVICE_DEGRADED` → `200 OK` recovery) + `companies_worker_capability_read`/`subscriptions_worker_capability_read` FORCE RLS policies + `deploy/backup/backup.py --enable-row-security` + `postgres:restore-drill:verify` (`28` migrations, `85` tables, `20` enums).
  Rev. 85 (`BIM-CALC-2026-10-25.79`): T41 S5 (`DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES` & `DATABASE_PUBLIC_RESTRICTED_TABLE_ACL`) — 5 authority, audit, and quota tables (`memberships`, `invitations`, `pilot_applications`, `admin_audit_logs`, `usage_records`) locked under exact least-privilege ACLs (`72/72` `company_id` tables classified and verified in `tenant-business-rls.pgtest.ts`: 67 `FORCE RLS` + 5 `Exact-ACL`).
  Rev. 84 (`BIM-CALC-2026-10-25.78`): T41 S3 (`0027_smartcheck_pipeline_rls`) — 4 SmartCheck pipeline tables (`documents`, `document_processing_runs`, `document_processing_artifacts`, `normalized_quantity_rows`) under FORCE RLS (`67/72` `company_id` tables under FORCE RLS); `withSuperAdminQueueRead` and `getControlDatabase().db` for `/api/admin/queue` & `/api/admin/dashboard`.
  Rev. 83 (`BIM-CALC-2026-10-25.77`): T41 S4b (`0026_academy_control_rls`) — 6 Academy control-plane & certificate tables under FORCE RLS (`63/72`).
  Rev. 82 (`BIM-CALC-2026-10-25.76`): T41 S4a (`0025_allplan_learner_rls`) — 7 Allplan learner tables under FORCE RLS (`57/72`).
  Rev. 81 (`BIM-CALC-2026-10-25.75`): T41 S2 (`0024_pricing_regulations_rls`) — 8 pricing, source intelligence, and regulation tables under FORCE RLS (`50/72`).
  Rev. 80 (`BIM-CALC-2026-10-25.74`): T41 S1 (`0023_quotation_core_rls`) — 6 quotation core tables under FORCE RLS (`42/72`) + `database-role-provision.pgtest.ts` pre-schema role contract fix.
  Rev. 79 (`BIM-CALC-2026-10-25.73`): T43 CI system Python resolution for `server-path.e2e.test.ts`.
  Rev. 78 (`BIM-CALC-2026-10-25.72`): T42 authority/resource boundary, §8.4 industry default fallback, and 15m orphan lease takeover.
  Rev. 77 (`BIM-CALC-2026-10-25.71`): T46 single-source copy closure (`LegislationView`, `BimGlossary`, `BimDashboard`, `AdminDashboard`, `PricingSources`) + platform owner (`hazarvolga@gmail.com`) super-admin guard.
  Rev. 76 (`BIM-CALC-2026-10-25.70`): T41 (`0022_tenant_business_rls` 14 tables), T32 (`veraPDF 1.30.3` in `ifc-worker` + `verapdf_report_xml` + 7/7 PDF/A fixture matrix), and T43 (`c8` coverage ratchet + 6 Playwright E2E tests).
  Rev. 75 (`BIM-CALC-2026-10-25.69`): site JSON-LD generated from the
  registry and plan catalog, landing claims trimmed, public-copy guard test, `areaServed` TR.
  Rev. 74 (`BIM-CALC-2026-10-25.68`): T46 first slice (llms.txt
  capabilities only from the registry, package prices from the plan catalog) and T48 (server
  text prerendered inside `#root` instead of `<noscript>`).
  Rev. 73 (`BIM-CALC-2026-10-25.67`): Faz 8 SEO/GEO code items
  (T47/T49): no fixed sitemap lastmod, PUBLIC_APP_URL fail-fast pinned by tests, route JSON-LD
  for calculators and the glossary, explicit AI crawler groups in robots.txt
  (`ROBOTS_AI_TRAINING=disallow` closes training crawlers; default allows), llms links in
  `index.html`.
  Rev. 72 (`BIM-CALC-2026-10-25.66`): role setup runs inside the
  Coolify deploy (db-bootstrap -> migrate -> db-provision); clean-install steps in
  `docs/operations/database-role-model.md`.
  Rev. 71 (`BIM-CALC-2026-10-25.65`): request paths read
  companies/subscriptions/usage_logs in tenant context (`src/db/app-tenant.ts`), quota
  locking is a per-company advisory lock, admin RLS reads use the control plane.
  Verify with `scripts/role-model-smoke.ts` against a provisioned database (13/13).
  Rev. 70 (`BIM-CALC-2026-10-24.64`, draft): icmal lines carry
  their element list; "Bu sayı nasıl oluştu?", metraj cetveli CSV and an expert
  verification mode (records in the reviewer's browser for now). Local review
  server: `.claude/launch.json` → `teklifpro-review` (port 3001, docker
  `teklifpro-review-pg`, secrets in git-ignored `.env.review.local`).
  Rev. 69 (`BIM-CALC-2026-10-24.63`): `/app/nasil-calisir`
  shows the workflow and calculation modules to every workspace role, so expert
  reviewers on normal packages can read methods and jump to the real screens.
  Rev. 68 keeps
  duplicate-GlobalId uncovered elements, marks the browser IFC pre-analysis as
  non-authoritative and removes unverified compliance/accuracy claims from
  product copy. Marketing claims ("Türkiye'de tek", "mevzuata uyumlu") are
  decided only after independent expert review.
- GAP programme (`docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md`):
  **All autonomous engineering/code/test items are closed (`39/56` `[x]` + all code/test gates of `13/56` `PARTIAL` items; `4/56` `T50, T51, T52, T55` are external-only).** Faz 0–4 code/test done; Faz 5–6 partial (progress payments default-off, pilot L2 awaiting external customer/vendor data); Faz 7 T40 role cutover live since Rev. 72 (canary, restore and rollback evidence open), T41 code/PG16 done (72/72 `company_id` tables classified: 67 FORCE RLS + 5 S5 Exact-ACL; live post-deploy smoke open), T42 partial (code/test done), **T43 closed (`[x]`, `c8` `82.58%` project / `81.31%` routes / `74.77%` UI + Playwright 6/6 in CI; `1427/1434` PASS)**, T44 partial (`t44-recovery-drill.pgtest.ts` 5-pillar drill 1/1 PASS + `postgres:restore-drill:verify` PASS; live digest verification open), T45 partial (`PERFORMANCE_BUDGETS` `BIM-PERF-2026-10-26.1` + ExcelJS chunk split + `t45-performance-budget.test.ts` 5/5 PASS; real large client files & live VPS post-deploy load check open); Faz 8 T46–T49 code/test done; Faz 9 `T50–T52` open (external pilot/expert/security sign-off); Faz 10 T53–T54 done (`PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md`; T55 legal decision open after T50–T52); Faz 11 T56 partial (`final-evidence-matrix.json` & `t56-final-evidence-matrix.test.ts` 3/3 PASS; awaits external closures before `fullClosureClaimPermitted = true`). Expert trial guide: `/admin/roadmap/expert-review`.
- Role and tenant models: `docs/operations/database-role-model.md`,
  `docs/operations/tenant-rls-model.md`.
- Known limits: browser IFC parser carries no per-element material layers (the
  worker is authoritative); `src/worker/index.ts` is unreferenced.

## Testing

- Full suite needs an isolated PostgreSQL 16 configured like
  `.github/workflows/verify.yml` (disposable roles, release migrations, runtime
  role URLs). Never point tests at shared databases. Without it ~55 DB tests
  fail with `ECONNREFUSED`; with it the suite passes (`1500/1515` PASS, `0` FAIL, `82.7%` project line coverage on 2026-10-27 at the Rev. 95 branch head).
- Build `dist/` with a plain `pnpm run build` (no `NODE_ENV=test`): a test-mode
  build ships React's development bundle and fails the 120 kB entry budget.
- In a fresh worktree link `workers/ifc/.venv` to the main checkout's venv with an
  absolute path, or two IFC worker tests fail with "ifcopenshell module not found".

## Ground rules for agents

- 3x3 is company policy: metraj ≤ 3%, cover ≥ standard minimum in mm (TS 500
  interior 20 / exterior 25 / slab 15; EC2 XC3 35 mm only for `EUROCODE_2`),
  load-bearing in STR. Never describe cover as a percentage.
- Product copy describes verified behaviour only; no "%100", "tam uyumlu",
  "tek" claims. No personal names as authority (`registry.test.ts`). No
  `live`/`L3` capability without a real named, registered reviewer.
- Engineering and cost numbers go through `yuksek-muhendis-mimar`; no invented
  poz codes or prices; no official ÇŞB/YFK prices without written licence.
- Every feature, rule or calculation change updates
  `src/pages/admin/roadmap/roadmap-content.ts` and `calculation-review.ts`
  (chronological, verified by `content.test.ts`).
- Dev demo / guest bypass only when `import.meta.env.DEV`. Academy stays behind
  `ACADEMY_ENABLED = false`.
- Do not stage `graphify-out/*` or the user's untracked notes in the repo root.

## Open items owned by Hazar

Post-cutover checks (above), real named expert
sign-offs (engineer, tax/tender), permitted real IFC/PDF/Excel files for the
expert trial, card-payment provider and legal texts, external security review,
DKIM, YFK licence, AI provider keys.
