# Agent Protocol

This file is for Codex and other AI agents working in this repo.

## Start Of Session

Before broad code analysis, read:

1. `AGENTS.md`
2. `docs/agent-memory/README.md`
3. `docs/agent-memory/PROJECT_BRIEF.md`
4. `docs/agent-memory/WORKING_STATE.md`
5. `docs/agent-memory/ARCHITECTURE_DECISIONS.md`

Only read `.proje_/full-contex.txt` when the short memory is insufficient.

## Working Rules

- Preserve the current Vite/Express prototype unless the user explicitly asks
  for cutover or deletion.
- Prefer adding the Next.js production core under `apps/web`.
- Do not touch unrelated DBs or services.
- Before DB migrations/seeds, print or inspect the target `DATABASE_URL` and
  confirm it points to the intended TeklifPro DB.
- Keep architectural decisions in `ARCHITECTURE_DECISIONS.md`.
- Keep runtime status and local setup changes in `WORKING_STATE.md`.
- Keep product-level discoveries in `PROJECT_BRIEF.md`.
- **Mandatory Chronological Roadmap & Expert Calculation Review Sync (No User Reminder Required):**
  Engineers, domain experts, and investors do **not** track the project on GitHub; they review progress via `/admin/roadmap` and `/admin/roadmap/calculations`. On **every** feature, rule, regulation, or calculation change, automatically update:
  1. `src/pages/admin/roadmap/roadmap-content.ts` (`#durum`, `#adimlar`, and `#revizyon-gunlugu` Tablo 1 & Tablo 2 in strict chronological order `Rev. 0 → Rev. 1 → ... → Rev. N` with *Önceki Durum → Yeni Durum → Dayanak & Kod*).
  2. `src/pages/admin/roadmap/calculation-review.ts` & `src/pages/admin/roadmap/calculation-content.ts` (bump `CALC_REVIEW_META.version`, append to `CALC_REVIEW_CHANGELOG` in strict chronological order `Rev. 1 → ... → Rev. N`, and populate `moduleDetails` so each `ModuleCard` in `CalculationMethods.tsx` shows its own chronological revision history).
  3. Relevant public/guide surfaces (`LandingPage.tsx`, `LegislationView.tsx`, `BimGlossary.tsx`) and run `npx tsx --test src/pages/admin/roadmap/content.test.ts`.

## Graphify Usage

Use Graphify when a question spans multiple modules or when an agent needs a
relationship map instead of line-by-line reading.

Recommended commands:

```bash
graphify query "How do tenants, auth, quotations, AI, and PDF generation connect?"
graphify explain "tenant isolation"
graphify path "quotation" "profitability"
graphify update .
```

If Graphify fails because no graph exists, fall back to `rg` and update this
memory with anything important.

## Handoff Notes

When ending a substantial session, update `WORKING_STATE.md` with:

- What changed.
- What passed verification.
- What was not verified.
- The next recommended step.

For large architecture changes, add or update an ADR in
`ARCHITECTURE_DECISIONS.md`.
