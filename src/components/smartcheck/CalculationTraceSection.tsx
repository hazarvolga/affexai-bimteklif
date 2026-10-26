import { useState } from "react";
import { ListOrdered } from "lucide-react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { explainIcmalItem, type OpeningsAvailability } from "@/ifc/calculation-trace";
import { MetrajCetveliSheet } from "./MetrajCetveliSheet";

interface CalculationTraceSectionProps {
  item: CalmIcmalItem;
  fileName: string;
  openings: OpeningsAvailability;
}

/** Seçili icmal kaleminin "Bu sayı nasıl oluştu?" anlatımı ve metraj cetveline geçiş. */
export function CalculationTraceSection({ item, fileName, openings }: CalculationTraceSectionProps) {
  const [cetvelOpen, setCetvelOpen] = useState(false);
  const steps = explainIcmalItem(item, { openings });
  const rowCount = item.contributions?.length ?? 0;

  return (
    <section aria-labelledby={`trace-${item.id}`} className="mt-5 border border-border bg-background p-4">
      <h5 id={`trace-${item.id}`} className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Bu sayı nasıl oluştu?
      </h5>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-foreground">
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {rowCount > 0 && (
        <button
          type="button"
          onClick={() => setCetvelOpen(true)}
          className="mt-3 inline-flex h-9 items-center gap-2 border border-primary px-4 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ListOrdered aria-hidden="true" className="h-4 w-4" /> Metraj cetvelini aç ({rowCount} satır)
        </button>
      )}
      {rowCount > 0 && <MetrajCetveliSheet item={item} fileName={fileName} open={cetvelOpen} onOpenChange={setCetvelOpen} />}
    </section>
  );
}
