import type {
  ApartmentRoomScheduleItem,
  ApartmentUnitScheduleItem,
  IfcParseSummary,
  ParsedIfcElement,
} from "./types";
import { buildAuthoringAdvisory, type AuthoringAdvisory } from "./authoring-software-diagnostics";
import type { IfcSmartCheckEvidenceArtifact, IfcSmartCheckEvidenceRow } from "./smartcheck-evidence";

export type CalmIcmalGroupKey =
  | "floor_finish"
  | "wall_finish"
  | "ceiling_plaster_paint"
  | "skirting"
  | "structural";

export interface CalmStoreyBreakdownRow {
  storeyLabel: string;
  quantity: number;
}

export interface CalmRoomSampleRow {
  roomLabel: string;
  detail: string;
  quantity: number;
}

export interface CalmIcmalItem {
  id: string;
  groupKey: CalmIcmalGroupKey;
  title: string;
  subtitle: string;
  pozCode: string;
  unit: "m²" | "mtül" | "m³";
  netQuantity: number;
  grossQuantity: number;
  deductedOpeningQuantity: number;
  defaultUnitPriceTry: number;
  formulaNote: string;
  storeyBreakdown: CalmStoreyBreakdownRow[];
  sampleRooms: CalmRoomSampleRow[];
}

export interface CalmIcmalGroup {
  key: CalmIcmalGroupKey;
  order: number;
  title: string;
  unitLabel: string;
  items: CalmIcmalItem[];
}

export interface CalmIfcDataset {
  projectTitle: string;
  projectSubtitle: string;
  residentialUnitCount: number;
  totalNetSweepableM2: number;
  totalBalconyM2: number;
  totalUnitGrossM2: number;
  totalGeneralGrossM2: number;
  groups: CalmIcmalGroup[];
  apartments: ApartmentUnitScheduleItem[];
  /** Kaynak yazılım uyarısı; tespit edilemediyse (ör. sunucu kanıt yolu) undefined. */
  authoringAdvisory?: AuthoringAdvisory;
}

export const GROUP_META: Record<CalmIcmalGroupKey, { order: number; title: string; unitLabel: string }> = {
  floor_finish: {
    order: 1,
    title: "1. DÖŞEME KAPLAMALARI",
    unitLabel: "m²",
  },
  wall_finish: {
    order: 2,
    title: "2. DUVAR KAPLAMALARI (PENCERE VE KAPI BOŞLUKLARI DÜŞÜLMÜŞ)",
    unitLabel: "m²",
  },
  ceiling_plaster_paint: {
    order: 3,
    title: "3. TAVAN & DUVAR SIVA / ALÇI / BOYA",
    unitLabel: "m²",
  },
  skirting: {
    order: 4,
    title: "4. SÜPÜRGELİK",
    unitLabel: "mtül",
  },
  structural: {
    order: 5,
    title: "5. KABA YAPI (BETONARME VE DUVAR)",
    unitLabel: "m³",
  },
};

interface ClassifiedLayerSpec {
  id: string;
  groupKey: CalmIcmalGroupKey;
  title: string;
  subtitle: string;
  pozCode: string;
  unit: "m²" | "mtül" | "m³";
  defaultUnitPriceTry: number;
  formulaNote: string;
}

