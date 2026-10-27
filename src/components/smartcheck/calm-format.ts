/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

/** Turkish number and currency formatting shared by the IFC icmal workspace and its panels. */
export function formatTrNumber(val: number, decimals = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(val) ? val : 0);
}

export function formatGross(val: number | null, decimals = 2): string {
  return val === null || !Number.isFinite(val) ? "—" : formatTrNumber(val, decimals);
}

export function formatTrCurrency(val: number): string {
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number.isFinite(val) ? val : 0)) + " ₺"
  );
}
