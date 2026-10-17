/**
 * KİK aşırı düşük teklif hesaplayıcısı: form → motor eşlemesi (saf, test edilebilir).
 * Hiçbir alan için varsayılan yoktur; eksik zorunlu girdi varsa hesap yapılmaz.
 */
import { evaluateKikAbnormallyLowBid, type KikAdtResult, type KikLineItemInput, type KikWorkCategory } from "../kik-adt";
import { parseTrNumber, parseTrNumberList } from "../tr-number";

export interface KikFormState {
  ym: string;
  category: "" | KikWorkCategory;
  bids: string;
  ourBid: string;
  items: string;
  /** İdare ilanda farklı bir N belirlediyse (1,00–1,20); boşsa iş grubunun N değeri. */
  nOverride?: string;
}

export type KikFormOutcome =
  | { status: "incomplete"; missing: string[] }
  | { status: "error"; errors: string[] }
  | { status: "ok"; result: KikAdtResult; hasOurBid: boolean; warnings: string[] };

export function parseKikLineItems(raw: string): { items: KikLineItemInput[]; invalid: string[] } {
  const items: KikLineItemInput[] = [];
  const invalid: string[] = [];
  raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const idx = line.lastIndexOf(";");
      const amount = idx >= 0 ? parseTrNumber(line.slice(idx + 1)) : null;
      const desc = idx >= 0 ? line.slice(0, idx).trim() : "";
      if (amount === null || amount <= 0 || desc === "") invalid.push(line);
      else items.push({ id: `L${i + 1}`, description: desc, totalAmount: amount });
    });
  return { items, invalid };
}

export function evaluateKikForm(f: KikFormState): KikFormOutcome {
  const missing: string[] = [];
  const ym = parseTrNumber(f.ym);
  if (ym === null || ym <= 0) missing.push("Yaklaşık maliyet (YM)");
  if (f.category === "") missing.push("İş grubu (üstyapı / diğer yapım)");
  const bids = parseTrNumberList(f.bids);
  if (bids.values.length === 0) missing.push("En az bir geçerli teklif");
  if (missing.length > 0) return { status: "incomplete", missing };

  const errors: string[] = [];
  if (bids.invalid.length > 0) errors.push(`Okunamayan teklif değeri: ${bids.invalid.join(", ")}`);
  if (bids.values.some((v) => v <= 0)) errors.push("Teklifler sıfırdan büyük olmalı.");
  const items = parseKikLineItems(f.items);
  if (items.invalid.length > 0) errors.push(`Okunamayan iş kalemi satırı (biçim: açıklama;tutar): ${items.invalid.join(" | ")}`);
  const ourBid = f.ourBid.trim() === "" ? null : parseTrNumber(f.ourBid);
  if (f.ourBid.trim() !== "" && (ourBid === null || ourBid <= 0)) errors.push("Sizin teklifiniz sıfırdan büyük bir sayı olmalı.");
  const nOverride = (f.nOverride ?? "").trim() === "" ? null : parseTrNumber(f.nOverride as string);
  if ((f.nOverride ?? "").trim() !== "" && (nOverride === null || nOverride < 1 || nOverride > 1.2)) {
    errors.push("N katsayısı 1,00 ile 1,20 arasında olmalı (idarenin ilanda belirttiği değer).");
  }
  if (errors.length > 0) return { status: "error", errors };

  const result = evaluateKikAbnormallyLowBid({
    estimatedCostTry: ym as number,
    validBidsTry: bids.values,
    ourBidTry: ourBid ?? (ym as number),
    workCategory: f.category as KikWorkCategory,
    ...(nOverride !== null ? { nCoefficientOverride: nOverride } : {}),
    lineItems: items.items,
  });
  const warnings: string[] = [];
  if (result.admittedBidsTry.length === 0) {
    warnings.push("Hiçbir teklif YM'nin %40–%120 aralığında değil; Tebliğ m.45.1.1.4 uyarınca sınır değer %40 YM alınır.");
  }
  return { status: "ok", result, hasOurBid: ourBid !== null, warnings };
}