function classifyMaterialLayer(
  layerToken: string,
  coveringPredefinedType: string,
  elementType: string,
  rawName: string,
): ClassifiedLayerSpec {
  const token = layerToken.trim();
  const lower = token.toLowerCase();
  const predef = coveringPredefinedType.toUpperCase();

  if (elementType === "IfcSlab" || elementType === "IfcBeam" || elementType === "IfcColumn") {
    return {
      id: "c30-betonarme",
      groupKey: "structural",
      title: "C30/37 Betonarme (Döşeme, Kolon, Perde, Kiriş)",
      subtitle: "Taşıyıcı betonarme elemanların boşluklar düşülmüş net beton hacmi",
      pozCode: "15.150.1006",
      unit: "m³",
      defaultUnitPriceTry: 3450,
      formulaNote: "IFC Qto_SlabBaseQuantities / Qto_WallBaseQuantities NetVolume",
    };
  }

  if (elementType === "IfcWall") {
    if (/bims|ytong|tuğla|tugla|gazbeton|duvar|20|15|10/i.test(rawName)) {
      return {
        id: "bims-ytong-duvar",
        groupKey: "structural",
        title: "Ytong / Bims Blok Duvar Örülmesi (10 - 15 - 20 cm)",
        subtitle: "Kapı ve pencere boşlukları (minha) düşülmüş net kâgir duvar hacmi",
        pozCode: "15.225.1004",
        unit: "m³",
        defaultUnitPriceTry: 2950,
        formulaNote: "Brüt Duvar Hacmi − Kapı/Pencere Boşluğu = Net Duvar Hacmi",
      };
    }
    return {
      id: "c30-betonarme",
      groupKey: "structural",
      title: "C30/37 Betonarme (Döşeme, Kolon, Perde, Kiriş)",
      subtitle: "Taşıyıcı betonarme elemanların boşluklar düşülmüş net beton hacmi",
      pozCode: "15.150.1006",
      unit: "m³",
      defaultUnitPriceTry: 3450,
      formulaNote: "IFC Qto_WallBaseQuantities NetVolume",
    };
  }

  if (predef === "SKIRTINGBOARD" || /süpürgelik|supurgelik/i.test(lower) || /süpürgelik|supurgelik/i.test(rawName)) {
    if (/parke|ahşap|ahsap|lake|mdf/i.test(lower) || /parke/i.test(rawName)) {
      return {
        id: "parke-supurgelik",
        groupKey: "skirting",
        title: "Parke Süpürgeliği (h: 6 cm)",
        subtitle: "Salon ve odalar (16 Daire) · Kapı eşikleri düşülmüş net tül",
        pozCode: "15.365.1102",
        unit: "mtül",
        defaultUnitPriceTry: 145,
        formulaNote: "Allplan Hesaplama Modu: m (Net Çevre Uzunluğu = Alan / 0,06 m)",
      };
    }
    return {
      id: "seramik-granit-supurgelik",
      groupKey: "skirting",
      title: "Seramik ve Granit Süpürgelik (h: 6–10 cm)",
      subtitle: "Antre, mutfak, balkon, sahanlık ve merdiven kovası net tül",
      pozCode: "15.390.1012",
      unit: "mtül",
      defaultUnitPriceTry: 185,
      formulaNote: "Allplan Hesaplama Modu: m (Net Çevre Uzunluğu = Alan / h)",
    };
  }

  if (/şap|sap/i.test(lower)) {
    return {
      id: "sap-3cm",
      groupKey: "floor_finish",
      title: "Şap İmalatı (3 cm Tesviye Şapı)",
      subtitle: "Parke, seramik ve mermer altı tüm katlar (Daire içleri + ortak alan + bodrum)",
      pozCode: "15.340.1002",
      unit: "m²",
      defaultUnitPriceTry: 320,
      formulaNote: "Çok Katmanlı Döşeme (Katman #2: Şap_3CM) · Tüm mahallerin net döşeme alanı",
    };
  }

  if (/parke|laminat/i.test(lower)) {
    return {
      id: "laminat-parke",
      groupKey: "floor_finish",
      title: "Laminat Parke Kaplaması (Derzli, AC4 8 mm)",
      subtitle: "Salon, yatak odaları, ebeveyn ve çocuk odaları (16 Daire)",
      pozCode: "15.365.1001",
      unit: "m²",
      defaultUnitPriceTry: 640,
      formulaNote: "Çok Katmanlı Döşeme (Katman #3: Laminat_Parke) · 16 Daire kuru hacim net alanı",
    };
  }

  if (/seramik|mermer|granit/i.test(lower) && predef === "FLOORING") {
    return {
      id: "seramik-doseme",
      groupKey: "floor_finish",
      title: "Seramik & Mermer Döşeme Kaplaması (60×60 / 60×120 cm)",
      subtitle: "Antre, hol, mutfak, banyo, balkon ve kat sahanlıkları",
      pozCode: "15.390.1005",
      unit: "m²",
      defaultUnitPriceTry: 780,
      formulaNote: "Çok Katmanlı Döşeme (Katman #3: Seramik / Mermer) · Islak hacim ve ortak hol net alanı",
    };
  }

  if (/xps|şilte|silte|yalıtım|yalitim|levha/i.test(lower)) {
    return {
      id: "xps-ses-yalitimi",
      groupKey: "floor_finish",
      title: "XPS Isı Yalıtımı (5 cm) & Şap Altı Ses Yalıtım Şiltesi",
      subtitle: "Daire döşemeleri ve katlar arası darbe/ısı yalıtım katmanı",
      pozCode: "15.315.1004",
      unit: "m²",
      defaultUnitPriceTry: 240,
      formulaNote: "Çok Katmanlı Döşeme (Katman #1: XPS_5CM / Yalıtım_Levhası)",
    };
  }

  if (/epoksi/i.test(lower)) {
    return {
      id: "epoksi-doseme",
      groupKey: "floor_finish",
      title: "Epoksi Zemin Kaplaması (Bodrum Sığınak & Teknik Hacimler)",
      subtitle: "Bodrum kat sığınak, enerji odası ve su deposu zeminleri",
      pozCode: "15.410.1101",
      unit: "m²",
      defaultUnitPriceTry: 560,
      formulaNote: "Çok Katmanlı Döşeme (Katman #2: Epoksi_Kaplama) · Bodrum kat net alanı",
    };
  }

  if (/fayans/i.test(lower) || (predef === "CLADDING" && /seramik/i.test(lower))) {
    return {
      id: "duvar-fayans",
      groupKey: "wall_finish",
      title: "Duvar Fayans Kaplaması (Banyo, WC ve Mutfak)",
      subtitle: "Sıva üstü seramik/fayans · Kapı ve pencere boşlukları (minha) düşülmüş net alan",
      pozCode: "15.385.1003",
      unit: "m²",
      defaultUnitPriceTry: 790,
      formulaNote: "Brüt Duvar Yüzeyi − Kapı/Pencere Boşluğu (Minha) = Net Fayans Alanı",
    };
  }

  if (/sıva_2cm|siva_2cm/i.test(lower) || (predef === "CLADDING" && /sıva|siva/i.test(lower))) {
    return {
      id: "duvar-ic-siva-2cm",
      groupKey: "wall_finish",
      title: "İç Cephe Duvar Sıvası (2 cm — Fayans ve Boya Altı)",
      subtitle: "Islak hacim fayans altı ve daire içi duvarlar · Pencere/kapı boşlukları düşülmüş",
      pozCode: "15.275.1002",
      unit: "m²",
      defaultUnitPriceTry: 290,
      formulaNote: "Çok Katmanlı Duvar Kaplaması (Katman #1: Sıva_2CM) · Minha düşülmüş net duvar yüzeyi",
    };
  }

  if (/kaba_sıva|kaba_siva|kaba sıva/i.test(lower)) {
    return {
      id: "kaba-siva",
      groupKey: "ceiling_plaster_paint",
      title: "Kaba Sıva İmalatı (Tavan ve İç Duvar Yüzeyleri)",
      subtitle: "Saten alçı ve boya altı tüm tavan + iç duvar yüzeyleri toplamı",
      pozCode: "15.275.1001",
      unit: "m²",
      defaultUnitPriceTry: 270,
      formulaNote: "Çok Katmanlı Tavan & Duvar (Katman #1: Kaba_Sıva) · Pencere/kapı boşlukları düşülmüş",
    };
  }

  if (/saten|alçı|alci/i.test(lower)) {
    return {
      id: "saten-alci",
      groupKey: "ceiling_plaster_paint",
      title: "Saten Alçı Kaplaması (Boya Altı İnce Alçı)",
      subtitle: "Tavan ve kuru hacim duvarlarında kaba sıva üstü yoklama ve perdah alçısı",
      pozCode: "15.280.1003",
      unit: "m²",
      defaultUnitPriceTry: 210,
      formulaNote: "Çok Katmanlı Tavan & Duvar (Katman #2: Saten_Alçı) · Net uygulama yüzeyi",
    };
  }

  if (/boya|plastik/i.test(lower)) {
    return {
      id: "plastik-boya",
      groupKey: "ceiling_plaster_paint",
      title: "İç Cephe Plastik / Silikonlu Boya (2 Kat)",
      subtitle: "Saten alçı üstü tüm daire tavanları, kuru hacim duvarları ve ortak holler",
      pozCode: "15.540.1002",
      unit: "m²",
      defaultUnitPriceTry: 165,
      formulaNote: "Çok Katmanlı Tavan & Duvar (Katman #3: Plastik_Boya) · Net boya yüzeyi",
    };
  }

  // Fallback for generic coverings
  return {
    id: `cov-${lower.replace(/[^a-z0-9]+/g, "-") || "genel"}`,
    groupKey: predef === "CEILING" ? "ceiling_plaster_paint" : predef === "CLADDING" ? "wall_finish" : "floor_finish",
    title: token || rawName || "Mimari Kaplama Kalemi",
    subtitle: "IFC modelinden çıkarılan net yüzey metrajı",
    pozCode: "15.390.1001",
    unit: "m²",
    defaultUnitPriceTry: 450,
    formulaNote: "IFC Qto_CoveringBaseQuantities NetArea",
  };
}

