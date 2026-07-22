# Phase 11 — Production Readiness

## Scope

This phase hardens the free Academy registration path for a multi-instance Coolify deployment. Payment remains intentionally out of scope.

## Closed gaps

- Authentication and acquisition rate limits are stored in PostgreSQL, so restarts and multiple application replicas cannot reset or bypass them.
- Rate-limit identities are SHA-256 hashes; raw email addresses and IP addresses are not stored in the bucket table.
- Registration, login, verification resend, password reset request, and acquisition endpoints are rate limited.
- Production startup fails closed when database, HTTPS public URL, email delivery, proxy, or secret configuration is unsafe.
- Production never creates the local demo administrator account.
- `/api/health` verifies the database and the persistent rate-limit migration, reports delivery readiness, and exposes the optional deployed revision.

## Required Coolify environment

Set these as production secrets or variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=<at-least-32-random-bytes>
PUBLIC_APP_URL=https://academy.example.com
AUTH_EMAIL_WEBHOOK_URL=https://n8n.example.com/webhook/auth-email
AUTH_EMAIL_WEBHOOK_SECRET=<at-least-32-random-bytes>
TRUST_PROXY_HOPS=1
SOURCE_COMMIT=<deployed-git-sha>
ACADEMY_ADMIN_EMAILS=verified-admin@example.com
```

`AUTH_EMAIL_WEBHOOK_URL` should accept `{ template, email, url }` JSON and require the bearer secret. Keep the n8n workflow response below five seconds and do not log the action URL because it contains a one-time credential.

## Release order

1. Take a PostgreSQL backup and record the currently deployed image/SHA.
2. Apply `drizzle/0024_persistent_auth_rate_limits.sql` before starting the new application image.
3. Configure all required environment values and deploy the new image.
4. Require HTTP 200 from `/api/health`; confirm `readiness.persistentRateLimit`, `emailDeliveryConfigured`, and `publicUrlConfigured` are true and `revision` matches the deployed SHA.
5. Run one real registration, email verification, login, password-reset request, and Academy entitlement check.

## Rollback

The migration is additive. Roll back the application image/SHA without dropping `rate_limit_buckets`; retaining the table is safe and avoids destructive schema rollback. Investigate health or email failures before promoting another release.

## External work still required

- Configure and verify the real n8n/email provider credentials.
- Run the production/sandbox registration and email-delivery smoke flow.
- Capture and approve the remaining Structural training evidence before publishing final lessons.
