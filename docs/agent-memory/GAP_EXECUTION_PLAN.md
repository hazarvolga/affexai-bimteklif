# GAP remediation execution plan

Date: 2026-10-08
Baseline: 74e52f4
Authority: user authorized implementation decisions, sequential execution,
verified commits and restore points. Final user acceptance follows implementation.

## Checkpoint protocol

- Commit only the explicit files belonging to a completed step.
- Run focused behavioral tests, typecheck and applicable integration checks.
- Review code before committing; never label a failing step successful.
- Create an annotated `restore/gap-20261008-XX` tag after each successful commit.
- Tags are Git source checkpoints, not database or object-storage backups.
- Record external evidence honestly; do not fabricate customer permission,
  engineering approval, S3 credentials or production restore results.
- Preserve unrelated work and services. Deployment is a separate release gate.

## Ordered work

| Step | Scope | Acceptance | Status |
|---|---|---|---|
| 00 | Record audit and execution baseline | Reviewed plan, clean document diff, commit and tag | In progress |
| 01 | Restore release checks | Fix 14 type errors, updated auth contracts, isolated SmartCheck tests; lint/test/build pass | In progress |
| 02 | Auth and tenant boundaries | Shared production bootstrap, no production JWT fallback, current membership authorization, private company DTO; negative tests | Pending |
| 03 | PDF isolation | Escaped content, network denial, bounded renderer lifecycle; injection tests and normal PDF smoke | Pending |
| 04 | Invitations and onboarding | Hashed single-use tokens, redacted responses, password setup and delivery; role/reuse tests | Pending |
| 05 | Quote integrity | Atomic creation/revision, tenant ownership checks, evidence fields protected; rollback tests | Pending |
| 06 | Plan and quota integrity | Atomic period quota, unique counters, validated admin actions, audit and suspension; concurrency tests | Pending |
| 07 | Reproducible schema | Reviewed bootstrap and additive migrations, disposable TeklifPro test DB upgrade/restore evidence | Pending |
| 08 | Dependencies and release automation | Triage runtime advisories, pinned tooling, typecheck build gate and CI | Pending |
| 09 | Worker and deployment | Reliable enqueue/recovery, bounded S3 reads, app/worker topology, health and rollback checks | Pending |
| 10 | Core product completion | CRM authenticated flows, quote edit/send/follow-up, clear payment capability, mobile validation | Pending |
| 11 | BIM evidence and rules | Preserve exception semantics, scoped review, supported Pset tests, versioned rules backed by reviewed sources | Pending |
| 12 | Pilot admission and final acceptance | Five permissioned files, reviewer and storage evidence, full acceptance report | Pending external evidence |

## Decision notes

The existing Express/Drizzle application remains the write owner. Framework
migration is deferred under ADR-007. Domain thresholds from skills or old docs
are hypotheses until validated against applicable engineering sources.

The previous audit test invocation wrote temporary test records to
`teklifpro_local`; its statement that database data was untouched was too broad.
Future checks must establish test isolation before running integration suites.
The previous interrupted test count is diagnostic, not a completed green run.

## Completion ledger

Updated after each verified step with commands, results and checkpoint name.