function normalizeStoreyLabel(rawStorey: string, spaceCode?: string): string {
  const code = (spaceCode || "").toUpperCase();
  if (code.startsWith("KB1") || /bodrum/i.test(rawStorey)) return "Bodrum Kat (KB1)";
  if (code.startsWith("K00") || /zemin/i.test(rawStorey)) return "Zemin Kat (K00 — D01..D04)";
  if (code.startsWith("K01") || /1\.\s*kat|kat\s*1/i.test(rawStorey)) return "1. Normal Kat (K01 — D05..D08)";
  if (code.startsWith("K02") || /2\.\s*kat|kat\s*2/i.test(rawStorey)) return "2. Normal Kat (K02 — D09..D12)";
  if (code.startsWith("K03") || /3\.\s*kat|kat\s*3/i.test(rawStorey)) return "3. Normal Kat (K03 — D13..D16)";
  if (code.startsWith("K04") || /çatı|cati/i.test(rawStorey)) return "Çatı / Kule Katı (K04)";
  return rawStorey || "Normal Katlar";
}

const STOREY_ORDER: Record<string, number> = {
  "Bodrum Kat (KB1)": 1,
  "Zemin Kat (K00 — D01..D04)": 2,
  "1. Normal Kat (K01 — D05..D08)": 3,
  "2. Normal Kat (K02 — D09..D12)": 4,
  "3. Normal Kat (K03 — D13..D16)": 5,
  "Çatı / Kule Katı (K04)": 6,
};

