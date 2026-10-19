import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Filter, Layers, ShieldAlert } from "lucide-react";
import type {
  IfcConsistencyFinding,
  IfcConsistencyFindingCode,
  IfcConsistencyReport,
  IfcSuppressedAssemblyPartRecord,
  IfcUncoveredElementRecord,
  ParsedIfcElement,
} from "@/ifc/types";

export type CoverageFilterMode = "none" | "uncovered" | "high" | "medium" | "unmeasured" | "suppressed";

export interface IfcCoverageCardProps {
  report: IfcConsistencyReport | null | undefined;
  elements?: readonly ParsedIfcElement[];
  selectedGlobalId?: string | null;
  onSelectGlobalId?: (globalId: string | null) => void;
}

const FINDING_CODE_LABELS: Record<IfcConsistencyFindingCode, string> = {
  DUPLICATE_GLOBAL_ID: "Mükerrer GlobalId",
  ORPHAN_OPENING_ELEMENT: "Sahipsiz Boşluk (Yetim IfcOpeningElement)",
  NEGATIVE_NET_QUANTITY: "Negatif Net Miktar",
  ZERO_NET_QUANTITY: "Sıfır Net Miktar",
  MISSING_NET_QUANTITY: "Ölçülemedi (QTO Yok)",
  MISSING_SPATIAL_STOREY: "Kat Atanmamış",
  UNCOVERED_PROXY_ELEMENT: "Kapsam Dışı Proxy Eleman",
  UNMAPPED_POZ_ELEMENT: "Poza Eşleşmeyen Eleman",
};

function formatMetricValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "değerlendirilmedi";
  return value.toLocaleString("tr-TR");
}

function formatRatioPercent(
  ratio: number | null | undefined,
  matchedCount: number | null | undefined,
  totalCount: number | null | undefined,
): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "değerlendirilmedi";
  const pct = (ratio * 100).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (typeof matchedCount === "number" && typeof totalCount === "number") {
    return `%${pct} (${matchedCount.toLocaleString("tr-TR")} / ${totalCount.toLocaleString("tr-TR")})`;
  }
  return `%${pct}`;
}

function filterFindingsByMode(
  findings: readonly IfcConsistencyFinding[],
  mode: CoverageFilterMode,
): IfcConsistencyFinding[] {
  if (mode === "high") return findings.filter((f) => f.severity === "high");
  if (mode === "medium") return findings.filter((f) => f.severity === "medium");
  if (mode === "unmeasured") {
    return findings.filter(
      (f) => f.code === "NEGATIVE_NET_QUANTITY" || f.code === "ZERO_NET_QUANTITY" || f.code === "MISSING_NET_QUANTITY",
    );
  }
  if (mode === "uncovered") {
    return findings.filter((f) => f.code === "UNCOVERED_PROXY_ELEMENT" || f.code === "UNMAPPED_POZ_ELEMENT");
  }
  return [...findings];
}

function UncoveredItemsView({
  items,
  selectedGlobalId,
  onRowClick,
}: {
  items: readonly IfcUncoveredElementRecord[];
  selectedGlobalId: string | null;
  onRowClick: (globalId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        <span>Açıkta kalan (poza eşleşmeyen veya proxy) eleman bulunmadı.</span>
      </p>
    );
  }
  return (
    <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-border">
      {items.map((item, idx) => (
        <button
          key={`${item.globalId}-${idx}`}
          type="button"
          onClick={() => onRowClick(item.globalId)}
          className={`w-full text-left py-2 px-2 flex flex-wrap items-center justify-between gap-2 transition-colors ${
            selectedGlobalId === item.globalId ? "bg-primary/10" : "hover:bg-card"
          }`}
        >
          <div className="min-w-0">
            <span className="inline-block border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-foreground mr-2">
              AÇIKTA KALAN · {item.ifcClass}
            </span>
            <span className="font-mono text-xs font-semibold text-foreground">{item.globalId}</span>
            <span className="ml-2 text-xs text-foreground">{item.name}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.reason}</p>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Kat: {item.storey}</span>
        </button>
      ))}
    </div>
  );
}

function SuppressedPartsView({ parts }: { parts: readonly IfcSuppressedAssemblyPartRecord[] }) {
  if (parts.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Modelde çift sayımı önlemek için bastırılan alt montaj parçası bulunmadı.
      </p>
    );
  }
  return (
    <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-border">
      {parts.map((part, idx) => (
        <div key={`${part.globalId}-${idx}`} className="py-2 px-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="inline-block border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-foreground mr-2">
              ALT PARÇA ({part.ifcClass})
            </span>
            <span className="font-mono font-semibold text-foreground">{part.globalId}</span>
            <span className="ml-2 text-foreground">{part.name}</span>
            <span className="ml-2 text-muted-foreground">
              → Üst Montaj: {part.parentIfcClass} ({part.parentGlobalId})
            </span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Kat: {part.storey}</span>
        </div>
      ))}
    </div>
  );
}

