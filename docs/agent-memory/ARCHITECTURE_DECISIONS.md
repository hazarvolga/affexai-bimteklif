# Architecture Decisions

Last updated: 2026-07-24

## ADR-001: Preserve The Prototype

Decision: keep the existing Vite + Express + Drizzle application as a working
prototype and reference implementation.

Reason: it already demonstrates much of the product behavior and can be used as
a parity source while the new production app is built.

Implication: do not rewrite or delete prototype modules unless the user
explicitly starts the cutover phase.

## ADR-002: Build A New Next.js Core

Decision: defer the Next.js App Router rebuild until the current repo reaches a
real pilot/user-ready level.

The current Vite + Express + Drizzle repo is now the active development path for
the pilot product. The future Next.js app remains the preferred long-term SaaS
architecture, but it should be started only after the pilot flow and product
truth are stable enough to create a reliable parity checklist.

Reason: the current repo already contains working product behavior. Continuing
here preserves momentum and avoids spending the next phase on infrastructure
before user value is proven.

Implication: prioritize production-hardening the current repo first:

- Modularize Express routes/services.
- Strengthen auth, tenant isolation, RBAC, and usage limits.
- Add multi AI provider abstraction behind the existing AI flows.
- Harden PDF generation and AI endpoints.
- Add observability and security review.
- Keep Graphify/agent memory current.

Future target route shape for the eventual Next.js migration:

Target route shape:

- Public: `/`, `/features`, `/pricing`, `/login`, `/register`
- Protected: `/app`, `/app/quotes`, `/app/quotes/new`, `/app/quotes/[id]`,
  `/app/clients`, `/app/ai`, `/app/profitability`, `/app/settings`
- API: `/api/*`

Recommended placement: create the new app in `apps/web` unless the user chooses
a different layout.

Migration trigger: revisit the Next.js cutover only after the pilot path works
end-to-end for real users:

`client -> AI/manual quotation -> edit -> save -> PDF -> profitability`

## ADR-003: PostgreSQL + Prisma For The Production Core

Decision: the Next.js core should use Prisma over Drizzle.

Core models:

- `users`
- `companies`
- `memberships`
- `clients`
- `quotations`
- `quotation_items`
- `quotation_financials`
- `usage_logs`
- `subscriptions`

Every tenant-owned table must carry a required `companyId`.

## ADR-004: Auth.js/NextAuth + Server-Side RBAC

Decision: use Auth.js/NextAuth with credentials auth first, OAuth-ready later.

Session must include:

- `userId`
- `companyId`
- `role`

Server-side guards:

- `requireUser`
- `requireCompany`
- `requireRole`

Client route guards are only UX. Authorization must be enforced server-side.

## ADR-005: Multi AI Provider Abstraction

Decision: AI calls should go through a provider interface.

Initial interface:

- `generateQuotation`
- `improveQuotation`
- `detectIndustry`
- `estimateMargin`

Provider priority:

1. OpenAI primary.
2. Gemini fallback.
3. Claude-ready interface.

Manual quote mode must continue to work if AI providers fail.

## ADR-006: Local Database Isolation

Decision: never run migrations, schema pushes, seeds, deletes, truncates, or
destructive commands against unrelated local databases.

Known unrelated local databases from prior setup:

- `aluplan_support`
- `travel_db`
- `travel_management`
- `postgres`

Prototype local DB:

- `teklifpro_local`

Suggested Next.js local DB:

- `teklifpro_next_local`

Confirm the active `DATABASE_URL` before any migration or seed.

## ADR-007: Evidence Gate Before NestJS/Next.js Cutover

Decision: keep the Vite + Express + Drizzle application as the single pilot
write owner until five customer-permissioned MEP files, technical reviewer
records, production S3 evidence and pilot KPI thresholds are proven. Then use a
strangler migration: Next.js web façade first, followed by NestJS bounded
contexts, with Prisma introduced per context only after schema/parity checks.

Rationale: a framework rewrite before real file and review behavior is measured
would create migration risk without proving customer value. Next.js and NestJS
remain the production target; the decision changes sequencing, not the target.

Rules:

- one write owner per bounded context; no uncontrolled dual writes;
- contract, tenant-negative, backup and rollback tests are cutover gates;
- Graphile Worker and S3 provenance contracts are preserved during transition;
- Express/Vite remains rollback/reference implementation until route parity is
  demonstrated;
- Academy is a separate learning/acquisition context and never a canonical
  price, tax or engineering-rule source.

Owner: product owner + platform architect
Date: 2026-07-24
Status: accepted


## 2026-10-11 — IFC units and upload lifetime safety boundary

- IFC quantities use the declared quantity/property Unit first, otherwise the
  matching project VOLUMEUNIT/AREAUNIT/MASSUNIT/LENGTHUNIT. Never derive declared
  volume/area units from LENGTHUNIT. Conversion-based units resolve recursively
  with type/cycle guards.
- Missing project dimensions are resolved lazily: a volume-only model does not
  require MASSUNIT. A quantity with an explicit Unit remains supported even if
  that dimension is absent from the project's defaults. Reading a quantity with
  neither explicit nor matching declared project unit fails closed.
