# Working State: BIMMetraj

Last updated: 2026-10-17. Keep this file to one page: current truth only.
> **Brand Note:** Project brand is officially **BIMMetraj** (formerly TeklifPro; domain `https://bimmetraj.com`).

History up to this date: `archive/WORKING_STATE_until_2026-10-13.md` (read it
only when a decision needs its background; its paths and Vercel notes are stale).
Full handoff for the next agent: `docs/agent-memory/HANDOFF_2026-10-17.md`.

## Production

- `https://bimmetraj.com` on Coolify (app UUID `ibjv2zbpecdcbd71lxo1vqd7`),
  Docker Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`,
  `migrate`, `backup`. Vercel files (`vercel.json`, `api/index.ts`) are legacy.
- Last verified live revision: `f871a067a1b3cb7922f6e7963d68baa3bf4034f1` (Rev. 32.2, Global Shell & Sidebar Quick Tour Buttons + 100% Transparent Spotlight Cutout,
  `/api/health`, `revisionSource: "build"`, 2026-10-17, Coolify deploy `54e21c87-7ca5-44a0-9ff7-7bc2a5479086`). Transactional e-mail uses Stalwart SMTP 465 at
  `mail.affexai.tr`, sender `info@bimmetraj.com`, with 8 corporate HTML/text templates (`src/server/notifications/email-templates.ts`) and Superadmin preview/test console at `/admin/email-templates`. Registration is open with package-aware onboarding (`/register?planId=...&billingPeriod=...`), plus Early-Access Waitlist on `/` and lead management at `/admin/leads`.
- Still closed: card payments (Stripe test mode only; manual Havale/EFT IBAN transfer + Superadmin approval is live), AI (no provider keys).
  SmartCheck server import is enabled for workspaces where `companies.is_smartcheck_enabled = true` (automatically set on registration with v6 quotas) as well as `SMARTCHECK_PILOT_COMPANY_IDS`.
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
  - **Admin Plan Activation/Deactivation, Atomic Subscriber Migration & Dedicated PlanEditor Page (`input.ts`, `changes.ts`, `admin.ts`, `admin-data.ts`, `PlansList.tsx`, `PlanEditor.tsx`, `App.tsx`):** Enriched `GET /api/admin/plans` with `subscriberCount` and `subscribers`, added `replacementPlanId` to `PATCH /api/admin/plans/:id` so deactivating a plan with existing subscribers requires and atomically migrates all subscribed companies to an active replacement plan (logged in `admin_audit_logs`), replaced the cramped popup edit modal with a dedicated full-page **PlanEditor** (`/admin/plans/new` and `/admin/plans/:planId`) covering all 18+ plan quotas (IFC, PDF/A, Quote, AI, CRM, Regulation, Profitability, Storage MB/GB, Max Documents, Trial flag, preset templates, and live customer card preview), and added 1-click **"Aktif Et" / "Pasife Al"** controls on `/admin/plans`.
  - **2026-10-15 Comprehensive 5-Skill Gap Audit & 4-Phase Closure (`docs/audits/GAP_VE_DENETIM_RAPORU_2026-10-15.md`):**
    - **Faz 1 (P0):** Fixed IFC-to-quote unit price transfer keys (`beton/donati/kalip` + `concrete/rebar/formwork`) and `IfcCovering` `m2` unit collision (`src/ifc/quotation-transfer.ts`, `src/pages/CreateQuote.tsx`); fixed `monthlyPdfLimit` precedence over `monthlyRegulationLimit` in `src/smartcheck/import/service.ts`; wired `/app/smartcheck` status card to live `/api/smartcheck/queue` counts (`src/pages/SmartCheck.tsx`); added Turkish labels for all billing metrics (`src/pages/billing-usage.ts`), `IFC_IMPORTED` usage row (`src/services/billing/usage-report.ts`), and extended quota columns on `GET /api/public/plans` (`src/server/routes/billing.ts`); corrected Hero pafta arithmetic total (`2.888.250,00 ₺`) in `src/pages/LandingPage.tsx`.
    - **Faz 2 (SEO & GEO):** Exposed `GET /llms.txt` (`src/server/security/web-hardening.ts`, `src/server/app.ts`), added OpenGraph, Twitter Card, and Schema.org `JSON-LD` (`Organization`, `SoftwareApplication`, `FAQPage`) to `index.html`, mounted `PublicMetadata` across public pages, and opened `/bim-sozlugu` (`PublicBimGlossaryPage`) as an indexable public route (`sitemap.xml` + `llms.txt`).
    - **Faz 3 (P1 Mobile, WCAG 2.2 AA & Security):** Made `DosyadanTeklifDemo.tsx` `StepIndicator`, `BimIfcParserPage.tsx`, `MarketIntelligence.tsx`, and `CreateQuote.tsx` mobile-responsive (`375px`); added `#main-content` skip-link target (`Shell.tsx`, `AdminShell.tsx`), keyboard `role="button"`/`aria-pressed` on `SmartCheckDemo.tsx` cards, and `role="tablist"`/`role="tab"`/`role="tabpanel"` on `BimStandardsPage.tsx`; migrated `Settings.tsx` from raw `localStorage.getItem('token')` `fetch` calls to `fetchWithAuth`.
    - **Faz 4 (P2 Engineering & BIM Standards):** Added deterministic `computeBeamSlabIntersectionDeduction` (`eng_calc.py` `betonarme_metraj` compatible) to `src/smartcheck/rules/minha.ts`, extracted `IFCMATERIAL` and `IFCSPACE` names in `src/ifc/parser/legacy-parser.ts` for `BimIfcParser.tsx` e-PYS Madde 12/EK-3 validation, persisted `BimGapAnalysis.tsx` state in `localStorage`, prefilled company name in `DocumentsView.tsx`, and connected `LegislationView.tsx` to `/api/regulations`.
