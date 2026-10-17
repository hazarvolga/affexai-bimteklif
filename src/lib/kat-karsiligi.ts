/**
 * Kat karşılığı (arsa payı karşılığı) inşaat — paylaşım ve KDV ön hesabı.
 *
 * Bu modül hukuki veya mali tavsiye değildir. Kapsam ve dayanaklar:
 *
 * 1. Paylaşım oranı: müteahhit payı = (birim maliyet × brüt/emsal çarpanı × hedeflenen kâr çarpanı) / satış fiyatı.
 *    Bu bir sektör kuralıdır (mevzuat değildir); çarpanların hiçbiri varsayılmaz, hepsi kullanıcı girdisidir.
 *    Müteahhit payı %100'ü aşıyorsa proje bu maliyet ve satış fiyatıyla hedeflenen kârı vermez.
 *
 * 2. KDV (3065 sayılı Kanun ve KDV Oran Kararları; 7346 sayılı Cumhurbaşkanı Kararı, RG 7.7.2023, yürürlük 10.7.2023):
 *    1/4/2022 ve sonrasında yapı ruhsatı alan konutlarda KDV, konutun NET alanına göre KISIM bazında uygulanır:
 *      - genel rejim: ilk 150 m² için %10, aşan kısım için %20;
 *      - 6306 sayılı Kanun kapsamındaki dönüşüm (riskli alan, rezerv yapı alanı, riskli yapı): ilk 150 m² için %1, aşan kısım %20.
 *    Konut bedeli, kısımlara net alan oranında bölünür (ör. 160 m² konutta bedelin 150/160'ı ve 10/160'ı).
 *    1/4/2022 öncesi ruhsatlarda büyükşehir/arsa birim değeri gibi farklı kurallar geçerlidir; bu motor onları DESTEKLEMEZ.
 *    Kaynak kalitesi: oran kararının Resmî Gazete özeti ve iki 2026 tarihli mali müşavirlik yayını; GİB Genel Uygulama Tebliği
 *    metniyle doğrudan karşılaştırma ve mali müşavir onayı bekliyor (bkz. docs/audits/RESMI_VERI_ARASTIRMASI_2026-10-17.md).
 *
 * 3. Kat karşılığı işlemlerinde müteahhidin arsa sahibine yaptığı konut teslimi trampa niteliğindedir (7104 sayılı Kanun, 2018);
 *    KDV matrahı emsal bedeldir (213 sayılı VUK m.267 ikinci sıra maliyet bedeli; genel idare ve genel giderlerden pay dahil).
 *    Bu nedenle arsa sahibine teslimin KDV'si piyasa satış fiyatı üzerinden DEĞİL, kullanıcının girdiği emsal bedel üzerinden hesaplanır.
 *    Arsa sahibinin arsa payı teslimi ve onun KDV/gelir vergisi durumu bu motorun kapsamı dışındadır.
 */

export type KdvRejimi = 'genel' | 'kentsel_donusum_6306';

export interface KdvKademesi {
  ilkKisimEsikM2: number;
  ilkKisimOraniYuzde: number;
  fazlaKisimOraniYuzde: number;
}

/** 1/4/2022 ve sonrası yapı ruhsatlı konutlar için kısım bazlı KDV oranları (bkz. dosya başlığı). */
export const KONUT_KDV_2022_SONRASI: Readonly<Record<KdvRejimi, KdvKademesi>> = {
  genel: { ilkKisimEsikM2: 150, ilkKisimOraniYuzde: 10, fazlaKisimOraniYuzde: 20 },
  kentsel_donusum_6306: { ilkKisimEsikM2: 150, ilkKisimOraniYuzde: 1, fazlaKisimOraniYuzde: 20 },
};

export interface KonutKdvInput {
  /** Konutun NET alanı (m²). */
  netAlanM2: number;
  /** Konutun KDV HARİÇ bedeli veya emsal bedeli (TL). */
  matrahTry: number;
  rejim: KdvRejimi;
  /** Yapı ruhsatı 1/4/2022 veya sonrasında mı? Yalnız `true` desteklenir. */
  ruhsat2022Sonrasi: boolean;
}

