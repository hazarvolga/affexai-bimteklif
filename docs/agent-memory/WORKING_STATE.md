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
- **Not yet confirmed after the cutover (Hazar):** secret rotation after the
  2026-10-24 Developer View exposure (S3/backup keys, SMTP, PostgreSQL service
  password, JWT secret); `scripts/role-model-smoke.ts` against production;
  login/tenant/worker/IFC worker smoke; a backup → restore drill on the new role
  model; worker canary/drain followed by the authority-table ACL revoke (T41).
  Do not open Developer View again.
- Merging never deploys. Run `scripts/require-green-ci.sh <sha>` before Deploy.

## Code (main / working branch)

- Latest roadmap revision: **Rev. 73** (`BIM-CALC-2026-10-25.67`): Faz 8 SEO/GEO code items
  (T47/T49): no fixed sitemap lastmod, PUBLIC_APP_URL fail-fast pinned by tests, route JSON-LD
  for calculators and the glossary, explicit AI crawler groups in robots.txt
  (`ROBOTS_AI_TRAINING=disallow` closes training crawlers; default allows), llms links in
  `index.html`. Not deployed yet.
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
  rollback evidence open), T41 partial (22 tenant tables under RLS),
  T42 partial, T43–T45 open; Faz 8–11 open. Expert trial guide:
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

Secret rotation and post-cutover checks (above), real named expert
sign-offs (engineer, tax/tender), permitted real IFC/PDF/Excel files for the
expert trial, card-payment provider and legal texts, external security review,
DKIM, YFK licence, AI provider keys.
