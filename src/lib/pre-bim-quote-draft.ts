/**
 * Ön teklif fizibilitesi → teklif taslağı köprüsü.
 *
 * Kullanıcının fizibilite panelinde girdiği değerlerden (toplam inşaat alanı, birim maliyet, isteğe bağlı
 * maliyet yüzde dağılımı) teklif kalemleri üretir. Hiçbir fiyat, oran veya miktar uydurulmaz:
 * - Birim maliyet girilmediyse kalemler 0 ₺ birim fiyatla, "fiyat girilmeli" notuyla aktarılır.
 * - Maliyet dağılımı yalnızca kullanıcı girdiyse (toplam %100) kalemlere bölünür.
 * Taslak, teknik inceleme ve onay bekleyen bir ön hesaptır; kesin metraj veya teklif değildir.
 */
import type { QuoteItem } from "@/types";
import type { FeasibilityInput, FeasibilityResult } from "./pre-bim-feasibility";

export const PRE_BIM_DRAFT_STORAGE_KEY = "teklifpro_prebim_draft";

export interface PreBimQuoteDraft {
  projectName: string;
  notes: string;
  items: Partial<QuoteItem>[];
}

const SOURCE_REFERENCE =
  "Ön teklif fizibilitesi — kullanıcı girdisi; imar durumu belgesi ve proje mimarının değerleri esastır";

const fmt = (v: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

function baseItem(id: string, description: string, quantity: number, unitPrice: number): Partial<QuoteItem> {
  return {
    id,
    description,
    unit: "m2",
    quantity,
    unitPrice,
    quantitySource: "manual",
    priceSource: "manual",
    sourceReference: SOURCE_REFERENCE,
    verificationStatus: "unverified",
    discountPercent: 0,
    vatPercent: 20,
    total: 0,
  };
}

export function buildPreBimQuoteDraft(
  input: FeasibilityInput,
  result: FeasibilityResult,
  idFactory: () => string = () => crypto.randomUUID(),
): PreBimQuoteDraft | null {
  const area = result.totalConstructionM2;
  if (area === null || area <= 0) return null;

  const unitCost = typeof input.unitCostTryPerM2 === "number" && input.unitCostTryPerM2 > 0 ? input.unitCostTryPerM2 : null;
  const items: Partial<QuoteItem>[] = [];

  if (unitCost !== null && result.costBreakdown) {
    for (const line of result.costBreakdown) {
      items.push(
        baseItem(idFactory(), `${line.label} (toplam inşaat alanı × birim maliyetin %${fmt(line.percent)}'i)`, area, Math.round(unitCost * (line.percent / 100) * 100) / 100),
      );
    }
  } else {
    items.push(baseItem(idFactory(), "Toplam inşaat alanı (emsal + emsal harici)", area, unitCost ?? 0));
  }

  const notes: string[] = [
    "Ön teklif fizibilitesinden aktarıldı. Bu bir ön hesaptır; imar durumu belgesi, plan notları ve proje mimarının değerleri esastır. KDV oranını ve birim fiyatları kontrol edin.",
  ];
  if (unitCost === null) notes.push("Birim maliyet girilmediği için kalemlerin birim fiyatı 0 ₺'dir; fiyatları girin.");
  notes.push(`Toplam inşaat alanı: ${fmt(area)} m².`);
  if (result.landownerGrossM2 !== null) {
    notes.push(
      `Arsa sahibi payı: ${fmt(result.landownerGrossM2)} m² brüt${result.landownerNetM2 !== null ? ` / ${fmt(result.landownerNetM2)} m² net` : ""}` +
        `${result.perUnitGrossM2 !== null ? ` (daire başı ortalama ${fmt(result.perUnitGrossM2)} m² brüt${result.perUnitNetM2 !== null ? ` / ${fmt(result.perUnitNetM2)} m² net` : ""})` : ""}.`,
    );
  }
  if (result.promise.status === "exceeds_capacity" && result.promise.excessTotalM2 !== null) {
    notes.push(
      `Dikkat: vaat edilen alan paylaşım kapasitesini ${fmt(result.promise.excessTotalM2)} m² aşıyor; fark için maliyet dökümü ve açıklama isteyin.`,
    );
  }

  return { projectName: "Ön Teklif (Kat Karşılığı Fizibilite)", notes: notes.join("\n"), items };
}

/** sessionStorage'dan gelen taslağı doğrular; geçersizse null döner. */
export function parsePreBimQuoteDraft(raw: string | null): PreBimQuoteDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<PreBimQuoteDraft>;
    if (!d || typeof d !== "object" || !Array.isArray(d.items) || d.items.length === 0) return null;
    const items = d.items.filter(
      (i) =>
        i &&
        typeof i.description === "string" &&
        typeof i.quantity === "number" &&
        Number.isFinite(i.quantity) &&
        i.quantity > 0 &&
        typeof i.unitPrice === "number" &&
        Number.isFinite(i.unitPrice) &&
        i.unitPrice >= 0,
    );
    if (items.length === 0) return null;
    return {
      projectName: typeof d.projectName === "string" ? d.projectName : "Ön Teklif (Kat Karşılığı Fizibilite)",
      notes: typeof d.notes === "string" ? d.notes : "",
      items,
    };
  } catch {
    return null;
  }
}