- Compatibility limitation remains: models with no unit assignment anywhere
  retain the legacy SI default. This is not evidence of author intent or IFC
  conformance; do not promote such data to verified quantities. A later strict
  admission change must explicitly reject these models or require a recorded
  reviewer unit decision; do not silently reinterpret historical imports.
- Net quantities take precedence over gross independently of STEP ordering;
  conflicting alternatives retain source paths and trigger IFC_QUANTITY_CONFLICT
  for human review. Derived formwork and reinforcement remain outside admitted
  quantity rows.
- Upload URL configuration is an integer between 1 and 86400 seconds. Invalid
  values fail closed, rather than silently falling back to 24 hours. Pending
  uploads consume tenant storage/document quotas until safe cleanup after the
  maximum URL lifetime plus one-hour grace; completed data is never TTL-deleted.


## ADR-008: Self-hosted Stalwart as Bimmetraj transactional SMTP relay

Decision: Bimmetraj production uses the existing AffeXAI Stalwart service as
its transactional SMTP relay over authenticated implicit TLS (port 465), with
`info@bimmetraj.com` as the sender identity.

Rationale: the user established the mail service and mailbox on the existing
Coolify estate; application code supports bounded, fail-closed SMTP delivery
without embedding credentials.

Operational rules:

- SMTP credentials remain runtime-only Bimmetraj Coolify secrets.
- Mailbox credentials and Bimmetraj app-user credentials are separate.
- Temporary recovery administrators must be time-bounded, removed after use,
  and applied with a mail-service restart.
- Accepted SMTP submission is not evidence of inbox placement; DNS
  authentication, reputation, monitoring, and restore evidence remain required.

Owner: product owner + platform operator
Date: 2026-10-13
Status: accepted


## ADR-009: Code-Based Corporate HTML/Text Transactional Emails + Superadmin Preview Console

Decision: Implement transactional emails (`welcome`, `email_verification`, `password_reset`, `payment_request_submitted`, `payment_request_approved`, `team_invitation`, `quote_sent`, `quote_decision`) using a zero-DB-migration, code-driven HTML/text layout engine (`src/server/notifications/email-templates.ts`) paired with a Superadmin preview and live test-delivery console (`/admin/email-templates`, `GET /api/admin/email-templates`, `POST /api/admin/email-templates/:templateId/test`). Defer full DB-editable MJML compilation until post-launch Phase 2.

Rationale: Avoids introducing an MJML compiler dependency, DB template versioning migrations, and XSS/Broken-Variable risks right before pilot launch, while giving Superadmins visual inspection and real SMTP test capability across all 8 transactional flows.

Owner: product owner + platform architect
Date: 2026-10-15
Status: accepted


## ADR-010: RG 33331 Official Ministry PDF Package (`#1.pdf`, `#2.pdf`, `EKLER.pdf`) Rule Engine Architecture

Decision: Align both the Python server-side preflight engines (`workers/ifc/vendor/ifc_ruhsat/`, `workers/ifc/epys_preflight.py`, `workers/ifc/pdf_preflight.py`) and the TypeScript client/server rules (`src/smartcheck/rules/ek6-dictionary.ts`, `src/smartcheck/rules/epys.ts`, `src/smartcheck/epys-allplan-kit.ts`) directly with the official Ministry PDFs located in `Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik T/bakanlıktan-gelen-son-pdfler/`:

1. **Discipline-Specific EK-9 Form (`EKLER.pdf` p. 36–37):** Architectural (`MM`) IFC models evaluate against **Tablo 9.1 (21 rows)** (`maddeler`); all non-architectural disciplines (`ST`, `MK`, `EE`, `harita`, `peyzaj`, etc.) evaluate against **Tablo 9.2 (16 rows)** (`maddeler_diger`), omitting architectural-only checks (`IfcSpace` room naming and TAKS/KAKS `emsal`).
2. **EK-7 Tablo 7.9 (`IfcAnnotation`, `EKLER.pdf` p. 34):** Validate `IfcAnnotation` (`Name: Metin`, `Description: Metin`, `PredefinedType: SURVEY`) via hybrid direct IFC attribute + Pset lookup (`ozellik.py`).
3. **Material Naming vs. 5D Cost Code (`#1.pdf` m.13(3) & `EKLER.pdf` Tablo 7.x):** Enforce `Malzeme İsmi_Dayanım` (`Beton_C30/37`, `Çelik_B420C`) as the regulatory e-PYS material rule alongside the ≤15-char CAD template check, while keeping `Pset_Yapim_Maliyet.CSBPozNo` as a non-blocking 5D cost-integration warning (since official e-PYS permit delivery uses `TREpys_PozOzellikSeti.PozNo`).
4. **2D PDF/A Sheet Size, Single-Sheet & e-Signature Checks (`#1.pdf` m.8 & `#2.pdf` m.6–7):** In addition to PDF/A metadata (`pdfaid:part`) and scanned-page detection (`m.6(4)`), check ISO 216 A4 and multiples page dimensions (`m.8(1)` `PAFTA_BOYUTU_ISO216`), single-sheet drawing layout (`m.8(2)` `COKLU_PAFTA_DUZENI`), and embedded 5070-law electronic signature dictionary presence (`/Sig` / `ByteRange`, `m.6(1)-(2)` `eSignature`).

Owner: product owner + platform architect
Date: 2026-10-15
Status: accepted

