import React, { useMemo, useRef, useState } from "react";
import { evaluateEscalationForm, type EscalationFormState, type EscalationRowState } from "@/lib/calculators/escalation-form";
import { CSB_2026_TUIK_SUB_INDICES } from "@/lib/price-escalation";
import { CalculationFeedback } from "@/features/expert-feedback/CalculationFeedback";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

const emptyRow = (): EscalationRowState => ({
  indexCode: "", weight: "", baseIndex: "", currentIndex: "", seriesId: "", basePeriod: "",
  currentPeriod: "", sourceUrl: "", sourcePublicationDate: "",
});

export const PriceEscalationCalculatorPage: React.FC = () => {
  const keys = useRef(1);
  const [rowKeys, setRowKeys] = useState<number[]>([0]);
  const [form, setForm] = useState<EscalationFormState>({
    progressPayment: "",
    bFactor: "",
    constantWeight: "",
    rows: [emptyRow()],
    tenderDate: "",
    contractDate: "",
    contractReference: "",
    bFactorSource: "",
    weightsSource: "",
    workSchedulePeriod: "",
    applicationPeriod: "",
    delayResponsibility: "unknown",
    delayLegalBasis: "",
    advancePayment: "",
    advanceDeduction: "",
    advanceDeductionSource: "",
  });
  const outcome = useMemo(() => evaluateEscalationForm(form), [form]);
  const updateRow = (i: number, patch: Partial<EscalationRowState>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));

  return (
    <CalculatorShell
      title="4735 Fiyat Farkı Hesaplama (F = A × B × (Pn − 1)) | BIMMetraj"
      description="Kamu yapım işlerinde 4735 sayılı Kanun fiyat farkını hesaplayın: hakediş tutarı, B katsayısı, sabit katsayı ve TÜİK alt endeks ağırlıklarıyla Pn ve fiyat farkı. Endeks değerlerini siz girersiniz."
      canonicalPath="/hesaplayicilar/fiyat-farki-4735"
      heading="4735 Fiyat Farkı (F = A × B × (Pn − 1))"
      intro="Hakediş tutarını, sözleşmenizdeki katsayıları, iş programı/uygulama ayını, avans mahsubunu ve kaynaklı endeks değerlerini girin. Değerler otomatik çekilmez. Eski veya gecikmeli iş rejimi kanıtsız türetilmez; gerekli durumda sonuç yerine manuel inceleme gösterilir."
      sources={[
        { label: "4735 sayılı Kamu İhale Sözleşmeleri Kanunu, madde 8 (fiyat farkı)" },
        { label: "30.07.2025 tarihli Resmî Gazete 32971; ilgili değişikliklerin 01.09.2025 yürürlük bağlamı" },
        { label: "Yapım İşlerinde Uygulanacak Fiyat Farkına İlişkin Esaslar ve sözleşmenizin fiyat farkı formülü" },
        { label: "Alt endeks listesi: ÇŞB 2026 rayiç – TÜİK endeks eşleştirme tablosu (21 alt endeks)" },
        { label: "Formül uygulaması: src/lib/price-escalation.ts, testleri src/lib/price-escalation.test.ts" },
      ]}
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 border border-border bg-background p-5">
          <CalcField label="Hakediş tutarı A_n (₺)">
            <input className={calcInputClass} inputMode="decimal" aria-label="Hakediş tutarı" value={form.progressPayment} onChange={(e) => setForm({ ...form, progressPayment: e.target.value })} placeholder="örn. 1.000.000" />
          </CalcField>
          <div className="grid grid-cols-2 gap-3">
            <CalcField label="İhale tarihi" hint="RG 32971 değişikliği 01.09.2025 yürürlük bağlamında değerlendirilir.">
              <input className={calcInputClass} type="date" aria-label="İhale tarihi" value={form.tenderDate} onChange={(e) => setForm({ ...form, tenderDate: e.target.value })} />
              <input className={calcInputClass} type="date" aria-label="Sözleşme tarihi" value={form.contractDate} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} />
            </CalcField>
            <CalcField label="Sözleşme referansı">
              <input className={calcInputClass} aria-label="Sözleşme referansı" value={form.contractReference} onChange={(e) => setForm({ ...form, contractReference: e.target.value })} placeholder="örn. md. 14 / EK-2" />
            </CalcField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CalcField label="B katsayısı" hint="Sözleşmenizdeki değer.">
              <input className={calcInputClass} inputMode="decimal" aria-label="B katsayısı" value={form.bFactor} onChange={(e) => setForm({ ...form, bFactor: e.target.value })} />
            </CalcField>
            <CalcField label="Endekse bağlı olmayan sabit terim (varsa)" hint="Sözleşmenizin formülünde sabit bir katsayı varsa girin (sembolü sözleşmeye göre değişir); yoksa boş bırakın.">
              <input className={calcInputClass} inputMode="decimal" aria-label="Sabit katsayı" value={form.constantWeight} onChange={(e) => setForm({ ...form, constantWeight: e.target.value })} />
            </CalcField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CalcField label="B katsayısı kaynağı">
              <input className={calcInputClass} aria-label="B katsayısı kaynağı" value={form.bFactorSource} onChange={(e) => setForm({ ...form, bFactorSource: e.target.value })} />
            </CalcField>
            <CalcField label="Ağırlıklar kaynağı">
              <input className={calcInputClass} aria-label="Ağırlıklar kaynağı" value={form.weightsSource} onChange={(e) => setForm({ ...form, weightsSource: e.target.value })} />
            </CalcField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CalcField label="Onaylı iş programı ayı">
              <input className={calcInputClass} type="month" aria-label="Onaylı iş programı ayı" value={form.workSchedulePeriod} onChange={(e) => setForm({ ...form, workSchedulePeriod: e.target.value })} />
            </CalcField>
            <CalcField label="Uygulama / hakediş ayı">
              <input className={calcInputClass} type="month" aria-label="Uygulama ayı" value={form.applicationPeriod} onChange={(e) => setForm({ ...form, applicationPeriod: e.target.value })} />
            </CalcField>
          </div>
          <CalcField label="Gecikme sorumluluğu">
            <select className={calcInputClass} aria-label="Gecikme sorumluluğu" value={form.delayResponsibility} onChange={(e) => setForm({ ...form, delayResponsibility: e.target.value as EscalationFormState["delayResponsibility"] })}>
              <option value="unknown">Belirlenmedi</option>
              <option value="none">Gecikme yok</option>
              <option value="contractor">Yüklenici</option>
              <option value="administration">İdare</option>
              <option value="force_majeure">Mücbir sebep</option>
            </select>
          </CalcField>
          <CalcField label="İş programı / gecikme hukuki dayanağı">
            <input className={calcInputClass} aria-label="Gecikme hukuki dayanağı" value={form.delayLegalBasis} onChange={(e) => setForm({ ...form, delayLegalBasis: e.target.value })} />
          </CalcField>
          <div className="grid grid-cols-2 gap-3">
            <CalcField label="Verilen avans (₺)" hint="Yoksa 0 girin.">
              <input className={calcInputClass} inputMode="decimal" aria-label="Verilen avans" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} />
            </CalcField>
            <CalcField label="Bu hakedişte avans mahsubu (₺)" hint="Yoksa 0 girin.">
              <input className={calcInputClass} inputMode="decimal" aria-label="Avans mahsubu" value={form.advanceDeduction} onChange={(e) => setForm({ ...form, advanceDeduction: e.target.value })} />
            </CalcField>
          </div>
          <CalcField label="Avans / mahsup kaynağı">
            <input className={calcInputClass} aria-label="Avans mahsup kaynağı" value={form.advanceDeductionSource} onChange={(e) => setForm({ ...form, advanceDeductionSource: e.target.value })} />
          </CalcField>

          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Endeks bileşenleri (ağırlıklar + a toplamı 1,00 olmalı)</div>
            {form.rows.map((row, i) => (
              <div key={rowKeys[i]} className="space-y-2 border border-border bg-card p-3">
                <select
                  aria-label={`Endeks ${i + 1}`}
                  value={row.indexCode}
                  onChange={(e) => updateRow(i, { indexCode: e.target.value as EscalationRowState["indexCode"] })}
                  className="w-full border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">endeks seçin</option>
                  {CSB_2026_TUIK_SUB_INDICES.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.tuikSectorCode} · {d.title}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <CalcField label="Ağırlık (0–1)">
                    <input className={calcInputClass} inputMode="decimal" aria-label={`Ağırlık ${i + 1}`} value={row.weight} onChange={(e) => updateRow(i, { weight: e.target.value })} />
                  </CalcField>
                  <CalcField label="E_0 (temel)">
                    <input className={calcInputClass} inputMode="decimal" aria-label={`Temel endeks ${i + 1}`} value={row.baseIndex} onChange={(e) => updateRow(i, { baseIndex: e.target.value })} />
                  </CalcField>
                  <CalcField label="E_n (güncel)">
                    <input className={calcInputClass} inputMode="decimal" aria-label={`Güncel endeks ${i + 1}`} value={row.currentIndex} onChange={(e) => updateRow(i, { currentIndex: e.target.value })} />
                  </CalcField>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CalcField label="TÜİK seri kimliği">
                    <input className={calcInputClass} aria-label={`Seri kimliği ${i + 1}`} value={row.seriesId} onChange={(e) => updateRow(i, { seriesId: e.target.value })} />
                  </CalcField>
                  <CalcField label="Resmî kaynak URL">
                    <input className={calcInputClass} type="url" aria-label={`Endeks kaynağı ${i + 1}`} value={row.sourceUrl} onChange={(e) => updateRow(i, { sourceUrl: e.target.value })} />
                  </CalcField>
                  <CalcField label="Temel dönem">
                    <input className={calcInputClass} type="month" aria-label={`Temel dönem ${i + 1}`} value={row.basePeriod} onChange={(e) => updateRow(i, { basePeriod: e.target.value })} />
                  </CalcField>
                  <CalcField label="Güncel dönem">
                    <input className={calcInputClass} type="month" aria-label={`Güncel dönem ${i + 1}`} value={row.currentPeriod} onChange={(e) => updateRow(i, { currentPeriod: e.target.value })} />
                  </CalcField>
                  <CalcField label="Kaynak yayın tarihi">
                    <input className={calcInputClass} type="date" aria-label={`Kaynak yayın tarihi ${i + 1}`} value={row.sourcePublicationDate} onChange={(e) => updateRow(i, { sourcePublicationDate: e.target.value })} />
                  </CalcField>
                </div>
                {form.rows.length > 1 && (
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground underline"
                    onClick={() => {
                      setForm((f) => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }));
                      setRowKeys((k) => k.filter((_, idx) => idx !== i));
                    }}
                  >
                    Bileşeni sil
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-wider text-primary underline"
              onClick={() => {
                setForm((f) => ({ ...f, rows: [...f.rows, emptyRow()] }));
                setRowKeys((k) => [...k, keys.current++]);
              }}
            >
              + Bileşen ekle
            </button>
          </div>
        </div>

        <div className="border border-border bg-card p-5 text-sm" aria-live="polite" data-testid="escalation-result">
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
          {outcome.status === "not_evaluated" && (
            <div>
              <p className="font-semibold">Değerlendirilmedi — kanıt bağlamı eksik</p>
              <ul className="mt-2 list-disc pl-4 text-muted-foreground">{outcome.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {outcome.status === "manual_review" && (
            <div>
              <p className="font-semibold">Manuel sözleşme / hukuk incelemesi gerekli</p>
              <ul className="mt-2 list-disc pl-4 text-muted-foreground">{outcome.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
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
              {outcome.reviewStatus && <p className="border border-amber-500/50 bg-amber-500/10 p-3 text-xs">Hesaplandı; idare/sözleşme uzmanı incelemesi gerekir. Bu çıktı resmî hakediş tespiti değildir.</p>}
              <div className="border border-border bg-background p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Fiyat farkı (F)</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{fmtTry(outcome.result.priceDifferenceTl)}</div>
                <p className="mt-2 text-xs text-muted-foreground">{outcome.result.formulaSummary}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt>Pn</dt><dd className="text-right font-mono">{fmtNum(outcome.result.pnFactor, 6)}</dd>
                <dt>Pn − 1</dt><dd className="text-right font-mono">{fmtNum(outcome.result.pnMinusOne, 6)}</dd>
                <dt>Sabit katsayı (a)</dt><dd className="text-right font-mono">{fmtNum(outcome.result.constantWeight, 4)}</dd>
                <dt>Güncel toplam (A_n + F)</dt><dd className="text-right font-mono">{fmtTry(outcome.result.adjustedTotalTl)}</dd>
                <dt>Etkin artış</dt><dd className="text-right font-mono">% {fmtNum(outcome.result.effectiveEscalationPct, 2)}</dd>
              </dl>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase text-muted-foreground">
                    <th className="py-1">Endeks</th><th className="text-right">w</th><th className="text-right">E_n/E_0</th><th className="text-right">w × oran</th>
                  </tr>
                </thead>
                <tbody>
                  {outcome.result.components.map((c, i) => (
                    <tr key={`${c.indexCode}-${i}`} className="border-b border-border">
                      <td className="py-1 pr-2">{c.title}</td>
                      <td className="text-right font-mono">{fmtNum(c.weight, 4)}</td>
                      <td className="text-right font-mono">{fmtNum(c.ratio, 4)}</td>
                      <td className="text-right font-mono">{fmtNum(c.weightedContribution, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <CalculationFeedback
        engineId="price_escalation_4735"
        inputs={form}
        result={outcome.status === "ok" ? {
          fiyatFarkiTl: outcome.result.priceDifferenceTl,
          pn: outcome.result.pnFactor,
          sabitKatsayi: outcome.result.constantWeight,
          guncelToplamTl: outcome.result.adjustedTotalTl,
          etkinArtisYuzde: outcome.result.effectiveEscalationPct,
        } : { durum: outcome.status }}
      />
    </CalculatorShell>
  );
};

export default PriceEscalationCalculatorPage;