export interface KonutKdvResult {
  ilkKisimM2: number;
  fazlaKisimM2: number;
  ilkKisimMatrahTry: number;
  fazlaKisimMatrahTry: number;
  ilkKisimOraniYuzde: number;
  fazlaKisimOraniYuzde: number;
  kdvTutariTry: number;
  efektifOraniYuzde: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function assertPositive(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new RangeError(`${name} pozitif olmalıdır.`);
}

/** Tek bir konutun KDV'si: matrah, net alana göre kısımlara bölünür ve kısım oranlarıyla vergilendirilir. */
export function konutKdv(input: KonutKdvInput): KonutKdvResult {
  if (!input.ruhsat2022Sonrasi) {
    throw new Error('Yalnızca 1/4/2022 ve sonrasında yapı ruhsatı alan konutlar desteklenir; önceki ruhsatlarda büyükşehir ve arsa birim değeri kuralları geçerlidir.');
  }
  assertPositive('Net alan', input.netAlanM2);
  assertPositive('KDV matrahı', input.matrahTry);
  const kademe = KONUT_KDV_2022_SONRASI[input.rejim];
  const ilkKisimM2 = Math.min(input.netAlanM2, kademe.ilkKisimEsikM2);
  const fazlaKisimM2 = input.netAlanM2 - ilkKisimM2;
  const ilkKisimMatrahTry = (input.matrahTry * ilkKisimM2) / input.netAlanM2;
  const fazlaKisimMatrahTry = input.matrahTry - ilkKisimMatrahTry;
  const kdvTutariTry = round2(
    (ilkKisimMatrahTry * kademe.ilkKisimOraniYuzde) / 100 + (fazlaKisimMatrahTry * kademe.fazlaKisimOraniYuzde) / 100,
  );
  return {
    ilkKisimM2,
    fazlaKisimM2,
    ilkKisimMatrahTry: round2(ilkKisimMatrahTry),
    fazlaKisimMatrahTry: round2(fazlaKisimMatrahTry),
    ilkKisimOraniYuzde: kademe.ilkKisimOraniYuzde,
    fazlaKisimOraniYuzde: fazlaKisimM2 > 0 ? kademe.fazlaKisimOraniYuzde : 0,
    kdvTutariTry,
    efektifOraniYuzde: round2((kdvTutariTry / input.matrahTry) * 100),
  };
}

export interface KatKarsiligiInput {
  arsaAlaniM2: number;
  /** Emsal (KAKS); emsale esas alan = arsa alanı × KAKS. */
  kaksEmsal: number;
  /** Emsale esas alandan toplam brüt inşaat alanına geçiş çarpanı (bodrum, ortak alan vb.); kullanıcı girdisidir. */
  brutInsaatCarpani: number;
  /** Emsale esas alanın net satılabilir kısmı (0–1]; kullanıcı girdisidir. */
  satilabilirNetAlanOrani: number;
  /** Brüt inşaat alanı başına birim maliyet (TL/m²). */
  birimInsaatMaliyetiTry: number;
  /** Net satılabilir alan başına piyasa satış fiyatı (TL/m², KDV hariç). */
  satisFiyatiTry: number;
  /** Müteahhidin hedeflediği kâr çarpanı (maliyetin katı; ≥ 1). Hiçbir değer varsayılmaz. */
  hedeflenenKarCarpani: number;
  /** Ortalama bir konutun net alanı (m²); KDV kademesi için. */
  ortalamaKonutNetM2: number;
  /** Arsa sahibine teslim edilen konutun emsal bedeli (TL/net m², KDV hariç; VUK m.267 maliyet esaslı). */
  emsalBirimBedeliTry: number;
  kdvRejimi: KdvRejimi;
  ruhsat2022Sonrasi: boolean;
}

export interface KatKarsiligiResult {
  emsaleEsasAlanM2: number;
  toplamBrutInsaatAlaniM2: number;
  netSatilabilirAlanM2: number;
  toplamInsaatMaliyetiTry: number;
  /** Tüm net satılabilir alanın piyasa değeri (TL, KDV hariç). */
  toplamProjeHasilatiTry: number;
  muteahhitPayiYuzde: number;
  arsaSahibiPayiYuzde: number;
  /** Müteahhit payı %100'ü aşıyorsa proje hedeflenen kârı bu maliyet ve fiyatla vermez. */
  hedefKarSaglanabilir: boolean;
  muteahhitPayiM2: number;
  arsaSahibiPayiM2: number;
  muteahhitSatisHasilatiTry: number;
  muteahhitNetKariTry: number;
  arsaSahibineTeslim: { konutAdedi: number; konutBasinaEmsalBedelTry: number; konutBasinaKdv: KonutKdvResult; toplamKdvTry: number };
  muteahhitSatisi: { konutAdedi: number; konutBasinaSatisBedeliTry: number; konutBasinaKdv: KonutKdvResult; toplamKdvTry: number };
  uyarilar: string[];
}

export function calculateKatKarsiligi(input: KatKarsiligiInput): KatKarsiligiResult {
  assertPositive('Arsa alanı', input.arsaAlaniM2);
  assertPositive('KAKS / Emsal', input.kaksEmsal);
  assertPositive('Brüt inşaat çarpanı', input.brutInsaatCarpani);
  assertPositive('Birim inşaat maliyeti', input.birimInsaatMaliyetiTry);
  assertPositive('Satış fiyatı', input.satisFiyatiTry);
  assertPositive('Ortalama konut net alanı', input.ortalamaKonutNetM2);
  assertPositive('Emsal birim bedeli', input.emsalBirimBedeliTry);
  if (!(input.satilabilirNetAlanOrani > 0 && input.satilabilirNetAlanOrani <= 1)) throw new RangeError('Satılabilir net alan oranı 0 ile 1 arasında (1 dahil) olmalıdır.');
  if (!(input.hedeflenenKarCarpani >= 1)) throw new RangeError('Hedeflenen kâr çarpanı en az 1 olmalıdır.');

  const emsaleEsasAlanM2 = input.arsaAlaniM2 * input.kaksEmsal;
  const toplamBrutInsaatAlaniM2 = emsaleEsasAlanM2 * input.brutInsaatCarpani;
  const netSatilabilirAlanM2 = emsaleEsasAlanM2 * input.satilabilirNetAlanOrani;
  const toplamInsaatMaliyetiTry = toplamBrutInsaatAlaniM2 * input.birimInsaatMaliyetiTry;
  const toplamProjeHasilatiTry = netSatilabilirAlanM2 * input.satisFiyatiTry;

  // Müteahhit payı: (toplam maliyet × kâr çarpanı) / toplam proje değeri.
  const muteahhitOrani = (toplamInsaatMaliyetiTry * input.hedeflenenKarCarpani) / toplamProjeHasilatiTry;
  const hedefKarSaglanabilir = muteahhitOrani <= 1;
  const sinirliOran = Math.min(muteahhitOrani, 1);

  const muteahhitPayiM2 = netSatilabilirAlanM2 * sinirliOran;
  const arsaSahibiPayiM2 = netSatilabilirAlanM2 - muteahhitPayiM2;
  const muteahhitSatisHasilatiTry = muteahhitPayiM2 * input.satisFiyatiTry;

  const konutBasinaEmsalBedelTry = input.ortalamaKonutNetM2 * input.emsalBirimBedeliTry;
  const konutBasinaSatisBedeliTry = input.ortalamaKonutNetM2 * input.satisFiyatiTry;
  const kdvArsa = konutKdv({ netAlanM2: input.ortalamaKonutNetM2, matrahTry: konutBasinaEmsalBedelTry, rejim: input.kdvRejimi, ruhsat2022Sonrasi: input.ruhsat2022Sonrasi });
  const kdvSatis = konutKdv({ netAlanM2: input.ortalamaKonutNetM2, matrahTry: konutBasinaSatisBedeliTry, rejim: input.kdvRejimi, ruhsat2022Sonrasi: input.ruhsat2022Sonrasi });
  const arsaKonutAdedi = arsaSahibiPayiM2 / input.ortalamaKonutNetM2;
  const satisKonutAdedi = muteahhitPayiM2 / input.ortalamaKonutNetM2;

  const uyarilar: string[] = [
    'Kâr çarpanı, brüt çarpanı ve emsal bedel sizin girdinizdir; sonuç bu varsayımların doğruluğuna bağlıdır.',
    'Arsa sahibine teslimin KDV matrahı emsal bedeldir (VUK m.267); piyasa satış fiyatı değildir. Emsal bedelin belirlenmesi için mali müşavire danışın.',
    'KDV hesabı yalnızca 1/4/2022 ve sonrasında yapı ruhsatı alan konutlar içindir ve konut adedini kesirli bırakır; gerçek projede konut sayısı tam sayıdır.',
    'Tapu devri aşamaları, vergilendirme ve temerrüt hükümleri için sözleşmenizi bir avukata ve mali müşavire inceletin.',
  ];
  if (!hedefKarSaglanabilir) uyarilar.unshift('Müteahhit payı %100\'ü aşıyor: bu maliyet, fiyat ve kâr çarpanıyla proje arsa sahibine pay bırakmadan hedeflenen kârı sağlamıyor. Pay %100 ile sınırlandı.');

  return {
    emsaleEsasAlanM2,
    toplamBrutInsaatAlaniM2,
    netSatilabilirAlanM2,
    toplamInsaatMaliyetiTry: round2(toplamInsaatMaliyetiTry),
    toplamProjeHasilatiTry: round2(toplamProjeHasilatiTry),
    muteahhitPayiYuzde: round2(muteahhitOrani * 100),
    arsaSahibiPayiYuzde: round2((1 - sinirliOran) * 100),
    hedefKarSaglanabilir,
    muteahhitPayiM2: round2(muteahhitPayiM2),
    arsaSahibiPayiM2: round2(arsaSahibiPayiM2),
    muteahhitSatisHasilatiTry: round2(muteahhitSatisHasilatiTry),
    muteahhitNetKariTry: round2(muteahhitSatisHasilatiTry - toplamInsaatMaliyetiTry),
    arsaSahibineTeslim: { konutAdedi: round2(arsaKonutAdedi), konutBasinaEmsalBedelTry: round2(konutBasinaEmsalBedelTry), konutBasinaKdv: kdvArsa, toplamKdvTry: round2(kdvArsa.kdvTutariTry * arsaKonutAdedi) },
    muteahhitSatisi: { konutAdedi: round2(satisKonutAdedi), konutBasinaSatisBedeliTry: round2(konutBasinaSatisBedeliTry), konutBasinaKdv: kdvSatis, toplamKdvTry: round2(kdvSatis.kdvTutariTry * satisKonutAdedi) },
    uyarilar,
  };
}

export interface TapuDevirAsamasi {
  ad: string;
  /** Bu aşamada devredilecek pay (%). */
  payYuzde: number;
  kriter: string;
}

/**
 * ÖRNEK sözleşme şablonu: bu aşamalar ve oranlar mevzuat veya içtihat DEĞİLDİR; yaygın sözleşme pratiğinden bir örnektir.
 * Tarafların anlaşmasına ve hukuki danışmanlığa göre değiştirilir.
 */
export const ORNEK_TAPU_DEVIR_ASAMALARI: readonly TapuDevirAsamasi[] = [
  { ad: 'Yapı ruhsatı', payYuzde: 10, kriter: 'Yapı ruhsatının alınması' },
  { ad: 'Temel üstü', payYuzde: 20, kriter: 'Temel ve sıfır kotu betonunun tamamlanması' },
  { ad: 'Kaba inşaat', payYuzde: 40, kriter: 'Taşıyıcı sistem, duvar ve çatının tamamlanması' },
  { ad: 'İskân ve teslim', payYuzde: 30, kriter: 'Yapı kullanma izin belgesinin alınması ve teslim' },
];

/** Kullanıcının tanımladığı aşamaları doğrular (toplam %100) ve kümülatif oranları hesaplar. */
export function tapuDevirPlani(asamalar: readonly TapuDevirAsamasi[]): (TapuDevirAsamasi & { kumulatifYuzde: number })[] {
  if (asamalar.length === 0) throw new RangeError('En az bir aşama gerekir.');
  if (asamalar.some(a => !(a.payYuzde > 0))) throw new RangeError('Her aşamanın payı pozitif olmalıdır.');
  const toplam = round2(asamalar.reduce((sum, a) => sum + a.payYuzde, 0));
  if (toplam !== 100) throw new RangeError(`Aşama paylarının toplamı %100 olmalıdır (şu an %${toplam}).`);
  let kumulatif = 0;
  return asamalar.map(a => { kumulatif = round2(kumulatif + a.payYuzde); return { ...a, kumulatifYuzde: kumulatif }; });
}
