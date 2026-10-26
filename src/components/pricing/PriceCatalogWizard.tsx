/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { LEGACY_XLS_MESSAGE, readFileHead, spreadsheetKind } from "@/lib/spreadsheet-format";
import {
  detectPriceCatalogColumns,
  parsePriceCatalogRows,
  readPriceCatalogCsvTable,
  type PriceCatalogColumn,
  type PriceCatalogImportRow,
} from "@/lib/price-catalog-import";
import { reviewPriceCatalog, VAT_RATE_OPTIONS } from "@/lib/price-catalog-review";
import { buildTenantPriceCatalogImportPayload } from "@/smartcheck/pricing/catalog-import";

const STEPS = [
  "Şablonu indirin",
  "Dosyanızı seçin",
  "Sütunları kontrol edin",
  "Birim, geçerlilik ve KDV'yi inceleyin",
  "Onaylayıp kaydedin",
] as const;

interface PriceCatalogWizardProps {
  onImported: (approvedCount: number) => void;
}

interface LoadedFile {
  name: string;
  columns: PriceCatalogColumn[];
  rows: PriceCatalogImportRow[];
  error: string | null;
}

const panel = "border border-border bg-background p-4";
const primaryButton = "pafta-button !min-h-9 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "pafta-button-secondary !min-h-9";

async function loadCatalogFile(file: File): Promise<LoadedFile> {
  const kind = spreadsheetKind(file.name, await readFileHead(file));
  if (kind === "xls") throw new Error(LEGACY_XLS_MESSAGE);
  if (kind === "other") throw new Error("Excel (.xlsx) veya CSV dosyası seçin.");
  const table = kind === "xlsx"
    ? await import("@/lib/price-catalog-import").then(({ readPriceCatalogXlsxTable }) => file.arrayBuffer().then(readPriceCatalogXlsxTable))
    : readPriceCatalogCsvTable(await file.text());
  const header = table.find((row) => row.some((cell) => String(cell ?? "").trim() !== "")) ?? [];
  const columns = detectPriceCatalogColumns(header);
  try {
    return { name: file.name, columns, rows: parsePriceCatalogRows(table), error: null };
  } catch (error) {
    return { name: file.name, columns, rows: [], error: error instanceof Error ? error.message : "Dosya okunamadı." };
  }
}

