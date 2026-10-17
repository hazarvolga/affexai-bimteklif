/**
 * Kat Karşılığı ve Kentsel Dönüşüm (6306 s.K. & TBK 6098) Fizibilite ve Paylaşım Motoru
 *
 * Yasal ve Teknik Dayanaklar:
 * 1. 6098 sayılı Türk Borçlar Kanunu (m. 470 vd. Eser Sözleşmesi ve Arsa Payı Karşılığı İnşaat)
 * 2. 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun (KDV teşvikleri & harç muafiyeti)
 * 3. 3065 sayılı Katma Değer Vergisi Kanunu (2026 güncel konut teslimi matrahları: 6306 kapsamında %1, standart %10, ticari/lüks kademeli %20)
 * 4. Yargıtay 15. Hukuk Dairesi ve Hukuk Genel Kurulu İçtihatları (Kademeli devir & müspet zarar tazmini)
 * 5. Sektörel Rasyonel Formül: Müteahhit Payı = (İnşaat Maliyeti × 1,20) / Bölge Satış Fiyatı
 */

export interface KatKarsiligiInput {
  arsaAlaniM2: number;
  kaksEmsal: number;
  brutInsaatCarpani?: number; // varsayılan: 1.30
  birimInsaatMaliyetiTL: number;
  bolgeSatisFiyatiTL: number;
  isKentselDonusum6306?: boolean;
  ortalamaKonutNetM2?: number; // varsayılan: 100 m2
  muteahhitKarVeRiskCarpani?: number; // varsayılan: 1.20
}

export interface KademeliTapuDevriAsamasi {
  asamaNo: number;
  asamaAdi: string;
  payOrani: number;
  kumulatifOran: number;
  teknikKriter: string;
  yargitayGuvenlikNotu: string;
}

export interface KatKarsiligiResult {
  emsaleEsasAlanM2: number;
  toplamBrutInsaatAlaniM2: number;
  toplamSatilabilirAlanM2: number;
  toplamInsaatMaliyetiTL: number;
  toplamProjeHasilatiTL: number;
  hesaplananMuteahhitOraniYuzde: number;
  rasyonelArsaSahibiOraniYuzde: number;
  muteahhitPayiM2: number;
  arsaSahibiPayiM2: number;
  muteahhitHasilatiTL: number;
  muteahhitNetKariTL: number;
  muteahhitKarMarjiYuzde: number;
  fizibiliteDurumu: "FIZIBIL" | "RISKLI" | "FIZIBIL_DEGIL";
  fizibiliteMesaji: string;
  kdvRejimi: {
    kdvOraniYuzde: number;
    kentselDonusumAvantajiTL: number;
    tapuHarciMuafiyetiVar: boolean;
  };
  kademeliTapuDevirPlani: KademeliTapuDevriAsamasi[];
  hukukiUyariNotu: string;
}

export const KADEMELI_TAPU_DEVIR_STANDARDI: KademeliTapuDevriAsamasi[] = [
  {
    asamaNo: 1,
    asamaAdi: "Yapı Ruhsatı Alımı",
    payOrani: 10,
    kumulatifOran: 10,
    teknikKriter: "İlgili belediyeden onaylı mimari/statik projelerle yapı ruhsatının kesinleşmesi.",
    yargitayGuvenlikNotu: "Projeye başlama taahhüdü karşılığı ilk teminat devridir; erken terk riskini sınırlar."
  },
  {
    asamaNo: 2,
    asamaAdi: "Temel Üstü Vizesi (Subasman Kotu)",
    payOrani: 20,
    kumulatifOran: 30,
    teknikKriter: "Hafriyat, temel donatısı, perde izolasyonu ve sıfır kotu betonunun dökülüp vizelenmesi.",
    yargitayGuvenlikNotu: "Zemin risklerinin aşıldığını teyit eder; müteahhide finansman nefesi sağlar."
  },
  {
    asamaNo: 3,
    asamaAdi: "Kaba İnşaat Bitimi (Taşıyıcı İskelet)",
    payOrani: 40,
    kumulatifOran: 70,
    teknikKriter: "Son kat tabliye betonu dökümü, dış duvar örümü ve çatı karkasının tamamlanması.",
    yargitayGuvenlikNotu: "Müteahhidin taahhüdünün fiziki hacminin en kritik bölümü tamamlanmış sayılır."
  },
  {
    asamaNo: 4,
    asamaAdi: "İskân Belgesi (Yapı Kullanma İzni) ve Kesin Teslim",
    payOrani: 30,
    kumulatifOran: 100,
    teknikKriter: "Cins tashihi, SGK ilişiksizlik belgesi ve belediye yapı kullanma izin belgesinin (iskân) alınması.",
    yargitayGuvenlikNotu: "Arsa sahibinin kusursuz teslim güvencesidir; eksik imalat bedelleri bloke edilir."
  }
];

