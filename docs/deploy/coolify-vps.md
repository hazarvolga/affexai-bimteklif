# Coolify/VPS Pilot Deploy Checklist

Last updated: 2026-05-14

This checklist is for deploying the current Vite + Express + Drizzle pilot app.
The Next.js migration is intentionally deferred.

## Services

- App service: Node.js app from this repository.
- Database service: PostgreSQL.
- Optional file service later: S3-compatible storage for generated PDFs/assets.

## Build And Start

```bash
npm ci
npm run build
npm run start
```

The app must expose the configured `PORT`.

## Required Environment

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@postgres:5432/teklifpro
JWT_SECRET=<long-random-secret>
APP_URL=https://your-domain.example
```

## AI Environment

OpenAI is primary when configured. Gemini remains fallback.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
```

Never paste plaintext API keys into chat or committed files.

## PDF Environment

Puppeteer needs a Chromium-compatible runtime.

```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

If using a container image that already includes Chromium, keep the executable
path aligned with that image.

## Observability Environment

```bash
SENTRY_DSN=
LOG_LEVEL=info
```

Sentry SDK integration is not yet wired in this pilot pass. Until then, capture
server logs from Coolify and keep app-level errors visible in stdout/stderr.

## Database Safety

- Do not point production `DATABASE_URL` at local development DBs.
- Do not run destructive DB commands during deploy.
- Migration/schema changes must be reviewed against the intended TeklifPro DB.

## Pilot Smoke Test

After deploy:

```bash
curl -sS https://your-domain.example/api/health
```

Expected:

```json
{"status":"ok","db":"connected"}
```

Then test:

- Register/login.
- Create client.
- Create quote.
- Download PDF.
- Run profitability calculation.
- Confirm authless AI/profit/PDF endpoints are blocked.
