# Working State

Last updated: 2026-10-14. Keep this file to one page: current truth only.
History up to this date: `archive/WORKING_STATE_until_2026-10-13.md` (read it
only when a decision needs its background; its paths and Vercel notes are stale).

## Production

- `https://bimmetraj.com` on Coolify (app UUID `ibjv2zbpecdcbd71lxo1vqd7`),
  Docker Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`,
  `migrate`, `backup`. Vercel files (`vercel.json`, `api/index.ts`) are legacy.
- Last verified live revision: `9ab9ae5b07f2d3caeb81ea8c185794fc3595ed5e`
  (`/api/health`, `revisionSource: "build"`, 2026-10-14, Coolify deploy `pk249c4bzn7yml3gny65rlrd`, GitHub Actions `Verify` run `38570914778`). Transactional e-mail uses Stalwart SMTP 465 at
  `mail.affexai.tr`, sender `info@bimmetraj.com`. Registration is open.
- Still closed: payments (Stripe test mode only), AI (no provider keys).
  SmartCheck server import is enabled only for the allowlisted internal
  `Bimmetraj` tenant; this is a pilot, not general availability.
- Production R2 bucket `bimmetraj-production` and scoped app credentials are
  configured. On 2026-10-13, app-container put/get/checksum/delete smoke passed.
- Sentry organization `BIMMetraj` was created in the EU region via
  `hazarvolga@gmail.com` on the free-path 14-day trial. Production `SENTRY_DSN`
  is set in Coolify and present in the running `app`, `worker`, and `ifc-worker`
  containers. A synthetic app-container error was flushed successfully to
  Sentry (event ID `2fcdd9afa9d44f749b537fea86c215bb`); the event appeared in
  Sentry issue `NODE-EXPRESS-1` (`153422905`). Sentry's default high-priority
  issue alert fired once for this event. Its recipient was explicitly set to
  `Hazar Volga Ekiz (hazarvolga@gmail.com)`; Sentry reported "Notification
  fired!" for a test notification. Gmail Updates showed both the production
  smoke alert (`NODE-EXPRESS-1`) and test issue notification (`NODE-EXPRESS-2`)
  on 2026-10-13. The DSN is secret and must stay out of Git.
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
- PDF/A pre-check library (`workers/ifc/pdf_preflight.py`); its upload wiring
  was completed in the subsequent `8b86188` release.
- Honest quick e-PYS label + CekmeArka; catalog v5 package description.
- Admin: `/admin/roadmap` (Geliştirici Yol Haritası) and
  `/admin/roadmap/calculations` (Hesaplama Yöntemleri, expert sign-off page).
- Annex spot-check: official RG annex PDF (SHA-256 7dc88971…0ecb3) Tablo 6.55,
  6.60, 9.1 rows 1–9 match the vendored data.

Release status (2026-10-13):

- Coolify deploys are manual (a push does not deploy). `98dd0f9` was deployed
  manually on 2026-10-13 after the Sentry environment change; Coolify history
  shows Success and `/api/health`
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
- Authenticated production pilot smoke completed on 2026-10-13 using the
  existing in-app browser session and synthetic repository fixtures. A valid
  IFC2X3 QTO fixture (`bimmetraj-qto-valid.ifc`) succeeded at 100%, produced
  two review rows (including `Qto_SlabBaseQuantities/NetVolume`) and the EK-9
  e-PYS panel. A one-page synthetic PDF with a template file name succeeded
  at 100%; the UI showed a PDF/A-2B identity claim, 0 errors, 0 warnings and
  1 manual full-validation item. These are pipeline checks, **not** expert
  engineering acceptance or complete PDF/A certification. Two earlier pilot
  IFC attempts remain as failed queue records: one has no admissible element
  quantity evidence, the other is an invalid minimal IFC. Neither was retried.
  Open: run representative real-project IFC/PDF acceptance with reviewer sign-off.
  The internal tenant has an active subscription with `plan_id=null`, and the
  fallback trial plan limits IFC to 35 MB; the local `e-proje_4x3.ifc` sample
  is 37 MB. Use a smaller representative IFC or assign the internal tenant an
  appropriate plan through audited admin flow before uploading it. Do not
  change another tenant's subscription. Keep other tenants gated while the
  pilot is evaluated.
- Sentry SDK delivery from the production app container and issue receipt are
  verified; all three service containers have the DSN. The default
  high-priority alert is enabled, fired for the synthetic issue, and now targets
  Hazar's account directly. Sentry accepted a test notification; both it and
  the original production smoke alert arrived in Hazar's Gmail Updates inbox.
- Existing Academy learner accounts land in the normal workspace shell
  while `ACADEMY_ENABLED` is false.

## 2026-10-14 GAP / BUG / UI-UX Closure (`GAP_BUG_UI_UX_ANALIZ_RAPORU_2026-10-14.md`)

- **IFC 3x3 & e-PYS Worker Fixes (`workers/ifc/epys_preflight.py`, `workers/ifc/ifc_extract.py`):**
  Fixed KVKK regex ordering/word boundaries so 11-digit TC Kimlik No is fully masked without corrupting 22-char IFC `GlobalId` strings (`BUG-01`). Replaced misleading EC2 default note (`BUG-09`). Extracted `LoadBearing`, `IsExternal`/`exposure`, `ExposureClass`, `coverMm`, `discipline` (`STR/ARC/MEP`), and `expectedQuantity` from IFC property sets and wired them into `src/smartcheck/rules/ifc-rule-run.ts` (`GAP-08`).
- **SmartCheck e-PYS Availability & Plan Quota (`processor.ts`, `smartcheck.ts`, `service.ts`):**
  Stored `epys_preflight` before QTO extraction and updated `GET /api/smartcheck/documents/:id/epys-preflight` + `SmartCheckImportWorkspace.tsx` so queue-opened and architectural IFC files always render the EK-9 panel (`BUG-02`, `BUG-03`). Connected PDF/A monthly quota in `service.ts` to the subscription's plan catalog (`BUG-10`).
- **Contractual Minha Engine & Rebar/Formwork Transfer (`minha.ts`, `quotation-transfer.ts`, `CreateQuote.tsx`):**
  Added `src/smartcheck/rules/minha.ts` (`CSB_2026` 0.50 m² vs `DIN_18350` 2.50 m² opening deduction, reveal addition, and structural intersection takeoff) (`GAP-06`). Enabled `needs_review` transfer for formwork (`m2`) and rebar (`ton`) estimates (`GAP-05`), fixed demo template line totals (`BUG-05`), added per-line `costCategory`, `discountPercent`, and `vatPercent` controls (`BUG-06`), and rounded per-line `effectiveCost` with `roundMoney` (`BUG-07`).
- **Navigation, Honest Public Claims & Legal Pages (`Navbar.tsx`, `Landing.tsx`, `LegalPage.tsx`, `Dashboard.tsx`, `SmartCheckLab.tsx`):**
  Added `/app/smartcheck`, `/app/market-intelligence`, and `/app/profitability` to navigation and fixed `/app/billing` roles (`BUG-08`). Unified IFC CTAs toward `/app/smartcheck` (`BUG-04`), replaced unverified "42.000+ ÇŞB Poz" claims with truthful catalog/evidence wording (`GAP-01`), and replaced the placeholder `LegalPage.tsx` with full BIMMetraj Terms & KVKK texts (`GAP-04`).
- **Reviewer Discipline & Sign-off Metadata (`contracts.ts`, `CalculationMethods.tsx`):**
  Added optional `reviewerDiscipline` (`ARC` | `STR` | `MEP` | `COST` | `QA`) to `QuantityRowReviewPatchSchema` (`GAP-07`) and structured `signOffEvidence` metadata to `CalculationMethods.tsx` (`GAP-12`).
- **Release & CI Verification (2026-10-14):**
  Pushed 9 atomic commits (`bf844d3` .. `9ab9ae5`) plus pricing-source UX/automation and e-PYS/roadmap commits to `origin/main`.
- **Official ÇŞB 2026 PDF Catalog Sealing & Automated Nightly Price Tracker (`csb-pdf-parser.ts`, `pricing-file-import.ts`, `price-watcher.ts`, `PricingSources.tsx`):**
  Parsed 15 official 2026 ÇŞB Yüksek Fen Kurulu PDFs (`docs/fiyatlandirma-kaynaklari/`) and embedded 6 SHA-256-sealed official 2026 catalogs (`csb-2026-official-catalogs.json`) + 3-stage PDF parser (`pdftotext` / `pypdf` / zlib stream) into `/admin/pricing-sources`. Sealed all 7 official catalogs (`csb_yfk_2026`, `csb_mekanik_2026`, `csb_elektrik_2026`, `epys_ek6`, `market_concrete_marmara`, `market_steel_karabuk`, `tuik_ime`) in production DB (`active`, 570 `approved` rows in `price_feed_staging`). Added 4-layer automated nightly 03:00 price tracker (TCMB EVDS + TÜİK Yİ-ÜFE/İME + ÇŞB page fingerprint + automatic impact simulation on active quotes).
- **e-PYS Full EK-1/2/3/7 Dictionary, `IfcCovering` 5D Bridge, ALLPLAN 2026 e-PYS Kit v1 & Roadmap/Calculations Alignment (`ek2_disiplinler.json`, `ek3_mahaller.json`, `ek7_proje.json`, `isim.py`, `yapi.py`, `mahal.py`, `ifc_extract.py`, `smartcheck-evidence.ts`, `quotation-transfer.ts`, `epys-allplan-kit.ts`, `roadmap-content.ts`, `calculation-content.ts`, `calculation-review.ts`):**
  Completed all audit report recommendations end-to-end: added EK-1 6-char project code & filename prefix cross-check, EK-2 `Tablo 2.3–2.14` (sub-disciplines, file types, storey codes), EK-3 `Tablo 3.2` (~130 official room names/codes), and EK-7 `Tablo 7.8` (`IfcGeometricRepresentationContext`) to `ifc_ruhsat`; prioritized `TREpys_PozOzellikSeti.PozNo`, extracted `IfcCovering` (`areaM2` in `m²`) into SmartCheck evidence rows and quote transfer, and extracted `TREpys_EmsalOzellikSeti` (`IfcSpatialZone`/`IfcSpace` `DAHIL`/`HARIC`/`YUZDE30`) in `ifc_extract.py`; built SHA-256-sealed **ALLPLAN 2026 e-PYS Kiti v1** (`GET /api/smartcheck/epys-allplan-kit`); updated `/admin/roadmap` and `/admin/roadmap/calculations` (`BIM-CALC-2026-10-14.2`, added `yapisal-sihirbaz` E-7 and `minha` E-8 module cards, fixed all contradictions, added ALUPLAN/ALLPLAN 2026 comparative matrix).
- **2026-10-15 Package-Aware Onboarding, 0 ₺ Trial SmartCheck Auto-Activation, Multi-Bank IBAN Transfer & Superadmin Approval (`bank-transfer.ts`, `Register.tsx`, `Billing.tsx`, `PlansList.tsx`, `TenantDetail.tsx`, `Shell.tsx`, `SmartCheckImportWorkspace.tsx`):**
  - Replaced blind registration with a 2-column package selection & workspace onboarding flow on `/register` (`PublicPricingSection.tsx` → `/register?planId=...`).
  - Enabled `companies.is_smartcheck_enabled = true` on workspace registration and updated `smartcheck.ts` + `pilot-evidence.ts` to allow any tenant with `companies.is_smartcheck_enabled = true` (in addition to `SMARTCHECK_PILOT_COMPANY_IDS`), so `0 ₺` 14-Day Trial users immediately get their real trial quotas (`1 IFC / 35 MB`, `10 PDF/A`, `5 Teklif`) without hitting `SMARTCHECK_IMPORT_DISABLED`.
  - Built real manual Bank Transfer (Havale/EFT) order reference generation (`BM-YYYY-...`), receipt notification (`POST /api/billing/payment-requests`), multi-bank account configuration (`GET/PUT /api/admin/billing/bank-accounts` + `PAYMENT_BANK_ACCOUNTS_JSON` env fallback), and 1-click Superadmin payment approval & subscription quota activation (`POST /api/admin/billing/payment-requests/:requestId/review`) in `/admin/plans` and `/admin/tenants/:companyId`.
  - Added the **e-PYS (RG 33331) & ALLPLAN 2026 Hazırlık Şablonları** download bar (`GET /api/smartcheck/epys-ids` `.ids` XML + `GET /api/smartcheck/epys-allplan-kit` `.json`) directly to the user-facing `/app/smartcheck` screen (`SmartCheckImportWorkspace.tsx`).
  - **Superadmin Multi-Tab Session Isolation & `/admin/tenants` Resilience (`api.ts`, `useAuth.tsx`, `TenantsList.tsx`, `TenantDetail.tsx`, `App.tsx`):** Persisted `superadmin_token` separately from customer `token` so logging into a tenant account in another browser tab does not clobber `/admin/*` API requests (`403` → `tenants.map` crash), added `Array.isArray` guards and a recovery banner in `TenantsList.tsx`, and added one-time chunk-reload protection on `React.lazy` routes after deployments.
  - **Admin Plan Activation/Deactivation & Atomic Subscriber Migration (`input.ts`, `changes.ts`, `admin.ts`, `admin-data.ts`, `PlansList.tsx`):** Enriched `GET /api/admin/plans` with `subscriberCount` and `subscribers`, added `replacementPlanId` to `PATCH /api/admin/plans/:id` so deactivating a plan with existing subscribers requires and atomically migrates all subscribed companies to an active replacement plan (logged in `admin_audit_logs`), and added 1-click **"Aktif Et" / "Pasife Al"** controls + a 2-mode **"Yeni Satışa Kapat (Vitrin'den Gizle)" vs "Tamamen Pasife Al & Müşterileri Alternatif Pakete Taşı"** modal on `/admin/plans`.

## Next code work

- Representative real-project IFC/PDF engineering acceptance with reviewer sign-off and 2–3 pilot office field validation.

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
Real pilot IFC/PDF acceptance evidence. Revisit Sentry quota after the trial
automatically transitions to the free plan; do not enable paid usage.
