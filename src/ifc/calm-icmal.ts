import type {
  ApartmentRoomScheduleItem,
  ApartmentUnitScheduleItem,
  IfcConsistencyReport,
  IfcParseSummary,
  ParsedIfcElement,
  ParsedOpening,
  UncoveredQuantity,
} from "./types";
import { buildAuthoringAdvisory, classifyAuthoringSoftware, type AuthoringAdvisory } from "./authoring-software-diagnostics";
import type { IfcSmartCheckEvidenceArtifact, IfcSmartCheckEvidenceRow } from "./smartcheck-evidence";
import { elementQuantity } from "./uncovered-quantity";
import { classifyStructuralMaterial, isStructuralType, type SupportedConcreteClass } from "./structural-material";
import { hasDirectIfcRebarMassEvidence } from "./rebar-evidence";
import { isIfcGeometryQuantity } from "./evidence-policy";

/** Bump only when the persisted Calm grouping/quantity projection semantics change. */
export const CALM_ICMAL_RULE_VERSION = "calm-icmal.v1" as const;

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

/** Bir icmal kalemine giren tek bir elemanın (veya kaplama katmanının) metraj cetveli satırı. */
export interface CalmQuantityContribution {
  globalId: string;
  name: string;
  ifcClass: string;
  storeyLabel: string;
  roomLabel: string | null;
  /** Çok katmanlı kaplamada miktarın geldiği katman; diğer elemanlarda null. */
  layer: string | null;
  netQuantity: number;
  /** Modelde brüt/boşluk verisi yoksa null; hiçbir değer çarpanla üretilmez. */
  grossQuantity: number | null;
  openingQuantity: number | null;
  quantitySource: ParsedIfcElement["quantitySource"];
  quantitySourcePath?: string;
}

export interface CalmIcmalItem {
  id: string;
  groupKey: CalmIcmalGroupKey;
  title: string;
  subtitle: string;
  pozCode: string;
  unit: "m²" | "mtül" | "m³" | "kg";
  netQuantity: number;
  grossQuantity: number;
  deductedOpeningQuantity: number;
  /**
   * Brüt ve boşluk değerleri modelden mi geliyor? false ise modelde brüt/boşluk verisi yoktur;
   * grossQuantity = netQuantity ve deductedOpeningQuantity = 0 gösterilir, hiçbir değer uydurulmaz.
   */
  grossAvailable: boolean;
  /** Fiyat kaynağı çözülmediyse sıfırdır; sınıflandırıcı ticari fiyat üretmez. */
  defaultUnitPriceTry: 0;
  formulaNote: string;
  storeyBreakdown: CalmStoreyBreakdownRow[];
  sampleRooms: CalmRoomSampleRow[];
  /** Present for datasets projected from persisted SmartCheck rows; calibrated/demo datasets intentionally have none. */
  sourceQuantityRowIds?: string[];
  /** Kalemi oluşturan elemanlar (metraj cetveli); kalibre/demo veri setlerinde yoktur. */
  contributions?: CalmQuantityContribution[];
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
  totalUnitGrossM2: number | null;
  totalGeneralGrossM2: number | null;
  groups: CalmIcmalGroup[];
  apartments: ApartmentUnitScheduleItem[];
  /** Kaynak yazılım uyarısı; tespit edilemediyse (ör. sunucu kanıt yolu) undefined. */
  authoringAdvisory?: AuthoringAdvisory;
  /** Modeldeki kapı/pencere listesi; sözleşmesel minha için. Yoksa undefined. */
  openings?: ParsedOpening[];
  /** Dosyadaki yapı sınıflarının sayıları; eski kayıtlarda yok. */
  classInventory?: Array<{ ifcClass: string; count: number }>;
  /** IFC Tutarlılık ve Metraj Kapsama Raporu (Rev. 36). */
  consistencyReport?: IfcConsistencyReport;
  /** Ham eleman listesi (kapsama kartı filtrelemesi için). */
  elements?: ParsedIfcElement[];
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
  unit: "m²" | "mtül" | "m³" | "kg";
  formulaNote: string;
}

const CONCRETE_SPECS: Readonly<Record<SupportedConcreteClass, ClassifiedLayerSpec>> = Object.freeze({
  "C25/30": concreteSpec("c25-30-betonarme", "C25/30", "15.150.1005"),
  "C30/37": concreteSpec("c30-37-betonarme", "C30/37", "15.150.1006"),
  "C35/45": concreteSpec("c35-45-betonarme", "C35/45", "15.150.1007"),
});

function concreteSpec(id: string, concreteClass: SupportedConcreteClass, pozCode: string): ClassifiedLayerSpec {
  return Object.freeze({
    id,
    groupKey: "structural",
    title: `${concreteClass} Betonarme (Döşeme, Kolon, Perde, Kiriş)`,
    subtitle: "Doğrulanmış beton sınıfına sahip taşıyıcı elemanların net beton hacmi",
    pozCode,
    unit: "m³",
    formulaNote: "IFC Qto_SlabBaseQuantities / Qto_WallBaseQuantities NetVolume",
  });
}

const CLASS_NOUNS: Record<string, string> = { IfcSlab: "döşeme", IfcColumn: "kolon", IfcBeam: "kiriş", IfcWall: "perde/duvar" };

