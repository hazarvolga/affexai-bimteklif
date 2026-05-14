# Pilot Observability Plan

Last updated: 2026-05-14

## Current State

The app currently relies on stdout/stderr logs and HTTP health checks.

Health endpoint:

```bash
GET /api/health
```

Returns DB connectivity status and whether `DATABASE_URL` exists.

## Near-Term Logging Events

Track these as structured events before pilot users are invited:

- auth login failures
- registration failures
- AI provider failure and fallback
- quota exceeded
- PDF generation failures
- quotation creation failures
- cross-tenant access denial

## Sentry Plan

Sentry is the production error/performance target, but SDK wiring is not part of
this documentation-only phase.

Recommended follow-up:

1. Add `@sentry/node` or Express-compatible Sentry SDK.
2. Initialize it before route registration.
3. Capture unhandled route errors.
4. Add request ID and company/user tags without leaking secrets.
5. Add `SENTRY_DSN` to Coolify secrets.

## OpenTelemetry Direction

Keep log/trace fields compatible with OpenTelemetry naming where practical:

- `service.name=teklifpro-api`
- `deployment.environment=local|staging|production`
- `enduser.id`
- `tenant.id`
- `http.route`
- `http.response.status_code`
- `ai.provider`
- `feature.name`

## Pilot Dashboards

Minimum pilot signals:

- error count by route
- AI provider failure count
- PDF generation failure count
- quota exceeded count
- registration/login success and failure counts
- average quote creation latency
