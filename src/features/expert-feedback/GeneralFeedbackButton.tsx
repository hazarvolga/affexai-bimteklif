import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOptionalAuth } from "@/hooks/useAuth";
import { CalculationFeedback } from "./CalculationFeedback";

const GENERAL_VERDICT_LABELS = {
  correct: "Sorunsuz çalışıyor",
  incorrect: "Hata / yanlış sonuç var",
  unsure: "Öneri / soru",
} as const;

/** Header button that lets a signed-in expert comment on whichever screen is open. */
export function GeneralFeedbackButton() {
  const auth = useOptionalAuth();
  const [open, setOpen] = useState(false);
  // The form itself renders nothing without a real session, so an empty panel must not be offered.
  if (!auth?.user || auth.isDemoMode) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border bg-card hover:bg-muted text-foreground text-xs font-mono font-medium rounded-xs transition-colors"
        title="Bu ekranla ilgili geri bildirim gönderin"
      >
        <MessageSquareText size={14} className="shrink-0" />
        <span className="hidden sm:inline">Geri Bildirim</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto bg-background border-border p-5">
          <SheetHeader className="p-0 pb-3">
            <SheetTitle>Geri bildirim</SheetTitle>
          </SheetHeader>
          <CalculationFeedback
            engineId="general"
            question="Bu ekranla ilgili ne söylemek istersiniz?"
            hint="Gördüğünüz sorunu, eksik bir adımı veya önerinizi kısaca yazın. Açık olan sayfa otomatik eklenir."
            verdictLabels={GENERAL_VERDICT_LABELS}
            askExpectedValue={false}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