/** "2 döşeme, 1 kolon": what actually fed a structural line, so its generic title does not imply more. */
function includedClassesNote(contributions: readonly CalmQuantityContribution[]): string {
  const counts = new Map<string, number>();
  for (const contribution of contributions) counts.set(contribution.ifcClass, (counts.get(contribution.ifcClass) ?? 0) + 1);
  return [...counts].map(([ifcClass, count]) => `${count} ${CLASS_NOUNS[ifcClass] ?? ifcClass}`).join(", ");
}

const MASONRY_SPEC: ClassifiedLayerSpec = {
  id: "bims-ytong-duvar",
  groupKey: "structural",
  title: "Ytong / Bims Blok Duvar Örülmesi (10 - 15 - 20 cm)",
  subtitle: "Malzemesi gazbeton/bims olan duvarlarda kapı ve pencere boşlukları (minha) düşülmüş net hacim",
  pozCode: "UNRESOLVED:gazbeton-bims",
  unit: "m³",
  formulaNote: "Brüt Duvar Hacmi − Kapı/Pencere Boşluğu = Net Duvar Hacmi",
};

function classifyMaterialLayer(
  layerToken: string,
  coveringPredefinedType: string,
  elementType: string,
  rawName: string,
  explicitPozNo?: string,
): ClassifiedLayerSpec | null {
  const token = layerToken.trim();
  const lower = token.toLowerCase();
  const predef = coveringPredefinedType.toUpperCase();
  const cleanExplicitPoz = explicitPozNo?.trim() || "";

  if (predef === "SKIRTINGBOARD" || /süpürgelik|supurgelik/i.test(lower) || /süpürgelik|supurgelik/i.test(rawName)) {
    if (/parke|ahşap|ahsap|lake|mdf/i.test(lower) || /parke/i.test(rawName)) {
      return {
        id: "parke-supurgelik",
        groupKey: "skirting",
        title: "Parke Süpürgeliği (h: 6 cm)",
        subtitle: "Salon ve odalar (16 Daire) · Kapı eşikleri düşülmüş net tül",
        pozCode: "UNRESOLVED:parke-supurgelik",
        unit: "mtül",
        formulaNote: "IFC doğrudan Net Çevre / Uzunluk kanıtı (varsayılan yükseklikle alan dönüşümü yapılmaz)",
      };
    }
    return {
      id: "seramik-granit-supurgelik",
      groupKey: "skirting",
      title: "Seramik ve Granit Süpürgelik (h: 6–10 cm)",
      subtitle: "Antre, mutfak, balkon, sahanlık ve merdiven kovası net tül",
      pozCode: "UNRESOLVED:seramik-granit-supurgelik",
      unit: "mtül",
      formulaNote: "IFC doğrudan Net Çevre / Uzunluk kanıtı (yükseklik bilinmiyorsa alan dönüşümü yapılmaz)",
    };
  }

  if (/şap|sap/i.test(lower)) {
    return {
      id: "sap-3cm",
      groupKey: "floor_finish",
      title: "Şap İmalatı (3 cm Tesviye Şapı)",
      subtitle: "Parke, seramik ve mermer altı tüm katlar (Daire içleri + ortak alan + bodrum)",
      pozCode: "15.250.1111",
      unit: "m²",
      formulaNote: "Çok Katmanlı Döşeme (Katman #2: Şap_3CM) · Tüm mahallerin net döşeme alanı · Poz 2,5 cm içindir; 3 cm katman için kalınlık farkı incelenmeli",
    };
  }

  if (/parke|laminat/i.test(lower)) {
    return {
      id: "laminat-parke",
      groupKey: "floor_finish",
      title: "Laminat Parke Kaplaması (Derzli, AC4 8 mm)",
      subtitle: "Salon, yatak odaları, ebeveyn ve çocuk odaları (16 Daire)",
      pozCode: "UNRESOLVED:laminat-parke",
      unit: "m²",
      formulaNote: "Çok Katmanlı Döşeme (Katman #3: Laminat_Parke) · 16 Daire kuru hacim net alanı",
    };
  }

  if (/seramik|mermer|granit/i.test(lower) && predef === "FLOORING") {
    return {
      id: "seramik-doseme",
      groupKey: "floor_finish",
      title: "Seramik & Mermer Döşeme Kaplaması (60×60 cm poz; farklı ebat ayrı poz ister)",
      subtitle: "Antre, hol, mutfak, banyo, balkon ve kat sahanlıkları",
      pozCode: "15.390.1008",
      unit: "m²",
      formulaNote: "Çok Katmanlı Döşeme (Katman #3: Seramik / Mermer) · Islak hacim ve ortak hol net alanı",
    };
  }

  if (/xps|(?:darbe|ses)[ _-]*(?:yalıtım|yalitim)?[ _-]*(?:şilte|silte)|(?:şap|sap)[ _-]*altı[ _-]*(?:şilte|silte)/i.test(lower)) {
    return {
      id: "xps-ses-yalitimi",
      groupKey: "floor_finish",
      title: "XPS Isı Yalıtımı (5 cm) & Şap Altı Ses Yalıtım Şiltesi",
      subtitle: "Daire döşemeleri ve katlar arası darbe/ısı yalıtım katmanı",
      pozCode: "UNRESOLVED:xps-ses-yalitimi",
      unit: "m²",
      formulaNote: "Çok Katmanlı Döşeme (Katman #1: XPS_5CM / Yalıtım_Levhası)",
    };
  }

  if (/epoksi/i.test(lower)) {
    return {
      id: "epoksi-doseme",
      groupKey: "floor_finish",
      title: "Epoksi Zemin Kaplaması (Bodrum Sığınak & Teknik Hacimler)",
      subtitle: "Bodrum kat sığınak, enerji odası ve su deposu zeminleri",
      pozCode: "15.190.1014",
      unit: "m²",
      formulaNote: "Çok Katmanlı Döşeme (Katman #2: Epoksi_Kaplama) · Bodrum kat net alanı",
    };
  }

  if (/fayans/i.test(lower) || (predef === "CLADDING" && /seramik/i.test(lower))) {
    return {
      id: "duvar-fayans",
      groupKey: "wall_finish",
      title: "Duvar Fayans Kaplaması (Banyo, WC ve Mutfak)",
      subtitle: "Sıva üstü seramik/fayans · Kapı ve pencere boşlukları (minha) düşülmüş net alan",
      pozCode: "15.380.1006",
      unit: "m²",
      formulaNote: "Brüt Duvar Yüzeyi − Kapı/Pencere Boşluğu (Minha) = Net Fayans Alanı",
    };
  }

  if (/sıva_2cm|siva_2cm/i.test(lower) || (predef === "CLADDING" && /sıva|siva/i.test(lower))) {
    return {
      id: "duvar-ic-siva-2cm",
      groupKey: "wall_finish",
      title: "İç Cephe Duvar Sıvası (2 cm — Fayans ve Boya Altı)",
      subtitle: "Islak hacim fayans altı ve daire içi duvarlar · Pencere/kapı boşlukları düşülmüş",
      pozCode: "15.275.1112",
      unit: "m²",
      formulaNote: "Çok Katmanlı Duvar Kaplaması (Katman #1: Sıva_2CM) · Minha düşülmüş net duvar yüzeyi",
    };
  }

  if (/kaba_sıva|kaba_siva|kaba sıva/i.test(lower)) {
    return {
      id: "kaba-siva",
      groupKey: "ceiling_plaster_paint",
      title: "Kaba Sıva İmalatı (Tavan ve İç Duvar Yüzeyleri)",
      subtitle: "Saten alçı ve boya altı tüm tavan + iç duvar yüzeyleri toplamı",
      pozCode: "15.275.1117",
      unit: "m²",
      formulaNote: "Çok Katmanlı Tavan & Duvar (Katman #1: Kaba_Sıva) · Pencere/kapı boşlukları düşülmüş",
    };
  }

  if (/saten|alçı|alci/i.test(lower)) {
    return {
      id: "saten-alci",
      groupKey: "ceiling_plaster_paint",
      title: "Saten Alçı Kaplaması (Boya Altı İnce Alçı)",
      subtitle: "Tavan ve kuru hacim duvarlarında kaba sıva üstü yoklama ve perdah alçısı",
      pozCode: "15.280.1011",
      unit: "m²",
      formulaNote: "Çok Katmanlı Tavan & Duvar (Katman #2: Saten_Alçı) · Net uygulama yüzeyi",
    };
  }

  if (/boya|plastik/i.test(lower)) {
    return {
      id: "plastik-boya",
      groupKey: "ceiling_plaster_paint",
      title: "İç Cephe Plastik / Silikonlu Boya (2 Kat)",
      subtitle: "Saten alçı üstü tüm daire tavanları, kuru hacim duvarları ve ortak holler",
      pozCode: "15.540.1525",
      unit: "m²",
      formulaNote: "Çok Katmanlı Tavan & Duvar (Katman #3: Plastik_Boya) · Net boya yüzeyi",
    };
  }

  // Only allow unmapped generic coverings when the IFC model carries an explicit PozNo tag; never fabricate a fallback Poz code.
  if (cleanExplicitPoz) {
    return {
      id: `cov-${cleanExplicitPoz.replace(/[^a-zA-Z0-9]+/g, "-")}-${lower.replace(/[^a-z0-9]+/g, "-") || "genel"}`,
      groupKey: predef === "CEILING" ? "ceiling_plaster_paint" : predef === "CLADDING" ? "wall_finish" : "floor_finish",
      title: token || rawName || "Mimari Kaplama Kalemi",
      subtitle: "IFC modelindeki açık PozNo etiketi ile eşleşen net yüzey metrajı",
      pozCode: cleanExplicitPoz,
      unit: "m²",
      formulaNote: "IFC Qto_CoveringBaseQuantities NetArea",
    };
  }

  return null;
}

