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
