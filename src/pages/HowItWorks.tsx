/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Calculator, Mail } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DocTable } from "./admin/roadmap/DocBlocks";
import { CALC_INTRO } from "./admin/roadmap/calculation-content";
import { CALC_STATUS_LABEL, type CalcModule, type CalcStatus } from "./admin/roadmap/doc-types";
import { EXPERT_MODULES, FEEDBACK_EMAIL, feedbackHref, tryRouteFor } from "./how-it-works/how-it-works-data";

const WORKFLOW: { title: string; text: string; to: string }[] = [
  { title: "1. Dosyayı yükleyin", text: "IFC modeli, Excel/CSV metraj cetveli veya PDF paftaları SmartCheck'e yüklenir; sunucu analizi elemanları, miktarları ve kanıt satırlarını okur.", to: "/app/smartcheck" },
  { title: "2. Kontrol ve icmal", text: "e-PYS ön kontrolü, 3x3 kuralları ve minha uygulanır; elemanlar malzemesine göre icmal kalemlerine yerleşir, yerleşemeyenler gerekçesiyle açıkta kalır.", to: "/app/smartcheck" },
  { title: "3. Teklife aktarın", text: "İncelenen icmal kalemleri kaynak satırlarıyla teklife aktarılır; birim fiyat yalnız yetkili fiyat kaynağından gelir, tahmin edilmez.", to: "/app/quotes/new" },
  { title: "4. Maliyet ve kârlılık", text: "Teklif toplamları, KDV, gerçek maliyet ve marj aynı fonksiyonlarla hesaplanır; risk primleri şirket politikası olarak ayrı gösterilir.", to: "/app/profitability" },
];

const STATUS_CLASS: Record<CalcStatus, string> = {
  mevzuat: "border-primary text-primary",
  standart: "border-primary text-primary",
  sirket_politikasi: "border-border text-foreground",
  sezgisel: "border-border text-foreground",
  bilgi_amacli: "border-border text-muted-foreground",
};

const GENERAL_RULES = CALC_INTRO.find((block) => block.type === "table");

function groupByArea(modules: CalcModule[]): [string, CalcModule[]][] {
  const groups = new Map<string, CalcModule[]>();
  for (const module of modules) groups.set(module.area, [...(groups.get(module.area) ?? []), module]);
  return Array.from(groups.entries());
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

const actionClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-4 text-xs font-bold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function ModuleDetails({ module }: { module: CalcModule }) {
  const tryRoute = tryRouteFor(module.id);
  return (
    <details id={module.id} className="group scroll-mt-24 rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{module.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{module.purpose}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[module.status]}`}>
          Dayanak: {CALC_STATUS_LABEL[module.status]}
        </span>
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        {module.formulas.length > 0 && (
          <Field title="Formüller">
            <ul className="space-y-1 font-mono text-xs leading-relaxed text-foreground">{module.formulas.map((formula) => <li key={formula}>{formula}</li>)}</ul>
          </Field>
        )}
        {module.rules && <Field title="Kurallar ve eşikler"><DocTable columns={module.rules.columns} rows={module.rules.rows} /></Field>}
        <Field title="Örnek hesap">
          <DocTable columns={["Girdi", "Değer"]} rows={module.example.inputs.map(([name, value]) => [name, value])} />
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-foreground">{module.example.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="mt-2 text-sm font-semibold text-foreground">Sonuç: {module.example.result}</p>
        </Field>
        {module.references.length > 0 && <Field title="Dayandığı kaynaklar"><BulletList items={module.references} /></Field>}
        {module.assumptions.length > 0 && <Field title="Varsayımlar ve sınırlar"><BulletList items={module.assumptions} /></Field>}
        {module.questions.length > 0 && <Field title="Görüşünüzü sorduğumuz konular"><BulletList items={module.questions} /></Field>}
        <div className="flex flex-wrap gap-2 pt-1">
          {tryRoute && (
            <Link to={tryRoute} className={actionClass}>
              Uygulamada dene
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
          <a href={feedbackHref(module)} className={actionClass}>
            <Mail aria-hidden="true" className="h-4 w-4" />
            Bu modül için geri bildirim gönder
          </a>
        </div>
      </div>
    </details>
  );
}

export function HowItWorks() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Calculator aria-hidden="true" className="h-4 w-4" /> Nasıl çalışır
          </p>
          <h1 className="text-2xl font-bold text-foreground">BIMMetraj nasıl çalışır, hesaplar nasıl yapılır?</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground">
            Bu sayfa her hesap ve kontrol modülünün ne yaptığını, hangi formül ve eşiği kullandığını, hangi kaynağa dayandığını ve
            örnek bir hesabı gösterir. Örneklerdeki sonuçlar uygulamanın kendi fonksiyonlarıyla üretilmiştir; kendi hesabınızla
            karşılaştırabilirsiniz. Uygulama çıktıları ön hesaptır, teknik inceleme gerektirir ve resmî uygunluk kararı yerine geçmez.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Görüş ve itirazlarınızı her modülün altındaki bağlantıyla ya da <a className="font-semibold text-primary underline" href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a> adresine iletebilirsiniz.
          </p>
        </header>

        <section aria-labelledby="workflow-heading" className="space-y-3">
          <h2 id="workflow-heading" className="text-lg font-bold text-foreground">İş akışı</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {WORKFLOW.map((step) => (
              <Link key={step.title} to={step.to} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <p className="text-sm font-bold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="basis-heading" className="space-y-3">
          <h2 id="basis-heading" className="text-lg font-bold text-foreground">Dayanak etiketleri ve genel kurallar</h2>
          <DocTable
            columns={["Etiket", "Anlamı"]}
            rows={[
              [CALC_STATUS_LABEL.mevzuat, "Yöntem bir kanun, yönetmelik veya tebliğ maddesine dayanır."],
              [CALC_STATUS_LABEL.standart, "Yöntem bir teknik standarda (TS, EN, ISO) dayanır."],
              [CALC_STATUS_LABEL.sirket_politikasi, "Eşik şirket politikasıdır, normatif değildir; mesleki deneyiminize göre değerlendirin."],
              [CALC_STATUS_LABEL.sezgisel, "İş kuralı veya sezgisel yöntemdir; normatif değildir."],
              [CALC_STATUS_LABEL.bilgi_amacli, "Bilgi amaçlı veya pilot düzeyindedir."],
            ]}
          />
          {GENERAL_RULES?.type === "table" && <DocTable columns={GENERAL_RULES.columns} rows={GENERAL_RULES.rows} />}
        </section>

        <section aria-labelledby="modules-heading" className="space-y-6">
          <h2 id="modules-heading" className="text-lg font-bold text-foreground">Hesap ve kontrol modülleri</h2>
          {groupByArea(EXPERT_MODULES).map(([area, modules]) => (
            <div key={area} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{area}</h3>
              {modules.map((module) => <ModuleDetails key={module.id} module={module} />)}
            </div>
          ))}
        </section>
      </div>
    </PageContainer>
  );
}