function controlledElementScopeReason(el: ParsedIfcElement): string | null {
  const rawClass = el.ifcClass || el.type;
  if (["IfcDoor", "IfcWindow", "IfcRailing"].includes(rawClass)) {
    return `${rawClass} için boyut, aksesuar, boşluk ve ürün sistemi kuralları vendor/uzman dayanağıyla doğrulanmadı; T17 kontrollü kapsamında otomatik poz eşlemesi desteklenmiyor.`;
  }
  if (/asma\s*tavan|suspended\s*ceiling/i.test(`${el.name} ${(el.materialLayers ?? []).join(" ")}`)) {
    return "Asma tavan için taşıyıcı sistem, panel, askı ve çevre profili ayrıştırma kuralı vendor/uzman dayanağıyla doğrulanmadı; T17 kontrollü kapsamında otomatik poz eşlemesi desteklenmiyor.";
  }
  return null;
}

function controlledLayerScopeReason(layerToken: string): string | null {
  if (/xps|eps|ısı\s*yalıt|isi\s*yalit|thermal\s*insulation/i.test(layerToken)) {
    return "Isı yalıtımı katmanında ürün tipi, kalınlık, basınç dayanımı ve uygulama yeri vendor/uzman dayanağıyla doğrulanmadı; otomatik poz eşlemesi desteklenmiyor.";
  }
  if (/bitüm|bitum|su\s*yalıt|su\s*yalit|waterproof/i.test(layerToken)) {
    return "Su yalıtımı katmanında membran sistemi, kat adedi ve uygulama detayı vendor/uzman dayanağıyla doğrulanmadı; otomatik poz eşlemesi desteklenmiyor.";
  }
  if (/ses\s*yalıt|ses\s*yalit|akustik|darbe.*(?:şilte|silte)|sound\s*insulation/i.test(layerToken)) {
    return "Ses yalıtımı katmanında ürün sistemi, kalınlık ve performans sınıfı vendor/uzman dayanağıyla doğrulanmadı; otomatik poz eşlemesi desteklenmiyor.";
  }
  return null;
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
    // Brüt alan IFC mahal cetvelinde yoktur; çarpanla üretilmez (kullanıcı katsayısı arayüzde uygulanır).
    const unitGrossM2: number | null = null;
    const generalGrossM2: number | null = null;

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
    id?: string;
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
  const sourceIdentity = row.formulaJson?.elementKey && row.formulaJson.sourceFileSha256 && row.formulaJson.sourceRunId && row.formulaJson.sourceStepId && row.formulaJson.sourceGlobalId
    ? {
        elementKey: row.formulaJson.elementKey,
        fileSha256: row.formulaJson.sourceFileSha256,
        runId: row.formulaJson.sourceRunId,
        stepId: row.formulaJson.sourceStepId,
        globalId: row.formulaJson.sourceGlobalId,
      }
    : undefined;

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
    // Tablo satırlarında malzeme alanı yoktur; yapısal satırda malzemeyi kullanıcının açıklaması söyler.
    materialLayers: materialLayers ?? (isStructuralType(elType) && desc ? [desc] : undefined),
    coveringPredefinedType: row.formulaJson?.coveringPredefinedType,
    spaceCode: row.formulaJson?.spaceCode,
    spaceName: row.formulaJson?.spaceName,
    zoneName: row.formulaJson?.zoneName,
    formworkM2: 0,
    rebarKg: 0,
    quantitySource: isIfcGeometryQuantity({ quantitySource: row.quantitySource === "ifc_qto" ? "qto" : row.quantitySource === "ifc_property" ? "property" : "estimate", quantitySourcePath: row.formulaJson?.quantitySourcePath }) ? "geometry" : row.quantitySource === "ifc_qto" ? "qto" : row.quantitySource === "ifc_property" ? "property" : "estimate",
    quantitySourcePath: row.formulaJson?.quantitySourcePath,
    smartCheckStatus: "pass",
    pozNo: row.normalizedPositionCode ?? row.rawPositionCode ?? undefined,
    sourceIdentity,
    sourceQuantityRowId: row.id,
  };
}

