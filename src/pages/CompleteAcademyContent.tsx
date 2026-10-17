import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { ArrowLeft, BookOpen, ExternalLink, MousePointer2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sourceSections } from '@/academy/sourceSections';
import { data6D, rebarData } from '@/academy/sourceData';
import { careerMatrixData } from '@/academy/nativeDerivedData';

const sectionLabels: Record<keyof typeof sourceSections, string> = {
  'sec-dashboard': 'Dashboard ve genel bakış',
  'sec-iso19650': 'ISO 19650',
  'sec-curriculum': 'BIM akademik müfredatı',
  'sec-six-d': '6D sürdürülebilirlik',
  'sec-metraj': 'Maliyet mühendisliği',
  'sec-minha': 'Minha laboratuvarı',
  'sec-teklif': '5D teklif motoru',
  'sec-four-five-d': '4D / 5D dinamikleri',
  'sec-ai-scan': 'AI ve Scan-to-BIM',
  'sec-legal': 'Hukuk ve siber güvenlik',
  'sec-eruhsat': 'e-Ruhsat ve interoperabilite',
  'sec-saha': 'Saha ve VDC',
  'sec-kariyer': 'Kariyer matrisi',
};

type SourceAction = { route: string; label: string };

// Every inline handler found in the source HTML has a deterministic native destination.
// The source remains the complete reference corpus; native pages own the working state.
const sourceActions: Record<string, SourceAction> = {
  calculateBid: { route: '/academy/4d-5d?action=calculateBid', label: 'Teklif motoru' },
  checkRBAC: { route: '/academy/security-field?action=checkRBAC', label: 'RBAC matrisi' },
  closeLectureNote: { route: '/academy/bim-core?action=closeLectureNote', label: 'BIM müfredatı' },
  hideCurriculumDetail: { route: '/academy/bim-core?action=hideCurriculumDetail', label: 'BIM müfredatı' },
  openLectureNote: { route: '/academy/bim-core?action=openLectureNote', label: 'BIM müfredatı' },
  runRuleCheck: { route: '/academy/security-field?action=runRuleCheck', label: 'ARC / e-Ruhsat laboratuvarı' },
  selectIsoPart: { route: '/academy/iso-19650?action=selectIsoPart', label: 'ISO 19650 laboratuvarı' },
  setLOA: { route: '/academy/scan-to-bim?action=setLOA', label: 'Scan-to-BIM laboratuvarı' },
  showClashInfo: { route: '/academy/security-field?action=showClashInfo', label: 'Clash laboratuvarı' },
  showCurriculumDetail: { route: '/academy/bim-core?action=showCurriculumDetail', label: 'BIM müfredatı' },
  showPyramidDetail: { route: '/academy/iso-19650?action=showPyramidDetail', label: 'ISO 19650 laboratuvarı' },
  simulate4D: { route: '/academy/4d-5d?action=simulate4D', label: '4D / 5D laboratuvarı' },
  simulateCde: { route: '/academy/iso-19650?action=simulateCde', label: 'CDE laboratuvarı' },
  simulateLCA: { route: '/academy/sustainability-6d?action=simulateLCA', label: '6D LCA laboratuvarı' },
  switchTab: { route: '/academy', label: 'Academy haritası' },
  toggleCSG: { route: '/academy/4d-5d?action=toggleCSG', label: 'CSG metraj laboratuvarı' },
  toggleMinha: { route: '/academy/4d-5d?action=toggleMinha', label: 'Minha laboratuvarı' },
  update6DDetail: { route: '/academy/sustainability-6d?action=update6DDetail', label: '6D laboratuvarı' },
  updateRebarInfo: { route: '/academy/4d-5d?action=updateRebarInfo', label: 'TS 708 metraj laboratuvarı' },
};

const tabRoutes: Record<string, string> = {
  dashboard: '/academy',
  iso19650: '/academy/iso-19650',
  curriculum: '/academy/bim-core',
  'six-d': '/academy/sustainability-6d',
  metraj: '/academy/4d-5d',
  minha: '/academy/4d-5d',
  teklif: '/academy/4d-5d',
  'four-five-d': '/academy/4d-5d',
  'ai-scan': '/academy/scan-to-bim',
  legal: '/academy/security-field',
  eruhsat: '/academy/security-field',
  saha: '/academy/security-field',
  kariyer: '/academy/security-field',
};

function parseInlineCall(value: string) {
  const match = value.match(/^\s*([A-Za-z_$][\w$]*)\s*\((.*)\)\s*;?\s*$/s);
  if (!match) return undefined;
  const args = [...match[2].matchAll(/'([^']*)'|"([^"]*)"|(\d+(?:\.\d+)?)/g)].map(item => item[1] ?? item[2] ?? item[3]);
  return { name: match[1], args };
}

type ChartDataset = { label: string; data: ReadonlyArray<number | null>; color: string };

