import React from "react";
import { Link } from "react-router-dom";
import { PublicMetadata } from "@/components/PublicMetadata";

export interface CalculatorSource {
  label: string;
}

export const CALCULATOR_DISCLAIMER =
  "Bu hesaplayıcı bilgilendirme amaçlı bir ön hesaptır. Formül ilgili Tebliğ/Esaslar'a göre uygulanmıştır ancak bağımsız bir mühendis, hukukçu veya mali müşavir tarafından doğrulanmamıştır. İhale ve sözleşme kararlarında resmî metinler ve ilgili idare/danışman görüşü esastır. Girdiğiniz değerler tarayıcınızda hesaplanır, sunucuya gönderilmez.";

export const CalculatorShell: React.FC<{
  title: string;
  description: string;
  canonicalPath: string;
  heading: string;
  intro: string;
  sources: CalculatorSource[];
  children: React.ReactNode;
}> = ({ title, description, canonicalPath, heading, intro, sources, children }) => (
  <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
    <PublicMetadata title={title} description={description} canonicalPath={canonicalPath} />
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <Link to="/" className="text-sm font-semibold text-primary hover:underline">← BIMMetraj Ana Sayfa</Link>
        <nav aria-label="Hesaplayıcılar" className="flex items-center gap-4 text-xs">
          <Link to="/hesaplayicilar" className="text-muted-foreground hover:text-foreground">Tüm hesaplayıcılar</Link>
          <Link to="/register" className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground">Ücretsiz Deneyin</Link>
        </nav>
      </div>

      <header>
        <span className="section-index">ÜCRETSİZ HESAPLAYICI</span>
        <h1 className="mt-1 font-display-serif text-3xl text-foreground sm:text-4xl">{heading}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{intro}</p>
      </header>

      <div role="note" className="border border-border bg-card p-4 text-xs text-muted-foreground" data-testid="calculator-disclaimer">
        {CALCULATOR_DISCLAIMER}
      </div>

      {children}

      <section aria-label="Kaynaklar" className="border-t border-border pt-5 text-xs text-muted-foreground">
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider">Dayanak</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {sources.map((s) => (
            <li key={s.label}>{s.label}</li>
          ))}
        </ul>
      </section>

      <aside className="border border-border bg-card p-5 text-sm">
        <p className="font-semibold text-foreground">Rakamlarınızı modelinizden otomatik alın</p>
        <p className="mt-1 text-xs text-muted-foreground">
          BIMMetraj, IFC modelinizden metrajı çıkarır ve kaynağı belli, varsayılansız hesaplar yapar.
        </p>
        <Link to="/register" className="mt-3 inline-block rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Ücretsiz Deneyin
        </Link>
      </aside>
    </div>
  </main>
);

export const calcInputClass =
  "w-full border border-border bg-card px-2 py-1.5 text-sm font-mono text-foreground text-right tabular-nums focus:border-primary focus:outline-none";

export const CalcField: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block">
    <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
  </label>
);

export const fmtTry = (v: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " ₺";

export const fmtNum = (v: number, d = 4) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
