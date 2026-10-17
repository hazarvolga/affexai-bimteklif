import React, { useMemo, useState } from "react";
import { evaluateYambisMaliRasyolar, YAMBİS_GRUP_LIMITLERI, type YambisMaliInput } from "@/lib/yambis-classification";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

export const YambisCalculatorPage: React.FC = () => {
  const [donenVarliklar, setDonenVarliklar] = useState<string>("50000000");
  const [kisaVadeliBorclar, setKisaVadeliBorclar] = useState<string>("30000000");
  const [ozkaynak, setOzkaynak] = useState<string>("40000000");
  const [toplamAktif, setToplamAktif] = useState<string>("80000000");
  const [bankaBorclari, setBankaBorclari] = useState<string>("15000000");
  const [yillikCiro, setYillikCiro] = useState<string>("25000000");
  const [isDeneyimi, setIsDeneyimi] = useState<string>("80000000");

  const parsedInput = useMemo<YambisMaliInput | null>(() => {
    const parse = (v: string) => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

    const donen = parse(donenVarliklar);
    const kisaBorc = parse(kisaVadeliBorclar);
    const oz = parse(ozkaynak);
    const aktif = parse(toplamAktif);
    const banka = parse(bankaBorclari);
    const ciro = parse(yillikCiro);
    const deneyim = parse(isDeneyimi);

    return {
      donenVarliklarTL: donen,
      kisaVadeliBorclarTL: kisaBorc,
      toplamOzkaynakTL: oz,
      toplamAktifTL: aktif,
      kisaVadeliBankaBorclariTL: banka,
      yillikCiroTL: ciro,
      isDeneyimiTutariTL: deneyim
    };
  }, [donenVarliklar, kisaVadeliBorclar, ozkaynak, toplamAktif, bankaBorclari, yillikCiro, isDeneyimi]);

  const result = useMemo(() => {
    if (!parsedInput) return null;
    return evaluateYambisMaliRasyolar(parsedInput);
  }, [parsedInput]);

  return (
    <CalculatorShell
      title="YAMBİS Müteahhitlik Belge Grubu ve Kapasite Danışmanı | BIMMetraj"
      description="Çevre ve Şehircilik Bakanlığı Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği'ne göre bilanço rasyoları (cari oran, özkaynak), A-H yetki grubu ve azami inşaat alanı kapasitesi hesaplama."
      canonicalPath="/hesaplayicilar/yambis-muteahhitlik-grubu"
      heading="YAMBİS Müteahhitlik Belge Grubu & Kapasite Danışmanı"
      intro="Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik uyarınca bilanço rasyolarınızı (cari oran, özkaynak oranı, banka borçluluğu) test eder; hak edebileceğiniz yetki belgesi sınıfını (A'dan H'ye) ve üstlenebileceğiniz azami inşaat alanı (m²) kapasitesini belirler."
      sources={[
        { label: "Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik (Resmî Gazete)" },
        { label: "Yönetmelik madde 8: Ekonomik ve Mali Yeterlik Kriterleri (Cari oran ≥ 0,75, Özkaynak oranı ≥ 0,15, Banka borcu / Özkaynak ≤ 0,75)" },
        { label: "Yönetmelik madde 9: Mesleki ve Teknik Yeterlik (İş deneyim belgeleri, şantiye şefi ve yetki belgeli usta çalıştırma zorunluluğu)" },
        { label: "Yönetmelik madde 20: İdari Yaptırımlar ve Yetki Belgesi İptali (Ruhsata aykırılıkta 5 yıl iptal, etik ihlallerde derhal iptal)" }
      ]}
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sol Kolon: Bilanço ve Mali Tablo Girdileri */}
        <div className="space-y-4 border border-border bg-background p-5 lg:col-span-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Bilanço ve Mali Rasyolar</h2>

          <CalcField label="Dönen Varlıklar (₺)" hint="Kasa, banka, stoklar, kısa vadeli alacaklar">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Dönen Varlıklar"
              value={donenVarliklar}
              onChange={(e) => setDonenVarliklar(e.target.value)}
              placeholder="50.000.000"
            />
          </CalcField>

          <CalcField label="Kısa Vadeli Yabancı Kaynaklar / Borçlar (₺)">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Kısa Vadeli Borçlar"
              value={kisaVadeliBorclar}
              onChange={(e) => setKisaVadeliBorclar(e.target.value)}
              placeholder="30.000.000"
            />
          </CalcField>

          <CalcField label="Toplam Özkaynaklar (₺)" hint="Ödenmiş sermaye, kâr yedekleri ve geçmiş yıl kârları">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Toplam Özkaynaklar"
              value={ozkaynak}
              onChange={(e) => setOzkaynak(e.target.value)}
              placeholder="40.000.000"
            />
          </CalcField>

          <CalcField label="Toplam Aktif (Bilanço Büyüklüğü, ₺)">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Toplam Aktif"
              value={toplamAktif}
              onChange={(e) => setToplamAktif(e.target.value)}
              placeholder="80.000.000"
            />
          </CalcField>

          <CalcField label="Kısa Vadeli Banka Borçları (₺)">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Kısa Vadeli Banka Borçları"
              value={bankaBorclari}
              onChange={(e) => setBankaBorclari(e.target.value)}
              placeholder="15.000.000"
            />
          </CalcField>

          <h2 className="pt-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">Ciro ve İş Deneyimi</h2>

          <CalcField label="Son 3 Yıl Yıllık Ortalama Ciro (₺)" hint="E1 ve üstü gruplar için zorunludur">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Yıllık Ciro"
              value={yillikCiro}
              onChange={(e) => setYillikCiro(e.target.value)}
              placeholder="25.000.000"
            />
          </CalcField>

          <CalcField label="İş Deneyim Belgesi Tutarı (₺)" hint="Tamamlanmış / devam eden onaylı iş bitirme tutarı">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="İş Deneyim Tutarı"
              value={isDeneyimi}
              onChange={(e) => setIsDeneyimi(e.target.value)}
              placeholder="80.000.000"
            />
          </CalcField>
        </div>

        {/* Sağ Kolon: Rasyo Analizi ve Hak Edilen Belge Grubu */}
        <div className="space-y-5 border border-border bg-card p-5 lg:col-span-7">
          {result && (
            <>
              {/* Hak Edilen Grup Kartı */}
              <div className="border border-border bg-background p-5 space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hak Edilen / Başvurulabilecek Belge Grubu</span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display-serif text-3xl font-bold text-primary">{result.hakEdilenGrup.grupAdi}</h3>
                  <div className="font-mono text-sm font-semibold text-foreground">
                    Kapasite:{" "}
                    <span className="text-primary font-bold">
                      {typeof result.hakEdilenGrup.azamiInsaatAlaniM2 === "number"
                        ? `${fmtNum(result.hakEdilenGrup.azamiInsaatAlaniM2, 0)} m²`
                        : "SINIRSIZ"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{result.hakEdilenGrup.aciklama}</p>
              </div>

              {/* Bilanço Rasyoları Tablosu */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                    Yönetmelik Madde 8 Bilanço Uygunluk Denetimi
                  </h3>
                  <span className={`font-mono text-xs px-2 py-0.5 font-semibold ${
                    result.rasyolar.tumMaliRasyolarUygunMu 
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" 
                      : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"
                  }`}>
                    {result.rasyolar.tumMaliRasyolarUygunMu ? "MALİ RASYOLAR UYGUN" : "EKSİK RASYOLAR VAR"}
                  </span>
                </div>

                <div className="space-y-2">
                  {[result.rasyolar.cariOran, result.rasyolar.ozkaynakOrani, result.rasyolar.bankaBorcuOrani].map((r) => (
                    <div key={r.oranAdi} className="border border-border bg-background p-3 text-xs flex items-center justify-between gap-4">
                      <div>
                        <span className="font-semibold text-foreground block">{r.oranAdi}</span>
                        <span className="text-[11px] text-muted-foreground">{r.aciklama}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-sm font-bold block text-foreground">
                          {r.hesaplananDeger.toFixed(2)}
                        </span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 font-bold ${
                          r.uygunMu 
                            ? "text-emerald-700 dark:text-emerald-400" 
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {r.uygunMu ? "GEÇTİ (✓)" : "KALDI (✗)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Belge Grupları Hiyerarşisi */}
              <div className="space-y-2">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                  YAMBİS Belge Grupları ve Kapasite Sınırları
                </h3>
                <div className="overflow-x-auto border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 font-mono text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2">Grup</th>
                        <th className="p-2 text-right">Azami Alan (m²)</th>
                        <th className="p-2 text-right">Min. Ciro</th>
                        <th className="p-2 text-right">Min. Deneyim</th>
                        <th className="p-2 text-center">Mali Şart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(["A", "B", "C", "D", "E", "E1", "F", "G", "H"] as const).map((kod) => {
                        const item = YAMBİS_GRUP_LIMITLERI[kod];
                        const isCurrent = result.hakEdilenGrup.grup === kod;
                        return (
                          <tr key={kod} className={isCurrent ? "bg-primary/10 font-semibold" : "hover:bg-muted/10"}>
                            <td className="p-2 font-mono">
                              {kod} {isCurrent && <span className="ml-1 text-[10px] text-primary font-bold">(SEÇİLEN)</span>}
                            </td>
                            <td className="p-2 text-right font-mono">
                              {typeof item.limitM2 === "number" ? fmtNum(item.limitM2, 0) : "SINIRSIZ"}
                            </td>
                            <td className="p-2 text-right font-mono text-muted-foreground">
                              {item.minCiroTL > 0 ? fmtTry(item.minCiroTL) : "Aranmaz"}
                            </td>
                            <td className="p-2 text-right font-mono text-muted-foreground">
                              {item.minDeneyimTL > 0 ? fmtTry(item.minDeneyimTL) : "Aranmaz"}
                            </td>
                            <td className="p-2 text-center font-mono text-[11px]">
                              {item.maliSartVar ? "Zorunlu" : "Yok"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* İdari Yaptırımlar ve Uyarılar */}
              <div className="border-l-2 border-primary bg-muted/20 p-4 text-xs space-y-2">
                <h4 className="font-mono font-semibold uppercase tracking-wider text-foreground">
                  Yönetmelik Madde 20 İptal ve Yaptırım Hükümleri
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted-foreground">
                  {result.yaptirimUyarilari.map((y, i) => (
                    <li key={i}>{y}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </section>
    </CalculatorShell>
  );
};

export default YambisCalculatorPage;
