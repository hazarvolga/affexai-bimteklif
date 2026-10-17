/**
 * 4735 Sayılı Kamu İhale Sözleşmeleri Kanunu — Yapım İşlerinde Uygulanacak
 * Fiyat Farkına İlişkin Esaslar & ÇŞB 2026 – TÜİK 21 Alt Endeks Güncelleme Motoru
 *
 * Resmi Dayanaklar:
 * 1. 4735 Sayılı Kamu İhale Sözleşmeleri Kanunu Madde 8 & Cumhurbaşkanı Kararı
 *    "4734 Sayılı Kamu İhale Kanununa Göre İhale Edilen Yapım İşlerinde
 *    Uygulanacak Fiyat Farkına İlişkin Esaslar":
 *      F = A_n × B × (P_n - 1)
 *      P_n = a × (İ_n / İ_0) + b_1 × (Ç_n / Ç_0) + b_2 × (D_n / D_0) + ... + c × (M_n / M_0)
 *    Burada:
 *      - A_n : Uygulama ayında gerçekleşen imalat/hakediş tutarı (TL)
 *      - B   : Sözleşme katsayısı (resmî standart değer: 0,90)
 *      - P_n : Fiyat farkı katsayısı (ağırlıklar toplamı Σw_i = 1,00)
 *      - E_0 : İhalenin yapıldığı aya ait temel endeks
 *      - E_n : Hakedişin/uygulamanın yapıldığı aya ait güncel endeks
 *
 * 2. T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yüksek Fen Kurulu
 *    2026 Ocak Rayiç – TÜİK Endeks Eşleştirme Tablosu (TÜFE 2023=100 & Yİ-ÜFE 21 Alt Endeks)
 *    (SHA-256: 3519e5a631d6043b72e7637e1521456f1da00e7a794f39655cc5c628ae76d93e)
 *
 * Sıfır Uydurma Girdi Kuralı:
 * - Temel endeks (E_0) ve güncel endeks (E_n) kullanıcı veya resmi endeks
 *   tablosu tarafından açıkça verilmelidir; sahte/sabit enflasyon oranı uydurulmaz.
 * - Dönem dışı (ör. Mart 2026 geçerliliği dolmuş) birim fiyatlar TÜİK alt endeksiyle
 *   güncellendiğinde sonuç açıkça `TUIK_INDEXED_ESTIMATE` ("TÜİK Endeksiyle
 *   Güncellenmiş Tahmini Birim Fiyat") olarak işaretlenir; resmî YFK tebliği
 *   olarak sunulmaz.
 */

export type TuikSubIndexCode =
  | 'TUIK-TUFE-GENEL'
  | 'TUIK-08.1-TAS-KUM'
  | 'TUIK-16.1-KERESTE'
  | 'TUIK-19-BITUM-EPS'
  | 'TUIK-20.3-BOYA'
  | 'TUIK-22.2-PLASTIK-BORU'
  | 'TUIK-23.1-CAM'
  | 'TUIK-23.3-TUGLA-SERAMIK'
  | 'TUIK-23.4-VITRIFIYE'
  | 'TUIK-23.5-CIMENTO-KIREC'
  | 'TUIK-23.6-HAZIR-BETON'
  | 'TUIK-23.7-MERMER-DOGAL-TAS'
  | 'TUIK-24.1-DEMIR-CELIK'
  | 'TUIK-24.2-CELIK-BORU'
  | 'TUIK-25.1-YAPISAL-METAL'
  | 'TUIK-25.2-KAZAN-RADYATOR'
  | 'TUIK-27.1-ELEKTRIK-PANO'
  | 'TUIK-27.3-KABLO'
  | 'TUIK-27.4-AYDINLATMA'
  | 'TUIK-28.1-POMPA-VANA'
  | 'TUIK-28.2-KLIMA-HAVALANDIRMA';

