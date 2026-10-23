import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { IfcUncoveredElementRecord, UncoveredQuantity } from "@/ifc/types";
import { summarizeUncoveredQuantities } from "@/ifc/uncovered-quantity";

function formatQuantity(quantity: UncoveredQuantity): string {
  return `${quantity.value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${quantity.unit}`;
}

function UncoveredTotals({ items }: { items: readonly IfcUncoveredElementRecord[] }) {
  const totals = summarizeUncoveredQuantities(items);
  if (totals.length === 0) return null;
  return (
    <p data-testid="uncovered-quantity-totals" className="mt-2 text-xs text-foreground">
      <span className="font-semibold">İcmale girmeyen miktar (fiyatlandırılmadı): </span>
      {totals.map((total) => `${formatQuantity(total)} (${total.count} eleman)`).join(" · ")}
      <span className="block text-[11px] text-muted-foreground">
        Kapsam dışı sınıfların (merdiven, giydirme cephe, proxy) miktarı satırlarda gösterilir, toplama katılmaz.
      </span>
    </p>
  );
}

export function UncoveredItemsView({
  items,
  selectedElementKey,
  onRowClick,
}: {
  items: readonly IfcUncoveredElementRecord[];
  selectedElementKey: string | null;
  onRowClick: (item: IfcUncoveredElementRecord) => void;
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
    <>
      <UncoveredTotals items={items} />
      <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-border">
        {items.map((item, idx) => (
          <button
            key={`${item.globalId}-${idx}`}
            type="button"
            onClick={() => onRowClick(item)}
            className={`w-full text-left py-2 px-2 flex flex-wrap items-center justify-between gap-2 transition-colors ${
              selectedElementKey && selectedElementKey === item.sourceIdentity?.elementKey ? "bg-primary/10" : "hover:bg-card"
            }`}
          >
            <div className="min-w-0">
              <span className="inline-block border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-foreground mr-2">
                {item.scope === "out_of_scope" ? "KAPSAM DIŞI" : "AÇIKTA KALAN"} · {item.ifcClass}
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">{item.globalId}</span>
              <span className="ml-2 text-xs text-foreground">{item.name}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.reason}</p>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground text-right">
              {item.quantity ? `${formatQuantity(item.quantity)} · fiyatlandırılmadı` : "Miktar: modelde yok"}
              <span className="block">Kat: {item.storey}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
