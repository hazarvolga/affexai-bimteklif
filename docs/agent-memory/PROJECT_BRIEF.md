# Project Brief

TeklifPro is intended to become a production-grade AI-assisted quotation and
profitability platform for trade/service businesses. The main business flow is:

1. Create or select a client.
2. Generate a quotation with AI or manual entry.
3. Edit quotation line items and financials.
4. Save revisions.
5. Download a professional PDF.
6. Review profitability, risk, usage, and follow-up status.

## Product Context

The project history and expanded product notes live in:

- `/Users/hazarekiz/Projects/TeklifPro/.proje_/full-contex.txt`
- `/Users/hazarekiz/Projects/TeklifPro/.proje_/concept.md`
- `/Users/hazarekiz/Projects/TeklifPro/.proje_/multi_nis.MD`
- `/Users/hazarekiz/Projects/TeklifPro/.proje_/master_promt.md`

Treat these files as canonical product context, but do not reread them unless a
question requires deeper product history.

## Current Prototype

The current repo is a working prototype/reference product:

- Frontend: Vite, React, React Router, Tailwind/shadcn-like components.
- Backend: Express in `server.ts`.
- Database: PostgreSQL via Drizzle.
- AI: Gemini-oriented quotation generation.
- Existing modules include auth, quotes, PDF, AI, CRM, billing, regulations,
  profitability, company/team settings, and invitations.

The prototype should remain usable while the production Next.js core is built.

## Active Product Direction

The active development path is to turn the existing Vite + Express + Drizzle
prototype into a pilot-ready product first.

Pilot readiness means the core flow works reliably:

`client -> AI/manual quotation -> edit -> save -> PDF -> profitability`

After that, a Next.js migration can be planned with a real parity checklist.

## Long-Term Product Direction

The long-term production architecture is:

- Next.js App Router.
- TypeScript.
- Tailwind + shadcn/ui.
- PostgreSQL.
- Prisma.
- Auth.js/NextAuth.
- Multi AI provider layer: OpenAI primary, Gemini fallback, Claude-ready.
- Coolify/VPS deployment.
- Sentry + OpenTelemetry-compatible observability.
- Tenant isolation and security review as first-class requirements.