export interface TuikSubIndexDefinition {
  code: TuikSubIndexCode;
  tuikSectorCode: string;
  title: string;
  rayicScope: string;
  discipline: 'ARC' | 'STR' | 'MEP' | 'LABOR';
}

export const CSB_2026_TUIK_SUB_INDICES: readonly TuikSubIndexDefinition[] = [
  {
    code: 'TUIK-TUFE-GENEL',
    tuikSectorCode: 'TÜFE (2023=100)',
    title: 'TÜFE Tüketici Fiyat Endeksi Genel (İşçilik)',
    rayicScope: 'İşçilik Rayiçleri (10.100.1001–1062)',
    discipline: 'LABOR',
  },
  {
    code: 'TUIK-08.1-TAS-KUM',
    tuikSectorCode: 'Yİ-ÜFE 08.1',
    title: 'Taş, Kum ve Kil Ocakçılığı Endeksi',
    rayicScope: 'Kum, Çakıl, Kırmataş ve Agrega Rayiçleri',
    discipline: 'STR',
  },
  {
    code: 'TUIK-16.1-KERESTE',
    tuikSectorCode: 'Yİ-ÜFE 16.1',
    title: 'Ağaçların Biçilmesi ve Planyalanması Endeksi',
    rayicScope: 'Ahşap Kalıp ve Kereste Rayiçleri',
    discipline: 'STR',
  },
  {
    code: 'TUIK-19-BITUM-EPS',
    tuikSectorCode: 'Yİ-ÜFE 19',
    title: 'Kok ve Rafine Petrol Ürünleri Endeksi',
    rayicScope: 'Bitüm, Su Yalıtımı ve EPS/XPS Isı Yalıtım Levhaları',
    discipline: 'ARC',
  },
  {
    code: 'TUIK-20.3-BOYA',
    tuikSectorCode: 'Yİ-ÜFE 20.3',
    title: 'Boya, Vernik ve Benzeri Kaplayıcı Maddeler Endeksi',
    rayicScope: 'Boya, Vernik, Astar ve Yapı Kimyasalları',
    discipline: 'ARC',
  },
  {
    code: 'TUIK-22.2-PLASTIK-BORU',
    tuikSectorCode: 'Yİ-ÜFE 22.2',
    title: 'Plastik Ürünler Endeksi',
    rayicScope: 'PE, HDPE, PP-R ve PVC Boru / Profil Rayiçleri',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-23.1-CAM',
    tuikSectorCode: 'Yİ-ÜFE 23.1',
    title: 'Cam ve Cam Ürünleri Endeksi',
    rayicScope: 'Düz Cam, Isıcam ve Temperli Cam Rayiçleri',
    discipline: 'ARC',
  },
  {
    code: 'TUIK-23.3-TUGLA-SERAMIK',
    tuikSectorCode: 'Yİ-ÜFE 23.3',
    title: 'Kilden İnşaat Malzemeleri Endeksi',
    rayicScope: 'Tuğla, Kiremit, Seramik ve Porselen Kaplama',
    discipline: 'ARC',
  },
  {
    code: 'TUIK-23.4-VITRIFIYE',
    tuikSectorCode: 'Yİ-ÜFE 23.4',
    title: 'Diğer Porselen ve Seramik Ürünler Endeksi',
    rayicScope: 'Mekanik Vitrifiye (Lavabo, Klozet, Eviye — 20.100.xxxx)',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-23.5-CIMENTO-KIREC',
    tuikSectorCode: 'Yİ-ÜFE 23.5',
    title: 'Çimento, Kireç ve Alçı Endeksi',
    rayicScope: 'Portland Çimentosu (CEM I/II 42.5), Kireç ve Alçı (10.130.xxxx)',
    discipline: 'STR',
  },
  {
    code: 'TUIK-23.6-HAZIR-BETON',
    tuikSectorCode: 'Yİ-ÜFE 23.6',
    title: 'Beton, Çimento ve Alçıdan Eşyalar Endeksi',
    rayicScope: 'Hazır Beton (C16/20–C50/60) ve Gazbeton / Beton Elemanlar',
    discipline: 'STR',
  },
  {
    code: 'TUIK-23.7-MERMER-DOGAL-TAS',
    tuikSectorCode: 'Yİ-ÜFE 23.7',
    title: 'Taş (Kesilmiş ve Şekil Verilmiş) Endeksi',
    rayicScope: 'Mermer, Traverten, Granit ve Doğaltaş Rayiçleri (10.240.xxxx)',
    discipline: 'ARC',
  },
  {
    code: 'TUIK-24.1-DEMIR-CELIK',
    tuikSectorCode: 'Yİ-ÜFE 24.1',
    title: 'Ana Demir-Çelik ve Ferro Alaşımlar Endeksi',
    rayicScope: 'Nervürlü Beton Çeliği (Ø8–Ø32), Çelik Hasır ve Profil',
    discipline: 'STR',
  },
  {
    code: 'TUIK-24.2-CELIK-BORU',
    tuikSectorCode: 'Yİ-ÜFE 24.2',
    title: 'Çelikten Tüpler ve Borular Endeksi',
    rayicScope: 'Çelik Boru, İçi Boş Profiller ve Bağlantı Parçaları',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-25.1-YAPISAL-METAL',
    tuikSectorCode: 'Yİ-ÜFE 25.1',
    title: 'Yapısal Metal Ürünler Endeksi',
    rayicScope: 'Metal Kapı, Pencere, Korkuluk ve Yapısal Çelik',
    discipline: 'ARC',
  },
  {
    code: 'TUIK-25.2-KAZAN-RADYATOR',
    tuikSectorCode: 'Yİ-ÜFE 25.2',
    title: 'Metal Tank, Rezervuar ve Radyatör Endeksi',
    rayicScope: 'Merkezi Isıtma Radyatörleri ve Buhar/Sıcak Su Kazanları',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-27.1-ELEKTRIK-PANO',
    tuikSectorCode: 'Yİ-ÜFE 27.1',
    title: 'Elektrik Dağıtım ve Kontrol Cihazları Endeksi',
    rayicScope: 'Dikili Tip Galvaniz Sac Panolar, Şalter ve Transformatörler',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-27.3-KABLO',
    tuikSectorCode: 'Yİ-ÜFE 27.3',
    title: 'Kablo ve Teller Endeksi',
    rayicScope: 'Enerji, Zayıf Akım, Fiber Optik Kablolar ve Tesisat Donanımı',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-27.4-AYDINLATMA',
    tuikSectorCode: 'Yİ-ÜFE 27.4',
    title: 'Elektrikli Aydınlatma Ekipmanları Endeksi',
    rayicScope: 'LED Armatürler ve Elektrikli Aydınlatma Ekipmanları',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-28.1-POMPA-VANA',
    tuikSectorCode: 'Yİ-ÜFE 28.1',
    title: 'Genel Amaçlı Makineler Endeksi',
    rayicScope: 'Sirkülasyon Pompaları, Hidroforlar, Vanalar ve Armatürler',
    discipline: 'MEP',
  },
  {
    code: 'TUIK-28.2-KLIMA-HAVALANDIRMA',
    tuikSectorCode: 'Yİ-ÜFE 28.2',
    title: 'Diğer Genel Amaçlı Makineler Endeksi',
    rayicScope: 'Klima Santralleri, Fanlar, Chiller ve Asansör Sistemleri',
    discipline: 'MEP',
  },
] as const;

