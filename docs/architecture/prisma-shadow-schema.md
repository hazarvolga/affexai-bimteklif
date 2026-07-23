# Prisma shadow foundation — F15

**Durum:** Schema validation passed; no database connection, migration,
`db push`, generated client usage or dual-write was performed.

## Scope

`prisma/shadow/schema.prisma` is the first target-core model for the bounded
contexts that must preserve evidence and tenant isolation:

- Identity/Tenant: `User`, `Company`, `Membership`;
- Quotations: `Client`, `Quotation`, `QuotationItem`,
  `QuotationItemEvidence`;
- SmartCheck: `Document`, `DocumentProcessingRun`,
  `NormalizedQuantityRow`, `SmartcheckAuditLog`;
- Pilot measurement: `SmartcheckPilotCase`, `SmartcheckPilotMeasurement`.

Every tenant-owned model carries `companyId`. Cross-tenant relations use
composite identity keys such as `[id, companyId]`; this keeps a future Prisma
repository from accidentally looking up a resource by global UUID alone.

## Validation

```bash
pnpm prisma:shadow-contract
pnpm prisma:validate:shadow
```

The first command is database-free and checks the model inventory, tenant key
presence, composite identity uniques and the Express single-write-owner marker.
The second invokes Prisma schema validation against a placeholder URL when no
`DATABASE_URL` is supplied. It does not connect to PostgreSQL.

## Migration gate

This schema is not an instruction to migrate the current database. Before any
shadow database is created, the team must produce:

1. an isolated `teklifpro_next_local` database and a schema-only backup;
2. a Drizzle-to-Prisma column/type diff with an owner for every mismatch;
3. additive migration SQL reviewed against the current Drizzle journal;
4. row-count/checksum parity and rollback/restore evidence;
5. contract and cross-tenant HTTP parity with Express.

Until those artifacts and the real pilot KPI gate exist, Drizzle/Express remains
the only write owner and the Prisma schema stays descriptive only.
