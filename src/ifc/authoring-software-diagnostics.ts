/**
 * IFC kaynak yazılım tespiti ve metraj güvenilirliği uyarıları (Paket M-2)
 *
 * Saha dayanağı: Melih Dinekli geri bildirimi (17 Ekim 2026). Bu modülün ürettiği
 * uyarılar bir UZMAN SAHA GÖZLEMİDİR; bağımsız ölçüm veya sertifikasyon değildir.
 * Hiçbir yazılım için "metraj garantili doğrudur" veya sabit bir sapma yüzdesi
 * iddia edilmez. Sapma ancak modelin kendi sayılarıyla (ör. katman daralması
 * hesabı) gösterilebilir ve yalnızca öyle gösterilir.
 */

export type AuthoringSoftwareFamily =
  | "allplan"
  | "revit"
  | "archicad"
  | "tekla"
  | "other"
  | "unknown";

export interface AuthoringSoftwareDetection {
  family: AuthoringSoftwareFamily;
  /** IFC başlığındaki ham değerler (FILE_NAME originating_system / preprocessor_version / IFCAPPLICATION). */
  rawOriginatingSystem: string | null;
  rawPreprocessorVersion: string | null;
  rawApplicationName: string | null;
  evidence: "file_name_header" | "ifc_application" | "none";
}

export type AdvisoryTone = "info" | "caution";

export interface PreExportChecklistItem {
  id: string;
  category: string;
  menuPath: string;
  requiredSetting: string;
  technicalReason: string;
  commonTrap?: string;
}

export interface AuthoringAdvisory {
  family: AuthoringSoftwareFamily;
  tone: AdvisoryTone;
  headline: string;
  /** Kullanıcıya gösterilecek maddeler. Uzman gözlemi olarak etiketlenir. */
  points: string[];
  /** Süreç / dışa aktarım öncesi doğrulanması gereken ayarlar ve tuzaklar. */
  preExportChecklist?: PreExportChecklistItem[];
  /** Önerilen doğrulama adımı. */
  recommendedAction: string;
  disclaimer: string;
}

const FAMILY_PATTERNS: Array<{ family: AuthoringSoftwareFamily; pattern: RegExp }> = [
  { family: "allplan", pattern: /allplan|nemetschek\s+allplan/i },
  { family: "revit", pattern: /revit|autodesk\s+revit/i },
  { family: "archicad", pattern: /archicad|graphisoft/i },
  { family: "tekla", pattern: /tekla/i },
];

function classify(...candidates: Array<string | null>): AuthoringSoftwareFamily | null {
  const joined = candidates.filter((c): c is string => Boolean(c)).join(" | ");
  if (!joined.trim()) return null;
  for (const { family, pattern } of FAMILY_PATTERNS) {
    if (pattern.test(joined)) return family;
  }
  return "other";
}

function stepStrings(args: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^']|'')*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(args)) !== null) out.push(m[1].replace(/''/g, "'"));
  return out;
}

/**
 * IFC (STEP) metninin başlığından ve IFCAPPLICATION kaydından kaynak yazılımı tespit eder.
 * FILE_NAME alanları: (name, time_stamp, author, organization, preprocessor_version,
 * originating_system, authorization).
 */
