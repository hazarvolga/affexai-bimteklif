/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

/** Rol kısıtı olmayan adım herkese gösterilir. */
export type TourRole = "owner" | "admin" | "manager" | "viewer" | "super_admin";

export interface TourStep {
  /** Adımın açılacağı sayfa (tam yol, örn. "/app/quotes"). */
  route: string;
  /** Vurgulanacak öğe; bulunamazsa sayfa başlığı, o da yoksa ortada kart gösterilir. */
  targetSelector?: string;
  /** Kartta gösterilen sayfa adı (menüdeki adla aynı). */
  pageLabel: string;
  badge: string;
  title: string;
  description: string;
  tip?: string;
  preferredPlacement?: "top" | "bottom" | "center";
  /** Bu rollerden biri yoksa adım turdan çıkarılır. */
  roles?: readonly TourRole[];
}
