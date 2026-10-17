import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateYambisMaliRasyolar, YAMBİS_GRUP_LIMITLERI } from "./yambis-classification";

describe("YAMBİS Müteahhitlik Belge Grubu ve Kapasite Motoru (yambis-classification)", () => {
  it("eksiksiz bilanço ve yüksek deneyimle A Grubu belirler", () => {
    const res = evaluateYambisMaliRasyolar({
      donenVarliklarTL: 100_000_000,
      kisaVadeliBorclarTL: 50_000_000, // Cari oran = 2.0 (>= 0.75)
      toplamOzkaynakTL: 80_000_000,
      toplamAktifTL: 150_000_000, // Özkaynak oranı = 0.53 (>= 0.15)
      kisaVadeliBankaBorclariTL: 20_000_000, // Banka borcu / özkaynak = 0.25 (<= 0.75)
      yillikCiroTL: 120_000_000, // (>= 100M)
      isDeneyimiTutariTL: 600_000_000 // (>= 500M)
    });

    assert.equal(res.rasyolar.tumMaliRasyolarUygunMu, true);
    assert.equal(res.rasyolar.cariOran.uygunMu, true);
    assert.equal(res.rasyolar.ozkaynakOrani.uygunMu, true);
    assert.equal(res.rasyolar.bankaBorcuOrani.uygunMu, true);
    assert.equal(res.hakEdilenGrup.grup, "A");
    assert.equal(res.hakEdilenGrup.azamiInsaatAlaniM2, "SINIRSIZ");
  });

  it("mali rasyoları zayıf olan firmayı deneyim olsa bile H/G grubuyla sınırlandırır", () => {
    const res = evaluateYambisMaliRasyolar({
      donenVarliklarTL: 30_000_000,
      kisaVadeliBorclarTL: 60_000_000, // Cari oran = 0.50 (< 0.75 FAIL)
      toplamOzkaynakTL: 10_000_000,
      toplamAktifTL: 100_000_000, // Özkaynak oranı = 0.10 (< 0.15 FAIL)
      kisaVadeliBankaBorclariTL: 9_000_000, // Banka borcu / özkaynak = 0.90 (> 0.75 FAIL)
      yillikCiroTL: 50_000_000,
      isDeneyimiTutariTL: 100_000_000
    });

    assert.equal(res.rasyolar.tumMaliRasyolarUygunMu, false);
    assert.equal(res.rasyolar.cariOran.uygunMu, false);
    assert.equal(res.rasyolar.ozkaynakOrani.uygunMu, false);
    assert.equal(res.rasyolar.bankaBorcuOrani.uygunMu, false);
    // Mali rasyolar başarısız olduğu için E/A alamaz, deneyimle en fazla G alabilir
    assert.equal(res.hakEdilenGrup.grup, "G");
    assert.equal(res.hakEdilenGrup.azamiInsaatAlaniM2, 6000);
  });

  it("hiçbir bilanço ve deneyimi olmayan yeni girişimciyi H Grubu inkübatörüne yönlendirir", () => {
    const res = evaluateYambisMaliRasyolar({
      donenVarliklarTL: 0,
      kisaVadeliBorclarTL: 0,
      toplamOzkaynakTL: 0,
      toplamAktifTL: 0,
      kisaVadeliBankaBorclariTL: 0
    });

    assert.equal(res.hakEdilenGrup.grup, "H");
    assert.equal(res.hakEdilenGrup.azamiInsaatAlaniM2, 2101);
  });

  it("yaptırım ve iptal uyarısı (Yönetmelik m. 20) içerir", () => {
    const res = evaluateYambisMaliRasyolar({
      donenVarliklarTL: 10_000_000,
      kisaVadeliBorclarTL: 5_000_000,
      toplamOzkaynakTL: 10_000_000,
      toplamAktifTL: 20_000_000,
      kisaVadeliBankaBorclariTL: 2_000_000
    });

    assert.ok(res.yaptirimUyarilari.some(y => y.includes("5 yıl süreyle iptal")));
    assert.ok(res.yaptirimUyarilari.some(y => y.includes("sahte belge")));
  });
});