export interface EscalationComponentInput {
  indexCode: TuikSubIndexCode;
  /** Ağırlık katsayısı (w_i), tüm bileşenlerin toplamı 1,00 olmalıdır */
  weight: number;
  /** İhale / baz ayındaki temel endeks (E_0) */
  baseIndex: number;
  /** Hakediş / uygulama ayındaki güncel endeks (E_n) */
  currentIndex: number;
}

export interface ContractEscalation4735Input {
  /** Uygulama ayında gerçekleşen hakediş tutarı (A_n, TL) */
  progressPaymentAmountTl: number;
  /** Sözleşme B katsayısı (standart: 0,90) */
  bFactor?: number;
  /** Ağırlıklı TÜİK alt endeks bileşenleri (Σw_i = 1,00) */
  components: EscalationComponentInput[];
}

export interface EscalationComponentBreakdown {
  indexCode: TuikSubIndexCode;
  title: string;
  weight: number;
  baseIndex: number;
  currentIndex: number;
  ratio: number;
  weightedContribution: number;
}

export interface ContractEscalation4735Result {
  regulationReference: string;
  progressPaymentAmountTl: number;
  bFactor: number;
  totalWeight: number;
  /** P_n katsayısı (6 ondalık basamak gösterim için) */
  pnFactor: number;
  /** (P_n - 1) değişim oranı */
  pnMinusOne: number;
  /** F = A_n × B × (P_n - 1) fiyat farkı tutarı (TL, kuruş hassasiyetli) */
  priceDifferenceTl: number;
  /** A_n + F güncel toplam hakediş tutarı (TL) */
  adjustedTotalTl: number;
  /** Efektif yüzde artış oranı (%) */
  effectiveEscalationPct: number;
  components: EscalationComponentBreakdown[];
  formulaSummary: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
}

