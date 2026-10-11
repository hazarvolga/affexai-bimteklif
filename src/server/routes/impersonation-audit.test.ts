import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../app';
import { AuthService } from '../../services/auth/authService';
import { db } from '../../db';
import { adminAuditLogs, clients, companies, memberships, plans, quotationItems, quotations, smartcheckAuditLogs, subscriptions, usageLogs, usageRecords, users } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

describe('Impersonation Audit & Exit Integration (P2-1)', () => {
  const app = createApiApp();
  const server = app.listen(0);
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const superAdminUserId = '99999999-9999-4999-a999-999999999999';
  const superAdminCompanyId = '88888888-8888-4888-a888-888888888888';
  const tenantUserId = '77777777-7777-4777-a777-777777777777';
  const tenantCompanyId = '66666666-6666-4666-a666-666666666666';
  const planId = '55555555-5555-4555-a555-555555555555';
  const clientId = '44444444-4444-4444-a444-444444444444';

  before(async () => {
    // Seed test users & companies in DB
    await db.insert(companies).values({ id: superAdminCompanyId, name: 'SuperAdmin Corp' }).onConflictDoNothing();
    await db.insert(companies).values({ id: tenantCompanyId, name: 'Tenant Corp' }).onConflictDoNothing();

    await db.insert(users).values({ id: superAdminUserId, email: 'admin-p21@teklifpro.ai', fullName: 'Super Admin', isSuperAdmin: true, emailVerified: new Date() }).onConflictDoNothing();
    await db.insert(users).values({ id: tenantUserId, email: 'tenant-p21@teklifpro.ai', fullName: 'Tenant User', isSuperAdmin: false, emailVerified: new Date() }).onConflictDoNothing();

    await db.insert(memberships).values({ companyId: superAdminCompanyId, userId: superAdminUserId, role: 'owner' }).onConflictDoNothing();
    await db.insert(memberships).values({ companyId: tenantCompanyId, userId: tenantUserId, role: 'owner' }).onConflictDoNothing();

    await db.insert(plans).values({
      id: planId,
      name: 'Test Plan',
      monthlyQuoteLimit: 100,
      monthlyPrice: 0,
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(subscriptions).values({
      companyId: tenantCompanyId,
      planId,
      bonusQuoteLimit: 10,
      currentPeriodStart: new Date(),
    }).onConflictDoNothing();

    await db.insert(clients).values({
      id: clientId,
      companyId: tenantCompanyId,
      name: 'Tenant Client',
      type: 'corporate',
    }).onConflictDoNothing();
  });

  after(async () => {
    try {
      await db.delete(adminAuditLogs).where(eq(adminAuditLogs.adminId, superAdminUserId));
      await db.delete(smartcheckAuditLogs).where(eq(smartcheckAuditLogs.companyId, tenantCompanyId));
      await db.delete(quotationItems).where(eq(quotationItems.companyId, tenantCompanyId));
      await db.delete(quotations).where(eq(quotations.companyId, tenantCompanyId));
      await db.delete(usageLogs).where(eq(usageLogs.companyId, tenantCompanyId));
      await db.delete(usageRecords).where(eq(usageRecords.companyId, tenantCompanyId));
      await db.delete(clients).where(eq(clients.id, clientId));
      await db.delete(subscriptions).where(eq(subscriptions.companyId, tenantCompanyId));
      await db.delete(plans).where(eq(plans.id, planId));
      await db.delete(memberships).where(eq(memberships.companyId, tenantCompanyId));
      await db.delete(memberships).where(eq(memberships.companyId, superAdminCompanyId));
      await db.delete(users).where(eq(users.id, tenantUserId));
      await db.delete(users).where(eq(users.id, superAdminUserId));
      await db.delete(companies).where(eq(companies.id, tenantCompanyId));
      await db.delete(companies).where(eq(companies.id, superAdminCompanyId));
    } finally {
      server.close();
    }
  });

  it('rejects /api/auth/impersonate/exit when unauthenticated with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/impersonate/exit`, {
      method: 'POST',
    });
    assert.equal(res.status, 401);
  });

  it('rejects /api/auth/impersonate/exit for regular non-impersonated token with 400', async () => {
    const regularToken = AuthService.generateToken({
      userId: tenantUserId,
      companyId: tenantCompanyId,
      role: 'owner',
    });

    const res = await fetch(`${baseUrl}/api/auth/impersonate/exit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${regularToken}`,
      },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Aktif bir impersonasyon oturumu bulunmuyor/);
  });

  it('successfully ends impersonation session and records impersonation.ended in adminAuditLogs', async () => {
    const impersonationToken = AuthService.generateImpersonationToken({
      userId: tenantUserId,
      companyId: tenantCompanyId,
      impersonatedBy: superAdminUserId,
      readOnly: false,
    });

    const res = await fetch(`${baseUrl}/api/auth/impersonate/exit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify adminAuditLogs has an 'impersonation.ended' record with superAdminId
    const [log] = await db
      .select()
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.adminId, superAdminUserId),
          eq(adminAuditLogs.action, 'impersonation.ended'),
          eq(adminAuditLogs.targetCompanyId, tenantCompanyId),
        ),
      );

    assert.ok(log, 'impersonation.ended log should be present in adminAuditLogs');
    assert.equal(log.adminId, superAdminUserId);
    assert.equal(log.targetCompanyId, tenantCompanyId);
    assert.equal((log.details as any)?.impersonatedUserId, tenantUserId);
  });

  it('records impersonatedBy inside smartcheckAuditLogs.metadataJson during tenant operations', async () => {
    const impersonationToken = AuthService.generateImpersonationToken({
      userId: tenantUserId,
      companyId: tenantCompanyId,
      impersonatedBy: superAdminUserId,
      readOnly: false,
    });

    // 1. Create a quotation using impersonated token
    const quoteRes = await fetch(`${baseUrl}/api/quotations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        quoteNumber: 'Q-IMP-001',
        projectName: 'Audited Impersonation Project',
        date: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
        items: [
          {
            description: 'Betonarme Kolon İmalatı',
            unit: 'm3',
            quantity: 10,
            unitPrice: 2500,
          },
        ],
      }),
    });

    assert.equal(quoteRes.status, 200);
    const quote = await quoteRes.json();
    assert.ok(quote.id);

    // 2. Verify smartcheckAuditLogs has the quotation.created record with impersonatedBy in metadataJson
    const quoteLogs = await db
      .select()
      .from(smartcheckAuditLogs)
      .where(
        and(
          eq(smartcheckAuditLogs.companyId, tenantCompanyId),
          eq(smartcheckAuditLogs.entityId, quote.id),
          eq(smartcheckAuditLogs.action, 'quotation.created'),
        ),
      );

    assert.ok(quoteLogs.length > 0, 'Quotation creation should be audited in smartcheckAuditLogs');
    const log = quoteLogs[0];
    assert.equal((log.metadataJson as any)?.impersonatedBy, superAdminUserId);
  });

  it('does NOT attach impersonatedBy when regular tenant user creates a quotation', async () => {
    const regularToken = AuthService.generateToken({
      userId: tenantUserId,
      companyId: tenantCompanyId,
      role: 'owner',
    });

    const quoteRes = await fetch(`${baseUrl}/api/quotations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${regularToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        quoteNumber: 'Q-REG-001',
        projectName: 'Regular Tenant Project',
        date: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
        items: [
          {
            description: 'Kalıp İmalatı',
            unit: 'm2',
            quantity: 50,
            unitPrice: 350,
          },
        ],
      }),
    });

    assert.equal(quoteRes.status, 200);
    const quote = await quoteRes.json();

    const quoteLogs = await db
      .select()
      .from(smartcheckAuditLogs)
      .where(
        and(
          eq(smartcheckAuditLogs.companyId, tenantCompanyId),
          eq(smartcheckAuditLogs.entityId, quote.id),
          eq(smartcheckAuditLogs.action, 'quotation.created'),
        ),
      );

    assert.ok(quoteLogs.length > 0);
    const log = quoteLogs[0];
    assert.equal((log.metadataJson as any)?.impersonatedBy, undefined);
  });

  it('verifies Shell.tsx contains the impersonation banner covering all tenant pages', () => {
    const shellPath = path.resolve(process.cwd(), 'src/components/layout/Shell.tsx');
    const shellContent = fs.readFileSync(shellPath, 'utf8');

    assert.ok(shellContent.includes('impersonatedBy'), 'Shell.tsx must check for user.impersonatedBy');
    assert.ok(shellContent.includes('impersonate modundasınız'), 'Shell.tsx must render the impersonation banner text');
    assert.ok(shellContent.includes('exitImpersonation'), 'Shell.tsx must provide exitImpersonation action');
  });
});
