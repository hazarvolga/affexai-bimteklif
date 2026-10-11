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
| 04 | Invitations and onboarding | Hashed single-use tokens, redacted responses, password setup and delivery; role/reuse tests | Completed |
| 05 | Quote integrity | Atomic creation/revision, tenant ownership checks, evidence fields protected; rollback tests | Verified |
| 06 | Plan and quota integrity | Atomic period quota, unique counters, validated admin actions, audit and inactive-account enforcement; concurrency tests | In progress |
| 07 | Reproducible schema | Reviewed bootstrap and additive migrations, disposable TeklifPro test DB upgrade/restore evidence | In progress |
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
- Step 04 commit: `8ea33b9`.
- Step 05: tenant-owned client validation, editable-field DTO, atomic quote/item
  writes, root-serialized revisions with stale-source 409, atomic evidence copy
  and rollback. Copied verification needs current matching quantity evidence;
  price-only, stale, superseded and mismatched records do not confer authority.
  Revision pricing locks are cleared, not silently reused. Final parent-focused
  suite: 18/18 tests passed; lint passed. Independent code/security review
  approved. Checkpoint: `restore/gap-20261008-05`.

## 2026-10-11 local remediation checkpoint (uncommitted)

This is a local working-tree checkpoint, not completion of Steps 06–12, a new
restore tag, production readiness, or live deployment evidence. Preserve the
historical ledger above; final consolidated test/build/review results belong to
the eventual reviewed source checkpoint.

Implemented in the current remediation working tree:

- Resource isolation: CSV/XLSX preview/parse child process with bounded heap,
  deadline and admission; PDF bounded waiting queue and client cancellation;
  IFC upload-complete/download deadlines, stream destruction and size limits.
- IFC evidence: Compose IfcOpenShell default, explicit unit normalization and
  fail-closed unsupported units; derived formwork remains review-only metadata.
  Property/QTO evidence is not an engineering or buildingSMART certification.
- Tenant/cost boundaries: live-state checks for impersonation, atomic AI usage
  admission before provider calls, pending-upload storage/count reservations and
  expiry cleanup; IFC quota reservation and idempotent successful consumption.
- Crawler truthfulness/security: unsupported official CSB/TUIK adapters fail
  closed; fixed prices, invented multipliers and official-code guesses removed.
  Legacy staging approval needs renewed live extraction evidence. DNS-pinned
  public-only bounded fetch, isolated parse worker and batch advisory lock added.
- Deployment configuration: separately tagged migration target and successful
  migration startup dependencies; explicit pool budgets below PostgreSQL's 40
  connection ceiling at the default replica/concurrency counts.
- CI preparation: Python 3.11 IFC behavior tests; changed-file-gated app/IFC image
  builds sharing build cache; offline image artifact/engine smokes without image
  push. The workflow has not yet been verified by a GitHub Actions run.

Focused evidence from this checkpoint: crawler suite 18/18 passed, TypeScript
no-emit passed, and CJS-bundled worker parsing smoke passed. Other parallel work
has separate focused checks; do not sum those into a claimed full-suite result.
No coverage percentage was measured. The container runbook records a proposed
coverage-baseline procedure without enforcing an unproven threshold.

Remaining release acceptance: independent final code/security review, complete
isolated suite/build and CI result for the final commit, actual container runtime
and sandboxed PDF acceptance, real permissioned pilot IFC/Excel evidence, reviewer
approval, production S3 acceptance/retention and off-host DB/object restore drill.
No production configuration, remote source, database or deployment was changed
by this documentation/CI preparation task.


Email-provider deferral (same local checkpoint): user deferred selecting the
email service. Explicit `AUTH_EMAIL_DELIVERY_MODE=disabled` now permits production
preflight without webhook credentials. Email-creating registration/invite/resend/
reset-request actions return 503 before writes, and dispatch helpers refuse to send
or return development URLs. Existing login and valid previously issued link
consumption remain available. Default webhook mode still fails closed on missing
production configuration. Focused email/config/invitation checks: 20/20 passed,
including real HTTP requests with database spies proving zero access before the
disabled-mode rejection. No provider was connected or outbound email sent.
