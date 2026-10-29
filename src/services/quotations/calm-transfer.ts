import { buildPricePermissionEvidence, sourceReviewEligible } from "../../server/pricing/source-review-policy";
export { buildPricePermissionEvidence } from "../../server/pricing/source-review-policy";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { withAppTenantTransaction } from "../../db/app-tenant";
import {
  clients,
  documentProcessingRuns,
  documentProcessingArtifacts,
  documents,
  normalizedQuantityRows,
  priceSnapshots,
  priceSources,
  quotationItemEvidence,
  quotationItems,
  quotations,
  quotationTransferLedgers,
  quotationTransferSourceRows,
} from "../../db/schema";
import { buildCalmIfcDatasetFromElements, CALM_ICMAL_RULE_VERSION, parseSmartCheckRowToPseudoElement } from "../../ifc/calm-icmal";
import { calculateLineItemTotal, calculateQuotationTotals } from "../../lib/calculations";
import { priceSnapshotMatchesQuotationItem } from "../../smartcheck/pricing/integrity";
import { isPriceSnapshotStale, sha256Payload } from "../../smartcheck/pricing/snapshots";
import { consumeQuotationQuota } from "../billing/quota";
import { copyRevisionItems } from "./revision-copy";

export type CalmTransferSourceRow = {
  id: string;
  documentId: string;
  processingRunId: string;
  sourceCellRange: string;
  rawDescription: string | null;
  rawPositionCode: string | null;
  rawUnit: string | null;
  rawQuantity: string | number | null;
  formulaJson: Record<string, string>;
  quantitySource: string | null;
  normalizedDescription: string | null;
  normalizedPositionCode: string | null;
  normalizedUnit: string | null;
  normalizedQuantity: string | number | null;
  normalizedWastePercent: string | number | null;
  reviewStatus: string;
  reviewedAt: Date | null;
  reviewerUserId: string | null;
};

export type CalmTransferLine = {
  lineId: string;
  description: string;
  positionCode: string;
  unit: string;
  quantity: string;
  wastePercent: string;
  priceSnapshotId: string;
  sourceRuleVersion: typeof CALM_ICMAL_RULE_VERSION;
  sourceRows: Array<{
    rowId: string;
    documentId: string;
    processingRunId: string;
    sourceCellRange: string;
    contributedQuantity: string;
  }>;
};

const SCALE = 10_000n;

function fixed4(value: string | number | null, code: string): bigint {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^([+-]?)(\d+)(?:\.(\d{1,4}))?$/);
  if (!match) throw new Error(code);
  const scaled = BigInt(match[2]) * SCALE + BigInt((match[3] ?? "").padEnd(4, "0"));
  return match[1] === "-" ? -scaled : scaled;
}

