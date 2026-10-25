import { Download } from "lucide-react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { QUANTITY_SOURCE_LABEL, cetvelCsv, formatQuantity } from "@/ifc/calculation-trace";
import { downloadTextFile, safeFileStem } from "@/lib/download-text";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Ekranda gösterilen en fazla satır; tamamı her zaman CSV'ye yazılır. */
export const CETVEL_VISIBLE_ROWS = 500;

const optional = (value: number | null) => (value === null ? "—" : formatQuantity(value, 3));

interface MetrajCetveliSheetProps {
  item: CalmIcmalItem;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetrajCetveliSheet({ item, fileName, open, onOpenChange }: MetrajCetveliSheetProps) {
  const contributions = item.contributions ?? [];
  const visible = contributions.slice(0, CETVEL_VISIBLE_ROWS);

  const download = () => {
    const csv = cetvelCsv(item, { fileName, generatedAt: new Date().toLocaleString("tr-TR") });
    downloadTextFile(csv, `${safeFileStem(fileName)}_${safeFileStem(item.title)}_metraj_cetveli.csv`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 overflow-y-auto border-border bg-card p-0 text-foreground data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <p className="section-index">METRAJ CETVELİ</p>
          <SheetTitle className="font-display-serif text-2xl text-foreground">{item.title}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Bu kaleme giren {contributions.length} satır. Satırların net toplamı kalemin net miktarına eşittir; kendi
            hesabınızla karşılaştırmak için Excel'e indirebilirsiniz.
          </SheetDescription>
          <div className="pt-2">
            <button
              type="button"
              onClick={download}
              className="inline-flex h-9 items-center gap-2 border border-primary px-4 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Download aria-hidden="true" className="h-4 w-4" /> Excel için indir (CSV)
            </button>
          </div>
        </SheetHeader>
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[860px] text-left text-xs">
            <caption className="sr-only">{item.title} metraj cetveli</caption>
            <thead className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="p-2">Sıra</th>
                <th scope="col" className="p-2">Eleman</th>
                <th scope="col" className="p-2">Kat</th>
                <th scope="col" className="p-2">Mahal / Katman</th>
                <th scope="col" className="p-2 text-right">Brüt</th>
                <th scope="col" className="p-2 text-right">Boşluk</th>
                <th scope="col" className="p-2 text-right">Net ({item.unit})</th>
                <th scope="col" className="p-2">Miktar kaynağı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((c, index) => (
                <tr key={`${c.globalId}-${c.layer ?? ""}-${index}`} className="align-top">
                  <td className="p-2 font-mono tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="p-2">
                    <div className="font-semibold text-foreground">{c.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{c.ifcClass} · {c.globalId}</div>
                  </td>
                  <td className="p-2 text-foreground">{c.storeyLabel}</td>
                  <td className="p-2 text-foreground">{[c.roomLabel, c.layer].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-2 text-right font-mono tabular-nums">{optional(c.grossQuantity)}</td>
                  <td className="p-2 text-right font-mono tabular-nums">{optional(c.openingQuantity)}</td>
                  <td className="p-2 text-right font-mono font-semibold tabular-nums">{formatQuantity(c.netQuantity, 3)}</td>
                  <td className="p-2 text-foreground">{QUANTITY_SOURCE_LABEL[c.quantitySource]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-foreground">
              <tr>
                <td colSpan={6} className="p-2 text-right font-semibold">Toplam</td>
                <td className="p-2 text-right font-mono font-bold tabular-nums">{formatQuantity(item.netQuantity, 3)}</td>
                <td className="p-2 text-muted-foreground">{item.unit}</td>
              </tr>
            </tfoot>
          </table>
          {contributions.length > CETVEL_VISIBLE_ROWS && (
            <p className="mt-3 text-xs text-muted-foreground">
              Ekranda ilk {CETVEL_VISIBLE_ROWS} satır gösteriliyor; {contributions.length} satırın tamamı CSV dosyasındadır.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
