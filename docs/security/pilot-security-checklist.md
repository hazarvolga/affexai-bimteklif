# Pilot Security Checklist

Last updated: 2026-05-14

## Tenant Isolation

- Every tenant-owned read must filter by `req.user.companyId`.
- Every tenant-owned mutation must set `companyId` from `req.user.companyId`.
- Client-supplied `companyId` must not be trusted.
- PDF generation must verify quotation ownership before rendering.
- AI/profit/CRM operations must not read resources outside the current company.

## Auth And RBAC

Roles:

- `owner`
- `admin`
- `manager`
- `viewer`

Pilot policy:

- Viewer: read-only.
- Manager: create/edit operational resources.
- Admin/owner: settings, team, billing-sensitive operations.

Server-side authorization is required. Client route guards are only UX.

## Endpoint Checks

Protected from unauthenticated access:

- `/api/clients`
- `/api/quotations`
- `/api/quotations/:id/pdf`
- `/api/ai/generate-quotation`
- `/api/ai/generate-quote`
- `/api/ai/improve-quotation`
- `/api/profit/calculate`

Admin/owner only:

- `/api/company/industry-settings` mutation
- `/api/invitations` mutation
- `/api/regulations/sync`

Owner/admin/manager:

- client creation
- quotation creation/revision/status
- PDF generation
- AI generation/improvement
- profit calculation
- CRM mutations
- regulation impact checks

## AI Abuse Controls

- Enforce usage metering server-side.
- Keep manual quote flow working when AI fails.
- Validate AI JSON before trusting it.
- Do not log API keys or full provider credentials.
- Do not expose raw provider error bodies to end users in production responses.

## PDF Injection Controls

- Render only known templates.
- Escape or sanitize user-provided rich content before adding HTML-capable
  fields.
- Keep PDF route tenant-guarded.
- Close browser instances in `finally`.

## Pre-Pilot Security Smoke Tests

```bash
npm run lint
npm run test
npm run build
curl -sS -o /tmp/ai.json -w '%{http_code}' -X POST "$APP_URL/api/ai/generate-quote" -H 'Content-Type: application/json' -d '{"description":"test"}'
curl -sS -o /tmp/profit.json -w '%{http_code}' -X POST "$APP_URL/api/profit/calculate" -H 'Content-Type: application/json' -d '{"quotationId":"00000000-0000-0000-0000-000000000000"}'
```

Expected for authless POSTs: `401`.
