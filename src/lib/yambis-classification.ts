/**
 * YAMBİS Müteahhitlik Yetki Belgesi Sınıflandırma ve Kapasite Motoru
 *
 * Yasal ve Teknik Dayanaklar:
 * 1. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı "Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik"
 * 2. Yönetmelik m. 8 (Ekonomik ve mali yeterlik - Cari oran, özkaynak oranı, banka borcu oranı)
 * 3. Yönetmelik m. 9 (Mesleki ve teknik yeterlik - İş deneyimi, yetki belgeli usta ve şantiye şefi)
 * 4. Yönetmelik m. 20 (İdari yaptırımlar ve yetki belgesi iptali - Ruhsata aykırılıkta 5 yıl iptal, sahte belgede derhal iptal)
 */

export interface YambisMaliInput {
  donenVarliklarTL: number;
  kisaVadeliBorclarTL: number;
  toplamOzkaynakTL: number;
  toplamAktifTL: number;
  kisaVadeliBankaBorclariTL: number;
  yillikCiroTL?: number;
  isDeneyimiTutariTL?: number;
}

export interface YambisRasyoSonucu {
  oranAdi: string;
  hesaplananDeger: number;
  esikDeger: number;
  kuralTipi: "MIN" | "MAX";
  uygunMu: boolean;
  aciklama: string;
}

export type YambisGrupKodu = "A" | "B" | "C" | "D" | "E" | "E1" | "F" | "G" | "H" | "YETKISIZ";

export interface YambisKapasiteSonucu {
  grup: YambisGrupKodu;
  grupAdi: string;
  azamiInsaatAlaniM2: number | "SINIRSIZ";
  aciklama: string;
  onKosullar: string[];
}

export interface YambisAnalizResult {
  rasyolar: {
    cariOran: YambisRasyoSonucu;
    ozkaynakOrani: YambisRasyoSonucu;
    bankaBorcuOrani: YambisRasyoSonucu;
    tumMaliRasyolarUygunMu: boolean;
  };
  hakEdilenGrup: YambisKapasiteSonucu;
  mevzuatKisitlamalari: string[];
  yaptirimUyarilari: string[];
}

export const YAMBİS_GRUP_LIMITLERI: Record<YambisGrupKodu, { ad: string; limitM2: number | "SINIRSIZ"; minCiroTL: number; minDeneyimTL: number; maliSartVar: boolean }> = {
  A: { ad: "A Grubu (En Üst Düzey)", limitM2: "SINIRSIZ", minCiroTL: 100_000_000, minDeneyimTL: 500_000_000, maliSartVar: true },
  B: { ad: "B Grubu", limitM2: 65_000, minCiroTL: 70_000_000, minDeneyimTL: 350_000_000, maliSartVar: true },
  C: { ad: "C Grubu", limitM2: 45_000, minCiroTL: 50_000_000, minDeneyimTL: 250_000_000, maliSartVar: true },
  D: { ad: "D Grubu", limitM2: 30_000, minCiroTL: 35_000_000, minDeneyimTL: 175_000_000, maliSartVar: true },
  E: { ad: "E Grubu", limitM2: 20_000, minCiroTL: 25_000_000, minDeneyimTL: 125_000_000, maliSartVar: true },
  E1: { ad: "E1 Grubu", limitM2: 15_686, minCiroTL: 15_000_000, minDeneyimTL: 75_000_000, maliSartVar: true },
  F: { ad: "F Grubu", limitM2: 11_765, minCiroTL: 0, minDeneyimTL: 30_000_000, maliSartVar: true },
  G: { ad: "G Grubu", limitM2: 6_000, minCiroTL: 0, minDeneyimTL: 5_000_000, maliSartVar: false },
  H: { ad: "H Grubu (İnkübatör)", limitM2: 2_101, minCiroTL: 0, minDeneyimTL: 0, maliSartVar: false },
  YETKISIZ: { ad: "Yetkisiz / Başvuru Yapamaz", limitM2: 0, minCiroTL: 0, minDeneyimTL: 0, maliSartVar: false }
};

