/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import type { TourRole, TourStep } from "./tour-types";

/** Sayfa başlığı her sayfada aynı yerde değildir; ilk görünen başlık vurgulanır. */
export const PAGE_HEADING_SELECTORS = ["#main-content h1", "#main-content h2"] as const;

/** Kullanıcının rolünün göremediği sayfalara giden adımları çıkarır. */
export function stepsForRole(steps: readonly TourStep[], role: string | null | undefined): TourStep[] {
  return steps.filter((step) => !step.roles || (role !== null && role !== undefined && step.roles.includes(role as TourRole)));
}

/** Hedef seçici sırası: adımın kendi hedefi, sonra sayfa başlığı. */
export function targetSelectorsFor(step: TourStep): string[] {
  return step.targetSelector ? [step.targetSelector, ...PAGE_HEADING_SELECTORS] : [...PAGE_HEADING_SELECTORS];
}

/** Sorgu dizgesi ve sondaki "/" yok sayılarak sayfanın adımın rotasında olup olmadığını söyler. */
export function isOnStepRoute(pathname: string, step: TourStep): boolean {
  const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);
  return normalize(pathname.split("?")[0]) === normalize(step.route);
}

export function clampStepIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}