export function detectAuthoringSoftware(ifcText: string): AuthoringSoftwareDetection {
  const headerEnd = ifcText.search(/ENDSEC\s*;/i);
  const header = headerEnd > 0 ? ifcText.slice(0, headerEnd) : ifcText.slice(0, 8000);

  let preprocessor: string | null = null;
  let originating: string | null = null;
  const fileName = /FILE_NAME\s*\(([\s\S]*?)\)\s*;/i.exec(header);
  if (fileName) {
    const strings = stepStrings(fileName[1]);
    // name, time_stamp, author(list), organization(list), preprocessor, originating, authorization
    // Liste alanları kesme işareti içinde birden çok string üretebileceğinden sondan okunur.
    if (strings.length >= 3) {
      originating = strings[strings.length - 2] || null;
      preprocessor = strings[strings.length - 3] || null;
    }
  }

  let applicationName: string | null = null;
  const app = /#\d+\s*=\s*IFCAPPLICATION\s*\(([\s\S]*?)\)\s*;/i.exec(ifcText);
  if (app) {
    const strings = stepStrings(app[1]);
    // IFC2X3: (owner, version, applicationFullName, identifier); IFC4 benzeri.
    applicationName = strings.length >= 3 ? strings[2] || strings[strings.length - 1] : strings[0] ?? null;
  }

  return classifyAuthoringSoftware({
    originatingSystem: originating,
    preprocessorVersion: preprocessor,
    applicationNames: applicationName ? [applicationName] : [],
  });
}

/** Sunucu (Python) yolunun ve metin yolunun ortak ham girdisi. */
export interface AuthoringSoftwareRaw {
  originatingSystem: string | null;
  preprocessorVersion: string | null;
  applicationNames: string[];
}

/**
 * Ham başlık bilgisini sınıflandırır. Gerçek dosyalarda başlıkta yazılım adı olmayabilir
 * (Revit: originating_system "21.0.0.383 - Exporter ...", yazılım adı yalnız IfcApplication'da;
 * Allplan: originating_system boş, IfcApplication "Allplan"), bu yüzden önce başlık,
 * tanınmazsa IfcApplication kayıtları denenir.
 */
export function classifyAuthoringSoftware(raw: AuthoringSoftwareRaw): AuthoringSoftwareDetection {
  const originating = raw.originatingSystem?.trim() || null;
  const preprocessor = raw.preprocessorVersion?.trim() || null;
  const applicationName = raw.applicationNames.find((n) => n.trim()) ?? null;

  const fromHeader = classify(originating, preprocessor);
  if (fromHeader && fromHeader !== "other") {
    return {
      family: fromHeader,
      rawOriginatingSystem: originating,
      rawPreprocessorVersion: preprocessor,
      rawApplicationName: applicationName,
      evidence: "file_name_header",
    };
  }
  for (const name of raw.applicationNames) {
    const fromApp = classify(name);
    if (fromApp && fromApp !== "other") {
      return {
        family: fromApp,
        rawOriginatingSystem: originating,
        rawPreprocessorVersion: preprocessor,
        rawApplicationName: name,
        evidence: "ifc_application",
      };
    }
  }
  const anyRaw = originating || preprocessor || applicationName;
  return {
    family: anyRaw ? "other" : "unknown",
    rawOriginatingSystem: originating,
    rawPreprocessorVersion: preprocessor,
    rawApplicationName: applicationName,
    evidence: anyRaw ? (fromHeader ? "file_name_header" : "ifc_application") : "none",
  };
}

const DISCLAIMER =
  "Bu uyarı uzman mühendisin saha gözlemidir; bağımsız ölçüm veya sertifikasyon değildir. BIMMetraj IFC içinde yazılı olan veriyi okur; sonuç modelin nasıl çizildiğine bağlıdır.";

