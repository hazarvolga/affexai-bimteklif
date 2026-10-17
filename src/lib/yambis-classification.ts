/**
 * Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik (RG 2/3/2019-30702; konsolide,
 * son değişiklik 14/5/2026) — yetki belgesi grubu ön değerlendirme motoru.
 *
 * Dayanak (madde numaraları konsolide metne göredir):
 * - m.4(1)(k)  Yapı sınır bedeli: Bakanlıkça her yıl yayımlanan mimarlık ve mühendislik hizmet bedellerinin hesabına esas
 *              yapı sınıflarından III. ve IV. sınıf yapı gruplarının yaklaşık birim maliyetlerinin ortalamasının 45.000 katı.
 * - m.12(2)    Ekonomik ve mali yeterlik (bir önceki yılın bilançosu): cari oran ≥ 0,75; öz kaynak oranı ≥ 0,15;
 *              kısa vadeli banka borçlarının öz kaynaklara oranı < 0,75.
 * - m.12(3)    Banka referans mektubu beyanı: kullanılmamış kredi / kısıtsız mevduat, grubun asgari iş deneyim tutarının ≥ %5'i.
 * - m.12(4)    Ciro: E ve E1 için asgari iş deneyim tutarının ≥ %10'u; daha üst gruplar için ≥ %15'i; daha alt gruplarda aranmaz.
 * - m.14(1)    Grup tanımları: iş deneyim tutarı yapı sınır bedelinin belirli bir katını GEÇEN + yıllık usta ve teknik personel iş gücü.
 * - m.14(3)    Üstlenilebilecek azami iş (yapı yaklaşık maliyeti) sınırları.
 * - m.11(2)    G ve G1 grubunda ekonomik ve mali yeterlikten YALNIZCA banka referans mektubu beyanı istenir (bilanço oranları ve ciro aranmaz).
 * - m.11(3)    H grubunda ekonomik, mali, mesleki ve teknik yeterlik belgesi istenmez.
 *
 * Bu motor ön değerlendirmedir; Bakanlığın başvuru incelemesinin (iş deneyiminin güncellenmesi, iş gücü hesabı, ortaklık
 * kuralları, üç yıllık bilanço ortalaması vb.) yerini tutmaz. Kapsam dışı hükümler `OUT_OF_SCOPE_NOTES` içinde belirtilmiştir.
 */

/** Yapı sınır bedeli çarpanı (m.4(1)(k)). */
export const YAPI_SINIR_BEDELI_MULTIPLIER = 45_000;

export type ContractorGroupCode =
  | 'A' | 'B' | 'B1' | 'C' | 'C1' | 'D' | 'D1' | 'E' | 'E1' | 'F' | 'F1' | 'G' | 'G1' | 'H';

/** Üstten alta sıralıdır; ilk uygun grup "hak edilen" gruptur. */
export const CONTRACTOR_GROUP_ORDER: readonly ContractorGroupCode[] = [
  'A', 'B', 'B1', 'C', 'C1', 'D', 'D1', 'E', 'E1', 'F', 'F1', 'G', 'G1', 'H',
];

interface Fraction { num: number; den: number }

interface GroupDefinition {
  code: ContractorGroupCode;
  /** İş deneyim tutarı yapı sınır bedelinin bu katını GEÇMELİDİR (m.14(1)); H için null. */
  experienceRatio: Fraction | null;
  minUstaIsGucu: number;
  minTeknikPersonelIsGucu: number;
  /** m.14(3): azami iş = asgari iş deneyim tutarı × çarpan; null = sınırsız (A), 'h' = G1 asgari tutarının 5/7'si. */
  maxJobMultiplier: Fraction | 'unlimited' | 'h';
}

const f = (num: number, den = 1): Fraction => ({ num, den });