function SourceChartFallback({ title, labels, datasets }: { title: string; labels: ReadonlyArray<string>; datasets: ReadonlyArray<ChartDataset> }) {
  return <article className="border border-border bg-white p-5"><h3 className="text-sm font-bold text-slate-800">{title}</h3><div className="mt-4 space-y-3">{labels.map((label, index) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-[11px] text-muted-foreground"><span>{label}</span><span>{datasets.map(dataset => `${dataset.label}: ${dataset.data[index] ?? '—'}`).join(' · ')}</span></div>{datasets.map(dataset => <div key={dataset.label} className="mb-1 h-1.5 bg-slate-100"><div className="h-1.5" style={{ width: `${Math.min(100, Math.max(0, (dataset.data[index] ?? 0)))}%`, backgroundColor: dataset.color }} /></div>)}</div>)}</div><div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-[10px] text-muted-foreground">{datasets.map(dataset => <span key={dataset.label} className="flex items-center gap-1"><i className="h-2 w-2" style={{ backgroundColor: dataset.color }} />{dataset.label}</span>)}</div></article>;
}

function SourceChartFallbacks() {
  return <section className="border border-border bg-slate-50 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Canvas veri koruması</p><h2 className="mt-1 text-xl font-bold text-slate-900">Kaynak grafiklerinin data görünümü</h2></div><span className="text-[11px] text-muted-foreground">5 canvas · tüm değerler korunuyor</span></div><p className="mt-3 max-w-4xl text-xs leading-relaxed text-muted-foreground">Kaynak HTML’nin Chart.js canvas’ları React içinde çalıştırılmadığı için burada aynı etiket ve değerleri erişilebilir native veri görünümünde gösteriyoruz. Native laboratuvarlar bu verileri etkileşimli olarak kullanır.</p><div className="mt-5 grid gap-4 xl:grid-cols-2"><SourceChartFallback title="Müfredat karşılaştırması · radar data" labels={['Veri Yönetimi', 'Koordinasyon', 'ISO Standartları', 'openBIM', 'Varlık (7D)', 'LOD Hassasiyeti']} datasets={[{ label: 'Geleneksel Kurs', data: [40, 60, 20, 30, 10, 80], color: '#EF4444' }, { label: 'Akademik Müfredat', data: [95, 90, 100, 95, 80, 95], color: '#F59E0B' }]} /><SourceChartFallback title="Donatı · TS 708 nominal kütle" labels={Object.keys(rebarData).map(d => `Φ${d}`)} datasets={[{ label: 'kg/m', data: Object.values(rebarData), color: '#F59E0B' }]} /><SourceChartFallback title="EVM · kümülatif bin ₺" labels={['1. Ay', '2. Ay', '3. Ay', '4. Ay', '5. Ay', '6. Ay']} datasets={[{ label: 'PV', data: [150, 350, 500, 750, 1000, 0], color: '#94A3B8' }, { label: 'EV', data: [130, 310, 480, 700, 0, 0], color: '#10B981' }, { label: 'AC', data: [140, 340, 520, 720, 0, 0], color: '#EF4444' }]} /><SourceChartFallback title="Kariyer matrisi · yetkinlik %" labels={careerMatrixData.labels} datasets={careerMatrixData.datasets.map(dataset => ({ label: dataset.label, data: dataset.data, color: dataset.color }))} />{data6D.map(item => <SourceChartFallback title={`${item.title} · ${item.chartTitle}`} labels={item.chartLabels} datasets={[{ label: item.title, data: item.chartData, color: '#10B981' }]} />)}</div></section>;
}

export function CompleteAcademyContent() {
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const [lastAction, setLastAction] = useState('Henüz bir kaynak etkileşimi seçilmedi.');
  const entries = Object.entries(sourceSections) as Array<[keyof typeof sourceSections, string]>;

  const handleSourceClick = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[onclick]');
    if (!target || !mainRef.current?.contains(target)) return;
    const call = parseInlineCall(target.getAttribute('onclick') ?? '');
    if (!call) return;
    event.preventDefault();

    if (call.name === 'switchTab') {
      const route = tabRoutes[call.args[0]];
      if (!route) return;
      setLastAction(`Kaynak sekmesi native laboratuvara bağlandı: ${call.args[0]}`);
      navigate(route);
      return;
    }

    const action = sourceActions[call.name];
    if (!action) {
      setLastAction(`Eşleşmemiş kaynak handlerı: ${call.name}`);
      return;
    }
    const query = new URLSearchParams({ source: call.name });
    if (call.args[0]) query.set('value', call.args[0]);
    setLastAction(`${call.name} → ${action.label} native laboratuvarına bağlandı.`);
    navigate(`${action.route}&${query.toString()}`);
  }, [navigate]);

  return <div className="min-h-screen bg-[#09090b] text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-[#09090b]/95 px-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
        <Link to="/academy" className="inline-flex items-center text-sm text-muted-foreground hover:text-white"><ArrowLeft size={16} className="mr-2" />Academy haritasına dön</Link>
        <div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-xs text-emerald-400 sm:flex"><BookOpen size={14} />13 bölüm · eksiksiz kaynak gövdesi</span><Link to="/academy/iso-19650" className="text-sm text-orange-300 hover:text-orange-200">Native laboratuvarlara git</Link><ExternalLink size={14} className="hidden text-orange-300 sm:block" /></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
      <aside className="h-fit border border-border bg-[#0c0c0e] p-4 lg:sticky lg:top-24"><p className="text-xs font-medium uppercase tracking-wider text-orange-400">Eksiksiz kaynak içeriği</p><nav className="mt-4 space-y-1">{entries.map(([id, label]) => <a key={id} href={`#${id}`} className="block border-l border-border px-3 py-2 text-xs text-muted-foreground hover:border-orange-500 hover:text-white">{label}</a>)}</nav><div className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground"><MousePointer2 size={14} className="mb-2 text-orange-400" />Kaynak HTML’deki handler’lar native laboratuvarlara bağlanır.</div></aside>
      <main ref={mainRef} onClickCapture={handleSourceClick} className="min-w-0 space-y-8">
        <div aria-live="polite" className="border border-orange-500/25 bg-orange-500/[0.06] px-4 py-3 text-xs text-orange-200">{lastAction}</div>
        <SourceChartFallbacks />
        {entries.map(([id, html]) => <section key={id} id={id} className="overflow-hidden border border-border bg-white text-slate-900"><div className="border-b border-border bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sectionLabels[id]}</div><div className="source-section-content" dangerouslySetInnerHTML={{ __html: html }} /></section>)}
      </main>
    </div>
  </div>;
}

export { sourceActions, tabRoutes };
