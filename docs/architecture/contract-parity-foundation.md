# F15 foundation slice — Contract and parity boundary

**Durum:** Local foundation implemented; no NestJS/Next.js runtime or second
database write owner has been introduced.

## Why this slice exists

The pilot currently runs on Vite + Express + Drizzle. The production target is
Next.js App Router + NestJS bounded contexts + PostgreSQL/Prisma, but a rewrite
before real pilot evidence would create migration risk. This slice makes the
first seam explicit without changing the pilot runtime:

- `src/contracts/smartcheck.ts` contains versioned transport schemas for the
  upload, completion, mapping, row review and transfer boundaries;
- `src/contracts/context-contracts.ts` records bounded-context ownership,
  route operations and cutover status;
- the current Express SmartCheck routes consume the same schemas that a future
  NestJS controller can reuse;
- the contract test rejects duplicate routes and a target write owner while a
  context is still in `foundation`.

## Single-write-owner rule

Until F10–F12 external admission and KPI gates are complete, `express-pilot` is
the only write owner for SmartCheck and Quotations. The inventory is a parity
checklist, not a feature flag and not a dual-write mechanism. A future
`nestjs-target` entry is valid only when its context is explicitly marked
`cutover-ready` and contract, tenant-negative, backup and rollback evidence has
been attached.

## Contract rules

1. Transport schemas are versioned and must not expose Drizzle/Prisma models.
2. Unknown top-level fields remain pass-through for additive client evolution;
   known fields have bounded lengths and types.
3. Domain invariants (checksum, tenant ownership, approved-row transfer,
   source hash and quotation status) remain enforced by the current service and
   database layers.
4. A schema change requires the current HTTP integration suite and the future
   NestJS parity suite to be updated together.
5. No Prisma migration is generated in this slice; Drizzle remains the pilot
   migration/write owner.

## Exit evidence for the complete F15 phase

The complete migration-foundation phase still needs:

- OpenAPI/JSON schema publication from these contracts;
- a shadow `teklifpro_next_local` database and additive Prisma schema;
- old-Express vs future-Nest contract and tenant-negative parity runs;
- backup/restore evidence and a documented rollback window.

Those items remain deliberately outside this local foundation commit until the
real pilot data and production storage admission are available.
