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
const normalizePath = (path: string) => {
  const clean = path.split("?")[0];
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
};

export function isOnStepRoute(pathname: string, step: TourStep): boolean {
  return normalizePath(pathname) === normalizePath(step.route);
}

/**
 * Turun hangi adımdan açılacağı: önce bulunulan sayfanın ilk adımı, yoksa yolu bu sayfayı kapsayan
 * en uzun rotanın adımı (ör. /app/quotes/abc → Teklifler), o da yoksa ilk adım.
 */
export function startIndexForPath(pathname: string, steps: readonly TourStep[]): number {
  const path = normalizePath(pathname);
  const exact = steps.findIndex((step) => normalizePath(step.route) === path);
  if (exact >= 0) return exact;
  let best = 0;
  let bestLength = -1;
  steps.forEach((step, index) => {
    const route = normalizePath(step.route);
    if (path.startsWith(`${route}/`) && route.length > bestLength) {
      best = index;
      bestLength = route.length;
    }
  });
  return best;
}

export function clampStepIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}