- **2026-10-15 Competitor-Calibrated Pricing (`v6`), Server-Safe Quotas & 4-Term Billing Cycle System:**
  - Updated `src/services/billing/plan-catalog.ts` (`bimmetraj-2026-10-15-v6`) and `src/pages/admin/PlanEditor.tsx` presets to position BIMMetraj ~20% below Turkish AEC competitors while protecting single-VPS `ifc-worker` RAM/CPU and R2 storage:
    - `14 Günlük Ücretsiz Deneme`: `0 ₺/ay` (`3 Teklif`, `1 IFC / 25 MB / 1 eşzamanlı`, `5 AI`, `3 PDF`, `0.25 GB`, `25 Doküman`).
    - `e-PYS & BIM Standart Denetçi`: `1.250 ₺/ay` (`5 Teklif`, `5 IFC / 35 MB / 1 eşzamanlı`, `10 AI`, `8 PDF`, `1 GB`, `150 Doküman`).
    - `Teklif & Şantiye`: `2.950 ₺/ay` (`25 Teklif`, `5 IFC / 40 MB / 1 eşzamanlı`, `25 AI`, `15 PDF`, `2 GB`, `300 Doküman`).
    - `5D BIM & SmartCheck`: `5.450 ₺/ay` (`75 Teklif`, `15 IFC / 60 MB / 1 eşzamanlı`, `60 AI`, `35 PDF`, `5 GB`, `750 Doküman`).
    - `Kurumsal Taahhüt & e-PYS`: `8.900 ₺/ay` (`200 Teklif`, `35 IFC / 85 MB / 2 eşzamanlı`, `150 AI`, `75 PDF`, `15 GB`, `2000 Doküman`).
  - Added `src/services/billing/billing-periods.ts` and wired 4 billing periods across `PublicPricingSection.tsx`, `Register.tsx`, `Billing.tsx`, `PlansList.tsx`, `TenantDetail.tsx`, and `bank-transfer.ts`:
    - `monthly` (`Aylık`, `%0 İndirim`, `30 gün`)
    - `semi_annual` (`6 Aylık`, `%10 İndirim`, `180 gün`)
    - `yearly` (`1 Yıllık`, `%20 İndirim`, `365 gün`)
    - `biennial` (`2 Yıllık`, `%30 İndirim`, `730 gün`)
  - Added `POST /api/admin/plans/sync-catalog` (`src/server/routes/admin.ts`) and "Standart Katalogla Eşitle" button in `PlansList.tsx`.
- **2026-10-15 Official Ministry PDFs (`#1.pdf`, `#2.pdf`, `EKLER.pdf`) 5-Phase Full Synchronization & Transactional Emails:**
  - **Faz 1 (Python `ifc_ruhsat` Core Engine):** Added `maddeler_diger` for **EK-9 Tablo 9.2 (16 rows, non-architectural disciplines `ST`, `MK`, `EE`, etc.)** alongside **Tablo 9.1 (21 rows, Architectural `MM`)** in `ek9_form.json`, `ek9.py`, `kontrol.py`, `veri.py`, `bulgu.py`, `emsal.py`, and `epys_preflight.py` (`ek9Table`, `discipline`, `kaynakNo`). Added **EK-7 Tablo 7.9 (`IfcAnnotation`: `Name`, `Description`, `PredefinedType: SURVEY`)** in `ek7_proje.json` and `ozellik.py`.
  - **Faz 2 (`workers/ifc/pdf_preflight.py`):** Added `#1.pdf` **m.8(1)** ISO 216 A4 and multiples page size check (`PAFTA_BOYUTU_ISO216`), **m.8(2)** single-sheet drawing rule check (`COKLU_PAFTA_DUZENI`), and `#2.pdf` **m.6(1)-(2)** embedded electronic signature (`/Sig`) detection (`eSignature`).
  - **Faz 3 (TypeScript `SmartCheck` & `epys-allplan-kit.ts`):** Synchronized `ek6-dictionary.ts` with `EKLER.pdf` (`Tablo 6.3, 6.16, 6.20, 6.25, 6.56, 6.58, 6.66, 6.68`), aligned `epys.ts` with `#1.pdf` `m.13(3)` (`Malzeme İsmi_Dayanım`) + 5D `CSBPozNo` warning, and updated `epys-allplan-kit.ts` (`EmsalDurumu: ["DAHIL", "HARIC", "DIGER"]`).
  - **Faz 4 (Frontend, Admin Docs & Revision History):** Updated `LegislationView.tsx` (official `2026–2033` RG 33331 transition timeline), `BimGlossary.tsx` (`e-PYS`, `EK-9 Formu`), `roadmap-content.ts` (all sections + new `revizyon-gunlugu` before/after comparison & chronological milestone tables), `calculation-content.ts`, `calculation-review.ts` (`BIM-CALC-2026-10-15.3` + `CALC_REVIEW_CHANGELOG` rendered in `CalculationMethods.tsx`), `EpysPreflightPanel.tsx` (`ek9Table` Tablo 9.1 / 9.2 + discipline badge), `PdfPreflightPanel.tsx` (`eSignature` `/Sig` status badge), and `LandingPage.tsx` (Hero, Features, How-It-Works 3 steps & 6 lifecycle cards). Built 8 corporate HTML transactional email templates (`src/server/notifications/email-templates.ts`) + Superadmin `/admin/email-templates` preview & test sender.
  - **Faz 5 (Quota-Free Sample Projects, Engineering Acceptance Evidence Package `BIM-ENG-EVIDENCE-2026-10-15.3` & `ifc_ruhsat`/`ifc_extract` Hardening):**
    - Guarded `oznitelik()` and `_semada_var()` in `workers/ifc/vendor/ifc_ruhsat/kurallar/ortak.py` & `ozellik.py` against `RuntimeError` on 7-attribute IFC4 `IfcAnnotation` entities and added fallback from `PredefinedType` (`None`/`USERDEFINED`) to `ObjectType`. Deduplicated `IfcWall` + `IfcWallStandardCase` via `seen_elem_ids` in `workers/ifc/ifc_extract.py` and added `"DIGER", "DİĞER"` to `emsal_durumu`.
    - Built 1-click **"Örnek Projeyle Canlı Dene (Kotadan Düşmez)"** (`MM` Tablo 9.1 21 rows, `ST` Tablo 9.2 16 rows + `3×3` `COVER_BELOW_STANDARD_MIN`, `PDF/A-2B` ISO 216 A3 + `/Sig` e-imza) on `/app/smartcheck` (`SmartCheckImportWorkspace.tsx`, `src/smartcheck/sample-projects.ts`, `GET /api/smartcheck/sample-projects`, `POST /api/smartcheck/sample-projects/:sampleId` with `quotaConsumed: false` and ÇŞB 2026 price seeds `15.150.1005` / `15.390.1002`).
    - Published `docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md` (`BIM-ENG-EVIDENCE-2026-10-15.3`) and bumped `CALC_REVIEW_META` to `BIM-CALC-2026-10-15.3`.
