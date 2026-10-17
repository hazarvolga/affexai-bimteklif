import React, { useMemo, useState } from "react";
import { evaluateKikForm, type KikFormState } from "@/lib/calculators/kik-form";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

export const KikAdtCalculatorPage: React.FC = () => {
  const [form, setForm] = useState<KikFormState>({ ym: "", category: "", bids: "", ourBid: "", items: "" });
  const set = <K extends keyof KikFormState>(k: K, v: KikFormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const outcome = useMemo(() => evaluateKikForm(form), [form]);

  return (
    <CalculatorShell
      title="Aşırı Düşük Teklif Sınır Değeri Hesaplama (KİK m.38, Tebliğ 45.1) | BIMMetraj"
      description="Yapım işlerinde aşırı düşük teklif sınır değerini Kamu İhale Genel Tebliği m.45.1.1 formülüyle hesaplayın: yaklaşık maliyet, teklifler, K katsayısı ve sınır değer. Varsayılan değer yok, adım adım gösterim."
      canonicalPath="/hesaplayicilar/kik-asiri-dusuk-teklif"
      heading="Aşırı Düşük Teklif Sınır Değeri"
      intro="4734 sayılı Kanun m.38 ve Kamu İhale Genel Tebliği m.45.1.1 uyarınca yapım işlerinde sınır değeri (SD) hesaplar. Yaklaşık maliyeti ve ilk oturumdaki geçerli teklifleri siz girersiniz; hiçbir değer varsayılmaz."
      sources={[
        { label: "4734 sayılı Kamu İhale Kanunu, madde 38 (aşırı düşük teklifler)" },
        { label: "Kamu İhale Genel Tebliği, madde 45.1.1, 45.1.1.1, 45.1.1.4 ve 45.1.2 (yapım işleri sınır değer ve iş kalemi açıklaması)" },
        { label: "Formül uygulaması: src/lib/kik-adt.ts, golden testleri src/lib/kik-adt.golden.test.ts" },
      ]}
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 border border-border bg-background p-5">
          <CalcField label="Yaklaşık maliyet (YM, ₺)">
            <input className={calcInputClass} inputMode="decimal" aria-label="Yaklaşık maliyet" value={form.ym} onChange={(e) => set("ym", e.target.value)} placeholder="örn. 100.000.000" />
          </CalcField>
          <CalcField label="İş grubu" hint="N katsayısı iş grubuna göre belirlenir (Tebliğ m.45.1.1.1).">
            <select
              aria-label="İş grubu"
              value={form.category}
              onChange={(e) => set("category", e.target.value as KikFormState["category"])}
              className="w-full border border-border bg-card px-2 py-1.5 text-sm"
            >
              <option value="">seçin</option>
              <option value="ust_yapi">Üstyapı, elektrik, mekanik, elektronik/iletişim (N = 1,00)</option>
              <option value="alt_yapi">Diğer yapım işleri, altyapı vb. (N = 1,20)</option>
            </select>
          </CalcField>
          <CalcField label="Geçerli teklifler (₺)" hint="Her satıra bir teklif yazın. İlk oturumdaki geçerli teklifler.">
            <textarea
              aria-label="Geçerli teklifler"
              value={form.bids}
              onChange={(e) => set("bids", e.target.value)}
              rows={6}
              className="w-full border border-border bg-card px-2 py-1.5 text-sm font-mono"
              placeholder={"70.000.000\n80.000.000\n90.000.000"}
            />
          </CalcField>
          <CalcField label="Sizin teklifiniz (₺, isteğe bağlı)" hint="Girerseniz sınır değerin altında kalıp kalmadığı da gösterilir.">
            <input className={calcInputClass} inputMode="decimal" aria-label="Sizin teklifiniz" value={form.ourBid} onChange={(e) => set("ourBid", e.target.value)} />
          </CalcField>
          <CalcField label="İş kalemleri (isteğe bağlı)" hint="Her satır: açıklama;tutar. Girerseniz açıklama istenecek kalemler (%80) listelenir.">
            <textarea
              aria-label="İş kalemleri"
              value={form.items}
              onChange={(e) => set("items", e.target.value)}
              rows={4}
              className="w-full border border-border bg-card px-2 py-1.5 text-sm font-mono"
              placeholder={"Kaba inşaat;42.000.000\nİnce işler;28.000.000"}
            />
          </CalcField>
        </div>

        <div className="border border-border bg-card p-5 text-sm" aria-live="polite" data-testid="kik-result">
          {outcome.status === "incomplete" && (
            <div>
              <p className="font-semibold">Hesap için eksik girdiler</p>
              <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                {outcome.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {outcome.status === "error" && (
            <ul className="list-disc pl-4 text-destructive">
              {outcome.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {outcome.status === "ok" && (
            <div className="space-y-4">
              <div className="border border-border bg-background p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sınır değer (SD)</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{fmtTry(outcome.result.boundaryValueTry)}</div>
                {outcome.hasOurBid && (
                  <p className={`mt-2 text-sm font-semibold ${outcome.result.isAbnormallyLow ? "text-destructive" : "text-foreground"}`}>
                    {outcome.result.isAbnormallyLow
                      ? `Teklifiniz sınır değerin altında (${fmtNum(outcome.result.marginToBoundaryPercent, 2)} %): aşırı düşük teklif açıklaması istenir.`
                      : `Teklifiniz sınır değerin üzerinde (fark ${fmtNum(outcome.result.marginToBoundaryPercent, 2)} %).`}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt>Değerlendirmeye alınan teklif</dt><dd className="text-right font-mono">{outcome.result.admittedBidsTry.length}</dd>
                <dt>%40 YM altında elenen</dt><dd className="text-right font-mono">{outcome.result.excludedBelow40PercentYmBidsTry.length}</dd>
                <dt>%120 YM üstünde elenen</dt><dd className="text-right font-mono">{outcome.result.excludedAbove120PercentYmBidsTry.length}</dd>
                <dt>T_ort1</dt><dd className="text-right font-mono">{fmtTry(outcome.result.firstMeanTry)}</dd>
                <dt>Standart sapma (σ)</dt><dd className="text-right font-mono">{fmtTry(outcome.result.standardDeviationTry)}</dd>
                <dt>T_ort2</dt><dd className="text-right font-mono">{fmtTry(outcome.result.correctedMeanTry)}</dd>
                <dt>C = T_ort2 / YM</dt><dd className="text-right font-mono">{fmtNum(outcome.result.cRatio, 6)}</dd>
                <dt>K katsayısı</dt><dd className="text-right font-mono">{fmtNum(outcome.result.kFactor, 6)}</dd>
                <dt>N katsayısı</dt><dd className="text-right font-mono">{fmtNum(outcome.result.nCoefficient, 2)}</dd>
              </dl>
              {outcome.warnings.map((w) => (
                <p key={w} className="text-xs text-muted-foreground">{w}</p>
              ))}
              {outcome.result.explanationRequiredItems.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
                    Açıklama istenecek iş kalemleri (m.45.1.2, %80)
                  </div>
                  <ul className="mt-1 divide-y divide-border text-xs">
                    {outcome.result.explanationRequiredItems.map((i) => (
                      <li key={i.id} className="flex justify-between py-1">
                        <span>{i.description}</span>
                        <span className="font-mono tabular-nums">{fmtTry(i.totalAmount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 text-sm text-muted-foreground">
        <h2 className="font-display-serif text-2xl text-foreground">Hesap nasıl yapılır?</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>YM'nin %40'ından düşük ve %120'sinden yüksek teklifler dikkate alınmaz.</li>
          <li>Kalan tekliflerin aritmetik ortalaması (T_ort1) ve standart sapması (σ) bulunur.</li>
          <li>T_ort1 ± σ aralığındaki tekliflerin ortalaması (T_ort2) alınır.</li>
          <li>C = T_ort2 / YM hesaplanır ve C'ye göre K katsayısı belirlenir.</li>
          <li>SD = K × T_ort2 / (C × N); SD, YM'nin %40'ından küçükse %40 YM alınır.</li>
        </ol>
      </section>
    </CalculatorShell>
  );
};

export default KikAdtCalculatorPage;
