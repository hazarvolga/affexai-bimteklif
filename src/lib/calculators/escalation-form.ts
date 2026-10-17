/**
 * 4735 fiyat farkı hesaplayıcısı: form → motor eşlemesi (saf, test edilebilir).
 * B katsayısı, sabit katsayı, ağırlıklar ve endeks değerleri kullanıcı girdisidir; endeks verisi
 * çekilmez ve varsayılan yoktur.
 */
import {
  computeContractPriceEscalation4735,
  type ContractEscalation4735Result,
  type TuikSubIndexCode,
} from "../price-escalation";
import { parseTrNumber } from "../tr-number";

export interface EscalationRowState {
  indexCode: "" | TuikSubIndexCode;
  weight: string;
  baseIndex: string;
  currentIndex: string;
}

export interface EscalationFormState {
  progressPayment: string;
  bFactor: string;
  constantWeight: string;
  rows: EscalationRowState[];
}

export type EscalationFormOutcome =
  | { status: "incomplete"; missing: string[] }
  | { status: "error"; errors: string[] }
  | { status: "ok"; result: ContractEscalation4735Result };

export function evaluateEscalationForm(f: EscalationFormState): EscalationFormOutcome {
  const missing: string[] = [];
  const an = parseTrNumber(f.progressPayment);
  if (an === null || an < 0) missing.push("Hakediş tutarı (A_n)");
  const b = parseTrNumber(f.bFactor);
  if (b === null || b <= 0) missing.push("B katsayısı (sözleşmenizdeki değer)");
  const filledRows = f.rows.filter((r) => r.indexCode !== "" || r.weight.trim() || r.baseIndex.trim() || r.currentIndex.trim());
  if (filledRows.length === 0) missing.push("En az bir endeks bileşeni");
  if (missing.length > 0) return { status: "incomplete", missing };

  const errors: string[] = [];
  const components = filledRows.map((r, i) => {
    const w = parseTrNumber(r.weight);
    const e0 = parseTrNumber(r.baseIndex);
    const en = parseTrNumber(r.currentIndex);
    if (r.indexCode === "") errors.push(`Satır ${i + 1}: endeks seçin.`);
    if (w === null || w < 0 || w > 1) errors.push(`Satır ${i + 1}: ağırlık 0 ile 1 arasında bir sayı olmalı (ör. 0,30).`);
    if (e0 === null || e0 <= 0) errors.push(`Satır ${i + 1}: temel endeks (E_0) sıfırdan büyük olmalı.`);
    if (en === null || en <= 0) errors.push(`Satır ${i + 1}: güncel endeks (E_n) sıfırdan büyük olmalı.`);
    return { indexCode: r.indexCode as TuikSubIndexCode, weight: w ?? 0, baseIndex: e0 ?? 0, currentIndex: en ?? 0 };
  });
  const a = f.constantWeight.trim() === "" ? 0 : parseTrNumber(f.constantWeight);
  if (a === null || a < 0 || a > 1) errors.push("Sabit katsayı (a) 0 ile 1 arasında olmalı; yoksa boş bırakın.");
  if (errors.length > 0) return { status: "error", errors };

  try {
    return {
      status: "ok",
      result: computeContractPriceEscalation4735({
        progressPaymentAmountTl: an as number,
        bFactor: b as number,
        constantWeight: a as number,
        components,
      }),
    };
  } catch (e) {
    return { status: "error", errors: [e instanceof Error ? e.message : "Hesaplama yapılamadı."] };
  }
}
