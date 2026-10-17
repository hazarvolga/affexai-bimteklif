import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateKatKarsiligi, KADEMELI_TAPU_DEVIR_STANDARDI } from "./kat-karsiligi";

describe("Kat Karşılığı ve Kentsel Dönüşüm Fizibilite Motoru (kat-karsiligi)", () => {
  it("temel fizibilite hesabını doğru yapar (1000 m2 arsa, 1.5 emsal)", () => {
    const res = calculateKatKarsiligi({
      arsaAlaniM2: 1000,
      kaksEmsal: 1.5,
      brutInsaatCarpani: 1.3,
      birimInsaatMaliyetiTL: 20000,
      bolgeSatisFiyatiTL: 50000,
      isKentselDonusum6306: false,
      muteahhitKarVeRiskCarpani: 1.2
    });

    assert.equal(res.emsaleEsasAlanM2, 1500);
    assert.equal(res.toplamBrutInsaatAlaniM2, 1950);
    assert.equal(res.toplamInsaatMaliyetiTL, 1950 * 20000); // 39.000.000 TL
    assert.equal(res.toplamProjeHasilatiTL, 1500 * 50000); // 75.000.000 TL

    // maliyetSatisOrani = (20000 * 1.3) / 50000 = 0.52
    // hamMuteahhitOrani = 0.52 * 1.2 * 100 = 62.4%
    assert.equal(res.hesaplananMuteahhitOraniYuzde, 62.4);
    assert.equal(res.rasyonelArsaSahibiOraniYuzde, 37.6);
    assert.equal(res.fizibiliteDurumu, "FIZIBIL");
    assert.equal(res.kdvRejimi.kdvOraniYuzde, 10);
    assert.equal(res.kdvRejimi.tapuHarciMuafiyetiVar, false);
  });

  it("6306 Kentsel Dönüşüm teşvikini ve %1 KDV avantajını hesaplar", () => {
    const res = calculateKatKarsiligi({
      arsaAlaniM2: 1000,
      kaksEmsal: 2.0,
      brutInsaatCarpani: 1.3,
      birimInsaatMaliyetiTL: 25000,
      bolgeSatisFiyatiTL: 65000,
      isKentselDonusum6306: true,
      ortalamaKonutNetM2: 110
    });

    assert.equal(res.kdvRejimi.kdvOraniYuzde, 1);
    assert.equal(res.kdvRejimi.tapuHarciMuafiyetiVar, true);
    // Standart KDV %10 (13.000.000) - Teşvikli %1 (1.300.000) = 11.700.000 TL KDV avantajı
    assert.equal(res.kdvRejimi.kentselDonusumAvantajiTL, (2000 * 65000) * 0.09);
  });

  it("yüksek maliyet / düşük satışta FIZIBIL_DEGIL uyarısı verir", () => {
    const res = calculateKatKarsiligi({
      arsaAlaniM2: 500,
      kaksEmsal: 1.0,
      brutInsaatCarpani: 1.3,
      birimInsaatMaliyetiTL: 35000,
      bolgeSatisFiyatiTL: 40000
    });

    assert.equal(res.fizibiliteDurumu, "FIZIBIL_DEGIL");
    assert.ok(res.hesaplananMuteahhitOraniYuzde >= 85);
  });

  it("kademeli tapu devir planı standart 4 aşamayı içerir ve toplamı %100'dür", () => {
    assert.equal(KADEMELI_TAPU_DEVIR_STANDARDI.length, 4);
    const toplamPay = KADEMELI_TAPU_DEVIR_STANDARDI.reduce((acc, a) => acc + a.payOrani, 0);
    assert.equal(toplamPay, 100);
    assert.equal(KADEMELI_TAPU_DEVIR_STANDARDI[3].kumulatifOran, 100);
  });

  it("geçersiz girdilerde hata fırlatır", () => {
    assert.throws(() => calculateKatKarsiligi({
      arsaAlaniM2: -10,
      kaksEmsal: 1.5,
      birimInsaatMaliyetiTL: 20000,
      bolgeSatisFiyatiTL: 50000
    }), /pozitif olmalıdır/);
  });
});
