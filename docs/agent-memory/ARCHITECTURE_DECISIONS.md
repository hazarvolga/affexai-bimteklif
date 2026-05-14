# Architecture Decisions

Last updated: 2026-05-14

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
