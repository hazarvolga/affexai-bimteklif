import { Download } from "lucide-react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import {
  VERIFICATION_TOLERANCE_PCT, summarizeVerification, verificationReportCsv,
  type LineVerification, type ReviewerIdentity,
} from "@/ifc/expert-verification";
import { downloadTextFile, safeFileStem } from "@/lib/download-text";

interface ExpertVerificationBarProps {
  items: readonly CalmIcmalItem[];
  records: Readonly<Record<string, LineVerification>>;
  reviewer: ReviewerIdentity;
  onReviewerChange: (reviewer: ReviewerIdentity) => void;
  fileName: string;
}

const fieldClass = "mt-1 block w-full border border-border bg-card px-2 py-1.5 text-sm text-foreground";

/** Uzman doğrulama modunun üst şeridi: nasıl çalışır, kimlik, ilerleme ve rapor indirme. */
export function ExpertVerificationBar({ items, records, reviewer, onReviewerChange, fileName }: ExpertVerificationBarProps) {
  const summary = summarizeVerification(items, records);
  const identityComplete = Boolean(reviewer.name.trim() && reviewer.title.trim() && reviewer.registrationNo.trim());

  const download = () => {
    const csv = verificationReportCsv({ items, records, reviewer, fileName, generatedAt: new Date().toLocaleString("tr-TR") });
    downloadTextFile(csv, `${safeFileStem(fileName)}_uzman_dogrulama_raporu.csv`);
  };

  return (
    <section aria-labelledby="expert-mode-heading" className="lg:col-span-12 border-2 border-primary bg-card p-5" data-testid="expert-verification-bar">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="section-index">UZMAN DOĞRULAMA MODU</p>
          <h3 id="expert-mode-heading" className="mt-1 text-lg font-bold text-foreground">Hesapları satır satır doğrulayın</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-foreground">
            <li>Soldaki listeden bir kalem seçin; sağda "Bu sayı nasıl oluştu?" adımlarını ve metraj cetvelini inceleyin.</li>
            <li>Kendi hesabınızla karşılaştırıp "Doğru", "Düzeltme gerekli" veya "Emin değilim" seçin; isterseniz kendi değerinizi ve notunuzu yazın.</li>
            <li>Bitirdiğinizde raporu indirin, imzalayıp bize iletin. Sapma ±%{VERIFICATION_TOLERANCE_PCT} şirket toleransıyla karşılaştırılır (normatif değildir).</li>
          </ol>
        </div>
        <div className="min-w-[220px] border border-border bg-background p-3 text-xs" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">İlerleme</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{summary.reviewed}/{summary.total}</p>
          <p className="text-foreground">{summary.correct} doğru · {summary.corrections} düzeltme · {summary.unsure} emin değil</p>
          <p className={summary.outsideTolerance > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
            {summary.outsideTolerance} satır tolerans dışında
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-foreground">Ad soyad
          <input value={reviewer.name} maxLength={120} onChange={(e) => onReviewerChange({ ...reviewer, name: e.target.value })} className={fieldClass} />
        </label>
        <label className="text-xs text-foreground">Unvan / disiplin
          <input value={reviewer.title} maxLength={120} onChange={(e) => onReviewerChange({ ...reviewer, title: e.target.value })} className={fieldClass} />
        </label>
        <label className="text-xs text-foreground">Oda sicil no
          <input value={reviewer.registrationNo} maxLength={40} onChange={(e) => onReviewerChange({ ...reviewer, registrationNo: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={!identityComplete || summary.reviewed === 0}
          className="inline-flex h-9 items-center gap-2 border border-primary bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> Doğrulama raporunu indir (CSV)
        </button>
        <p className="text-[11px] text-muted-foreground">
          {identityComplete ? "Kayıtlar bu tarayıcıda saklanır; rapor indirilene kadar bize iletilmez." : "Rapor için ad soyad, unvan ve oda sicil numarasını girin."}
        </p>
      </div>
    </section>
  );
}
