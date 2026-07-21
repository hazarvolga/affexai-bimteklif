import { ArrowLeft, CheckCircle2, Clock3, FileText, FlaskConical, LockKeyhole } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { ALLPLAN_DETAILED_LESSONS } from '@/academy/allplan/track';
import { isAllplanLessonCompleted, setAllplanLessonCompleted, syncAllplanLessonProgress, syncAllplanProgress } from '@/academy/allplan/progress';
import { useEffect, useState } from 'react';

export function ProtectedAllplanLessonPage() {
  const { lessonSlug } = useParams<{ lessonSlug: string }>();
  const { user } = useAuth();
  const lesson = ALLPLAN_DETAILED_LESSONS.find(item => item.slug === lessonSlug);
  const [completed, setCompleted] = useState(() => lesson ? isAllplanLessonCompleted(lesson, user?.id, user?.email) : false);

  useEffect(() => {
    syncAllplanProgress().then(slugs => {
      if (lesson) setCompleted(slugs.includes(lesson.slug));
    }).catch(() => undefined);
  }, [lesson]);

  if (!lesson) {
    return <PageContainer><div className="py-16 text-center"><h2 className="text-lg font-black uppercase tracking-widest text-zinc-100">Ders bulunamadı</h2><Link to="/app/academy/allplan" className="mt-4 inline-block font-mono text-[10px] text-orange-500 hover:underline">Allplan Akademisine dön</Link></div></PageContainer>;
  }

  const toggleCompleted = () => {
    const next = !completed;
    setAllplanLessonCompleted(lesson, next, user?.id, user?.email);
    setCompleted(next);
    syncAllplanLessonProgress(lesson, next).catch(() => undefined);
  };

  return <PageContainer>
    <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
      <Link to="/app/academy/allplan" className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"><ArrowLeft size={10} /> Allplan Akademisine dön</Link>
      <Badge className="border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">Kaynak doğrulandı</Badge>
    </div>

    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <div className="space-y-3">
          <Badge className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[8px] uppercase text-zinc-500">ALLPLAN PRO TRACK · {lesson.seed}</Badge>
          <h1 className="text-2xl font-black uppercase leading-tight tracking-widest text-zinc-100 sm:text-3xl">{lesson.title}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{lesson.subtitle}</p>
          <div className="flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-wider text-zinc-500"><span><Clock3 size={12} className="mr-1 inline text-orange-500" />{lesson.estimatedMinutes} dakika</span>{lesson.interactiveTool && <span><FlaskConical size={12} className="mr-1 inline text-emerald-400" />{lesson.interactiveTool}</span>}</div>
        </div>

        <section className="space-y-3 rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-5 text-xs leading-relaxed text-zinc-300">
          <h2 className="text-[9px] font-black uppercase tracking-widest text-orange-400">Dersin amacı</h2>
          <p>{lesson.introduction}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Uygulama adımları</h2>
          {lesson.steps.map(step => <article key={step.step} className="border border-zinc-800 bg-zinc-900/20 p-5"><div className="flex gap-4"><span className="font-mono text-sm text-orange-500">{String(step.step).padStart(2, '0')}</span><div><h3 className="text-sm font-bold text-zinc-100">{step.title}</h3><p className="mt-2 text-xs leading-relaxed text-zinc-400">{step.desc}</p></div></div></article>)}
        </section>
      </div>

      <aside className="space-y-5 lg:col-span-4">
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5"><h2 className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Mühendislik notu</h2><p className="text-xs leading-relaxed text-zinc-300">{lesson.recommendation}</p></section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5"><div className="flex items-center gap-2 text-sky-300"><FileText size={15} /><h2 className="text-[9px] font-black uppercase tracking-widest">Kaynak dosyalar</h2></div><ul className="mt-4 space-y-3 text-[10px] text-zinc-400">{lesson.attachments.map(file => <li key={file.name} className="flex gap-2"><CheckCircle2 size={13} className="shrink-0 text-emerald-400" />{file.name}<span className="text-zinc-600">{file.size}</span></li>)}</ul></section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex gap-3"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-zinc-500" /><p className="text-[10px] leading-relaxed text-zinc-500">İlerleme bu aşamada yalnızca bu cihazda ve mevcut hesabınızla ilişkilendirilerek tutulur. Sunucu senkronizasyonu Faz 3’ün sonraki adımıdır.</p></div><Button onClick={toggleCompleted} className={`mt-5 h-9 w-full rounded-xl text-[9px] font-black uppercase tracking-widest ${completed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}>{completed ? 'Tamamlandı · İşareti kaldır' : 'Dersi tamamlandı işaretle'}</Button></section>
      </aside>
    </div>
  </PageContainer>;
}
