import React, { useMemo, useState } from "react";
import {
  calculateKatKarsiligi,
  evaluateKatKarsiligiTax,
  type EmsalSatisTuru,
  type KatKarsiligiInput,
  type KatKarsiligiUnitType,
  type KdvEvidenceStatus,
  type LandOwnerTaxpayerStatus,
  type LandTradingActivityStatus,
} from "@/lib/kat-karsiligi";
import { CalculationFeedback } from "@/features/expert-feedback/CalculationFeedback";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

/**
 * Kat karşılığı paylaşım ve KDV ön hesabı. Hiçbir değer varsayılmaz; sonuçlar bilgilendirme amaçlı ön hesaptır.
 */
type FormKey =
  | "arsaAlani" | "kaks" | "brutCarpani" | "netOrani" | "maliyet" | "satis" | "karCarpani" | "konutNet" | "emsalBedel";

const FIELDS: { key: FormKey; label: string; hint?: string; aria: string }[] = [
  { key: "arsaAlani", label: "Arsa alanı (m²)", aria: "Arsa alanı" },
  { key: "kaks", label: "KAKS / Emsal", aria: "KAKS" },
  { key: "brutCarpani", label: "Brüt inşaat çarpanı", hint: "Emsale esas alandan toplam brüt inşaat alanına geçiş", aria: "Brüt inşaat çarpanı" },
  { key: "netOrani", label: "Net satılabilir alan oranı (0–1)", hint: "Emsale esas alanın net satılabilir kısmı", aria: "Net satılabilir alan oranı" },
  { key: "maliyet", label: "Birim inşaat maliyeti (₺/brüt m²)", aria: "Birim inşaat maliyeti" },
  { key: "satis", label: "Satış fiyatı (₺/net m², KDV hariç)", aria: "Satış fiyatı" },
  { key: "karCarpani", label: "Hedeflenen kâr çarpanı (≥ 1)", hint: "Maliyetin kaç katı hasılat hedeflediğiniz", aria: "Hedeflenen kâr çarpanı" },
  { key: "konutNet", label: "Ortalama konut net alanı (m²)", hint: "KDV'nin 150 m² kademesi için", aria: "Ortalama konut net alanı" },
  { key: "emsalBedel", label: "Maliyet bedeli (₺/net m², KDV hariç)", hint: "Arsa sahibine bırakılan konutun VUK m.267/2 maliyet bedeli; genel gider payı dahil, arsa payı hariç", aria: "Maliyet bedeli" },
];

const EMPTY: Record<FormKey, string> = { arsaAlani: "", kaks: "", brutCarpani: "", netOrani: "", maliyet: "", satis: "", karCarpani: "", konutNet: "", emsalBedel: "" };
type TaxUnitForm = { id: string; type: KatKarsiligiUnitType; netAreaM2: string; taxBaseTry: string };