- **2026-10-16 Multi-Vendor 33-IFC Field Validation, ALLPLAN 2026.1 (`31.4 MB`) Expert Model Fix & Rev. 6 (`BIM-CALC-2026-10-16.1`):**
  - Diagnosed and resolved all 6 root causes on the expert engineer's `31.4 MB` ALLPLAN 2026.1 model (`2026_45_MM_XXXX_MD_MMC_NNN_01_duzenlenmis.ifc`, `1,731` elements) and across 32 international multi-vendor IFC sample models (`IfcSampleFiles-main`, BIMcollab 2025 9 discipline `.ifczip` files, and `ifcbridge-model01..05` `IFC4X1`/`IFC4X2` bridge models):
    1. **Recursive `IfcComplexProperty` Unwrapping (`workers/ifc/ifc_extract.py`, `vendor/ifc_ruhsat/kurallar/ortak.py`, `src/ifc/parser/quantity-extractor.ts`):** Unwrapped ALLPLAN 2026.1 `Object Layer Attributes #1..#4` inside `Pset_WallCommon`, summing layer volumes (`m³`) while keeping only the outer layer area (`2 × outer face`) for wall formwork.
    2. **Multi-Threaded C++ 3D Geometry Engine + Analytical `IfcSectionedSolidHorizontal` Fallback (`workers/ifc/ifc_extract.py`):** Added `batch_extract_3d_geometry` (`ifcopenshell.geom.iterator` + `ifcopenshell.util.shape`), recursive `IsDecomposedBy` (`IfcRelAggregates`) child part volume/area summation (`IfcBuildingElementPart`, `IfcWallElementedCase`), `extract_sectioned_solid_geometry` for `IFC4X2` bridge sweeps, and `extract_curve_length_m` for 2D `GeometricCurveSet` coverings (`SKIRTINGBOARD`).
    3. **Indirect Spatial Containment (`_find_parent_storey` in `workers/ifc/ifc_extract.py` & `src/ifc/parser/spatial-extractor.ts`):** Traversed `IfcCovering -> IfcSpace -> IfcRelAggregates -> IfcBuildingStorey` (and `CoversSpaces`/`CoversElements`) so room-bound coverings resolve to their exact building storey (`1. Bodrum Kat`, `Zemin Kat`, `1. Normal Kat`, `Çatı Katı`).
    4. **Revit QTO Unit Scaling Normalization (`normalize_qto_set_quantities` in `workers/ifc/ifc_extract.py` & `src/ifc/parser/qto-extractor.ts`):** Detected and normalized unscaled `mm³`/`mm²` duplicate `NetVolume`/`NetSideArea` entries and mixed `ft²·mm`/`GrossArea × Width(mm)` (`1000×` / `10⁹×`) unit bugs in Revit IFC exports (`Ifc4_Revit_ARC/STR`, `02_BIMcollab_Example_STR_optimized`, `06_Limestone_walls`).
    5. **e-PYS Filename & Discipline Inference (`workers/ifc/epys_preflight.py`, `vendor/ifc_ruhsat/kontrol.py`):** Passed `dosya_adi=effective_name` into `kontrol.kontrol_et` instead of `/tmp/.../model.ifc` and added token-hint discipline inference (`ST/STR`, `MK/MEP`, `EL`, `MM/ARC`) when filenames deviate from the 9-token EK-2 template.
    6. **Browser Preview Limit & Explicit Plan File Size Error (`src/ifc/browser-preview.ts`, `src/server/routes/smartcheck.ts`):** Raised browser preview cap from `25 MiB` to `50 MiB` and replaced generic `"Geçersiz dosya bilgisi."` with `"Dosya boyutu (X MB) paketinizin maksimum IFC/doküman boyut sınırını (Y MB) aşıyor."` (`FILE_SIZE_LIMIT_EXCEEDED`).
  - Result across all 33 IFC models: `33 / 33` exit with `0`, `1,731 / 1,731` (`100%`) elements admitted on `2026_45_MM_XXXX_MD_MMC_NNN_01_duzenlenmis.ifc` (`1,559.21 m³` volume, `7,861.01 m²` formwork, `6,268.95 m²` covering area). Updated `/admin/roadmap` and `/admin/roadmap/calculations` to **Rev. 6 (`BIM-CALC-2026-10-16.1`)**.