export const CONTRACTOR_GROUPS: Readonly<Record<ContractorGroupCode, GroupDefinition>> = {
  A:  { code: 'A',  experienceRatio: f(2),        minUstaIsGucu: 50, minTeknikPersonelIsGucu: 8, maxJobMultiplier: 'unlimited' },
  B:  { code: 'B',  experienceRatio: f(7, 5),     minUstaIsGucu: 24, minTeknikPersonelIsGucu: 6, maxJobMultiplier: f(1) },
  B1: { code: 'B1', experienceRatio: f(6, 5),     minUstaIsGucu: 18, minTeknikPersonelIsGucu: 4, maxJobMultiplier: f(1) },
  C:  { code: 'C',  experienceRatio: f(1),        minUstaIsGucu: 12, minTeknikPersonelIsGucu: 3, maxJobMultiplier: f(1) },
  C1: { code: 'C1', experienceRatio: f(5, 6),     minUstaIsGucu: 10, minTeknikPersonelIsGucu: 3, maxJobMultiplier: f(1) },
  D:  { code: 'D',  experienceRatio: f(2, 3),     minUstaIsGucu: 9,  minTeknikPersonelIsGucu: 2, maxJobMultiplier: f(1) },
  D1: { code: 'D1', experienceRatio: f(1, 2),     minUstaIsGucu: 8,  minTeknikPersonelIsGucu: 2, maxJobMultiplier: f(1) },
  E:  { code: 'E',  experienceRatio: f(1, 3),     minUstaIsGucu: 6,  minTeknikPersonelIsGucu: 2, maxJobMultiplier: f(115, 100) },
  E1: { code: 'E1', experienceRatio: f(1, 5),     minUstaIsGucu: 5,  minTeknikPersonelIsGucu: 2, maxJobMultiplier: f(4, 3) },
  F:  { code: 'F',  experienceRatio: f(1, 10),    minUstaIsGucu: 3,  minTeknikPersonelIsGucu: 1, maxJobMultiplier: f(2) },
  F1: { code: 'F1', experienceRatio: f(17, 200),  minUstaIsGucu: 3,  minTeknikPersonelIsGucu: 1, maxJobMultiplier: f(175, 100) },
  G:  { code: 'G',  experienceRatio: f(7, 100),   minUstaIsGucu: 1,  minTeknikPersonelIsGucu: 1, maxJobMultiplier: f(3, 2) },
  G1: { code: 'G1', experienceRatio: f(1, 20),    minUstaIsGucu: 1,  minTeknikPersonelIsGucu: 1, maxJobMultiplier: f(3, 2) },
  H:  { code: 'H',  experienceRatio: null,        minUstaIsGucu: 0,  minTeknikPersonelIsGucu: 0, maxJobMultiplier: 'h' },
};

export const OUT_OF_SCOPE_NOTES: readonly string[] = [
  'İş deneyim tutarı, yönetmeliğin 13. maddesindeki esaslara (benzer iş grupları, güncelleme katsayıları, belge geçerliliği) göre ayrıca belirlenir; bu motor tutarı girdi olarak alır.',
  'Bilanço kriterlerini bir önceki yıl sağlayamayanlar son üç yılın parasal ortalamasını sunabilir (m.12(2)); bu motor tek yılın değerleriyle çalışır.',
  'Ortaklık (ortak girişim) hesapları, kat karşılığı işlerde iş deneyiminin hesabı ve cezalı/iptal durumları kapsam dışıdır.',
  'İş gücü (usta ve teknik personel) sayıları SGK bildirimlerine göre yıllık ortalama olarak belirlenir (m.13); bu motor sayıyı girdi olarak alır.',
];

export interface MaliInput {
  donenVarliklarTry: number;
  kisaVadeliBorclarTry: number;
  ozKaynaklarTry: number;
  toplamAktifTry: number;
  kisaVadeliBankaBorclariTry: number;
}

export interface ContractorInput {
  /** Bakanlıkça o yıl için belirlenen yapı sınır bedeli (TL). Hesap için `computeYapiSinirBedeli` kullanılabilir. */
  yapiSinirBedeliTry: number;
  isDeneyimTutariTry: number;
  yillikUstaIsGucu: number;
  teknikPersonelIsGucu: number;
  mali: MaliInput;
  /** Bir önceki yıla ait toplam ciro veya bu Yönetmelik kapsamındaki işlere ait ciro (TL). */
  cirosuTry: number;
  /** Bankalar nezdinde kullanılmamış nakdi/gayrinakdi kredi veya kısıtsız mevduat (TL); girilmezse bu kriter değerlendirilmez. */
  bankaKrediVeyaMevduatTry?: number;
}

export type CriterionStatus = 'ok' | 'fail' | 'not_evaluated';

export interface CriterionResult {
  id: 'is_deneyimi' | 'usta' | 'teknik_personel' | 'cari_oran' | 'oz_kaynak_orani' | 'banka_borcu_orani' | 'ciro' | 'banka_referans';
  status: CriterionStatus;
  required: string;
  actual: string;
}