/**
 * Poz kodu veya imalat tanımına göre 21 resmi ÇŞB-TÜİK alt endeksinden en uygun olanını eşleştirir.
 */
export function resolveTuikSubIndexForPoz(pozCodeOrLabel: string): TuikSubIndexDefinition {
  const text = (pozCodeOrLabel || '').toUpperCase();

  if (/15\.180|KALIP|KERESTE|AHŞAP|AHSAP/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-16.1-KERESTE')!;
  }
  if (/15\.160|DEMİR|DEMIR|DONATI|ÇELİK HASIR|B420C|B500C/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-24.1-DEMIR-CELIK')!;
  }
  if (/15\.150|BETON|C25|C30|C35|GROBETON|(?<![A-ZÇĞİÖŞÜ])ŞAP|(?<![A-ZÇĞİÖŞÜ])SAP/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-23.6-HAZIR-BETON')!;
  }
  if (/SIVA|ALÇI|ALCI|ÇİMENTO|CIMENTO|10\.130/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-23.5-CIMENTO-KIREC')!;
  }
  if (/BOYA|ASTAR|VERNİK|VERNIK/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-20.3-BOYA')!;
  }
  if (/SERAMİK|SERAMIK|FAYANS|TUĞLA|TUGLA|KİREMİT/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-23.3-TUGLA-SERAMIK')!;
  }
  if (/MERMER|GRANİT|GRANIT|TRAVERTEN|DOĞALTAŞ/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-23.7-MERMER-DOGAL-TAS')!;
  }
  if (/XPS|EPS|BİTÜM|BITUM|YALITIM|MEMBRAN/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-19-BITUM-EPS')!;
  }
  if (/CAM|ISICAM/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-23.1-CAM')!;
  }
  if (/35\.|KABLO|İLETKEN|ILETKEN/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-27.3-KABLO')!;
  }
  if (/PANO|ŞALTER|SALTER|TRAFO/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-27.1-ELEKTRIK-PANO')!;
  }
  if (/ARMATÜR|ARMATUR|AYDINLATMA|LED/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-27.4-AYDINLATMA')!;
  }
  if (/25\.|BORU|PPR|PVC|HDPE/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-22.2-PLASTIK-BORU')!;
  }
  if (/RADYATÖR|RADYATOR|KAZAN|BOYLER/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-25.2-KAZAN-RADYATOR')!;
  }
  if (/POMPA|HİDROFOR|VANA/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-28.1-POMPA-VANA')!;
  }
  if (/KLİMA|KLIMA|HAVALANDIRMA|FAN|ASANSÖR/.test(text)) {
    return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-28.2-KLIMA-HAVALANDIRMA')!;
  }
  return CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === 'TUIK-TUFE-GENEL')!;
}

