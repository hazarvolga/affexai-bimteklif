import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Printer } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { DocBlockView, DocTable } from "./roadmap/DocBlocks";
import { CALC_INTRO, CALC_MODULES, SIGN_OFF_COLUMNS } from "./roadmap/calculation-content";
import { CALC_STATUS_LABEL, type CalcModule } from "./roadmap/doc-types";
import { CALC_REVIEW_META, CALC_REVIEW_EVIDENCE, CALC_REVIEW_CHANGELOG } from "./roadmap/calculation-review";

const STATUS_CLASS: Record<CalcModule["status"], string> = {
  mevzuat: "border-emerald-500/30 text-emerald-300",
  standart: "border-sky-500/30 text-sky-300",
  sirket_politikasi: "border-amber-500/30 text-amber-300",
  sezgisel: "border-orange-500/30 text-orange-300",
  bilgi_amacli: "border-border text-muted-foreground",
};

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>{children}</div>;
}

function ModuleCard({ module, index }: { module: CalcModule; index: number }) {
  const evidence = CALC_REVIEW_EVIDENCE[module.id];
  const moduleRevisions = CALC_REVIEW_CHANGELOG.filter(
    (entry) => entry.affectedModules.includes(module.id) || Boolean(entry.moduleDetails?.[module.id]),
  );
  return (
    <article id={module.id} className="scroll-mt-24 space-y-4 rounded-xl border border-border bg-card p-5 print:break-inside-avoid-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{module.area}</p>
          <h2 className="text-base font-bold text-foreground">{index + 1}. {module.title}</h2>
        </div>
        <Badge variant="outline" className={STATUS_CLASS[module.status]}>Dayanak: {CALC_STATUS_LABEL[module.status]}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-foreground dark:text-muted-foreground">{module.purpose}</p>
      <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs">
        <p className="font-semibold text-amber-200">{CALC_REVIEW_META.approvalStatus}</p>
        <p className="text-foreground dark:text-muted-foreground"><strong>Uygulama kapsamı:</strong> {evidence.scope}</p>
        <p className="text-muted-foreground"><strong>Açık kabul ölçütü:</strong> {evidence.pending}</p>
        <p className="break-all font-mono text-[11px] text-muted-foreground">İnceleme kimliği: {CALC_REVIEW_META.version}/{module.id}</p>
      </div>
      {moduleRevisions.length > 0 && (
        <Field title={`Modülün Kronolojik Revizyon Geçmişi (${moduleRevisions[0].revision} → ${moduleRevisions[moduleRevisions.length - 1].revision})`}>
          <DocTable
            columns={["Revizyon & Tarih", "Dayanak / Tetikleyen", "Önceki Durum (Nasıldı?)", "Yeni Durum (Nasıl Değiştirildi?)"]}
            rows={moduleRevisions.map((entry) => {
              const detail = entry.moduleDetails?.[module.id];
              return [
                `${entry.revision} · ${entry.version}\n(${entry.date} · ${entry.commit.slice(0, 7)})`,
                detail?.basis ?? entry.trigger,
                detail?.before ?? entry.beforeSummary,
                detail?.after ?? entry.afterSummary,
              ];
            })}
          />
        </Field>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field title="Kaynak kod"><ul className="space-y-0.5 break-all font-mono text-[11px] text-muted-foreground">{module.sourceFiles.map(file => <li key={file}>{file}</li>)}</ul></Field>
        <Field title="Referanslar"><ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{module.references.map(reference => <li key={reference}>{reference}</li>)}</ul></Field>
      </div>
      <Field title="İncelenecek otomatik test kanıtı">
        <ul className="space-y-0.5 break-all font-mono text-[11px] text-muted-foreground">{evidence.testFiles.map(file => <li key={file}>{file}</li>)}</ul>
        <p className="text-xs text-muted-foreground">Bu liste test kapsamına yönlendirir; güncel koşu sonucu ve gerçek proje kabulü ayrıca inceleme kaydına eklenir.</p>
      </Field>
      {module.formulas.length > 0 && <Field title="Formüller ve yöntem"><DocBlockView block={{ type: "formula", lines: module.formulas }} /></Field>}
      {module.rules && <Field title="Kurallar ve eşikler"><DocTable columns={module.rules.columns} rows={module.rules.rows} /></Field>}
      <Field title="Örnek (yeniden hesaplayın)">
        <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-xs">
          <dl className="grid gap-1 sm:grid-cols-[180px_1fr]">{module.example.inputs.map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="text-foreground dark:text-muted-foreground">{value}</dd></div>)}</dl>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">{module.example.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <p className="font-semibold text-emerald-300">Sonuç: {module.example.result}</p>
        </div>
      </Field>
      {module.assumptions.length > 0 && <Field title="Varsayımlar ve sınırlar"><ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">{module.assumptions.map(item => <li key={item}>{item}</li>)}</ul></Field>}
      {module.questions.length > 0 && <Field title="Uzman doğrulama soruları"><ol className="list-decimal space-y-1 pl-4 text-xs text-amber-200">{module.questions.map(question => <li key={question}>{question}</li>)}</ol></Field>}
    </article>
  );
}

export function CalculationMethods() {
  const latestRevision = CALC_REVIEW_CHANGELOG[CALC_REVIEW_CHANGELOG.length - 1]?.revision ?? "Güncel";
  return (
    <PageContainer>
      <div className="print-doc">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/admin/roadmap" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground print:hidden"><ArrowLeft size={14} />Geliştirici Yol Haritası</Link>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground"><Calculator className="text-indigo-400" size={26} />Hesaplama Yöntemleri</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">BIMMetraj modüllerinin formülleri, eşikleri, kaynakları ve örnekleri — yetkili mimar ve mühendislerin bağımsız doğrulaması için. Güncelleme: {CALC_REVIEW_META.updatedOn}.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()} className="border-border bg-card text-xs text-foreground print:hidden"><Printer size={15} className="mr-2" />Yazdır / PDF</Button>
      </header>
      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold text-foreground">Nasıl doğrulanır</h2>
          <dl className="space-y-1 break-words text-xs text-muted-foreground">
            <div><dt className="inline font-semibold text-foreground dark:text-muted-foreground">Belge sürümü: </dt><dd className="inline">{CALC_REVIEW_META.version}</dd></div>
            <div><dt className="inline font-semibold text-foreground dark:text-muted-foreground">Yöntemlerin incelendiği kod revizyonu: </dt><dd className="inline break-all font-mono">{CALC_REVIEW_META.implementationBaseline}</dd></div>
          </dl>
          {CALC_INTRO.map((block, index) => <DocBlockView key={index} block={block} />)}
        </section>
        <section className="space-y-3 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">Kronolojik Sürüm ve Mevzuat Revizyon Tarihçesi (Rev. 1 → {latestRevision} · Önceki Durum → Yeni Durum)</h2>
            <Badge variant="outline" className="border-indigo-400/30 text-indigo-300">Güncel: {CALC_REVIEW_META.version}</Badge>
          </div>
          <p className="text-xs leading-relaxed text-foreground dark:text-muted-foreground">
            Uzman mühendislerin geliştirme sürecini başından bugüne kronolojik sırayla (`Rev. 1 → ... → {latestRevision}`) takip edebilmesi için her revizyonda neyin, ne zaman, hangi mevzuat veya teknik dayanakla nasıl değiştirildiği aşağıda listelenmiştir. Ayrıca her modül kartının kendi içinde o modüle ait kronolojik revizyon geçmişi yer alır.
          </p>
          <DocTable
            columns={[
              "Revizyon & Tarih",
              "Tetikleyen Mevzuat / Geliştirme",
              "Önceki Durum (Nasıldı?)",
              "Yeni Durum (Nasıl Değiştirildi?)",
              "Etkilenen Modüller",
            ]}
            rows={CALC_REVIEW_CHANGELOG.map((entry) => [
              `${entry.revision} · ${entry.version}\n(${entry.date} · ${entry.commit.slice(0, 7)})`,
              entry.trigger,
              entry.beforeSummary,
              entry.afterSummary,
              entry.affectedModules.join(", "),
            ])}
          />
        </section>
        <nav aria-label="Modüller" className="rounded-xl border border-border bg-card p-4 print:hidden">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Modüller</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">{CALC_MODULES.map((module, index) => <li key={module.id}><a href={`#${module.id}`} className="text-foreground dark:text-muted-foreground hover:text-indigo-300">{index + 1}. {module.title}</a></li>)}</ol>
        </nav>
        {CALC_MODULES.map((module, index) => <ModuleCard key={module.id} module={module} index={index} />)}
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 print:break-inside-avoid-page">
          <h2 className="text-base font-bold text-foreground">Uzman onay tablosu</h2>
          <p className="text-xs text-muted-foreground">Bu sayfa elektronik onay kaydetmez. PDF çıktısı üzerinde her modül için karar, kapsam, dayanak ve imza tamamlanır; imzalı dosya belge sürümüyle birlikte saklanır. Boş satır onay sayılmaz.</p>
          <p className="text-xs text-muted-foreground">İnceleme sürümü: {CALC_REVIEW_META.version}. Yöntem veya girdi kapsamı değişirse önceki onay yeni sürüme taşınmaz; yeniden inceleme gerekir.</p>
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-foreground dark:text-muted-foreground">
            <label className="space-y-1">
              <span className="text-muted-foreground">Proje / dosya kimliği ve SHA-256:</span>
              <input
                type="text"
                aria-label="Proje / dosya kimliği ve SHA-256"
                placeholder="Örn: PRJ-2026-01 · sha256:..."
                className="w-full rounded border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Test koşusu / bağımsız hesap eki ve Disiplin (STR/ARC/MEP):</span>
              <input
                type="text"
                aria-label="Test koşusu / bağımsız hesap eki ve Disiplin (STR/ARC/MEP)"
                placeholder="Örn: STR · İMO Sicil No / Hesap Eki Referansı"
                className="w-full rounded border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
              />
            </label>
          </div>
          <DocTable columns={SIGN_OFF_COLUMNS} rows={CALC_MODULES.map((module, index) => [`${index + 1}. ${module.title}\n${module.id}`, "", "", "", ""])} />
        </section>
      </div>
      </div>
    </PageContainer>
  );
}