function stringifyFixed4(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / SCALE}.${String(absolute % SCALE).padStart(4, "0")}`;
}

function required(value: string | null, code: string): string {
  const clean = value?.trim();
  if (!clean) throw new Error(code);
  return clean;
}

/**
 * Projects persisted, reviewed SmartCheck rows into deterministic Calm quotation lines.
 * The client may choose only snapshot identities; quantities and grouping come from rows.
 */
export function projectApprovedRowsToCalmQuotationLines(
  rows: readonly CalmTransferSourceRow[],
  priceSnapshotIdsByCalmLineId: Readonly<Record<string, string>>,
  requireSelections = false,
): CalmTransferLine[] {
  if (!rows.length) throw new Error("CALM_TRANSFER_ROWS_REQUIRED");
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) throw new Error("CALM_TRANSFER_DUPLICATE_ROW");
    seen.add(row.id);
    if (row.reviewStatus !== "approved") throw new Error("CALM_TRANSFER_ROW_NOT_APPROVED");
    if (!row.reviewedAt || !row.reviewerUserId) throw new Error("CALM_TRANSFER_ROW_REVIEW_ATTRIBUTION_REQUIRED");
    const quantity = fixed4(row.normalizedQuantity, "CALM_TRANSFER_QUANTITY_INVALID");
    if (quantity <= 0n) throw new Error("CALM_TRANSFER_QUANTITY_INVALID");
    if (quantity > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("CALM_TRANSFER_QUANTITY_RANGE_UNSUPPORTED");
    const calculationQuantity = Number(String(row.normalizedQuantity));
    if (!Number.isFinite(calculationQuantity) || BigInt(Math.round(calculationQuantity * 10_000)) !== quantity) {
      throw new Error("CALM_TRANSFER_QUANTITY_RANGE_UNSUPPORTED");
    }
    const waste = fixed4(row.normalizedWastePercent ?? 0, "CALM_TRANSFER_WASTE_INVALID");
    if (waste < 0n) throw new Error("CALM_TRANSFER_WASTE_INVALID");
  }
  const pseudoElements = rows.map((row, index) => parseSmartCheckRowToPseudoElement(row, index));
  if (pseudoElements.some((element) => element.quantitySource === "geometry")) throw new Error("CALM_TRANSFER_IFC_GEOMETRY_BLOCKED");
  if (rows.some((row) => (row.quantitySource !== "ifc_qto" && row.quantitySource !== "ifc_property") || !row.formulaJson?.quantitySourcePath?.trim())) throw new Error("CALM_TRANSFER_IFC_SOURCE_UNVERIFIED");
  const items = buildCalmIfcDatasetFromElements(pseudoElements, null, "server-calm-projection.ifc").groups.flatMap((group) => group.items);
  if (!items.length) throw new Error("CALM_TRANSFER_LINES_REQUIRED");
  const lineIds = new Set(items.map((item) => item.id));
  const selectedLineIds = Object.keys(priceSnapshotIdsByCalmLineId);
  if (selectedLineIds.some((lineId) => !lineIds.has(lineId))) throw new Error("CALM_TRANSFER_PRICE_SELECTION_INVALID");
  if (requireSelections && (selectedLineIds.length !== lineIds.size || items.some((item) => !priceSnapshotIdsByCalmLineId[item.id]?.trim()))) {
    throw new Error("CALM_TRANSFER_PRICE_SELECTION_REQUIRED");
  }
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const contributionByLine = new Map<string, Map<string, string>>();
  for (const [index, row] of rows.entries()) {
    const rowItems = buildCalmIfcDatasetFromElements([parseSmartCheckRowToPseudoElement(row, index)], null, "server-calm-row.ifc").groups.flatMap((group) => group.items);
    for (const item of rowItems) {
      const byRow = contributionByLine.get(item.id) ?? new Map<string, string>();
      byRow.set(row.id, stringifyFixed4(fixed4(item.netQuantity, "CALM_TRANSFER_QUANTITY_INVALID")));
      contributionByLine.set(item.id, byRow);
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id)).map((item) => {
    const total = fixed4(item.netQuantity, "CALM_TRANSFER_QUANTITY_INVALID");
    if (total <= 0n) throw new Error("CALM_TRANSFER_QUANTITY_INVALID");
    const candidates = [...(contributionByLine.get(item.id)?.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b));
    if (!candidates.length) throw new Error("CALM_TRANSFER_SOURCE_LINEAGE_REQUIRED");
    const rawWeights = candidates.map(([, quantity]) => fixed4(quantity, "CALM_TRANSFER_QUANTITY_INVALID"));
    const weightSum = rawWeights.reduce((sum, weight) => sum + weight, 0n);
    const weights = weightSum > 0n ? rawWeights : rawWeights.map(() => 1n);
    const divisor = weights.reduce((sum, weight) => sum + weight, 0n);
    if (total < BigInt(candidates.length)) throw new Error("CALM_TRANSFER_QUANTITY_PRECISION_UNSUPPORTED");
    const distributable = total - BigInt(candidates.length);
    const allocated = weights.map((weight) => 1n + distributable * weight / divisor);
    let residual = total - allocated.reduce((sum, quantity) => sum + quantity, 0n);
    for (let index = 0; residual > 0n; index = (index + 1) % allocated.length) {
      allocated[index] += 1n;
      residual -= 1n;
    }
    return {
      lineId: item.id,
      description: item.title,
      positionCode: required(item.pozCode, "CALM_TRANSFER_POSITION_REQUIRED"),
      unit: item.unit,
      quantity: stringifyFixed4(total),
      wastePercent: "0.0000",
      priceSnapshotId: priceSnapshotIdsByCalmLineId[item.id]?.trim() ?? "",
      sourceRuleVersion: CALM_ICMAL_RULE_VERSION,
      sourceRows: candidates.map(([rowId], index) => {
      const row = rowById.get(rowId)!;
        return { rowId, documentId: row.documentId, processingRunId: row.processingRunId, sourceCellRange: row.sourceCellRange, contributedQuantity: stringifyFixed4(allocated[index]) };
      }),
    };
  });
}

export function buildCalmTransferRequestHash(input: {
  companyId: string;
  actorUserId: string;
  sourceDocumentId: string;
  targetQuotationId: string;
  priceSnapshotIdsByCalmLineId: Readonly<Record<string, string>>;
  overheadProfitPercent?: string;
}): string {
  return sha256Payload({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    sourceDocumentId: input.sourceDocumentId,
    targetQuotationId: input.targetQuotationId,
    lines: Object.entries(input.priceSnapshotIdsByCalmLineId).sort(([a], [b]) => a.localeCompare(b)).map(([lineId, priceSnapshotId]) => ({ lineId, priceSnapshotId })),
    // Only when given, so requests made before release 0029 keep their idempotency hash.
    ...(input.overheadProfitPercent === undefined ? {} : { overheadProfitPercent: input.overheadProfitPercent }),
  });
}

export function buildCalmTransferScopeHash(input: Record<string, unknown>): string {
  return sha256Payload(input);
}

export function buildQuotationBaselineHash(
  quotation: Record<string, unknown>,
  items: ReadonlyArray<Record<string, unknown>>,
  evidence: ReadonlyArray<Record<string, unknown>>,
): string {
  return sha256Payload(buildQuotationBaselineSnapshot(quotation, items, evidence));
}

export function buildQuotationBaselineSnapshot(
  quotation: Record<string, unknown>,
  items: ReadonlyArray<Record<string, unknown>>,
  evidence: ReadonlyArray<Record<string, unknown>>,
): { quotation: Record<string, unknown>; items: Record<string, unknown>[]; evidence: Record<string, unknown>[] } {
  const canonicalize = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  return {
    quotation: canonicalize(quotation),
    items: items.map(canonicalize).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    evidence: evidence.map(canonicalize).sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
}

export function snapshotVatPercent(value: string | number | null): string {
  if (value === null) throw new Error("CALM_TRANSFER_VAT_INVALID");
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,3})(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("CALM_TRANSFER_VAT_INVALID");
  const basisPoints = BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (basisPoints > 10_000n) throw new Error("CALM_TRANSFER_VAT_INVALID");
  return `${basisPoints / 100n}.${String(basisPoints % 100n).padStart(2, "0")}`;
}

export function snapshotAmountForCalculation(value: string | number): { amount: string; numeric: number } {
  const raw = String(value).trim();
  const match = raw.match(/^(\d+)(?:\.(\d{1,4}))?$/);
  if (!match) throw new Error("CALM_TRANSFER_PRICE_SCALE_UNSUPPORTED");
  const fraction = (match[2] ?? "").padEnd(4, "0");
  if (fraction.slice(2) !== "00") throw new Error("CALM_TRANSFER_PRICE_SCALE_UNSUPPORTED");
  const cents = BigInt(match[1]) * 100n + BigInt(fraction.slice(0, 2));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("CALM_TRANSFER_PRICE_RANGE_UNSUPPORTED");
  const numeric = Number(cents) / 100;
  if (!Number.isFinite(numeric) || BigInt(Math.round(numeric * 100)) !== cents) throw new Error("CALM_TRANSFER_PRICE_RANGE_UNSUPPORTED");
  return { amount: `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`, numeric };
}

export function assertQuotationItemCalculationSafe(item: { quantity: string | number; unitPrice: string | number; discountPercent: string | number; vatPercent: string | number }): void {
  const quantity = fixed4(item.quantity, "CALM_TRANSFER_QUANTITY_RANGE_UNSUPPORTED");
  const unitPrice = fixed4(item.unitPrice, "CALM_TRANSFER_PRICE_RANGE_UNSUPPORTED");
  const discount = fixed4(item.discountPercent, "CALM_TRANSFER_DISCOUNT_UNSUPPORTED");
  const vat = fixed4(item.vatPercent, "CALM_TRANSFER_VAT_INVALID");
  if (quantity < 0n || unitPrice < 0n || discount < 0n || discount > 100n * SCALE || vat < 0n || vat > 100n * SCALE) {
    throw new Error("CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED");
  }
  if ([quantity, unitPrice, discount, vat].some((value) => value > BigInt(Number.MAX_SAFE_INTEGER))) {
    throw new Error("CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED");
  }
  const roundDivide = (numerator: bigint, denominator: bigint) => (numerator + denominator / 2n) / denominator;
  const grossCents = roundDivide(quantity * unitPrice * 100n, SCALE * SCALE);
  const discountCents = roundDivide(grossCents * discount, 100n * SCALE);
  const netCents = grossCents - discountCents;
  const vatCents = roundDivide(netCents * vat, 100n * SCALE);
  if (netCents > BigInt(Number.MAX_SAFE_INTEGER) || netCents + vatCents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED");
  const calculated = calculateLineItemTotal({ quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discountPercent: Number(item.discountPercent), vatPercent: Number(item.vatPercent) });
  if (!Number.isFinite(calculated) || BigInt(Math.round(calculated * 100)) !== netCents) throw new Error("CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED");
}

export class CalmTransferError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

export type CalmTransferActor = { companyId: string; userId: string };
export type CalmTransferRequest = {
  sourceDocumentId: string;
  targetQuotationId: string;
  priceSnapshotIdsByCalmLineId: Readonly<Record<string, string>>;
  /** Profit and overhead for the new revision, as a two-decimal string; the latest revision's value when absent. */
  overheadProfitPercent?: string;
};

type Transaction = Parameters<Parameters<typeof withAppTenantTransaction>[1]>[0];

function transferError(code: string, status = 409): never {
  throw new CalmTransferError(code, status);
}

export function snapshotIsEligible(
  snapshot: typeof priceSnapshots.$inferSelect,
  source: typeof priceSources.$inferSelect | undefined,
  at: Date,
): boolean {
  if (snapshot.reviewStatus !== "approved" || !snapshot.reviewedAt || !snapshot.reviewedByUserId || isPriceSnapshotStale(snapshot, at)) return false;
  return Boolean(source && source.authorizationStatus !== "restricted" && sourceReviewEligible(source)
    && source.licenseStatus !== "restricted");
}

async function authorizeActorAndFindReplay(
  tx: Transaction,
  actor: CalmTransferActor,
  idempotencyKey: string,
  requestPayloadHash: string,
) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${actor.companyId}:${actor.userId}:${idempotencyKey}`}, 0))`);
  // The application role may read memberships but cannot lock rows directly:
  // the narrowly scoped helper checks the tenant GUC and holds the lock as owner.
  const memberResult = await tx.execute<{ role: string | null }>(sql`select bimmetraj_lock_tenant_member(${actor.userId}::uuid, ${actor.companyId}::uuid) as role`);
  const memberRole = memberResult.rows[0]?.role;
  if (!memberRole) transferError("CALM_TRANSFER_ACTOR_NOT_MEMBER", 403);
  if (memberRole === "viewer") transferError("CALM_TRANSFER_ACTOR_NOT_AUTHORIZED", 403);

  const [ledger] = await tx.select().from(quotationTransferLedgers).where(and(
    eq(quotationTransferLedgers.companyId, actor.companyId),
    eq(quotationTransferLedgers.actorUserId, actor.userId),
    eq(quotationTransferLedgers.idempotencyKey, idempotencyKey),
  ));
  if (!ledger) return null;
  if (ledger.requestPayloadHash !== requestPayloadHash) transferError("CALM_TRANSFER_IDEMPOTENCY_CONFLICT");
  const [quotation] = await tx.select().from(quotations).where(and(
    eq(quotations.id, ledger.targetQuotationId),
    eq(quotations.companyId, actor.companyId),
  ));
  if (!quotation) transferError("CALM_TRANSFER_REPLAY_TARGET_MISSING", 500);
  return { replayed: true as const, ledger, quotation };
}

async function lockLatestQuotation(tx: Transaction, actor: CalmTransferActor, targetQuotationId: string) {
  const [requested] = await tx.select().from(quotations).where(and(
    eq(quotations.id, targetQuotationId),
    eq(quotations.companyId, actor.companyId),
  ));
  if (!requested) transferError("CALM_TRANSFER_QUOTATION_NOT_FOUND", 404);
  const rootId = requested.parentId ?? requested.id;
  const [root] = await tx.select({ id: quotations.id }).from(quotations).where(and(
    eq(quotations.id, rootId),
    eq(quotations.companyId, actor.companyId),
  )).for("update");
  if (!root) transferError("CALM_TRANSFER_QUOTATION_NOT_FOUND", 404);
  const seriesScope = and(eq(quotations.companyId, actor.companyId), or(eq(quotations.id, rootId), eq(quotations.parentId, rootId)));
  const [latest] = await tx.select().from(quotations).where(seriesScope).orderBy(desc(quotations.revisionVersion)).limit(1).for("update");
  if (!latest || latest.id !== requested.id || !latest.isLatest) transferError("CALM_TRANSFER_QUOTATION_CHANGED");
  return { latest, rootId, seriesScope };
}

async function loadSourceProjection(tx: Transaction, actor: CalmTransferActor, input: CalmTransferRequest) {
  const [document] = await tx.select().from(documents).where(and(
    eq(documents.id, input.sourceDocumentId),
    eq(documents.companyId, actor.companyId),
  )).for("update");
  if (!document) transferError("CALM_TRANSFER_DOCUMENT_NOT_FOUND", 404);
  const [run] = await tx.select().from(documentProcessingRuns).where(and(
    eq(documentProcessingRuns.documentId, document.id),
    eq(documentProcessingRuns.companyId, actor.companyId),
    eq(documentProcessingRuns.status, "succeeded"),
    eq(documentProcessingRuns.currentStage, "completed"),
  )).orderBy(sql`${documentProcessingRuns.completedAt} desc nulls last`, desc(documentProcessingRuns.createdAt)).limit(1).for("share");
  if (!run) transferError("CALM_TRANSFER_RUN_NOT_SUCCEEDED");
  const rows = await tx.select().from(normalizedQuantityRows).where(and(
    eq(normalizedQuantityRows.companyId, actor.companyId),
    eq(normalizedQuantityRows.documentId, document.id),
    eq(normalizedQuantityRows.processingRunId, run.id),
  )).for("share");
  if (!rows.length || rows.length > 1000) transferError("CALM_TRANSFER_ROWS_INVALID", 400);
  if (rows.some((row) => row.reviewStatus !== "approved")) transferError("CALM_TRANSFER_ROW_NOT_APPROVED");
  if (rows.some((row) => !row.reviewedAt || !row.reviewerUserId)) transferError("CALM_TRANSFER_ROW_REVIEW_ATTRIBUTION_REQUIRED");
  const [artifact] = await tx.select().from(documentProcessingArtifacts).where(and(
    eq(documentProcessingArtifacts.companyId, actor.companyId),
    eq(documentProcessingArtifacts.documentId, document.id),
    eq(documentProcessingArtifacts.processingRunId, run.id),
    eq(documentProcessingArtifacts.artifactType, "ifc_evidence"),
  )).for("share");
  if (!artifact) transferError("CALM_TRANSFER_IFC_EVIDENCE_REQUIRED");
  try {
    const lines = projectApprovedRowsToCalmQuotationLines(rows, input.priceSnapshotIdsByCalmLineId, true);
    return { document, run, rows, artifact, lines };
  } catch (error) {
    transferError(error instanceof Error ? error.message : "CALM_TRANSFER_PROJECTION_INVALID", 409);
  }
}

async function loadPricingContext(
  tx: Transaction,
  actor: CalmTransferActor,
  lines: CalmTransferLine[],
  quotation: typeof quotations.$inferSelect,
  at: Date,
) {
  const snapshotIds = [...new Set(lines.map((line) => line.priceSnapshotId))];
  const snapshots = await tx.select().from(priceSnapshots).where(and(eq(priceSnapshots.companyId, actor.companyId), inArray(priceSnapshots.id, snapshotIds))).orderBy(asc(priceSnapshots.id)).for("share");
  if (snapshots.length !== snapshotIds.length) transferError("CALM_TRANSFER_PRICE_SNAPSHOT_INVALID");
  const sourceIds = [...new Set(snapshots.map((snapshot) => snapshot.priceSourceId))];
  const sources = await tx.select().from(priceSources).where(and(eq(priceSources.companyId, actor.companyId), inArray(priceSources.id, sourceIds))).orderBy(asc(priceSources.id)).for("share");
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  if (sources.length !== sourceIds.length || snapshots.some((snapshot) => !snapshotIsEligible(snapshot, sourceById.get(snapshot.priceSourceId), at))) {
    transferError("CALM_TRANSFER_PRICE_SNAPSHOT_INVALID");
  }
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  for (const line of lines) validateLineSnapshot(line, snapshotById.get(line.priceSnapshotId)!, quotation.currency);
  return { snapshots, sourceById, snapshotById };
}

function validateLineSnapshot(line: CalmTransferLine, snapshot: typeof priceSnapshots.$inferSelect, quotationCurrency: string) {
  try { snapshotAmountForCalculation(snapshot.amount); } catch (error) {
    transferError(error instanceof Error ? error.message : "CALM_TRANSFER_PRICE_SCALE_UNSUPPORTED");
  }
  if (snapshot.vatStatus !== "excluded") transferError("CALM_TRANSFER_VAT_INVALID");
  try { snapshotVatPercent(snapshot.vatPercent); } catch { transferError("CALM_TRANSFER_VAT_INVALID"); }
  const match = priceSnapshotMatchesQuotationItem({
    description: line.description,
    unit: line.unit,
    unitPrice: snapshot.amount,
    sourceReference: line.positionCode,
  }, snapshot, quotationCurrency);
  if ("reason" in match) transferError(`CALM_TRANSFER_${match.reason}`);
}

async function loadQuotationBaseline(tx: Transaction, actor: CalmTransferActor, quotationId: string, rootId: string) {
  const items = await tx.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, actor.companyId))).for("share");
  const evidence = await tx.select().from(quotationItemEvidence).where(and(eq(quotationItemEvidence.quotationId, quotationId), eq(quotationItemEvidence.companyId, actor.companyId))).for("share");
  const claims = evidence.flatMap((record) => {
    if (record.evidenceType !== "quantity" || record.status !== "current") return [];
    const captured = record.capturedValueJson as { transferLedgerId?: unknown; sourceTransferItemId?: unknown; sourceRuleVersion?: unknown; sourceRows?: unknown };
    if (typeof captured.transferLedgerId !== "string" || typeof captured.sourceTransferItemId !== "string" || typeof captured.sourceRuleVersion !== "string" || !Array.isArray(captured.sourceRows)) return [];
    const rowIds = captured.sourceRows.flatMap((row) => row && typeof row === "object" && typeof (row as { rowId?: unknown }).rowId === "string" ? [(row as { rowId: string }).rowId] : []);
    return rowIds.length === captured.sourceRows.length && rowIds.length > 0
      ? [{ quotationItemId: record.quotationItemId, ledgerId: captured.transferLedgerId, sourceTransferItemId: captured.sourceTransferItemId, sourceRuleVersion: captured.sourceRuleVersion, sourceDocumentId: record.sourceDocumentId, sourceProcessingRunId: record.sourceProcessingRunId, rowIds }]
      : [];
  });
  const ledgerIds = [...new Set(claims.map((claim) => claim.ledgerId))];
  const junctions = ledgerIds.length ? await tx.select({
    transferLedgerId: quotationTransferSourceRows.transferLedgerId,
    sourceQuantityRowId: quotationTransferSourceRows.sourceQuantityRowId,
    targetQuotationItemId: quotationTransferSourceRows.targetQuotationItemId,
    sourceDocumentId: quotationTransferSourceRows.sourceDocumentId,
    sourceProcessingRunId: quotationTransferSourceRows.sourceProcessingRunId,
    sourceRuleVersion: quotationTransferSourceRows.sourceRuleVersion,
  }).from(quotationTransferSourceRows)
    .innerJoin(quotations, and(eq(quotationTransferSourceRows.targetQuotationId, quotations.id), eq(quotationTransferSourceRows.companyId, quotations.companyId)))
    .where(and(
      eq(quotationTransferSourceRows.companyId, actor.companyId),
      inArray(quotationTransferSourceRows.transferLedgerId, ledgerIds),
      or(eq(quotations.id, rootId), eq(quotations.parentId, rootId)),
    )).for("share") : [];
  const rowsByTransferItem = new Map<string, Map<string, typeof junctions[number]>>();
  for (const row of junctions) {
    const key = `${row.transferLedgerId}:${row.targetQuotationItemId}`;
    const entries = rowsByTransferItem.get(key) ?? new Map<string, typeof row>();
    entries.set(row.sourceQuantityRowId, row);
    rowsByTransferItem.set(key, entries);
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  const aggregateProvenanceItemIds = new Set(claims.filter((claim) => {
    const item = itemById.get(claim.quotationItemId);
    const provenRows = rowsByTransferItem.get(`${claim.ledgerId}:${claim.sourceTransferItemId}`);
    return item?.sourceRuleVersion === claim.sourceRuleVersion
      && item.sourceDocumentId === claim.sourceDocumentId
      && item.sourceProcessingRunId === claim.sourceProcessingRunId
      && Boolean(provenRows)
      && provenRows!.size === claim.rowIds.length
      && claim.rowIds.every((rowId) => {
        const row = provenRows!.get(rowId);
        return row?.sourceDocumentId === claim.sourceDocumentId
          && row.sourceProcessingRunId === claim.sourceProcessingRunId
          && row.sourceRuleVersion === claim.sourceRuleVersion;
      });
  }).map((claim) => claim.quotationItemId));
  return { items, evidence, aggregateProvenanceItemIds };
}

async function assertNoPriorSourceTransfer(
  tx: Transaction,
  actor: CalmTransferActor,
  rootId: string,
  rowIds: string[],
) {
  const prior = await tx.select({ sourceQuantityRowId: quotationTransferSourceRows.sourceQuantityRowId })
    .from(quotationTransferSourceRows)
    .innerJoin(quotations, and(eq(quotationTransferSourceRows.targetQuotationId, quotations.id), eq(quotationTransferSourceRows.companyId, quotations.companyId)))
    .where(and(
      eq(quotationTransferSourceRows.companyId, actor.companyId),
      inArray(quotationTransferSourceRows.sourceQuantityRowId, rowIds),
      or(eq(quotations.id, rootId), eq(quotations.parentId, rootId)),
    )).limit(1);
  if (prior.length) transferError("CALM_TRANSFER_SOURCE_ROWS_ALREADY_TRANSFERRED");
}

function createScopeSnapshot(args: {
  requestPayloadHash: string;
  at: Date;
  quotation: typeof quotations.$inferSelect;
  items: Array<typeof quotationItems.$inferSelect>;
  evidence: Array<typeof quotationItemEvidence.$inferSelect>;
  source: Awaited<ReturnType<typeof loadSourceProjection>>;
  pricing: Awaited<ReturnType<typeof loadPricingContext>>;
}) {
  const { requestPayloadHash, at, quotation, items, evidence, source, pricing } = args;
  const quotationBaseline = buildQuotationBaselineSnapshot(quotation, items, evidence);
  const quotationBaselineHash = buildQuotationBaselineHash(quotationBaseline.quotation, quotationBaseline.items, quotationBaseline.evidence);
  const scopeSnapshot = {
    requestPayloadHash,
    evaluatedAt: at.toISOString(),
    quotationBaseline,
    quotationBaselineHash,
    document: { id: source.document.id, checksumSha256: source.document.checksumSha256 },
    run: { id: source.run.id, pipelineVersion: source.run.pipelineVersion, provider: source.run.provider, model: source.run.model, status: source.run.status, currentStage: source.run.currentStage },
    artifact: { id: source.artifact.id, checksumSha256: source.artifact.checksumSha256, schemaVersion: source.artifact.schemaVersion },
    rows: source.rows.map((row) => ({ id: row.id, reviewStatus: row.reviewStatus, reviewedAt: row.reviewedAt?.toISOString() ?? null, reviewerUserId: row.reviewerUserId, description: row.normalizedDescription, positionCode: row.normalizedPositionCode, unit: row.normalizedUnit, quantity: row.normalizedQuantity, wastePercent: row.normalizedWastePercent, formulaJson: row.formulaJson, quantitySource: row.quantitySource })).sort((a, b) => a.id.localeCompare(b.id)),
    lines: source.lines.map((line) => ({ lineId: line.lineId, description: line.description, positionCode: line.positionCode, unit: line.unit, quantity: line.quantity, sourceRows: line.sourceRows })),
    pricing: pricing.snapshots.map((snapshot) => {
      const priceSource = pricing.sourceById.get(snapshot.priceSourceId)!;
      return { snapshotId: snapshot.id, snapshotKey: snapshot.snapshotKey, snapshotHash: snapshot.sourceDocumentHash, amount: snapshot.amount, calculationAmount: snapshotAmountForCalculation(snapshot.amount).amount, vatPercent: snapshotVatPercent(snapshot.vatPercent), vatStatus: snapshot.vatStatus, positionCode: snapshot.positionCode, description: snapshot.description, unit: snapshot.unit, currency: snapshot.currency, validFrom: snapshot.validFrom?.toISOString() ?? null, validUntil: snapshot.validUntil?.toISOString() ?? null, reviewStatus: snapshot.reviewStatus, reviewedAt: snapshot.reviewedAt?.toISOString() ?? null, reviewedByUserId: snapshot.reviewedByUserId, sourceType: priceSource.sourceType, licenseStatus: priceSource.licenseStatus, legacyAuthorizationStatus: priceSource.authorizationStatus, sourceDocumentHash: priceSource.sourceDocumentHash, permissionReview: buildPricePermissionEvidence(priceSource) };
    }).sort((a, b) => a.snapshotId.localeCompare(b.snapshotId)),
    policy: { calmRuleVersion: CALM_ICMAL_RULE_VERSION, requireApprovedRows: true, requireAuthorizedFreshSnapshots: true, requiredSourceReview: "verified", requireExplicitQuotationPermission: true, blockedAuthorizationStatus: "restricted", blockedLicenseStatus: "restricted", requiredVatStatus: "excluded", requireExplicitVatPercent: true },
  };
  return { scopeSnapshot, quotationBaselineHash, requestHash: buildCalmTransferScopeHash(scopeSnapshot) };
}

async function createSuccessorRevision(
  tx: Transaction,
  actor: CalmTransferActor,
  locked: Awaited<ReturnType<typeof lockLatestQuotation>>,
  at: Date,
  overheadProfitPercent: string | undefined,
) {
  await tx.update(quotations).set({ isLatest: false, updatedAt: at }).where(locked.seriesScope);
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...quotationFields } = locked.latest;
  const [successor] = await tx.insert(quotations).values({
    ...quotationFields,
    parentId: locked.rootId,
    revisionVersion: locked.latest.revisionVersion + 1,
    isLatest: true,
    status: "draft",
    pricingSnapshotLockStatus: "unlocked",
    pricingSnapshotLockedAt: null,
    pricingSnapshotLockedByUserId: null,
    pricingSnapshotLockHash: null,
    overheadProfitPercent: overheadProfitPercent ?? locked.latest.overheadProfitPercent,
    updatedAt: at,
  }).returning();
  return successor;
}

function buildTransferredItems(args: {
  actor: CalmTransferActor;
  successorId: string;
  source: Awaited<ReturnType<typeof loadSourceProjection>>;
  pricing: Awaited<ReturnType<typeof loadPricingContext>>;
  requestHash: string;
}) {
  const { actor, successorId, source, pricing, requestHash } = args;
  return source.lines.map((line, index) => {
    const snapshot = pricing.snapshotById.get(line.priceSnapshotId)!;
    const vatPercent = snapshotVatPercent(snapshot.vatPercent);
    const { amount: unitPriceAmount, numeric: unitPrice } = snapshotAmountForCalculation(snapshot.amount);
    const quantityScaled = fixed4(line.quantity, "CALM_TRANSFER_QUANTITY_INVALID");
    const priceCents = BigInt(unitPriceAmount.replace(".", ""));
    const vatBasisPoints = BigInt(vatPercent.replace(".", ""));
    if (quantityScaled * priceCents * (10_000n + vatBasisPoints) > BigInt(Number.MAX_SAFE_INTEGER) * SCALE * 10_000n) transferError("CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED");
    const itemId = randomUUID();
    const record = {
      id: itemId, companyId: actor.companyId, quotationId: successorId,
      description: line.description, unit: line.unit, quantity: line.quantity,
      unitPrice: unitPriceAmount, costUnitPrice: unitPriceAmount, wastePercent: line.wastePercent,
      costCategory: "material", quantitySource: "document", priceSource: "snapshot",
      sourceReference: line.positionCode, verificationStatus: "verified",
      sourceDocumentId: source.document.id, sourceProcessingRunId: source.run.id,
      sourceQuantityRowId: null, sourceCellRange: null, sourceRuleVersion: line.sourceRuleVersion,
      transferIdempotencyKey: sha256Payload({ requestHash, index, positionCode: line.positionCode, priceSnapshotId: line.priceSnapshotId }),
      priceSnapshotId: snapshot.id, priceSnapshotStatus: "attached", discountPercent: "0", vatPercent,
      total: String(calculateLineItemTotal({ quantity: Number(line.quantity), unitPrice, discountPercent: 0, vatPercent: Number(vatPercent) })),
    } satisfies typeof quotationItems.$inferInsert;
    return { line, record, snapshot };
  });
}

function buildTransferLineage(args: {
  actor: CalmTransferActor;
  ledgerId: string;
  successorId: string;
  source: Awaited<ReturnType<typeof loadSourceProjection>>;
  newItems: ReturnType<typeof buildTransferredItems>;
  requestHash: string;
}) {
  const { actor, ledgerId, successorId, source, newItems, requestHash } = args;
  const junctions: Array<typeof quotationTransferSourceRows.$inferInsert> = newItems.flatMap(({ line, record }) => line.sourceRows.map((row) => ({
    companyId: actor.companyId, transferLedgerId: ledgerId,
    sourceDocumentId: row.documentId, sourceProcessingRunId: row.processingRunId,
    sourceQuantityRowId: row.rowId, targetQuotationId: successorId, targetQuotationItemId: record.id!,
    contributedQuantity: row.contributedQuantity, sourceCellRange: row.sourceCellRange, sourceRuleVersion: line.sourceRuleVersion,
  })));
  const evidence: Array<typeof quotationItemEvidence.$inferInsert> = newItems.flatMap(({ line, record, snapshot }) => [{
    companyId: actor.companyId, quotationId: successorId, quotationItemId: record.id!, evidenceType: "quantity",
    evidenceKey: sha256Payload({ requestHash, quotationItemId: record.id, type: "quantity" }),
    sourceDocumentId: source.document.id, sourceProcessingRunId: source.run.id, sourceDocumentHash: source.document.checksumSha256,
    capturedValueJson: { transferLedgerId: ledgerId, sourceTransferItemId: record.id, quantity: line.quantity, unit: line.unit, sourceRuleVersion: line.sourceRuleVersion, sourceRows: line.sourceRows },
    status: "current", createdByUserId: actor.userId,
  }, {
    companyId: actor.companyId, quotationId: successorId, quotationItemId: record.id!, evidenceType: "price",
    evidenceKey: sha256Payload({ requestHash, quotationItemId: record.id, type: "price", priceSnapshotId: snapshot.id }),
    priceSnapshotId: snapshot.id, sourceDocumentHash: snapshot.sourceDocumentHash,
    capturedValueJson: { amount: snapshotAmountForCalculation(snapshot.amount).amount, sourceAmount: snapshot.amount, currency: snapshot.currency, unit: snapshot.unit, snapshotKey: snapshot.snapshotKey },
    status: "current", createdByUserId: actor.userId,
  }]);
  return { junctions, evidence };
}

async function updateSuccessorTotals(
  tx: Transaction,
  actor: CalmTransferActor,
  successor: typeof quotations.$inferSelect,
  items: Array<typeof quotationItems.$inferInsert>,
  at: Date,
) {
  const successorId = successor.id;
  try { for (const item of items) assertQuotationItemCalculationSafe(item as Required<Pick<typeof quotationItems.$inferInsert, "quantity" | "unitPrice" | "discountPercent" | "vatPercent">>); }
  catch (error) { transferError(error instanceof Error ? error.message : "CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED"); }
  const totals = calculateQuotationTotals(items.map((item) => ({ quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discountPercent: Number(item.discountPercent), vatPercent: Number(item.vatPercent) })), { overheadProfitPercent: successor.overheadProfitPercent });
  if ([totals.subtotal, totals.discountTotal, totals.overheadProfitTotal, totals.vatTotal, totals.grandTotal].some((value) => !Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100)))) transferError("CALM_TRANSFER_TOTAL_RANGE_UNSUPPORTED");
  const [quotation] = await tx.update(quotations).set({
    subtotal: String(totals.subtotal), discountTotal: String(totals.discountTotal), overheadProfitTotal: String(totals.overheadProfitTotal), vatTotal: String(totals.vatTotal), grandTotal: String(totals.grandTotal), updatedAt: at,
  }).where(and(eq(quotations.id, successorId), eq(quotations.companyId, actor.companyId))).returning();
  return quotation;
}

async function persistTransfer(args: {
  tx: Transaction; actor: CalmTransferActor; idempotencyKey: string; requestPayloadHash: string; at: Date;
  locked: Awaited<ReturnType<typeof lockLatestQuotation>>;
  source: Awaited<ReturnType<typeof loadSourceProjection>>;
  pricing: Awaited<ReturnType<typeof loadPricingContext>>;
  baseline: Awaited<ReturnType<typeof loadQuotationBaseline>>;
  scope: ReturnType<typeof createScopeSnapshot>;
  overheadProfitPercent: string | undefined;
}) {
  const { tx, actor, idempotencyKey, requestPayloadHash, at, locked, source, pricing, baseline, scope, overheadProfitPercent } = args;
  const successor = await createSuccessorRevision(tx, actor, locked, at, overheadProfitPercent);
  const cloned = copyRevisionItems(baseline.items, baseline.evidence, successor.id, baseline.aggregateProvenanceItemIds);
  if (cloned.items.length) await tx.insert(quotationItems).values(cloned.items);
  if (cloned.evidence.length) await tx.insert(quotationItemEvidence).values(cloned.evidence);
  const newItems = buildTransferredItems({ actor, successorId: successor.id, source, pricing, requestHash: scope.requestHash });
  if (newItems.length) await tx.insert(quotationItems).values(newItems.map(({ record }) => record));
  const ledgerId = randomUUID();
  const lineage = buildTransferLineage({ actor, ledgerId, successorId: successor.id, source, newItems, requestHash: scope.requestHash });
  if (lineage.evidence.length) await tx.insert(quotationItemEvidence).values(lineage.evidence);
  const quotation = await updateSuccessorTotals(tx, actor, successor, [...cloned.items, ...newItems.map(({ record }) => record)], at);
  const [ledger] = await tx.insert(quotationTransferLedgers).values({
    id: ledgerId, companyId: actor.companyId, actorUserId: actor.userId,
    sourceDocumentId: source.document.id, sourceProcessingRunId: source.run.id, sourceArtifactId: source.artifact.id,
    sourceQuotationId: locked.latest.id, targetQuotationId: successor.id, idempotencyKey,
    requestPayloadHash, requestHash: scope.requestHash, scopeSnapshotJson: scope.scopeSnapshot,
    sourceRuleVersion: CALM_ICMAL_RULE_VERSION,
    resultSummaryJson: {
      sourceRowCount: new Set(source.lines.flatMap((line) => line.sourceRows.map((row) => row.rowId))).size,
      createdItemCount: newItems.length, sourceRevisionVersion: locked.latest.revisionVersion,
      targetRevisionVersion: successor.revisionVersion, quotationBaselineHash: scope.quotationBaselineHash,
    },
    createdAt: at,
  }).returning();
  if (lineage.junctions.length) await tx.insert(quotationTransferSourceRows).values(lineage.junctions);
  const [sealedLedger] = await tx.update(quotationTransferLedgers).set({ sealedAt: at }).where(and(eq(quotationTransferLedgers.id, ledger.id), eq(quotationTransferLedgers.companyId, actor.companyId))).returning();
  if (!sealedLedger) transferError("CALM_TRANSFER_LEDGER_SEAL_FAILED", 500);
  return { replayed: false as const, ledger: sealedLedger, quotation };
}

async function performCalmTransfer(
  tx: Transaction,
  actor: CalmTransferActor,
  idempotencyKey: string,
  input: CalmTransferRequest,
  requestPayloadHash: string,
  at: Date,
) {
  const replay = await authorizeActorAndFindReplay(tx, actor, idempotencyKey, requestPayloadHash);
  if (replay) return replay;
  return transferIntoLatestRevision(tx, actor, idempotencyKey, input, requestPayloadHash, at);
}

async function transferIntoLatestRevision(
  tx: Transaction,
  actor: CalmTransferActor,
  idempotencyKey: string,
  input: CalmTransferRequest,
  requestPayloadHash: string,
  at: Date,
) {
  const locked = await lockLatestQuotation(tx, actor, input.targetQuotationId);
  const source = await loadSourceProjection(tx, actor, input);
  const pricing = await loadPricingContext(tx, actor, source.lines, locked.latest, at);
  const baseline = await loadQuotationBaseline(tx, actor, locked.latest.id, locked.rootId);
  await assertNoPriorSourceTransfer(tx, actor, locked.rootId, source.rows.map((row) => row.id));
  const scope = createScopeSnapshot({ requestPayloadHash, at, quotation: locked.latest, items: baseline.items, evidence: baseline.evidence, source, pricing });
  return persistTransfer({ tx, actor, idempotencyKey, requestPayloadHash, at, locked, source, pricing, baseline, scope, overheadProfitPercent: input.overheadProfitPercent });
}

/** Creates one successor quotation revision and never mutates source items/evidence. */
export async function transferCalmRowsToQuotationRevision(
  actor: CalmTransferActor,
  idempotencyKey: string,
  input: CalmTransferRequest,
  at = new Date(),
) {
  const cleanIdempotencyKey = idempotencyKey.trim();
  if (!cleanIdempotencyKey || cleanIdempotencyKey.length > 160) transferError("CALM_TRANSFER_IDEMPOTENCY_KEY_INVALID", 400);
  const requestPayloadHash = buildCalmTransferRequestHash({
    companyId: actor.companyId,
    actorUserId: actor.userId,
    ...input,
  });
  return withAppTenantTransaction(actor, (tx) => performCalmTransfer(tx, actor, cleanIdempotencyKey, input, requestPayloadHash, at));
}

export type CalmTransferNewQuotation = {
  clientName: string;
  projectName?: string;
  currency?: "TRY" | "USD" | "EUR";
  /** Contractor profit and overhead percentage as a two-decimal string; "0" when absent. */
  overheadProfitPercent?: string;
};
export type CalmTransferNewQuotationRequest = {
  sourceDocumentId: string;
  newQuotation: CalmTransferNewQuotation;
  priceSnapshotIdsByCalmLineId: Readonly<Record<string, string>>;
};

const NEW_QUOTATION_EXPIRY_DAYS = 30;

export function buildCalmNewQuotationRequestHash(input: { companyId: string; actorUserId: string } & CalmTransferNewQuotationRequest): string {
  return sha256Payload({
    mode: "new_quotation",
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    sourceDocumentId: input.sourceDocumentId,
    newQuotation: { clientName: input.newQuotation.clientName.trim(), projectName: input.newQuotation.projectName?.trim() || null, currency: input.newQuotation.currency ?? "TRY", overheadProfitPercent: input.newQuotation.overheadProfitPercent ?? "0" },
    lines: Object.entries(input.priceSnapshotIdsByCalmLineId).sort(([a], [b]) => a.localeCompare(b)).map(([lineId, priceSnapshotId]) => ({ lineId, priceSnapshotId })),
  });
}

function calmQuoteNumber(at: Date): string {
  return `IFC-${at.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Opens an empty starting revision (Rev. 1) and transfers the Calm icmal into its successor (Rev. 2) in the
 * same transaction. The ledger stays revision-bound (source ≠ target, immediate successor), so a new quotation
 * gets exactly the provenance guarantees of "add revision to an existing quotation". Consumes one quotation quota;
 * any failure rolls back the client, both revisions and the quota.
 */
async function createStartingQuotation(tx: Transaction, actor: CalmTransferActor, request: CalmTransferNewQuotationRequest, at: Date) {
  const [document] = await tx.select({ originalFileName: documents.originalFileName }).from(documents).where(and(
    eq(documents.id, request.sourceDocumentId),
    eq(documents.companyId, actor.companyId),
  ));
  if (!document) transferError("CALM_TRANSFER_DOCUMENT_NOT_FOUND", 404);
  await consumeQuotationQuota(tx, actor.companyId, at);
  const [client] = await tx.insert(clients).values({
    companyId: actor.companyId,
    name: request.newQuotation.clientName.trim(),
    type: "company",
    notes: `IFC icmali aktarımı için oluşturuldu. Kaynak: ${document.originalFileName}`,
  }).returning();
  const [quotation] = await tx.insert(quotations).values({
    companyId: actor.companyId,
    clientId: client.id,
    quoteNumber: calmQuoteNumber(at),
    projectName: request.newQuotation.projectName?.trim() || `IFC icmali · ${document.originalFileName}`,
    date: at,
    expiryDate: new Date(at.getTime() + NEW_QUOTATION_EXPIRY_DAYS * 86_400_000),
    currency: request.newQuotation.currency ?? "TRY",
    overheadProfitPercent: request.newQuotation.overheadProfitPercent ?? "0",
    notes: "Boş başlangıç revizyonu; IFC icmali bir sonraki revizyona aktarıldı.",
    status: "draft",
    subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0",
    revisionVersion: 1,
    isLatest: true,
    createdAt: at,
    updatedAt: at,
  }).returning();
  return quotation;
}

/** "Yeni teklif oluştur": a new quotation series whose first priced revision is the Calm icmal. */
export async function transferCalmRowsToNewQuotation(
  actor: CalmTransferActor,
  idempotencyKey: string,
  request: CalmTransferNewQuotationRequest,
  at = new Date(),
) {
  const cleanIdempotencyKey = idempotencyKey.trim();
  if (!cleanIdempotencyKey || cleanIdempotencyKey.length > 160) transferError("CALM_TRANSFER_IDEMPOTENCY_KEY_INVALID", 400);
  if (!request.newQuotation.clientName.trim()) transferError("CALM_TRANSFER_CLIENT_NAME_REQUIRED", 400);
  const requestPayloadHash = buildCalmNewQuotationRequestHash({ companyId: actor.companyId, actorUserId: actor.userId, ...request });
  return withAppTenantTransaction(actor, async (tx) => {
    const replay = await authorizeActorAndFindReplay(tx, actor, cleanIdempotencyKey, requestPayloadHash);
    if (replay) return replay;
    const starting = await createStartingQuotation(tx, actor, request, at);
    return transferIntoLatestRevision(tx, actor, cleanIdempotencyKey, {
      sourceDocumentId: request.sourceDocumentId,
      targetQuotationId: starting.id,
      priceSnapshotIdsByCalmLineId: request.priceSnapshotIdsByCalmLineId,
      overheadProfitPercent: request.newQuotation.overheadProfitPercent,
    }, requestPayloadHash, at);
  });
}
