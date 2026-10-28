import { resolveBenchmarkProvenance } from './benchmark-provenance';
import { resolveCatalogProvenance } from './catalog-provenance';
import { and, desc, eq, or } from "drizzle-orm";
import { withAppTenantTransaction } from "../../db/app-tenant";
import type { TenantContext } from "../../db/tenant-context";
import { clients, industries, quotationItemEvidence, quotationItems, quotations } from "../../db/schema";
import { calculateLineItemTotal, calculateQuotationTotals } from "../../lib/calculations";
import type { ManualQuotationInput } from "./input";
import { copyRevisionItems } from "./revision-copy";
import { consumeQuotationQuota } from "../billing/quota";
import { compareAiLine, verifyAiLine } from '../ai/quotation-provenance';
import { sha256Payload } from '../../smartcheck/pricing/snapshots';

export function normalizeQuotationTenantActor(actorOrCompanyId: TenantContext | string): TenantContext {
  return typeof actorOrCompanyId === "string"
    ? { companyId: actorOrCompanyId, userId: actorOrCompanyId }
    : actorOrCompanyId;
}

export class QuotationIntegrityError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function resolveQuotationIndustryId(
  industryId: string | null | undefined,
  loadIndustries: () => Promise<Array<{ id: string; enabled: boolean }>>,
): Promise<string | null> {
  const normalized = typeof industryId === "string" ? industryId.trim() : "";
  if (!normalized) return null;
  const catalogRows = await loadIndustries();
  if (catalogRows.length === 0) return null;
  const matched = catalogRows.find(row => row.id === normalized && row.enabled);
  if (!matched) {
    throw new QuotationIntegrityError(400, "Seçilen sektör kataloğunda aktif bir kayıt bulunamadı.");
  }
  return matched.id;
}

export async function createManualQuotation(actor: TenantContext, input: ManualQuotationInput) {
  const { companyId } = actor;
  return withAppTenantTransaction(actor, async tx => {
    await consumeQuotationQuota(tx, companyId);
    const [client] = await tx.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.companyId, companyId))).for("share");
    if (!client) throw new QuotationIntegrityError(400, "Client not available in this company");
    const { items, ...fields } = input;
    const aiEvidence = items.map(item => {
      if (!item.aiEvidenceToken) return null;
      try { return verifyAiLine(item.aiEvidenceToken, actor); }
      catch { throw new QuotationIntegrityError(400, 'AI kaynak kanıtı geçersiz veya süresi dolmuş. Kalemi yeniden oluşturun.'); }
    });
    const aiIds = aiEvidence.flatMap(item => item ? [item.id] : []);
    if (new Set(aiIds).size !== aiIds.length) throw new QuotationIntegrityError(400, 'Aynı AI önerisi bir teklifte birden fazla kullanılamaz.');
    const resolvedIndustryId = await resolveQuotationIndustryId(
      fields.industryId,
      () => tx.select({ id: industries.id, enabled: industries.enabled }).from(industries),
    );
    const catalog = await resolveCatalogProvenance(tx, actor, await resolveBenchmarkProvenance(tx, items, fields.currency), fields.currency);
    const validatedItems = catalog.items;
    const totals = calculateQuotationTotals(items.map(item => ({
      quantity: item.quantity, unitPrice: item.unitPrice, discountPercent: item.discountPercent, vatPercent: item.vatPercent,
    })), { overheadProfitPercent: fields.overheadProfitPercent });
    const [quote] = await tx.insert(quotations).values({
      ...fields,
      industryId: resolvedIndustryId,
      companyId,
      clientId: fields.clientId, quoteNumber: fields.quoteNumber, projectName: fields.projectName, expiryDate: fields.expiryDate,
      escalationVolatilityPercent: String(fields.escalationVolatilityPercent),
      carbonRiskPremiumPercent: String(fields.carbonRiskPremiumPercent),
      informationDeliveryCostPercent: String(fields.informationDeliveryCostPercent),
      overheadProfitPercent: String(fields.overheadProfitPercent), overheadProfitTotal: String(totals.overheadProfitTotal),
      subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal),
      vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal),
      revisionVersion: 1, isLatest: true,
    }).returning();
    await tx.insert(quotationItems).values(validatedItems.map((item, index) => {
      const { aiEvidenceToken: _token, ...savedItem } = item;
      return {
      ...savedItem, companyId, quotationId: quote.id,
      description: item.description, unit: item.unit,
      quantity: String(item.quantity), unitPrice: String(item.unitPrice),
      costUnitPrice: item.costUnitPrice == null ? null : String(item.costUnitPrice),
      wastePercent: String(item.wastePercent), discountPercent: String(item.discountPercent), vatPercent: String(item.vatPercent),
      total: String(calculateLineItemTotal({
        quantity: item.quantity, unitPrice: item.unitPrice, discountPercent: item.discountPercent, vatPercent: item.vatPercent,
      })),
      quantitySource: aiEvidence[index] ? 'ai_estimate' : 'manual',
      priceSource: aiEvidence[index] && item.priceSource === 'manual' ? 'ai_estimate' : item.priceSource,
    }; }));
    const evidence = [ ...catalog.evidenceFor(quote.id), ...validatedItems.flatMap((item, index) => {
      const original = aiEvidence[index];
      if (!original) return [];
      const final = { description: item.description, unit: item.unit, quantity: item.quantity, unitPrice: item.unitPrice };
      return [{ companyId, quotationId: quote.id, quotationItemId: item.id, evidenceType: 'source',
        evidenceKey: sha256Payload({ quotationId: quote.id, quotationItemId: item.id, aiSuggestionId: original.id }),
        capturedValueJson: { kind: 'ai_estimate', suggestionId: original.id, original: original.line, final, changedFields: compareAiLine(original.line, final), authority: 'non_authoritative' },
        status: 'current', createdByUserId: actor.userId }];
    }) ];
    if (evidence.length) await tx.insert(quotationItemEvidence).values(evidence);
    return quote;
  });
}

