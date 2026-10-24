# Working State: BIMMetraj

Last updated: 2026-10-24. Keep this file to one page: current truth only. Move
history to `archive/` (latest: `archive/WORKING_STATE_until_2026-10-24.md`).

## Production

- `https://bimmetraj.com` on Coolify (app `ibjv2zbpecdcbd71lxo1vqd7`), Docker
  Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`, `migrate`,
  `backup`. Vercel files are legacy.
- **Live revision: `d9d80df` (Rev. 40, Node.js 24.22.1).** `main` is far ahead
  and is **not deployable as-is**: production DB is at release migration
  `0008_pilot_exception_rows` and has none of the `bimmetraj_*` roles that
  migrations `0009`–`0021` and the new runtime need.
- Deploy path: backup → worker drain → `role-admin bootstrap-legacy` →
  `migrate` → `role-admin provision` → `role-admin inspect` → Coolify deploy →
  `/api/health` revision + login/tenant/worker smoke. Runbook and the rehearsal
  on a restored production backup: `HANDOFF_2026-10-24_DEPLOY_CUTOVER.md`.
- **Blocker before cutover:** Coolify Developer View exposed raw secrets on
  2026-10-24. The five DB role passwords were re-entered; S3/backup keys, SMTP,
  PostgreSQL service password and JWT secret still need rotation and
  confirmation by Hazar. Do not open Developer View again.
- Merging never deploys. Run `scripts/require-green-ci.sh <sha>` before Deploy.

## Code (main / working branch)

- Latest roadmap revision: **Rev. 68** (`BIM-CALC-2026-10-24.62`). Rev. 68 keeps
  duplicate-GlobalId uncovered elements, marks the browser IFC pre-analysis as
  non-authoritative and removes unverified compliance/accuracy claims from
  product copy. Marketing claims ("Türkiye'de tek", "mevzuata uyumlu") are
  decided only after independent expert review.
- GAP programme (`docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md`):
  Faz 0–4 code/test done; Faz 5–6 partial (progress payments default-off,
  pilot L2); Faz 7 T40 local only, T41 partial (22 tenant tables under RLS),
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

Secret rotation (above), production role cutover and deploy, real named expert
sign-offs (engineer, tax/tender), permitted real IFC/PDF/Excel files for the
expert trial, card-payment provider and legal texts, external security review,
DKIM, YFK licence, AI provider keys.
