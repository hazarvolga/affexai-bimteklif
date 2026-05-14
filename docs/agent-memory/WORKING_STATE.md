# Working State

Last updated: 2026-05-14

## Repository

Workspace root:

`/Users/hazarekiz/Projects/TeklifPro/TeklifPro-repo`

Important external product docs:

`/Users/hazarekiz/Projects/TeklifPro/.proje_`

## Current App

The current root app is a working Vite + Express + Drizzle prototype.

Runtime notes from the last known working state:

- Dev server command: `PORT=3001 npm run dev`
- Browser URL: `http://localhost:3001`
- Health endpoint: `http://localhost:3001/api/health`
- Prototype DB: `postgres://hazarekiz@localhost:5432/teklifpro_local`
- Demo admin: `admin@teklifpro.ai` / `admin123`

Known local changes already made before this memory layer:

- `.env.local` supports `DATABASE_URL`.
- `server.ts` loads `.env.local`, supports `PORT`, and has a fixed health DB
  check.
- `src/db/index.ts` and `src/db/drizzle.config.ts` load `.env.local`.
- `src/lib/utils.ts` was added for shared `cn()`.
- `components/ui/sonner.tsx` imports React.

## Current User Direction

The user has decided to continue on the existing repo for the pilot phase.

Current active direction:

- Use the existing Vite + Express + Drizzle repo as the pilot development base.
- Production-harden the current app instead of immediately creating a new
  Next.js app.
- Keep the future Next.js migration as a later cutover project once product
  behavior is stable.

Long-term target remains:

- Next.js App Router.
- PostgreSQL.
- Prisma.
- Auth.js/NextAuth.
- Multi AI provider with OpenAI primary and Gemini fallback.

The user also wants an agent memory structure so future agents can work without
reading the entire codebase and full project history every session.

## Agent Memory Added

Added on 2026-05-14:

- `AGENTS.md` as the repo-level agent entrypoint.
- `docs/agent-memory/` for short canonical memory.
- `graphify-out/` for generated Graphify graph memory.

Graphify AST update has been run successfully:

- 199 nodes
- 186 edges
- 21 communities
- 80 files
- zero LLM/API token cost

GitNexus was mentioned by the user, but no local GitNexus installation or folder
was found during setup. If GitNexus becomes available later, connect it to this
same memory layer instead of creating a second source of truth.

## Phase Progress

### Phase 0 - Agent Memory And Pilot Roadmap

Commit: `52882be`

Status: completed.

Verified:

- `npm run lint`
- `graphify update .`

### Phase 1 - Backend Modularization, First Pass

Status: completed first pass.

Changes:

- `server.ts` is now a small process entrypoint.
- Express app setup moved to `src/server/app.ts`.
- Auth and role middleware moved to `src/server/middleware/auth.ts`.
- Usage limits/tracking moved to `src/server/middleware/usage.ts`.
- Auth routes moved to `src/server/routes/auth.ts`.
- Billing routes moved to `src/server/routes/billing.ts`.
- Company/team/industry/invitation routes moved to
  `src/server/routes/company.ts`.

Verified:

- `npm run lint`
- Smoke server on `PORT=3011 npm run dev`
- `curl -sS http://localhost:3011/api/health`

Note: port `3001` already had a Node process listening, so it was not touched.
The temporary `3011` verification server was stopped after the health check.

## Do Not Touch

Do not stop, migrate, seed, truncate, or otherwise modify unrelated services or
databases. The user may be running other work at the same time.

Avoid destructive commands unless explicitly requested and confirmed.

## Next Recommended Work

1. Finish the agent memory bootstrap.
2. Define the pilot readiness checklist for the current repo.
3. Modularize `server.ts` into route/service boundaries.
4. Add tenant/RBAC/usage-limit hardening around current API routes.
5. Add multi AI provider abstraction to the existing AI flows.
6. Add PDF/AI/auth security checks and tests.