- **2026-10-17 Allplan 4-Excel Cross-Validation, Multi-Layer Trade Explosion, Skirting (`mtül`), 16-Apartment Schedule & 3-Step Calm UI (`Rev. 7` · `BIM-CALC-2026-10-17.1`):**
  - Cross-validated `2026_45_MM_XXXX_MD_MMC_NNN_01_duzenlenmis.ifc` against Melih Dinekli's 4 Allplan Excel reports (`melihdinekli/*.xlsx`) and implemented:
    1. **Multi-Layer `IfcCovering` Trade Explosion (`workers/ifc/ifc_extract.py`, `src/ifc/calm-icmal.ts`):** Extracted `materialLayers` (`Object Layer Attributes #1..#4` `Malzeme` and `IfcRelAssociatesMaterial`) so composite coverings automatically explode into distinct contractor line items (`Şap 3 cm: 1.761,33 m²`, `Laminat Parke: 921,11 m²`, `Seramik Döşeme: 840,22 m²`, `XPS/Şilte: 1.599,13 m²`, `Duvar Fayans: 1.175,15 m²`, `Kaba Sıva: 4.775,62 m²`, `Saten Alçı: 4.775,62 m²`, `Plastik Boya: 4.775,62 m²`).
    2. **Skirting (`SKIRTINGBOARD`) Linear Meter Conversion (`lengthM` in `mtül`):** Converted skirting coverings from `m²` (`53,61 m²`) to contractor-ready linear meters (`893,54 mtül` Parke Süpürgeliği + `753,92 mtül` Seramik/Granit Süpürgelik).
    3. **Independent Unit / 16-Apartment Schedule (`IfcZone` + `IfcSpace`):** Extracted `summary.apartmentSchedule` (`D01..D16` + `OAL` + `BDR`) with room-by-room net sweepable `m²`, balcony `m²`, unit gross `m²`, and general gross `m²`.
    4. **3-Step "Kağıt İcmal + Sağ Detay Kartı" Calm UI (`src/components/smartcheck/CalmIfcWorkspace.tsx`):** Mounted on both `SmartCheckImportWorkspace.tsx` and `BimIfcParser.tsx` with 3 tabs (`1. Malzeme İcmal Listesi` | `2. Daire Metrekareleri (16 Daire)` | `3. Maliyet & Teklif`), 3-column paper sheet on the left, and `Brüt − Kapı/Pencere Boşluğu (Minha) = Net` + storey/room Green Book inspector card on the right.
- **2026-10-17 Centralized Pafta Design System (Light `#f3f1e9` / Dark Anthracite `#141517`), High-Contrast Bridge, Early-Access Waitlist (`/admin/leads`), PageSpeed Optimization & `GAP_RAPORU_2026-10-17.md` Remediation (`Rev. 8.1–8.2` · `BIM-CALC-2026-10-17.2`):**
  - Centralized Light/Dark tokens in `DESIGN.md` & `src/index.css` (`ThemeToggle.tsx`, `PaftaDrawing.tsx`), mapping legacy `.text-white` and pastel `-200/-300/-400` classes to deep high-contrast pigments in Light Mode and setting Dark Mode to deep anthracite (`#141517`).
  - Added Development Notice + Early-Access Waitlist (`#on-kayit`) on `LandingPage.tsx` and `/admin/leads` (`PilotApplications.tsx`) with search, status filtering, and CSV export.
  - Remediated `GAP_RAPORU_2026-10-17.md`: removed `/2026_45/i` filename fallback in `src/ifc/calm-icmal.ts` (`Y-1`), hardened `POST /api/pilot-applications` against duplicate-email PII leakage and overwrite (`Y-2`), injected `findSubscription` in `src/server/middleware/auth.ts` for DB-free unit tests (`Y-4`), protected customer/sample IFC & PDF files in `.gitignore` (`Y-5`), and eliminated render-blocking Google Fonts + inline `<script>` in `index.html` (`src/main.tsx`, `src/App.tsx`).
