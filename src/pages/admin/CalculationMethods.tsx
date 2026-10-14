import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Printer } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { DocBlockView, DocTable } from "./roadmap/DocBlocks";
import { CALC_INTRO, CALC_MODULES, SIGN_OFF_COLUMNS } from "./roadmap/calculation-content";
import { CALC_STATUS_LABEL, type CalcModule } from "./roadmap/doc-types";
import { CALC_REVIEW_META, CALC_REVIEW_EVIDENCE } from "./roadmap/calculation-review";

const STATUS_CLASS: Record<CalcModule["status"], string> = {
  mevzuat: "border-emerald-500/30 text-emerald-300",
  standart: "border-sky-500/30 text-sky-300",
  sirket_politikasi: "border-amber-500/30 text-amber-300",
  sezgisel: "border-orange-500/30 text-orange-300",
  bilgi_amacli: "border-zinc-600 text-zinc-400",
};

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</p>{children}</div>;
}

function ModuleCard({ module, index }: { module: CalcModule; index: number }) {
  const evidence = CALC_REVIEW_EVIDENCE[module.id];
  return (
    <article id={module.id} className="scroll-mt-24 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 print:break-inside-avoid-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">{module.area}</p>
          <h2 className="text-base font-bold text-white">{index + 1}. {module.title}</h2>
        </div>
        <Badge variant="outline" className={STATUS_CLASS[module.status]}>Dayanak: {CALC_STATUS_LABEL[module.status]}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{module.purpose}</p>
      <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs">
        <p className="font-semibold text-amber-200">{CALC_REVIEW_META.approvalStatus}</p>
        <p className="text-zinc-300"><strong>Uygulama kapsamı:</strong> {evidence.scope}</p>
        <p className="text-zinc-400"><strong>Açık kabul ölçütü:</strong> {evidence.pending}</p>
        <p className="break-all font-mono text-[11px] text-zinc-500">İnceleme kimliği: {CALC_REVIEW_META.version}/{module.id}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field title="Kaynak kod"><ul className="space-y-0.5 break-all font-mono text-[11px] text-zinc-400">{module.sourceFiles.map(file => <li key={file}>{file}</li>)}</ul></Field>
        <Field title="Referanslar"><ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-400">{module.references.map(reference => <li key={reference}>{reference}</li>)}</ul></Field>
      </div>
      <Field title="İncelenecek otomatik test kanıtı">
        <ul className="space-y-0.5 break-all font-mono text-[11px] text-zinc-400">{evidence.testFiles.map(file => <li key={file}>{file}</li>)}</ul>
        <p className="text-xs text-zinc-500">Bu liste test kapsamına yönlendirir; güncel koşu sonucu ve gerçek proje kabulü ayrıca inceleme kaydına eklenir.</p>
      </Field>
      {module.formulas.length > 0 && <Field title="Formüller ve yöntem"><DocBlockView block={{ type: "formula", lines: module.formulas }} /></Field>}
      {module.rules && <Field title="Kurallar ve eşikler"><DocTable columns={module.rules.columns} rows={module.rules.rows} /></Field>}
      <Field title="Örnek (yeniden hesaplayın)">
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs">
          <dl className="grid gap-1 sm:grid-cols-[180px_1fr]">{module.example.inputs.map(([label, value]) => <div key={label} className="contents"><dt className="text-zinc-500">{label}</dt><dd className="text-zinc-300">{value}</dd></div>)}</dl>
          <ol className="list-decimal space-y-1 pl-4 text-zinc-400">{module.example.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <p className="font-semibold text-emerald-300">Sonuç: {module.example.result}</p>
        </div>
      </Field>
      {module.assumptions.length > 0 && <Field title="Varsayımlar ve sınırlar"><ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">{module.assumptions.map(item => <li key={item}>{item}</li>)}</ul></Field>}
      {module.questions.length > 0 && <Field title="Uzman doğrulama soruları"><ol className="list-decimal space-y-1 pl-4 text-xs text-amber-200">{module.questions.map(question => <li key={question}>{question}</li>)}</ol></Field>}
    </article>
  );
}

export function CalculationMethods() {
  return (
    <PageContainer>
      <div className="print-doc">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/admin/roadmap" className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white print:hidden"><ArrowLeft size={14} />Geliştirici Yol Haritası</Link>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white"><Calculator className="text-indigo-400" size={26} />Hesaplama Yöntemleri</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">BIMMetraj modüllerinin formülleri, eşikleri, kaynakları ve örnekleri — yetkili mimar ve mühendislerin bağımsız doğrulaması için. Güncelleme: {CALC_REVIEW_META.updatedOn}.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()} className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200 print:hidden"><Printer size={15} className="mr-2" />Yazdır / PDF</Button>
      </header>
      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-base font-bold text-white">Nasıl doğrulanır</h2>
          <dl className="space-y-1 break-words text-xs text-zinc-400">
            <div><dt className="inline font-semibold text-zinc-300">Belge sürümü: </dt><dd className="inline">{CALC_REVIEW_META.version}</dd></div>
            <div><dt className="inline font-semibold text-zinc-300">Yöntemlerin incelendiği kod revizyonu: </dt><dd className="inline break-all font-mono">{CALC_REVIEW_META.implementationBaseline}</dd></div>
          </dl>
          {CALC_INTRO.map((block, index) => <DocBlockView key={index} block={block} />)}
        </section>
        <nav aria-label="Modüller" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 print:hidden">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Modüller</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">{CALC_MODULES.map((module, index) => <li key={module.id}><a href={`#${module.id}`} className="text-zinc-300 hover:text-indigo-300">{index + 1}. {module.title}</a></li>)}</ol>
        </nav>
        {CALC_MODULES.map((module, index) => <ModuleCard key={module.id} module={module} index={index} />)}
        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 print:break-inside-avoid-page">
          <h2 className="text-base font-bold text-white">Uzman onay tablosu</h2>
          <p className="text-xs text-zinc-400">Bu sayfa elektronik onay kaydetmez. PDF çıktısı üzerinde her modül için karar, kapsam, dayanak ve imza tamamlanır; imzalı dosya belge sürümüyle birlikte saklanır. Boş satır onay sayılmaz.</p>
          <p className="text-xs text-zinc-400">İnceleme sürümü: {CALC_REVIEW_META.version}. Yöntem veya girdi kapsamı değişirse önceki onay yeni sürüme taşınmaz; yeniden inceleme gerekir.</p>
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-zinc-300">
            <label className="space-y-1">
              <span className="text-zinc-400">Proje / dosya kimliği ve SHA-256:</span>
              <input
                type="text"
                placeholder="Örn: PRJ-2026-01 · sha256:..."
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-400">Test koşusu / bağımsız hesap eki ve Disiplin (STR/ARC/MEP):</span>
              <input
                type="text"
                placeholder="Örn: STR · İMO Sicil No / Hesap Eki Referansı"
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-200"
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