export const REVIT_PRE_EXPORT_CHECKLIST: PreExportChecklistItem[] = [
  {
    id: "room-volume-computations",
    category: "1. Mahal (IfcSpace) Hacim Doğruluğu vs. Termal Sınırlar",
    menuPath: "Architecture > Room & Area > Area and Volume Computations",
    requiredSetting: "Areas and Volumes (Hacim Hesaplaması Açık)",
    technicalReason:
      "Mimari / hakediş hacim doğruluğu için dışa aktarım öncesi Revit içinde 'Areas and Volumes' aktif edilmelidir. 'Areas only (faster)' seçili bırakılırsa, IFC ayarlarında ne seçilirse seçilsin IfcSpace asma tavan, kiriş veya eğimli döşeme sınırlarını kesmez; 2B taban alanını düz yukarı uzatır (extrude eder).",
    commonTrap:
      "IFC dışa aktarımındaki 'Space Boundaries = 2nd Level' ayarı mimari hakediş metrajı için değil; enerji ve ısı kaybı/kazancı (BEM / HVAC — EnergyPlus, IES VE vb.) yazılımlarında duvarın arka yüzündeki komşu odaya göre ısı transfer yüzeylerini (IfcRelSpaceBoundary2ndLevel) bölmek için kullanılır.",
  },
  {
    id: "base-quantities-net-side-area",
    category: "2. Base Quantities ve Boşluk (Minha) Doğrulaması",
    menuPath: "File > Export > IFC > Modify Setup > Property Sets",
    requiredSetting: "Export base quantities = İşaretli (Açık)",
    technicalReason:
      "İşaretlenmezse IFC içinde Qto_WallBaseQuantities, Qto_SlabBaseQuantities ve Qto_SpaceBaseQuantities nicelik setleri hiç oluşturulmaz.",
    commonTrap:
      "openBIM saha testlerine (Dion Moult) göre 'Export base quantities' açık olsa dahi Revit, profil kesimi veya kapı/pencere boşluğu (IfcOpeningElement) barındıran bazı duvarlarda minhaları düşmeden brüt değeri NetSideArea ve standart dışı NetSideVolume içine yazabilmektedir. BIMMetraj bu nedenle Revit Qto değerine tek başına güvenmez; IfcRelVoidsElement boşluklarını ve ÇŞİDB 0,10 m² / 0,05 m³ kurallarını bağımsız denetler.",
  },
  {
    id: "join-geometry-priority",
    category: "3. Kaba Yapı Birleşim Hakimiyeti (Join Geometry)",
    menuPath: "Modify > Geometry > Join / Switch Join Order",
    requiredSetting: "Kolon – Kiriş – Döşeme – Duvar Kesişimlerinde Join Uygulanmalı",
    technicalReason:
      "Birleşim (Join Geometry) yapılmamışsa veya bir eleman diğerinin içine fazladan (ör. 5 cm) çizildiyse IFC'deki brüt hacimler mükerrer sayılır; Revit dışa aktarımda otomatik imalat hakimiyeti (minha) uygulamaz.",
  },
  {
    id: "finish-layer-and-formwork",
    category: "4. İnce Yapı Katman Kısalması ve Kalıp Yüzeyi",
    menuPath: "Mimari Katman Modelleme & Kalıp Yüzey Seçimi",
    requiredSetting: "Ayrı Modellenen Sıva/Kaplama Katmanlarında Alan Daralması Kontrolü",
    technicalReason:
      "Şap, yalıtım, parke ve sıva katmanları ayrı modellendiğinde duvar katman kalınlığı komşu döşeme kaplamasının net alanını (L − 2t) × (W − 2t) formülüyle daraltır; kalıp metrajında ise betonla temas eden yüzeylerin tek tek tanımlanması gerekir.",
  },
  {
    id: "lod-tessellation-organic",
    category: "5. Üçgenleme Detay Seviyesi (LoD) ve Eğrisel Geometri",
    menuPath: "File > Export > IFC > Modify Setup > Level of Detail",
    requiredSetting: "Low veya Medium ('Extra High' Seçilmemeli)",
    technicalReason:
      "'Extra High' seçilmesi eğrisel elemanları binlerce mikro üçgene (tessellation) bölerek Revit sürümleri arasında ciddi IFC dosya boyutu şişmesine (Autodesk/revit-ifc#63) ve organik/eğrisel döşemelerde (Revit 2027) fasetleme kaynaklı GrossFloorArea farklarına yol açar.",
  },
  {
    id: "shared-coordinates-cartesian",
    category: "6. Ortak Koordinat Sistemi (Shared Coordinates)",
    menuPath: "File > Export > IFC > Modify Setup > General > Coordinate Base",
    requiredSetting: "Shared Coordinates",
    technicalReason:
      "Disiplinler arası (Mimari/Statik/Mekanik) birleştirmede modelin vaziyet planında uzağa fırlamasını veya dönmesini engeller.",
    commonTrap:
      "STEP dosyasındaki IFCCARTESIANPOINT satırlarında görülen .000000000001 veya 66.2499999999999985 gibi küsuratlar IEEE-754 ikili kayan nokta (binary floating-point) temsilidir; geometrik veya metraj sapması yaratmaz.",
  },
];

