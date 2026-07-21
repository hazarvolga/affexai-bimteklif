import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, FlaskConical } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicMetadata } from '@/components/PublicMetadata';
import { ALLPLAN_TRACK } from '@/academy/allplan/track';

const pathCatalog: Record<string, { sourceId?: string; title: string; description: string; lessonTitles?: string[] }> = {
  fundamentals: { sourceId: 'p1', title: 'Allplan Fundamentals', description: 'Allplan arayüzü, proje kurulumu, koordinat, dosya ve üretkenlik temelleri.' },
  architecture: { sourceId: 'p2', title: 'Allplan Architecture', description: 'Mimari modelleme ve yapı bileşenlerini Allplan mantığıyla okumaya giriş.' },
  structural: { sourceId: 'p3', title: 'Structural Engineering', description: 'Taşıyıcı sistem, analiz hazırlığı ve yapısal teslim konuları.' },
  openbim: { sourceId: 'p4', title: 'BIM & OpenBIM Workflows', description: 'IFC, BCF, koordinasyon ve bilgi teslimi için Allplan bağlamı.' },
  reinforcement: { sourceId: 'p5', title: 'Reinforcement & Detailing', description: 'Donatı modelleme, paspayı, kanca, çizelge ve fabrikasyon hazırlığı.' },
  'quantity-takeoff': { title: 'Allplan Quantity Takeoff', description: 'Allplan modelini donatı, metraj ve teklif kararlarına bağlayan seçilmiş ders paketi.', lessonTitles: ['BIM Basics & openBIM', 'Drawing Files (Teilbilder)', 'Bar Schedules & Takeoffs', 'Standard Hooks & Bends', 'Concrete Cover Requirements'] },
};

export function PublicAllplanPath() {
  const { pathSlug } = useParams<{ pathSlug: string }>();
  const config = pathSlug ? pathCatalog[pathSlug] : undefined;
  if (!config) return <NotFound />;
  const sourceNode = config.sourceId ? ALLPLAN_TRACK.nodes.find(node => node.sourceId === config.sourceId) : undefined;
  const lessons = config.lessonTitles
    ? ALLPLAN_TRACK.nodes.flatMap(node => flatten(node)).filter(node => node.lesson && config.lessonTitles?.includes(node.lesson.title)).map(node => node.lesson!)
    : sourceNode?.children.flatMap(course => course.children).filter(node => node.lesson).map(node => node.lesson!) ?? [];

  return <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100"><DocumentMetadata title={`${config.title} | BIMPlan Academy`} description={config.description} canonicalPath={`/academy/allplan/${pathSlug}`} /><header className="border-b border-zinc-800/80 px-6 md:px-8"><nav className="mx-auto flex h-20 max-w-7xl items-center justify-between"><Link to="/academy/allplan" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-white"><ArrowLeft size={16} /> Allplan Pro Track</Link><Link to="/pilot" className="inline-flex h-10 items-center rounded-md bg-orange-600 px-4 text-sm font-medium text-white hover:bg-orange-700">Pilot başvurusu</Link></nav></header><main><section className="border-b border-zinc-800 px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24"><div className="mx-auto max-w-7xl"><p className="mb-5 text-sm font-medium text-orange-400">ALLPLAN PRO TRACK · {lessons.length} DOĞRULANMIŞ DERS</p><h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-6xl">{config.title}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">{config.description}</p><div className="mt-8 flex flex-wrap gap-3 text-xs text-zinc-500"><span className="border border-zinc-800 px-3 py-2"><BookOpen size={14} className="mr-2 inline text-orange-400" />Kaynak doğrulaması görünür</span><span className="border border-zinc-800 px-3 py-2"><FlaskConical size={14} className="mr-2 inline text-emerald-400" />Uygulamaya bağlanır</span></div></div></section><section className="bg-[#0c0c0e] px-6 py-16 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lessons.map(lesson => <Link key={lesson.sourceId} to={`/academy/allplan/lesson/${lesson.slug}`} className="group border border-zinc-800 bg-[#09090b] p-6 hover:border-orange-500/40"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-orange-400">{lesson.seed}</span>{lesson.interactiveTool && <span className="border border-emerald-500/30 bg-emerald-500/[0.06] px-2 py-1 text-[10px] text-emerald-300">LAB</span>}</div><h2 className="mt-6 text-xl font-semibold text-white group-hover:text-orange-300">{lesson.title}</h2><p className="mt-3 text-sm leading-relaxed text-zinc-400">{lesson.subtitle}</p><div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-5 text-xs text-zinc-500"><span><Clock3 size={14} className="mr-1 inline" />{lesson.estimatedMinutes} dk</span><span className="text-orange-300">Dersi aç <ArrowRight size={14} className="ml-1 inline" /></span></div></Link>)}</div>{lessons.length === 0 && <div className="border border-amber-500/30 bg-amber-500/[0.06] p-6 text-sm text-amber-200">Bu öğrenme yolunun ayrıntılı kaynak dersleri henüz doğrulanmadı. Kapsam roadmap’e alındı; tamamlanmadan public ders olarak açılmayacak.</div>}</div></section></main></div>;
}

function flatten(node: typeof ALLPLAN_TRACK.nodes[number]): typeof ALLPLAN_TRACK.nodes { return [node, ...node.children.flatMap(child => flatten(child))]; }
function NotFound() { return <div className="min-h-screen bg-[#09090b] px-6 py-24 text-zinc-100"><h1 className="text-3xl font-semibold">Allplan yolu bulunamadı.</h1><Link to="/academy/allplan" className="mt-6 inline-flex text-orange-300">Allplan Pro Track’e dön <CheckCircle2 size={16} className="ml-2" /></Link></div>; }
function DocumentMetadata(props: { title: string; description: string; canonicalPath: string }) { return <PublicMetadata {...props} />; }