export interface GroupEvaluation {
  group: ContractorGroupCode;
  /** Grubun gerektirdiği asgari iş deneyim tutarı (yapı sınır bedeli × katsayı); H için null. */
  minExperienceTry: number | null;
  /** Üstlenilebilecek azami iş (yapı yaklaşık maliyeti) üst sınırı; A için 'unlimited'. */
  maxJobTry: number | 'unlimited';
  eligible: boolean;
  criteria: CriterionResult[];
}

export interface ContractorEvaluation {
  yapiSinirBedeliTry: number;
  ratios: {
    cariOran: number | null;
    ozKaynakOrani: number | null;
    bankaBorcuOzKaynakOrani: number | null;
  };
  groups: GroupEvaluation[];
  /** Tüm kriterleri sağlayan en üst grup (H her zaman uygundur). */
  highestEligibleGroup: ContractorGroupCode;
  notes: readonly string[];
}

/** m.4(1)(k): III. ve IV. sınıf yapı gruplarının yaklaşık birim maliyetlerinin (TL/m²) ortalamasının 45.000 katı. */
export function computeYapiSinirBedeli(thirdAndFourthClassUnitCostsTryPerM2: readonly number[]): number {
  if (thirdAndFourthClassUnitCostsTryPerM2.length === 0 || thirdAndFourthClassUnitCostsTryPerM2.some(v => !Number.isFinite(v) || v <= 0)) {
    throw new RangeError('III. ve IV. sınıf yapı birim maliyetleri pozitif sayılar olmalıdır.');
  }
  const mean = thirdAndFourthClassUnitCostsTryPerM2.reduce((sum, v) => sum + v, 0) / thirdAndFourthClassUnitCostsTryPerM2.length;
  return Math.round(mean * YAPI_SINIR_BEDELI_MULTIPLIER * 100) / 100;
}

function times(base: number, fraction: Fraction): number {
  return (base * fraction.num) / fraction.den;
}