/**
 * Builds the 3-step Calm UI dataset from parsed IFC elements and summary,
 * automatically exploding multi-layer `IfcCovering` elements into separate contractor line items.
 * Never falls back to reference data based on filename; always computes strictly from the model's elements.
 */
/** Açıkta kalan kayda elemanın kendi miktarını ekler (yoksa hiçbir şey eklemez). */
function withQuantity(el: ParsedIfcElement): { quantity?: UncoveredQuantity } {
  const quantity = elementQuantity(el);
  return quantity ? { quantity } : {};
}

type ElementPlacement = Pick<ParsedIfcElement, "matchedPozCode" | "isUncovered" | "uncoveredReason">;

function contributionOf(
  el: ParsedIfcElement,
  storeyLabel: string,
  layer: string | null,
  netQuantity: number,
  grossQuantity: number | null,
  openingQuantity: number | null,
): CalmQuantityContribution {
  const roomLabel = el.spaceCode ? [el.spaceName, el.spaceCode].filter(Boolean).join(" · ") : el.spaceName || null;
  return {
    globalId: el.guid,
    name: el.name,
    ifcClass: el.ifcClass || el.type,
    storeyLabel,
    roomLabel,
    layer,
    netQuantity,
    grossQuantity,
    openingQuantity,
    quantitySource: el.quantitySource,
    ...(el.quantitySourcePath ? { quantitySourcePath: el.quantitySourcePath } : {}),
  };
}

/**
 * Worker raporundaki kayıtlarla icmalin ürettiği kayıtları birleştirir. Worker'da zaten bulunan bir
 * kayıt ikinci kez eklenmez; ancak aynı GlobalId'yi paylaşan farklı elemanlar (mükerrer GUID'li
 * modeller) ayrı kayıt olarak kalır. Eşleşme sayımla yapılır: worker'da bir kez geçen kimlik,
 * icmalde iki kez geçiyorsa yalnız biri atlanır.
 */
