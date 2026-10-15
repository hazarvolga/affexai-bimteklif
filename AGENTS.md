# TeklifPro Agent Memory

This repo keeps a persistent agent memory so new Codex/AI agents do not need to
re-read the whole codebase and the full project history on every session.

Read order for every agent:

1. `docs/agent-memory/README.md`
2. `docs/agent-memory/PROJECT_BRIEF.md`
3. `docs/agent-memory/WORKING_STATE.md`
4. `docs/agent-memory/ARCHITECTURE_DECISIONS.md`
5. `docs/agent-memory/AGENT_PROTOCOL.md`
6. `graphify-out/GRAPH_REPORT.md` when present

Hard safety rule: do not touch unrelated local services or databases. For local
PostgreSQL work, only use the explicitly named TeklifPro database for the task.

## Mandatory Chronological Roadmap & Expert Calculation Review Rule (No Reminder Needed)

Expert engineers, auditors, and investors track the project's technical and regulatory evolution directly through the in-app Admin pages — **not** via GitHub commit logs. Therefore, on **every** product, rule-engine, regulation, or calculation change, you **MUST** automatically update the following pages in the same task without waiting for the user to ask:

1. **Geliştirici Yol Haritası (`/admin/roadmap` — `src/pages/admin/roadmap/roadmap-content.ts`):**
   - Update `#durum` and `#adimlar`, and append the new milestone to `#revizyon-gunlugu` (**Tablo 1: Kronolojik Ana Sürüm Yolculuğu** & **Tablo 2: Revizyon Bazlı Detaylı Teknik Değişiklik Matrisi**) in **strict ascending chronological order (`Rev. 0 → Rev. 1 → ... → Rev. N`)** with Date, Revision No, Commit/Version, Regulatory/Technical Basis, *Önceki Durum (Nasıldı?)*, *Yeni Durum (Nasıl Değiştirildi?)*, and *Değişen Kod / Modül*.
2. **Hesaplama Yöntemleri ve Uzman Doğrulaması (`/admin/roadmap/calculations` — `src/pages/admin/roadmap/calculation-review.ts` & `src/pages/admin/roadmap/calculation-content.ts`):**
   - Bump `CALC_REVIEW_META.version` (`BIM-CALC-YYYY-MM-DD.X`) and `implementationBaseline`.
   - Append a new entry to `CALC_REVIEW_CHANGELOG` in **strict ascending chronological order (`Rev. 1 → ... → Rev. N`)**, including `moduleDetails` (`before`, `after`, `basis`) for every affected module so each `ModuleCard` in `CalculationMethods.tsx` renders its own per-module chronological revision timeline.
3. **Public / User-Facing Alignment (`LandingPage.tsx`, `LegislationView.tsx`, `BimGlossary.tsx`):**
   - Whenever a user-visible workflow ("Nasıl Çalışır?"), regulation scope, or capability changes, synchronize these pages in the same commit and verify with `npx tsx --test src/pages/admin/roadmap/content.test.ts` (never use literal `%100` in `ROADMAP_SECTIONS`).

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- Before making product or architecture changes, read docs/agent-memory first
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
