# TeklifPro Agent Memory

Last updated: 2026-10-14

This folder is the canonical short memory for agents working on TeklifPro. It is
intentionally much smaller than the full codebase and `.proje_` archive.

## What To Read First

1. `PROJECT_BRIEF.md` - product and business goal.
2. `WORKING_STATE.md` - one-page current repo/runtime state and known constraints
   (history in `archive/`).
3. `ARCHITECTURE_DECISIONS.md` - accepted target architecture decisions.
4. `PILOT_PLAN.md` - current repo production-hardening plan.
5. `AGENT_PROTOCOL.md` - how agents should work safely in this repo.
6. `graphify-out/GRAPH_REPORT.md` - graph/community view when generated.

## Source Of Truth Layers

- Latest comprehensive audit & closure report: `GAP_BUG_UI_UX_ANALIZ_RAPORU_2026-10-14.md` (and `summary.md` handoff).
- Current production code: this repo root, Vite + Express + Drizzle + Graphile Worker (`compose.coolify.yaml`).
- Target production app: planned Next.js App Router + PostgreSQL + Prisma app,
  to be added after pilot evidence gates (ADR-007).
- Agent memory: this folder plus `AGENTS.md`.
- Graph memory: `graphify-out/`.

## Memory Maintenance

Update these files when:

- A major architecture decision changes.
- A new module becomes canonical.
- DB names, ports, auth rules, or deploy targets change.
- A migration/cutover phase starts or finishes.
- Another agent needs to inherit context without rereading everything.

Use Graphify for deeper relationship discovery:

```bash
graphify query "How do auth, tenants, quotations, AI, and PDF generation relate?"
graphify explain "quotation"
graphify path "tenant isolation" "PDF generation"
graphify update .
```

If Graphify has no graph yet, use these memory files as the bootstrap map.
