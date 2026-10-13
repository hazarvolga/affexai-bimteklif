# TeklifPro & BIMPlan Academy Agent Context

Please refer to `CODEX.md` and `AGENTS.md` for full project conventions, directory mapping, Coolify deployment structure, and active BIM skill sets (`.agent/skills/`).

Key Rules:
- Production runs on Coolify (Docker Compose: `compose.coolify.yaml`). Vercel (`vercel.json`, `/api/index.ts`) is legacy; keep SPA rewrites working but do not design for serverless.
- Dev Demo / Guest Login Bypass stays available only when `import.meta.env.DEV` is true. Never enable it in production builds.
- 3x3 is a company policy, not a normative rule: (a) metraj deviation ≤ %3, (b) concrete cover not below the standard minimum in mm (TS 500: interior 20 / exterior 25 / slab 15 mm; EC2 XC3 cnom 35 mm only when `activeStandard = EUROCODE_2`), (c) load-bearing elements in the STR discipline. Never describe cover as a percentage.
- Engineering or cost numbers are verified with the `yuksek-muhendis-mimar` skill.
