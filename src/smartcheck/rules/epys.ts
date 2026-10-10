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
}

export interface IfcElementData {
  id: string;
  type: IfcClassName | string;
  properties: Record<string, any>; // format: Pset_Name.PropertyName -> value
}

export interface EpysRuleInput {
  complianceData: TrPsetCsbProjectCompliance;
  pozExtraction: ElementPozNoExtraction;
  totalElementsCount: number;
  elementsData?: IfcElementData[];
  materialNames?: string[]; 
  spaceNames?: string[];
}

export function validateEpysRules(input: EpysRuleInput): EpysValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let penaltyPoints = 0;

  // KURAL 1: TREpys_ParselOzellikSeti (TAKS / KAKS) Zorunluluğu
  if (!input.complianceData.source) {
    errors.push("[EK-7 İhlali] Proje verilerinde e-PYS zorunlu parsel özellik seti (TREpys_ParselOzellikSeti) bulunamadı. TAKS, KAKS ve Çekme Mesafeleri tanımlanmalıdır.");
    penaltyPoints += 40;
  } else {
    if (input.complianceData.taks === undefined) {
      errors.push("[EK-7 İhlali] TREpys_ParselOzellikSeti.TAKS değeri tanımlanmamış.");
      penaltyPoints += 10;
    }
    if (input.complianceData.kaks === undefined) {
      errors.push("[EK-7 İhlali] TREpys_ParselOzellikSeti.KAKS değeri tanımlanmamış.");
      penaltyPoints += 10;
    }
  }

  // KURAL 2: Ek-6 Poz Numarası
  const elementsWithPozNo = input.pozExtraction.pozNoByStepId.size;
  if (input.totalElementsCount > 0 && elementsWithPozNo === 0) {
    errors.push("[EK-6 İhlali] Modeldeki hiçbir elemanda ÇŞB Poz Numarası (CSBPozNo) tanımlı değil. Otonom e-PYS metraj (QTO) hesaplanamaz.");
    penaltyPoints += 50;
  } else if (input.totalElementsCount > 0 && elementsWithPozNo < input.totalElementsCount) {
    const missingRatio = ((input.totalElementsCount - elementsWithPozNo) / input.totalElementsCount) * 100;
    if (missingRatio > 5) {
      warnings.push(`[EK-6 Uyarısı] Model elemanlarının %${missingRatio.toFixed(1)}'inde CSBPozNo eksik. (Hakedişte kesinti yaşanabilir)`);
      penaltyPoints += missingRatio;
    }
  }

  // KURAL 3: Malzeme İsimlendirmesi (15 Karakter Sınırı)
  if (input.materialNames) {
    const invalidMaterials = input.materialNames.filter(m => m.length > 15);
    if (invalidMaterials.length > 0) {
      errors.push(`[Madde 12 İhlali] Modelde 15 karakter sınırını aşan malzeme isimleri bulundu (${invalidMaterials.length} adet). Örn: ${invalidMaterials[0]}`);
      penaltyPoints += 20;
    }
  }

  // KURAL 4: Ek-3 Mahal İsimlendirme Standartları
  if (input.spaceNames) {
    const spaceFormatRegex = /^[A-Z0-9ÇŞĞÜÖİçşğüöı]+_[A-Z0-9ÇŞĞÜÖİçşğüöı]+_[0-9]+$/; 
    const invalidSpaces = input.spaceNames.filter(s => !spaceFormatRegex.test(s));
    if (invalidSpaces.length > 0) {
      warnings.push(`[EK-3 Uyarısı] ${invalidSpaces.length} adet IfcSpace (Mahal) isimlendirmesi standart formata uymuyor. Örn: ${invalidSpaces[0]}`);
      penaltyPoints += 10;
    }
  }

  // KURAL 5: Ek-6 Sınıf ve Parametre Doğrulaması (Yeni AI BIM Director Kontrolü)
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
      errors.push(`[EK-6 İhlali] Model elemanlarında toplam ${missingMandatoryCount} adet zorunlu e-PYS özelliği eksik (Örn: FireRating, LoadBearing).`);
      penaltyPoints += Math.min(30, missingMandatoryCount * 2);
    }
  }

  const score = Math.max(0, 100 - Math.round(penaltyPoints));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score,
    label: "Teknik Ön-Kontrol (e-PYS)",
    rulePackVersion: "epys-2024-ek6-v1",
    sourceCitation: "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı e-PYS Teknik Kılavuzu (Ek-3, Ek-6, Ek-7)",
  };
}
