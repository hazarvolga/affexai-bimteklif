# Evidence-First SmartCheck Rollout

## Pilot scope

- Target: MEP subcontractor quotation/quantity teams.
- Input: XLSX and CSV, maximum 25 MB.
- Output: human-approved quantity rows transferred to an existing draft quotation with source provenance.
- Explicit exclusions: PDF computer vision, IFC geometric quantity takeoff, e-signature, live market pricing, automatic engineering approval.

## Runtime

Web and worker are separate processes:

```bash
npm run dev
npm run smartcheck:worker
```

Required pilot configuration:

```dotenv
SMARTCHECK_IMPORT_ENABLED=true
SMARTCHECK_PILOT_COMPANY_IDS=<company-uuid>
```

Development uses `SMARTCHECK_LOCAL_STORAGE_DIR`. Production requires the S3-compatible variables documented in `.env.example`. The production preflight fails closed when the feature is enabled without an allowlist or bucket configuration.

## Migration and rollback

Apply migrations `0025`, `0026`, and `0027` before enabling the flag. All migrations are additive. Rollback is operational: disable `SMARTCHECK_IMPORT_ENABLED` and stop the worker; the existing quotation, revision, authentication, and PDF flow remains available. Do not drop provenance tables during a pilot rollback.

## Security boundaries

- Every query is scoped by authenticated `companyId`; mutation routes require owner/admin/manager and verified email.
- Uploads enforce extension + MIME + signature, SHA-256, 25 MB, safe storage keys, XLSX archive expansion limits, encryption rejection, and CSV formula neutralization.
- Only `approved` rows can transfer. Open findings return `409`.
- Transfer idempotency is enforced by a partial unique index per company, quotation, and source row.
- Audit logs record upload, completion, mapping, queue, review, and transfer actions.

## Pilot acceptance

- [ ] Five real MEP quantity files processed with customer permission.
- [ ] At least 90% of rows parsed without manual re-entry.
- [ ] Every transferred item has document, run, source row/cell, review status, and rule-version provenance.
- [ ] Cross-tenant negative tests show zero data leakage.
- [ ] Preparation time and finding count are recorded before/after.
- [ ] Technical reviewer approves any rule promoted beyond draft/advisory.

TS 500, TS 708, ÇŞİDB/YFK, VAT, and withholding rules remain draft/advisory until an official source hash, effective dates, applicability, exceptions, and technical reviewer approval are recorded.
