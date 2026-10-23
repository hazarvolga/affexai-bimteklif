import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  buildParcelCsvTemplate,
  computeFeasibility,
  exportFeasibilityCsv,
  parseParcelCsv,
  VILLA_MARKET_COST_BENCHMARK_2026,
  type ParcelInput,
  type ShareBase,
} from "@/lib/pre-bim-feasibility";
import { buildPreBimQuoteDraft, PRE_BIM_DRAFT_STORAGE_KEY } from "@/lib/pre-bim-quote-draft";

interface ParcelRow {
  id: number;
  name: string;
  area: string;
  taks: string;
  kaks: string;
  harici: string;
  includedArea: string;
  includedSource: string;
  limitedSource: string;
  fullyExempt: string;
  fullySource: string;
  localPlanSource: string;
  localPlanAsOf: string;
  localPlanCapPercent: string;
}

const num = (raw: string): number | null => {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const fmt = (v: number | null, d = 2) =>
  v === null ? "—" : new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

const fmtTry = (v: number | null) =>
  v === null ? "—" : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(v) + " ₺";

const inputCls =
  "w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground text-right tabular-nums focus:border-primary focus:outline-none";

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{props.label}</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={props.label}
        value={props.value}
        placeholder={props.placeholder ?? "girin"}
        onChange={(e) => props.onChange(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}

export const PreBimFeasibilityPanel: React.FC = () => {
  const navigate = useNavigate();
  const nextId = useRef(2);
  const [rows, setRows] = useState<ParcelRow[]>([{
    id: 1, name: "", area: "", taks: "", kaks: "", harici: "", includedArea: "", includedSource: "", limitedSource: "",
    fullyExempt: "", fullySource: "", localPlanSource: "", localPlanAsOf: "", localPlanCapPercent: "",
  }]);
  const [shareBase, setShareBase] = useState<ShareBase | "">("");
  const [sharePct, setSharePct] = useState("");
  const [netGross, setNetGross] = useState("");
  const [units, setUnits] = useState("");
  const [promised, setPromised] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [split, setSplit] = useState({ kaba: "", ince: "", mek: "", elk: "", pey: "" });
  const [csvMessage, setCsvMessage] = useState("");

  const parcels: ParcelInput[] = rows.map((r) => {
    const limited = num(r.harici);
    const included = num(r.includedArea);
    const fully = num(r.fullyExempt);
    const areaLines = [
      ...(included !== null ? [{
        id: `parcel-${r.id}-included`, label: "Emsale dahil alan", category: "included" as const,
        areaM2: included, sourceReference: r.includedSource.trim(),
      }] : []),
      ...(limited !== null ? [{
        id: `parcel-${r.id}-limited`, label: "Sınırlı muaf alan", category: "limited_exempt" as const,
        areaM2: limited, sourceReference: r.limitedSource.trim(),
      }] : []),
      ...(fully !== null ? [{
        id: `parcel-${r.id}-fully`, label: "Tam muaf alan", category: "fully_exempt" as const,
        areaM2: fully, sourceReference: r.fullySource.trim(),
      }] : []),
    ];
    return {
      name: r.name,
      areaM2: num(r.area),
      taks: num(r.taks),
      kaks: num(r.kaks),
      areaLines,
      localPlanEvidence: r.localPlanSource.trim() && r.localPlanAsOf && num(r.localPlanCapPercent) !== null
        ? { sourceReference: r.localPlanSource.trim(), asOf: r.localPlanAsOf, limitedExemptCapPercent: num(r.localPlanCapPercent) as number }
        : null,
    };
  });

  const hasSplit = Object.values(split).some((v) => v.trim() !== "");

  const result = useMemo(
    () =>
      computeFeasibility({
        parcels,
        landownerSharePercent: num(sharePct),
        shareBase: shareBase === "" ? null : shareBase,
        netToGrossRatio: num(netGross),
        landownerUnitCount: num(units),
        promisedGrossPerUnitM2: num(promised),
        unitCostTryPerM2: num(unitCost),
        costSplit: hasSplit
          ? {
              kabaYapi: num(split.kaba),
              inceYapi: num(split.ince),
              mekanik: num(split.mek),
              elektrik: num(split.elk),
              peyzajAltyapi: num(split.pey),
            }
          : null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, shareBase, sharePct, netGross, units, promised, unitCost, split],
  );

  const updateRow = (id: number, patch: Partial<ParcelRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const onCsv = async (file: File | undefined) => {
    if (!file) return;
    const isXlsx = /\.xlsx$/i.test(file.name);
    let parsed;
    if (isXlsx) {
      // exceljs ağır olduğu için yalnızca .xlsx seçilince yüklenir.
      const { parseParcelXlsx } = await import("@/lib/pre-bim-xlsx");
      parsed = await parseParcelXlsx(await file.arrayBuffer());
    } else {
      parsed = parseParcelCsv(await file.text());
    }
    if (parsed.parcels.length > 0) {
      setRows(
        parsed.parcels.map((p) => ({
          id: nextId.current++,
          name: p.name,
          area: String(p.areaM2 ?? ""),
          taks: String(p.taks ?? ""),
          kaks: String(p.kaks ?? ""),
          harici: String(p.areaLines?.find((line) => line.category === "limited_exempt")?.areaM2 ?? p.emsalHariciAreaM2 ?? ""),
          includedArea: String(p.areaLines?.find((line) => line.category === "included")?.areaM2 ?? ""),
          includedSource: p.areaLines?.find((line) => line.category === "included")?.sourceReference ?? "",
          limitedSource: p.areaLines?.find((line) => line.category === "limited_exempt")?.sourceReference
            ?? (p.emsalHariciAreaM2 == null ? "" : "Excel/CSV kullanıcı girdisi (kaynak belge ayrıca teyit edilmeli)"),
          fullyExempt: String(p.areaLines?.find((line) => line.category === "fully_exempt")?.areaM2 ?? ""),
          fullySource: p.areaLines?.find((line) => line.category === "fully_exempt")?.sourceReference ?? "",
          localPlanSource: p.localPlanEvidence?.sourceReference ?? "",
          localPlanAsOf: p.localPlanEvidence?.asOf ?? "",
          localPlanCapPercent: p.localPlanEvidence ? String(p.localPlanEvidence.limitedExemptCapPercent) : "",
        })),
      );
    }
    setCsvMessage(
      `${parsed.parcels.length} parsel okundu.` + (parsed.errors.length ? ` Hatalar: ${parsed.errors.join(" ")}` : ""),
    );
  };

  const promise = result.promise;

  return (
    <section id="pre-bim-feasibility" className="mt-8 border border-border bg-background" data-testid="pre-bim-feasibility">
      <div className="px-6 py-4 border-b border-border bg-card">
        <span className="section-index">IFC ÖNCESİ · ÖN TEKLİF / KAT KARŞILIĞI</span>
        <h3 className="font-display-serif text-2xl text-foreground mt-0.5">Arsa, TAKS–KAKS ve Daire Paylaşımı</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Henüz projeniz veya IFC dosyanız yoksa imar değerlerinizle ön hesap yapın. Tüm değerleri siz girersiniz;
          varsayılan veya piyasa ortalaması kullanılmaz. TAKS ve KAKS değerlerini imar durumu belgenizden alın.
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Parseller</span>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <button type="button" className="underline text-primary" onClick={() => download("parsel-sablonu.csv", buildParcelCsvTemplate())}>
                  CSV şablonu indir
                </button>
                <label htmlFor="parcel-file-upload" className="underline text-primary cursor-pointer">
                  Excel / CSV'den içe aktar
                  <input id="parcel-file-upload" aria-label="Parsel şablonu Excel veya CSV dosyası yükle" type="file" accept=".xlsx,.csv,text/csv" className="sr-only" onChange={(e) => void onCsv(e.target.files?.[0])} />
                </label>
              </div>
            </div>
            {csvMessage && <p className="text-[11px] text-muted-foreground mb-2">{csvMessage}</p>}
            <p className="text-[10px] text-muted-foreground mb-2">
              .xlsx veya CSV yükleyebilirsiniz. İlk sayfanın ilk satırı başlık olmalı: parsel_adi, alan_m2, taks, kaks, emsal_harici_m2.
            </p>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 items-end border border-border p-2">
                  <div className="col-span-3"><Field label={i === 0 ? "Parsel adı" : "Ad"} value={r.name} onChange={(v) => updateRow(r.id, { name: v })} placeholder="ad" /></div>
                  <div className="col-span-2"><Field label="Alan m²" value={r.area} onChange={(v) => updateRow(r.id, { area: v })} /></div>
                  <div className="col-span-2"><Field label="TAKS" value={r.taks} onChange={(v) => updateRow(r.id, { taks: v })} /></div>
                  <div className="col-span-2"><Field label="KAKS" value={r.kaks} onChange={(v) => updateRow(r.id, { kaks: v })} /></div>
                  <div className="col-span-2"><Field label="Sınırlı muaf m²" value={r.harici} onChange={(v) => updateRow(r.id, { harici: v })} placeholder="boş" /></div>
                  <button
                    type="button"
                    aria-label="Parseli sil"
                    disabled={rows.length === 1}
                    onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))}
                    className="col-span-1 pb-1 text-xs text-muted-foreground disabled:opacity-30"
                  >
                    ✕
                  </button>
                  <div className="col-span-4"><Field label="Sınırlı muaf kaynak" value={r.limitedSource} onChange={(v) => updateRow(r.id, { limitedSource: v })} placeholder="belge/satır" /></div>
                  <div className="col-span-2"><Field label="Emsale dahil m²" value={r.includedArea} onChange={(v) => updateRow(r.id, { includedArea: v })} placeholder="alan cetveli" /></div>
                  <div className="col-span-4"><Field label="Emsale dahil kaynak" value={r.includedSource} onChange={(v) => updateRow(r.id, { includedSource: v })} placeholder="belge/satır" /></div>
                  <div className="col-span-2"><Field label="Tam muaf m²" value={r.fullyExempt} onChange={(v) => updateRow(r.id, { fullyExempt: v })} placeholder="boş" /></div>
                  <div className="col-span-4"><Field label="Tam muaf kaynak" value={r.fullySource} onChange={(v) => updateRow(r.id, { fullySource: v })} placeholder="plan notu/madde" /></div>
                  <div className="col-span-4"><Field label="Yerel plan/imar kanıtı" value={r.localPlanSource} onChange={(v) => updateRow(r.id, { localPlanSource: v })} placeholder="belge no/kaynak" /></div>
                  <label className="block col-span-2">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Kanıt tarihi</span>
                    <input type="date" aria-label="Yerel plan kanıt tarihi" value={r.localPlanAsOf} onChange={(e) => updateRow(r.id, { localPlanAsOf: e.target.value })} className={inputCls} />
                  </label>
                  <div className="col-span-2"><Field label="Plan sınırlı muaf oranı (%)" value={r.localPlanCapPercent} onChange={(v) => updateRow(r.id, { localPlanCapPercent: v })} placeholder="belgedeki oran" /></div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRows((p) => [...p, {
                id: nextId.current++, name: "", area: "", taks: "", kaks: "", harici: "", includedArea: "", includedSource: "", limitedSource: "",
                fullyExempt: "", fullySource: "", localPlanSource: "", localPlanAsOf: "", localPlanCapPercent: "",
              }])}
              className="mt-2 font-mono text-[10px] uppercase tracking-wider text-primary underline"
            >
              + Parsel ekle
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="block col-span-2 md:col-span-1">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pay tabanı</span>
              <select
                aria-label="Pay tabanı"
                value={shareBase}
                onChange={(e) => setShareBase(e.target.value as ShareBase | "")}
                className="w-full border border-border bg-card px-2 py-1 text-xs font-mono"
              >
                <option value="">seçin</option>
                <option value="EMSAL">Yalnız emsal alanı</option>
                <option value="TOTAL">Emsal + emsal harici</option>
              </select>
            </label>
            <Field label="Arsa sahibi payı (%)" value={sharePct} onChange={setSharePct} />
            <Field label="Net / brüt oranı (0–1)" value={netGross} onChange={setNetGross} />
            <Field label="Arsa sahibi daire sayısı" value={units} onChange={setUnits} />
            <Field label="Vaat: daire başı brüt m²" value={promised} onChange={setPromised} />
            <Field label="Birim maliyet (TL/m²)" value={unitCost} onChange={setUnitCost} />
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Maliyet dağılımı (%) — isteğe bağlı, toplam %100 olmalı
            </div>
            <div className="grid grid-cols-5 gap-2">
              <Field label="Kaba yapı" value={split.kaba} onChange={(v) => setSplit((s) => ({ ...s, kaba: v }))} />
              <Field label="İnce yapı" value={split.ince} onChange={(v) => setSplit((s) => ({ ...s, ince: v }))} />
              <Field label="Mekanik" value={split.mek} onChange={(v) => setSplit((s) => ({ ...s, mek: v }))} />
              <Field label="Elektrik" value={split.elk} onChange={(v) => setSplit((s) => ({ ...s, elk: v }))} />
              <Field label="Peyzaj+altyapı" value={split.pey} onChange={(v) => setSplit((s) => ({ ...s, pey: v }))} />
            </div>
            <details className="mt-3 border border-border bg-card p-3 text-xs">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary select-none">
                Saha Referansı: {VILLA_MARKET_COST_BENCHMARK_2026.source} ({VILLA_MARKET_COST_BENCHMARK_2026.items.length} Kalem — Bilgi Amaçlı, Otomatik Uygulanmaz)
              </summary>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Aşağıdaki dağılım gerçek bir 6-villa projesinin saha gerçekleşme dökümüdür (Toplam örnek bütçe:{" "}
                <span className="font-mono text-foreground">{fmtTry(VILLA_MARKET_COST_BENCHMARK_2026.sampleTotalCostTry)}</span>
                ). Hesaba gizli varsayılan olarak uygulanmaz; kendi projenizin yüzdelerini yukarıdaki alanlara kendiniz girersiniz.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tarih: {VILLA_MARKET_COST_BENCHMARK_2026.asOf} · Konum: {VILLA_MARKET_COST_BENCHMARK_2026.location} · Durum: tarihsel/eskimiş referans. {VILLA_MARKET_COST_BENCHMARK_2026.staleReason}
              </p>
              <div className="mt-2 max-h-48 overflow-y-auto border-t border-border pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {VILLA_MARKET_COST_BENCHMARK_2026.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] border-b border-border/50 py-0.5">
                    <span className="truncate text-foreground">{item.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground shrink-0">%{fmt(item.percent)}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="lg:col-span-5 border border-border bg-card p-5 space-y-4 text-xs">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sonuç</div>
          <div className="divide-y divide-border">
            {[
              ["Toplam taban alanı", `${fmt(result.totalFootprintM2)} m²`],
              ["Toplam emsal alanı", `${fmt(result.totalEmsalAreaM2)} m²`],
              ["Sınırlı muaf alan", `${fmt(result.totalLimitedExemptM2)} m²`],
              ["Tam muaf alan", `${fmt(result.totalFullyExemptM2)} m²`],
              ["Toplam emsal harici", `${fmt(result.totalEmsalHariciM2)} m²`],
              ["Toplam inşaat alanı", `${fmt(result.totalConstructionM2)} m²`],
              ["Arsa sahibi brüt / net", `${fmt(result.landownerGrossM2)} / ${fmt(result.landownerNetM2)} m²`],
              ["Müteahhit brüt", `${fmt(result.contractorGrossM2)} m²`],
              ["Daire başı brüt / net", `${fmt(result.perUnitGrossM2)} / ${fmt(result.perUnitNetM2)} m²`],
              ["Toplam inşaat maliyeti", fmtTry(result.totalConstructionCostTry)],
            ].map(([k, v]) => (
              <div key={k} className="py-1.5 flex items-center justify-between gap-3">
                <span>{k}</span>
                <span className="font-mono font-semibold tabular-nums text-right">{v}</span>
              </div>
            ))}
          </div>

          <div className="border border-border bg-background p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Parsel bazlı plan değerlendirmesi</div>
            {result.parcels.map((parcel, index) => (
              <div key={`${parcel.name}-${index}`} className="mt-1 flex justify-between gap-3 text-[11px]">
                <span>{parcel.name}</span>
                <span className="font-mono">{parcel.planningComplianceStatus}</span>
              </div>
            ))}
            <p className="mt-2 text-[10px] text-muted-foreground">Kurum, belge numarası, geçerli tarih ve SHA-256 ile doğrulanmış yerel plan artifact'ı yoksa sonuç yalnız aritmetik danışmanlıktır ve not_evaluated kalır. Formdaki serbest metin tek başına resmî kanıt değildir.</p>
          </div>

          {result.costBreakdown && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">Maliyet dağılımı</div>
              {result.costBreakdown.map((l) => (
                <div key={l.key} className="py-1 flex justify-between">
                  <span>{l.label} (%{fmt(l.percent)})</span>
                  <span className="font-mono tabular-nums">{fmtTry(l.amountTry)}</span>
                </div>
              ))}
            </div>
          )}

          {promise.status !== "not_evaluated" && (
            <div
              className={`border p-3 ${promise.status === "exceeds_capacity" ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"}`}
              role="status"
            >
              <div className="font-semibold">
                {promise.status === "exceeds_capacity" ? "Vaat, paylaşım kapasitesini aşıyor" : "Vaat kapasite içinde"}
              </div>
              <div className="mt-1 font-mono tabular-nums">
                Vaat {fmt(promise.promisedTotalGrossM2)} m² · Kapasite {fmt(promise.capacityGrossM2)} m²
              </div>
              {promise.status === "exceeds_capacity" && (
                <p className="mt-2 text-[11px] text-foreground">
                  Fark: {fmt(promise.excessTotalM2)} m² (daire başı {fmt(promise.excessPerUnitM2)} m²)
                  {promise.excessCostTry !== null && <> · yaklaşık maliyeti {fmtTry(promise.excessCostTry)}</>}. Bu fark nasıl
                  karşılanacak? Müteahhitten yazılı açıklama ve maliyet dökümü isteyin.
                </p>
              )}
            </div>
          )}

          {result.parcels.some((p) => !p.valid) && (
            <ul className="list-disc pl-4 text-destructive space-y-0.5">
              {result.parcels.filter((p) => !p.valid).flatMap((p) => p.errors.map((e) => <li key={p.name + e}>{p.name}: {e}</li>))}
            </ul>
          )}
          {result.warnings.length > 0 && (
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5 text-[11px]">
              {result.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => download("on-teklif-fizibilite.csv", exportFeasibilityCsv(result))}
              className="w-full border border-border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-wider hover:bg-card text-center"
            >
              Sonucu CSV İndir
            </button>
            <button
              type="button"
              disabled={!result.totalConstructionM2 || result.totalConstructionM2 <= 0}
              onClick={() => {
                const draft = buildPreBimQuoteDraft(
                  {
                    parcels,
                    landownerSharePercent: num(sharePct),
                    shareBase: shareBase === "" ? null : shareBase,
                    netToGrossRatio: num(netGross),
                    landownerUnitCount: num(units),
                    promisedGrossPerUnitM2: num(promised),
                    unitCostTryPerM2: num(unitCost),
                    costSplit: hasSplit
                      ? {
                          kabaYapi: num(split.kaba),
                          inceYapi: num(split.ince),
                          mekanik: num(split.mek),
                          elektrik: num(split.elk),
                          peyzajAltyapi: num(split.pey),
                        }
                      : null,
                  },
                  result,
                );
                if (!draft) return;
                try {
                  sessionStorage.setItem(PRE_BIM_DRAFT_STORAGE_KEY, JSON.stringify(draft));
                  navigate("/app/quotes/new");
                } catch (err) {
                  console.error("Failed to store pre-bim draft:", err);
                }
              }}
              className="w-full border border-primary bg-primary/10 text-primary px-3 py-2 font-mono text-[10px] uppercase tracking-wider hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-center"
            >
              Teklif Taslağı Oluştur →
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Bu bir ön hesaptır; imar durumu, plan notları ve proje mimarının net/brüt değerleri esastır.
          </p>
        </div>
      </div>
    </section>
  );
};