function fmt(n: number): string {
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

export function minExperienceTry(group: ContractorGroupCode, yapiSinirBedeliTry: number): number | null {
  const ratio = CONTRACTOR_GROUPS[group].experienceRatio;
  return ratio ? times(yapiSinirBedeliTry, ratio) : null;
}

export function maxJobTry(group: ContractorGroupCode, yapiSinirBedeliTry: number): number | 'unlimited' {
  const def = CONTRACTOR_GROUPS[group];
  if (def.maxJobMultiplier === 'unlimited') return 'unlimited';
  if (def.maxJobMultiplier === 'h') return times(minExperienceTry('G1', yapiSinirBedeliTry) as number, f(5, 7));
  return times(minExperienceTry(group, yapiSinirBedeliTry) as number, def.maxJobMultiplier);
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function assertInput(input: ContractorInput): void {
  const numbers = [
    input.yapiSinirBedeliTry, input.isDeneyimTutariTry, input.yillikUstaIsGucu, input.teknikPersonelIsGucu, input.cirosuTry,
    input.mali.donenVarliklarTry, input.mali.kisaVadeliBorclarTry, input.mali.ozKaynaklarTry, input.mali.toplamAktifTry, input.mali.kisaVadeliBankaBorclariTry,
  ];
  if (numbers.some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) throw new RangeError('Tüm tutar ve sayılar negatif olmayan sayı olmalıdır.');
  if (input.yapiSinirBedeliTry <= 0) throw new RangeError('Yapı sınır bedeli pozitif olmalıdır.');
}

export function evaluateContractorGroups(input: ContractorInput): ContractorEvaluation {
  assertInput(input);
  const { mali } = input;
  const cariOran = ratio(mali.donenVarliklarTry, mali.kisaVadeliBorclarTry);
  const ozKaynakOrani = ratio(mali.ozKaynaklarTry, mali.toplamAktifTry);
  const bankaBorcuOzKaynakOrani = ratio(mali.kisaVadeliBankaBorclariTry, mali.ozKaynaklarTry);

  // Kısa vadeli borç yoksa cari oran tanımsızdır; borçsuz firma bu kriteri sağlar (payda sıfır).
  const cariOk = mali.kisaVadeliBorclarTry === 0 ? mali.donenVarliklarTry >= 0 : (cariOran ?? 0) >= 0.75;
  const ozKaynakOk = (ozKaynakOrani ?? 0) >= 0.15;
  // Öz kaynak 0 iken banka borcu varsa oran sonsuz kabul edilir (sağlanmaz).
  const bankaOk = mali.ozKaynaklarTry === 0 ? mali.kisaVadeliBankaBorclariTry === 0 : (bankaBorcuOzKaynakOrani ?? 0) < 0.75;

  const groups: GroupEvaluation[] = CONTRACTOR_GROUP_ORDER.map(code => {
    const def = CONTRACTOR_GROUPS[code];
    const minExperience = minExperienceTry(code, input.yapiSinirBedeliTry);
    const criteria: CriterionResult[] = [];

    if (code !== 'H') {
      criteria.push({
        id: 'is_deneyimi',
        status: input.isDeneyimTutariTry > (minExperience as number) ? 'ok' : 'fail',
        required: `> ${fmt(minExperience as number)} TL`,
        actual: `${fmt(input.isDeneyimTutariTry)} TL`,
      });
      criteria.push({
        id: 'usta', status: input.yillikUstaIsGucu >= def.minUstaIsGucu ? 'ok' : 'fail',
        required: `≥ ${def.minUstaIsGucu}`, actual: String(input.yillikUstaIsGucu),
      });
      criteria.push({
        id: 'teknik_personel', status: input.teknikPersonelIsGucu >= def.minTeknikPersonelIsGucu ? 'ok' : 'fail',
        required: `≥ ${def.minTeknikPersonelIsGucu}`, actual: String(input.teknikPersonelIsGucu),
      });
      // m.11(2): G ve G1 için bilanço oranları ve ciro aranmaz; yalnız banka referans mektubu beyanı istenir.
      const balanceSheetApplies = code !== 'G' && code !== 'G1';
      if (balanceSheetApplies) {
        criteria.push({ id: 'cari_oran', status: cariOk ? 'ok' : 'fail', required: '≥ 0,75', actual: cariOran === null ? 'kısa vadeli borç yok' : fmt(cariOran) });
        criteria.push({ id: 'oz_kaynak_orani', status: ozKaynakOk ? 'ok' : 'fail', required: '≥ 0,15', actual: ozKaynakOrani === null ? 'tanımsız' : fmt(ozKaynakOrani) });
        criteria.push({ id: 'banka_borcu_orani', status: bankaOk ? 'ok' : 'fail', required: '< 0,75', actual: bankaBorcuOzKaynakOrani === null ? 'öz kaynak yok' : fmt(bankaBorcuOzKaynakOrani) });
      }

      // m.12(4): E ve E1 için %10; daha üst gruplar (D1 ve yukarısı) için %15; daha alt gruplarda aranmaz.
      const rank = CONTRACTOR_GROUP_ORDER.indexOf(code);
      const e1Rank = CONTRACTOR_GROUP_ORDER.indexOf('E1');
      const turnoverRatio = balanceSheetApplies ? (code === 'E' || code === 'E1' ? 0.10 : rank < e1Rank ? 0.15 : null) : null;
      if (turnoverRatio !== null) {
        const required = (minExperience as number) * turnoverRatio;
        criteria.push({ id: 'ciro', status: input.cirosuTry >= required ? 'ok' : 'fail', required: `≥ ${fmt(required)} TL`, actual: `${fmt(input.cirosuTry)} TL` });
      }

      // m.12(3): kullanılmamış kredi / kısıtsız mevduat ≥ asgari iş deneyim tutarının %5'i.
      if (input.bankaKrediVeyaMevduatTry === undefined) {
        criteria.push({ id: 'banka_referans', status: 'not_evaluated', required: `≥ ${fmt((minExperience as number) * 0.05)} TL`, actual: 'girilmedi' });
      } else {
        const required = (minExperience as number) * 0.05;
        criteria.push({ id: 'banka_referans', status: input.bankaKrediVeyaMevduatTry >= required ? 'ok' : 'fail', required: `≥ ${fmt(required)} TL`, actual: `${fmt(input.bankaKrediVeyaMevduatTry)} TL` });
      }
    }

    const eligible = criteria.every(c => c.status !== 'fail');
    return { group: code, minExperienceTry: minExperience, maxJobTry: maxJobTry(code, input.yapiSinirBedeliTry), eligible, criteria };
  });

  const highest = groups.find(g => g.eligible)?.group ?? 'H';
  return {
    yapiSinirBedeliTry: input.yapiSinirBedeliTry,
    ratios: { cariOran, ozKaynakOrani, bankaBorcuOzKaynakOrani },
    groups,
    highestEligibleGroup: highest,
    notes: OUT_OF_SCOPE_NOTES,
  };
}
