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
| 00 | Record audit and execution baseline | Reviewed plan, clean document diff, commit and tag | Completed |
| 01 | Restore release checks | Fix 14 type errors, updated auth contracts, isolated SmartCheck tests; lint/test/build pass | Completed |
| 02 | Auth and tenant boundaries | Shared production bootstrap, no production JWT fallback, current membership authorization, private company DTO; negative tests | Completed |
| 03 | PDF isolation | Escaped content, network denial, bounded renderer lifecycle; injection tests and normal PDF smoke | Completed |
| 04 | Invitations and onboarding | Hashed single-use tokens, redacted responses, password setup and delivery; role/reuse tests | Verified |
| 05 | Quote integrity | Atomic creation/revision, tenant ownership checks, evidence fields protected; rollback tests | Review in progress |
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

- Step 00: `git diff --check` passed. Commit `d703a83`, annotated source
  checkpoint `restore/gap-20261008-00`. Existing application failures were
  recorded, not declared resolved.
- Step 01: initial 14 type errors fixed; `pnpm run lint` and `pnpm run build`
  passed. Selected stable baseline: 484/484 tests passed, zero skips/cancellations,
  with `PUPPETEER_EXECUTABLE_PATH` pointing to installed Google Chrome. New
  in-progress invitation/quotation tests were excluded from this checkpoint run.
  Ten existing DB integration files now use fresh local schemas, FK parity,
  isolated worker schemas and temporary storage. Missing/unreachable isolation
  aborts tests. Target-override query parameters are rejected. Usage finish
  callbacks catch persistence rejections (three RED-to-GREEN regressions).
  Independent code/security review approved after fixes. Source checkpoint:
  `restore/gap-20261008-01`. Quota atomicity remains Step 06.
- Step 01 commit: `aa50a5a`.
- Step 02: live membership and role authority, private company DTO and shared
  production preflight. Four focused files passed 14/14 tests; production config
  tests bring focused count to 18. Included in the 484-test stable baseline.
  SQL-conjunction assertion strengthened after independent review. Scoped
  security review approved. Checkpoint: `restore/gap-20261008-02`.
- Step 02 commit: `26de91b`.
- Step 03: escaped all three templates and evidence summaries, disabled scripts
  and network/file loading, retained Chromium sandbox, bounded render/cleanup.
  PDF suite: 109 deterministic tests plus five real Chrome tests passed; also
  included in the 484-test baseline. Real smoke verified literal markup,
  Turkish text, totals, valid PDF bytes and zero requests to the probe server.
  Independent code/security review found no blockers. Deployment must supply
  sandbox-capable Chromium and local fonts. Checkpoint: `restore/gap-20261008-03`.
- Step 03 commit: `95816f7`.
- Step 04: hash-only single-use invitations, manager ACL, password provisioning,
  matching existing-account authentication, honest delivery state and correct
  invited-company session across reload. Existing membership roles cannot be
  elevated by re-invitation. Independent security/UI review blockers resolved.
  Combined suite at this checkpoint: 523/523, zero skipped, plus lint and build.
  `scripts/gap-invitation-ui-smoke.ts` passed real Chrome at 1440/390 widths,
  new-user login, existing-account acceptance, A-to-B manager session across
  reload (API and rendered company), and Settings invitation delivery state.
  Plaintext invitations require reissue. Production webhook needs the
  `invitation` template; acceptance by webhook is not inbox-delivery evidence.
  Rolling source back before this step cannot make newly hashed links work in
  old code; retain hashes and reissue after forward recovery, never weaken token
  storage. Checkpoint: `restore/gap-20261008-04`.