const parse = (value: string): number | null => {
  const text = value.trim();
  if (!text) return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const KatKarsiligiCalculatorPage: React.FC = () => {
  const [form, setForm] = useState<Record<FormKey, string>>(EMPTY);
  const [satisTuru, setSatisTuru] = useState<EmsalSatisTuru | "">("");
  const [permitDate, setPermitDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [evidence6306, setEvidence6306] = useState<KdvEvidenceStatus>("unknown");
  const [taxpayerStatus, setTaxpayerStatus] = useState<LandOwnerTaxpayerStatus>("unknown");
  const [activityStatus, setActivityStatus] = useState<LandTradingActivityStatus>("unknown");
  const [taxUnits, setTaxUnits] = useState<TaxUnitForm[]>([{ id: "", type: "dwelling", netAreaM2: "", taxBaseTry: "" }]);

  const outcome = useMemo(() => {
    const missing = (Object.keys(EMPTY) as FormKey[]).filter(key => parse(form[key]) === null);
    if (missing.length || !satisTuru) return { error: "Paylaşım ön hesabı için tüm alanları ve emsal satış türünü doldurun. Hiçbir değer varsayılmaz." as string };
    const n = (key: FormKey) => parse(form[key]) as number;
    const input: KatKarsiligiInput = {
      arsaAlaniM2: n("arsaAlani"), kaksEmsal: n("kaks"), brutInsaatCarpani: n("brutCarpani"), satilabilirNetAlanOrani: n("netOrani"),
      birimInsaatMaliyetiTry: n("maliyet"), satisFiyatiTry: n("satis"), hedeflenenKarCarpani: n("karCarpani"),
      ortalamaKonutNetM2: n("konutNet"), maliyetBedeliBirimTry: n("emsalBedel"), emsalSatisTuru: satisTuru,
      arsaSahibiKdvMukellefi: taxpayerStatus === "taxpayer" || activityStatus === "continuous",
      kdvRejimi: evidence6306 === "confirmed" ? "kentsel_donusum_6306" : "genel",
      ruhsat2022Sonrasi: permitDate >= "2022-04-01",
    };
    try { return { result: calculateKatKarsiligi(input) }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Hesaplanamadı." }; }
  }, [form, satisTuru, taxpayerStatus, activityStatus, evidence6306, permitDate]);

  const taxOutcome = useMemo(() => evaluateKatKarsiligiTax({
    permitDate,
    deliveryDate,
    urbanTransformation6306Evidence: evidence6306,
    landOwnerTaxpayerStatus: taxpayerStatus,
    landTradingActivityStatus: activityStatus,
    units: taxUnits.map((unit) => ({
      id: unit.id,
      type: unit.type,
      netAreaM2: parse(unit.netAreaM2) ?? Number.NaN,
      taxBaseTry: parse(unit.taxBaseTry) ?? Number.NaN,
    })),
  }), [permitDate, deliveryDate, evidence6306, taxpayerStatus, activityStatus, taxUnits]);

  const updateTaxUnit = (index: number, patch: Partial<TaxUnitForm>) =>
    setTaxUnits((units) => units.map((unit, unitIndex) => unitIndex === index ? { ...unit, ...patch } : unit));

  return (
    <CalculatorShell
      title="Kat Karşılığı Paylaşım ve KDV Ön Hesabı | BIMMetraj"
      description="Arsa sahibi ve müteahhit payını ve konut KDV'sini (150 m² kademeli) kendi girdilerinizle hesaplayın. Bilgilendirme amaçlıdır."
      canonicalPath="/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum"
      heading="Kat Karşılığı Paylaşım ve KDV Ön Hesabı"
      intro="Tüm çarpanlar ve bedeller sizin girdinizdir; hiçbir değer varsayılmaz. KDV yalnızca 1/4/2022 ve sonrası yapı ruhsatlı konutlar için hesaplanır."
      sources={[
        { label: "3065 sayılı KDV Kanunu; 7346 sayılı Cumhurbaşkanı Kararı (RG 7.7.2023) — konut teslimlerinde kısım bazlı oranlar" },
        { label: "6306 sayılı Kanun kapsamındaki dönüşüm: ilk 150 m² için %1" },
        { label: "KDV Genel Uygulama Tebliği I/B-8 (RG 5.6.2018): arsa karşılığı inşaat; matrah VUK m.267/2 maliyet bedeli + %5 (toptan) / %10 (perakende); 7104 sayılı Kanun" },
      ]}
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 border border-border bg-background p-5 lg:col-span-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Girdiler</h2>
          {FIELDS.map(field => (
            <CalcField key={field.key} label={field.label} hint={field.hint}>
              <input className={calcInputClass} inputMode="decimal" aria-label={field.aria} value={form[field.key]}
                onChange={event => setForm(prev => ({ ...prev, [field.key]: event.target.value }))} />
            </CalcField>
          ))}
          <CalcField label="Emsal bedel türü" hint="Maliyet bedeline toptan %5, perakende %10 eklenir (Tebliğ I/B-8.2)">
            <select className={calcInputClass} aria-label="Emsal bedel türü" value={satisTuru} onChange={event => setSatisTuru(event.target.value as EmsalSatisTuru | "")}>
              <option value="">Seçiniz</option>
              <option value="toptan">Toptan (+%5)</option>
              <option value="perakende">Perakende (+%10)</option>
            </select>
          </CalcField>
          <h2 className="pt-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary">KDV kanıt bağlamı</h2>
          <div className="grid grid-cols-2 gap-3">
            <CalcField label="Yapı ruhsat tarihi"><input className={calcInputClass} type="date" aria-label="Yapı ruhsat tarihi" value={permitDate} onChange={(e) => setPermitDate(e.target.value)} /></CalcField>
            <CalcField label="Teslim tarihi"><input className={calcInputClass} type="date" aria-label="Teslim tarihi" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></CalcField>
          </div>
          <CalcField label="6306 kapsamı belge statüsü">
            <select className={calcInputClass} aria-label="6306 kanıt statüsü" value={evidence6306} onChange={(e) => setEvidence6306(e.target.value as KdvEvidenceStatus)}>
              <option value="unknown">Belirlenmedi</option><option value="confirmed">Belgeyle doğrulandı</option><option value="not_applicable">Kapsam dışı</option>
            </select>
          </CalcField>
          <CalcField label="Arsa sahibi mükellef statüsü">
            <select className={calcInputClass} aria-label="Arsa sahibi mükellef statüsü" value={taxpayerStatus} onChange={(e) => setTaxpayerStatus(e.target.value as LandOwnerTaxpayerStatus)}>
              <option value="unknown">Belirlenmedi</option><option value="taxpayer">Mükellef / işletmeye dahil</option><option value="not_taxpayer">Mükellef değil</option>
            </select>
          </CalcField>
          <CalcField label="Arsa ticareti faaliyet statüsü">
            <select className={calcInputClass} aria-label="Arsa ticareti faaliyet statüsü" value={activityStatus} onChange={(e) => setActivityStatus(e.target.value as LandTradingActivityStatus)}>
              <option value="unknown">Belirlenmedi</option><option value="continuous">Mutat / sürekli faaliyet</option><option value="incidental">Arızi işlem</option>
            </select>
          </CalcField>
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Bağımsız bölüm teslim satırları</div>
            {taxUnits.map((unit, index) => (
              <div key={index} className="space-y-2 border border-border bg-card p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input className={calcInputClass} aria-label={`Bölüm kimliği ${index + 1}`} placeholder="K-01" value={unit.id} onChange={(e) => updateTaxUnit(index, { id: e.target.value })} />
                  <select className={calcInputClass} aria-label={`Bölüm türü ${index + 1}`} value={unit.type} onChange={(e) => updateTaxUnit(index, { type: e.target.value as KatKarsiligiUnitType })}>
                    <option value="dwelling">Konut</option><option value="workplace">İşyeri</option>
                  </select>
                  <input className={calcInputClass} inputMode="decimal" aria-label={`Net alan ${index + 1}`} placeholder="Net m²" value={unit.netAreaM2} onChange={(e) => updateTaxUnit(index, { netAreaM2: e.target.value })} />
                  <input className={calcInputClass} inputMode="decimal" aria-label={`Matrah ${index + 1}`} placeholder="Matrah ₺" value={unit.taxBaseTry} onChange={(e) => updateTaxUnit(index, { taxBaseTry: e.target.value })} />
                </div>
                {taxUnits.length > 1 && <button type="button" className="text-[10px] underline" onClick={() => setTaxUnits((units) => units.filter((_, i) => i !== index))}>Satırı sil</button>}
              </div>
            ))}
            <button type="button" className="font-mono text-[10px] uppercase text-primary underline" onClick={() => setTaxUnits((units) => [...units, { id: "", type: "dwelling", netAreaM2: "", taxBaseTry: "" }])}>+ Bağımsız bölüm ekle</button>
          </div>
        </div>

        <div className="space-y-4 border border-border bg-card p-5 lg:col-span-7" aria-live="polite">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Sonuç</h2>
          {"error" in outcome ? (
            <p className="text-sm text-muted-foreground">{outcome.error}</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt>Müteahhit payı</dt><dd className="text-right font-mono">%{fmtNum(outcome.result.muteahhitPayiYuzde, 2)}</dd>
                <dt>Arsa sahibi payı</dt><dd className="text-right font-mono">%{fmtNum(outcome.result.arsaSahibiPayiYuzde, 2)}</dd>
                <dt>Toplam inşaat maliyeti</dt><dd className="text-right font-mono">{fmtTry(outcome.result.toplamInsaatMaliyetiTry)}</dd>
                <dt>Müteahhit net kârı</dt><dd className="text-right font-mono">{fmtTry(outcome.result.muteahhitNetKariTry)}</dd>
              </dl>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {outcome.result.uyarilar.map(warning => <li key={warning}>{warning}</li>)}
              </ul>
            </>
          )}
          <div className="border-t border-border pt-4" data-testid="kat-karsiligi-tax-review">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Satır bazlı KDV değerlendirmesi</h3>
            {taxOutcome.status === "not_evaluated" && <div className="mt-2 text-sm"><strong>Değerlendirilmedi</strong><ul className="list-disc pl-5 text-muted-foreground">{taxOutcome.missing.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {taxOutcome.status === "manual_review" && <div className="mt-2 text-sm"><strong>Manuel mali/hukuki inceleme gerekli</strong><ul className="list-disc pl-5 text-muted-foreground">{taxOutcome.reasons.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {taxOutcome.status === "evaluated" && <div className="mt-3 space-y-3 text-sm">
              <p className="border border-amber-500/50 bg-amber-500/10 p-3 text-xs">Hesaplandı; mali müşavir incelemesi gerekir. Her satır kuruşa yuvarlandıktan sonra toplam alınmıştır.</p>
              <dl className="grid grid-cols-2 gap-x-4"><dt>Teslim KDV toplamı</dt><dd className="text-right font-mono">{fmtTry(taxOutcome.totalDeliveryTaxTry)}</dd><dt>Arsa payı teslimi KDV</dt><dd className="text-right font-mono">{fmtTry(taxOutcome.landShareTaxTry)}</dd></dl>
              <ul className="space-y-1 text-xs text-muted-foreground">{taxOutcome.lines.map((line) => <li key={line.id}>{line.id} · {line.type === "dwelling" ? "Konut" : "İşyeri"} · {fmtNum(line.netAreaM2, 2)} m² · Matrah {fmtTry(line.taxBaseTry)} · KDV {fmtTry(line.taxTry)}</li>)}</ul>
            </div>}
          </div>
        </div>
      </section>

      <CalculationFeedback
        engineId="kat_karsiligi_kdv"
        question="Paylaşım ve KDV sonucu sizin hesabınızla tutuyor mu?"
        inputs={{ ...form, satisTuru, permitDate, deliveryDate, evidence6306, taxpayerStatus, activityStatus, taxUnits }}
        result={{
          paylasim: "result" in outcome ? outcome.result : { durum: outcome.error },
          kdv: taxOutcome,
        }}
      />
    </CalculatorShell>
  );
};
