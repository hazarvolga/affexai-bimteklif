import { roundMoney } from "./calculations";

export function calculateTaxAdvisory(taxableAmount: number, vatPercent: number, withholdingPercent: number) {
  if (![taxableAmount, vatPercent, withholdingPercent].every(Number.isFinite) || taxableAmount < 0 || vatPercent < 0 || vatPercent > 100 || withholdingPercent < 0 || withholdingPercent > 100) throw new Error("INVALID_TAX_INPUT");
  const vatAmount = roundMoney(taxableAmount * vatPercent / 100);
  const withholdingAmount = roundMoney(vatAmount * withholdingPercent / 100);
  return { taxableAmount: roundMoney(taxableAmount), vatPercent, vatAmount, withholdingPercent, withholdingAmount, payableTotal: roundMoney(taxableAmount + vatAmount - withholdingAmount), authority: "advisory", regulationVersion: null };
}