export function calculateKatKarsiligi(input: KatKarsiligiInput): KatKarsiligiResult {
  const {
    arsaAlaniM2,
    kaksEmsal,
    brutInsaatCarpani = 1.30,
    birimInsaatMaliyetiTL,
    bolgeSatisFiyatiTL,
    isKentselDonusum6306 = false,
    ortalamaKonutNetM2 = 100,
    muteahhitKarVeRiskCarpani = 1.20
  } = input;

  if (arsaAlaniM2 <= 0) throw new Error("Arsa alanı pozitif olmalıdır.");
  if (kaksEmsal <= 0) throw new Error("KAKS / Emsal pozitif olmalıdır.");
  if (birimInsaatMaliyetiTL <= 0) throw new Error("Birim inşaat maliyeti pozitif olmalıdır.");
  if (bolgeSatisFiyatiTL <= 0) throw new Error("Bölge satış fiyatı pozitif olmalıdır.");

  // Alan hesapları
  const emsaleEsasAlanM2 = arsaAlaniM2 * kaksEmsal;
  const toplamBrutInsaatAlaniM2 = emsaleEsasAlanM2 * brutInsaatCarpani;
  const toplamSatilabilirAlanM2 = emsaleEsasAlanM2; // satılabilir net/brüt bağımsız alan emsale esas kabul edilir

  // Finansal toplamlar
  const toplamInsaatMaliyetiTL = toplamBrutInsaatAlaniM2 * birimInsaatMaliyetiTL;
  const toplamProjeHasilatiTL = toplamSatilabilirAlanM2 * bolgeSatisFiyatiTL;

  // Rasyonel Müteahhit Paylaşım Formülü:
  // Müteahhit Payı = (Maliyet x 1.20) / Satış Fiyatı
  const maliyetSatisOrani = (birimInsaatMaliyetiTL * brutInsaatCarpani) / bolgeSatisFiyatiTL;
  const hamMuteahhitOraniYuzde = maliyetSatisOrani * muteahhitKarVeRiskCarpani * 100;

  let hesaplananMuteahhitOraniYuzde = Math.round(hamMuteahhitOraniYuzde * 100) / 100;
  let rasyonelArsaSahibiOraniYuzde = Math.round((100 - hesaplananMuteahhitOraniYuzde) * 100) / 100;

  let fizibiliteDurumu: "FIZIBIL" | "RISKLI" | "FIZIBIL_DEGIL" = "FIZIBIL";
  let fizibiliteMesaji = "Proje piyasa normlarında dengeli ve kârlı bir fizibiliteye sahiptir.";

  if (hesaplananMuteahhitOraniYuzde >= 85) {
    fizibiliteDurumu = "FIZIBIL_DEGIL";
    fizibiliteMesaji = "Bölge konut satış fiyatı, inşaat maliyetine kıyasla yetersizdir. Müteahhidin %85 üzeri pay alması gerekir ki bu durum arsa sahibince kabul edilemez.";
  } else if (hesaplananMuteahhitOraniYuzde >= 70) {
    fizibiliteDurumu = "RISKLI";
    fizibiliteMesaji = "Maliyet/Satış makası dardır. Müteahhidin kâr edebilmesi için arsa sahibine %30'dan az pay verilmesi gerekir; pazarlık payı kısıtlıdır.";
  } else if (hesaplananMuteahhitOraniYuzde <= 30) {
    fizibiliteMesaji = "Bölge arsa değeri ve satış fiyatı çok yüksektir (merkezi semt/lüks). Müteahhit %30-40 payla dahi hedeflenen %20+ kâr marjını yakalayabilir.";
  }

  // Alan dağılımı
  const muteahhitPayiM2 = Math.round((toplamSatilabilirAlanM2 * (hesaplananMuteahhitOraniYuzde / 100)) * 100) / 100;
  const arsaSahibiPayiM2 = Math.round((toplamSatilabilirAlanM2 - muteahhitPayiM2) * 100) / 100;

  // Müteahhit Hasılat ve Kârı
  const muteahhitHasilatiTL = muteahhitPayiM2 * bolgeSatisFiyatiTL;
  const muteahhitNetKariTL = muteahhitHasilatiTL - toplamInsaatMaliyetiTL;
  const muteahhitKarMarjiYuzde = toplamInsaatMaliyetiTL > 0 
    ? Math.round((muteahhitNetKariTL / toplamInsaatMaliyetiTL) * 10000) / 100 
    : 0;

  // KDV ve Teşvik Rejimi
  // 6306 Kentsel Dönüşümde 150 m2'ye kadar %1, standartta %10, aşan kısımda %20
  let kdvOraniYuzde = 10;
  let standartKdvTutari = toplamProjeHasilatiTL * 0.10;
  let uygulananKdvTutari = standartKdvTutari;

  if (isKentselDonusum6306) {
    if (ortalamaKonutNetM2 <= 150) {
      kdvOraniYuzde = 1;
      uygulananKdvTutari = toplamProjeHasilatiTL * 0.01;
    } else {
      kdvOraniYuzde = 20;
      uygulananKdvTutari = toplamProjeHasilatiTL * 0.20;
    }
  }

  const kentselDonusumAvantajiTL = isKentselDonusum6306 
    ? Math.max(0, standartKdvTutari - uygulananKdvTutari) 
    : 0;

  const hukukiUyariNotu =
    "TBK m. 470 ve Yargıtay 15. H.D. yerleşik kararları uyarınca peşin tapu devri yapılması halinde yüklenici temerrüdü üçüncü şahıslara intikal riskini doğurur. Sözleşmede mutlaka 4 kademeli hakediş devir planı ve 'müspet zarar' kâr kaybı maddesi yer almalıdır.";

  return {
    emsaleEsasAlanM2,
    toplamBrutInsaatAlaniM2,
    toplamSatilabilirAlanM2,
    toplamInsaatMaliyetiTL,
    toplamProjeHasilatiTL,
    hesaplananMuteahhitOraniYuzde,
    rasyonelArsaSahibiOraniYuzde,
    muteahhitPayiM2,
    arsaSahibiPayiM2,
    muteahhitHasilatiTL,
    muteahhitNetKariTL,
    muteahhitKarMarjiYuzde,
    fizibiliteDurumu,
    fizibiliteMesaji,
    kdvRejimi: {
      kdvOraniYuzde,
      kentselDonusumAvantajiTL,
      tapuHarciMuafiyetiVar: isKentselDonusum6306
    },
    kademeliTapuDevirPlani: KADEMELI_TAPU_DEVIR_STANDARDI,
    hukukiUyariNotu
  };
}
