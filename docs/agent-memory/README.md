# BIMMetraj (formerly TeklifPro) Agent Memory

Last updated: 2026-10-17

> **Brand Note (2026-10-17):** The project is officially named **BIMMetraj** (formerly TeklifPro; production domain: `bimmetraj.com`). All technical documentation, prompts, and future modules treat BIMMetraj as the canonical product brand.

This folder is the canonical short memory for agents working on BIMMetraj. It is
intentionally much smaller than the full codebase and `.proje_` archive.

## What To Read First

1. `PROJECT_BRIEF.md` - product and business goal.
2. `WORKING_STATE.md` - one-page current repo/runtime state and known constraints
   (history in `archive/`).
3. `HANDOFF_2026-10-17.md` - complete handoff briefing for the next agent (live revision, deploy commands, environment paths, completed 2026-10-16/17 milestones, and next priorities).
4. `ARCHITECTURE_DECISIONS.md` - accepted target architecture decisions (ADR-001 through ADR-010).
5. `PILOT_PLAN.md` - current repo production-hardening plan.
6. `AGENT_PROTOCOL.md` - how agents should work safely in this repo.
7. `graphify-out/GRAPH_REPORT.md` - graph/community view when generated.

## Source Of Truth Layers

- Latest session handoff: `docs/agent-memory/HANDOFF_2026-10-17.md` (previous: `HANDOFF_2026-10-15.md`).
- Latest comprehensive audit & Ministry PDF sync reports:
  - `GAP_RAPORU_2026-10-17.md` (17 Oct audit & P0/P1/P2 remediation).
  - `docs/audits/GAP_VE_DENETIM_RAPORU_2026-10-15.md` (5-skill comprehensive gap audit & closure).
  - `docs/audits/BAKANLIK_SON_PDFLER_ANALIZ_VE_YOL_HARITASI.md` (RG 33331 final PDFs `#1.pdf`, `#2.pdf`, `EKLER.pdf` analysis & 5-phase implementation).
  - `docs/audits/BAKANLIK_TEKNIK_GORUS_VE_TOPLANTI_DOSYASI.md` (6 technical questions & field dossier for the Ministry of Environment, Urbanization and Climate Change).
  - `GAP_BUG_UI_UX_ANALIZ_RAPORU_2026-10-14.md` (earlier 14 Oct closure report).
- Official Ministry PDF source files in repo: `Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik T/bakanlıktan-gelen-son-pdfler/` (`#1.pdf`, `#2.pdf`, `EKLER.pdf`).
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
