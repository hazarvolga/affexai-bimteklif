import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight, Clock, LockKeyhole } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { demoAcademyContent } from '@/smartcheck/demoData';
import { fetchWithAuth } from '@/lib/api';
import { getCompletedAllplanLessons, syncAllplanProgress } from '@/academy/allplan/progress';
import type { AllplanCoverageReport, AllplanCurriculumNode, AllplanLessonSummary } from '@/academy/allplan/types';
import { useAuth } from '@/hooks/useAuth';

const flattenLessons = (nodes: AllplanCurriculumNode[], output: AllplanLessonSummary[] = []) => {
  nodes.forEach(node => {
    if (node.lesson) output.push(node.lesson);
    flattenLessons(node.children, output);
  });
  return output;
};

export function AllplanAcademy() {
  const { user } = useAuth();
  const courses = demoAcademyContent.filter(c => c.area === 'allplan');
  const [curriculum, setCurriculum] = useState<AllplanCurriculumNode[]>([]);
  const [coverage, setCoverage] = useState<AllplanCoverageReport | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => getCompletedAllplanLessons(user?.id, user?.email));
  const [loading, setLoading] = useState(true);
  const lessons = useMemo(() => flattenLessons(curriculum), [curriculum]);

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/academy/allplan/curriculum').then(response => response.json()),
      syncAllplanProgress(),
    ]).then(([curriculumData, progress]) => {
      setCurriculum(curriculumData.curriculum ?? []);
      setCoverage(curriculumData.coverage ?? null);
      setCompletedLessons(progress);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  return <PageContainer>
    <div className="mb-4 flex items-center gap-2"><Link to="/app/academy" className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"><BookOpen size={10} /> Akademi Anasayfa</Link><span className="font-mono text-[9px] text-zinc-700">&gt;</span><span className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">Allplan Akademisi</span></div>
    <PageHeader title="Allplan Akademisi" description="Kayıtlı kullanıcıya özel Allplan müfredatı, uygulamalı laboratuvarlar ve ileride sertifikalanabilir uzmanlık yolu." />

    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4"><Metric label="Öğrenme yolu" value={coverage ? String(coverage.pathCount) : '—'} /><Metric label="Kurs" value={coverage ? String(coverage.courseCount) : '—'} /><Metric label="Modül" value={coverage ? String(coverage.moduleCount) : '—'} /><Metric label="Tamamlanan ders" value={`${completedLessons.length}/${coverage?.detailedLessonCount ?? '—'}`} /></section>

      <section className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Müfredat çalışma alanı</h2><p className="mt-1 text-[10px] text-zinc-600">Ayrıntılı içerik hazır olan dersler açılır; diğer modüller hazırlanma statüsünde korunur.</p></div><Badge className="w-fit border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">Korumalı kullanıcı alanı</Badge></div>{loading ? <div className="border border-zinc-800 bg-zinc-900/20 p-8 text-center text-xs text-zinc-500">Allplan müfredatı yükleniyor…</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lessons.map(lesson => { const completed = completedLessons.includes(lesson.slug); return <Card key={lesson.slug} className="flex flex-col justify-between border-zinc-800 bg-zinc-900/20 transition-all hover:border-orange-500/30"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><Badge className="border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[8px] text-zinc-500">{lesson.seed}</Badge>{completed && <CheckCircle2 size={16} className="text-emerald-500" />}</div><CardTitle className="mt-2 text-xs font-black uppercase leading-relaxed tracking-widest text-zinc-100">{lesson.title}</CardTitle><CardDescription className="line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{lesson.subtitle}</CardDescription></CardHeader><CardContent className="pt-0"><div className="mb-4 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-zinc-600"><span><Clock size={11} className="mr-1 inline" />{lesson.estimatedMinutes} dk</span>{lesson.interactiveTool && <span className="text-emerald-500">{lesson.interactiveTool}</span>}</div><Link to={`/app/academy/allplan/lesson/${lesson.slug}`}><Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-zinc-800 bg-zinc-950 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:bg-orange-600 hover:text-white">Dersi aç <ChevronRight size={14} /></Button></Link></CardContent></Card>; })}</div>}</section>

      <section className="space-y-3"><div className="flex items-center gap-2"><LockKeyhole size={14} className="text-zinc-500" /><h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">İçerik hazırlık durumu</h2></div><div className="border border-zinc-800 bg-zinc-950 p-5 text-xs leading-relaxed text-zinc-500">{coverage ? `${coverage.reviewRequiredModuleCount} modül henüz ayrıntılı ders gövdesiyle doğrulanmadı. Bu modüller kilitli tutulur; otomatik veya uydurma fallback ders yayınlanmaz.` : 'Müfredat kapsam verisi yükleniyor.'}</div></section>

      <section className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-zinc-900 bg-zinc-950 p-6 md:flex-row"><div><h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Sertifika ve yetkinlik sınavları</h2><p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">Sertifika altyapısı, ders ve uygulama kriterleriyle birlikte sonraki fazda açılacak. Şu an bu ekran resmi sertifika vaadi taşımaz.</p></div><Button disabled className="h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-5 text-[9px] font-black uppercase tracking-widest text-zinc-600">Yakında</Button></section>
    </div>
  </PageContainer>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-zinc-800 bg-zinc-900/20 p-4"><p className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>; }
