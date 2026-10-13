# Working State

Last updated: 2026-10-13. Keep this file to one page: current truth only.
History up to this date: `archive/WORKING_STATE_until_2026-10-13.md` (read it
only when a decision needs its background; its paths and Vercel notes are stale).

## Production

- `https://bimmetraj.com` on Coolify (app UUID `ibjv2zbpecdcbd71lxo1vqd7`),
  Docker Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`,
  `migrate`, `backup`. Vercel files (`vercel.json`, `api/index.ts`) are legacy.
- Live revision `a0bc784` (transactional e-mail via Stalwart SMTP 465 at
  `mail.affexai.tr`, sender `info@bimmetraj.com`). Registration is open.
- Still closed: payments (Stripe test mode only), server SmartCheck import
  (`SMARTCHECK_IMPORT_ENABLED=false`, no R2 bucket), AI (no provider keys).
- Daily 03:00 backup, R2 copy, restore drill passed.

## Release in progress: `fix/gap-closure-2026-10-13` + `feat/epys-preflight`

Both branches go to `main` together (PR from `feat/epys-preflight`, which
contains the gap-closure commits). Status table: `guncel-gap.md` ("Kapanış
durumu"). Verified on an isolated PostgreSQL 16 (`pnpm run verify`, release
migration lifecycle, Prisma shadow, audit) and the Python worker tests.

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

After merge (push to `main` triggers the Coolify deployment):

1. Merge; the `migrate` job applies release migrations 0007
   (`plans` feature/storage limits, `is_trial`) and 0008 (pilot
   `exception_rows`). Both are additive and pinned.
2. Run `dist/bootstrap-plan-catalog.mjs --apply` (catalog v5) so the five
   packages get their limits and the trial flag. Until then runtime keeps the
   legacy limits — no tenant is locked out.
3. In Coolify: enable "Include Source Commit in Build" so `SOURCE_COMMIT`
   reaches the Docker build arg (health shows `revisionSource: "build"`), and
   create Sentry alert rules for the existing `SENTRY_DSN`.
4. Check `/sitemap.xml`, the CSP header and `www` → apex 301 after deploy.
5. Existing Academy learner accounts will land in the normal workspace shell
   while `ACADEMY_ENABLED` is false.

## Next code work (not started)

- Wire `pdf_preflight.py` into SmartCheck uploads (accept PDF documents).
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
SmartCheck pilot tenant and R2 bucket (P0-3 step 4).