/**
 * 4735 Sayılı Kamu İhale Sözleşmeleri Kanunu Yapım İşleri Fiyat Farkı Hesabı:
 *   F = A_n × B × (P_n - 1)
 */
export function computeContractPriceEscalation4735(
  input: ContractEscalation4735Input,
): ContractEscalation4735Result {
  const { progressPaymentAmountTl, components } = input;
  const bFactor = input.bFactor ?? 0.9;

  if (!Number.isFinite(progressPaymentAmountTl) || progressPaymentAmountTl < 0) {
    throw new Error('Hakediş tutarı (A_n) sıfır veya pozitif bir sayı olmalıdır.');
  }
  if (!Number.isFinite(bFactor) || bFactor <= 0 || bFactor > 1.5) {
    throw new Error('B katsayısı geçerli bir pozitif katsayı olmalıdır (standart: 0,90).');
  }
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('En az bir TÜİK alt endeks bileşeni tanımlanmalıdır.');
  }

  let totalWeight = 0;
  let pnExact = 0;
  const breakdowns: EscalationComponentBreakdown[] = [];

  for (const comp of components) {
    if (!Number.isFinite(comp.weight) || comp.weight < 0) {
      throw new Error(`Alt endeks ağırlığı (${comp.indexCode}) negatif olamaz.`);
    }
    if (!Number.isFinite(comp.baseIndex) || comp.baseIndex <= 0) {
      throw new Error(`Temel endeks E_0 (${comp.indexCode}) sıfırdan büyük olmalıdır.`);
    }
    if (!Number.isFinite(comp.currentIndex) || comp.currentIndex <= 0) {
      throw new Error(`Güncel endeks E_n (${comp.indexCode}) sıfırdan büyük olmalıdır.`);
    }

    const def = CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === comp.indexCode);
    const ratioExact = comp.currentIndex / comp.baseIndex;
    const weightedExact = comp.weight * ratioExact;
    totalWeight += comp.weight;
    pnExact += weightedExact;

    breakdowns.push({
      indexCode: comp.indexCode,
      title: def?.title ?? comp.indexCode,
      weight: round6(comp.weight),
      baseIndex: round6(comp.baseIndex),
      currentIndex: round6(comp.currentIndex),
      ratio: round6(ratioExact),
      weightedContribution: round6(weightedExact),
    });
  }

  if (Math.abs(totalWeight - 1.0) > 0.0001) {
    throw new Error(
      `4735 Fiyat Farkı Esasları uyarınca ağırlık katsayıları toplamı 1,00 olmalıdır (mevcut: ${totalWeight.toFixed(4)}).`,
    );
  }

  const pnMinusOneExact = pnExact - 1.0;
  const priceDifferenceTl = round2(progressPaymentAmountTl * bFactor * pnMinusOneExact);
  const adjustedTotalTl = round2(progressPaymentAmountTl + priceDifferenceTl);
  const effectiveEscalationPct =
    progressPaymentAmountTl > 0
      ? round2((priceDifferenceTl / progressPaymentAmountTl) * 100)
      : round2(bFactor * pnMinusOneExact * 100);

  return {
    regulationReference:
      '4735 Sayılı Kamu İhale Sözleşmeleri Kanunu m.8 — Yapım İşlerinde Uygulanacak Fiyat Farkına İlişkin Esaslar & ÇŞB 2026 – TÜİK 21 Alt Endeks Tablosu',
    progressPaymentAmountTl: round2(progressPaymentAmountTl),
    bFactor: round6(bFactor),
    totalWeight: round6(totalWeight),
    pnFactor: round6(pnExact),
    pnMinusOne: round6(pnMinusOneExact),
    priceDifferenceTl,
    adjustedTotalTl,
    effectiveEscalationPct,
    components: breakdowns,
    formulaSummary: `F = ${round2(progressPaymentAmountTl).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} × ${bFactor.toFixed(2)} × (${round6(pnExact).toFixed(6)} - 1) = ${priceDifferenceTl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`,
  };
}

