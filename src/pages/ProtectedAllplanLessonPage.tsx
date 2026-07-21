import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, CheckCircle2, Clock3, FileText, FlaskConical, Loader2, LockKeyhole, Plus, Timer, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { setAllplanLessonCompleted, syncAllplanLessonCheckpoint, syncAllplanLessonProgress, syncAllplanLessonTime, syncAllplanProgress } from '@/academy/allplan/progress';
import type { AllplanLesson } from '@/academy/allplan/types';
import { ReinforcementEstimator } from '@/components/academy/ReinforcementEstimator';
import { WallIntersectionSimulator } from '@/components/academy/WallIntersectionSimulator';
import { CoordinateCalculator } from '@/components/academy/CoordinateCalculator';
import { ShortcutTrainer } from '@/components/academy/ShortcutTrainer';

type LessonNote = { id: string; body: string; createdAt: string };

export function ProtectedAllplanLessonPage() {
  const { lessonSlug } = useParams<{ lessonSlug: string }>();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<AllplanLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [checkpointCompleted, setCheckpointCompleted] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [actionError, setActionError] = useState('');
  const activeSecondsRef = useRef(0);

  useEffect(() => {
    if (!lessonSlug) return;
    const loadLesson = async () => {
      const [lessonResponse, progress, activityResponse] = await Promise.all([
        fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lessonSlug)}`),
        syncAllplanProgress(),
        fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lessonSlug)}/activity`),
      ]);
      if (lessonResponse.status === 403 || activityResponse.status === 403) throw new Error('Allplan eğitim erişiminiz etkin değil.');
      if (lessonResponse.status === 404) throw new Error('Allplan dersi bulunamadı.');
      if (!lessonResponse.ok || !activityResponse.ok) throw new Error('Ders verisi yüklenemedi.');
      const [lessonData, activity] = await Promise.all([lessonResponse.json(), activityResponse.json()]);
      const nextLesson = lessonData?.lesson ?? null;
      setLesson(nextLesson);
      setCompleted(Boolean(nextLesson && progress.includes(nextLesson.slug)));
      setNotes(activity?.notes ?? []);
      setBookmarked(Boolean(activity?.bookmarked));
      setCheckpointCompleted(Boolean(activity?.checkpointCompleted));
      activeSecondsRef.current = activity?.activeSeconds ?? 0;
      setActiveSeconds(activeSecondsRef.current);
    };
    loadLesson().catch(error => setLoadError(error instanceof Error ? error.message : 'Ders verisi yüklenemedi.')).finally(() => setLoading(false));
  }, [lessonSlug, user?.email, user?.id]);

  useEffect(() => {
    if (!lesson) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      syncAllplanLessonTime(lesson, 30).then(serverSeconds => {
        activeSecondsRef.current = serverSeconds;
        setActiveSeconds(serverSeconds);
      }).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [lesson]);

  if (loading) return <PageContainer><div className="flex min-h-96 items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={28} /></div></PageContainer>;
  if (loadError) return <PageContainer><div className="border border-amber-500/25 bg-amber-500/[0.05] p-8"><LockKeyhole size={20} className="text-amber-400" /><h2 className="mt-4 text-lg font-black uppercase tracking-widest text-zinc-100">Ders açılamadı</h2><p className="mt-3 text-sm text-zinc-400">{loadError}</p><Link to="/app/academy/allplan" className="mt-5 inline-block text-sm text-orange-400 hover:underline">Allplan Akademisine dön</Link></div></PageContainer>;
  if (!lesson) return <PageContainer><div className="py-16 text-center"><h2 className="text-lg font-black uppercase tracking-widest text-zinc-100">Ders bulunamadı</h2><Link to="/app/academy/allplan" className="mt-4 inline-block font-mono text-[10px] text-orange-500 hover:underline">Allplan Akademisine dön</Link></div></PageContainer>;

  const toggleCompleted = async () => {
    const next = !completed;
    setActionError('');
    try {
      await syncAllplanLessonProgress(lesson, next);
      setAllplanLessonCompleted(lesson, next, user?.id, user?.email);
      setCompleted(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'İlerleme kaydedilemedi.');
    }
  };

  const addNote = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    const response = await fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lesson.slug)}/notes`, { method: 'POST', body: JSON.stringify({ body }) });
    if (!response.ok) return;
    const data = await response.json() as { note: LessonNote };
    setNotes(current => [data.note, ...current]);
    setNoteDraft('');
  };

  const deleteNote = async (noteId: string) => {
    const response = await fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lesson.slug)}/notes/${noteId}`, { method: 'DELETE' });
    if (response.ok) setNotes(current => current.filter(note => note.id !== noteId));
  };

  const toggleBookmark = async () => {
    const next = !bookmarked;
    const response = await fetchWithAuth(`/api/academy/allplan/lessons/${encodeURIComponent(lesson.slug)}/bookmark`, { method: 'PUT', body: JSON.stringify({ bookmarked: next }) });
    if (response.ok) setBookmarked(next);
  };

  const completeCheckpoint = async (evidence: unknown) => {
    if (checkpointCompleted) return true;
    setActionError('');
    try {
      await syncAllplanLessonCheckpoint(lesson, evidence);
      setCheckpointCompleted(true);
      return true;
    } catch (error) {
      setCheckpointCompleted(false);
      setActionError(error instanceof Error ? error.message : 'Laboratuvar checkpoint kanıtı doğrulanamadı.');
      return false;
    }
  };

  const handleLabValueChange = (value: string) => {
    const numericValue = Number.parseInt(value, 10);
    if (lesson.interactiveTool === 'reinforcement-estimator' && value === '35 mm') completeCheckpoint({ coverMm: 35 });
    if (lesson.interactiveTool === 'wall-simulator' && numericValue >= 500) completeCheckpoint({ priority: numericValue });
  };

  return <PageContainer><div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4"><Link to="/app/academy/allplan" className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"><ArrowLeft size={10} /> Allplan Akademisine dön</Link><Badge className="border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">Korumalı ders</Badge></div>{actionError && <div className="mb-5 border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs text-amber-300">{actionError}</div>}<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12"><div className="space-y-6 lg:col-span-8"><div className="space-y-3"><Badge className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[8px] uppercase text-zinc-500">ALLPLAN PRO TRACK · {lesson.seed}</Badge><h1 className="text-2xl font-black uppercase leading-tight tracking-widest text-zinc-100 sm:text-3xl">{lesson.title}</h1><p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{lesson.subtitle}</p><div className="flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-wider text-zinc-500"><span><Clock3 size={12} className="mr-1 inline text-orange-500" />{lesson.estimatedMinutes} dakika</span><span><Timer size={12} className="mr-1 inline text-sky-400" />{Math.floor(activeSeconds / 60)} dk çalışma</span>{lesson.interactiveTool && <span><FlaskConical size={12} className="mr-1 inline text-emerald-400" />{lesson.interactiveTool}</span>}</div></div><section className="space-y-3 rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-5 text-xs leading-relaxed text-zinc-300"><h2 className="text-[9px] font-black uppercase tracking-widest text-orange-400">Dersin amacı</h2><p>{lesson.introduction}</p></section><section className="space-y-4"><h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Uygulama adımları</h2>{lesson.steps.map(step => <article key={step.step} className="border border-zinc-800 bg-zinc-900/20 p-5"><div className="flex gap-4"><span className="font-mono text-sm text-orange-500">{String(step.step).padStart(2, '0')}</span><div><h3 className="text-sm font-bold text-zinc-100">{step.title}</h3><p className="mt-2 text-xs leading-relaxed text-zinc-400">{step.desc}</p></div></div></article>)}</section>{lesson.interactiveTool && <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Uygulamalı laboratuvar</h2><Badge className={checkpointCompleted ? 'border border-emerald-500/20 bg-emerald-500/10 text-[8px] text-emerald-400' : 'border border-zinc-800 bg-zinc-950 text-[8px] text-zinc-600'}>{checkpointCompleted ? 'CHECKPOINT TAMAM' : 'CHECKPOINT BEKLENİYOR'}</Badge></div>{lesson.interactiveTool === 'wall-simulator' && <WallIntersectionSimulator onValueChange={handleLabValueChange} />}{lesson.interactiveTool === 'reinforcement-estimator' && <ReinforcementEstimator onValueChange={handleLabValueChange} />}{lesson.interactiveTool === 'coordinate-calculator' && <CoordinateCalculator onComplete={completeCheckpoint} />}{lesson.interactiveTool === 'shortcut-trainer' && <ShortcutTrainer onComplete={completeCheckpoint} />}</section>}</div><aside className="space-y-5 lg:col-span-4"><section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5"><h2 className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Mühendislik notu</h2><p className="text-xs leading-relaxed text-zinc-300">{lesson.recommendation}</p></section><section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sky-300"><FileText size={15} /><h2 className="text-[9px] font-black uppercase tracking-widest">Kaynak dosyalar</h2></div><button onClick={toggleBookmark} aria-label="Dersi bookmarkla" className={bookmarked ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-300'}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button></div><ul className="mt-4 space-y-3 text-[10px] text-zinc-400">{lesson.attachments.map(file => <li key={file.name} className="flex gap-2"><CheckCircle2 size={13} className="shrink-0 text-emerald-400" />{file.name}<span className="text-zinc-600">{file.size}</span></li>)}</ul></section><section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5"><div className="flex items-center justify-between"><h2 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Kişisel notlar</h2><span className="font-mono text-[9px] text-zinc-600">{notes.length}</span></div><textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="Bu ders için bir not bırakın…" maxLength={5000} className="min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 outline-none focus:border-orange-500" /><Button onClick={addNote} className="h-8 w-full gap-1 bg-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-200 hover:bg-orange-600"><Plus size={13} /> Not ekle</Button><div className="space-y-2">{notes.map(note => <article key={note.id} className="border border-zinc-800 bg-zinc-950 p-3"><div className="flex items-start justify-between gap-2"><p className="whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-400">{note.body}</p><button onClick={() => deleteNote(note.id)} aria-label="Notu sil" className="shrink-0 text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button></div></article>)}</div></section><section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex gap-3"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-zinc-500" /><p className="text-[10px] leading-relaxed text-zinc-500">Bu içerik hesabınıza özel protected eğitim alanında sunulur. İlerleme, not, bookmark ve çalışma süresi kullanıcı/company hesabına kaydedilir.</p></div><Button onClick={toggleCompleted} className={`mt-5 h-9 w-full rounded-xl text-[9px] font-black uppercase tracking-widest ${completed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}>{completed ? 'Tamamlandı · İşareti kaldır' : 'Dersi tamamlandı işaretle'}</Button></section></aside></div></PageContainer>;
}
