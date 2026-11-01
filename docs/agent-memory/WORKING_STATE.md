# Working State: BIMMetraj

Last updated: 2026-11-01. Keep this file to one page: current truth only. Move
history to `archive/` (latest: `archive/WORKING_STATE_until_2026-10-24.md`).

## Production

- `https://bimmetraj.com` on Coolify (app `ibjv2zbpecdcbd71lxo1vqd7`), Docker
  Compose `compose.coolify.yaml`: `app`, `worker`, `ifc-worker`, `migrate`,
  `backup`. Vercel files are legacy.
- **Rev. 156 (PR until deployed):** worker emits `classInventory` (instances per building class); the screen shows a model inventory card and a standalone door/window block; concrete lines say which classes fed them. Verified against Allplan's own slab report for 2026_45: 160 slabs, 322.37 m³, identical per element. The 13 geometry-only slabs (9 named ST_TML_BETON-C35, 294.55 m³ by geometry) are absent from Allplan's report too; their role is an open question for the expert.
- **Rev. 155 (live after deploy):** the worker's apartment/room schedule is copied into the stored IFC evidence and shown on the server result screen (2026_45: 16 dwellings, 1,265.44 m², 172 rooms of 178 IfcSpace). Records processed before this have no schedule; reprocess the file. Known: the other summary fields the worker produces (e.g. trPsetCsb) are not shown on this screen either.
- **Rev. 154 (live, 9662b05):** result summary and subtitle separate evidenced elements from the whole model (2026_45: 160 evidenced of 1,731). The line "Modelde Çoklu Katman Bilgisi Yok" still only looks at IfcCovering.
- **Rev. 153 (live, e449f27):** result screen now passes the stored consistency report, so the coverage card counts all model elements (2026_45: 160/1,731 = 9.2%, was 160/160). Still open: 1,571 geometry-only elements are not listed as uncovered, only counted in the total. Opening-deduction card shows on m² lines only.
- **Rev. 152 (PR until deployed):** TÜİK dataflow structure view (`GET /api/admin/tuik/dataflows/:id`). Real list read live on 1 Kasım 2026: agency is `TR`; İME is `DF_UFE_INSAAT_V1`, Yİ-ÜFE `DF_YIUFE_EDO_V1`/`DF_UFE_V6`, TÜFE only as `DF_TUFE_SDMX_*`; the adapter's `TUIK`/`DF_IME`/`DF_YI_UFE` are wrong. Automatic sync waits for the structure output.
- **Rev. 151 (PR until deployed):** server-processed IFC screen now gets openings and authoring software through `GET /api/smartcheck/documents/:id/ifc-summary`; before this it passed a null summary, so every server result said no door/window data. Foreign models with non-Turkish, non-concrete materials still give an empty summary by rule; the message now says why.
- **Rev. 150 (PR until deployed):** CSB_2026 opening rules now follow the "Ölçü" clauses of the 2026 İnşaat analyses, read for all 1,879 analyses: plaster, gypsum finish and paint deduct every opening and add reveals; walls 0.10, gypsum board 0.50, suspended ceilings 0.25 m² (smaller stays). Genel Teknik Şartname was not read. Expert acceptance open. Writing the price rows into the product needs ÇŞB written permission (FSEK notice in the books).
- **Rev. 149 (PR until deployed):** admin TÜİK connection check (`GET /api/admin/tuik/connection`, card on Mevzuat Bekçisi). The adapter's agency `TUIK` and flow ids are unverified until the real list is read; no automatic index sync yet.
- **Live revision: `d9b400a` (Rev. 148, deployed 1 Kasım 2026 with `verify` green, migration 0042). Plan values belong to the admin panel; the catalog only fills missing plans and empty columns.** T45 measurement (Rev. 142, arm64, 1.5 CPU, 2 GB, four open-license models 62-120 MB): 6-23 s, peak 1.75 GB; real customer file still missing. Previous live: `3812e82` (Rev. 138), before it `3a9bb7d` (Rev. 133):
  T41 8B: `bimmetraj_worker_get_entitlement()` SECURITY DEFINER capability function aktif;
  `bimmetraj_worker` — `subscriptions` ve `plans` tablolarında 0 privilege (db-provision contract).
  T44: Docker PG16 kurtarma tatbikatı tamamlandı (5 sütun, 30 Ekim 2026);
  pg_dump/pg_restore 130/522 ms, RPO 0 kayıp, katalog e5e4d3d1, 38 migration doğrulandı.
  Active handoff: `docs/agent-memory/HANDOFF_2026-10-30_T41_8B_TAMAMLANDI.md`.
  Release migrations `0022..0029` are applied in
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
- **Fixed live (Rev. 134, 31 Ekim 2026):** on `3a9bb7d` every IFC processing request returns 503 `IFC_LIMITS_UNAVAILABLE`: Rev. 133 sends the app-role request through the worker-only `bimmetraj_worker_get_entitlement`. Upload routes also read the lowest plan's limits outside tenant context. Retested live on `a78c9c1`, see smoke below. The function now has no caller in running code, so the Rev. 133 'aktif' wording below means the grants only.
- **Rev. 141 (PR until deployed, migration 0040):** trial quota counts once over the trial period (`usage_records.period` = start date); paid plans stay monthly. Trials active at deploy start a new counter once. Enterprise team and priority claim removed.
- **Rev. 140 (PR until deployed):** server IFC limits refuse inactive or expired subscriptions (403 `SUBSCRIPTION_INACTIVE`) and closed plans (403 `IFC_NOT_AVAILABLE`). The lowest-plan fallback stays only for companies without a plan.
- **Rev. 139 (PR until deployed):** EK-2, EK-3, Table 7.8 and Table 9.2 item 9 corrected from EKLER.pdf page images, pinned in `workers/ifc/vendor_tests/ifc_ruhsat/test_ek_resmi_kodlar.py`. Full analysis: `docs/audits/phase-5/EPYS_EKLER_TAM_ANALIZ_2026-10-31.md`. Open for the Ministry: EK-5 naming for IfcSpace, site, building and storey differs from the sample model; `-` versus `_` in description; three-character Table 2.11 codes.
- **Rev. 138 (live; company deletion runs in one transaction):** super admin can remove members and delete accounts with no remaining references, and permanently delete a company after typing its name. Any company_id table outside the allow-list with rows blocks deletion (documents, payments, CDE, hakediş, Academy, leads). Uploaded files are not handled, so firms with documents cannot be deleted yet.
- **Rev. 137 (PR, not live until deployed):** Settings shows a read-only Hesabım section. New registrations store the login email as company contact email; companies without one see it prefilled and it is stored on save.
- **Decision (Hazar, 31 Ekim 2026):** unverified accounts cannot log in (Rev. 136). Register opens no session, login returns 403 `EMAIL_VERIFICATION_REQUIRED` after the password check, existing sessions are rejected in `authenticate`, resend is on the login and register screens. Only read-only support impersonation may open such an account. Existing unverified production accounts are locked out until they verify.
- **Decision (Hazar, 31 Ekim 2026):** no PDF/A conversion, validate only (T32, Rev. 135). T32 stays open for permitted real PDFs, a live worker smoke and document expert acceptance.
- **Live smoke (31 Ekim 2026, `a78c9c1`, Demo owner session, no password entered):** session survives reload, no token in localStorage, session cookie hidden from JS. Tenant reads 200 (`auth/me`, `quotations`, `clients`, `smartcheck/queue`, `billing/alerts`, `billing/subscription`, `billing/usage-stats`, `company`, `company/profile`, `company/risk-settings`, `crm/leads`, `crm/pipeline`, `market-intelligence/supplier-quotes`, `smartcheck/sample-projects`); `admin/dashboard` 403 for non-admin. Quote create + PDF OK (30.000 net, 36.000 with VAT). IFC upload → 202 → `succeeded`, 2 rows `pending_review` (8,4 and 5,2 m³; repo fixture, not a real project). Non-compliant PDF → veraPDF 1.30.3 `2B uyumsuz`, new re-export message on screen. **Left in Demo:** quote `3d08b788-d70c-4bb4-b4a2-7874bb10db87` ("SMOKE canlı test"), `smoke-2026-10-31-*.ifc/.pdf`.
- **Confirmed (30 Ekim 2026):** T41 8B worker entitlement capability function (`3a9bb7d`) production'da aktif.
  `bimmetraj_worker` ACL daraltması tamamlandı: db-provision contract ile subscriptions/plans 0 privilege güvence altında.
  T44 kurtarma tatbikatı Docker PG16'da tüm 5 sütunla geçti (30 Ekim 2026).
