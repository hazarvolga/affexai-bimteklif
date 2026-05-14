# TeklifPro Pilot Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Vite + Express + Drizzle TeklifPro repo into a pilot-ready product before revisiting a Next.js migration.

**Architecture:** Preserve the current working prototype and harden it in-place. Split the oversized Express server into focused route/middleware modules, centralize auth/tenant/RBAC/usage controls, add provider abstractions around AI/PDF/profit flows, and keep agent memory updated after each phase.

**Tech Stack:** Vite, React, React Router, Express, TypeScript, Drizzle ORM, PostgreSQL, Gemini current provider, OpenAI/Gemini provider abstraction target, Puppeteer PDF, Graphify, Git commits per phase.

---

## File Structure

- Modify: `server.ts` - shrink into bootstrap/start function only.
- Create: `src/server/app.ts` - Express app assembly.
- Create: `src/server/middleware/auth.ts` - JWT auth, role checks, request user typing.
- Create: `src/server/middleware/usage.ts` - usage metering and plan limit enforcement.
- Create: `src/server/routes/auth.ts` - register/login/me/email verification.
- Create: `src/server/routes/billing.ts` - subscription, plans, usage stats, alerts.
- Create: `src/server/routes/company.ts` - company profile, team, industry settings.
- Create: `src/server/routes/clients.ts` - client CRUD.
- Create: `src/server/routes/quotations.ts` - quotation CRUD, revisions, status.
- Create: `src/server/routes/pdf.ts` - quotation PDF endpoint.
- Create: `src/server/routes/ai.ts` - industry detection and quotation generation/improvement.
- Create: `src/server/routes/profit.ts` - profit calculation/report.
- Create: `src/server/routes/crm.ts` - CRM pipeline, leads, activities, analysis.
- Create: `src/server/routes/regulations.ts` - regulation alerts/sync/impact.
- Create: `src/server/lib/http.ts` - shared async handler/error helpers.
- Create: `src/server/lib/tenant.ts` - company ownership helpers.
- Create: `src/services/ai/providers/types.ts` - provider interface.
- Create: `src/services/ai/providers/geminiProvider.ts` - Gemini adapter.
- Create: `src/services/ai/providers/openaiProvider.ts` - OpenAI adapter shell.
- Modify: `src/services/ai/aiService.ts` - use provider router.
- Modify: `src/lib/calculations.ts` - server-trusted quote totals.
- Create/Modify tests under `src/**/*.test.ts` or `tests/**/*.test.ts` after test runner is selected.
- Modify: `docs/agent-memory/WORKING_STATE.md` - phase status after every phase.
- Modify: `docs/agent-memory/PILOT_PLAN.md` - checklist status after every phase.

## Phase Commit Protocol

For every phase:

1. Run the smallest relevant verification command.
2. Run `npm run lint` unless the phase is docs-only and no TypeScript changed.
3. Run `graphify update .`.
4. Update `docs/agent-memory/WORKING_STATE.md`.
5. Commit with a focused message.

## Phase 0: Roadmap, Agent Memory, And Baseline

**Files:**
- Modify: `.gitignore`
- Modify: `AGENTS.md`
- Create/Modify: `docs/agent-memory/*`
- Create: `docs/superpowers/plans/2026-05-14-pilot-production-hardening.md`
- Generate: `graphify-out/graph.json`
- Generate: `graphify-out/graph.html`
- Generate: `graphify-out/GRAPH_REPORT.md`

- [ ] **Step 1: Confirm repo state**

Run:

```bash
git status --short
```

Expected: known local changes only.

- [ ] **Step 2: Write pilot roadmap and agent memory**

Create/update the files listed above with the decision that current repo is the pilot base and Next.js is deferred.

- [ ] **Step 3: Generate code graph**

Run:

```bash
graphify update .
```

Expected: graph report, graph JSON, and graph HTML are written under `graphify-out/`.

- [ ] **Step 4: Verify TypeScript baseline**

Run:

```bash
npm run lint
```

Expected: TypeScript exits with code 0.

- [ ] **Step 5: Commit**

Run:

```bash
git add .gitignore AGENTS.md docs graphify-out/GRAPH_REPORT.md graphify-out/graph.json graphify-out/graph.html graphify-out/wiki src/lib/utils.ts components/ui/sonner.tsx server.ts src/db/index.ts src/db/drizzle.config.ts
git commit -m "docs: establish pilot roadmap and agent memory"
```

## Phase 1: Backend Modularization Without Behavior Change

**Files:**
- Modify: `server.ts`
- Create: `src/server/app.ts`
- Create: `src/server/lib/http.ts`
- Create: `src/server/middleware/auth.ts`
- Create: `src/server/middleware/usage.ts`
- Create route files under `src/server/routes/`

- [ ] **Step 1: Snapshot current endpoints**

Run:

```bash
rg "app\\.(get|post|put|patch|delete)" server.ts
```

Expected: list of all current routes before refactor.

- [ ] **Step 2: Extract app creation**

Move Express setup into `src/server/app.ts` and keep `server.ts` as the process entrypoint that calls `startServer()`.

- [ ] **Step 3: Extract middleware**

Move `authenticate`, `checkRole`, and `usageTracker` into `src/server/middleware/`.

- [ ] **Step 4: Extract domain routes**

Move route handlers into focused `src/server/routes/*.ts` modules. Register them from `src/server/app.ts`.

