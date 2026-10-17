import assert from 'node:assert/strict';
import test from 'node:test';
import { arsaPayiTeslimiKdv, calculateKatKarsiligi, emsalBedel, konutKdv, ORNEK_TAPU_DEVIR_ASAMALARI, tapuDevirPlani, type KatKarsiligiInput } from './kat-karsiligi';

// KDV kademeleri (1/4/2022 sonrası ruhsat): 7346 sayılı CK (RG 7.7.2023): ≤150 m² %10, fazlası %20; 6306 kapsamında ilk 150 m² %1.
test('KDV: 160 m² konut, genel rejim — bedel 150/160 ve 10/160 oranında bölünür (%10 ve %20)', () => {
  const kdv = konutKdv({ netAlanM2: 160, matrahTry: 8_000_000, rejim: 'genel', ruhsat2022Sonrasi: true });
  assert.equal(kdv.ilkKisimM2, 150);
  assert.equal(kdv.fazlaKisimM2, 10);
  assert.equal(kdv.ilkKisimMatrahTry, 7_500_000);
  assert.equal(kdv.fazlaKisimMatrahTry, 500_000);
  assert.equal(kdv.kdvTutariTry, 850_000); // 750.000 + 100.000
  assert.equal(kdv.efektifOraniYuzde, 10.63);
});

test('KDV: 160 m² konut, 6306 kapsamı — ilk 150 m² %1, fazlası %20', () => {
  const kdv = konutKdv({ netAlanM2: 160, matrahTry: 8_000_000, rejim: 'kentsel_donusum_6306', ruhsat2022Sonrasi: true });
  assert.equal(kdv.kdvTutariTry, 175_000); // 75.000 + 100.000
  assert.equal(kdv.ilkKisimOraniYuzde, 1);
  assert.equal(kdv.fazlaKisimOraniYuzde, 20);
});

test('KDV: 150 m² ve altı konutta tek oran (%10 genel, %1 6306) ve fazla kısım oranı 0 döner', () => {
  const genel = konutKdv({ netAlanM2: 140, matrahTry: 5_000_000, rejim: 'genel', ruhsat2022Sonrasi: true });
  assert.equal(genel.kdvTutariTry, 500_000);
  assert.equal(genel.fazlaKisimOraniYuzde, 0);
  assert.equal(konutKdv({ netAlanM2: 150, matrahTry: 5_000_000, rejim: 'kentsel_donusum_6306', ruhsat2022Sonrasi: true }).kdvTutariTry, 50_000);
});

test('KDV: 1/4/2022 öncesi ruhsat desteklenmez ve geçersiz girdi reddedilir', () => {
  assert.throws(() => konutKdv({ netAlanM2: 100, matrahTry: 1, rejim: 'genel', ruhsat2022Sonrasi: false }), /1\/4\/2022/);
  assert.throws(() => konutKdv({ netAlanM2: 0, matrahTry: 1, rejim: 'genel', ruhsat2022Sonrasi: true }), RangeError);
  assert.throws(() => konutKdv({ netAlanM2: 100, matrahTry: -1, rejim: 'genel', ruhsat2022Sonrasi: true }), RangeError);
});

const base: KatKarsiligiInput = {
  arsaAlaniM2: 1000, kaksEmsal: 1.5, brutInsaatCarpani: 1.3, satilabilirNetAlanOrani: 0.8,
  birimInsaatMaliyetiTry: 20_000, satisFiyatiTry: 50_000, hedeflenenKarCarpani: 1.2,
  ortalamaKonutNetM2: 100, maliyetBedeliBirimTry: 20_000, emsalSatisTuru: 'toptan', arsaSahibiKdvMukellefi: true, kdvRejimi: 'genel', ruhsat2022Sonrasi: true,
};

test('paylaşım: müteahhit payı = maliyet × kâr çarpanı / proje değeri; KDV arsa sahibine maliyet esaslı emsal bedelden, satışta satış bedelinden', () => {
  const r = calculateKatKarsiligi(base);
  assert.equal(r.emsaleEsasAlanM2, 1500);
  assert.equal(r.toplamBrutInsaatAlaniM2, 1950);
  assert.equal(r.netSatilabilirAlanM2, 1200);
  assert.equal(r.toplamInsaatMaliyetiTry, 39_000_000);
  assert.equal(r.toplamProjeHasilatiTry, 60_000_000);
  assert.equal(r.muteahhitPayiYuzde, 78); // 39M × 1,2 / 60M
  assert.equal(r.arsaSahibiPayiYuzde, 22);
  assert.equal(r.muteahhitPayiM2, 936);
  assert.equal(r.arsaSahibiPayiM2, 264);
  assert.equal(r.muteahhitNetKariTry, 7_800_000);
  assert.equal(r.hedefKarSaglanabilir, true);
  // Arsa sahibine teslim: konut başına maliyet 2.000.000 → toptan +%5 = emsal bedel 2.100.000 → KDV 210.000; 2,64 konut
  assert.equal(r.arsaSahibineTeslim.konutBasinaEmsalBedelTry, 2_100_000);
  assert.equal(r.arsaSahibineTeslim.konutBasinaKdv.kdvTutariTry, 210_000);
  assert.equal(r.arsaSahibineTeslim.toplamKdvTry, 554_400);
  // Arsa payı teslimi (arsa sahibi KDV mükellefi): matrah = bırakılan birimlerin toplam emsal bedeli (5.544.000) × %20
  assert.equal(r.arsaSahibineTeslim.toplamEmsalBedelTry, 5_544_000);
  assert.equal(r.arsaPayiTeslimiKdvTry, 1_108_800);
  assert.equal(calculateKatKarsiligi({ ...base, arsaSahibiKdvMukellefi: false }).arsaPayiTeslimiKdvTry, 0);
  // Müteahhit satışı: konut başına 5.000.000 -> KDV 500.000; 9,36 konut
  assert.equal(r.muteahhitSatisi.konutBasinaSatisBedeliTry, 5_000_000);
  assert.equal(r.muteahhitSatisi.toplamKdvTry, 4_680_000);
});

