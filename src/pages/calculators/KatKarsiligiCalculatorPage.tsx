import React, { useMemo, useState } from "react";
import { calculateKatKarsiligi, type EmsalSatisTuru, type KatKarsiligiInput, type KdvRejimi } from "@/lib/kat-karsiligi";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

/**
 * Kat karşılığı paylaşım ve KDV ön hesabı. Hiçbir değer varsayılmaz. Sayfa, KDV ve emsal bedel kurallarının
 * mali müşavir tarafından doğrulanmasına kadar yayında değildir (rota, sitemap ve llms.txt dışında).
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

const parse = (value: string): number | null => {
  const text = value.trim();
  if (!text) return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const KatKarsiligiCalculatorPage: React.FC = () => {
  const [form, setForm] = useState<Record<FormKey, string>>(EMPTY);
  const [rejim, setRejim] = useState<KdvRejimi | "">("");
  const [ruhsat2022, setRuhsat2022] = useState(false);
  const [satisTuru, setSatisTuru] = useState<EmsalSatisTuru | "">("");
  const [arsaMukellef, setArsaMukellef] = useState(false);

  const outcome = useMemo(() => {
    const missing = (Object.keys(EMPTY) as FormKey[]).filter(key => parse(form[key]) === null);
    if (missing.length || !rejim || !satisTuru) return { error: "Tüm alanları doldurun; KDV rejimini ve emsal satış türünü seçin. Hiçbir değer varsayılmaz." as string };
    const n = (key: FormKey) => parse(form[key]) as number;
    const input: KatKarsiligiInput = {
      arsaAlaniM2: n("arsaAlani"), kaksEmsal: n("kaks"), brutInsaatCarpani: n("brutCarpani"), satilabilirNetAlanOrani: n("netOrani"),
      birimInsaatMaliyetiTry: n("maliyet"), satisFiyatiTry: n("satis"), hedeflenenKarCarpani: n("karCarpani"),
      ortalamaKonutNetM2: n("konutNet"), maliyetBedeliBirimTry: n("emsalBedel"), emsalSatisTuru: satisTuru, arsaSahibiKdvMukellefi: arsaMukellef, kdvRejimi: rejim, ruhsat2022Sonrasi: ruhsat2022,
    };
    try { return { result: calculateKatKarsiligi(input) }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Hesaplanamadı." }; }
  }, [form, rejim, ruhsat2022, satisTuru, arsaMukellef]);

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
          <CalcField label="KDV rejimi">
            <select className={calcInputClass} aria-label="KDV rejimi" value={rejim} onChange={event => setRejim(event.target.value as KdvRejimi | "")}>
              <option value="">Seçiniz</option>
              <option value="genel">Genel (ilk 150 m² %10, fazlası %20)</option>
              <option value="kentsel_donusum_6306">6306 kapsamı (ilk 150 m² %1, fazlası %20)</option>
            </select>
          </CalcField>
          <CalcField label="Emsal bedel türü" hint="Maliyet bedeline toptan %5, perakende %10 eklenir (Tebliğ I/B-8.2)">
            <select className={calcInputClass} aria-label="Emsal bedel türü" value={satisTuru} onChange={event => setSatisTuru(event.target.value as EmsalSatisTuru | "")}>
              <option value="">Seçiniz</option>
              <option value="toptan">Toptan (+%5)</option>
              <option value="perakende">Perakende (+%10)</option>
            </select>
          </CalcField>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={arsaMukellef} onChange={event => setArsaMukellef(event.target.checked)} />
            <span>Arsa sahibi KDV mükellefi (arsa işletmeye dahil veya arsa alım satımı mutat faaliyet)</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={ruhsat2022} onChange={event => setRuhsat2022(event.target.checked)} />
            <span>Yapı ruhsatı 1/4/2022 veya sonrasında alındı</span>
          </label>
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
                <dt>Arsa sahibine teslim KDV (emsal bedelden)</dt><dd className="text-right font-mono">{fmtTry(outcome.result.arsaSahibineTeslim.toplamKdvTry)}</dd>
                <dt>Arsa payı teslimi KDV (arsa sahibi mükellefse)</dt><dd className="text-right font-mono">{fmtTry(outcome.result.arsaPayiTeslimiKdvTry)}</dd>
                <dt>Müteahhit satışı KDV</dt><dd className="text-right font-mono">{fmtTry(outcome.result.muteahhitSatisi.toplamKdvTry)}</dd>
              </dl>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {outcome.result.uyarilar.map(warning => <li key={warning}>{warning}</li>)}
              </ul>
            </>
          )}
        </div>
      </section>
    </CalculatorShell>
  );
};
