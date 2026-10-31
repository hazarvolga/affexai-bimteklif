import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { pdfaNextStep } from "./pdfa-guidance";

type PdfReport = {
  schemaVersion?: 1 | 2;
  file: { fileName: string; pageCount: number };
  pdfa: { claimed: { part: string; conformance: string } | null; note: string };
  eSignature?:
    | { present: boolean; note: string }
    | {
        signatureFieldPresent: boolean;
        fieldStatus: "absent" | "empty" | "signed" | "malformed" | "indeterminate";
        signedValueCount: number;
        emptyFieldCount: number;
        malformedFieldCount: number;
        scanComplete: boolean;
        pagesScanned: number;
        pagesTotal: number;
        objectsScanned: number;
        verification: Record<"cryptographic" | "trust" | "revocation" | "timestamp", { status: "not_checked" | "indeterminate"; note: string }>;
        note: string;
      };
  summary: { hata: number; uyari: number; elle: number };
  findings: Array<{ kod: string; seviye: string; mesaj: string; madde: string; sayfalar?: number[] }>;
  disclaimer: string;
};

type PdfaValidation = {
  status: "completed" | "unavailable";
  tool: { name: "veraPDF"; version: string | null; status: "available" | "unavailable" };
  profile: { code: string; name: string | null };
  source: { fileName: string; checksumSha256: string; preserved: true };
  validation: { isCompliant: boolean | null; scanComplete: boolean; failedRules: number | null; failedChecks: number | null };
  conversion: { status: "disabled_requires_licensed_provider"; outputCreated: false; sourceOverwritten: false };
  unavailableReason: "not_configured" | "executable_unavailable" | "version_unavailable" | null;
};

function signatureSummary(signature: PdfReport["eSignature"]): string {
  if (!signature) return "e-imza verisi yok";
  if ("present" in signature) {
    return `Eski rapor: /Sig ${signature.present ? "tespit edildi" : "tespit edilmedi"}; imza durumu ve geçerliliği belirsiz`;
  }
  const labels: Record<typeof signature.fieldStatus, string> = {
    absent: "İmza alanı tespit edilmedi",
    empty: "Boş imza alanı tespit edildi",
    signed: "Yapısal imza değeri tespit edildi (geçerlilik kontrol edilmedi)",
    malformed: "Bozuk imza alanı tespit edildi",
    indeterminate: "İmza alanı sonucu belirsiz",
  };
  return `${labels[signature.fieldStatus]} · tarama ${signature.pagesScanned}/${signature.pagesTotal} sayfa${signature.scanComplete ? " tamamlandı" : " tamamlanamadı"}`;
}

export function PdfPreflightPanel({ documentId, refreshKey }: { documentId: string; refreshKey: number }) {
  const [report, setReport] = useState<PdfReport | null>(null);
  const [validation, setValidation] = useState<PdfaValidation | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setValidation(null);
    setValidationError(false);
    setError(false);
    fetchWithAuth(`/api/smartcheck/documents/${documentId}/pdf-preflight`)
      .then(async response => {
        if (!response.ok) throw new Error("PDF_PREFLIGHT_UNAVAILABLE");
        const body = await response.json() as PdfReport;
        if (!cancelled) setReport(body);
      }).catch(() => { if (!cancelled) setError(true); });
    fetchWithAuth(`/api/smartcheck/documents/${documentId}/pdfa-validation`)
      .then(async response => {
        if (!response.ok) throw new Error("PDFA_VALIDATION_UNAVAILABLE");
        const body = await response.json() as PdfaValidation;
        if (!cancelled) setValidation(body);
      }).catch(() => { if (!cancelled) setValidationError(true); });
    return () => { cancelled = true; };
  }, [documentId, refreshKey]);

  if (error) return <p className="p-4 text-xs text-amber-400">PDF/A ön kontrolü okunamadı. İşleme tamamlandıktan sonra yeniden açın.</p>;
  if (!report) return <p className="p-4 text-xs text-muted-foreground">PDF/A ön kontrolü yükleniyor…</p>;
  return <section className="space-y-3 border-t border-border p-4 text-xs" aria-label="PDF yapısal ön kontrolü ve PDF/A doğrulaması">
    <h3 className="font-bold text-foreground">PDF Yapısal, Pafta Düzeni ve e-İmza Ön Kontrolü · {report.file.pageCount} sayfa</h3>
    <p className="text-muted-foreground">{report.summary.hata} hata · {report.summary.uyari} uyarı · {report.summary.elle} elle kontrol</p>
    <p className="text-muted-foreground">
      {report.pdfa.claimed ? `PDF/A-${report.pdfa.claimed.part}${report.pdfa.claimed.conformance} kimlik beyanı` : "PDF/A kimlik beyanı yok"}
      {report.eSignature ? ` · ${signatureSummary(report.eSignature)}` : ""}
    </p>
    {report.eSignature && !("present" in report.eSignature) && <div className="rounded-md border border-border p-3 text-muted-foreground">
      <p className="font-medium text-foreground">e-İmza doğrulama kapsamı</p>
      <p className="mt-1">Kriptografik: {report.eSignature.verification.cryptographic.status} · Güven zinciri: {report.eSignature.verification.trust.status} · İptal: {report.eSignature.verification.revocation.status} · Zaman damgası: {report.eSignature.verification.timestamp.status}</p>
    </div>}
    <div className="rounded-md border border-border p-3 text-muted-foreground">
      <p className="font-medium text-foreground">PDF/A standart doğrulaması</p>
      {validation ? <>
        <p className="mt-1">
          {validation.status === "completed"
            ? `${validation.profile.code.toUpperCase()} · ${validation.validation.isCompliant ? "uyumlu" : "uyumsuz"} · veraPDF ${validation.tool.version ?? "sürüm bilinmiyor"}`
            : `Çalıştırılmadı (${validation.unavailableReason ?? "doğrulayıcı kullanılamıyor"}); uygunluk sonucu belirsiz.`}
        </p>
        <p className="mt-1">Kaynak SHA-256: <span className="font-mono">{validation.source.checksumSha256}</span> · orijinal korundu</p>
        <p className="mt-1">{pdfaNextStep(validation.status, validation.validation.isCompliant)}</p>
      </> : <p className="mt-1">{validationError ? "Bu işleme için ayrı PDF/A doğrulama artifactı bulunamadı." : "Doğrulama sonucu yükleniyor…"}</p>}
    </div>
    <ul className="space-y-2">{report.findings.map((finding, index) => <li key={`${finding.kod}-${index}`} className="rounded-md border border-border p-3 text-muted-foreground"><b className={finding.seviye === "hata" ? "text-red-400" : "text-foreground dark:text-muted-foreground"}>{finding.seviye.toUpperCase()} · {finding.kod}</b><p className="mt-1">{finding.mesaj}</p><p className="mt-1 text-muted-foreground">{finding.madde}{finding.sayfalar?.length ? ` · sayfalar: ${finding.sayfalar.join(", ")}` : ""}</p></li>)}</ul>
    <p className="text-muted-foreground">{report.disclaimer} {report.pdfa.note}{report.eSignature ? ` ${report.eSignature.note}` : ""}</p>
  </section>;
}
