import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicMetadata } from '@/components/PublicMetadata';
import { AcademyShell } from '@/features/academy/AcademyShell';
import { findAcademyTopic } from '@/academy/library/topics';
import { guidesForModule } from '@/academy/library/guides';

/** Lean Academy v1: one template for every topic (why it matters, modules, sources, try it). */
export function AcademyTopic() {
  const { slug } = useParams();
  const topic = findAcademyTopic(slug);
  if (!topic) return <Navigate to="/academy" replace />;

  return (
    <AcademyShell>
      <PublicMetadata title={`${topic.title} | BIMMetraj Akademi`} description={topic.summary} canonicalPath={`/academy/${topic.slug}`} />

      <Link to="/academy" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> Tüm konular
      </Link>

      <header className="mt-6 max-w-3xl">
        <h1 className="font-display-serif text-3xl leading-tight text-foreground sm:text-5xl">{topic.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{topic.summary}</p>
      </header>

      <section className="mt-8 max-w-3xl border-l-2 border-primary pl-4" aria-labelledby="why">
        <h2 id="why" className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">Neden önemli</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{topic.why}</p>
      </section>

      <section className="mt-10" aria-labelledby="modules">
        <h2 id="modules" className="text-xl font-semibold text-foreground">Modüller</h2>
        <ol className="mt-5 space-y-4">
          {topic.modules.map((module, index) => (
            <li key={module.title} className="border border-border bg-card p-5">
              <div className="flex gap-4">
                <span className="font-mono text-sm text-primary" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.body}</p>
                  <ul className="mt-3 space-y-2">
                    {module.points.map((point) => (
                      <li key={point} className="flex gap-2 text-sm leading-relaxed text-foreground">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {guidesForModule(topic.slug, module.title).length > 0 && (
                    <div className="mt-4 flex flex-col items-start gap-2">
                      {guidesForModule(topic.slug, module.title).map((guide) => (
                        <Link key={guide.slug} to={`/academy/${topic.slug}/${guide.slug}`} className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                          Ayrıntılı rehber: {guide.title} <ArrowRight size={14} className="shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Kaynaklar</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {topic.sources.map((source) => <li key={source}>{source}</li>)}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Bu içerik eğitim amaçlıdır. Teknik, hukuki veya mühendislik kararı için güncel kaynak ve yetkili uzman incelemesi gerekir.
          </p>
        </div>
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">BIMMetraj’da deneyin</h2>
          <Link to={topic.tryIn.href} className="pafta-button mt-4 inline-flex">
            <span>{topic.tryIn.label}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </AcademyShell>
  );
}
