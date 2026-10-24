import React, { useMemo, useState } from "react";
import { evaluateContractorGroups, type ContractorInput } from "@/lib/yambis-classification";
import { CalcField, CalculatorShell, calcInputClass, fmtNum, fmtTry } from "./CalculatorShell";

/**
 * Yetki belgesi grubu ön değerlendirmesi. Hiçbir değer varsayılmaz; yapı sınır bedeli her yıl Bakanlıkça yayımlanan
 * III. ve IV. sınıf birim maliyetlerinden hesaplanır ve kullanıcıdan alınır. Sayfa, kaynak ve uzman doğrulaması
 * tamamlanana kadar yayında değildir (rota, sitemap ve llms.txt dışında).
 */
type FormKey =
  | "evaluationDate" | "yapiSinirBedeli" | "isDeneyimi" | "usta" | "teknik" | "ciro" | "bankaReferans"
  | "donen" | "kisaBorc" | "ozkaynak" | "aktif" | "bankaBorcu";

const FIELDS: { key: FormKey; label: string; hint?: string; aria: string }[] = [
  { key: "evaluationDate", label: "Başvuru / değerlendirme tarihi", hint: "Geçici iş gücü hükmünün hangi tarih rejiminde olduğunu belirler; varsayılmaz.", aria: "Başvuru veya değerlendirme tarihi" },
  { key: "yapiSinirBedeli", label: "Yapı sınır bedeli (₺)", hint: "Bakanlıkça her yıl yayımlanan III. ve IV. sınıf yapı birim maliyetleri ortalamasının 45.000 katı", aria: "Yapı sınır bedeli" },
  { key: "isDeneyimi", label: "İş deneyim tutarı (₺)", hint: "Yönetmelik m.13 esaslarına göre belirlenmiş tutar", aria: "İş deneyim tutarı" },
  { key: "usta", label: "Yıllık usta iş gücü (kişi)", aria: "Yıllık usta iş gücü" },
  { key: "teknik", label: "Teknik personel iş gücü (kişi)", aria: "Teknik personel iş gücü" },
  { key: "ciro", label: "Önceki yıl cirosu (₺)", hint: "Toplam ciro veya Yönetmelik kapsamındaki işlere ait ciro", aria: "Önceki yıl cirosu" },
  { key: "bankaReferans", label: "Kullanılmamış kredi / kısıtsız mevduat (₺)", hint: "Boş bırakılırsa G/G1 dahil kesin grup üretilmez; olası grup ayrıca gösterilir.", aria: "Kullanılmamış kredi veya mevduat" },
  { key: "donen", label: "Dönen varlıklar (₺)", aria: "Dönen varlıklar" },
  { key: "kisaBorc", label: "Kısa vadeli borçlar (₺)", aria: "Kısa vadeli borçlar" },
  { key: "ozkaynak", label: "Öz kaynaklar (₺)", aria: "Öz kaynaklar" },
  { key: "aktif", label: "Toplam aktif (₺)", aria: "Toplam aktif" },
  { key: "bankaBorcu", label: "Kısa vadeli banka borçları (₺)", aria: "Kısa vadeli banka borçları" },
];

const EMPTY: Record<FormKey, string> = {
  evaluationDate: "", yapiSinirBedeli: "", isDeneyimi: "", usta: "", teknik: "", ciro: "", bankaReferans: "",
  donen: "", kisaBorc: "", ozkaynak: "", aktif: "", bankaBorcu: "",
};

