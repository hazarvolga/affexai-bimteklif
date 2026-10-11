# SMTP Decision Handoff — 2026-10-11

## Pause state

The user requested a pause before selecting or implementing an email service.
This document records the decision-ready state. No code, DNS, Coolify service,
secret, SMTP credential, provider account, or production runtime configuration
was changed while preparing this handoff.

## Confirmed facts

- Bimmetraj production is `https://bimmetraj.com` on the AffeXAI Coolify
  application `ibjv2zbpecdcbd71lxo1vqd7`.
- Application mail delivery is intentionally disabled with
  `AUTH_EMAIL_DELIVERY_MODE=disabled`. Registration, invitation creation,
  reset-request, and resend flows fail before mutation. Existing login and
  redemption of a valid reset token remain available.
- `mail.allplan.net.tr` is a docker-mailserver on another server. It must not
  be reused for Bimmetraj.
- `bimmetraj.com` had no mail-specific MX, SPF, or `mail.bimmetraj.com` A
  record during the read-only DNS inspection. Treat this as time-sensitive and
  re-check before publishing records.
- Mailpit is an SMTP testing sink with a web UI. It previews intercepted mail;
  it does not provide real outbound delivery.
- Stalwart Community Edition is free under AGPL-3.0. The referenced Coolify
  guide is a useful proof of feasibility, but it changes proxy/certificate
  plumbing and does not remove the operational responsibilities of running a
  public mail server.

## Options assessed

| Option | Cash cost | Real delivery | Operating burden | Decision |
| --- | --- | --- | --- | --- |
| Mailpit | Free | No | Low | Use only local/test |
| Brevo Free SMTP | Free within current provider quota | Yes | Low | Recommended launch path |
| Cloudflare Email Sending | Paid Workers plan required | Yes | Low | Fallback if requirements change |
| Stalwart Community | License-free | Yes, after infrastructure work | High | Deferred architecture project |

Brevo Free was selected as the recommended path because launch traffic is
limited to transactional verification, reset, invitation, and notification
mail; it avoids a new VPS and the mail-server delivery/reputation burden.
Its current published allowance is 300 emails/day. Provider limits, sender
approval and pricing must be revalidated immediately before setup.

## Explicitly deferred

- Creating a Brevo account or any other provider account.
- Entering passwords, API keys, SMTP credentials, or payment details.
- Adding Cloudflare DNS records.
- Enabling application email delivery.
- Installing Stalwart, changing Coolify proxy configuration, or opening ports.
- Sending a test email to a user mailbox.

## Resume plan

1. Confirm the provider choice: Brevo Free is recommended.
2. Create and approve the provider account; keep SMTP credentials in the
   provider and Coolify only, never Git or chat.
3. Verify `bimmetraj.com` and publish only the provider-generated SPF/DKIM
   records. Add DMARC in monitor mode first, then tighten policy after delivery
   evidence is collected.
4. Add the SMTP host, port, username, password, sender address and delivery
   mode as Coolify runtime secrets.
5. Verify authenticated SMTP with TLS and send one controlled message.
6. Run end-to-end acceptance for verification, password reset and invitation,
   including expiry, rate limit, audit, failure, and retry behavior.
7. Commit code/config documentation separately from any secret or provider
   account changes. Record the deployed revision and acceptance evidence in
   `WORKING_STATE.md`.

## Sources to re-check at resume

- Coolify Mailpit: <https://coolify.io/docs/services/mailpit>
- Stalwart Community: <https://stalw.art/open-source/>
- Stalwart Docker/DNS guide: <https://stalw.art/docs/install/platform/docker/>
- Brevo free-plan policy: <https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans>
- Brevo transactional email: <https://www.brevo.com/products/transactional-email/>
