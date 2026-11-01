import type { ApartmentUnitScheduleItem, ParsedOpening } from "./types";

export interface ClassInventoryItem {
  ifcClass: string;
  count: number;
}

export type InventoryStatus = "in_icmal" | "listed" | "not_counted";

export interface InventoryRow {
  ifcClass: string;
  label: string;
  total: number;
  counted: number;
  status: InventoryStatus;
  note: string;
}

const LABELS: Record<string, string> = {
  IfcWall: "Duvar", IfcSlab: "Döşeme", IfcBeam: "Kiriş", IfcColumn: "Kolon", IfcCovering: "Kaplama",
  IfcSpace: "Oda (mahal)", IfcDoor: "Kapı", IfcWindow: "Pencere", IfcStair: "Merdiven", IfcStairFlight: "Merdiven kolu",
  IfcRamp: "Rampa", IfcRailing: "Korkuluk", IfcCurtainWall: "Giydirme cephe", IfcRoof: "Çatı", IfcMember: "Profil/çubuk",
  IfcPlate: "Levha", IfcFooting: "Temel", IfcPile: "Kazık", IfcBuildingElementProxy: "Sınıfsız eleman (proxy)",
  IfcOpeningElement: "Boşluk elemanı",
};
const TAKEN_OFF = new Set(["IfcWall", "IfcSlab", "IfcBeam", "IfcColumn", "IfcCovering"]);

export interface ModelInventoryInput {
  inventory: readonly ClassInventoryItem[] | undefined;
  /** Elements that reached the icmal rows with explicit quantity evidence. */
  elements: readonly { type: string }[] | undefined;
  apartments: readonly Pick<ApartmentUnitScheduleItem, "roomCount">[] | undefined;
  openings: readonly Pick<ParsedOpening, "kind">[] | undefined;
}

function row(item: ClassInventoryItem, counted: number, status: InventoryStatus, note: string): InventoryRow {
  return { ifcClass: item.ifcClass, label: LABELS[item.ifcClass] ?? item.ifcClass, total: item.count, counted, status, note };
}

/** What the file holds, class by class, and what the product did with it. */
export function buildModelInventory(input: ModelInventoryInput): InventoryRow[] {
  if (!input.inventory?.length) return [];
  const evidenceByClass = new Map<string, number>();
  for (const element of input.elements ?? []) evidenceByClass.set(element.type, (evidenceByClass.get(element.type) ?? 0) + 1);
  const rooms = (input.apartments ?? []).reduce((sum, unit) => sum + unit.roomCount, 0);
  const openingCount = (kind: "door" | "window") => (input.openings ?? []).filter(opening => opening.kind === kind).length;

  return input.inventory.map(item => {
    if (TAKEN_OFF.has(item.ifcClass)) {
      const counted = evidenceByClass.get(item.ifcClass) ?? 0;
      if (counted === 0) return row(item, 0, "not_counted", "Kanıtlı miktar yok (yalnız geometriden hesaplanabiliyor); icmale girmedi.");
      const rest = item.count - counted;
      return row(item, counted, "in_icmal", rest > 0 ? `${rest} eleman kanıtsız (yalnız geometri); icmale girmedi.` : "Tümünün miktarı modelde yazılı.");
    }
    if (item.ifcClass === "IfcSpace") {
      if (rooms === 0) return row(item, 0, "not_counted", "Oda ve daire cetveli oluşmadı.");
      const unassigned = item.count - rooms;
      return row(item, rooms, "listed", unassigned > 0 ? `Daire/oda cetvelinde ${rooms} oda; ${unassigned} oda bir bölüme atanmamış.` : `Daire/oda cetvelinde ${rooms} oda.`);
    }
    if (item.ifcClass === "IfcDoor" || item.ifcClass === "IfcWindow") {
      const counted = openingCount(item.ifcClass === "IfcDoor" ? "door" : "window");
      return row(item, counted, "listed", `${counted} adet kapı/pencere listesinde (boşluk düşümü özeti).`);
    }
    return row(item, 0, "not_counted", "Metraja girmiyor.");
  });
}
