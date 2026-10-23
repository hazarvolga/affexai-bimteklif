import React, { useMemo, useState } from "react";
import { evaluateKikForm, type KikFormState } from "@/lib/calculators/kik-form";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

export const KikAdtCalculatorPage: React.FC = () => {
  const [form, setForm] = useState<KikFormState>({ ym: "", category: "", bids: "", ourBid: "", items: "", nOverride: "", administrationSourceIdentity: "" });
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
        { label: "Kamu İhale Genel Tebliği m.45.1.1, 45.1.1.1, 45.1.1.4, 45.1.2 ve 45.2 örneği; RG 29.12.2010/27800 6. Mükerrer: https://www.resmigazete.gov.tr/eskiler/2010/12/20101229M6-13.htm" },
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
          <CalcField label="İdarenin belirlediği N (isteğe bağlı)" hint="İdare ilanda veya idari şartnamede 1,00–1,20 arasında farklı bir N belirlediyse girin; boşsa iş grubunun N değeri kullanılır.">
            <input className={calcInputClass} inputMode="decimal" aria-label="İdarenin belirlediği N" value={form.nOverride ?? ""} onChange={(e) => set("nOverride", e.target.value)} placeholder="örn. 1,10" />
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
          <CalcField label="İdare yaklaşık maliyet cetveli kaynak kimliği" hint="Bu alan kullanıcı beyanıdır. Resmî %80 listesi için ayrıca kurum, belge kimliği ve SHA-256 ile doğrulanmış artifact gerekir; bu kanıt olmadan sonuç danışma düzeyinde kalır.">
            <input
              className={calcInputClass}
              aria-label="İdare yaklaşık maliyet cetveli kaynak kimliği"
              value={form.administrationSourceIdentity ?? ""}
              onChange={(e) => set("administrationSourceIdentity", e.target.value)}
              placeholder="örn. 2026/123456 · YM-CETVELİ v2"
            />
          </CalcField>
          <CalcField label="İdare yaklaşık maliyet iş kalemleri (isteğe bağlı)" hint="Her satır: açıklama;tutar. Toplam YM ile kuruş düzeyinde eşleşse bile doğrulanmış artifact olmadan m.45.1.2 listesi resmî olarak değerlendirilmez.">
            <textarea
              aria-label="İdare yaklaşık maliyet iş kalemleri"
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
              <div className={`border p-3 text-xs ${outcome.result.officialExplanationListStatus === "evaluated" ? "border-primary/40 bg-primary/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                <strong>{outcome.result.officialExplanationListStatus === "evaluated" ? "Resmî %80 listesi değerlendirildi" : "Resmî %80 listesi değerlendirilmedi"}</strong>
                {outcome.result.administrationEstimatedCostSourceIdentity && (
                  <span className="mt-1 block font-mono">Kaynak: {outcome.result.administrationEstimatedCostSourceIdentity}</span>
                )}
                {outcome.result.officialExplanationListReason && (
                  <span className="mt-1 block text-muted-foreground">{outcome.result.officialExplanationListReason}</span>
                )}
              </div>
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
        <p className="text-xs">Bu hesaplayıcı yalnızca <strong>yapım işleri</strong> içindir; hizmet alımlarında eşikler farklıdır. İdari şartnamede sınır değerin altında kalan tekliften açıklama istenip istenmeyeceği idarenin seçimine bağlıdır; açıklama istenmeyen ihalelerde sınır değerin altındaki teklif doğrudan reddedilebilir, bu yüzden N değerini ve bu seçeneği ihale dokümanından okuyun.</p>
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
