/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

/**
 * Kamuya açık SmartCheck demosunun anlatım sırası (marka.md M-10.2, M-10.4): problem → kaynak satırı →
 * bulgu → öneri → teklife etkisi. Demo durumu localStorage'da saklandığı için anlatım bulgu nesnesinde değil,
 * bulgu kimliğine göre burada tutulur; eski kayıtlı durumlar da aynı metni gösterir.
 * Tüm değerler sentetiktir; resmî poz, mevzuat veya proje verisi değildir.
 */
export interface DemoWalkthrough {
  /** One sentence a contractor recognises: what is wrong in the offer or model. */
  problem: string;
  /** The row the finding comes from, as label/value pairs. */
  sourceRow: ReadonlyArray<readonly [string, string]>;
  /** Current and expected values written with their quantity, not only the unit label. */
  currentLabel: string;
  expectedLabel: string;
  /** What the suggested fix changes and why. */
  fix: string;
  /** Text of the apply button. */
  fixAction: string;
  /** How the fix changes the offer line. */
  quoteImpact: string;
}

export const DEMO_WALKTHROUGH: Readonly<Record<string, DemoWalkthrough>> = {
  'finding-a': {
    problem: 'Teklifte betonarme perde duvar betonu alanla (m²) fiyatlanmış. Beton ise hacimle (m³) ölçülür ve fiyatlanır.',
    sourceRow: [
      ['Teklif satırı', '#1042 · Betonarme perde duvar betonu'],
      ['Teklifteki miktar', '120,00 m²'],
      ['IFC elemanı', 'IfcWall · Perde P-1 · kalınlık 0,20 m'],
      ['Modeldeki net hacim', '24,00 m³'],
    ],
    currentLabel: '120,00 m²',
    expectedLabel: '24,00 m³',
    fix: 'Satırın miktarı modeldeki net hacimden alınır: 120,00 m² × 0,20 m = 24,00 m³. Yalnız birim etiketini m³ yapmak yetmez; miktar da birlikte düzeltilir.',
    fixAction: 'Miktarı 24,00 m³ olarak düzelt',
    quoteImpact: 'Satır 120 yerine 24 birimle fiyatlanır. m³ birim fiyatı 120 ile çarpılsaydı bu kalem 5 kat yüksek çıkardı.',
  },
  'finding-b': {
    problem: 'Modeldeki bir kolonda donatı, beton yüzeyine örnek senaryodaki hedeften daha yakın çizilmiş.',
    sourceRow: [
      ['Model dosyası', 'Blok_A_Formwork.ndw'],
      ['Eleman', 'B15 kolonu · 1. kat'],
      ['Çizilen paspayı', '20 mm'],
      ['Örnek hedef', '35 mm (XC3 örnek senaryosu)'],
    ],
    currentLabel: '20 mm',
    expectedLabel: '35 mm',
    fix: 'Paspayı 35 mm olarak düzeltilir. Gerçek projede bu değeri çevre koşulu, standart ve proje şartlarına göre yetkili mühendis belirler.',
    fixAction: 'Paspayını 35 mm yap',
    quoteImpact: 'Kolonun dış ölçüsü değişmediği için beton miktarı aynı kalır. Donatı yerleşimi değiştiğinden model onaylanmadan bu kolonun metrajı teklife aktarılmaz.',
  },
  'finding-c': {
    problem: 'Taşıyıcı betonarme duvar, tuğla kaplamadan daha düşük öncelikte. Birleşimlerde tuğla betonu kesiyor.',
    sourceRow: [
      ['Model dosyası', 'Blok_A_Architecture.ndw'],
      ['Katman', 'Taşıyıcı betonarme duvar · öncelik 300'],
      ['Çakışan katman', 'Tuğla kaplama · öncelik 400'],
    ],
    currentLabel: 'öncelik 300',
    expectedLabel: 'öncelik 500',
    fix: 'Taşıyıcı katmanın önceliği 500 yapılır. Bu değer örnek ofis kuralıdır, Allplan\'ın genel standardı değildir.',
    fixAction: 'Önceliği 500 yap',
    quoteImpact: 'Birleşimlerde kesilen beton hacmi metraja geri döner; beton ve kalıp miktarları modeldeki gerçek geometriyle eşleşir.',
  },
};
