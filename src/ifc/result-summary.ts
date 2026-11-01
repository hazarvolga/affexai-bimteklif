import type { OpeningsAvailability } from "./calculation-trace";

/**
 * Result-screen summary (marka.md M-20.2, M-20.3, M-13.8): each check reports its own state, so a full
 * poz match never reads as a priced, reviewed, ready offer.
 */

export type ResultTone = "ok" | "attention" | "pending" | "unknown";
export type ResultLineKey = "source" | "quantity" | "poz" | "price" | "openings" | "review";
export type NextStepAction = "check_file" | "add_prices" | "create_offer" | "transfer_to_offer";

export interface ResultLine {
  key: ResultLineKey;
  tone: ResultTone;
  text: string;
}

export interface ResultSummaryInput {
  totalElementCount: number | null;
  measuredElementCount: number | null;
  /** Elements that reached the icmal rows with explicit quantity evidence; null when the source is not a server evidence set. */
  evidenceElementCount?: number | null;
  pozMatchedElementCount: number | null;
  icmalItemCount: number;
  pricedItemCount: number;
  openings: OpeningsAvailability;
  hasQuotation: boolean;
}

export interface ResultSummary {
  lines: ResultLine[];
  nextStep: { action: NextStepAction; text: string };
  /** All lines priced; quantities still need human review before the offer is sent. */
  readyForOffer: boolean;
}

const NEXT_STEP_TEXT: Record<NextStepAction, string> = {
  check_file: "Dosyadan icmal kalemi oluşmadı. Dosyayı ve sınıflandırmayı kontrol edin.",
  add_prices: "Fiyatı eksik kalemler için firma fiyat kataloğuna fiyat ekleyin veya mevcut fiyatı eşleştirin.",
  create_offer: "Tüm kalemler fiyatlandı. Bu icmalden yeni bir teklif oluşturun.",
  transfer_to_offer: "Tüm kalemler fiyatlandı. İcmali mevcut teklifinize yeni revizyon olarak aktarın.",
};

function unmatchedElementsText(elementCount: number): string {
  return `${elementCount} eleman okundu, ancak malzemeleri hiçbir icmal kalemiyle eşleşmedi. Kapsama kartındaki açıkta kalan elemanlardan nedenlerini görün.`;
}

function quantityLine(input: ResultSummaryInput): ResultLine {
  const { totalElementCount: total, measuredElementCount: measured, evidenceElementCount: evidence } = input;
  const withoutEvidence = typeof total === "number" && typeof evidence === "number" ? total - evidence : 0;
  if (typeof total === "number" && typeof measured === "number" && measured === total && withoutEvidence > 0) {
    return {
      key: "quantity",
      tone: "attention",
      text: `Miktarı kanıtlı eleman: ${evidence}/${total}; kanıtsız: ${withoutEvidence} (yalnız geometriden hesaplananlar ve kapsam dışı sınıflar icmale girmez).`,
    };
  }
  return countLine(
    "quantity",
    total,
    measured,
    count => `${count} elemanın tamamının miktarı okundu.`,
    (count, part) => `Miktarı okunan eleman: ${part}/${count}; ölçülemeyen: ${count - part}.`,
  );
}

function countLine(
  key: "quantity" | "poz",
  total: number | null,
  part: number | null,
  okText: (total: number, part: number) => string,
  missText: (total: number, part: number) => string,
): ResultLine {
  if (total === null || part === null) {
    return { key, tone: "unknown", text: key === "quantity" ? "Eleman sayıları bu kayıtta belirlenemedi." : "Poz eşleşmesi bu kayıtta belirlenemedi." };
  }
  return part === total ? { key, tone: "ok", text: okText(total, part) } : { key, tone: "attention", text: missText(total, part) };
}

export function buildResultSummary(input: ResultSummaryInput): ResultSummary {
  const missingPrices = Math.max(0, input.icmalItemCount - input.pricedItemCount);
  const lines: ResultLine[] = [
    input.icmalItemCount > 0
      ? { key: "source", tone: "ok", text: `Dosya okundu; ${input.icmalItemCount} icmal kalemi oluştu.` }
      : { key: "source", tone: "attention", text: "Dosya okundu ancak icmal kalemi oluşmadı." },
    quantityLine(input),
    countLine(
      "poz",
      input.totalElementCount,
      input.pozMatchedElementCount,
      total => `${total} elemanın tamamı poza eşleşti (poz eşleşmesi fiyat veya onay anlamına gelmez).`,
      (total, part) => `Poza eşleşen eleman: ${part}/${total}; eşleşmeyen: ${total - part}.`,
    ),
    missingPrices === 0 && input.icmalItemCount > 0
      ? { key: "price", tone: "ok", text: `Tüm kalemler fiyatlandı (${input.pricedItemCount}/${input.icmalItemCount}).` }
      : { key: "price", tone: "attention", text: `${missingPrices} kalem fiyat bekliyor (${input.pricedItemCount}/${input.icmalItemCount} fiyatlandı).` },
    input.openings === "present"
      ? { key: "openings", tone: "ok", text: "Kapı/pencere boşlukları modelden okundu; düşüm özeti ayrı gösterilir, kalemlere otomatik uygulanmaz." }
      : input.openings === "none_in_model"
        ? { key: "openings", tone: "ok", text: "Modelde kapı/pencere yok; boşluk düşümü gerekmedi." }
        : { key: "openings", tone: "attention", text: "Modelde kapı/pencere bilgisi bulunamadı; boşluk düşümü (minha) değerlendirilemedi." },
    { key: "review", tone: "pending", text: "Uzman incelemesi bekliyor; bu sonuç bağımsız mühendis onayı değildir." },
  ];
  const action: NextStepAction = input.icmalItemCount === 0
    ? "check_file"
    : missingPrices > 0
      ? "add_prices"
      : input.hasQuotation ? "transfer_to_offer" : "create_offer";
  return {
    lines,
    nextStep: { action, text: action === "check_file" && input.totalElementCount ? unmatchedElementsText(input.totalElementCount) : NEXT_STEP_TEXT[action] },
    readyForOffer: input.icmalItemCount > 0 && missingPrices === 0,
  };
}
