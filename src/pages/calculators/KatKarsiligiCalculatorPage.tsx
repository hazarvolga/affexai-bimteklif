import React, { useMemo, useState } from "react";
import { calculateKatKarsiligi, type KatKarsiligiInput } from "@/lib/kat-karsiligi";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

export const KatKarsiligiCalculatorPage: React.FC = () => {
  const [arsaAlani, setArsaAlani] = useState<string>("1000");
  const [kaksEmsal, setKaksEmsal] = useState<string>("1.50");
  const [brutCarpani, setBrutCarpani] = useState<string>("1.30");
  const [birimMaliyet, setBirimMaliyet] = useState<string>("24000");
  const [bolgeSatis, setBolgeSatis] = useState<string>("55000");
  const [isKentselDonusum, setIsKentselDonusum] = useState<boolean>(true);
  const [konutNetM2, setKonutNetM2] = useState<string>("100");
  const [karCarpani, setKarCarpani] = useState<string>("1.20");

  const parsedInput = useMemo<KatKarsiligiInput | null>(() => {
    const arsa = parseFloat(arsaAlani.replace(/\./g, "").replace(",", "."));
    const emsal = parseFloat(kaksEmsal.replace(",", "."));
    const brut = parseFloat(brutCarpani.replace(",", "."));
    const maliyet = parseFloat(birimMaliyet.replace(/\./g, "").replace(",", "."));
    const satis = parseFloat(bolgeSatis.replace(/\./g, "").replace(",", "."));
    const netM2 = parseFloat(konutNetM2.replace(",", "."));
    const risk = parseFloat(karCarpani.replace(",", "."));

    if (isNaN(arsa) || arsa <= 0 || isNaN(emsal) || emsal <= 0 || isNaN(maliyet) || maliyet <= 0 || isNaN(satis) || satis <= 0) {
      return null;
    }

    return {
      arsaAlaniM2: arsa,
      kaksEmsal: emsal,
      brutInsaatCarpani: isNaN(brut) ? 1.30 : brut,
      birimInsaatMaliyetiTL: maliyet,
      bolgeSatisFiyatiTL: satis,
      isKentselDonusum6306: isKentselDonusum,
      ortalamaKonutNetM2: isNaN(netM2) ? 100 : netM2,
      muteahhitKarVeRiskCarpani: isNaN(risk) ? 1.20 : risk
    };
  }, [arsaAlani, kaksEmsal, brutCarpani, birimMaliyet, bolgeSatis, isKentselDonusum, konutNetM2, karCarpani]);

  const result = useMemo(() => {
    if (!parsedInput) return null;
    try {
      return calculateKatKarsiligi(parsedInput);
    } catch {
      return null;
    }
  }, [parsedInput]);

  return (
    <CalculatorShell
      title="Kat Karşılığı & Kentsel Dönüşüm Fizibilite Hesaplayıcı (6306 s.K. & TBK 6098) | BIMMetraj"
      description="Arsa payı karşılığı inşaat ve 6306 kentsel dönüşüm projelerinde rasyonel paylaşım oranı, kademeli tapu devri hakediş planı ve %1 KDV teşvik hesaplama aracı."
      canonicalPath="/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum"
      heading="Kat Karşılığı & Kentsel Dönüşüm Fizibilite Hesaplayıcısı"
      intro="6098 sayılı TBK ve 6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Kanunu kapsamında; inşaat maliyeti, bölge satış rayici ve emsal verilerinden rasyonel müteahhit/arsa sahibi paylaşım oranını, 4 aşamalı kademeli tapu devri hakediş planını ve 2026 güncel KDV avantajını hesaplar."
      sources={[
        { label: "6098 sayılı Türk Borçlar Kanunu, madde 470 vd. (Eser Sözleşmesi ve Arsa Payı Karşılığı İnşaat)" },
        { label: "6306 sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun (Kentsel dönüşüm harç muafiyeti ve vergi teşvikleri)" },
        { label: "3065 sayılı Katma Değer Vergisi Kanunu (2026 güncel konut teslimi matrahları: 6306 kapsamında %1, standart %10, ticari/lüks kademeli %20)" },
        { label: "Yargıtay 15. Hukuk Dairesi ve Hukuk Genel Kurulu yerleşik kararları (Kademeli hakediş devir ilkeleri ve müspet zarar kâr kaybı hakkı)" },
        { label: "Sektörel Rasyonel Formül: Müteahhit Payı = (İnşaat Maliyeti × 1,20) / Bölge Satış Fiyatı" }
      ]}
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sol Kolon: Girdiler */}
        <div className="space-y-4 border border-border bg-background p-5 lg:col-span-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Proje ve İmar Parametreleri</h2>

          <CalcField label="Arsa Alanı (m²)">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Arsa Alanı"
              value={arsaAlani}
              onChange={(e) => setArsaAlani(e.target.value)}
              placeholder="örn. 1.000"
            />
          </CalcField>

          <div className="grid grid-cols-2 gap-3">
            <CalcField label="Emsal (KAKS)" hint="örn. 1.50, 2.07">
              <input
                className={calcInputClass}
                inputMode="decimal"
                aria-label="Emsal KAKS"
                value={kaksEmsal}
                onChange={(e) => setKaksEmsal(e.target.value)}
                placeholder="1.50"
              />
            </CalcField>
            <CalcField label="Brüt Çıkma Çarpanı" hint="Ortak alan/balkon (vars. 1.30)">
              <input
                className={calcInputClass}
                inputMode="decimal"
                aria-label="Brüt Çıkma Çarpanı"
                value={brutCarpani}
                onChange={(e) => setBrutCarpani(e.target.value)}
                placeholder="1.30"
              />
            </CalcField>
          </div>

          <h2 className="pt-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">Maliyet ve Satış Rayiçleri</h2>

          <CalcField label="Birim İnşaat Maliyeti (₺ / m² brüt)" hint="Ruhsat, harç ve müteahhitlik maliyeti">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Birim İnşaat Maliyeti"
              value={birimMaliyet}
              onChange={(e) => setBirimMaliyet(e.target.value)}
              placeholder="24.000"
            />
          </CalcField>

          <CalcField label="Bölge Sıfır Konut Satış Fiyatı (₺ / m² net-brüt)">
            <input
              className={calcInputClass}
              inputMode="decimal"
              aria-label="Bölge Sıfır Konut Satış Fiyatı"
              value={bolgeSatis}
              onChange={(e) => setBolgeSatis(e.target.value)}
              placeholder="55.000"
            />
          </CalcField>

          <div className="border border-border bg-card p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isKentselDonusum}
                onChange={(e) => setIsKentselDonusum(e.target.checked)}
                className="h-4 w-4 border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-foreground">6306 Sayılı Kentsel Dönüşüm Projesi</span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              6306 kapsamında 150 m² altı bağımsız bölümlerde KDV %1'e düşer, belediye harçları ve tapu harcından muafiyet sağlanır.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CalcField label="Ortalama Daire Net m²" hint="vars. 100 m²">
              <input
                className={calcInputClass}
                inputMode="decimal"
                aria-label="Ortalama Daire Net m²"
                value={konutNetM2}
                onChange={(e) => setKonutNetM2(e.target.value)}
                placeholder="100"
              />
            </CalcField>
            <CalcField label="Müteahhit Risk Çarpanı" hint="vars. 1.20 (%20 kâr)">
              <input
                className={calcInputClass}
                inputMode="decimal"
                aria-label="Müteahhit Risk Çarpanı"
                value={karCarpani}
                onChange={(e) => setKarCarpani(e.target.value)}
                placeholder="1.20"
              />
            </CalcField>
          </div>
        </div>

        {/* Sağ Kolon: Sonuçlar */}
        <div className="space-y-4 border border-border bg-card p-5 lg:col-span-7">
          {!result ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              Lütfen sol taraftaki imar ve maliyet parametrelerini eksiksiz girin.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Durum Rozeti */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Fizibilite Değerlendirmesi</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-block px-2.5 py-0.5 font-mono text-xs font-semibold ${
                      result.fizibiliteDurumu === "FIZIBIL"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : result.fizibiliteDurumu === "RISKLI"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"
                    }`}>
                      {result.fizibiliteDurumu === "FIZIBIL" ? "DENGELİ & FİZİBIL" : result.fizibiliteDurumu === "RISKLI" ? "YÜKSEK RİSKLİ" : "FİZİBİL DEĞİL"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Öngörülen Müteahhit Kâr Marjı</span>
                  <p className="font-mono text-lg font-bold text-foreground">%{result.muteahhitKarMarjiYuzde.toFixed(1)}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{result.fizibiliteMesaji}</p>

              {/* Paylaşım Oranları Matrisi */}
              <div className="grid grid-cols-2 gap-4 border border-border bg-background p-4 text-center">
                <div className="border-r border-border pr-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Rasyonel Müteahhit Payı</span>
                  <p className="mt-1 font-display-serif text-3xl font-bold text-primary">%{result.hesaplananMuteahhitOraniYuzde.toFixed(1)}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{fmtNum(result.muteahhitPayiM2, 1)} m² satılabilir alan</p>
                </div>
                <div className="pl-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Arsa Sahibi Payı</span>
                  <p className="mt-1 font-display-serif text-3xl font-bold text-foreground">%{result.rasyonelArsaSahibiOraniYuzde.toFixed(1)}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{fmtNum(result.arsaSahibiPayiM2, 1)} m² teslim alanı</p>
                </div>
              </div>

              {/* Finansal Döküm */}
              <div className="space-y-2 border border-border bg-background p-4 text-xs font-mono">
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Emsale Esas Toplam Alan:</span>
                  <span className="text-foreground">{fmtNum(result.emsaleEsasAlanM2, 1)} m²</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Toplam Brüt İnşaat Alanı (Çıkmalar Dahil):</span>
                  <span className="text-foreground">{fmtNum(result.toplamBrutInsaatAlaniM2, 1)} m²</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Toplam Proje İmalat Maliyeti:</span>
                  <span className="text-foreground">{fmtTry(result.toplamInsaatMaliyetiTL)}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Toplam Proje Brüt Hasılatı:</span>
                  <span className="text-foreground">{fmtTry(result.toplamProjeHasilatiTL)}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Müteahhidin Brüt Hasılatı:</span>
                  <span className="text-foreground">{fmtTry(result.muteahhitHasilatiTL)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold">
                  <span className="text-primary">Müteahhit Net Kârı:</span>
                  <span className="text-primary">{fmtTry(result.muteahhitNetKariTL)}</span>
                </div>
              </div>

              {/* KDV ve Teşvik Rejimi */}
              <div className="border border-border bg-background p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-foreground">2026 KDV & Teşvik Durumu:</span>
                  <span className="font-mono font-bold text-primary">KDV %{result.kdvRejimi.kdvOraniYuzde}</span>
                </div>
                {result.kdvRejimi.tapuHarciMuafiyetiVar ? (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    ✓ 6306 sayılı Kanun kapsamında tapu harcı muafiyeti geçerlidir. %1 KDV teşviki ile projede sağlanan tahmini KDV avantajı: <strong>{fmtTry(result.kdvRejimi.kentselDonusumAvantajiTL)}</strong>
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Standart konut tesliminde %10 KDV ve tapu devir harcı yükümlülüğü uygulanır.
                  </p>
                )}
              </div>

              {/* Kademeli Tapu Devri Güvence Planı */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                    Kademeli Tapu Devir Planı (Hakediş Usulü)
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Yargıtay 15. H.D. Uyumlu</span>
                </div>

                <div className="overflow-x-auto border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 font-mono text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2">Aşama</th>
                        <th className="p-2 text-right">Pay</th>
                        <th className="p-2 text-right">Kümülatif</th>
                        <th className="p-2">Teknik Şart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.kademeliTapuDevirPlani.map((asama) => (
                        <tr key={asama.asamaNo} className="hover:bg-muted/10">
                          <td className="p-2 font-medium text-foreground">{asama.asamaAdi}</td>
                          <td className="p-2 text-right font-mono text-primary font-semibold">%{asama.payOrani}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground font-semibold">%{asama.kumulatifOran}</td>
                          <td className="p-2 text-[11px] text-muted-foreground">{asama.teknikKriter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-l-2 border-primary bg-muted/20 p-3 text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground">Hukuki Güvenlik Notu:</p>
                  <p className="mt-1">{result.hukukiUyariNotu}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </CalculatorShell>
  );
};

export default KatKarsiligiCalculatorPage;
