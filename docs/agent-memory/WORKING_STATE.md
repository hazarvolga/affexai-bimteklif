# Working State: BIMMetraj

Last updated: 2026-10-25. Keep this file to one page: current truth only. Move
history to `archive/` (latest: `archive/WORKING_STATE_until_2026-10-24.md`).

## Production

- `https://bimmetraj.com` on Coolify (app `ibjv2zbpecdcbd71lxo1vqd7`), Docker
  Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`, `migrate`,
  `backup`. Vercel files are legacy.
- **Live revision: `f474e99` (Rev. 72, PR #11 merge), checked 2026-10-25:**
  `/api/health` returns `status: ok`, `db: connected`, `revisionSource: build`
  and all readiness flags true. `main` and production are the same commit.
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

- Latest roadmap revision: **Rev. 89** (`BIM-CALC-2026-10-25.83`): Faz 10 T53 source-backed market inventory & T54 comparable 6-stage capability matrix (`docs/audits/phase-10/market-inventory-register.json`, `docs/audits/phase-10/PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md`, `src/contracts/t53-t54-market-inventory.test.ts` `4/4 PASS`, and `scripts/phase-0-evidence-validator.test.ts` `23/23 PASS`; 12 products evaluated with `unverified_publicly` vs `pilot_l2_unapproved` discipline and `singleClaimPermitted = false` until `T50–T52` & `T55` legal review).
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
  Faz 0–4 code/test done; Faz 5–6 partial (progress payments default-off,
  pilot L2); Faz 7 T40 role cutover live since Rev. 72 (canary, restore and
  rollback evidence open), T41 code/PG16 done (72/72 `company_id` tables classified: 67 FORCE RLS + 5 S5 Exact-ACL; live post-deploy smoke open),
  T42 partial (code/test done), T43 partial (`c8` `53.04%` project / `81.31%` routes + Playwright 6/6 in CI; R+1 done), T44 partial (`t44-recovery-drill.pgtest.ts` 5-pillar drill 1/1 PASS + `postgres:restore-drill:verify` PASS; live digest verification open), T45 partial (`PERFORMANCE_BUDGETS` `BIM-PERF-2026-10-26.1` + ExcelJS chunk split + `t45-performance-budget.test.ts` 5/5 PASS; real large client files & live VPS post-deploy load check open); Faz 8 T46–T49 code/test done; Faz 10 T53–T54 done (`PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md`; T55 legal decision open after T50–T52); Faz 9 & 11 open. Expert trial guide:
  `/admin/roadmap/expert-review`.
- Role and tenant models: `docs/operations/database-role-model.md`,
  `docs/operations/tenant-rls-model.md`.
- Known limits: browser IFC parser carries no per-element material layers (the
  worker is authoritative); `src/worker/index.ts` is unreferenced.

## Testing

- Full suite needs an isolated PostgreSQL 16 configured like
  `.github/workflows/verify.yml` (disposable roles, release migrations, runtime
  role URLs). Never point tests at shared databases. Without it ~55 DB tests
  fail with `ECONNREFUSED`; with it the suite passes (1355 tests on 2026-10-24).

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
