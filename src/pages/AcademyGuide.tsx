import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicMetadata } from '@/components/PublicMetadata';
import { AcademyShell } from '@/features/academy/AcademyShell';
import { findAcademyTopic } from '@/academy/library/topics';
import { findAcademyGuide } from '@/academy/library/guides';

/** Academy guide page: one detailed guide per URL (/academy/{topic}/{guide}), same template as topics. */
export function AcademyGuide() {
  const { slug, guide: guideSlug } = useParams();
  const topic = findAcademyTopic(slug);
  const guide = findAcademyGuide(slug, guideSlug);
  if (!topic) return <Navigate to="/academy" replace />;
  if (!guide) return <Navigate to={`/academy/${topic.slug}`} replace />;

  return (
    <AcademyShell>
      <PublicMetadata title={`${guide.title} | BIMMetraj Akademi`} description={guide.summary} canonicalPath={`/academy/${topic.slug}/${guide.slug}`} />

      <nav aria-label="Konum" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/academy" className="inline-flex min-h-6 items-center hover:text-primary">Akademi</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/academy/${topic.slug}`} className="inline-flex min-h-6 items-center hover:text-primary">{topic.title}</Link>
      </nav>

      <header className="mt-6 max-w-3xl">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">{guide.moduleTitle}</p>
        <h1 className="mt-3 font-display-serif text-3xl leading-tight text-foreground sm:text-5xl">{guide.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{guide.summary}</p>
      </header>

      {guide.rule && (
        <section className="mt-8 max-w-3xl border-l-2 border-primary pl-4" aria-labelledby="rule">
          <h2 id="rule" className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">Kural</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{guide.rule}</p>
        </section>
      )}

      {guide.table && (
        <section className="mt-10" aria-labelledby="table">
          <h2 id="table" className="text-xl font-semibold text-foreground">{guide.table.title}</h2>
          <div className="mt-4 overflow-x-auto border border-border">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{guide.table.headers.map((header) => <th key={header} scope="col" className="px-4 py-3 font-semibold">{header}</th>)}</tr>
              </thead>
              <tbody>
                {guide.table.rows.map((row) => (
                  <tr key={row.join('|')} className="border-t border-border">
                    {row.map((cell, index) => (
                      <td key={`${index}-${cell}`} className={`px-4 py-3 align-top ${index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {guide.calculation && (
        <section className="mt-10" aria-labelledby="calculation">
          <h2 id="calculation" className="text-xl font-semibold text-foreground">{guide.calculation.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.calculation.note}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {Object.entries(guide.calculation.inputs).map(([name, value]) => `${name} = ${formatNumber(value)}`).join(' · ')}
          </p>
          <div className="mt-3 overflow-x-auto border border-border">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Sonuç</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Formül</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Değer</th>
                </tr>
              </thead>
              <tbody>
                {guide.calculation.results.map((result) => (
                  <tr key={result.label} className="border-t border-border">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{result.label}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{result.formula}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{formatNumber(result.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {guide.review && (
        <aside className="mt-8 border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground" aria-label="İnceleme notu">
          <p className="font-semibold text-foreground">İnceleme notu ({guide.review.reviewedOn})</p>
          <p className="mt-1">{guide.review.note}</p>
          <p className="mt-2">Yöntem: {guide.review.method}</p>
          <ul className="mt-1 list-disc pl-5">
            {guide.review.sources.map((source) => <li key={source}>{source}</li>)}
          </ul>
        </aside>
      )}

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Önemli noktalar</h2>
          <ul className="mt-4 space-y-2">
            {guide.takeaways.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Örnek uygulama</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.example}</p>
        </div>
      </section>

      <section className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Kaynaklar</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {guide.sources.map((source) => <li key={source}>{source}</li>)}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Bu içerik eğitim amaçlıdır. Teknik, hukuki veya mühendislik kararı için güncel kaynak ve yetkili uzman incelemesi gerekir.
          </p>
        </div>
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">BIMMetraj’da</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.bimmetraj?.text ?? 'Konuyla ilgili araçlar için konu sayfasına dönün.'}</p>
          <Link to={topic.tryIn.href} className="pafta-button mt-4 inline-flex">
            <span>{topic.tryIn.label}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <Link to={`/academy/${topic.slug}`} className="mt-10 inline-flex min-h-6 items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {topic.title}
      </Link>
    </AcademyShell>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
}
