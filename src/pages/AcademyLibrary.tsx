import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicMetadata } from '@/components/PublicMetadata';
import { AcademyShell } from '@/features/academy/AcademyShell';
import { ACADEMY_TOPICS } from '@/academy/library/topics';

/** Lean Academy v1: the topic list. Content comes only from src/academy/library/topics.ts. */
export function AcademyLibrary() {
  return (
    <AcademyShell>
      <PublicMetadata
        title="Akademi | BIMMetraj"
        description="BIM, ISO 19650, 4D/5D maliyet, sürdürülebilirlik, Scan-to-BIM ve saha konularında yazılımdan bağımsız, açık bilgi kütüphanesi."
        canonicalPath="/academy"
      />
      <div className="max-w-3xl">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">Akademi</p>
        <h1 className="mt-3 font-display-serif text-3xl leading-tight text-foreground sm:text-5xl">BIM’i iş disiplini olarak öğrenin</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Yazılımdan bağımsız temel konular. Her konu kısa bir anlatım, modüller ve dayandığı kaynaklarla birlikte sunulur. Kayıt gerekmez.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {ACADEMY_TOPICS.map((topic) => (
          <li key={topic.slug}>
            <Link
              to={`/academy/${topic.slug}`}
              className="group flex h-full flex-col border border-border bg-card p-5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h2 className="text-lg font-semibold text-foreground">{topic.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {topic.modules.length} modül <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Bu içerik eğitim amaçlıdır. Teknik, hukuki veya mühendislik kararı için güncel kaynak, proje bağlamı ve yetkili uzman incelemesi gerekir.
      </p>
    </AcademyShell>
  );
}
