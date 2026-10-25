import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import { formatQuantity } from "@/ifc/calculation-trace";
import {
  VERIFICATION_STATUSES, VERIFICATION_STATUS_LABEL, VERIFICATION_TOLERANCE_PCT, deviationPct,
  type LineVerification, type VerificationStatus,
} from "@/ifc/expert-verification";

interface ExpertLineVerificationProps {
  item: CalmIcmalItem;
  record: LineVerification | undefined;
  onSave: (record: LineVerification | null, itemId: string) => void;
}

/** "1.234,5" ve "1234,5" Türkçe; yalnız nokta varsa ("12.5") nokta ondalık sayılır. */
export function parseExpertValue(raw: string): number | null {
  const trimmed = raw.trim();
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Seçili satır için uzmanın kararı, kendi değeri ve notu. Her değişiklik anında kaydedilir. */
export function ExpertLineVerification({ item, record, onSave }: ExpertLineVerificationProps) {
  const save = (patch: Partial<LineVerification> & { status?: VerificationStatus }) => {
    const status = patch.status ?? record?.status;
    if (!status) return;
    onSave({
      itemId: item.id,
      status,
      expertValue: patch.expertValue !== undefined ? patch.expertValue : record?.expertValue ?? null,
      note: patch.note !== undefined ? patch.note : record?.note ?? "",
      updatedAt: new Date().toISOString(),
    }, item.id);
  };
  const deviation = record ? deviationPct(item.netQuantity, record.expertValue) : null;
  const outside = deviation !== null && Math.abs(deviation) > VERIFICATION_TOLERANCE_PCT;

  return (
    <fieldset className="mt-5 border-2 border-primary bg-background p-4" data-testid="expert-line-verification">
      <legend className="px-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">Uzman doğrulaması</legend>
      <p className="text-xs text-foreground">
        Sistem değeri: <strong className="font-mono tabular-nums">{formatQuantity(item.netQuantity, 3)} {item.unit}</strong>. Kendi
        hesabınızla karşılaştırıp kararınızı işaretleyin.
      </p>
      <div role="radiogroup" aria-label="Karar" className="mt-3 flex flex-wrap gap-2">
        {VERIFICATION_STATUSES.map((status) => {
          const checked = record?.status === status;
          return (
            <button
              key={status}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => save({ status })}
              className={`h-9 border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              {VERIFICATION_STATUS_LABEL[status]}
            </button>
          );
        })}
        {record && (
          <button type="button" onClick={() => onSave(null, item.id)} className="h-9 px-2 text-xs text-muted-foreground underline">
            Kararı temizle
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-foreground">
          Sizin hesabınız ({item.unit}, isteğe bağlı)
          <input
            inputMode="decimal"
            disabled={!record}
            defaultValue={record?.expertValue === null || record?.expertValue === undefined ? "" : formatQuantity(record.expertValue, 3)}
            key={`${item.id}-${record?.expertValue ?? "none"}`}
            onBlur={(event) => save({ expertValue: parseExpertValue(event.target.value) })}
            className="mt-1 block w-full border border-border bg-card px-2 py-1.5 font-mono text-sm tabular-nums text-foreground disabled:opacity-60"
          />
        </label>
        <div className="text-xs text-foreground" aria-live="polite">
          <span className="block">Sapma</span>
          <span className={`mt-1 block font-mono text-sm font-bold tabular-nums ${outside ? "text-destructive" : "text-foreground"}`}>
            {deviation === null ? "—" : `%${formatQuantity(deviation, 2)}`}
          </span>
          {deviation !== null && (
            <span className="block text-[11px] text-muted-foreground">
              {outside ? `±%${VERIFICATION_TOLERANCE_PCT} toleransın dışında` : `±%${VERIFICATION_TOLERANCE_PCT} tolerans içinde`}
            </span>
          )}
        </div>
      </div>
      <label className="mt-3 block text-xs text-foreground">
        Not (neden, hangi madde / kaynak)
        <textarea
          disabled={!record}
          rows={3}
          maxLength={2000}
          defaultValue={record?.note ?? ""}
          key={`${item.id}-note-${record ? "on" : "off"}`}
          onBlur={(event) => save({ note: event.target.value })}
          className="mt-1 block w-full border border-border bg-card px-2 py-1.5 text-sm text-foreground disabled:opacity-60"
        />
      </label>
      {!record && <p className="mt-2 text-[11px] text-muted-foreground">Değer ve not girmek için önce bir karar seçin.</p>}
    </fieldset>
  );
}