export function evaluateYambisMaliRasyolar(input: YambisMaliInput): YambisAnalizResult {
  const {
    donenVarliklarTL,
    kisaVadeliBorclarTL,
    toplamOzkaynakTL,
    toplamAktifTL,
    kisaVadeliBankaBorclariTL,
    yillikCiroTL = 0,
    isDeneyimiTutariTL = 0
  } = input;

  // 1. Cari Oran = Dönen Varlıklar / Kısa Vadeli Yabancı Kaynaklar >= 0.75
  const cariOranDeger = kisaVadeliBorclarTL > 0 
    ? Math.round((donenVarliklarTL / kisaVadeliBorclarTL) * 100) / 100 
    : donenVarliklarTL > 0 ? 99 : 0;
  const cariOranUygun = cariOranDeger >= 0.75;

  const cariOranSonuc: YambisRasyoSonucu = {
    oranAdi: "Cari Oran (Likidite)",
    hesaplananDeger: cariOranDeger,
    esikDeger: 0.75,
    kuralTipi: "MIN",
    uygunMu: cariOranUygun,
    aciklama: cariOranUygun 
      ? `Cari oran (${cariOranDeger}) >= 0,75 eşiğini sağlamaktadır.`
      : `Cari oran (${cariOranDeger}) < 0,75 eşiğinin altındadır. Kısa vadeli borç baskısı yüksektir.`
  };

  // 2. Özkaynak Oranı = Toplam Özkaynak / Toplam Aktif >= 0.15
  const ozkaynakOranDeger = toplamAktifTL > 0 
    ? Math.round((toplamOzkaynakTL / toplamAktifTL) * 100) / 100 
    : 0;
  const ozkaynakOranUygun = ozkaynakOranDeger >= 0.15;

  const ozkaynakSonuc: YambisRasyoSonucu = {
    oranAdi: "Özkaynak Oranı (Sermaye Yeterliliği)",
    hesaplananDeger: ozkaynakOranDeger,
    esikDeger: 0.15,
    kuralTipi: "MIN",
    uygunMu: ozkaynakOranUygun,
    aciklama: ozkaynakOranUygun
      ? `Özkaynak oranı (${ozkaynakOranDeger}) >= 0,15 eşiğini sağlamaktadır.`
      : `Özkaynak oranı (${ozkaynakOranDeger}) < 0,15 eşiğinin altındadır. Sermaye tabanı yetersizdir.`
  };

  // 3. Kısa Vadeli Banka Borçları / Özkaynak <= 0.75
  const bankaBorcuOranDeger = toplamOzkaynakTL > 0 
    ? Math.round((kisaVadeliBankaBorclariTL / toplamOzkaynakTL) * 100) / 100 
    : kisaVadeliBankaBorclariTL > 0 ? 99 : 0;
  const bankaBorcuUygun = bankaBorcuOranDeger <= 0.75;

  const bankaBorcuSonuc: YambisRasyoSonucu = {
    oranAdi: "Kısa Vadeli Banka Borçları / Özkaynak Oranı",
    hesaplananDeger: bankaBorcuOranDeger,
    esikDeger: 0.75,
    kuralTipi: "MAX",
    uygunMu: bankaBorcuUygun,
    aciklama: bankaBorcuUygun
      ? `Banka borcu / özkaynak oranı (${bankaBorcuOranDeger}) <= 0,75 sınırının altındadır (uygun).`
      : `Banka borcu / özkaynak oranı (${bankaBorcuOranDeger}) > 0,75 sınırını aşmaktadır (aşırı borçluluk riski).`
  };

  const tumMaliRasyolarUygunMu = cariOranUygun && ozkaynakOranUygun && bankaBorcuUygun;

  // Grup belirleme hiyerarşisi
  let hakEdilenKod: YambisGrupKodu = "H";

  if (tumMaliRasyolarUygunMu) {
    if (yillikCiroTL >= YAMBİS_GRUP_LIMITLERI.A.minCiroTL && isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.A.minDeneyimTL) {
      hakEdilenKod = "A";
    } else if (yillikCiroTL >= YAMBİS_GRUP_LIMITLERI.B.minCiroTL && isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.B.minDeneyimTL) {
      hakEdilenKod = "B";
    } else if (yillikCiroTL >= YAMBİS_GRUP_LIMITLERI.C.minCiroTL && isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.C.minDeneyimTL) {
      hakEdilenKod = "C";
    } else if (yillikCiroTL >= YAMBİS_GRUP_LIMITLERI.D.minCiroTL && isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.D.minDeneyimTL) {
      hakEdilenKod = "D";
    } else if (yillikCiroTL >= YAMBİS_GRUP_LIMITLERI.E.minCiroTL && isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.E.minDeneyimTL) {
      hakEdilenKod = "E";
    } else if (yillikCiroTL >= YAMBİS_GRUP_LIMITLERI.E1.minCiroTL && isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.E1.minDeneyimTL) {
      hakEdilenKod = "E1";
    } else if (isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.F.minDeneyimTL) {
      hakEdilenKod = "F";
    } else {
      hakEdilenKod = "G";
    }
  } else {
    // Mali rasyolar yetersizse en fazla G veya H grubu alınabilir
    if (isDeneyimiTutariTL >= YAMBİS_GRUP_LIMITLERI.G.minDeneyimTL) {
      hakEdilenKod = "G";
    } else {
      hakEdilenKod = "H";
    }
  }

  const grupBilgisi = YAMBİS_GRUP_LIMITLERI[hakEdilenKod];
  const hakEdilenGrup: YambisKapasiteSonucu = {
    grup: hakEdilenKod,
    grupAdi: grupBilgisi.ad,
    azamiInsaatAlaniM2: grupBilgisi.limitM2,
    aciklama: hakEdilenKod === "H" 
      ? "H grubu yetki belgesi sektöre giriş kuluçkasıdır. Bilanço ve deneyim aranmaz ancak tek ruhsatta ~2.101 m² sınırına tabidir."
      : hakEdilenKod === "A"
      ? "A grubu en üst düzey sınıftır. Eksiksiz bilanço, yüksek ciro ve referans gerektirir. İnşaat alanı sınırlaması yoktur."
      : `${hakEdilenKod} grubu yetki belgesi ile tek ruhsatta azami yaklaşık ${grupBilgisi.limitM2} m² inşaat alanı üstlenebilirsiniz.`,
    onKosullar: [
      "Şantiyede yetki belgeli usta istihdamı zorunludur.",
      "Şantiye şefi sözleşmesi ve SGK bildirimi yapılmalıdır.",
      "Şantiye dosyası eksiksiz tutulmalıdır."
    ]
  };

  const mevzuatKisitlamalari = [
    "Geçmiş iş deneyim belgeleri başvuru tarihindeki cari katsayılarla güncellenerek hesaplanır.",
    "H grubu yetki belgesi sahipleri kamu yapım işi ihalelerinde doğrudan eşik değer sınırlarına takılır.",
    "5 yıl içinde tek bir müstakil yapı yapacak yapı sahipleri için 'Geçici Müteahhitlik Numarası' tahsis edilir."
  ];

  const yaptirimUyarilari = [
    "Yönetmelik m. 20: Ruhsata ve ruhsat eki projelere aykırı imalat yapılması ve idarece verilen sürede giderilmemesi halinde yetki belgesi 5 yıl süreyle iptal edilir.",
    "İhalelerde hile, sahte belge veya fen ve sanat kurallarına aykırı hileli malzeme kullanımı tespitinde derhal belge iptali ve olumsuz sicil kaydı uygulanır.",
    "Belgesi iptal edilen müteahhit mevcut başlamış işlerini tamamlayabilir ancak yeni yapı ruhsatı alamaz."
  ];

  return {
    rasyolar: {
      cariOran: cariOranSonuc,
      ozkaynakOrani: ozkaynakSonuc,
      bankaBorcuOrani: bankaBorcuSonuc,
      tumMaliRasyolarUygunMu
    },
    hakEdilenGrup,
    mevzuatKisitlamalari,
    yaptirimUyarilari
  };
}