export interface OutOfPeriodUnitPriceInput {
  itemCode: string;
  itemName: string;
  baseUnitPriceTl: number;
  catalogValidityEnd: string;
  evaluationDate: string;
  indexCode?: TuikSubIndexCode;
  baseIndex: number;
  currentIndex: number;
}

export interface OutOfPeriodUnitPriceResult {
  itemCode: string;
  itemName: string;
  baseUnitPriceTl: number;
  indexedUnitPriceTl: number;
  indexCode: TuikSubIndexCode;
  indexTitle: string;
  baseIndex: number;
  currentIndex: number;
  escalationRatio: number;
  isCatalogExpired: boolean;
  priceOrigin: 'OFFICIAL_PERIOD_VALID' | 'TUIK_INDEXED_ESTIMATE';
  warningLabel: string | null;
}

/**
 * Geçerlilik süresi dolmuş aylık ÇŞB birim fiyatını (ör. Mart 2026) eşleşen
 * TÜİK alt endeksiyle hedef döneme taşır ve sonucu açıkça `TUIK_INDEXED_ESTIMATE`
 * olarak işaretler.
 */
export function indexOutOfPeriodUnitPrice(
  input: OutOfPeriodUnitPriceInput,
): OutOfPeriodUnitPriceResult {
  if (!Number.isFinite(input.baseUnitPriceTl) || input.baseUnitPriceTl < 0) {
    throw new Error('Baz birim fiyat sıfır veya pozitif olmalıdır.');
  }
  if (!Number.isFinite(input.baseIndex) || input.baseIndex <= 0) {
    throw new Error('Temel endeks (E_0) sıfırdan büyük olmalıdır.');
  }
  if (!Number.isFinite(input.currentIndex) || input.currentIndex <= 0) {
    throw new Error('Güncel endeks (E_n) sıfırdan büyük olmalıdır.');
  }

  const matchedDef = input.indexCode
    ? CSB_2026_TUIK_SUB_INDICES.find((x) => x.code === input.indexCode) ??
      resolveTuikSubIndexForPoz(`${input.itemCode} ${input.itemName}`)
    : resolveTuikSubIndexForPoz(`${input.itemCode} ${input.itemName}`);

  const isCatalogExpired = input.evaluationDate > input.catalogValidityEnd;
  const escalationRatioExact = input.currentIndex / input.baseIndex;
  const indexedUnitPriceTl = isCatalogExpired
    ? round2(input.baseUnitPriceTl * escalationRatioExact)
    : round2(input.baseUnitPriceTl);

  return {
    itemCode: input.itemCode,
    itemName: input.itemName,
    baseUnitPriceTl: round2(input.baseUnitPriceTl),
    indexedUnitPriceTl,
    indexCode: matchedDef.code,
    indexTitle: matchedDef.title,
    baseIndex: round6(input.baseIndex),
    currentIndex: round6(input.currentIndex),
    escalationRatio: round6(escalationRatioExact),
    isCatalogExpired,
    priceOrigin: isCatalogExpired ? 'TUIK_INDEXED_ESTIMATE' : 'OFFICIAL_PERIOD_VALID',
    warningLabel: isCatalogExpired
      ? `TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat (${matchedDef.tuikSectorCode} · E_n/E_0 = ${round6(escalationRatioExact).toFixed(4)} — Resmî YFK Tebliği Değildir)`
      : null,
  };
}