- **Still open (Hazar, needs passwords or a second account):** `scripts/role-model-smoke.ts` write paths; logout; a second tenant cannot see the first; admin screens and the UZMAN role; a real project IFC.
  Do not open Developer View again.
- Merging never deploys. Run `scripts/require-green-ci.sh <sha>` before Deploy.
  Before pressing Deploy, run `scripts/release-preflight.sh` (read-only): it lists
  unmerged/unpushed local branches, dirty worktrees, open PRs, checks CI on
  `origin/main` and prints how many commits live is behind main. It exits 1 when
  work is pending; `--allow-pending` only warns.

## Code (main / working branch)

- **Rev. 133 (`3a9bb7d`, production'da):** T41 8B worker entitlement capability function + T44 kurtarma tatbikatı tamamlandı (30 Ekim 2026). Bkz: `docs/agent-memory/HANDOFF_2026-10-30_T41_8B_TAMAMLANDI.md`.
- **Rev. 132 (main'de, production'a dahil):** Kalıp metraj → teklif köprüsü: `formworkAreaM2` artık varsayılan olarak IFC ön analiz teklifine `needs_review` kalemi olarak aktarılır; `FORMWORK_REQUIRES_MODEL_EVIDENCE` kaldırıldı. E-posta doğrulama banner'ı sadece learner değil tüm doğrulanmamış workspace kullanıcılarına gösterilir.
- **Rev. 131:** Firma sahibi/yöneticisi müşteri ad, iletişim ve müşteri not alanlarında inceleme/bekleme/maskeleme yapabilir. Teklif ve finansal kayıtlar korunur; serbest metin, ayrı aday, önceden indirilen PDF, yedek ve dış servis kopyaları kapsam dışıdır. 0037 migration, bağımsız CI ve canlı dağıtım ayrı doğrulanır; bu kayıt yasal kabul değildir.

- **Rev. 111 (`BIM-CALC-2026-10-28.105`) — SmartCheck 3D IFC Viewer Retina Canvas Overflow Fix & Full 3D Space Controls (`src/ifc/viewer/model.ts`, `src/ifc/viewer/engine.ts`, `src/components/smartcheck/viewer/IfcReviewViewer.tsx`):**
  1. **Retina (`devicePixelRatio=2`) Canvas Sizing & Overflow Fix:** Changed `renderer.setSize(width, height, false)` to `renderer.setSize(width, height, true)` with explicit `100% × 100%` CSS sizing, `overflow-hidden` container bounds, and aspect-aware `computeFitCameraDistance` so the WebGL `<canvas>` never overflows over the `01 / İmalat Cetveli` or `Hesap Kanıtı · Minha Detayı` cards below it and centers the building model in the viewport.
  2. **3D Space & Camera Controls:** Added `Orbit (Döndür)` / `Pan (Kaydır)` mode toggle (plus right-click / Shift+left-click pan), `Yakınlaş (+)`, `Uzaklaş (-)`, `Modele Sığdır`, `Seçime Odakla`, camera view presets (`İzometrik`, `Üst (Plan)`, `Ön`, `Sağ`, `Sol`), horizontal **Kat Kesiti (`Z-Section` Clipping Plane)** slider (`10%–100%`), `Tel Kafes` (`wireframe`) mode, and `Standart (480px)` / `Geniş (680px)` / `Tam Ekran` / `Daralt` panel controls.
- **Rev. 110 (`BIM-CALC-2026-10-28.104`, `621e9ac`, restore tag `restore-point-rev110-wasm-csp`) — SmartCheck 3D IFC Viewer (`web-ifc.wasm`) CSP `'wasm-unsafe-eval'` Fix:**
  - Added W3C CSP Level 3 `'wasm-unsafe-eval'` to `script-src` in `src/server/security/web-hardening.ts` (and updated `src/server/security/web-hardening.test.ts`) so `IfcReviewViewer.tsx` (`src/ifc/viewer/engine.ts` -> self-hosted `web-ifc.wasm`) can instantiate its WebAssembly geometry kernel in the browser without `CompileError: WebAssembly.instantiate() violates Content Security Policy directive`, while keeping JavaScript `'unsafe-eval'` strictly blocked.
- **Rev. 109 (`BIM-CALC-2026-10-28.103`, `35d58dd`, restore tag `restore-point-rev109-uzman-role-ready`) — Tenant Member Role Management & Super Admin Controlled `UZMAN` Expert Reviewer Permission Layer (Option A Dual-Role Architecture):**
  1. **Super Admin Tenant Member Authority (`src/server/admin/expert-reviewers.ts`, `src/server/admin/input.ts`, `src/server/admin/changes.ts`, `src/server/routes/admin.ts`, `src/pages/admin/TenantDetail.tsx`):** Added `PATCH /api/admin/tenants/:companyId/members/:userId` and upgraded the `Firma Kullanıcıları` table in `TenantDetail.tsx` with a company role selector (`OWNER`, `ADMIN`, `MANAGER`, `VIEWER` — with sole-`OWNER` protection) and a 1-click **`UZMAN` (Uzman Önizleme Yetkisi)** toggle persisted in `admin_audit_logs` (`member.expert_granted` / `member.expert_revoked`).
  2. **Strict `UZMAN` Gating for Expert Preview & Feedback Surfaces (`src/server/routes/auth.ts`, `src/server/routes/expert-feedback.ts`, `src/hooks/useAuth.tsx`, `src/components/layout/Shell.tsx`, `src/pages/ExpertPreview.tsx`, `src/features/expert-feedback/CalculationFeedback.tsx`, `src/features/expert-feedback/GeneralFeedbackButton.tsx`):** Hidden `Uzman Önizlemesi` (`/app/uzman-onizleme`), top-bar `Geri Bildirim` (`GeneralFeedbackButton`), and bottom calculator verification cards (`CalculationFeedback`) from regular users (`isExpertReviewer: false`), while keeping all 4 calculators (`/hesaplayicilar/*`) open as standard tools for all users.
- **Rev. 108 (`BIM-CALC-2026-10-28.102`, `f207f91`, restore tag `restore-point-rev108-pre-uzman-role`) — `CreateQuote` First-Viewport Hierarchy Refactor (Option C Hybrid Benchmark Layout & Top Excel Bar) + Public Enablement of YAMBİS & Kat Karşılığı/KDV Calculators:**
  1. **Workspace-First `CreateQuote` Hierarchy (`src/pages/CreateQuote.tsx`, `src/components/quote/QuoteAiWizard.tsx`):** Moved `data-testid="quote-excel-import"` (`Excel / CSV'den Kalem Aktar`, `.xlsx` & `.csv` template downloads, `+ Yeni Kalem Ekle`) from the bottom footer of `QuoteItemsTable` to the **top entry toolbar** of the `Teklif Kalemleri` card, added a direct `Excel / CSV Yükle` button to `PageHeader` actions, and defaulted `QuoteAiWizard` to collapsed (`48px` single-line bar) whenever `aiConfigured !== true`.
  2. **Option C Hybrid `BenchmarkPanel` (`src/components/quote/BenchmarkPanel.tsx`, `src/components/quote/CompanyCatalogPicker.tsx`):** Split `BenchmarkPanel` into `mode="compact-picker"` (compact 1-line bar & 50-item drawer above `QuoteItemsTable`) and `mode="sources-notice"` (the 3 source validity cards and `⚠️ Kullanıcı Sorumluluğu & Manuel Teyit` disclaimer rendered directly below `QuoteItemsTable`), keeping the line items table and Excel upload in the first viewport without losing any regulatory/price validity disclosures.
  3. **End-User Enablement of YAMBİS & Kat Karşılığı/KDV Calculators (`src/pages/ExpertPreview.tsx`, `src/pages/calculators/CalculatorsIndexPage.tsx`, `src/pages/calculators/YambisCalculatorPage.tsx`, `src/pages/calculators/KatKarsiligiCalculatorPage.tsx`, `src/App.tsx`, `src/capabilities/registry.ts`, `src/server/security/web-hardening.ts`, `src/server/security/route-meta.ts`, `src/server/security/route-jsonld.ts`):** Removed the `Yayında değil` (`preview`) lock from `YambisCalculatorPage` (`/hesaplayicilar/yambis-muteahhitlik-grubu`) and `KatKarsiligiCalculatorPage` (`/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum`), promoting both to `L2` `pilot` status in `CAPABILITY_REGISTRY` and listing all 4 calculators on `/hesaplayicilar` and `/app/uzman-onizleme`.
- **Rev. 107 (`BIM-CALC-2026-10-28.101`) — `CreateQuote` AI Transparency, Non-Destructive Excel/Demo Item Shield, Inline Quick-Client Creation & 3-Step Next-Action Guide (Paket B):**
  1. **Non-Destructive `generateWithAi` Guard (`src/pages/CreateQuote.tsx`):** Added `!res.ok || !Array.isArray(data?.lineItems) || data.lineItems.length === 0` guard in `generateWithAi` so when no external AI key (`GEMINI_API_KEY` / `OPENAI_API_KEY`) is configured or an AI call fails (`500`), existing Excel/CSV or Demo items are never overwritten (`setItems` is not called) and no false-positive success toast is shown. When `generateWithAi` succeeds with real items, existing populated rows are preserved and AI rows are appended.
  2. **Honest AI Provider Status & Collapsible Wizard (`src/services/ai/aiService.ts`, `src/server/routes/ai.ts`, `src/components/quote/QuoteAiWizard.tsx`):** Added `AIService.isConfigured()`, `GET /api/ai/status`, and `X-AI-Configured` header on `GET /api/ai/industries`; `QuoteAiWizard` displays an explicit status badge (`API Anahtarı Tanımlı Değil · Excel & Şablon Modu Aktif` vs `Canlı AI Sağlayıcısı Aktif`) and defaults to collapsed when `?kaynak=excel` or when Excel/Demo items are loaded.
  3. **Valid Demo Client Selection, Inline `+ Hızlı Müşteri Ekle` & 3-Step Next-Steps Guide (`src/components/quote/QuoteNextStepsBanner.tsx`, `src/components/quote/QuoteSidebar.tsx`):** Removed invalid `'demo-client-id'` placeholder from `handleLoadDemoTemplate`, added inline `+ Hızlı Müşteri Ekle` inside `QuoteGeneralSettings` so users can create/assign a client without leaving `/app/quotes/new`, and added `QuoteNextStepsBanner` (`1. Müşteri & Proje Adı → 2. Birim Fiyat & Maliyet → 3. Kaydet & PDF/Hakediş`).
- **Rev. 106 (`c9b0a02`, `BIM-CALC-2026-10-27.100`) — Unified `/app/clients` & `/app/crm` Workflow, 6-Stage Customer Timeline (`/app/clients/:id`) & 3-Layer Smart Customer Excel/CSV Adapter (Paket A):**
  1. **Sidebar Navigation (`src/constants/navigation.tsx` & `src/components/tour/user-tour-steps.ts`):** Replaced `"Müşteriler (CRM)"` with two explicit top-level entries: **`Müşteriler`** (`/app/clients`) and **`Müşteriler & Fırsatlar`** (`/app/crm`).
  2. **Fixed `/app/crm` `"CRM verileri yüklenemedi"` Bug & Synchronized `clients` ↔ `leads` ↔ `deals` (`src/services/crm/input.ts`, `src/pages/CRM.tsx`):** Fixed Zod v4 `integerQuery` missing `.optional()` so `GET /api/crm/leads` with `{}` returns `{ limit: 100, offset: 0 }` instead of `400 LEAD_PAGINATION_INVALID`; made `/app/crm` resilient, added inline customer quick-create inside the `"Yeni fırsat"` modal, and synchronized `Potansiyel` (`pipelineStage === 'lead'`) customers into the `Lead havuzu` tab.
  3. **Customer Editing, Slide-Over Drawer & Full Customer Detail Page (`/app/clients` & `/app/clients/:id`):** Added `GET /api/clients/:id`, `PATCH /api/clients/:id` (+ `POST /api/clients/:id/update`), `POST /api/clients/:id/notes`, and `POST /api/clients/bulk-import` in `src/server/routes/clients.ts`; interactive 6-stage filter cards, `ClientQuickDrawer.tsx`, and `src/pages/ClientDetail.tsx` (`/app/clients/:id`) with editable contact info, 6-stage timeline notes (*Potansiyel, Görüşüldü, Teklifli, Pazarlık, Kazanıldı, Kaybedildi*), linked deals, linked quotations, and 1-click `"Bu Müşteriye Teklif Hazırla"` (`/app/quotes/new?clientId=...`).
  4. **3-Layer Smart Customer Excel/CSV Adapter (`src/lib/client-excel-import.ts`, `src/lib/client-xlsx.ts`, `ClientImportModal.tsx`):** Layer 1 (30-row header scan, Turkish/English contractor aliases, `Ad`+`Soyad`+`Firma` merging, stage normalization, `company`/`person` inference), Layer 2 (Email `@` and phone `+90/05xx` content regex heuristics + zero-data-loss preservation of extra columns into initial stage notes), and Layer 3 (interactive preview & column mapping modal + downloadable `.xlsx`/`.csv` templates and exports).
- **Rev. 105 (`BIM-CALC-2026-10-27.99`) — `CalmIfcWorkspace` Modular Split (`2004 → 795 lines`, PR #31) & `T43` CI Coverage Ratchet Reinforcement:**
  1. Split `src/components/smartcheck/CalmIfcWorkspace.tsx` from `2,004` lines to `795` lines (`marka.md` C-5 `<= 800` lines rule) by extracting `CalmApartmentsStep.tsx`, `CalmCostTools.tsx`, `CalmEscalationPanel.tsx`, `CalmIcmalEvidenceCard.tsx`, `CalmIsoCdePanel.tsx`, `CalmKikPanel.tsx`, `CalmPriceTable.tsx`, `CalmStepTabs.tsx`, `calm-format.ts`, `useCalmSessionInputs.ts`, `useCatalogPriceResolution.ts`, and `useTuikEscalation.ts`.
  2. Strengthened `T43` CI coverage ratchet gates (`coverage-thresholds.json`) for `SmartCheck rules, IFC import and quantity` (`>= 90%`) and `HTTP API routes` (`>= 80%`) by expanding synthetic tests in `src/smartcheck/import/contractor-excel-corpus.test.ts` (`spreadsheet-parser.ts` line coverage `97.33%`) and adding `/api/admin/pricing-sources/sync-catalog`, `/tuik-sdmx/metadata`, and `/sync-tuik-sdmx` routes to `src/server/routes/t43-route-ratchet.integration.test.ts`.
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
  **All autonomous engineering/code/test items are closed (`39/56` `[x]` + all code/test gates of `13/56` `PARTIAL` items; `4/56` `T50, T51, T52, T55` are external-only).** Faz 0–4 code/test done; Faz 5–6 partial (progress payments default-off, pilot L2 awaiting external customer/vendor data); Faz 7 T40 role cutover live since Rev. 72 (canary, restore and rollback evidence open), T41 code/PG16 done (72/72 `company_id` tables classified: 67 FORCE RLS + 5 S5 Exact-ACL; **T41 8B: Rev. 133 worker entitlement capability function canlı, ACL daraltması tamamlandı, live post-deploy role-model-smoke açık**), T42 partial (code/test done), **T43 closed (`[x]`, `c8` `82.58%` project / `81.31%` routes / `74.77%` UI + Playwright 6/6 in CI; `1427/1434` PASS)**, **T44 closed (`[x]`, `t44-recovery-drill.pgtest.ts` 1/1 PASS Docker PG16, 30 Ekim 2026: 5-pillar + pg_dump/pg_restore 130/522 ms, RPO 0, katalog e5e4d3d1, 38 migration)**, T45 partial (`PERFORMANCE_BUDGETS` `BIM-PERF-2026-10-26.1` + ExcelJS chunk split + `t45-performance-budget.test.ts` 5/5 PASS; real large client files & live VPS post-deploy load check open); Faz 8 T46–T49 code/test done; Faz 9 `T50–T52` open (external pilot/expert/security sign-off); Faz 10 T53–T54 done (`PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md`; T55 legal decision open after T50–T52); Faz 11 T56 partial (`final-evidence-matrix.json` & `t56-final-evidence-matrix.test.ts` 3/3 PASS; awaits external closures before `fullClosureClaimPermitted = true`). Expert trial guide: `/admin/roadmap/expert-review`.
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

- Production smoke: see Still open above.
- UZMAN rolü atama: test kullanıcıları için Super Admin panel → Firma Kullanıcıları → UZMAN toggle.
- Gerçek uzman sign-off'ları (mühendis, vergi/ihale), izinli gerçek IFC/PDF/Excel dosyaları, kart ödeme ve hukuki metinler, harici güvenlik incelemesi, DKIM, YFK lisansı, AI provider keys.
