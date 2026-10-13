# Working State

Last updated: 2026-10-13. Keep this file to one page: current truth only.
History up to this date: `archive/WORKING_STATE_until_2026-10-13.md` (read it
only when a decision needs its background; its paths and Vercel notes are stale).

## Production

- `https://bimmetraj.com` on Coolify (app UUID `ibjv2zbpecdcbd71lxo1vqd7`),
  Docker Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`,
  `migrate`, `backup`. Vercel files (`vercel.json`, `api/index.ts`) are legacy.
- Last verified live revision: `ab4629288ed58e5a757746f2414c2bee1aeb8690`
  (`/api/health`, `revisionSource: "build"`, 2026-10-13). Transactional e-mail uses Stalwart SMTP 465 at
  `mail.affexai.tr`, sender `info@bimmetraj.com`. Registration is open.
- Still closed: payments (Stripe test mode only), AI (no provider keys).
  SmartCheck server import is enabled only for the allowlisted internal
  `Bimmetraj` tenant; this is a pilot, not general availability.
- Production R2 bucket `bimmetraj-production` and scoped app credentials are
  configured. On 2026-10-13, app-container put/get/checksum/delete smoke passed.
- Production `SENTRY_DSN` is empty; Sentry events and alert rules are not active.
- Daily 03:00 backup, R2 copy, restore drill passed.

## e-PYS release and current rollout

`fix/gap-closure-2026-10-13` and `feat/epys-preflight` were merged as PR #1
(`e006d10`). Status table: `guncel-gap.md` ("Kapanış durumu"). The merge was
verified on isolated PostgreSQL 16 (`pnpm run verify`, release migration
lifecycle, Prisma shadow, audit) and Python worker tests.

`feat/epys-preflight` adds:
- RG 33331 e-PYS pre-check on every IFC run (vendored ifc-ruhsat@cd6d3ce, MIT;
  see `workers/ifc/vendor/ifc_ruhsat/NOTICE.md`), EK-9 panel in SmartCheck,
  `GET /api/smartcheck/documents/:id/epys-preflight`, IDS export, KVKK masking.
- PDF/A pre-check library (`workers/ifc/pdf_preflight.py`), not yet wired to upload.
- Honest quick e-PYS label + CekmeArka; catalog v5 package description.
- Admin: `/admin/roadmap` (Geliştirici Yol Haritası) and
  `/admin/roadmap/calculations` (Hesaplama Yöntemleri, expert sign-off page).
- Annex spot-check: official RG annex PDF (SHA-256 7dc88971…0ecb3) Tablo 6.55,
  6.60, 9.1 rows 1–9 match the vendored data.

Release status (2026-10-13):

- Coolify deploys are manual (a push does not deploy). `ab46292` was deployed
  manually on 2026-10-13; Coolify history shows Success and `/api/health`
  reports the full revision above, DB connected, all readiness flags true
  including `smartcheckStorageConfigured`. The earlier `e006d10` deployment
  applied migrations 0007/0008.
- Done: Coolify Advanced → "Source commit availability" set to "Available
  during build"; CSP header, `www` → apex 301, `/sitemap.xml` 200, and the
  `/admin/roadmap*` routes have been checked.
- Catalog v5 applied in the app container after a rolled-back `--plan`:
  no insertions, one presentation update, five limit backfills. Public plans
  now show the e-PYS badge "Pilot" and the reviewed description. No prices or
  core offer quotas changed.
- Pilot company is the superadmin-owned `Bimmetraj` tenant
  (`9096aa51-3b1d-4b9e-b7e9-7443a75d5a63`). `SMARTCHECK_IMPORT_ENABLED=true`
  and `SMARTCHECK_PILOT_COMPANY_IDS` equals only that ID in the running app and
  queue worker containers. The IFC worker container imports `ifcopenshell` and
  `pypdf` successfully. No other tenant is allowlisted.
- This release adds PDF/A upload and pre-check to the SmartCheck flow. It has
  25 MiB/signature/checksum checks, a 90-second subprocess timeout with Linux
  CPU/RAM limits, a 500-page scan cap, a tenant PDF concurrency/monthly limit,
  lower queue priority than IFC, and current-run-only report lookup.
- Local `pnpm run lint` and `pnpm run build` passed. Local DB-backed verify
  refuses the shared database by design. GitHub Actions Verify run
  `38424266426` passed with isolated PostgreSQL, Python behavior tests, app
  tests, Prisma checks, app/IFC-worker image builds and runtime smoke. The two
  earlier failed runs exposed an original-PDF-name bug and a changed IFC
  preview error code; commits `062528a` and `ab46292` fixed these before the
  green run and production deployment.
- Open acceptance: authenticated upload/process/report smoke for one real IFC
  and one PDF on the pilot tenant. Chrome was at login, so this was **not**
  verified in production; container library checks are not a substitute.
  The internal tenant has an active subscription with `plan_id=null`, and the
  fallback trial plan limits IFC to 35 MB; the local `e-proje_4x3.ifc` sample
  is 37 MB. Use a smaller representative IFC or assign the internal tenant an
  appropriate plan through audited admin flow before uploading it. Do not
  change another tenant's subscription. After smoke, decide whether to keep
  the pilot flag on; leave other tenants gated.
- Production `SENTRY_DSN` remains empty. Code-level Sentry tests are present,
  but no live event or alert rule is verified. Locate/create an owned Sentry
  project and configure DSN/alerts before claiming production monitoring.
- Existing Academy learner accounts land in the normal workspace shell
  while `ACADEMY_ENABLED` is false.

## Next code work

- Independently check the remaining RG annex tables against the official PDF.
- IFC extractor: read `Pset_*Common` LoadBearing/IsExternal (+ cover if
  modelled) so 3x3 cover/STR checks stop reporting `missingInput`.
- Separate runtime DB role (P1-1), reviewer discipline scope (E-9),
  rebar/formwork engine (E-7), measurement-rule (minha) engine (E-8).

## Ground rules for agents

- Academy is out of scope (2026-10-13): `ACADEMY_ENABLED = false` in
  `src/config/features.ts` hides it from menus/links and redirects its routes.
  Do not build on Academy until the flag is turned back on.

- 3x3 is company policy: metraj ≤ 3%, cover ≥ standard minimum in mm (TS 500
  default; EC2 XC3 35 mm only for `activeStandard = EUROCODE_2`), load-bearing
  in STR. Never "%3 paspayı". Rule pack `smartcheck-3x3-2026-10-v2`.
- Dev demo / guest bypass exists only when `import.meta.env.DEV`.
- No official ÇŞB/YFK prices without written licence; IFC transfer never
  invents unit prices.
- Engineering and cost numbers go through the `yuksek-muhendis-mimar` skill.
- DB-backed tests need an isolated PostgreSQL 16 (CI pattern in
  `.github/workflows/verify.yml`); they refuse the shared database.

## Open items owned by Hazar

Stripe + legal texts (P0-2), external security review (P0-5), DKIM and inbox
test (P1-8), YFK licence (P1-2), AI provider keys and eval budget (P1-6),
Sentry project access/alerts and real pilot IFC/PDF acceptance evidence.