export async function createQuotationRevision(actorOrCompanyId: TenantContext | string, sourceId: string) {
  const actor = normalizeQuotationTenantActor(actorOrCompanyId);
  const { companyId } = actor;
  // Revisions preserve an existing quote series and do not consume new-quote quota.
  return withAppTenantTransaction(actor, async tx => {
    const [source] = await tx.select().from(quotations)
      .where(and(eq(quotations.id, sourceId), eq(quotations.companyId, companyId)));
    if (!source) throw new QuotationIntegrityError(404, "Original quote not found");
    const rootId = source.parentId || source.id;
    // Every revision in a series locks the same root before re-reading latest state.
    const [root] = await tx.select({ id: quotations.id }).from(quotations)
      .where(and(eq(quotations.id, rootId), eq(quotations.companyId, companyId))).for("update");
    if (!root) throw new QuotationIntegrityError(404, "Original quote not found");
    const series = and(eq(quotations.companyId, companyId), or(eq(quotations.id, rootId), eq(quotations.parentId, rootId)));
    const [latest] = await tx.select().from(quotations).where(series).orderBy(desc(quotations.revisionVersion)).limit(1);
    if (!latest || latest.id !== sourceId || !latest.isLatest) {
      throw new QuotationIntegrityError(409, "Quote has a newer revision; reload before revising");
    }
    const items = await tx.select().from(quotationItems)
      .where(and(eq(quotationItems.quotationId, sourceId), eq(quotationItems.companyId, companyId))).for("share");
    const evidence = await tx.select().from(quotationItemEvidence)
      .where(and(eq(quotationItemEvidence.quotationId, sourceId), eq(quotationItemEvidence.companyId, companyId))).for("share");
    await tx.update(quotations).set({ isLatest: false, updatedAt: new Date() }).where(series);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = latest;
    const [revision] = await tx.insert(quotations).values({
      ...fields, parentId: rootId, revisionVersion: latest.revisionVersion + 1, isLatest: true, status: "draft",
      pricingSnapshotLockStatus: "unlocked", pricingSnapshotLockedAt: null,
      pricingSnapshotLockedByUserId: null, pricingSnapshotLockHash: null,
    }).returning();
    const cloned = copyRevisionItems(items, evidence, revision.id);
    if (items.length) {
      await tx.insert(quotationItems).values(cloned.items);
    }
    if (evidence.length) {
      await tx.insert(quotationItemEvidence).values(cloned.evidence);
    }
    return revision;
  });
}
