import React, { useId, useState } from "react";
import { useLocation } from "react-router-dom";
import { useOptionalAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/api";
import type { ExpertFeedbackEngine, ExpertFeedbackVerdict } from "./contract";
import { toFeedbackSnapshot } from "./snapshot";

interface CalculationFeedbackProps {
  engineId: ExpertFeedbackEngine;
  /** Form values; sent only when the user ticks the sharing box. */
  inputs?: object | null;
  /** Headline results; sent only when the user ticks the sharing box. */
  result?: object | null;
  question?: string;
  hint?: string;
  verdictLabels?: Readonly<Record<ExpertFeedbackVerdict, string>>;
  /** Asks for the expert's own figure; off for screens without a single result. */
  askExpectedValue?: boolean;
}

type SubmitState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent"; reference: string; delivered: boolean }
  | { phase: "error"; message: string };

const VERDICT_ORDER: readonly ExpertFeedbackVerdict[] = ["correct", "incorrect", "unsure"];
const CALCULATION_VERDICT_LABELS: Readonly<Record<ExpertFeedbackVerdict, string>> = {
  correct: "Evet, tutuyor",
  incorrect: "Hayır, tutmuyor",
  unsure: "Emin değilim",
};

const GENERIC_ERROR = "Geri bildirim gönderilemedi. Lütfen birazdan tekrar deneyin.";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" && body.error ? body.error : GENERIC_ERROR;
  } catch {
    return GENERIC_ERROR;
  }
}

/**
 * Uzman önizlemesi geri bildirimi: hesap sonucunun uzmanın kendi hesabıyla tutup tutmadığını sorar.
 * Yalnızca oturum açmış kullanıcıya görünür; girdi/sonuç değerleri açık onay olmadan gönderilmez.
 */
export function CalculationFeedback({
  engineId,
  inputs,
  result,
  question = "Bu sonuç sizin hesabınızla tutuyor mu?",
  hint = "Bilinen bir örnekle karşılaştırın; tek tıklama da yeterli.",
  verdictLabels = CALCULATION_VERDICT_LABELS,
  askExpectedValue = true,
}: CalculationFeedbackProps) {
  const auth = useOptionalAuth();
  const location = useLocation();
  const fieldId = useId();
  const [verdict, setVerdict] = useState<ExpertFeedbackVerdict | null>(null);
  const [note, setNote] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [shareSnapshot, setShareSnapshot] = useState(false);
  const [state, setState] = useState<SubmitState>({ phase: "idle" });

  if (!auth?.user || auth.isDemoMode) return null;

  const noteRequired = verdict === "incorrect";
  const canShare = inputs != null || result != null;
  const sharing = canShare && shareSnapshot;
  const canSubmit = verdict !== null && (!noteRequired || note.trim().length > 0) && state.phase !== "sending";

  const reset = () => {
    setVerdict(null);
    setNote("");
    setExpectedValue("");
    setShareSnapshot(false);
    setState({ phase: "idle" });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || verdict === null) return;
    setState({ phase: "sending" });
    const payload = {
      engineId,
      verdict,
      note,
      expectedValue,
      pagePath: location.pathname,
      shareSnapshot: sharing,
      ...(sharing ? { inputs: toFeedbackSnapshot(inputs), result: toFeedbackSnapshot(result) } : {}),
    };
    try {
      const response = await fetchWithAuth("/api/expert-feedback", { method: "POST", body: JSON.stringify(payload) });
      if (!response.ok) return setState({ phase: "error", message: await readError(response) });
      const receipt = (await response.json()) as { reference?: unknown; status?: unknown };
      setState({ phase: "sent", reference: typeof receipt.reference === "string" ? receipt.reference : "", delivered: receipt.status === "accepted" });
    } catch {
      setState({ phase: "error", message: GENERIC_ERROR });
    }
  };

  if (state.phase === "sent") {
    return (
      <section aria-label="Uzman geri bildirimi" className="border border-primary/40 bg-primary/5 p-5 text-sm" data-testid="expert-feedback">
        <p className="font-semibold text-foreground">{state.delivered ? "Teşekkürler, geri bildiriminiz iletildi." : "Geri bildirim alındı ancak bu ortamda e-posta gönderilmedi (geliştirme modu)."}</p>
        {state.reference && <p className="mt-1 font-mono text-xs text-muted-foreground">Referans: {state.reference}</p>}
        <button type="button" onClick={reset} className="mt-3 text-xs font-semibold text-primary hover:underline">
          Başka bir geri bildirim gönder
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} aria-label="Uzman geri bildirimi" className="space-y-4 border border-border bg-card p-5 text-sm" data-testid="expert-feedback">
      <div>
        <span className="section-index">UZMAN GERİ BİLDİRİMİ</span>
        <p id={`${fieldId}-question`} className="mt-1 font-semibold text-foreground">{question}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>

      <div role="group" aria-labelledby={`${fieldId}-question`} className="flex flex-wrap gap-2">
        {VERDICT_ORDER.map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={verdict === value}
            onClick={() => setVerdict(value)}
            className={`border px-3 py-1.5 text-xs font-semibold ${verdict === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary"}`}
          >
            {verdictLabels[value]}
          </button>
        ))}
      </div>

      {verdict !== null && (
        <>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {noteRequired ? "Neresi farklı? (zorunlu)" : "Not (isteğe bağlı)"}
            </span>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              maxLength={2000}
              rows={3}
              required={noteRequired}
              className="w-full border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              placeholder={noteRequired ? "örn. hangi değer farklı, ne olmalıydı ve hangi dayanakla" : ""}
            />
          </label>
          {askExpectedValue && (
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sizin bulduğunuz değer (isteğe bağlı)</span>
              <input
                value={expectedValue}
                onChange={event => setExpectedValue(event.target.value.replace(/[\r\n]+/g, " "))}
                maxLength={200}
                className="w-full border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
          )}
          {canShare && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={shareSnapshot} onChange={event => setShareSnapshot(event.target.checked)} className="mt-0.5" />
              <span>
                Girdiğim değerleri ve sonucu da gönder. Hatayı aynı değerlerle tekrar üretebilmemiz için önerilir; işaretlemezseniz yalnızca
                değerlendirmeniz ve notunuz gönderilir.
              </span>
            </label>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.phase === "sending" ? "Gönderiliyor…" : "Geri bildirimi gönder"}
            </button>
            {state.phase === "error" && <p role="alert" className="text-xs text-destructive">{state.message}</p>}
          </div>
        </>
      )}
    </form>
  );
}
