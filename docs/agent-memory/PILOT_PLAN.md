# Pilot Plan

Last updated: 2026-05-14

Decision: build the pilot product on the existing Vite + Express + Drizzle repo.
Defer the Next.js migration until the pilot flow is real-user ready and a parity
checklist exists.

## Pilot Definition

The pilot is ready when an admin/owner user can complete this flow reliably:

`login/register -> client -> AI/manual quotation -> edit -> save -> PDF -> profitability`

The pilot must be safe enough for real test users, not just local demo clicks.

## Phase P0 - Stabilize The Current Prototype

Goals:

- Keep local PostgreSQL isolation intact.
- Keep `PORT=3001 npm run dev` working.
- Keep admin login working.
- Document the current API and page inventory.
- Preserve the current Vite/Express behavior while improving internals.

Acceptance:

- `/api/health` passes.
- Login/register pass.
- Existing quote flow still opens in the browser.
- `npm run lint` passes.

## Phase P1 - Modularize The Backend

Current issue: `server.ts` owns too many responsibilities.

Current status: first pass completed. Bootstrap, auth middleware, usage
middleware, auth routes, billing routes, and company/team/invitation routes have
been extracted. Remaining domain routes should be split while hardening their
specific behavior in later phases.

Refactor target:

- `src/server/app.ts` - Express app setup.
- `src/server/middleware/auth.ts` - auth and role guards.
- `src/server/middleware/usage.ts` - usage tracker and limits.
- `src/server/routes/auth.ts`
- `src/server/routes/company.ts`
- `src/server/routes/clients.ts`
- `src/server/routes/quotations.ts`
- `src/server/routes/ai.ts`
- `src/server/routes/pdf.ts`
- `src/server/routes/profit.ts`
- `src/server/routes/crm.ts`
- `src/server/routes/regulations.ts`
- `src/server/routes/billing.ts`

Acceptance:

- No behavior regression.
- Route handlers are grouped by domain.
- Shared tenant/auth checks are centralized.

## Phase P2 - Tenant, Auth, RBAC Hardening

Goals:

- Ensure every tenant-owned query filters by authenticated `companyId`.
- Ensure mutation endpoints require the correct role.
- Ensure unauthenticated access is blocked for protected resources.
- Ensure client-side guards are treated as UX only.

Priority endpoints:

- `/api/clients`
- `/api/quotations`
- `/api/quotations/:id/pdf`
- `/api/ai/generate-quotation`
- `/api/profit/*`
- `/api/company/*`
- `/api/billing/*`

Acceptance:

- User A cannot read or mutate Company B data.
- Viewer cannot create/edit/delete.
- Admin/owner-only settings remain protected.

Current status: first pass completed. Mutation/paid-action endpoints now require
owner/admin/manager, previously authless AI legacy routes are protected, PDF
service has company-level filtering, and frontend raw fetch calls for protected
quote actions now use `fetchWithAuth`.

## Phase P3 - Quote Engine And PDF Reliability

Goals:

- Keep calculation rules in one shared module.
- Ensure quote totals are server-validated, not only UI-calculated.
- Harden PDF generation against tenant bypass and unsafe HTML/content injection.
- Keep manual quote mode working if AI fails.

Acceptance:

- Create quote, edit items, save, view detail, download PDF.
- Server recalculates trusted financial totals.
- PDF endpoint requires auth and company ownership.

Current status: first pass completed. Server now recalculates quote/item totals
on quotation creation, calculation tests exist, and Puppeteer closes through a
`finally` block during PDF generation.

## Phase P4 - Multi AI Provider Layer

Goals:

- Replace provider-specific calls with an interface:
  - `generateQuotation`
  - `improveQuotation`
  - `detectIndustry`
  - `estimateMargin`
- Use OpenAI as the future primary provider.
- Keep Gemini as fallback.
- Keep Claude-ready interface without requiring Claude on day one.

Acceptance:

- Missing/failed AI provider does not break manual quote creation.
- AI responses are validated before being persisted or displayed as trusted data.
- Usage is metered server-side.

Current status: first pass completed. `AIService` now routes through OpenAI
primary when configured and Gemini fallback when configured. Provider fallback
has unit coverage. Manual quote creation remains independent of AI providers.

## Phase P5 - Observability, Security, And Deploy Readiness

Goals:

- Add Sentry-ready error boundaries/server error capture.
- Add structured logs for auth, AI, PDF, and quota events.
- Add Coolify/VPS deployment notes.
- Run Codex Security review over auth, tenant isolation, AI, PDF, and usage.

Acceptance:

- Build and lint pass.
- Production env checklist exists.
- Security findings are triaged before pilot users are invited.

## Next.js Re-Evaluation Trigger

Revisit the Next.js migration only after:

- Pilot flow has been validated with real or realistic users.
- Parity checklist is complete.
- Data model pain points are known.
- Migration scope is smaller than continued refactor cost.

At that point, create a separate migration plan and keep the current app as the
reference implementation until cutover is complete.
