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
  | { kind: "concrete"; concreteClass: SupportedConcreteClass }
  | { kind: "masonry" }
  | { kind: "unplaced"; reason: string; missingMaterial: boolean };

export type SupportedConcreteClass = "C25/30" | "C30/37" | "C35/45";

const STRUCTURAL_TYPES = new Set(["IfcSlab", "IfcBeam", "IfcColumn", "IfcWall"]);
const MASONRY_PATTERN = /ytong|bims|gazbeton|gaz beton/i;
const CONCRETE_CLASS_PATTERN = /(?:^|[^A-Za-z0-9])C(\d{2})(?:[/_\- ](\d{2}))?(?!\d)/i;
const EXCLUDED_CONCRETE_PATTERN = /gaz\s*beton|gro\s*beton|şap|sap|screed/i;
const CONCRETE_PATTERN = /(?:^|[^a-zçğıöşü])(?:beton|concrete)(?:[^a-zçğıöşü]|$)/i;
const SUPPORTED_CLASSES: Readonly<Record<string, SupportedConcreteClass>> = Object.freeze({
  C25: "C25/30",
  "C25/30": "C25/30",
  C30: "C30/37",
  "C30/37": "C30/37",
  C35: "C35/45",
  "C35/45": "C35/45",
});

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

export function normalizeSupportedConcreteClass(concreteClass: string | null): SupportedConcreteClass | null {
  if (!concreteClass) return null;
  return SUPPORTED_CLASSES[concreteClass.toUpperCase()] ?? null;
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

  const allMasonry = layers.every((layer) => MASONRY_PATTERN.test(layer));
  if (allMasonry && type === "IfcWall") return { kind: "masonry" };

  const allConcrete = layers.every(
    (layer) => !EXCLUDED_CONCRETE_PATTERN.test(layer) && CONCRETE_PATTERN.test(layer),
  );
  if (allConcrete) {
    const parsedClasses = Array.from(new Set(layers.map((layer) => parseConcreteClass([layer]))));
    const concreteClass = parsedClasses.length === 1
      ? normalizeSupportedConcreteClass(parsedClasses[0] ?? null)
      : null;
    if (concreteClass) return { kind: "concrete", concreteClass };
    return {
      kind: "unplaced",
      missingMaterial: false,
      reason: parsedClasses[0]
        ? `Beton sınıfı ${parsedClasses.join(", ")} desteklenen C25/30, C30/37 veya C35/45 profilinden biri değil; poz varsayılmadı.`
        : "Beton malzemesinde dayanım sınıfı yok; poz varsayılmadan açıkta bırakıldı.",
    };
  }

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
