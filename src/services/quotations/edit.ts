import { resolveBenchmarkProvenance } from './benchmark-provenance';
import { resolveCatalogProvenance } from './catalog-provenance';
import { and, desc, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { withAppTenantTransaction } from '../../db/app-tenant';
import type { TenantContext } from '../../db/tenant-context';
import { clients, industries, quotationFinancials, quotationItemEvidence, quotationItems, quotations } from '../../db/schema';
import { calculateLineItemTotal, calculateQuotationTotals } from '../../lib/calculations';
import { manualQuotationInput } from './input';
import { normalizeQuotationTenantActor, QuotationIntegrityError, resolveQuotationIndustryId } from './integrity';

export const editQuotationInput = manualQuotationInput.extend({
  updatedAt: z.string().datetime({ offset: true }),
  status: z.literal('draft').default('draft'),
});
type Transaction = Parameters<Parameters<typeof withAppTenantTransaction>[1]>[0];

async function lockDraft(tx: Transaction, companyId: string, id: string) {
  const scope = and(eq(quotations.id, id), eq(quotations.companyId, companyId));
  const [initial] = await tx.select().from(quotations).where(scope);
  if (!initial) throw new QuotationIntegrityError(404, 'Teklif bulunamadı.');
  const rootId = initial.parentId || initial.id;
  // Match revision creation: root first, then the edited revision and its items.
  await tx.select({ id: quotations.id }).from(quotations)
    .where(and(eq(quotations.id, rootId), eq(quotations.companyId, companyId))).for('update');
  const [quote] = await tx.select().from(quotations).where(scope).for('update');
  const [latest] = await tx.select({ id: quotations.id }).from(quotations)
    .where(and(eq(quotations.companyId, companyId), or(eq(quotations.id, rootId), eq(quotations.parentId, rootId))))
    .orderBy(desc(quotations.revisionVersion)).limit(1);
  if (!quote || quote.status !== 'draft' || !quote.isLatest || latest?.id !== id) {
    throw new QuotationIntegrityError(409, 'Yalnızca en son taslak düzenlenebilir. Teklifi yeniden açın.');
  }
  const items = await tx.select().from(quotationItems)
    .where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, companyId))).for('update');
  const evidence = await tx.select({ id: quotationItemEvidence.id }).from(quotationItemEvidence)
    .where(and(eq(quotationItemEvidence.quotationId, id), eq(quotationItemEvidence.companyId, companyId))).limit(1);
  if (evidence.length || quote.pricingSnapshotLockStatus !== 'unlocked' || quote.pricingSnapshotLockHash
    || items.some(item => item.quantitySource !== 'manual' || item.priceSource !== 'manual'
      || item.verificationStatus !== 'unverified' || item.sourceReference || item.sourceDocumentId
      || item.sourceProcessingRunId || item.sourceQuantityRowId || item.sourceCellRange || item.sourceRuleVersion
      || item.transferIdempotencyKey || item.priceSnapshotId || item.priceSnapshotLockedAt || item.priceSnapshotStatus !== 'none')) {
    throw new QuotationIntegrityError(409, 'Kaynak veya kanıt bağlantılı teklif bu formda düzenlenemez. Mevcut kanıtlar korundu.');
  }
  return { quote, items };
}

export async function loadEditableQuotation(actorOrCompanyId: TenantContext | string, id: string) {
  const actor = normalizeQuotationTenantActor(actorOrCompanyId);
  const { companyId } = actor;
  return withAppTenantTransaction(actor, async tx => {
    const { quote, items } = await lockDraft(tx, companyId, id);
    return { ...quote, items };
  });
}

export async function editManualQuotation(actorOrCompanyId: TenantContext | string, id: string, input: z.infer<typeof editQuotationInput>) {
  if (input.items.some(item => item.aiEvidenceToken)) throw new QuotationIntegrityError(409, 'AI kaynaklı satırlar mevcut taslak düzenleyicisinde kaydedilemez; kanıtı korumak için yeni teklif oluşturun.');
  const actor = normalizeQuotationTenantActor(actorOrCompanyId);
  const { companyId } = actor;
  return withAppTenantTransaction(actor, async tx => {
    const { quote } = await lockDraft(tx, companyId, id);
    if (quote.updatedAt.getTime() !== new Date(input.updatedAt).getTime()) {
      throw new QuotationIntegrityError(409, 'Teklif başka bir işlemle değişti. Kaydetmeden önce yeniden yükleyin.');
    }
    const [client] = await tx.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.companyId, companyId))).for('share');
    if (!client) throw new QuotationIntegrityError(400, 'Müşteri bu şirkette bulunamadı.');
    const { items, updatedAt: _version, ...fields } = input;
    const resolvedIndustryId = await resolveQuotationIndustryId(
      fields.industryId,
      () => tx.select({ id: industries.id, enabled: industries.enabled }).from(industries),
    );
    const catalog = await resolveCatalogProvenance(tx, actor, await resolveBenchmarkProvenance(tx, items, fields.currency), fields.currency);
    const validatedItems = catalog.items;
    const totals = calculateQuotationTotals(items.map(item => ({
      quantity: item.quantity, unitPrice: item.unitPrice, discountPercent: item.discountPercent, vatPercent: item.vatPercent,
    })), { overheadProfitPercent: fields.overheadProfitPercent });
    const updatedAt = new Date(Math.max(Date.now(), quote.updatedAt.getTime() + 1));
    const [saved] = await tx.update(quotations).set({
      ...fields, industryId: resolvedIndustryId, updatedAt,
      escalationVolatilityPercent: String(fields.escalationVolatilityPercent),
      carbonRiskPremiumPercent: String(fields.carbonRiskPremiumPercent),
      informationDeliveryCostPercent: String(fields.informationDeliveryCostPercent),
      overheadProfitPercent: String(fields.overheadProfitPercent), overheadProfitTotal: String(totals.overheadProfitTotal),
      subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal),
      vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal),
    }).where(and(eq(quotations.id, id), eq(quotations.companyId, companyId))).returning();
    await tx.delete(quotationItems).where(and(eq(quotationItems.quotationId, id), eq(quotationItems.companyId, companyId)));
    await tx.insert(quotationItems).values(validatedItems.map(item => ({
      ...item, companyId, quotationId: id,
      description: item.description, unit: item.unit,
      quantity: String(item.quantity), unitPrice: String(item.unitPrice),
      costUnitPrice: item.costUnitPrice == null ? null : String(item.costUnitPrice),
      wastePercent: String(item.wastePercent), discountPercent: String(item.discountPercent), vatPercent: String(item.vatPercent),
      total: String(calculateLineItemTotal({
        quantity: item.quantity, unitPrice: item.unitPrice, discountPercent: item.discountPercent, vatPercent: item.vatPercent,
      })), quantitySource: 'manual', })));
    const evidence = catalog.evidenceFor(id);
    if (evidence.length) await tx.insert(quotationItemEvidence).values(evidence);
    await tx.delete(quotationFinancials).where(eq(quotationFinancials.quotationId, id));
    return saved;
  });
}
