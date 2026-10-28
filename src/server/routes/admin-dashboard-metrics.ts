type PaymentEvent = { details: unknown };
/** The audit journal records operator approvals, not bank reconciliation. */
export function summarizeApprovedTransfers(events: readonly PaymentEvent[]) {
  if (events.length > 5000) return { amountTry: null, count: null, complete: false };
  const byRequest = new Map<string, number>();
  for (const event of events) {
    const value = event.details && typeof event.details === 'object' && !Array.isArray(event.details) ? event.details as Record<string, unknown> : {};
    if (typeof value.requestId !== 'string' || !value.requestId.trim() || typeof value.amountTry !== 'number' || !Number.isSafeInteger(value.amountTry) || value.amountTry < 0) return { amountTry: null, count: null, complete: false };
    const prior = byRequest.get(value.requestId);
    if (prior !== undefined && prior !== value.amountTry) return { amountTry: null, count: null, complete: false };
    byRequest.set(value.requestId, value.amountTry);
  }
  const sum = [...byRequest.values()].reduce((total, amount) => total + amount, 0);
  return Number.isSafeInteger(sum) ? { amountTry: sum, count: byRequest.size, complete: true } : { amountTry: null, count: null, complete: false };
}
