# SMTP Operations Handoff — 2026-10-13

## Current state

Bimmetraj transactional email is live in production. This supersedes the
2026-10-11 decision-only handoff retained in Git history.

- Application: `https://bimmetraj.com`; Coolify application UUID
  `ibjv2zbpecdcbd71lxo1vqd7`.
- Delivery mode: authenticated SMTP through the existing AffeXAI Stalwart
  service at `mail.affexai.tr`, using implicit TLS on port 465.
- Sender and SMTP identity: `info@bimmetraj.com`. Its mailbox password is not
  an application-user password and must exist only as a Coolify runtime secret
  (`AUTH_EMAIL_SMTP_PASSWORD`) and in the responsible operator's password
  manager. Never place it in Git, docs, chat, browser history, logs, test data,
  or build arguments.
- Bimmetraj web-app superadmin login remains separate: `hazarvolga@gmail.com`.
  Changing the Stalwart mailbox password does not change the app login password.
- Deployed application revision: `a0bc784` (`fix(auth): allow bounded SMTP
  delivery time`).

## Application safeguards

- SMTP configuration is fail-closed: only authenticated TLS port 465 or
  required STARTTLS port 587 is accepted.
- The delivery implementation uses 10-second per-operation bounds and a
  15-second total deadline, closes transport/socket resources on every path,
  and emits sanitized failure metadata only.
- Auth-action issuance occurs only after delivery is accepted, preserving an
  existing valid reset/invitation action when the mail provider is unavailable.

## Verification performed on 2026-10-13

- Focused auth/email tests: 18/18 passed.
- `pnpm lint` and `pnpm run build` passed.
- Coolify deployment of `a0bc784` completed successfully.
- Controlled reset request for `hazarvolga@gmail.com` returned HTTP 200:
  `Hesap uygunsa parola yenileme bağlantısı gönderildi.`
- Stalwart mailbox UI was reachable for `info@bimmetraj.com`. An HTTP 200 from
  the application proves accepted SMTP submission; it does not by itself prove
  inbox placement. Check inbox and spam for the controlled recipient before
  treating deliverability as established.

## Access and recovery

- A one-time `STALWART_RECOVERY_ADMIN` variable was created to regain Stalwart
  management access. It was permanently removed from the AffeXAI mail service
  and that service was restarted to remove it from the running environment.
- Do not retain recovery credentials in Coolify after an incident. If recovery
  is needed again, create a new high-entropy, time-bounded credential, use it
  only for the repair, remove it immediately, restart the mail service, and
  record the event without recording the secret.

## Safe operating procedure

1. For a Stalwart mailbox password rotation, update `info@bimmetraj.com` in
   Stalwart first.
2. Update the identical value only in Bimmetraj Coolify runtime variable
   `AUTH_EMAIL_SMTP_PASSWORD`; retain `AUTH_EMAIL_DELIVERY_MODE=smtp`, host,
   port, username, and sender settings.
3. Deploy Bimmetraj. Run exactly one controlled password-reset request for the
   designated operator account and inspect the recipient inbox/spam folder.
4. If delivery fails, inspect Bimmetraj runtime logs for sanitized error code
   and response-code metadata. Do not expose or paste credentials into logs,
   tickets, or chat.
5. If Stalwart needs a configuration restart, schedule it as a brief mail
   interruption and re-check the service health after restart.

## Remaining operational work

- Confirm actual inbox arrival for the controlled reset recipient and establish
  a lightweight recurring deliverability check.
- Verify and monitor SPF, DKIM, DMARC, PTR/rDNS, TLS certificate renewal,
  backup/restore, outbound queue health, and abuse/bounce handling for the
  mail domain. SMTP authentication proves submission, not long-term sender
  reputation or inbox placement.
- Keep transactional sending separate from marketing mail and protect high-risk
  auth flows with their existing rate limits and audit records.
