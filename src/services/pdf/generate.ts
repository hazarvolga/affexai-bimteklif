import { renderPdf } from './renderer';
import { db } from '../../db';
import { withAppTenant } from '../../db/app-tenant';
import { getControlDatabase } from '../../db/control-plane';
import type { TenantContext } from '../../db/tenant-context';
import { quotations, quotationItems, quotationItemEvidence, companies, clients, normalizedQuantityRows } from '../../db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { templates, PdfData } from './templates';
import { assertPdfPriceSourcesCertain } from './price-guard';

/**
 * Professional PDF Generation Engine
 */
export async function generateQuotationPdf(quotationId: string, templateId: string = "default_construction", actor?: TenantContext, includeEvidence = false, signal?: AbortSignal): Promise<Buffer> {
  const companyId = actor?.companyId;
  // 1. Fetch Data
  const { quote, company, clientData, items, sourceRows, priceEvidence } = actor
    ? await withAppTenant(actor, async (tenantDb) => {
        const fetchedQuote = await tenantDb.query.quotations.findFirst({
          where: and(eq(quotations.id, quotationId), eq(quotations.companyId, actor.companyId)),
        });
        if (!fetchedQuote) {
          return { quote: undefined, company: undefined, clientData: undefined, items: [] as (typeof quotationItems.$inferSelect)[], sourceRows: [], priceEvidence: [] };
        }
        const [fetchedCompany, fetchedClient, fetchedItems] = await Promise.all([
          tenantDb.query.companies.findFirst({ where: eq(companies.id, fetchedQuote.companyId) }),
          tenantDb.query.clients.findFirst({ where: and(eq(clients.id, fetchedQuote.clientId), eq(clients.companyId, fetchedQuote.companyId)) }),
          tenantDb.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, fetchedQuote.companyId))),
        ]);
        const sourceIds = fetchedItems.flatMap(item => item.sourceQuantityRowId ? [item.sourceQuantityRowId] : []);
        const sourceRows = sourceIds.length ? await tenantDb.select({ id: normalizedQuantityRows.id, rawPrice: normalizedQuantityRows.rawPrice, normalizedPrice: normalizedQuantityRows.normalizedPrice }).from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.companyId, actor.companyId), inArray(normalizedQuantityRows.id, sourceIds))) : [];
        const priceEvidence = sourceIds.length ? await tenantDb.select({ itemId: quotationItemEvidence.quotationItemId, source: quotationItemEvidence.capturedValueJson, createdByUserId: quotationItemEvidence.createdByUserId }).from(quotationItemEvidence).where(and(eq(quotationItemEvidence.companyId, actor.companyId), eq(quotationItemEvidence.quotationId, quotationId), eq(quotationItemEvidence.evidenceType, 'price'), eq(quotationItemEvidence.status, 'current'))) : [];
        return { quote: fetchedQuote, company: fetchedCompany, clientData: fetchedClient, items: fetchedItems, sourceRows, priceEvidence };
      })
    : await (async () => {
        const fetchedQuote = await db.query.quotations.findFirst({
          where: companyId
            ? and(eq(quotations.id, quotationId), eq(quotations.companyId, companyId))
            : eq(quotations.id, quotationId),
        });
        if (!fetchedQuote) {
          return { quote: undefined, company: undefined, clientData: undefined, items: [] as (typeof quotationItems.$inferSelect)[], sourceRows: [], priceEvidence: [] };
        }
        const [fetchedCompany, fetchedClient, fetchedItems] = await Promise.all([
          getControlDatabase().db.query.companies.findFirst({ where: eq(companies.id, fetchedQuote.companyId) }),
          db.query.clients.findFirst({ where: and(eq(clients.id, fetchedQuote.clientId), eq(clients.companyId, fetchedQuote.companyId)) }),
          db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, fetchedQuote.companyId))),
        ]);
        const sourceIds = fetchedItems.flatMap(item => item.sourceQuantityRowId ? [item.sourceQuantityRowId] : []);
        const sourceRows = sourceIds.length ? await db.select({ id: normalizedQuantityRows.id, rawPrice: normalizedQuantityRows.rawPrice, normalizedPrice: normalizedQuantityRows.normalizedPrice }).from(normalizedQuantityRows).where(and(eq(normalizedQuantityRows.companyId, fetchedQuote.companyId), inArray(normalizedQuantityRows.id, sourceIds))) : [];
        const priceEvidence = sourceIds.length ? await db.select({ itemId: quotationItemEvidence.quotationItemId, source: quotationItemEvidence.capturedValueJson, createdByUserId: quotationItemEvidence.createdByUserId }).from(quotationItemEvidence).where(and(eq(quotationItemEvidence.companyId, fetchedQuote.companyId), eq(quotationItemEvidence.quotationId, quotationId), eq(quotationItemEvidence.evidenceType, 'price'), eq(quotationItemEvidence.status, 'current'))) : [];
        return { quote: fetchedQuote, company: fetchedCompany, clientData: fetchedClient, items: fetchedItems, sourceRows, priceEvidence };
      })();

  if (!quote) throw new Error("Quotation not found");

  if (!company) throw new Error("Company not found");
  if (!clientData) throw new Error("Client not found");
  assertPdfPriceSourcesCertain(items, sourceRows, priceEvidence.map(entry => ({ itemId: entry.itemId, source: entry.source?.source, price: entry.source?.price, zeroPriceReason: entry.source?.zeroPriceReason, createdByUserId: entry.createdByUserId })));

  // 2. Prepare Template Data
  const pdfData: PdfData = {
    company: {
      name: company.name,
      address: company.address || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined,
      taxNumber: company.taxNumber || undefined,
    },
    client: {
      name: clientData.name,
      address: clientData.address || undefined,
      email: clientData.email || undefined,
      phone: clientData.phone || undefined,
    },
    quotation: {
      quoteNumber: quote.quoteNumber,
      projectName: quote.projectName,
      date: new Date(quote.date).toLocaleDateString('tr-TR'),
      expiryDate: new Date(quote.expiryDate).toLocaleDateString('tr-TR'),
      currency: quote.currency,
      status: quote.status as any,
      revisionVersion: quote.revisionVersion,
      subtotal: Number(quote.subtotal),
      discountTotal: Number(quote.discountTotal),
      overheadProfitPercent: Number(quote.overheadProfitPercent),
      overheadProfitTotal: Number(quote.overheadProfitTotal),
      vatTotal: Number(quote.vatTotal),
      grandTotal: Number(quote.grandTotal),
    },
    items: items.map(item => ({
      description: item.description,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      vatPercent: Number(item.vatPercent),
      total: Number(item.total),
    })),
    evidenceSummary: includeEvidence ? {
      verifiedItemCount: items.filter((item) => item.verificationStatus === "verified" && item.sourceQuantityRowId).length,
      sourceDocumentCount: new Set(items.map((item) => item.sourceDocumentId).filter(Boolean)).size,
      ruleVersions: [...new Set(items.map((item) => item.sourceRuleVersion).filter((value): value is string => Boolean(value)))],
    } : undefined,
  };

  // 3. Render HTML
  const template = templates.find(t => t.id === templateId) || templates[0];
  const html = template.htmlTemplate(pdfData);

  // 4. Generate PDF
  return renderPdf(html, { signal });
}
