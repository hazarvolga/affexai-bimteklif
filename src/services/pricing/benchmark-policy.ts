type Benchmark = {
 id: string; status: string; sourceStatus: string; reviewedAt: Date | null; reviewedByUserId: string | null;
 validityStart: Date | null; validityEnd: Date | null; crawledPrice: string;
 authorizationStatus: string; authorizationEvidenceHash: string | null; authorizedAt: Date | null;
};
export function benchmarkEligible(item: Benchmark, now = new Date()) {
 return item.status === 'approved' && item.sourceStatus === 'active' && Boolean(item.reviewedAt && item.reviewedByUserId)
  && item.authorizationStatus === 'authorized' && Boolean(item.authorizationEvidenceHash && item.authorizedAt)
  && item.validityStart instanceof Date && item.validityEnd instanceof Date
  && item.validityStart <= now && item.validityEnd >= now
  && Number.isFinite(Number(item.crawledPrice)) && Number(item.crawledPrice) >= 0;
}
export function benchmarkQuoteItem(item: { id: string; itemCode: string; itemName: string; unit: string; crawledPrice: string }) {
 const price = Number(item.crawledPrice);
 return { benchmarkStagingId: item.id, description: `${item.itemCode} - ${item.itemName}`, unit: item.unit,
  quantity: 1, unitPrice: price, costUnitPrice: null, wastePercent: 0, costCategory: 'material' as const,
  discountPercent: 0, vatPercent: 20, total: price * 1.2 };
}
