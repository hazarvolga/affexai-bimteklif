import { TrPsetCsbProjectCompliance } from "../../ifc/types";
import { ElementPozNoExtraction } from "../../ifc/parser/tr-pset-csb-extractor";
import { Ek6Dictionary, IfcClassName } from "./ek6-dictionary";

export interface EpysValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  label: string;
  rulePackVersion: string;
  sourceCitation: string;
  /** What this quick check covers; the full EK-9 pre-check runs server-side in the IFC worker. */
  scope: { checked: string[]; notChecked: string[] };
}

const SCOPE = {
  checked: [
    "m.12(2) & EK-6 Tablo 6.55: TREpys_ParselOzellikSeti (TAKS, KAKS, CekmeOn, CekmeYan, CekmeArka) varlığı",
    "m.12(2) & EK-6: Malzeme İsmi_Dayanım (örn. Beton_C25, Çelik_S355) formatı ve 15 karakter CAD şablon uyumu",
    "m.10(2) & EK-3 Tablo 3.1: Mahal numarası (Kat_Bölüm_SıraNo) biçimi",
    "5D BIM Metraj Köprüsü: TREpys_PozOzellikSeti.PozNo (CSBPozNo) eleman kapsamı (bilgi/uyarı)",
  ],
  notChecked: [
    "m.15 & EK-9 Model Kalite Kontrol Formunun tamamı — Tablo 9.1 (Mimari, 21 satır) ve Tablo 9.2 (Diğer disiplinler, 16 satır) sunucu tarafı IFC ön kontrolünde çalıştırılır",
    "m.12(1) & EK-5 zorunlu sınıf listesi (69 sınıf) ve EK-6'daki 68 tablonun tamamı",
    "m.13 & EK-7 proje, kişi, kurum, CRS koordinat (Tablo 7.1–7.9) bilgileri",
    "m.14 & EK-8 LOD 300 (Detaylı Modelleme), dosya boyutu ve PDF/A–IFC tutarlılığı (elle değerlendirilir)",
  ],
};

export interface IfcElementData {
  id: string;
  type: IfcClassName | string;
  properties: Record<string, any>; // format: Pset_Name.PropertyName -> value
}

export interface EpysRuleInput {
  complianceData?: TrPsetCsbProjectCompliance;
  /** Canonical RG 33331 EK-9 alias for complianceData. */
  epysEk9?: TrPsetCsbProjectCompliance;
  /** Browser path: per-element poz map. Server path passes elementsWithPozNoCount instead. */
  pozExtraction?: ElementPozNoExtraction;
  elementsWithPozNoCount?: number;
  totalElementsCount: number;
  elementsData?: IfcElementData[];
  materialNames?: string[]; 
  spaceNames?: string[];
}

