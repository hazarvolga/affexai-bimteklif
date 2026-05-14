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

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- Before making product or architecture changes, read docs/agent-memory first
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