- **2026-10-17 `GAP_RAPORU_2026-10-17.md` Rev. 2 Remediation — Runtime ISO 19650-1/2 & LOIN Engine, 4734 KİK m.38 Abnormally Low Bid Engine, `4,00 m²` Minha Profile, Self-Hosted `@fontsource` Fonts & Security/Bundle Hardening (`Rev. 9.1` · `BIM-CALC-2026-10-17.3`):**
  - Built runtime `src/smartcheck/rules/iso19650.ts` (ISO 19650-2 7-part & RG 33331 EK-2 9-part container naming, CDE `S0..B` & `Pxx.xx`/`Cxx` revision discipline, EN 17412-1 LOIN geometric/alphanumeric/GUID completeness) and wired it into `src/smartcheck/rules/ifc-rule-run.ts` (`GEO-2`).
  - Built runtime `src/lib/kik-adt.ts` (4734 KİK m.38 & Genel Tebliğ m.45.1 boundary value $SD = R \times YM$, $1\sigma$ outlier band, $N = 1.00 / 0.80$, and 80% Pareto explanation-required items) and integrated an interactive card into `CalmIfcWorkspace.tsx` Tab 3 (`GEO-2`).
  - Added `CSB_FORMWORK_4M2` (`4.00 m²`) opening deduction profile to `src/smartcheck/rules/minha.ts`, aligned `index.html` JSON-LD / `llms.txt` / `Footer.tsx`, and fixed duplicate waitlist feedback in `LandingPage.tsx` (`BUG-1`).
  - Gated 50 MB PDF import JSON parsing behind `authenticate + checkSuperAdmin()` (`SEC-2`), restored fail-closed `isImpersonationRevoked` (`SEC-7`, `SEC-11`), added `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and HSTS `preload` (`SEC-8`, `SEC-9`), self-hosted `Manrope Variable`, `Instrument Serif`, and `IBM Plex Mono` via `@fontsource` while removing external Google Fonts and unused `Geist` (`SEC-3`, `UI-4`, `PERF-2`), extracted `buildCalibrated202645Dataset` to `src/ifc/calibrated-2026-45-fixture.ts` (`BUG-4`), isolated the 450 kB `charts` chunk from `index.html` (`PERF-1`), and returned real HTTP `404` + `noindex` on unknown SPA paths (`BUG-3 / SEO-2`).
- **2026-10-17 `YOL_HARITASI_2026-10-17.md` Faz 0 (`K-1`..`K-5`, `0.1`..`0.7`) & `bakanlıktan-gelen-son-pdfler` (`#1.pdf`, `#2.pdf`, `EKLER.pdf`) Alignment (`Rev. 10` · `BIM-CALC-2026-10-17.4`):**
  - **`K-1` (`src/lib/kik-adt.ts`):** Implemented the exact official Kamu İhale Genel Tebliği m.45.1.1 / m.45.1.1.1 / m.45.1.1.4 formula (`[0.40 * YM, 1.20 * YM]` valid bid filter, piecewise $K$ coefficient from $C = T_{\text{ort2}} / YM$, official $N = 1.00$ for `ust_yapi` and $N = 1.20$ for `alt_yapi`, single-bid rule $T_{\text{ort2}} = T_1$, and $SD = \max(0.40 \times YM,\; (K \times T_{\text{ort2}}) / (C \times N))$). Returns `hasTenderSessionInputs: false` (`boundaryValueTry: 0`) when `YM` or bids are omitted.
  - **`K-1b` / `0.1` (`src/components/smartcheck/CalmIfcWorkspace.tsx`):** Removed fabricated `estimatedYm = costSummary.directTotal * 1.25` and hardcoded `sampleBids`; added explicit user input fields for `YM` and `T_i`.
  - **`K-2` / `0.2` (`src/smartcheck/rules/ifc-rule-run.ts`, `src/smartcheck/rules/iso19650.ts`):** Removed hardcoded `"SHARED"`, `"S3"`, `"P01.01"`, `"Zemin Kat"`, `"row-N"`, and `r.rawDescription` fallbacks; returns `cdeEvaluationStatus: "not_evaluated"` when CDE metadata is absent; bound 9-part RG 33331 EK-2 filename validation directly to `workers/ifc/vendor/ifc_ruhsat/ekler/ek2_disiplinler.json` (`bakanlıktan-gelen-son-pdfler/EKLER.pdf`).
  - **`K-3` / `0.3` (`src/smartcheck/rules/minha.ts`):** Replaced unsourced `CSB_FORMWORK_4M2` with `CUSTOM_CONTRACT` requiring an explicit `customThresholdM2` parameter.
  - **`K-4` / `0.4` (`src/server/production-frontend.test.ts`), `K-5` / `0.5` (`index.html`, `src/server/security/web-hardening.ts`) & `0.6` (`csb-2026-official-catalogs.json`):** Fixed SPA route vs 404 test assertions, updated storefront/LLM metadata (`N=1,00 / N=1,20`), and set `validityStart: "2026-03-01"` / `validityEnd: "2026-03-31"` on the 4 March 2026 monthly ÇŞB lists.
- **2026-10-17 `YOL_HARITASI_2026-10-17.md` Faz 1 (`1.5`, `1.6`, `1.7`) & Faz 2 (`2.1`, `2.4`, `2.6`) — Capability Registry & Evidence Gate, KİK Golden Test Suite, Full 18,848-Row 6-Book ÇŞB 2026 Price Book Ingestion, `/admin/pricing-sources` 6-Tab Governance UI & Interactive ISO 19650 CDE/LOIN Card (`Rev. 11` · `BIM-CALC-2026-10-17.5`):**
  - **`Faz 1.5` (`src/capabilities/registry.ts`, `src/capabilities/registry.test.ts`, `src/server/security/web-hardening.ts`):** Created Single Source of Truth Capability Registry (`BIM-CAP-2026-10-17.2`) with `L0..L4` verification levels, `live | pilot | roadmap` statuses, official regulatory sources, golden test links, and reviewer sign-offs; wired `llms.txt` directly to the registry and enforced CI gates against <L3 live claims and hardcoded inputs.
  - **`Faz 1.6` (`src/lib/kik-adt.ts`, `src/lib/kik-adt.golden.test.ts`):** Added `computeKikKFactorExact` for unrounded intermediate $K$ multiplication (exact kuruş precision at $10^8$ TL scale) and 5 official Tebliğ m.45.1 golden test scenarios.
  - **`Faz 1.7`, `Faz 2.4` & `Faz 2.6` (`src/server/crawler/data/csb-2026-official-catalogs.json`, `src/server/crawler/csb-pdf-parser.ts`, `src/server/routes/pricing-file-import.ts`, `src/pages/admin/PricingSources.tsx`):** Ingested 100% (`18,848 / 18,848` rows) across all 6 official 2026 ÇŞB PDF books (`csb_2026_mart_insaat_bf`: `1,861`, `csb_2026_mart_insaat_rayic`: `5,360`, `csb_2026_mart_mekanik_bf`: `5,678`, `csb_2026_mart_elektrik_bf`: `5,910`, `csb_2026_yapi_yaklasik_maliyet`: `18`, `csb_2026_tuik_endeks_eslestirme`: `21`), raised `maxRows` cap to `20,000`, added `getOfficialCatalogCoverageReport()`, and restructured `/admin/pricing-sources` into 6 governance tabs (`1. Kurumlar & Lisanslar`, `2. Fiyat Kitapları`, `3. İçe Aktarma`, `4. Doğrulama & Onay`, `5. Kapsam Raporu`, `6. Endeksler & Onaylı Kayıt Arama`).
  - **`Faz 2.1` (`src/components/smartcheck/CalmIfcWorkspace.tsx`):** Added an interactive zero-default ISO 19650-1/2 CDE (`WIP`/`SHARED`/`PUBLISHED`/`ARCHIVED`), suitability (`S0..B`), revision (`Pxx.xx`/`Cxx`), and delivery stage inspection card alongside the real EN 17412-1 LOIN completeness badge.
