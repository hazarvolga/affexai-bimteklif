# BIMMetraj (formerly TeklifPro) Agent Memory

Last updated: 2026-10-27

> **Brand Note (2026-10-17):** The project is officially named **BIMMetraj** (formerly TeklifPro; production domain: `bimmetraj.com`). All technical documentation, prompts, and future modules treat BIMMetraj as the canonical product brand.

This folder is the canonical short memory for agents working on BIMMetraj. It is
intentionally much smaller than the full codebase and `.proje_` archive.

## What To Read First

1. `PROJECT_BRIEF.md` - product and business goal.
2. `WORKING_STATE.md` - one-page current repo/runtime state and known constraints
   (history in `archive/`).
3. `HANDOFF_2026-10-27_CRM_VE_KULLANICI_AKISI.md` - 27 Ekim 2026 canlı dağıtım (`Rev. 105`, `2cd6fc5`), CRM/Müşteriler yeniden kurgusu + 3 katmanlı Akıllı Müşteri Excel Adaptörü planı ve `CreateQuote.tsx` AI sihirbazı hata/Excel koruma notu (restore point: `restore-point-2026-10-27-rev105-crm-plan`).
4. `NEXT_AGENT_PROMPT_2026-10-21.md` - yeni ajana yapıştırılacak hazır görev metni (önceki: `NEXT_AGENT_PROMPT_2026-10-19_REV37_KONTROL.md`, `NEXT_AGENT_PROMPT_2026-10-17.md`).
5. `HANDOFF_2026-10-21_ARA.md` - 21 Ekim 2026 ara verme ve tam denetim handoff özeti (önceki: `HANDOFF_2026-10-19_ARA.md`, `HANDOFF_2026-10-17.md`).
6. `ARCHITECTURE_DECISIONS.md` - accepted target architecture decisions (ADR-001 through ADR-010).
7. `PILOT_PLAN.md` - current repo production-hardening plan.
8. `AGENT_PROTOCOL.md` - how agents should work safely in this repo.
9. `graphify-out/GRAPH_REPORT.md` - graph/community view when generated.

## Source Of Truth Layers

- Latest session handoff: `docs/agent-memory/HANDOFF_2026-10-27_CRM_VE_KULLANICI_AKISI.md` (previous: `HANDOFF_2026-10-24_DEPLOY_CUTOVER.md`, `HANDOFF_2026-10-21_ARA.md`, `HANDOFF_2026-10-19_ARA.md`, `HANDOFF_2026-10-17.md`, `HANDOFF_2026-10-15.md`).
- Latest comprehensive audit & Ministry PDF sync reports:
  - `docs/audits/GENEL_DURUM_GAP_BUG_SEO_GEO_RAKIP_RAPORU_2026-10-21.md` (21 Oct 2026 full read-only calculation verification, 6 BUGs, 8 GAPs, 8 SEO/GEO findings & TR/Global competitor matrix).
  - `docs/audits/PRODUCTION_READINESS_RAPORU_2026-10-18.md` (18 Oct production readiness audit & Rev. 35 closure).
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
