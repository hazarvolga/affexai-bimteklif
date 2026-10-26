import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import type { ResultSummary, ResultTone } from "@/ifc/result-summary";

interface ResultSummaryPanelProps {
  summary: ResultSummary;
  /** Opens the cost and offer step of the current icmal. */
  onOpenCostStep: () => void;
}

const TONE: Record<ResultTone, { icon: typeof CheckCircle2; label: string; className: string }> = {
  ok: { icon: CheckCircle2, label: "Tamam", className: "text-emerald-700 dark:text-emerald-400" },
  attention: { icon: AlertTriangle, label: "Dikkat", className: "text-amber-700 dark:text-amber-400" },
  pending: { icon: Clock, label: "Bekliyor", className: "text-muted-foreground" },
  unknown: { icon: HelpCircle, label: "Belirlenemedi", className: "text-muted-foreground" },
};

/** "Ne oldu, ne eksik, sırada ne var?" — sonuç ekranının ilk okunan özeti (marka.md M-20.3). */
export function ResultSummaryPanel({ summary, onOpenCostStep }: ResultSummaryPanelProps) {
  const { action, text } = summary.nextStep;
  return (
    <section aria-labelledby="result-summary-title" className="border-b border-border bg-background px-6 py-4" data-testid="result-summary">
      <h3 id="result-summary-title" className="text-sm font-semibold text-foreground">Sonuç özeti</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {summary.lines.map(line => {
          const tone = TONE[line.tone];
          const Icon = tone.icon;
          return (
            <li key={line.key} className="flex items-start gap-2" data-tone={line.tone}>
              <Icon size={16} className={`mt-0.5 shrink-0 ${tone.className}`} aria-hidden="true" />
              <span className="text-foreground">
                <span className="sr-only">{tone.label}: </span>
                {line.text}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
        <span className="font-semibold text-foreground">Sonraki adım:</span>
        <span className="text-foreground">{text}</span>
        {action === "add_prices" && (
          <Link to="/app/market-intelligence" className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Firma fiyatı ekle
          </Link>
        )}
        {(action === "create_offer" || action === "transfer_to_offer") && (
          <button type="button" onClick={onOpenCostStep} className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Maliyet ve teklif adımına geç
          </button>
        )}
      </div>
    </section>
  );
}