export function buildAuthoringAdvisory(detection: AuthoringSoftwareDetection): AuthoringAdvisory {
  switch (detection.family) {
    case "revit":
      return {
        family: "revit",
        tone: "caution",
        headline: "Revit kaynaklı IFC: kaba yapı, kalıp, ince yapı ve dışa aktarım ayarları için model kontrolü önerilir",
        points: [
          "Kaba yapı: kolon–kiriş–döşeme birleşimleri (Join Geometry) yapılmamışsa veya eleman diğerinin içine fazladan (ör. 5 cm) çizildiyse IFC'deki hacimler mükerrer sayılır; otomatik minha hakimiyeti uygulanmaz.",
          "Kalıp: görünen (betonla temas eden) yüzey için yüzeylerin tek tek seçilmesi gerekir; seçilmediyse IFC'deki alan net kalıp yüzeyi olmayabilir.",
          "İnce yapı: şap, yalıtım, parke ve sıva katmanları ayrı modellendiğinde katman kalınlığı komşu yüzeyin alanını daraltır (örnek hesap için katman daralması aracına bakın).",
          "Mahal (IfcSpace) hacmi: Mimari/hakediş hacim doğruluğu için dışa aktarım öncesi Revit içinde 'Architecture > Room & Area > Area and Volume Computations > Areas and Volumes' aktif olmalıdır ('Areas only' seçiliyse IfcSpace kiriş/asma tavan eğimlerini kesmez, 2B alanı düz yukarı uzatır). '2nd Level Space Boundaries' ise enerji analizi (BEM/HVAC) yazılımlarında ısı transfer yüzeylerini bölmek içindir.",
          "Base Quantities & Minha: 'Export base quantities' açık olsa dahi Revit bazı duvar kesim ve boşluklarında NetSideArea / NetSideVolume içine minhaları düşmeden brüt değer yazabilmektedir (BIMMetraj bu yüzden IfcOpeningElement boşluklarını bağımsız denetler).",
          "Geometri (LoD) & Koordinat: 'Extra High' LoD aşırı üçgenleme ve dosya boyutu şişmesine (Autodesk/revit-ifc#63) yol açtığından 'Low/Medium' ve koordinat kaymasını önlemek için 'Shared Coordinates' kullanılmalıdır.",
        ],
        preExportChecklist: REVIT_PRE_EXPORT_CHECKLIST,
        recommendedAction:
          "Modeli Allplan gibi oda/obje hakimiyetli bir yazılımda tamamlayıp IFC'yi oradan almak veya dışa aktarım öncesi aşağıdaki 6 maddelik Revit kontrol listesini doğrulayıp elle ölçülmüş kalemlerle çapraz kontrol yapmak önerilir.",
        disclaimer: DISCLAIMER,
      };
    case "allplan":
      return {
        family: "allplan",
        tone: "info",
        headline: "Allplan kaynaklı IFC: obje ve oda bazlı model; yine de kalem kalem çapraz kontrol önerilir",
        points: [
          "Uzman gözlemine göre Allplan obje bazlı çalışır ve oda (IfcSpace) komutundan katmanları kalınlıklarıyla birlikte tanımlar; kaba yapı birleşimlerinde otomatik hakimiyet uygular.",
          "Bu, belirli bir modelin metrajının doğru olduğunu garanti etmez; modelin eksik veya hatalı çizilmiş olması mümkündür.",
        ],
        recommendedAction: "Toplam beton hacmi ve alan değerlerini projenin kendi metraj raporuyla karşılaştırın.",
        disclaimer: DISCLAIMER,
      };
    case "archicad":
      return {
        family: "archicad",
        tone: "caution",
        headline: "Archicad kaynaklı IFC: metraj güvenilirliği için model kontrolü önerilir",
        points: [
          "Kaynak yazılım Archicad olarak tespit edildi. Bu yazılım için BIMMetraj şu an yazılıma özgü bir doğrulama kuralı içermez.",
          "IFC'deki miktarlar modelin çizim biçimine bağlıdır; kaba yapı birleşimleri ve ince yapı katmanları için model kontrolü önerilir.",
        ],
        recommendedAction: "Toplam hacim ve alanları projenin kendi metraj raporuyla karşılaştırın.",
        disclaimer: DISCLAIMER,
      };
    case "tekla":
      return {
        family: "tekla",
        tone: "info",
        headline: "Tekla kaynaklı IFC",
        points: ["Kaynak yazılım Tekla olarak tespit edildi; yazılıma özgü bir doğrulama kuralı bulunmuyor."],
        recommendedAction: "Toplam hacim ve alanları projenin kendi metraj raporuyla karşılaştırın.",
        disclaimer: DISCLAIMER,
      };
    case "other":
      return {
        family: "other",
        tone: "info",
        headline: `Kaynak yazılım: ${detection.rawOriginatingSystem ?? detection.rawApplicationName ?? "tanınmayan"}`,
        points: ["Bu yazılım için yazılıma özgü bir uyarı tanımlı değil."],
        recommendedAction: "Toplam hacim ve alanları projenin kendi metraj raporuyla karşılaştırın.",
        disclaimer: DISCLAIMER,
      };
    default:
      return {
        family: "unknown",
        tone: "info",
        headline: "Kaynak yazılım IFC başlığından tespit edilemedi",
        points: ["IFC başlığında (FILE_NAME) veya IFCAPPLICATION kaydında yazılım adı bulunamadı."],
        recommendedAction: "Modelin hangi yazılımdan alındığını dosya sahibinden öğrenin.",
        disclaimer: DISCLAIMER,
      };
  }
}

