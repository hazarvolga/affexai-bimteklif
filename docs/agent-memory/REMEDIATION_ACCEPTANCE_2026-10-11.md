# Historical parity remediation acceptance

User order: complete historical audit gaps before SMTP. Stripe selected, strictly test-only until development finishes. This checklist is not a completion certificate.

| Area | Local implementation/evidence | Remaining acceptance |
|---|---|---|
| Price approval | Approved/active/current TRY-only lookup, server-locked source snapshot, no synthetic cost/waste; focused DB/HTTP tests | Final source-import review, full regression and deployed proof |
| Fake official audit | Replaced fixed data with approved database lookup | Combined browser/source pipeline |
| Five plans | Guarded idempotent audited bootstrap; admin empty/error/retry/navigation | Apply reviewed catalog to intended production DB and read back |
| Advertised capacity | Enterprise100MB and99999 finite quotes; plan API refuses over100MB | Actual upload flow/tenant limits; no claim250MB support |
| Scheduler | Explicit Istanbul day/window, persisted audit status | Independent review and deployed scheduler readback |
| AI providers | Shared OpenAI/Gemini text routing CRM/profit/regulation impact; input/output caps | Configured real provider credentials/eval; no paid live execution yet |
| Regulations | Real official document fetch to pending source review, no invented law changes | Parser/tenant/review tests, UI, external reachability; not automatic legal applicability |
| IFC | Real Graphile task consumes HTTP upload; parser/evidence/tenant/quota tests pass | Controlled production pilot flag + tenant subscription and deployed queue run |
| Regional standards | UI now honestly describes stored preferences and current SI normalization | Actual structural code calculations are not implemented; do not label complete |
| Academy reference catalog | Guarded catalog-only bootstrap restores version2026.1, no automatic enrollments | Review/bundle/prod apply; no purchase access activation |
| Stripe | SDK23.0.0 installed; test-only integration in progress | Checkout/portal/signature/replay/order tests; sandbox connected; no live collection |
| Official price sources | Licensed CSV ingestion in progress | YFK permission clarification; real authorized dataset and review; no fabricated prices |
| Runtime DB privilege | Existing app/worker use DB owner | Separate migration role and Graphile bootstrap/RLS migration remain open |
| SMTP | Existing uncommitted WIP preserved | Explicitly last; do not configure/send yet |

## Evidence snapshot

- Admin browser fixtures at1440/390 passed empty/error/retry/catalog and queue/error scenarios; screenshots `/tmp/bimmetraj-admin-ui`.
- Existing IFC parser/evidence11/11; HTTP andquota9/9; upgraded actualGraphile IFC HTTP test2/2.
- Real Chrome PDF5/5.
- Initial full suite790:784passed,1quota fixture failure,5PDFskipped. PDF rerun passed; fixture repair assigned. Do not report initial full run green.
- Build passed before final agent changes; must rerun after changes settle.
- No remediation commits/deploy performed yet. Live remains5d19a23 at this checkpoint.