- [ ] **Step 5: Verify no endpoint loss**

Run:

```bash
rg "router\\.(get|post|put|patch|delete)|app\\.(get|post|put|patch|delete)" src/server server.ts
```

Expected: every pre-refactor API endpoint still appears.

- [ ] **Step 6: Verify**

Run:

```bash
npm run lint
PORT=3001 npm run dev
```

Expected: lint exits 0; dev server starts; `/api/health` returns OK.

- [ ] **Step 7: Commit**

Commit message:

```bash
git commit -m "refactor: modularize express server routes"
```

## Phase 2: Tenant, Auth, RBAC, And Usage Hardening

**Files:**
- Modify: `src/server/middleware/auth.ts`
- Modify: `src/server/middleware/usage.ts`
- Create: `src/server/lib/tenant.ts`
- Modify: `src/server/routes/clients.ts`
- Modify: `src/server/routes/quotations.ts`
- Modify: `src/server/routes/pdf.ts`
- Modify: `src/server/routes/ai.ts`
- Modify: `src/server/routes/company.ts`
- Modify: `src/server/routes/billing.ts`

- [ ] **Step 1: Add tenant helper**

Create helpers that require `req.user.companyId` and enforce company ownership for tenant-owned resources.

- [ ] **Step 2: Protect owner/admin mutations**

Ensure settings, industry sync, team invites, and billing-sensitive routes use role checks.

- [ ] **Step 3: Protect viewer read-only behavior**

Ensure viewer cannot create/edit clients, quotes, AI generations, PDFs, CRM mutations, or profitability reports.

- [ ] **Step 4: Verify protected endpoints**

Use login token from local admin and direct API checks against protected endpoints.

- [ ] **Step 5: Commit**

Commit message:

```bash
git commit -m "feat: harden tenant auth and usage guards"
```

## Phase 3: Quote Engine And PDF Reliability

**Files:**
- Modify: `src/lib/calculations.ts`
- Modify: `src/components/QuoteEditor.tsx`
- Modify: `src/pages/CreateQuote.tsx`
- Modify: `src/server/routes/quotations.ts`
- Modify: `src/server/routes/pdf.ts`
- Modify: `src/services/pdf/generate.ts`
- Modify: `src/services/pdf/templates.ts`

- [ ] **Step 1: Centralize server-trusted totals**

Ensure quote subtotal, discount, VAT, grand total, and profitability inputs are calculated through one shared module.

- [ ] **Step 2: Recalculate totals on save**

Route handlers must trust server-side calculations over client-submitted totals.

- [ ] **Step 3: Harden PDF access**

PDF generation must verify auth, role, company ownership, quotation existence, and safe template rendering.

- [ ] **Step 4: Verify core flow**

Browser/API flow:

```text
login -> clients -> create quote -> edit items -> save -> quote detail -> PDF -> profitability
```

- [ ] **Step 5: Commit**

Commit message:

```bash
git commit -m "feat: harden quote calculations and pdf flow"
```

## Phase 4: Multi AI Provider Layer

**Files:**
- Create: `src/services/ai/providers/types.ts`
- Create: `src/services/ai/providers/geminiProvider.ts`
- Create: `src/services/ai/providers/openaiProvider.ts`
- Create: `src/services/ai/providers/providerRouter.ts`
- Modify: `src/services/ai/aiService.ts`
- Modify: `src/server/routes/ai.ts`
- Modify: `.env.example`

- [ ] **Step 1: Define provider interface**

Methods:

```ts
generateQuotation(input)
improveQuotation(input)
detectIndustry(input)
estimateMargin(input)
```

- [ ] **Step 2: Wrap current Gemini behavior**

Move provider-specific Gemini calls behind the new interface.

- [ ] **Step 3: Add OpenAI provider shell**

Use env-based activation and no plaintext key logging.

- [ ] **Step 4: Add fallback routing**

OpenAI primary when configured, Gemini fallback when configured, manual mode unaffected when AI fails.

- [ ] **Step 5: Commit**

Commit message:

```bash
git commit -m "feat: add multi ai provider abstraction"
```

## Phase 5: Observability, Security Scan, And Pilot Readiness Report

**Files:**
- Create/Modify: `docs/deploy/*`
- Create/Modify: `docs/security/*`
- Modify: `docs/agent-memory/WORKING_STATE.md`
- Modify: `docs/agent-memory/PILOT_PLAN.md`
- Optional Modify: `server.ts` / `src/server/app.ts` for structured logging hooks.

- [ ] **Step 1: Add deploy checklist**

Document Coolify/VPS env vars, PostgreSQL, build/start commands, PDF runtime needs, and secrets.

- [ ] **Step 2: Add security checklist**

Cover tenant isolation, auth bypass, AI prompt abuse, PDF injection, and quota spoofing.

- [ ] **Step 3: Run verification**

Run:

```bash
npm run lint
npm run build
graphify update .
```

- [ ] **Step 4: Commit**

Commit message:

```bash
git commit -m "docs: add pilot deploy and security readiness"
```

## Self-Review

- Spec coverage: current repo pilot path, phase-by-phase progress, memory mapping, Graphify, and commit-after-each-phase are covered.
- Placeholder scan: no "TBD" or "implement later" placeholders are used as implementation requirements.
- Type consistency: planned server modules consistently use Express route/middleware naming and existing TypeScript stack.