function FindingsListView({
  findings,
  selectedGlobalId,
  onRowClick,
}: {
  findings: readonly IfcConsistencyFinding[];
  selectedGlobalId: string | null;
  onRowClick: (globalId: string) => void;
}) {
  if (findings.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        <span>Bu filtrede tutarlılık bulgusu bulunmadı.</span>
      </p>
    );
  }
  return (
    <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-border">
      {findings.map((finding, idx) => (
        <button
          key={`${finding.code}-${finding.globalId}-${idx}`}
          type="button"
          onClick={() => onRowClick(finding.globalId)}
          className={`w-full text-left py-2 px-2 flex flex-wrap items-center justify-between gap-2 transition-colors ${
            selectedGlobalId === finding.globalId ? "bg-primary/10" : "hover:bg-card"
          }`}
        >
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-foreground mr-2">
              {finding.severity === "high" ? (
                <AlertTriangle className="w-3 h-3 text-primary" aria-hidden="true" />
              ) : (
                <Layers className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              )}
              <span>
                {finding.severity === "high" ? "YÜKSEK CİDDİYET" : "ORTA CİDDİYET"} · {FINDING_CODE_LABELS[finding.code]}
              </span>
            </span>
            <span className="font-mono text-xs font-semibold text-foreground">{finding.globalId}</span>
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">[{finding.ifcClass}]</span>
            {finding.elementName && <span className="ml-2 text-xs text-foreground">{finding.elementName}</span>}
            <p className="text-[11px] text-muted-foreground mt-0.5">{finding.message}</p>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Kat: {finding.storey}</span>
        </button>
      ))}
    </div>
  );
}

function CoverageMetricsGrid({
  report,
  activeFilter,
  onToggleFilter,
}: {
  report: IfcConsistencyReport | null | undefined;
  activeFilter: CoverageFilterMode;
  onToggleFilter: (next: CoverageFilterMode) => void;
}) {
  const hasReport = Boolean(report);
  const btnCls = (active: boolean) =>
    `border p-3 text-left transition-colors ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-card"
    }`;
  const subCls = (active: boolean) => (active ? "text-primary-foreground" : "text-muted-foreground");

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <div data-testid="coverage-total-elements" className="border border-border bg-background p-3 text-left">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">1. Toplam Eleman</span>
        <span className="mt-1 block font-mono text-lg font-bold text-foreground tabular-nums">
          {hasReport ? formatMetricValue(report?.totalElementCount) : "değerlendirilmedi"}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">Modelde taranan tekil yapı elemanı</span>
      </div>

      <button
        type="button"
        data-testid="coverage-measured-elements"
        onClick={() => hasReport && onToggleFilter("unmeasured")}
        aria-pressed={activeFilter === "unmeasured"}
        className={btnCls(activeFilter === "unmeasured")}
      >
        <span className={`font-mono text-[10px] uppercase tracking-wider block ${subCls(activeFilter === "unmeasured")}`}>
          2. Ölçülen Eleman
        </span>
        <span className="mt-1 block font-mono text-lg font-bold tabular-nums">
          {hasReport && report
            ? `${formatMetricValue(report.measuredElementCount)} / ${formatMetricValue(report.totalElementCount)}`
            : "değerlendirilmedi"}
        </span>
        <span className={`mt-0.5 block text-[11px] ${subCls(activeFilter === "unmeasured")}`}>
          {hasReport && report ? `Ölçülemedi: ${formatMetricValue(report.unmeasuredElementCount)} eleman` : "Durum: değerlendirilmedi"}
        </span>
      </button>

      <div data-testid="coverage-poz-ratio" className="border border-border bg-background p-3 text-left">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">3. Poza Eşleşen Oranı</span>
        <span className="mt-1 block font-mono text-lg font-bold text-foreground tabular-nums">
          {hasReport && report
            ? formatRatioPercent(report.pozMatchedRatio, report.pozMatchedElementCount, report.totalElementCount)
            : "değerlendirilmedi"}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">İcmal grubuna / poza yerleşen elemanlar</span>
      </div>

      <button
        type="button"
        data-testid="coverage-uncovered-elements"
        onClick={() => hasReport && onToggleFilter("uncovered")}
        aria-pressed={activeFilter === "uncovered"}
        className={btnCls(activeFilter === "uncovered")}
      >
        <span className={`font-mono text-[10px] uppercase tracking-wider block ${subCls(activeFilter === "uncovered")}`}>
          4. Açıkta Kalan Eleman
        </span>
        <span className="mt-1 block font-mono text-lg font-bold tabular-nums">
          {hasReport ? formatMetricValue(report?.uncoveredElementCount) : "değerlendirilmedi"}
        </span>
        <span className={`mt-0.5 block text-[11px] ${subCls(activeFilter === "uncovered")}`}>
          {hasReport ? "Filtrelemek için tıklayın (Proxy / Eşleşmeyen)" : "Durum: değerlendirilmedi"}
        </span>
      </button>

      <div data-testid="coverage-findings-summary" className="border border-border bg-background p-3 text-left">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">5. Tutarlılık Bulguları</span>
        {hasReport && report ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="filter-findings-high"
              onClick={() => onToggleFilter("high")}
              aria-pressed={activeFilter === "high"}
              className={`border px-2 py-0.5 font-mono text-xs font-semibold transition-colors ${
                activeFilter === "high"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-background"
              }`}
            >
              Yüksek: {formatMetricValue(report.highSeverityCount)}
            </button>
            <button
              type="button"
              data-testid="filter-findings-medium"
              onClick={() => onToggleFilter("medium")}
              aria-pressed={activeFilter === "medium"}
              className={`border px-2 py-0.5 font-mono text-xs font-semibold transition-colors ${
                activeFilter === "medium"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-background"
              }`}
            >
              Orta: {formatMetricValue(report.mediumSeverityCount)}
            </button>
          </div>
        ) : (
          <span className="mt-1 block font-mono text-lg font-bold text-foreground">değerlendirilmedi</span>
        )}
        <span className="mt-1 block text-[11px] text-muted-foreground">Ciddiyete göre filtrelemek için tıklayın</span>
      </div>
    </div>
  );
}