test('müteahhit payı %100\'ü aşarsa uyarı verilir ve pay %100 ile sınırlanır; kâr "kendini doğrulamaz"', () => {
  const r = calculateKatKarsiligi({ ...base, birimInsaatMaliyetiTry: 40_000, satisFiyatiTry: 40_000 });
  assert.equal(r.muteahhitPayiYuzde, 195);
  assert.equal(r.hedefKarSaglanabilir, false);
  assert.equal(r.arsaSahibiPayiYuzde, 0);
  assert.ok(r.uyarilar[0].includes('%100'));
  // Pay sınırlandığı için kâr, hedeflenen çarpanın altında kalır (maliyetin %20'si değil, zarar):
  assert.ok(r.muteahhitNetKariTry < 0.2 * r.toplamInsaatMaliyetiTry);
});

test('6306 rejimi KDV\'yi düşürür; gizli varsayılan yoktur (eksik/hatalı girdi reddedilir)', () => {
  const normal = calculateKatKarsiligi(base);
  const donusum = calculateKatKarsiligi({ ...base, kdvRejimi: 'kentsel_donusum_6306' });
  assert.ok(donusum.arsaSahibineTeslim.toplamKdvTry < normal.arsaSahibineTeslim.toplamKdvTry);
  assert.equal(donusum.arsaSahibineTeslim.konutBasinaKdv.kdvTutariTry, 21_000);
  assert.throws(() => calculateKatKarsiligi({ ...base, emsalSatisTuru: 'karisik' as never }), /toptan veya perakende/);
  assert.throws(() => calculateKatKarsiligi({ ...base, hedeflenenKarCarpani: 0.9 }), /en az 1/);
  assert.throws(() => calculateKatKarsiligi({ ...base, satilabilirNetAlanOrani: 1.2 }), /0 ile 1/);
  assert.throws(() => calculateKatKarsiligi({ ...base, arsaAlaniM2: -10 }), /pozitif/);
  assert.throws(() => calculateKatKarsiligi({ ...base, brutInsaatCarpani: undefined as unknown as number }), RangeError);
  assert.throws(() => calculateKatKarsiligi({ ...base, ruhsat2022Sonrasi: false }), /1\/4\/2022/);
});

test('tapu devri aşamaları ÖRNEKTİR: toplam %100 doğrulanır, kümülatif hesaplanır, içtihat iddiası yoktur', () => {
  const plan = tapuDevirPlani(ORNEK_TAPU_DEVIR_ASAMALARI);
  assert.deepEqual(plan.map(a => a.kumulatifYuzde), [10, 30, 70, 100]);
  assert.throws(() => tapuDevirPlani([{ ad: 'x', payYuzde: 60, kriter: 'y' }]), /%100/);
  assert.throws(() => tapuDevirPlani([]), RangeError);
  const source = ORNEK_TAPU_DEVIR_ASAMALARI.map(a => `${a.ad} ${a.kriter}`).join(' ');
  assert.equal(/yargıtay|içtihat/i.test(source), false);
});

// KDV Genel Uygulama Tebliği I/B-8 resmî örnekleri (RG 5.6.2018): maliyet + %5 (toptan) veya %10 (perakende) = emsal bedel.
test('Tebliğ I/B-8 örneği 1 (toptan, %5): 800.000 → 840.000 ve 300.000 → 315.000; arsa payı matrahı 1.155.000, %18 ile 207.900', () => {
  assert.equal(emsalBedel(800_000, 'toptan'), 840_000);
  assert.equal(emsalBedel(300_000, 'toptan'), 315_000);
  assert.equal(emsalBedel(800_000, 'toptan') + emsalBedel(300_000, 'toptan'), 1_155_000);
  assert.equal(arsaPayiTeslimiKdv(1_155_000, 18), 207_900); // 2018 oranı; bugünkü genel oran %20'dir
  assert.equal(arsaPayiTeslimiKdv(1_155_000), 231_000);
});

test('Tebliğ I/B-8 örneği 2 (perakende, %10): 800.000 → 880.000 ve 300.000 → 330.000', () => {
  assert.equal(emsalBedel(800_000, 'perakende'), 880_000);
  assert.equal(emsalBedel(300_000, 'perakende'), 330_000);
  assert.throws(() => emsalBedel(0, 'toptan'), RangeError);
  assert.throws(() => arsaPayiTeslimiKdv(1, -1), RangeError);
});