const parse = (value: string): number | null => {
  const text = value.trim();
  if (!text) return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const STATUS_LABEL = { ok: "Sağlanıyor", fail: "Sağlanmıyor", not_evaluated: "Değerlendirilmedi", not_required: "Geçici hükümle aranmıyor" } as const;

export const YambisCalculatorPage: React.FC = () => {
  const [form, setForm] = useState<Record<FormKey, string>>(EMPTY);

  const outcome = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.evaluationDate)) {
      return { error: "Başvuru / değerlendirme tarihini YYYY-AA-GG biçiminde girin. Tarih rejimi varsayılmaz." as string };
    }
    const required: FormKey[] = ["yapiSinirBedeli", "isDeneyimi", "usta", "teknik", "ciro", "donen", "kisaBorc", "ozkaynak", "aktif", "bankaBorcu"];
    const missing = required.filter(key => parse(form[key]) === null);
    if (missing.length) return { error: "Hesap için zorunlu alanları doldurun (banka referansı hariç). Hiçbir değer varsayılmaz." as string };
    const n = (key: FormKey) => parse(form[key]) as number;
    const input: ContractorInput = {
      evaluationDate: form.evaluationDate,
      yapiSinirBedeliTry: n("yapiSinirBedeli"), isDeneyimTutariTry: n("isDeneyimi"),
      yillikUstaIsGucu: n("usta"), teknikPersonelIsGucu: n("teknik"), cirosuTry: n("ciro"),
      bankaKrediVeyaMevduatTry: parse(form.bankaReferans) ?? undefined,
      mali: { donenVarliklarTry: n("donen"), kisaVadeliBorclarTry: n("kisaBorc"), ozKaynaklarTry: n("ozkaynak"), toplamAktifTry: n("aktif"), kisaVadeliBankaBorclariTry: n("bankaBorcu") },
    };
    try { return { result: evaluateContractorGroups(input) }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Hesaplanamadı." }; }
  }, [form]);

  return (
    <CalculatorShell
      title="Müteahhitlik Yetki Belgesi Grubu Ön Değerlendirmesi | BIMMetraj"
      description="Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği'ndeki grup koşullarını (iş deneyimi, iş gücü, bilanço oranları, ciro) kendi verilerinizle karşılaştırın. Bilgilendirme amaçlıdır."
      canonicalPath="/hesaplayicilar/yambis-muteahhitlik-grubu"
      heading="Müteahhitlik Yetki Belgesi Grubu Ön Değerlendirmesi"
      intro="Değerleri yönetmelik tanımlarına göre siz girersiniz; hiçbir değer varsayılmaz. Sonuç Bakanlığın başvuru incelemesinin yerini tutmaz."
      sources={[
        { label: "Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik (konsolide; m.4, m.11, m.12, m.13, m.14)" },
        { label: "Geçici m.1(2) iş gücü hükmü ve 31/12/2026 dahil sınırı: https://osmaniye.csb.gov.tr/yeterlilik-sistemi-i-100536" },
        { label: "Bakanlık 2026 Yapı Yaklaşık Birim Maliyetleri Tebliği (III. ve IV. sınıf; yapı sınır bedeli hesabı)" },
      ]}
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 border border-border bg-background p-5 lg:col-span-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Girdiler</h2>
          {FIELDS.map(field => (
            <CalcField key={field.key} label={field.label} hint={field.hint}>
              <input
                className={calcInputClass}
                inputMode={field.key === "evaluationDate" ? undefined : "decimal"}
                type={field.key === "evaluationDate" ? "date" : "text"}
                aria-label={field.aria}
                value={form[field.key]}
                onChange={event => setForm(prev => ({ ...prev, [field.key]: event.target.value }))}
              />
            </CalcField>
          ))}
        </div>

        <div className="space-y-4 border border-border bg-card p-5 lg:col-span-7" aria-live="polite">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">Sonuç</h2>
          {"error" in outcome ? (
            <p className="text-sm text-muted-foreground">{outcome.error}</p>
          ) : (
            <>
              <p className="text-sm text-foreground">
                Girdilerle doğrulanan en üst grup: <strong className="font-mono">{outcome.result.highestConfirmedGroup ?? "Belirlenemedi"}</strong>
              </p>
              {outcome.result.highestPotentialGroup !== outcome.result.highestConfirmedGroup && (
                <p className="border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-foreground">
                  Eksik kanıt tamamlanırsa olası en üst grup: <strong className="font-mono">{outcome.result.highestPotentialGroup ?? "—"}</strong>. Bu değer kesin uygunluk değildir.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                İş gücü rejimi: {outcome.result.workforceRule === "temporarily_not_required"
                  ? "Geçici m.1(2) uyarınca 31/12/2026 dahil aranmaz; son altı yıla kadar değerlerin beyanı sürer."
                  : "İş gücü yeterliği uygulanır."}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt>Cari oran</dt><dd className="text-right font-mono">{outcome.result.ratios.cariOran === null ? "—" : fmtNum(outcome.result.ratios.cariOran, 2)}</dd>
                <dt>Öz kaynak oranı</dt><dd className="text-right font-mono">{outcome.result.ratios.ozKaynakOrani === null ? "—" : fmtNum(outcome.result.ratios.ozKaynakOrani, 2)}</dd>
                <dt>Banka borcu / öz kaynak</dt><dd className="text-right font-mono">{outcome.result.ratios.bankaBorcuOzKaynakOrani === null ? "—" : fmtNum(outcome.result.ratios.bankaBorcuOzKaynakOrani, 2)}</dd>
              </dl>
              <table className="w-full border-collapse text-xs">
                <caption className="sr-only">Gruplara göre asgari iş deneyim tutarı, azami iş tutarı ve uygunluk</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-1 pr-2">Grup</th><th className="py-1 pr-2 text-right">Asgari iş deneyimi</th><th className="py-1 pr-2 text-right">Azami iş</th><th className="py-1">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {outcome.result.groups.map(group => {
                    const failed = group.criteria.filter(c => c.status === "fail").map(c => c.id).join(", ");
                    const missing = group.criteria.filter(c => c.status === "not_evaluated").map(c => c.id).join(", ");
                    return (
                      <tr key={group.group} className="border-b border-border/60 align-top">
                        <td className="py-1 pr-2 font-mono">{group.group}</td>
                        <td className="py-1 pr-2 text-right font-mono">{group.minExperienceTry === null ? "—" : fmtTry(group.minExperienceTry)}</td>
                        <td className="py-1 pr-2 text-right font-mono">{group.maxJobTry === "unlimited" ? "Sınırsız" : fmtTry(group.maxJobTry)}</td>
                        <td className="py-1">{group.eligible
                          ? STATUS_LABEL.ok
                          : group.potentiallyEligible
                            ? `${STATUS_LABEL.not_evaluated}: ${missing}`
                            : `${STATUS_LABEL.fail}: ${failed}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {outcome.result.notes.map(note => <li key={note}>{note}</li>)}
              </ul>
            </>
          )}
        </div>
      </section>
    </CalculatorShell>
  );
};