function mergeReportEntries<T>(base: readonly T[], extra: readonly T[], identityOf: (entry: T) => string): T[] {
  const remainingInBase = new Map<string, number>();
  for (const entry of base) {
    const key = identityOf(entry);
    remainingInBase.set(key, (remainingInBase.get(key) ?? 0) + 1);
  }
  const added = extra.filter((entry) => {
    const key = identityOf(entry);
    const remaining = remainingInBase.get(key) ?? 0;
    if (remaining === 0) return true;
    remainingInBase.set(key, remaining - 1);
    return false;
  });
  return [...base, ...added];
}

export function buildCalmIfcDatasetFromElements(
  elements: ParsedIfcElement[],
  summary?: Partial<IfcParseSummary> | null,
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
      grossKnown: boolean;
      derivedFromAssumption: boolean;
      byStorey: Map<string, number>;
      sampleRooms: CalmRoomSampleRow[];
      sourceQuantityRowIds: Set<string>;
      contributions: CalmQuantityContribution[];
    }
  >();

  let placedElementCount = 0;
  const unplacedUncoveredElements: NonNullable<IfcConsistencyReport["uncoveredElements"]> = [];
  const unplacedFindings: NonNullable<IfcConsistencyReport["findings"]> = [];
  const placements: Array<ElementPlacement | undefined> = [];

  for (const [elIndex, el] of elements.entries()) {
    if (el.type === "IfcReinforcingBar") {
      const hasSourceBackedMass = hasDirectIfcRebarMassEvidence(el);
      if (el.measured !== false && el.pozNo && hasSourceBackedMass) {
        const rebarSpec: ClassifiedLayerSpec = {
          id: `rebar-${el.pozNo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          groupKey: "structural",
          title: `Donatı Çeliği (${el.pozNo})`,
          subtitle: "IFC kaynak yolundan okunan pozitif donatı kütlesi; fiyat kaynağı ayrıca çözülmelidir",
          pozCode: el.pozNo,
          unit: "kg",
          formulaNote: `IFC donatı kütlesi: ${el.quantitySourcePath}`,
        };
        const existing = accumMap.get(rebarSpec.id);
        const entry = existing ?? {
          spec: rebarSpec,
          netQuantity: 0,
          grossQuantity: 0,
          deductedOpeningQuantity: 0,
          grossKnown: true,
          derivedFromAssumption: false,
          byStorey: new Map<string, number>(),
          sampleRooms: [],
          sourceQuantityRowIds: new Set<string>(),
          contributions: [],
        };
        if (el.sourceQuantityRowId) entry.sourceQuantityRowIds.add(el.sourceQuantityRowId);
        entry.netQuantity += el.rebarKg;
        entry.grossQuantity += el.rebarKg;
        const storeyLabel = normalizeStoreyLabel(el.storey, el.spaceCode);
        entry.contributions.push(contributionOf(el, storeyLabel, null, el.rebarKg, el.rebarKg, 0));
        entry.byStorey.set(storeyLabel, (entry.byStorey.get(storeyLabel) ?? 0) + el.rebarKg);
        if (!existing) accumMap.set(rebarSpec.id, entry);
        placements[elIndex] = { matchedPozCode: el.pozNo, isUncovered: false };
        placedElementCount++;
      } else {
        const reason =
          el.measured === false
            ? "Geçerli net miktar ölçülemediği için icmale alınamadı."
            : !el.pozNo
              ? "Donatı elemanı için açık PozNo etiketi bulunamadı ve otomatik icmal grubuna yerleşemedi."
              : "Donatı elemanında IFC QTO/property kaynak yolu ile kanıtlanmış pozitif kütle yok; başarılı eşleşme sayılmadı.";
        placements[elIndex] = { matchedPozCode: null, isUncovered: true, uncoveredReason: reason };
        unplacedUncoveredElements.push({
          globalId: el.guid,
          ifcClass: el.ifcClass || el.type,
          name: el.name,
          storey: el.storey || "Kat atanmamış",
          reason,
          scope: "in_takeoff",
        });
        unplacedFindings.push({
          code: "UNMAPPED_POZ_ELEMENT",
          severity: "medium",
          globalId: el.guid,
          ifcClass: el.ifcClass || el.type,
          storey: el.storey || "Kat atanmamış",
          elementName: el.name,
          message: reason,
        });
      }
      continue;
    }

    if (el.measured === false || el.isUncovered === true || el.ifcClass === "IfcBuildingElementProxy") {
      const reason =
        el.uncoveredReason ||
        (el.ifcClass === "IfcBuildingElementProxy"
          ? "IfcBuildingElementProxy genel/belirsiz eleman sınıfıdır; metraja alınmayan eleman olarak açıkta bırakıldı."
          : "Geçerli net miktar ölçülemediği için icmale alınamadı.");
      placements[elIndex] = { matchedPozCode: null, isUncovered: true, uncoveredReason: reason };
      unplacedUncoveredElements.push({
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        name: el.name,
        storey: el.storey || "Kat atanmamış",
        reason,
        scope: "in_takeoff",
      });
      continue;
    }

    const controlledScopeReason = controlledElementScopeReason(el);
    if (controlledScopeReason) {
      placements[elIndex] = { matchedPozCode: null, isUncovered: true, uncoveredReason: controlledScopeReason };
      unplacedUncoveredElements.push({
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        name: el.name,
        storey: el.storey || "Kat atanmamış",
        reason: controlledScopeReason,
        scope: "in_takeoff",
        ...withQuantity(el),
      });
      unplacedFindings.push({
        code: "UNMAPPED_POZ_ELEMENT",
        severity: "medium",
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        storey: el.storey || "Kat atanmamış",
        elementName: el.name,
        message: controlledScopeReason,
      });
      continue;
    }

    const structural = isStructuralType(el.type) ? classifyStructuralMaterial(el.type, el.materialLayers) : null;
    if (structural?.kind === "unplaced") {
      placements[elIndex] = { matchedPozCode: null, isUncovered: true, uncoveredReason: structural.reason };
      unplacedUncoveredElements.push({
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        name: el.name,
        storey: el.storey || "Kat atanmamış",
        reason: structural.reason,
        scope: "in_takeoff",
        ...withQuantity(el),
      });
      unplacedFindings.push({
        code: structural.missingMaterial ? "MISSING_MATERIAL" : "UNMAPPED_POZ_ELEMENT",
        severity: "medium",
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        storey: el.storey || "Kat atanmamış",
        elementName: el.name,
        message: structural.reason,
      });
      continue;
    }

    const predef = (el.coveringPredefinedType || "").toUpperCase();
    const layers =
      el.type === "IfcCovering" && Array.isArray(el.materialLayers) && el.materialLayers.length > 0
        ? el.materialLayers
        : [el.name];

    let elementPlacedInIcmal = false;
    let firstPlacedPozCode: string | null = null;
    let missingRequiredQuantityEvidence = false;
    const unsupportedLayerReasons: string[] = [];

    for (const layerToken of layers) {
      const controlledLayerReason = el.pozNo ? null : controlledLayerScopeReason(layerToken);
      if (controlledLayerReason) {
        unsupportedLayerReasons.push(controlledLayerReason);
        continue;
      }
      const spec = structural
        ? structural.kind === "concrete" ? CONCRETE_SPECS[structural.concreteClass] : MASONRY_SPEC
        : classifyMaterialLayer(layerToken, predef, el.type, el.name, el.pozNo);
      if (!spec) {
        if (layers.length > 1) {
          unsupportedLayerReasons.push(`Çok katmanlı elemandaki “${layerToken}” katmanı için vendor/uzman dayanaklı poz kuralı yok; bu katman otomatik eşleştirilmedi.`);
        }
        continue;
      }

      let netQty = 0;
      let grossQty = 0;
      let openingQty = 0;
      // Brüt/boşluk yalnızca modelden geldiğinde "known" olur; çarpanla üretilmez.
      let grossKnown = false;
      let derivedFromAssumption = false;

      if (spec.unit === "mtül") {
        if (typeof el.lengthM === "number" && el.lengthM > 0) {
          netQty = el.lengthM;
        } else {
          // Alanı varsayılan bir yüksekliğe bölmek boyut değiştirir. Doğrulanmış yükseklik veya
          // doğrudan çevre/uzunluk kanıtı yoksa miktar üretme.
          missingRequiredQuantityEvidence = true;
        }
        grossQty = netQty;
        openingQty = 0;
      } else if (spec.unit === "m²") {
        netQty = typeof el.areaM2 === "number" && el.areaM2 > 0 ? el.areaM2 : 0;
        if (typeof el.grossAreaM2 === "number" && el.grossAreaM2 >= netQty) {
          grossQty = el.grossAreaM2;
          openingQty =
            typeof el.openingAreaM2 === "number" && el.openingAreaM2 > 0
              ? el.openingAreaM2
              : Math.max(0, grossQty - netQty);
          grossKnown = true;
        } else {
          grossQty = netQty;
          openingQty = 0;
          // Döşeme kaplamalarında düşülecek boşluk yoktur (brüt = net doğru); duvar/tavan yüzeyinde
          // brüt ve boşluk modelde yoksa bilinmiyor sayılır.
          grossKnown = spec.groupKey === "floor_finish";
        }
      } else {
        netQty = typeof el.volumeM3 === "number" && el.volumeM3 > 0 ? el.volumeM3 : 0;
        grossQty = netQty;
        openingQty = 0;
      }

      if (netQty <= 0) continue;

      elementPlacedInIcmal = true;
      if (!firstPlacedPozCode) {
        firstPlacedPozCode = spec.pozCode;
      }

      let entry = accumMap.get(spec.id);
      if (!entry) {
        entry = {
          spec,
          netQuantity: 0,
          grossQuantity: 0,
          deductedOpeningQuantity: 0,
          grossKnown: true,
          derivedFromAssumption: false,
          byStorey: new Map<string, number>(),
          sampleRooms: [],
          sourceQuantityRowIds: new Set<string>(),
          contributions: [],
        };
        accumMap.set(spec.id, entry);
      }

      entry.netQuantity += netQty;
      if (el.sourceQuantityRowId) entry.sourceQuantityRowIds.add(el.sourceQuantityRowId);
      entry.grossQuantity += grossQty;
      entry.deductedOpeningQuantity += openingQty;
      if (!grossKnown) entry.grossKnown = false;
      if (derivedFromAssumption) entry.derivedFromAssumption = true;

      const stLabel = normalizeStoreyLabel(el.storey, el.spaceCode);
      entry.byStorey.set(stLabel, (entry.byStorey.get(stLabel) || 0) + netQty);
      const layerName = el.type === "IfcCovering" && Array.isArray(el.materialLayers) && el.materialLayers.length > 0 ? layerToken : null;
      entry.contributions.push(contributionOf(el, stLabel, layerName, netQty, grossKnown ? grossQty : null, grossKnown ? openingQty : null));

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

    if (elementPlacedInIcmal && firstPlacedPozCode) {
      placedElementCount++;
      placements[elIndex] = { matchedPozCode: firstPlacedPozCode, isUncovered: false };
      for (const reason of unsupportedLayerReasons) {
        unplacedFindings.push({
          code: "UNMAPPED_POZ_ELEMENT",
          severity: "medium",
          globalId: el.guid,
          ifcClass: el.ifcClass || el.type,
          storey: el.storey || "Kat atanmamış",
          elementName: el.name,
          message: `T17 kontrollü kapsam: ${reason}`,
        });
      }
    } else {
      const reason =
        missingRequiredQuantityEvidence
          ? "Doğrulanmış uzunluk/çevre kanıtı yok; alandan mtül miktarı varsayımla türetilmedi."
          : unsupportedLayerReasons.length > 0
            ? `T17 kontrollü kapsam: ${unsupportedLayerReasons.join(" ")}`
          : "Kaplama alt tipi (PredefinedType) veya malzeme katmanı hiçbir icmal grubuna/poza yerleşemedi (açıkta kalan eleman).";
      placements[elIndex] = { matchedPozCode: null, isUncovered: true, uncoveredReason: reason };
      unplacedUncoveredElements.push({
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        name: el.name,
        storey: el.storey || "Kat atanmamış",
        reason,
        scope: "in_takeoff",
        ...withQuantity(el),
      });
      unplacedFindings.push({
        code: "UNMAPPED_POZ_ELEMENT",
        severity: "medium",
        globalId: el.guid,
        ifcClass: el.ifcClass || el.type,
        storey: el.storey || "Kat atanmamış",
        elementName: el.name,
        message: reason,
      });
    }
  }

  let resolvedConsistencyReport = summary?.consistencyReport;
  if (resolvedConsistencyReport || unplacedUncoveredElements.length > 0 || elements.length > 0) {
    const baseReport = resolvedConsistencyReport || {
      totalElementCount: elements.length,
      measuredElementCount: elements.filter((e) => e.measured !== false).length,
      unmeasuredElementCount: elements.filter((e) => e.measured === false).length,
      pozMatchedElementCount: placedElementCount,
      pozMatchedRatio: elements.length > 0 ? Number((placedElementCount / elements.length).toFixed(6)) : null,
      uncoveredElementCount: 0,
      typeInheritedElementCount: elements.filter((e) => e.inheritedFromType === true).length,
      suppressedAssemblyPartCount: 0,
      highSeverityCount: 0,
      mediumSeverityCount: 0,
      findings: [],
      uncoveredElements: [],
      suppressedAssemblyParts: [],
    };

    const mergedUncovered = mergeReportEntries(
      baseReport.uncoveredElements,
      unplacedUncoveredElements,
      (u) => [u.globalId, u.ifcClass, u.name, u.storey].join("\u0000"),
    );
    const mergedFindings = mergeReportEntries(
      baseReport.findings,
      unplacedFindings,
      (f) => [f.code, f.globalId, f.elementName ?? "", f.storey ?? ""].join("\u0000"),
    );

    const totalCount = baseReport.totalElementCount || elements.length;
    resolvedConsistencyReport = {
      ...baseReport,
      totalElementCount: totalCount,
      pozMatchedElementCount: placedElementCount,
      pozMatchedRatio: totalCount > 0 ? Number((placedElementCount / totalCount).toFixed(6)) : null,
      uncoveredElementCount: mergedUncovered.filter((u) => u.scope !== "out_of_scope").length,
      outOfScopeElementCount: mergedUncovered.filter((u) => u.scope === "out_of_scope").length,
      highSeverityCount: mergedFindings.filter((f) => f.severity === "high").length,
      mediumSeverityCount: mergedFindings.filter((f) => f.severity === "medium").length,
      findings: mergedFindings,
      uncoveredElements: mergedUncovered,
    };
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
      subtitle: entry.spec.groupKey === "structural" && entry.contributions.length > 0
        ? `${entry.spec.subtitle} · Bu modelde: ${includedClassesNote(entry.contributions)}`
        : entry.spec.subtitle,
      pozCode: entry.spec.pozCode,
      unit: entry.spec.unit,
      netQuantity: Number(entry.netQuantity.toFixed(2)),
      grossQuantity: entry.grossKnown ? Number(entry.grossQuantity.toFixed(2)) : Number(entry.netQuantity.toFixed(2)),
      deductedOpeningQuantity: entry.grossKnown ? Number(entry.deductedOpeningQuantity.toFixed(2)) : 0,
      grossAvailable: entry.grossKnown,
      defaultUnitPriceTry: 0,
      formulaNote: entry.derivedFromAssumption
        ? `${entry.spec.formulaNote} · Uzunluk modelde yok; alan ÷ 0,06 m süpürgelik yüksekliği varsayımıyla türetildi`
        : entry.spec.formulaNote,
      storeyBreakdown,
      sampleRooms: entry.sampleRooms,
      sourceQuantityRowIds: [...entry.sourceQuantityRowIds].sort(),
      contributions: entry.contributions,
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
  // Model brütü yoksa toplam da yoktur; yalnız tüm konutların brütü modelden geliyorsa toplanır.
  const allUnitGrossKnown = residentialUnits.length > 0 && residentialUnits.every((u) => u.unitGrossM2 !== null);
  const allGeneralGrossKnown = residentialUnits.length > 0 && residentialUnits.every((u) => u.generalGrossM2 !== null);
  const totalUnitGrossM2 = allUnitGrossKnown
    ? Number(residentialUnits.reduce((s, u) => s + (u.unitGrossM2 as number), 0).toFixed(2))
    : null;
  const totalGeneralGrossM2 = allGeneralGrossKnown
    ? Number(residentialUnits.reduce((s, u) => s + (u.generalGrossM2 as number), 0).toFixed(2))
    : null;

  // Claim deducted openings only when the model carries a door/window list (marka.md M-13.6).
  const openingsNote = summary?.openings === undefined
    ? "Kapı/Pencere Bilgisi Bulunamadı — Boşluk Düşümü Değerlendirilemedi"
    : summary.openings.length === 0
      ? "Modelde Kapı/Pencere Yok"
      : `${summary.openings.length.toLocaleString("tr-TR")} Kapı/Pencere Okundu`;
  const modelElementCount = summary?.consistencyReport?.totalElementCount;
  const elementsNote = typeof modelElementCount === "number" && modelElementCount > elements.length
    ? `${elements.length.toLocaleString("tr-TR")} Kanıtlı Eleman · Modelde ${modelElementCount.toLocaleString("tr-TR")} Eleman`
    : `Toplam ${elements.length.toLocaleString("tr-TR")} IFC Elemanı`;
  const layerNote = hasMultiLayerCoverings
    ? "Çok Katmanlı IfcCovering Ayrıştırması Aktif"
    : "Modelde Çoklu Katman (materialLayers) Bilgisi Yok — Tekil Eleman Metrajı";

  return {
    projectTitle: fileName ? `${fileName}` : "Yüklenen IFC Proje İcmali",
    projectSubtitle: `${elementsNote} · ${layerNote} · ${openingsNote}`,
    residentialUnitCount: residentialUnits.length,
    totalNetSweepableM2,
    totalBalconyM2,
    totalUnitGrossM2,
    totalGeneralGrossM2,
    groups,
    apartments,
    authoringAdvisory: summary?.authoringSoftware
      ? buildAuthoringAdvisory(summary.authoringSoftware)
      : summary?.authoringSoftwareRaw
        ? buildAuthoringAdvisory(classifyAuthoringSoftware(summary.authoringSoftwareRaw))
        : undefined,
    openings: summary?.openings,
    classInventory: summary?.classInventory,
    consistencyReport: resolvedConsistencyReport,
    elements: elements.map((el, i) => (placements[i] ? { ...el, ...placements[i] } : el)),
  };
}

/**
 * Reconstructs `ParsedIfcElement[]` from an `IfcSmartCheckEvidenceArtifact` and builds the Calm UI dataset
 * strictly from the artifact's actual extracted rows.
 */
export function buildCalmIfcDatasetFromArtifact(artifact: IfcSmartCheckEvidenceArtifact): CalmIfcDataset {
  const fileName = artifact.document?.fileName || "";
  const parsedElements: ParsedIfcElement[] = artifact.rows.map((row, idx) =>
    parseSmartCheckRowToPseudoElement(row, idx),
  );
  // Existing artifacts may predate the worker's corrected geometry classification.
  const pseudoElements = parsedElements.filter(element =>
    !isIfcGeometryQuantity(element)
    && (element.quantitySource === "qto" || element.quantitySource === "property")
    && Boolean(element.quantitySourcePath?.trim()),
  );
  const excludedSourceCount = parsedElements.length - pseudoElements.length;

  const dataset = buildCalmIfcDatasetFromElements(
    pseudoElements,
    {
      consistencyReport: artifact.summary.consistencyReport,
      openings: artifact.summary.openings,
      classInventory: artifact.summary.classInventory,
      authoringSoftware: artifact.summary.authoringSoftware,
    },
    fileName,
  );
  const authoring = artifact.summary.authoringSoftware;
  return {
    ...dataset,
    projectSubtitle: excludedSourceCount ? `${dataset.projectSubtitle} · ${excludedSourceCount} doğrulanamayan kaynak satırı güvenli inceleme için icmal dışında` : dataset.projectSubtitle,
    ...(authoring ? { authoringAdvisory: buildAuthoringAdvisory(authoring) } : {}),
    openings: artifact.summary.openings,
    classInventory: artifact.summary.classInventory,
  };
}