export const IfcCoverageCard: React.FC<IfcCoverageCardProps> = ({
  report,
  selectedGlobalId = null,
  onSelectGlobalId,
}) => {
  const [activeFilter, setActiveFilter] = useState<CoverageFilterMode>("none");
  const hasReport = Boolean(report);
  const findings = useMemo(() => report?.findings ?? [], [report]);
  const uncoveredList = useMemo(() => report?.uncoveredElements ?? [], [report]);
  const suppressedParts = useMemo(() => report?.suppressedAssemblyParts ?? [], [report]);
  const filteredFindings = useMemo(() => filterFindingsByMode(findings, activeFilter), [findings, activeFilter]);

  const handleToggleFilter = (next: CoverageFilterMode) => setActiveFilter((prev) => (prev === next ? "none" : next));
  const handleRowClick = (globalId: string) => onSelectGlobalId?.(selectedGlobalId === globalId ? null : globalId);

  return (
    <section
      aria-label="Metraj Kapsama ve IFC Tutarlılık Kartı"
      data-testid="ifc-coverage-card"
      className="border-b border-border bg-card px-6 py-4 text-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>IFC TUTARLILIK KAPISI &amp; METRAJ KAPSAMA KARTI</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Modelden okunan gerçek eleman, ölçüm, poz eşleşmesi ve şema tutarlılık verileri. Ölçülemeyen veya açıkta kalan elemanlar toplama katılmaz.
          </p>
        </div>

        {hasReport && report && (
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="border border-border bg-background px-2.5 py-1 text-foreground">
              Tip Mirası (IfcTypeObject): <strong>{formatMetricValue(report.typeInheritedElementCount)}</strong>
            </span>
            <button
              type="button"
              onClick={() => handleToggleFilter("suppressed")}
              aria-pressed={activeFilter === "suppressed"}
              className={`border px-2.5 py-1 transition-colors ${
                activeFilter === "suppressed"
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-background text-foreground hover:bg-card"
              }`}
            >
              Çift Sayımı Önlenen Alt Parça: <strong>{formatMetricValue(report.suppressedAssemblyPartCount)}</strong>
            </button>
          </div>
        )}
      </div>

      <CoverageMetricsGrid report={report} activeFilter={activeFilter} onToggleFilter={handleToggleFilter} />

      {hasReport && activeFilter !== "none" && (
        <div data-testid="coverage-filtered-panel" className="mt-3 border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                {activeFilter === "uncovered" && `Açıkta Kalan Elemanlar (${uncoveredList.length})`}
                {activeFilter === "high" && `Yüksek Ciddiyetli Tutarlılık Bulguları (${filteredFindings.length})`}
                {activeFilter === "medium" && `Orta Ciddiyetli Tutarlılık Bulguları (${filteredFindings.length})`}
                {activeFilter === "unmeasured" && `Ölçülemeyen Elemanlar — Sıfır / Negatif / Eksik Miktar (${filteredFindings.length})`}
                {activeFilter === "suppressed" && `Montaj Çift Sayım Koruması — Bastırılan Alt Parçalar (${suppressedParts.length})`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilter("none")}
              className="border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-foreground hover:bg-background"
            >
              Filtreyi Kapat
            </button>
          </div>

          {activeFilter === "uncovered" ? (
            <UncoveredItemsView items={uncoveredList} selectedGlobalId={selectedGlobalId} onRowClick={handleRowClick} />
          ) : activeFilter === "suppressed" ? (
            <SuppressedPartsView parts={suppressedParts} />
          ) : (
            <FindingsListView findings={filteredFindings} selectedGlobalId={selectedGlobalId} onRowClick={handleRowClick} />
          )}
        </div>
      )}
    </section>
  );
};