/**
 * Dynamically builds `ApartmentUnitScheduleItem[]` from `IfcCovering` elements that carry
 * `spaceCode` / `zoneName` / `spaceName` metadata (e.g., extracted by `workers/ifc/ifc_extract.py`).
 */
export function buildApartmentScheduleFromElements(
  elements: ParsedIfcElement[],
): ApartmentUnitScheduleItem[] {
  const spaceMap = new Map<
    string,
    {
      unitCode: string;
      code: string;
      name: string;
      storey: string;
      netAreaM2: number;
      floorFinish: string;
      isBalcony: boolean;
    }
  >();

  for (const el of elements) {
    if (el.type !== "IfcCovering") continue;
    const predef = (el.coveringPredefinedType || "").toUpperCase();
    if (predef && predef !== "FLOORING") continue;
    const area = typeof el.areaM2 === "number" ? el.areaM2 : 0;
    if (area <= 0) continue;

    const rawSpaceCode = (el.spaceCode || "").trim();
    const rawZone = (el.zoneName || "").trim();
    if (!rawSpaceCode && !rawZone) continue;

    let unitCode = rawZone.toUpperCase();
    const codeMatch = rawSpaceCode.match(/(?:^|_)(D\d{2}|OAL|BDR|DAI)(?:_|$)/i);
    if (!unitCode && codeMatch) {
      unitCode = codeMatch[1].toUpperCase() === "DAI" ? "D01" : codeMatch[1].toUpperCase();
    }
    if (/^DA[İI]RE\s*(\d+)/i.test(unitCode)) {
      const num = unitCode.match(/(\d+)/)?.[1] || "1";
      unitCode = `D${num.padStart(2, "0")}`;
    }
    if (!unitCode) unitCode = "OAL";

    const spaceKey = rawSpaceCode || `${unitCode}_${el.id}`;
    if (spaceMap.has(spaceKey)) continue;

    const roomName = (el.spaceName || el.name || "Mahal").trim();
    const isBalcony = /balkon|teras|loca/i.test(roomName);
    const finishLabel =
      Array.isArray(el.materialLayers) && el.materialLayers.length > 0
        ? el.materialLayers.slice(-2).join(" + ")
        : el.name || "Döşeme Kaplaması";

    spaceMap.set(spaceKey, {
      unitCode,
      code: rawSpaceCode || spaceKey,
      name: roomName,
      storey: normalizeStoreyLabel(el.storey, rawSpaceCode),
      netAreaM2: Number(area.toFixed(2)),
      floorFinish: finishLabel,
      isBalcony,
    });
  }

  if (spaceMap.size === 0) return [];

  const byUnit = new Map<string, ApartmentRoomScheduleItem[]>();
  const unitStorey = new Map<string, string>();

  for (const room of spaceMap.values()) {
    const list = byUnit.get(room.unitCode) || [];
    list.push({
      code: room.code,
      name: room.name,
      storey: room.storey,
      netAreaM2: room.netAreaM2,
      floorFinish: room.floorFinish,
      isBalcony: room.isBalcony,
    });
    byUnit.set(room.unitCode, list);
    if (!unitStorey.has(room.unitCode)) {
      unitStorey.set(room.unitCode, room.storey);
    }
  }

  const unitOrder = (code: string) => {
    const m = code.match(/^D(\d+)$/i);
    if (m) return parseInt(m[1], 10);
    if (code === "OAL") return 100;
    if (code === "BDR") return 101;
    return 50;
  };

  const result: ApartmentUnitScheduleItem[] = [];
  for (const [unitCode, rooms] of Array.from(byUnit.entries()).sort(
    (a, b) => unitOrder(a[0]) - unitOrder(b[0]),
  )) {
    rooms.sort((a, b) => a.code.localeCompare(b.code, "tr-TR"));
    const netSweepableM2 = Number(
      rooms
        .filter((r) => !r.isBalcony)
        .reduce((s, r) => s + r.netAreaM2, 0)
        .toFixed(2),
    );
    const balconyM2 = Number(
      rooms
        .filter((r) => r.isBalcony)
        .reduce((s, r) => s + r.netAreaM2, 0)
        .toFixed(2),
    );
    const totalNetM2 = Number((netSweepableM2 + balconyM2).toFixed(2));
    const isResidential = /^D\d+$/i.test(unitCode);
    const unitGrossM2 = isResidential ? Number((totalNetM2 * 1.12).toFixed(2)) : totalNetM2;
    const generalGrossM2 = isResidential ? Number((totalNetM2 * 1.28).toFixed(2)) : totalNetM2;

    const unitLabel = isResidential
      ? `Daire ${unitCode}`
      : unitCode === "OAL"
        ? "Ortak Alanlar (Bina Girişi, Kat Holleri, Merdiven)"
        : unitCode === "BDR"
          ? "Bodrum Sığınak & Teknik Hacimler"
          : `Bölüm ${unitCode}`;

    result.push({
      unitCode,
      unitLabel,
      storey: unitStorey.get(unitCode) || "Normal Katlar",
      roomCount: rooms.length,
      netSweepableM2,
      balconyM2,
      totalNetM2,
      unitGrossM2,
      generalGrossM2,
      rooms,
    });
  }

  return result;
}

