import React, { useMemo, useRef, useState } from "react";
import { evaluateEscalationForm, type EscalationFormState, type EscalationRowState } from "@/lib/calculators/escalation-form";
import { CSB_2026_TUIK_SUB_INDICES } from "@/lib/price-escalation";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

const emptyRow = (): EscalationRowState => ({ indexCode: "", weight: "", baseIndex: "", currentIndex: "" });

export const PriceEscalationCalculatorPage: React.FC = () => {
  const keys = useRef(1);
  const [rowKeys, setRowKeys] = useState<number[]>([0]);
  const [form, setForm] = useState<EscalationFormState>({
    progressPayment: "",
    bFactor: "",
    constantWeight: "",
    rows: [emptyRow()],
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
      intro="Hakediş tutarını, sözleşmenizdeki B katsayısını, sabit katsayıyı (varsa) ve endeks bileşenlerini girin. Endeks değerleri otomatik çekilmez ve hiçbir katsayı varsayılmaz; sözleşmenizin fiyat farkı formülündeki değerleri kullanın."
      sources={[
        { label: "4735 sayılı Kamu İhale Sözleşmeleri Kanunu, madde 8 (fiyat farkı)" },
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
            <CalcField label="B katsayısı" hint="Sözleşmenizdeki değer.">
              <input className={calcInputClass} inputMode="decimal" aria-label="B katsayısı" value={form.bFactor} onChange={(e) => setForm({ ...form, bFactor: e.target.value })} />
            </CalcField>
            <CalcField label="Endekse bağlı olmayan sabit terim (varsa)" hint="Sözleşmenizin formülünde sabit bir katsayı varsa girin (sembolü sözleşmeye göre değişir); yoksa boş bırakın.">
              <input className={calcInputClass} inputMode="decimal" aria-label="Sabit katsayı" value={form.constantWeight} onChange={(e) => setForm({ ...form, constantWeight: e.target.value })} />
            </CalcField>
          </div>

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
    </CalculatorShell>
  );
};

export default PriceEscalationCalculatorPage;
