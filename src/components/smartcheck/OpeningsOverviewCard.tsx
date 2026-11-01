import { summarizeOpeningsOverview, type OpeningKindOverview } from "@/ifc/openings-overview";
import type { ParsedOpening } from "@/ifc/types";

const formatSize = (value: number) => value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function KindBlock({ title, overview }: { title: string; overview: OpeningKindOverview }) {
  return (
    <div className="min-w-[14rem] flex-1">
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{title}</span>
        <span className="font-mono tabular-nums">{overview.count.toLocaleString("tr-TR")} adet</span>
      </div>
      <p className="mt-1 text-muted-foreground">Ölçüsü okunan {overview.measuredCount.toLocaleString("tr-TR")} adetin toplam alanı: {formatSize(overview.areaM2)} m²</p>
      <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-muted-foreground">
        {overview.sizes.slice(0, 6).map(size => (
          <li key={`${size.widthM}x${size.heightM}`}>{formatSize(size.widthM)} × {formatSize(size.heightM)} m · {size.count.toLocaleString("tr-TR")} adet</li>
        ))}
        {overview.sizes.length > 6 && <li>… ve {overview.sizes.length - 6} ölçü daha</li>}
      </ul>
    </div>
  );
}

/** Doors and windows read from the model, shown whether or not an icmal line is selected. */
export function OpeningsOverviewCard({ openings }: { openings: readonly ParsedOpening[] | undefined }) {
  if (!openings || openings.length === 0) return null;
  const overview = summarizeOpeningsOverview(openings);
  return (
    <section className="border border-border bg-card p-4 text-xs" data-testid="openings-overview">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kapı ve pencereler · modelden okunan</div>
      <div className="mt-3 flex flex-wrap gap-6">
        <KindBlock title="Kapı" overview={overview.door} />
        <KindBlock title="Pencere" overview={overview.window} />
      </div>
      <p className="mt-3 text-muted-foreground">
        {overview.unmeasuredCount > 0 ? `${overview.unmeasuredCount} boşluğun ölçüsü okunamadı. ` : ""}
        Boşluk düşümü kalemlere otomatik uygulanmaz; sıva ve boya kalemi seçildiğinde düşüm özeti o kalemin altında görünür.
      </p>
    </section>
  );
}