- **2026-10-17 `YOL_HARITASI_2026-10-17.md` Faz 2.1 / 2.2 & Section 7 Decisions (#2, #3, #4, #6) — CDE State Transition Validator (`validateCdeStateTransition`), 4-Stage EIR/LOIN Engine (`evaluateLoinByMilestone`), Interactive Minha Selector & Dated Roadmap Badges (`Rev. 12` · `BIM-CALC-2026-10-17.6`):**
  - **`Faz 2.1` & `Faz 2.2` (`src/smartcheck/rules/iso19650.ts`, `src/smartcheck/rules/iso19650.test.ts`, `src/components/smartcheck/CalmIfcWorkspace.tsx`, `src/capabilities/registry.ts`):** Added `validateCdeStateTransition` (blocking direct `WIP -> PUBLISHED` jumps without `SHARED`, verifying suitability/revision codes) and `evaluateLoinByMilestone` (`CONCEPT` LOD 200, `DEFINITIVE` LOD 300, `IMPLEMENTATION` LOD 350, `AS_BUILT` LOD 400). Upgraded `iso19650-cde-workflow-state-machine` to `L3` `live` (`BIM-CAP-2026-10-17.3`).
  - **Section 7 Decisions #2, #3, #4, #6 (`CalmIfcWorkspace.tsx`, `LandingPage.tsx`, `index.html`):** Persisted KİK `YM`/`T_i`, CDE transition log, and Minha profile in `localStorage`; added interactive Minha profile selector (`CSB_2026: 0,50 m²`, `DIN_18350: 2,50 m²`, `CUSTOM_CONTRACT: m²`); standardized ISO 19650 `"destekler"` wording; added `"Yol Haritasında · 2026 Q4"` badges for EKAP and Ghostscript/veraPDF.
- **2026-10-17 `YOL_HARITASI_2026-10-17.md` Faz 2.5 & Section 7 Decision (#1) — 4735 Price Escalation ($F = A_n \times B \times (P_n - 1)$), ÇŞB 2026 – TÜİK 21 Sub-Index Engine & BYOL License Mode (`Rev. 13` · `BIM-CALC-2026-10-17.7`):**
  - **`Faz 2.5` (`src/lib/price-escalation.ts`, `src/lib/price-escalation.test.ts`, `src/capabilities/registry.ts`):** Implemented `CSB_2026_TUIK_SUB_INDICES` (21 official sub-indices), `computeContractPriceEscalation4735` ($F = A_n \times 0,90 \times (P_n - 1)$, $\sum w_i = 1,00$, exact kuruş precision), and `indexOutOfPeriodUnitPrice` (explicit `TUIK_INDEXED_ESTIMATE` tag). Registered as `L3` `live` in `BIM-CAP-2026-10-17.4`.
  - **Section 7 Decision #1 (`CalmIfcWorkspace.tsx`):** Added BYOL (`BYOL_TENANT_CATALOG`) vs `CSB_2026_REFERENCE` license mode selector and interactive 4735 / TÜİK 21 sub-index simulator in Tab 3.
- **2026-10-17 `YOL_HARITASI_2026-10-17.md` Section 7 Decision (#5) — Local TR Card & Installment Payment Channel (`iyzico / PayTR / Stripe TR`) in `Billing.tsx` (`Rev. 14` · `BIM-CALC-2026-10-17.8`):**
  - Added dual payment channel selector (`Havale / EFT (%10–%30 İskonto)` vs `Türkiye Kartları & Taksit (iyzico / PayTR)`) and interactive 1 / 3 / 6 / 9 / 12 installment schedule preview for Turkish commercial cards (Bonus, World, Maximum, Axess, Paraf, Bankkart, Troy) in `src/pages/Billing.tsx`.
- **2026-10-17 Melih Dinekli Field Feedback Recorded (`docs/audits/MELIH_DINEKLI_SAHA_GERIBILDIRIMI_2026-10-17.md` & `HANDOFF_2026-10-17.md` §2.14):**
  - Permanently recorded all 6 field findings (Allplan TÜRKSERT vs Revit 5 cm beam-column overlap, exposed formwork surface vs Revit Family faces, 10 m -> 9.96 m 10-15% finishing layer collision, pre-IFC TAKS/KAKS/multi-parcel Excel feasibility & unit net/gross sharing, 50,000 TL/m² trade % breakdown & +10 m² quality-theft detector, and per-apartment subcontractor shield for Daire 3 plaster/screed 3 cm vs 5 cm).

## Next code work

- `Paket M-1` (Rev. 15), `Paket M-2` (Rev. 16), `Paket M-3` (Rev. 17) DONE.
- `Rev. 18` (Python worker FILE_NAME & IfcApplication), `Rev. 19` (pre-BIM .xlsx import), `Rev. 20` (kaynaksız çarpan temizliği), `Rev. 21` (minha & server-path uçtan uca test), `Rev. 22` (ücretsiz hesaplayıcılar), `Rev. 23` (KİK N aralık denetimi), `Rev. 24` (fizibiliteden teklif taslağı köprüsü & CreateQuote doğrudan Excel/CSV kalem aktarımı) DONE.
- Melih Dinekli'den 17 soru yanıtı bekleniyor (`docs/audits/MELIH_DINEKLI_BEKLEYEN_SORULAR_2026-10-17.md`).
- Ücretsiz hesaplayıcılar kullanıcı isteğiyle şimdilik vitrinde/menüde bekletiliyor; bağımsız uzman teyidi sonrası açılacak.
- **Rev. 25 (BIM-CALC-2026-10-17.19):** CreateQuote (`/app/quotes/new`) ve QuoteDetail (`/app/quotes/:id`) sayfalarındaki tüm sabit `zinc-*` sınıfları, gölgeler, gradyan balonları ve neon butonlar Pafta Tasarım Sistemi'ne (`DESIGN.md`) uygun olarak semantik tokenlere (`bg-card`, `bg-background`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`) uyarlandı; açık modda siyah blok ve düşük kontrast problemleri tamamen giderildi.
- **Rev. 27 (BIM-CALC-2026-10-17.21, `DENETIM_RAPORU_2026-10-17.md` P0 kapanışı):** Yetenek Kaydı'ndaki kurgusal "Denetim Kurulu" onayları silindi; tüm yetenekler `pilot / L2`. `live / L3` yalnız adı-soyadı, unvanı, **sicil numarası** ve tarihi olan gerçek bir uzmanın imzasıyla verilir (`registry.test.ts` zorlar). Kat Karşılığı ve YAMBİS hesaplayıcıları rota/sitemap/llms.txt'ten çıkarıldı (kayıtta `roadmap / L1`; sayfa dosyaları duruyor, yeniden yayın için KK-1…5 ve YB-1…4 önce kapanmalı). Faturalamadaki kart/taksit kanalı kaldırıldı (iyzico/PayTR entegrasyonu yok). Sunucu her genel rota için başlık/açıklama/canonical yazar, bilinmeyen rota `noindex` alır; `/og-image.png` ve `/llms-full.txt` eklendi. CI'daki Kurumsal AI limiti testi katalogdan (150) okur.

- **Rev. 28 (BIM-CALC-2026-10-17.22):** Oturum artık HttpOnly çerezde: `bm_session` (+ süper admin için `bm_admin`), `SameSite=Strict`, `Path=/api`, üretimde `Secure` (`src/server/auth/session-cookie.ts`). Tarayıcıya jeton yanıt gövdesinde verilmez (`Sec-Fetch-Site` başlığı olan istemci = tarayıcı); API istemcileri/testler `Authorization: Bearer` kullanmaya devam eder. Çerezle gelen değiştirici istek aynı-origin kanıtı ister (403 `CSRF_ORIGIN_MISMATCH`). İstemci yalnız `bm_authed` ipucunu (kimlik bilgisi değil) localStorage'da tutar; `fetchWithAuth` Authorization eklemez, yönetim bağlamında `X-BM-Context: admin` gönderir. Yeni uç nokta: `POST /api/auth/logout`; impersonation çıkışı admin çerezini geri yükler. CI'a `scripts/e2e-core-flow-smoke.ts` ve `gap-crm-billing-ui-smoke.ts` eklendi (giriş → müşteri → teklif → PDF → yenileme → CSRF → çıkış). `scripts/migrate-design-tokens.mjs` köprü eşlemesini kaynağa uyguladı (2.962 sınıf; açık modda 4 sayfada piksel farkı 0; koyu modda saf beyaz → tebeşir #f3f1e9). Kalan 417 sınıf ön ekli (`hover:` vb.) veya renkli vurgu; köprü silinmeden önce bunlar elle taranmalı.

- **Rev. 29 (BIM-CALC-2026-10-17.23, `docs/audits/RESMI_VERI_ARASTIRMASI_2026-10-17.md`):** Resmî veri araştırması uygulandı. (1) **KİK:** `kik-adt.ts` Tebliğ'in adım adım yuvarlamasını uygular (Tort1/σ/Tort2 2, C/K 3 ondalık) ve Tebliğ **45.2 resmî örneğini birebir üretir (SD = 52.281,00 TL)**; yuvarlamasız önceki sürüm 52.260,35 veriyordu. (2) **Müteahhit sınıflandırma:** `yambis-classification.ts` yönetmeliğin konsolide metnine (mevzuat.gov.tr No 31301) göre yeniden yazıldı: 14 grup, eşikler **yapı sınır bedelinin katları** (2026 = 1.238.250.000 TL = III. ve IV. sınıf birim maliyet ortalaması × 45.000), m² sınırı yok; bilanço 0,75/0,15/<0,75; ciro %10 (E, E1) / %15 (üst); G ve G1'de yalnız banka referansı; H'de şart yok. (3) **Kat karşılığı:** `kat-karsiligi.ts` konut KDV'sini net alana göre kısım bazlı hesaplar (1/4/2022 sonrası ruhsat: genel ilk 150 m² %10, fazlası %20; 6306: ilk 150 m² %1, fazlası %20), arsa sahibine teslimi emsal bedelden vergilendirir, tüm çarpanlar girdidir, tapu devri aşamaları ÖRNEK şablondur (içtihat değil). (4) **4735:** B = 0,90 ve ağırlık toplamı 1,00 resmî metinden doğrulandı; resmî sayısal örnek yok. (5) Sunucu her genel rotaya `<noscript>` içerik ekler (tam ön-render değildir). **Üç motor ve iki hesaplayıcı sayfası hâlâ yayında değil** (uzman onayı yok). Güven düzeyleri ve doğrulanamayanlar araştırma dosyasında.
- **Rev. 30 (BIM-CALC-2026-10-17.24, `docs/audits/MELIH_DINEKLI_BEKLEYEN_SORULAR_2026-10-17.md`):** Melih Dinekli'nin 17 saha sorusuna verdiği resmi yazılı yanıtlar (`yanitlar.rtf`) ve 27 kalemlik 6-villa proje maliyet dökümü (`6-villa 2 A'dan Z'ye piyasa maliyetii.pdf`) koda bağlandı. (1) **Taşeron Şap Hakediş Kalkanı:** Türkiye piyasa standardı (1 m³ şap = 325 kg çimento + %10 fire, 1:3-1:4 kum-çimento oranı) ve 4 yaygın taşeron şişirme taktiği koda ve Golden 8 testine bağlandı (`MELIH_DINEKLI_SCREED_BENCHMARK`). (2) **Net Mahal Ölçüm Kuralları:** 2 cm sıva payı (10 m oda -> 9,98x9,98 m net zemin), 1 m x 0,20 m dışa açılan kapı eşik payı (+0,20 m²), kapı/pencere kasa derinlik payı (+0,40 m²) ve süpürgelik tülü doğrulandı. (3) **İmar & Fizibilite %30 Tavanı:** Planlı Alanlar İmar Yönetmeliği m.5/8 ve Melih Dinekli teyidi uyarınca emsal harici alanın (ortak alan, sığınak, otopark) emsal alanının %30'undan fazlasının yasal olarak yapılamayacağı denetimi ve açık uyarısı `pre-bim-feasibility.ts` motoruna eklendi (Golden 13). (4) **27 Kalemlik 6-Villa Piyasa Maliyet Referansı:** Melih Bey'in projesine ait 27 kalemlik döküm (Beton-Demir %20,43, Şantiye Kurulumu %8,10, Projelendirme %7,13, Kamu Ödemeleri %7,03, Elektrik %6,35, Isıtma-Soğutma %5,27, Pencere %4,84, Çatı %4,32, Dış Cephe %4,03 vb., toplam 4.135.752,77 TL) `MELIH_DINEKLI_VILLA_COST_BENCHMARK_2026` olarak sisteme bağlandı (Golden 14). Roadmap ve Calculation Review Rev. 30'a yükseltildi.
- **Rev. 31 (BIM-CALC-2026-10-17.25):** Müteahhitlik İş Akışları Karşılama Masası (`ContractorWorkflowHub.tsx`) geliştirildi. Kullanıcının giriş anında boş bir tablo yerine projesinin bulunduğu yaşam döngüsüne göre (Evre 01: Arsa & Ön Fizibilite / Excel İhale, Evre 02: 3D openBIM IFC Otomatik Metraj & Minha, Evre 03: Taşeron Hakediş Kalkanı & 325 kg/m³ çimento tavanı) yönlendirilmesi sağlandı. Aktif teklifler olduğunda kompakt yatay süreç şeridi, boş durumda ise rehber onboarding vitrini sunulur. PreBimFeasibilityPanel'e doğrudan çapa navigasyonu (`id="pre-bim-feasibility"`) eklendi.
- **Rev. 32 (BIM-CALC-2026-10-17.26):** Sistem Hızlı Turu & İnteraktif Onboarding Rehberi (`SystemQuickTour.tsx` & `TourWelcomeBanner`) devreye alındı. Sıfır harici npm bağımlılığıyla, Pafta Tasarım Sistemi kurallarına (1px teknik çizgiler, köşe krosları `+`, semantik tokenlar) tam uyumlu olarak inşa edildi. Kullanıcıyı ve denetçiyi 5 temel iş adımında (1. Müteahhitlik Süreç Masası, 2. SmartCheck & IFC Yükleme, 3. Taşeron Hakediş Kalkanı, 4. Kamu İhale & Fiyat Farkı Araçları, 5. Pafta Anteti) hedefli spotlight ile adım adım gezdirir. ESC, yön tuşları, localStorage kalıcılığı ve Dashboard başlığında kalıcı `[🧭 Hızlı Tur]` tetikleyicisi bağlandı. Unit test: `src/components/dashboard/SystemQuickTour.test.ts`.

## Ground rules for agents

- Academy is out of scope (2026-10-13): `ACADEMY_ENABLED = false` in
  `src/config/features.ts` hides it from menus/links and redirects its routes.
  Do not build on Academy until the flag is turned back on.

- 3x3 is company policy: metraj ≤ 3%, cover ≥ standard minimum in mm (TS 500
  default; EC2 XC3 35 mm only for `activeStandard = EUROCODE_2`), load-bearing
  in STR. Never "%3 paspayı". Rule pack `smartcheck-3x3-2026-10-v2`.
- **No `live` / `L3` capability without a real, named, registered reviewer** (name, title, registrationNo, date). Fictional boards or agent skills are not sign-offs. Public calculators must start with empty inputs.
- CI (`Verify` workflow) must be green before a Coolify deploy; a red commit is never deployed.
- Dev demo / guest bypass exists only when `import.meta.env.DEV`.
- No official ÇŞB/YFK prices without written licence; IFC transfer never
  invents unit prices.
- Engineering and cost numbers go through the `yuksek-muhendis-mimar` skill.
- **Mandatory Chronological Roadmap & Calculation Review Rule (Never wait for user reminder):** Engineers and investors do not read GitHub commits; they track the project's evolution on `/admin/roadmap` and `/admin/roadmap/calculations`. On **every** feature, rule, regulation, or calculation change, automatically update `src/pages/admin/roadmap/roadmap-content.ts` (`#durum`, `#adimlar`, `#revizyon-gunlugu` Tablo 1 & Tablo 2 in strict chronological order `Rev. 0 → Rev. 1 → ... → Rev. N`) and `src/pages/admin/roadmap/calculation-review.ts` (`CALC_REVIEW_META.version`, `CALC_REVIEW_CHANGELOG` in strict chronological order `Rev. 1 → ... → Rev. N`, and per-module `moduleDetails`), plus public/guide pages (`LandingPage.tsx`, `LegislationView.tsx`, `BimGlossary.tsx`) when applicable, and verify with `npx tsx --test src/pages/admin/roadmap/content.test.ts`.
- DB-backed tests need an isolated PostgreSQL 16 (CI pattern in
  `.github/workflows/verify.yml`); they refuse the shared database.

## Open items owned by Hazar

Stripe + legal texts (P0-2), external security review (P0-5), DKIM and inbox
test (P1-8), YFK licence (P1-2), AI provider keys and eval budget (P1-6),
Real pilot IFC/PDF acceptance evidence, real named expert sign-offs (engineer + tax/tender advisor) for the L3 gate, brand spelling decision (BIMMetraj vs BIMMetraj), card-payment provider decision, runtime DB role, DKIM, (httpOnly cookies: done in Rev. 28). Revisit Sentry quota after the trial
automatically transitions to the free plan; do not enable paid usage.