function formatAmount(value: number, currency = "TRY") {
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** Boş katalog için 5 adımlı ilk görev (marka.md M-17.3). Hiçbir fiyat, birim veya KDV oranı varsayılmaz. */
export function PriceCatalogWizard({ onImported }: PriceCatalogWizardProps) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [reading, setReading] = useState(false);
  const [catalogValidUntil, setCatalogValidUntil] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const review = useMemo(
    () => (loaded?.rows.length ? reviewPriceCatalog(loaded.rows, { catalogValidUntil: catalogValidUntil || undefined }) : null),
    [loaded, catalogValidUntil],
  );
  const missingRequired = loaded?.columns.filter((column) => column.required && column.index < 0) ?? [];
  const canLeaveColumns = Boolean(loaded && !loaded.error && missingRequired.length === 0 && loaded.rows.length > 0);

  const downloadTemplate = async () => {
    try {
      const { buildPriceCatalogXlsxTemplate, downloadXlsx } = await import("@/lib/spreadsheet-templates");
      downloadXlsx(await buildPriceCatalogXlsxTemplate(), "bimmetraj-fiyat-katalogu-sablonu.xlsx");
    } catch {
      toast.error("Excel şablonu hazırlanamadı.");
    }
  };

  const selectFile = async (file: File | null) => {
    if (!file) return;
    setReading(true);
    setOwnershipConfirmed(false);
    try {
      const next = await loadCatalogFile(file);
      setLoaded(next);
      setSourceName((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setStep(2);
    } catch (error) {
      setLoaded(null);
      toast.error(error instanceof Error ? error.message : "Dosya okunamadı.", { duration: 12000 });
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    if (!loaded?.rows.length || !vatRate || !ownershipConfirmed) return;
    setSaving(true);
    try {
      const response = await fetchWithAuth("/api/pricing/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTenantPriceCatalogImportPayload({
          sourceName: sourceName.trim() || loaded.name,
          fileName: loaded.name,
          validUntil: catalogValidUntil ? new Date(`${catalogValidUntil}T23:59:59`).toISOString() : undefined,
          rows: loaded.rows,
          ownershipConfirmed,
          vatPercentExcluded: vatRate,
          approveOnImport: true,
        })),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; snapshots?: Array<{ reviewStatus: string }> };
      if (!response.ok || !body.snapshots) {
        toast.error(body.error ?? "Fiyat kataloğu kaydedilemedi.");
        return;
      }
      const approvedCount = body.snapshots.filter((snapshot) => snapshot.reviewStatus === "approved").length;
      toast.success(`${approvedCount} fiyat onaylandı; teklif ve IFC icmalinde kullanılabilir.`);
      setLoaded(null);
      setStep(0);
      setVatRate("");
      setCatalogValidUntil("");
      setSourceName("");
      setOwnershipConfirmed(false);
      onImported(approvedCount);
    } catch {
      toast.error("Fiyat kataloğu kaydedilirken bağlantı hatası oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="price-catalog-wizard-title" data-testid="price-catalog-wizard" className="border border-border bg-card p-5">
      <h2 id="price-catalog-wizard-title" className="text-lg font-semibold text-foreground">Fiyat listenizi ekleyin</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Teklif ve IFC icmali yalnız burada onayladığınız firma fiyatlarını kullanır. Fiyatı olmayan kalem tutara katılmaz.
      </p>

      <ol className="mt-4 grid gap-2 sm:grid-cols-5" aria-label="Adımlar">
        {STEPS.map((label, index) => (
          <li
            key={label}
            data-wizard-step={index + 1}
            aria-current={index === step ? "step" : undefined}
            className={`border px-3 py-2 text-xs ${index === step ? "border-primary bg-primary/10 font-semibold text-foreground" : index < step ? "border-border text-foreground" : "border-border text-muted-foreground"}`}
          >
            <span className="font-mono">{index + 1}.</span> {label}
          </li>
        ))}
      </ol>

      <div className="mt-4">
        {step === 0 && (
          <div className={panel}>
            <p className="text-sm text-foreground">
              Şablonda "Fiyat Kataloğu" sayfası boştur; "Nasıl Doldurulur" ve "Örnek" sayfaları içe aktarılmaz.
              Kendi Excel listeniz varsa şablonu atlayabilirsiniz; başlıklarında açıklama, birim ve birim fiyat olması yeterlidir.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => void downloadTemplate()}>
                <Download className="h-3.5 w-3.5" /> Excel şablonunu indir (.xlsx)
              </button>
              <button type="button" className={primaryButton} onClick={() => setStep(1)}>Dosyam hazır</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={panel}>
            <label className="block text-sm text-foreground" htmlFor="price-catalog-file">Excel (.xlsx) veya CSV dosyası</label>
            <input
              id="price-catalog-file"
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={reading}
              onChange={(event) => { const selected = event.target.files?.[0] ?? null; event.target.value = ""; void selectFile(selected); }}
              className="mt-2 block w-full text-xs text-foreground"
            />
            {reading && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Dosya okunuyor…</p>}
            <div className="mt-3"><button type="button" className={secondaryButton} onClick={() => setStep(0)}>Geri</button></div>
          </div>
        )}

        {step === 2 && loaded && (
          <div className={panel} data-testid="price-catalog-columns">
            <p className="text-sm text-foreground">{loaded.name} dosyasındaki sütunlar şu alanlara okunacak:</p>
            <table className="mt-3 w-full text-left text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="py-1.5">Alan</th><th>Dosyadaki başlık</th></tr></thead>
              <tbody>
                {loaded.columns.map((column) => (
                  <tr key={column.field} className="border-b border-border/60" data-column-field={column.field}>
                    <td className="py-1.5 text-foreground">{column.label}{column.required ? " *" : ""}</td>
                    <td className={column.index >= 0 ? "text-foreground" : column.required ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {column.header ?? (column.required ? "Bulunamadı" : "Yok (isteğe bağlı)")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {missingRequired.length > 0 && (
              <p className="mt-3 text-xs text-destructive">
                {missingRequired.map((column) => column.label).join(", ")} sütunu bulunamadı. Başlığı şablondaki adla yazıp dosyayı yeniden seçin.
              </p>
            )}
            {loaded.error && missingRequired.length === 0 && <p className="mt-3 text-xs text-destructive">{loaded.error}</p>}
            {canLeaveColumns && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">{loaded.rows.length} fiyat satırı okundu. İlk satırlar:</p>
                <table className="mt-2 w-full text-left text-xs">
                  <tbody>
                    {loaded.rows.slice(0, 5).map((row, index) => (
                      <tr key={`${row.positionCode ?? ""}-${index}`} className="border-b border-border/60">
                        <td className="py-1 font-mono text-muted-foreground">{row.positionCode ?? "—"}</td>
                        <td className="text-foreground">{row.description}</td>
                        <td className="text-muted-foreground">{row.unit}</td>
                        <td className="text-right font-mono tabular-nums text-foreground">{formatAmount(row.amount, row.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => setStep(1)}>Başka dosya seç</button>
              <button type="button" className={primaryButton} disabled={!canLeaveColumns} onClick={() => setStep(3)}>Sütunlar doğru</button>
            </div>
          </div>
        )}

        {step === 3 && review && (
          <div className={`${panel} space-y-3`} data-testid="price-catalog-review">
            <div>
              <p className="text-sm font-semibold text-foreground">Birimler</p>
              <ul className="mt-1 flex flex-wrap gap-2 text-xs">
                {review.units.map((unit) => (
                  <li key={unit.unit} className={`border px-2 py-0.5 ${unit.known ? "border-border text-foreground" : "border-amber-500/60 text-amber-600"}`}>
                    {unit.unit} · {unit.count}{unit.known ? "" : " · tanınmayan birim"}
                  </li>
                ))}
              </ul>
              {review.units.some((unit) => !unit.known) && (
                <p className="mt-1 text-xs text-muted-foreground">Tanınmayan birimli satırlar kaydedilir ama IFC icmalindeki kalemlerle eşleşmez.</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="price-catalog-valid-until">Liste geçerlilik tarihi</label>
              <input
                id="price-catalog-valid-until"
                type="date"
                value={catalogValidUntil}
                onChange={(event) => setCatalogValidUntil(event.target.value)}
                className="mt-1 block border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">Satırda kendi tarihi olan fiyat o tarihi kullanır. Tarih yoksa fiyat süresiz kabul edilir.</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="price-catalog-vat">Fiyatlar KDV hariçtir. KDV oranı *</label>
              <select
                id="price-catalog-vat"
                value={vatRate}
                onChange={(event) => setVatRate(event.target.value)}
                className="mt-1 block border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value="">Oran seçin</option>
                {VAT_RATE_OPTIONS.map((rate) => <option key={rate} value={rate}>%{rate}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Oran tüm listeye uygulanır; farklı oranlı kalemleri ayrı dosyayla ekleyin.</p>
            </div>

            <ReviewWarnings review={review} />

            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => setStep(2)}>Geri</button>
              <button type="button" className={primaryButton} disabled={!vatRate} onClick={() => setStep(4)}>İnceledim</button>
            </div>
          </div>
        )}

        {step === 4 && review && (
          <div className={`${panel} space-y-3`}>
            <label className="block text-sm text-foreground" htmlFor="price-catalog-source-name">
              Liste adı
              <input
                id="price-catalog-source-name"
                value={sourceName}
                maxLength={200}
                onChange={(event) => setSourceName(event.target.value)}
                className="mt-1 block w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {review.rowCount} fiyat · KDV hariç, %{vatRate} · {catalogValidUntil ? `${new Date(catalogValidUntil).toLocaleDateString("tr-TR")} tarihine kadar geçerli` : "liste tarihi yok"}
            </p>
            <label className="flex items-start gap-2 text-xs text-foreground">
              <input type="checkbox" checked={ownershipConfirmed} onChange={(event) => setOwnershipConfirmed(event.target.checked)} className="mt-0.5" />
              <span>Bu fiyatlar firmamızın kendi gerçekleşen veya kullandığı fiyatlarıdır; inceledim ve teklifte kullanılmalarını onaylıyorum. Tedarikçi teklifleri bu listeyle değil, Tedarikçi &amp; Piyasa ekranından eklenir.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => setStep(3)}>Geri</button>
              <button type="button" className={primaryButton} disabled={!ownershipConfirmed || saving} onClick={() => void save()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />} Fiyatları onayla ve kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewWarnings({ review }: { review: NonNullable<ReturnType<typeof reviewPriceCatalog>> }) {
  const warnings = [
    review.conflictingPozKeys.length > 0 && `Aynı poz ve birimde farklı fiyat: ${review.conflictingPozKeys.join(", ")}. Bu kalemler otomatik eşleşmez; listeyi düzeltmeniz önerilir.`,
    review.expiredCount > 0 && `${review.expiredCount} fiyatın geçerlilik tarihi geçmiş; bu fiyatlar önerilmez.`,
    review.nonTryCount > 0 && `${review.nonTryCount} fiyat TL dışında; IFC icmali ve teklif aktarımı yalnız TL fiyat kullanır.`,
    review.missingPozCount > 0 && `${review.missingPozCount} fiyatta poz numarası yok; elle teklifte kullanılabilir ama IFC icmali kalemleriyle eşleşmez.`,
    review.openEndedCount > 0 && `${review.openEndedCount} fiyatın geçerlilik tarihi yok.`,
  ].filter((warning): warning is string => Boolean(warning));
  if (!warnings.length) {
    return <p className="flex items-center gap-2 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Uyarı yok.</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-amber-600" data-testid="price-catalog-warnings">
      {warnings.map((warning) => <li key={warning} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}</li>)}
    </ul>
  );
}