export function validateEpysRules(input: EpysRuleInput): EpysValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let penaltyPoints = 0;
  const compliance = input.epysEk9 ?? input.complianceData ?? { source: null };

  // KURAL 1: TREpys_ParselOzellikSeti — RG 33331 m.12(2) & EK-6 Tablo 6.55 (IfcSite)
  if (!compliance.source) {
    errors.push("[m.12 / EK-6 Tablo 6.55] IfcSite üzerinde TREpys_ParselOzellikSeti bulunamadı. TAKS, KAKS, CekmeOn, CekmeYan ve CekmeArka tanımlanmalıdır.");
    penaltyPoints += 40;
  } else {
    for (const [key, name] of [["taks", "TAKS"], ["kaks", "KAKS"], ["cekmeOn", "CekmeOn"], ["cekmeYan", "CekmeYan"], ["cekmeArka", "CekmeArka"]] as const) {
      const value = compliance[key] as number | null | undefined;
      if (value === undefined || value === null) {
        errors.push(`[m.12 / EK-6 Tablo 6.55] TREpys_ParselOzellikSeti.${name} değeri tanımlanmamış.`);
        penaltyPoints += 10;
      }
    }
  }

  // KURAL 2: 5D BIM Metraj Köprüsü (TREpys_PozOzellikSeti.PozNo / CSBPozNo)
  // Not: Resmi EKLER.pdf (EK-6 Tablo 6.1–6.68) kapsamında PozNo ruhsat zorunluluğu değildir;
  // BIMMetraj 5D otomatik keşif/maliyet köprüsü için uyarı olarak raporlanır.
  const elementsWithPozNo = input.elementsWithPozNoCount ?? input.pozExtraction?.pozNoByStepId.size ?? 0;
  if (input.totalElementsCount > 0 && elementsWithPozNo === 0) {
    warnings.push("[5D Metraj Köprüsü Uyarısı] Modeldeki hiçbir elemanda ÇŞB Poz Numarası (CSBPozNo / TREpys_PozOzellikSeti.PozNo) tanımlı değil. Resmi EK-6 ruhsat teslimi için zorunlu değildir ancak otonom 5D maliyet eşleştirmesi için önerilir.");
    penaltyPoints += 15;
  } else if (input.totalElementsCount > 0 && elementsWithPozNo < input.totalElementsCount) {
    const missingRatio = ((input.totalElementsCount - elementsWithPozNo) / input.totalElementsCount) * 100;
    if (missingRatio > 5) {
      warnings.push(`[5D Metraj Köprüsü Uyarısı] Model elemanlarının %${missingRatio.toFixed(1)}'inde CSBPozNo eksik (otonom 5D keşif eşleştirmesinde manuel atama gerektirir).`);
      penaltyPoints += Math.min(15, missingRatio * 0.15);
    }
  }

  // KURAL 3: Malzeme İsimlendirmesi — m.12(2) & EK-6 'Malzeme İsmi_Dayanım' formatı + 15 karakter CAD şablon kontrolü
  if (input.materialNames) {
    const missingStrengthFormat = input.materialNames.filter(m => !m.includes("_"));
    if (missingStrengthFormat.length > 0) {
      warnings.push(`[m.12 / EK-6 Malzeme Uyarısı] ${missingStrengthFormat.length} adet malzeme adı 'Malzeme İsmi_Dayanım' (örn. Beton_C25, Çelik_S355) biçiminde değil. Örn: ${missingStrengthFormat[0]}`);
      penaltyPoints += 10;
    }
    const invalidMaterials = input.materialNames.filter(m => m.length > 15);
    if (invalidMaterials.length > 0) {
      errors.push(`[EK-6 / CAD Şablon İhlali] Modelde 15 karakter malzeme kodu sınırını aşan malzeme isimleri bulundu (${invalidMaterials.length} adet). Örn: ${invalidMaterials[0]}`);
      penaltyPoints += 20;
    }
  }

  // KURAL 4: m.10(2) & EK-3 Tablo 3.1 Mahal İsimlendirme Standartları
  if (input.spaceNames) {
    const spaceFormatRegex = /^(B\d{2}|K\d{2}|NNN)_[A-Z0-9ÇŞĞÜÖİçşğüöı]{3}_\d{3}$/;
    const invalidSpaces = input.spaceNames.filter(s => !spaceFormatRegex.test(s));
    if (invalidSpaces.length > 0) {
      warnings.push(`[m.10 / EK-3 Uyarısı] ${invalidSpaces.length} adet IfcSpace (Mahal) numarası EK-3 Tablo 3.1 (Kat_Bölüm_SıraNo, örn. K00_DAI_001) şablonuna uymuyor. Örn: ${invalidSpaces[0]}`);
      penaltyPoints += 10;
    }
  }

  // KURAL 5: m.12(2) & EK-6 Sınıf ve Parametre Doğrulaması
  if (input.elementsData) {
    let missingMandatoryCount = 0;
    for (const el of input.elementsData) {
      const typeStr = el.type as IfcClassName;
      if (Ek6Dictionary[typeStr]) {
        for (const rule of Ek6Dictionary[typeStr]) {
          const propKey = `${rule.propertySet}.${rule.propertyName}`;
          if (rule.isRequired && el.properties[propKey] === undefined) {
            missingMandatoryCount++;
          }
        }
      }
    }
    if (missingMandatoryCount > 0) {
      errors.push(`[m.12 / EK-6 İhlali] Model elemanlarında toplam ${missingMandatoryCount} adet zorunlu EK-6 özelliği eksik (Örn: FireRating, IsExternal, LoadBearing).`);
      penaltyPoints += Math.min(30, missingMandatoryCount * 2);
    }
  }

  const score = Math.max(0, 100 - Math.round(penaltyPoints));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score,
    label: "Hızlı e-PYS ön kontrolü (sınırlı kapsam)",
    rulePackVersion: "epys-quick-2026-10-v2",
    sourceCitation: "Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik, RG 5.8.2026/33331, m.10–15 ve EK-6 Tablo 6.55; resmî uygunluk kararı değildir",
    scope: SCOPE,
  };
}
