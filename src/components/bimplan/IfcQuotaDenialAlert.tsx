import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Mail, X } from "lucide-react";
import { requestVerificationEmail, type BrowserQuotaDenial } from "@/ifc/browser-quota";

type ResendState = "idle" | "sending" | "sent" | "failed";
const RESEND_STATUS: Record<Exclude<ResendState, "idle">, string> = {
  sending: "Doğrulama bağlantısı gönderiliyor…",
  sent: "Doğrulama bağlantısı e-posta adresinize gönderildi. Bağlantıya tıkladıktan sonra dosyanızı yeniden seçin.",
  failed: "Bağlantı şu anda gönderilemedi; lütfen birkaç dakika sonra tekrar deneyin.",
};
const actionClass = "inline-flex h-9 items-center gap-2 rounded-lg border border-primary bg-transparent px-4 text-xs font-bold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed";

export interface IfcQuotaDenialAlertProps {
  denial: BrowserQuotaDenial;
  email?: string;
  onDismiss: () => void;
}

export function IfcQuotaDenialAlert({ denial, email, onDismiss }: IfcQuotaDenialAlertProps) {
  const [resend, setResend] = useState<ResendState>("idle");
  const sendVerification = async () => {
    if (!email) { setResend("failed"); return; }
    setResend("sending");
    setResend(await requestVerificationEmail(email) ? "sent" : "failed");
  };

  return (
    <div role="alert" data-denial-code={denial.code} className="relative mt-6 w-full max-w-xl rounded-2xl border-2 border-destructive bg-card p-4 pr-10 text-left">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-bold text-foreground"><span className="sr-only">Uyarı: </span>{denial.title}</p>
          <p className="text-xs leading-relaxed text-foreground">{denial.message}</p>
          {denial.action?.kind === "link" && (
            <Link to={denial.action.to} className={actionClass}>{denial.action.label}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          )}
          {denial.action?.kind === "resend-verification" && (
            <>
              <button type="button" onClick={sendVerification} disabled={resend === "sending" || resend === "sent"} className={actionClass}>
                <Mail aria-hidden="true" className="h-4 w-4" />{resend === "sent" ? "Bağlantı gönderildi" : denial.action.label}
              </button>
              <p aria-live="polite" className="text-xs text-foreground">{resend === "idle" ? "" : RESEND_STATUS[resend]}</p>
            </>
          )}
        </div>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Uyarıyı kapat" className="absolute right-2 top-2 rounded-md p-1.5 text-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
