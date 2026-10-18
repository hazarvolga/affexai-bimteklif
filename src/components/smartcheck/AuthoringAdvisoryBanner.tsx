import React, { useEffect, useMemo, useState } from "react";
import {
  computeFinishLayerShrinkage,
  REVIT_PRE_EXPORT_CHECKLIST,
  type AuthoringAdvisory,
  type AuthoringSoftwareDetection,
  type PreExportChecklistItem,
} from "@/ifc/authoring-software-diagnostics";

function parseOptional(raw: string): number {
  const n = Number(raw.trim().replace(",", "."));
  return raw.trim() === "" || !Number.isFinite(n) ? NaN : n;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export const RevitChecklistCards: React.FC<{ items: PreExportChecklistItem[] }> = ({ items }) => (
  <div className="border border-border bg-background">
    <div className="border-b border-border bg-card px-3 py-2 flex flex-wrap items-center justify-between gap-2">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
        REVIT → IFC SÜREÇ ÖNCESİ DOĞRULAMA KONTROL LİSTESİ (QA CHECKLIST)
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        6 KRİTİK AYAR &amp; TUZAK KONTROLÜ
      </span>
    </div>
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="p-3 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">{item.category}</span>
            <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5">
              Zorunlu Ayar: {item.requiredSetting}
            </span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            Menü Yolu: <span className="text-foreground">{item.menuPath}</span>
          </div>
          <p className="text-xs leading-relaxed text-foreground">{item.technicalReason}</p>
          {item.commonTrap && (
            <div className="border-l-2 border-primary bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
              <strong className="text-foreground">Sık Yapılan Hata / Teknik Ayrım: </strong>
              {item.commonTrap}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const AuthoringAdvisoryBanner: React.FC<{ advisory?: AuthoringAdvisory }> = ({ advisory }) => {
  const [open, setOpen] = useState(false);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [layerCm, setLayerCm] = useState("");

  const shrink = useMemo(
    () =>
      computeFinishLayerShrinkage({
        lengthM: parseOptional(length),
        widthM: parseOptional(width),
        wallLayerThicknessCm: parseOptional(layerCm),
      }),
    [length, width, layerCm],
  );

  if (!advisory) {
    return (
      <div className="mx-6 mt-4 border border-border bg-card px-4 py-2 text-[11px] text-muted-foreground" data-testid="authoring-advisory">
        Kaynak yazılım bu kayıt için tespit edilemedi (IFC başlığı okunamadı veya kayıt sunucu kanıtından geldi).
      </div>
    );
  }

  const caution = advisory.tone === "caution";
  return (
    <div
      className={`mx-6 mt-4 border p-4 ${caution ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}
      data-testid="authoring-advisory"
      role="note"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="section-index">KAYNAK YAZILIM · {advisory.family.toUpperCase()}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-wider text-primary underline"
          aria-expanded={open}
        >
          {open ? "Ayrıntıyı gizle" : "Ayrıntıyı göster"}
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{advisory.headline}</p>

      {open && (
        <div className="mt-3 space-y-3">
          <ul className="list-disc pl-4 space-y-1 text-xs text-foreground">
            {advisory.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="text-xs text-foreground">
            <b>Öneri:</b> {advisory.recommendedAction}
          </p>

          {advisory.preExportChecklist && advisory.preExportChecklist.length > 0 && (
            <RevitChecklistCards items={advisory.preExportChecklist} />
          )}

          <div className="border border-border bg-background p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Katman daralması hesabı (tek oda · kendi ölçünüzle)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Oda boyu (m)", length, setLength],
                ["Oda eni (m)", width, setWidth],
                ["Duvar katmanı (cm)", layerCm, setLayerCm],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="block">
                  <span className="block font-mono text-[10px] text-muted-foreground mb-1">{label as string}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value as string}
                    placeholder="girin"
                    aria-label={label as string}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-right tabular-nums"
                  />
                </label>
              ))}
            </div>
            {shrink && (
              <p className="mt-2 text-xs font-mono tabular-nums text-foreground">
                Net {fmt(shrink.netAreaM2)} m² → modelde {fmt(shrink.modeledFloorAreaM2)} m² (fark{" "}
                {fmt(shrink.differenceM2)} m², %{fmt(shrink.differencePercent)}). Yalnızca bu tek odanın
                aritmetiğidir; proje toplamı için tahmin değildir.
              </p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">{advisory.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Dosya yükleme (Süreç Öncesi) ekranında kullanıcıya gösterilen Revit & IFC hazırlık rehberi.
 * Kullanıcı bir .ifc dosyası seçtiğinde tarayıcıda ilk 64 KB başlığı okunur; dosya Revit
 * kaynaklıysa panel otomatik olarak açılır ve süreç öncesi kritik kontrolleri gösterir.
 */
export const RevitPreUploadChecklistPanel: React.FC<{
  selectedDetection?: AuthoringSoftwareDetection | null;
}> = ({ selectedDetection }) => {
  const isRevitDetected = selectedDetection?.family === "revit";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isRevitDetected) {
      setOpen(true);
    }
  }, [isRevitDetected]);

  return (
    <div
      className={`border p-4 transition-colors ${
        isRevitDetected ? "border-destructive/50 bg-destructive/5" : "border-border bg-card/60"
      }`}
      data-testid="revit-preupload-checklist"
      role="region"
      aria-label="Revit ile işlem öncesi IFC dışa aktarım kontrol rehberi"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="section-index">
            {isRevitDetected
              ? "OTOMATİK TESPİT: SEÇİLEN DOSYA AUTODESK REVIT KAYNAKLI"
              : "SÜREÇ ÖNCESİ REHBER · REVIT İLE İŞLEM YAPACAK KULLANICILAR İÇİN"}
          </span>
          {selectedDetection && selectedDetection.family !== "unknown" && (
            <span className="font-mono text-[10px] uppercase px-2 py-0.5 border border-primary/40 bg-primary/10 text-primary">
              Tespit: {selectedDetection.family.toUpperCase()}
              {selectedDetection.rawApplicationName ? ` (${selectedDetection.rawApplicationName})` : ""}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-wider text-primary underline"
          aria-expanded={open}
        >
          {open ? "Kontrol Listesini Gizle" : "6 Maddelik Revit Kontrol Listesini Aç"}
        </button>
      </div>

      <p className="mt-1.5 text-xs sm:text-sm font-semibold text-foreground">
        {isRevitDetected
          ? "Seçtiğiniz IFC dosyası Revit kaynaklıdır — Analizi başlatmadan önce aşağıdaki 6 dışa aktarım ve modelleme kuralının uygulandığından emin olun"
          : "Revit modelinizi IFC'ye aktarmadan veya sisteme yüklemeden önce metraj, mahal hacmi (Areas and Volumes) ve birleşim (Join) ayarlarını doğrulayın"}
      </p>

      {open && (
        <div className="mt-3 space-y-3">
          <RevitChecklistCards items={REVIT_PRE_EXPORT_CHECKLIST} />
        </div>
      )}
    </div>
  );
};
