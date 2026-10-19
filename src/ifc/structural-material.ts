/**
 * Yapısal elemanların (döşeme, kiriş, kolon, duvar) icmal kalemini MALZEMEYE göre belirler.
 *
 * Eleman adı ya da IFC sınıfı tek başına malzeme söylemez: adı "Duvar 20" olan bir perde betonarmedir,
 * "Wood - pine" malzemeli bir kiriş beton değildir. Bu yüzden:
 *  - Yalnız beton katmanlarından oluşan eleman betonarme kalemine girer.
 *  - Yalnız gazbeton / Ytong / bims katmanlarından oluşan DUVAR kâgir duvar kalemine girer.
 *  - Malzemesi olmayan, başka malzemeden ya da karma katmanlı eleman hiçbir kaleme varsayılarak konmaz;
 *    nedeni yazılarak "açıkta kalan" olarak raporlanır.
 */

export type StructuralMaterialResult =
  | { kind: "concrete"; concreteClass: string | null }
  | { kind: "masonry" }
  | { kind: "unplaced"; reason: string; missingMaterial: boolean };

/** İcmaldeki betonarme kaleminin sınıfı; farklı sınıf bulgu olarak işaretlenir. */
export const ICMAL_CONCRETE_CLASS = "C30/37";

const STRUCTURAL_TYPES = new Set(["IfcSlab", "IfcBeam", "IfcColumn", "IfcWall"]);
const CONCRETE_PATTERN = /beton|concrete/i;
const MASONRY_PATTERN = /ytong|bims|gazbeton|gaz beton/i;
const CONCRETE_CLASS_PATTERN = /(?:^|[^A-Za-z0-9])C(\d{2})(?:[/_\- ](\d{2}))?(?!\d)/i;

export function isStructuralType(type: string): boolean {
  return STRUCTURAL_TYPES.has(type);
}

/** "Beton_C35" -> "C35", "concrete_prefab_C45_55" -> "C45/55"; sınıf yazmıyorsa null. */
export function parseConcreteClass(layers: readonly string[]): string | null {
  for (const layer of layers) {
    const match = CONCRETE_CLASS_PATTERN.exec(layer);
    if (match) return match[2] ? `C${match[1]}/${match[2]}` : `C${match[1]}`;
  }
  return null;
}

/** Sınıf yalnız ilk sayı ile karşılaştırılır: "C30" ve "C30/37" aynı sınıftır. */
export function concreteClassDiffers(concreteClass: string | null): boolean {
  if (!concreteClass) return false;
  return concreteClass.split("/")[0].toUpperCase() !== ICMAL_CONCRETE_CLASS.split("/")[0];
}

export function classifyStructuralMaterial(type: string, materialLayers: readonly string[] | undefined): StructuralMaterialResult {
  const layers = (materialLayers ?? []).map((layer) => layer.trim()).filter(Boolean);
  if (layers.length === 0) {
    return {
      kind: "unplaced",
      missingMaterial: true,
      reason: "Yapısal elemanda malzeme tanımı yok; betonarme ya da kâgir varsayılmadan açıkta bırakıldı.",
    };
  }

  const allConcrete = layers.every((layer) => CONCRETE_PATTERN.test(layer));
  if (allConcrete) return { kind: "concrete", concreteClass: parseConcreteClass(layers) };

  const allMasonry = layers.every((layer) => MASONRY_PATTERN.test(layer));
  if (allMasonry && type === "IfcWall") return { kind: "masonry" };

  const listed = layers.join(", ");
  if (layers.length > 1) {
    return {
      kind: "unplaced",
      missingMaterial: false,
      reason: `Çok katmanlı / karma malzemeli eleman (${listed}); katman hacimleri ayrıştırılmadan tek kaleme konamaz.`,
    };
  }
  return {
    kind: "unplaced",
    missingMaterial: false,
    reason: `Malzeme (${listed}) betonarme veya gazbeton/bims kâgir duvar kuralına uymuyor; icmale alınmadı.`,
  };
}
