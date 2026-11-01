import { buildModelInventory, type InventoryStatus } from "@/ifc/model-inventory";
import type { CalmIfcDataset } from "@/ifc/calm-icmal";

const STATUS_LABEL: Record<InventoryStatus, string> = {
  in_icmal: "İcmalde",
  listed: "Ayrı listede",
  not_counted: "Metraja girmiyor",
};
const STATUS_TONE: Record<InventoryStatus, string> = {
  in_icmal: "text-emerald-700 dark:text-emerald-400",
  listed: "text-sky-700 dark:text-sky-400",
  not_counted: "text-amber-700 dark:text-amber-400",
};

/** What the file holds, class by class, so a person can compare it with another viewer's counts. */
export function ModelInventoryCard({ dataset }: { dataset: CalmIfcDataset }) {
  const rows = buildModelInventory({ inventory: dataset.classInventory, elements: dataset.elements, apartments: dataset.apartments, openings: dataset.openings });
  if (rows.length === 0) return null;
  return (
    <section className="border border-border bg-card p-4" data-testid="model-inventory">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Model envanteri · dosyada ne var, ne sayıldı</div>
      <p className="mt-1 text-xs text-muted-foreground">Sayılar dosyadaki örnek sayılarıdır; başka bir IFC görüntüleyicideki sınıf sayılarıyla karşılaştırılabilir.</p>
      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-1 pr-3">Sınıf</th><th className="py-1 pr-3 text-right">Dosyada</th><th className="py-1 pr-3 text-right">Sayılan</th><th className="py-1 pr-3">Durum</th><th className="py-1">Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.ifcClass} className="border-t border-border align-top">
              <td className="py-1.5 pr-3"><span className="font-medium">{row.label}</span> <code className="text-[10px] text-muted-foreground">{row.ifcClass}</code></td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{row.total.toLocaleString("tr-TR")}</td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{row.counted.toLocaleString("tr-TR")}</td>
              <td className={`py-1.5 pr-3 font-medium ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</td>
              <td className="py-1.5 text-muted-foreground">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
