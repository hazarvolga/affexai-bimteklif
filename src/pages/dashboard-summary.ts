import { QuoteStatus, type Quote } from '../types';

const ACTIVE = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.NEGOTIATION];
export async function fetchAllQuotes(fetcher: typeof fetch): Promise<{ quotes: Quote[]; truncated: boolean }> {
  const result: Quote[] = [];
  const ids = new Set<string>();
  for (let offset = 0; offset < 1000; offset += 100) {
    const response = await fetcher(`/api/quotations?limit=100&offset=${offset}`);
    if (!response.ok) throw new Error('Teklifler yüklenemedi');
    const page: unknown = await response.json();
    if (!Array.isArray(page) || page.length > 100) throw new Error('Geçersiz teklif yanıtı');
    for (const quote of page) {
      if (!quote || typeof quote.id !== 'string' || ids.has(quote.id)) throw new Error('Tutarsız teklif sayfaları');
      ids.add(quote.id); result.push(quote);
    }
    if (page.length < 100) return { quotes: result, truncated: false };
  }
  return { quotes: result, truncated: true };
}
export function summarizeQuotes(quotes: Quote[], now = Date.now()) {
  const active = quotes.filter(q => ACTIVE.includes(q.status));
  const pendingDecisions = quotes.filter(q => q.status === QuoteStatus.SENT || q.status === QuoteStatus.NEGOTIATION);
  const expiringSoon = pendingDecisions.filter(q => { const expiry = new Date(q.expiryDate).getTime(); return expiry >= now && expiry - now <= 7 * 86400000; });
  const won = quotes.filter(q => q.status === QuoteStatus.WON).length;
  const lost = quotes.filter(q => q.status === QuoteStatus.LOST).length;
  const totals = new Map<string, number | null>();
  for (const quote of active) {
    const currency = quote.currency || 'Bilinmiyor';
    const amount = quote.grandTotal == null || String(quote.grandTotal).trim() === '' ? NaN : Number(quote.grandTotal);
    const previous = totals.get(currency) ?? (totals.has(currency) ? null : 0);
    totals.set(currency, previous === null || !Number.isFinite(amount) ? null : previous + amount);
  }
  return { active, pendingDecisions, expiringSoon, winRate: won + lost ? Math.round(won / (won + lost) * 100) : null, volumes: [...totals].map(([currency, total]) => ({currency, total})).sort((a,b) => a.currency.localeCompare(b.currency)) };
}
