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

## Branch `fix/gap-closure-2026-10-13` (not merged, not deployed)

Closes most code items of `guncel-gap.md`; see that report for the status
table. Deploying it requires, in order:

1. Merge; the `migrate` job applies release migrations 0007
   (`plans` feature/storage limits, `is_trial`) and 0008 (pilot
   `exception_rows`). Both are additive and pinned.
2. Run `dist/bootstrap-plan-catalog.mjs --apply` (catalog v4) so the five
   packages get their limits and the trial flag. Until then runtime keeps the
   legacy limits — no tenant is locked out.
3. In Coolify: enable "Include Source Commit in Build" so `SOURCE_COMMIT`
   reaches the Docker build arg (health shows `revisionSource: "build"`), and
   create Sentry alert rules for the existing `SENTRY_DSN`.
4. Check `/sitemap.xml`, the CSP header and `www` → apex 301 after deploy.

## Ground rules for agents

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