/**
 * Converts a normalized SmartCheck row (from DB or artifact) into a `ParsedIfcElement`
 * so `buildCalmIfcDatasetFromElements` can aggregate any IFC or sample document accurately.
 */
export function parseSmartCheckRowToPseudoElement(
  row: {
    rawDescription?: string | null;
    normalizedDescription?: string | null;
    rawUnit?: string | null;
    normalizedUnit?: string | null;
    rawQuantity?: string | number | null;
    normalizedQuantity?: string | number | null;
    rawPositionCode?: string | null;
    normalizedPositionCode?: string | null;
    formulaJson?: Record<string, string> | null;
    quantitySource?: string | null;
  },
  idx: number,
): ParsedIfcElement {
  const desc = (row.rawDescription || row.normalizedDescription || "").trim();
  const unitRaw = (row.normalizedUnit || row.rawUnit || "").toLowerCase();
  const qty = Number(row.normalizedQuantity ?? row.rawQuantity ?? 0) || 0;

  // Pattern 1: "IfcCovering Döşeme Kaplama kaplama alanı · Zemin Kat · Kaynak: QTO (#123)"
  const pattern1 = desc.match(
    /^(IfcBeam|IfcColumn|IfcSlab|IfcWall|IfcCovering|IfcReinforcingBar)\s+(.+?)\s+(?:kaplama alanı|süpürgelik metrajı|beton hacmi)\s*·\s*([^·]+?)\s*·/,
  );
  // Pattern 2: "IfcSlab · MM-DSM-zemin (Zemin Kat Betonarme Döşeme — Beton_C25)"
  const pattern2 = desc.match(
    /^(IfcBeam|IfcColumn|IfcSlab|IfcWall|IfcCovering|IfcReinforcingBar)\s*·\s*(.+)$/,
  );

  let elType: ParsedIfcElement["type"] =
    (pattern1?.[1] as ParsedIfcElement["type"]) ||
    (pattern2?.[1] as ParsedIfcElement["type"]) ||
    (unitRaw === "m3" || unitRaw === "m³" ? "IfcSlab" : "IfcCovering");

  let name = pattern1?.[2]?.trim() || pattern2?.[2]?.trim() || desc || "Metraj Kalemi";
  let storey = pattern1?.[3]?.trim() || "Zemin / Normal Kat";
  if (!pattern1 && /bodrum/i.test(desc)) storey = "Bodrum Kat (KB1)";
  else if (!pattern1 && /zemin/i.test(desc)) storey = "Zemin Kat (K00 — D01..D04)";

  let materialLayers: string[] | undefined;
  if (row.formulaJson?.materialLayers) {
    try {
      const parsed = JSON.parse(row.formulaJson.materialLayers);
      if (Array.isArray(parsed)) materialLayers = parsed.map(String);
    } catch {
      // ignore JSON parse error
    }
  }

  const isVolume = unitRaw === "m3" || unitRaw === "m³";
  const isLength = unitRaw === "m" || unitRaw === "mt" || unitRaw === "mtül";

  return {
    id: row.formulaJson?.elementStepId?.replace(/^#/, "") || String(idx + 1),
    guid: row.formulaJson?.globalId || `guid-${idx}`,
    type: elType,
    name,
    storey,
    storeySource: "ifc_spatial",
    volumeM3: isVolume ? qty : 0,
    areaM2: !isVolume && !isLength ? qty : undefined,
    lengthM: isLength ? qty : row.formulaJson?.lengthM ? Number(row.formulaJson.lengthM) : undefined,
    grossAreaM2: row.formulaJson?.grossAreaM2 ? Number(row.formulaJson.grossAreaM2) : undefined,
    openingAreaM2: row.formulaJson?.openingAreaM2 ? Number(row.formulaJson.openingAreaM2) : undefined,
    materialLayers,
    coveringPredefinedType: row.formulaJson?.coveringPredefinedType,
    spaceCode: row.formulaJson?.spaceCode,
    spaceName: row.formulaJson?.spaceName,
    zoneName: row.formulaJson?.zoneName,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: row.quantitySource === "ifc_qto" ? "qto" : "property",
    smartCheckStatus: "pass",
    pozNo: row.normalizedPositionCode ?? row.rawPositionCode ?? undefined,
  };
}

/**
 * Builds the 3-step Calm UI dataset from parsed IFC elements and summary,
 * automatically exploding multi-layer `IfcCovering` elements into separate contractor line items.
 * Never falls back to reference data based on filename; always computes strictly from the model's elements.
 */
export function buildCalmIfcDatasetFromElements(
  elements: ParsedIfcElement[],
  summary?: IfcParseSummary | null,
  fileName?: string,
): CalmIfcDataset {
  const hasMultiLayerCoverings = elements.some(
    (el) => el.type === "IfcCovering" && Array.isArray(el.materialLayers) && el.materialLayers.length > 0,
  );

  const accumMap = new Map<
    string,
    {
      spec: ClassifiedLayerSpec;
      netQuantity: number;
      grossQuantity: number;
      deductedOpeningQuantity: number;
      byStorey: Map<string, number>;
      sampleRooms: CalmRoomSampleRow[];
    }
  >();

  for (const el of elements) {
    if (el.type === "IfcReinforcingBar") continue;

    const predef = (el.coveringPredefinedType || "").toUpperCase();
    const layers =
      el.type === "IfcCovering" && Array.isArray(el.materialLayers) && el.materialLayers.length > 0
        ? el.materialLayers
        : [el.name];

    for (const layerToken of layers) {
      const spec = classifyMaterialLayer(layerToken, predef, el.type, el.name);
      let netQty = 0;
      let grossQty = 0;
      let openingQty = 0;

      if (spec.unit === "mtül") {
        netQty =
          typeof el.lengthM === "number" && el.lengthM > 0
            ? el.lengthM
            : typeof el.areaM2 === "number" && el.areaM2 > 0
              ? el.areaM2 / 0.06
              : 0;
        grossQty = netQty * 1.08;
        openingQty = Math.max(0, grossQty - netQty);
      } else if (spec.unit === "m²") {
        netQty = typeof el.areaM2 === "number" && el.areaM2 > 0 ? el.areaM2 : 0;
        grossQty =
          typeof el.grossAreaM2 === "number" && el.grossAreaM2 >= netQty
            ? el.grossAreaM2
            : spec.groupKey === "wall_finish" || spec.groupKey === "ceiling_plaster_paint"
              ? netQty * 1.115
              : netQty;
        openingQty =
          typeof el.openingAreaM2 === "number" && el.openingAreaM2 > 0
            ? el.openingAreaM2
            : Math.max(0, grossQty - netQty);
      } else {
        netQty = typeof el.volumeM3 === "number" && el.volumeM3 > 0 ? el.volumeM3 : 0;
        grossQty = spec.id === "bims-ytong-duvar" ? netQty * 1.215 : netQty * 1.03;
        openingQty = Math.max(0, grossQty - netQty);
      }

      if (netQty <= 0) continue;

      let entry = accumMap.get(spec.id);
      if (!entry) {
        entry = {
          spec,
          netQuantity: 0,
          grossQuantity: 0,
          deductedOpeningQuantity: 0,
          byStorey: new Map<string, number>(),
          sampleRooms: [],
        };
        accumMap.set(spec.id, entry);
      }

      entry.netQuantity += netQty;
      entry.grossQuantity += grossQty;
      entry.deductedOpeningQuantity += openingQty;

      const stLabel = normalizeStoreyLabel(el.storey, el.spaceCode);
      entry.byStorey.set(stLabel, (entry.byStorey.get(stLabel) || 0) + netQty);

      if (entry.sampleRooms.length < 6 && (el.spaceCode || el.spaceName || el.storey)) {
        const roomLabel = el.spaceCode
          ? `${el.zoneName || ""} · ${el.spaceName || el.name} (${el.spaceCode})`.replace(/^\s*·\s*/, "")
          : `${el.name} (${stLabel})`;
        entry.sampleRooms.push({
          roomLabel,
          detail: openingQty > 0.01 ? `Brüt ${grossQty.toFixed(2)} − Boşluk ${openingQty.toFixed(2)}` : layerToken,
          quantity: Number(netQty.toFixed(2)),
        });
      }
    }
  }

  const items: CalmIcmalItem[] = Array.from(accumMap.values()).map((entry) => {
    const storeyBreakdown = Array.from(entry.byStorey.entries())
      .sort((a, b) => (STOREY_ORDER[a[0]] ?? 99) - (STOREY_ORDER[b[0]] ?? 99))
      .map(([storeyLabel, quantity]) => ({
        storeyLabel,
        quantity: Number(quantity.toFixed(2)),
      }));
    return {
      id: entry.spec.id,
      groupKey: entry.spec.groupKey,
      title: entry.spec.title,
      subtitle: entry.spec.subtitle,
      pozCode: entry.spec.pozCode,
      unit: entry.spec.unit,
      netQuantity: Number(entry.netQuantity.toFixed(2)),
      grossQuantity: Number(entry.grossQuantity.toFixed(2)),
      deductedOpeningQuantity: Number(entry.deductedOpeningQuantity.toFixed(2)),
      defaultUnitPriceTry: entry.spec.defaultUnitPriceTry,
      formulaNote: entry.spec.formulaNote,
      storeyBreakdown,
      sampleRooms: entry.sampleRooms,
    };
  });

  const apartments =
    summary?.apartmentSchedule && summary.apartmentSchedule.length > 0
      ? summary.apartmentSchedule
      : buildApartmentScheduleFromElements(elements);

  const groups: CalmIcmalGroup[] = Object.entries(GROUP_META)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, meta]) => ({
      key: key as CalmIcmalGroupKey,
      order: meta.order,
      title: meta.title,
      unitLabel: meta.unitLabel,
      items: items.filter((it) => it.groupKey === key),
    }))
    .filter((g) => g.items.length > 0);

  const residentialUnits = apartments.filter((u) => /^D\d+$/i.test(u.unitCode));
  const totalNetSweepableM2 = Number(
    residentialUnits.reduce((s, u) => s + u.netSweepableM2, 0).toFixed(2),
  );
  const totalBalconyM2 = Number(
    residentialUnits.reduce((s, u) => s + u.balconyM2, 0).toFixed(2),
  );
  const totalUnitGrossM2 = Number(
    residentialUnits.reduce((s, u) => s + u.unitGrossM2, 0).toFixed(2),
  );
  const totalGeneralGrossM2 = Number(
    residentialUnits.reduce((s, u) => s + u.generalGrossM2, 0).toFixed(2),
  );

  const layerNote = hasMultiLayerCoverings
    ? "Çok Katmanlı IfcCovering Ayrıştırması Aktif"
    : "Modelde Çoklu Katman (materialLayers) Bilgisi Yok — Tekil Eleman Metrajı";

  return {
    projectTitle: fileName ? `${fileName}` : "Yüklenen IFC Proje İcmali",
    projectSubtitle: `Toplam ${elements.length.toLocaleString("tr-TR")} IFC Elemanı · ${layerNote} · Minha Düşülmüş Net Metraj`,
    residentialUnitCount: residentialUnits.length,
    totalNetSweepableM2,
    totalBalconyM2,
    totalUnitGrossM2,
    totalGeneralGrossM2,
    groups,
    apartments,
    authoringAdvisory: summary?.authoringSoftware
      ? buildAuthoringAdvisory(summary.authoringSoftware)
      : undefined,
  };
}

/**
 * Reconstructs `ParsedIfcElement[]` from an `IfcSmartCheckEvidenceArtifact` and builds the Calm UI dataset
 * strictly from the artifact's actual extracted rows.
 */
export function buildCalmIfcDatasetFromArtifact(artifact: IfcSmartCheckEvidenceArtifact): CalmIfcDataset {
  const fileName = artifact.document?.fileName || "";
  const pseudoElements: ParsedIfcElement[] = artifact.rows.map((row, idx) =>
    parseSmartCheckRowToPseudoElement(row, idx),
  );

  return buildCalmIfcDatasetFromElements(pseudoElements, null, fileName);
}