export interface FinishLayerShrinkageInput {
  lengthM: number;
  widthM: number;
  /** Duvar yüzeyine ayrıca modellenmiş katman (sıva vb.) kalınlığı, cm. */
  wallLayerThicknessCm: number;
}

export interface FinishLayerShrinkageResult {
  netAreaM2: number;
  modeledFloorAreaM2: number;
  differenceM2: number;
  differencePercent: number;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Duvar katmanları ayrı modellendiğinde zemin kaplaması alanının nasıl daraldığını
 * tek bir dikdörtgen oda için hesaplar: (L − 2t)(W − 2t) ile L × W karşılaştırılır.
 * Bu yalnızca verilen tek odanın aritmetiğidir; bir projenin toplam sapmasını tahmin etmez.
 */
export function computeFinishLayerShrinkage(input: FinishLayerShrinkageInput): FinishLayerShrinkageResult | null {
  const { lengthM, widthM, wallLayerThicknessCm } = input;
  if (![lengthM, widthM, wallLayerThicknessCm].every((v) => Number.isFinite(v))) return null;
  if (lengthM <= 0 || widthM <= 0 || wallLayerThicknessCm < 0) return null;
  const t = wallLayerThicknessCm / 100;
  if (lengthM <= 2 * t || widthM <= 2 * t) return null;
  const net = lengthM * widthM;
  const modeled = (lengthM - 2 * t) * (widthM - 2 * t);
  return {
    netAreaM2: round(net, 2),
    modeledFloorAreaM2: round(modeled, 2),
    differenceM2: round(net - modeled, 2),
    differencePercent: round(((net - modeled) / net) * 100, 2),
  };
}
