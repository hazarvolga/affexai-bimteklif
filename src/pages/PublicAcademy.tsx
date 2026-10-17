import { ArrowRight, BookOpen, CheckCircle2, FileCheck2, GraduationCap, Layers3, ShieldCheck, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type AcademyTrack = {
  slug: string;
  title: string;
  summary: string;
  topics: string[];
  label: string;
  tone: 'orange' | 'blue' | 'green';
};

const tracks: AcademyTrack[] = [
  {
    slug: 'iso-19650',
    title: 'BIM temelleri ve ISO 19650',
    summary: 'BIM’i yalnızca yazılım kullanımı değil, bilgi üretimi ve teslim disiplini olarak ele alır.',
    topics: ['19650-1/-2: OIR, PIR, AIR, EIR & CDE Durumları', '19650-3/-4: PIM → AIM, openBIM & COBie Teslimi', '19650-5: RBAC Yetki Matrisi & Bilgi Güvenliği', 'EN 17412-1: LOG vs LOI (LOIN Dengesi)'],
    label: 'Çekirdek müfredat',
    tone: 'orange',
  },
  {
    slug: '4d-5d',
    title: '4D / 5D maliyet mühendisliği',
    summary: 'Metraj, zaman, maliyet ve teklif riskinin aynı karar çerçevesinde nasıl okunacağını gösterir.',
    topics: ['GUID & Primavera/MS Project 4D Lojistik', 'EVM Monitörü: PV, EV, AC Göstergeleri', 'Götürü Bedel vs Teklif Birim Fiyat Risk Motoru', 'Minha Kuralları: Türkiye ÇŞB vs Almanya DIN 18350'],
    label: 'TeklifPro ile bağlantılı',
    tone: 'blue',
  },
  {
    slug: 'sustainability-6d',
    title: '6D sürdürülebilirlik ve karbon',
    summary: 'Enerji, yaşam döngüsü ve gömülü karbon başlıklarını proje kararlarına bağlayan giriş katmanı.',
    topics: ['BEM & EPW İklim Verisi Simülasyonu (ISO 52000-1)', 'LCA Beşikten Mezara (A1–D) Sistem Sınırları', 'Embodied vs Operational GWP Karbon Analizi', 'LEED v4.1, BREEAM & EDGE Model Veri Çıktısı'],
    label: 'İleri seviye',
    tone: 'green',
  },
  {
    slug: 'scan-to-bim',
    title: 'AI, Scan-to-BIM ve dijital ikiz',
    summary: 'Yeni teknolojileri pazarlama vaadi olarak değil, kontrollü iş akışlarının parçası olarak inceler.',
    topics: ['LOA 10/30/50 Doğruluk Toleransları (±50mm → ±1mm)', 'Nokta Bulutu – Model Kıyaslama & Deformasyon', 'NSGA-II Üretken Tasarım & Optimizasyon', 'İnsan Onayı, İzin Matrisi & Kanıt Kaydı'],
    label: 'Uygulamalı laboratuvar',
    tone: 'orange',
  },
  {
    slug: 'security-field',
    title: 'Sözleşme, güvenlik ve teslim',
    summary: 'BIM protokollerinde sorumluluk, bilgi güvenliği ve teslim kanıtlarının neden kritik olduğunu açıklar.',
    topics: ['ISO 19650-5 CDE İzin Matrisi (WIP/Shared/Published)', 'e-Ruhsat, ARC & GeoBIM Imar Kural Denetimi', 'VDC & Clash Matrisi (Hard, Soft, 4D Clash)', 'Donatı LOD 400, BVBS Kodları & 12m Boy Sınırı'],
    label: 'Kurumsal uygulama',
    tone: 'blue',
  },
  {
    slug: 'bim-core',
    title: 'BIM Core ve akademik müfredat',
    summary: 'Ofis ile saha arasındaki kopukluğu azaltmak için üretilebilirlik ve rol bazlı gelişim başlıkları.',
    topics: ['BIM501: AEC Ontolojisi & Varlık Yonetimi', 'BIM502: LOIN (LOG vs LOI Dengesi)', 'BIM503: openBIM, IFC 4.0 & BCF Issue Akışı', 'BIM504: BEP, TIDP/MIDP & RACI Matrisi'],
    label: 'Saha odaklı',
    tone: 'green',
  },
  {
    slug: 'allplan',
    title: 'Allplan Pro Track & openBIM Brutal Truth',
    summary: 'Allplan 0-sapma donatı hassasiyetini, Revit 2025 IFC sapmalarını ve Archicad 28 mimari IFC köprüsünü dürüstçe karşılaştırır.',
    topics: ['Allplan 2026: %100 Matematiksel Donatı & Metraj (0 Sapma)', 'Revit 2025: Donatı Çakışması & ±%10-%15 Manuel Kontrol', 'Archicad 28: Mimari Konsept & Statik IFC Köprüsü', 'openBIM IFC 4.0 Ortak Veri Standardı'],
    label: 'Kayıtlı kullanıcı alanı',
    tone: 'orange',
  },
];

const toneClasses = {
  orange: 'border-orange-500/30 bg-orange-500/[0.06] text-orange-300',
  blue: 'border-sky-500/30 bg-sky-500/[0.05] text-sky-300',
  green: 'border-emerald-500/30 bg-emerald-500/[0.05] text-emerald-300',
};

export function PublicAcademy() {
  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-foreground selection:bg-orange-500/30 selection:text-orange-200">
      <header className="border-b border-border bg-[#09090b] px-6 md:px-8">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between" aria-label="Public Academy navigasyonu">
          <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold text-white">BP</span>
            <span className="text-lg">BIMPlan Academy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden text-sm text-muted-foreground transition-colors hover:text-white sm:inline">Ana sayfa</Link>
            <Link to="/pilot" className="inline-flex h-10 items-center rounded-md bg-orange-600 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-700">Pilot başvurusu</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="border-b border-border px-6 pb-20 pt-20 md:px-8 md:pb-28 md:pt-28">
          <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-[1.15fr_0.85fr] md:items-end">
            <div>
              <p className="mb-5 text-sm font-medium text-orange-400">BİMPLAN AKADEMİ · AÇIK BİLGİ ALANI</p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.03em] text-foreground md:text-7xl md:text-balance">BIM’i yazılımdan çıkarıp iş disiplinine dönüştürün.</h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">BIMPlan Academy; standartları, maliyet mühendisliğini, saha pratiğini ve dijital teslim süreçlerini gerçek iş kararlarıyla ilişkilendiren açık bir öğrenme ve uygulama alanıdır.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#tracks" className="inline-flex h-12 items-center justify-center rounded-md bg-orange-600 px-6 text-sm font-medium text-white transition-colors hover:bg-orange-700">Müfredatı incele <ArrowRight size={17} className="ml-2" /></a>
                <Link to="/" className="inline-flex h-12 items-center justify-center rounded-md border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-zinc-800">BIMPlan ekosistemini gör</Link>
              </div>
            </div>
            <aside className="border border-border bg-[#0c0c0e] p-6 md:p-7">
              <div className="flex items-center gap-3 text-orange-300"><BookOpen size={19} /><span className="text-sm font-medium">Bu alan ne sağlar?</span></div>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />Karmaşık BIM konularını proje kararlarına bağlar.</li>
                <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />Teklif ve metraj ekiplerinin ortak dilini güçlendirir.</li>
                <li className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />SmartCheck bulgularını kısa, uygulanabilir derslere bağlar.</li>
              </ul>
            </aside>
          </div>
        </section>

        <section id="tracks" className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-medium text-orange-400">İÇERİK HARİTASI</p>
              <h2 className="text-4xl font-semibold tracking-[-0.02em] text-foreground md:text-5xl">Tek bir ders değil, birbirine bağlanan bir yetkinlik sistemi.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Kaynak HTML’deki akademik kapsamı; önce okunabilir rehberler, sonra interaktif laboratuvarlar ve ürün içi mikro öğrenme akışları olarak yayınlayacağız.</p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tracks.map((track) => (
                <Link to={`/academy/${track.slug}`} key={track.title} className="border border-border bg-[#09090b] p-6 transition-colors hover:border-zinc-600">
                  <div className="flex items-start justify-between gap-4"><Layers3 size={20} className="text-orange-400" /><span className={`border px-2 py-1 text-[11px] ${toneClasses[track.tone]}`}>{track.label}</span></div>
                  <h3 className="mt-8 text-xl font-semibold text-foreground">{track.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{track.summary}</p>
                  <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">{track.topics.map((topic) => <li key={topic} className="flex gap-2"><span className="text-orange-400">—</span>{topic}</li>)}</ul>
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-foreground">Eksiksiz kaynak içeriği</p><p className="mt-1 text-sm text-muted-foreground">13 bölümün tamamı; akademik metinler, hukuk, saha, grafik gövdeleri ve laboratuvar içerikleriyle birlikte.</p></div><Link to="/academy/complete" className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-orange-500/40 px-4 text-sm font-medium text-orange-300 hover:bg-orange-500/10">Tüm içeriği incele <ArrowRight size={16} className="ml-2" /></Link></div>
          </div>
        </section>

        <section className="border-b border-border px-6 py-20 md:px-8 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
            <InfoBlock icon={<Workflow />} title="Öğren → uygula" text="Her konu yalnızca tanım olarak kalmaz; teklif, model veya teslim akışındaki karşılığıyla ele alınır." />
            <InfoBlock icon={<ShieldCheck />} title="Kaynağı görünür tut" text="Standart, senaryo ve demo verisini ayırırız. Eğitim içeriği mühendislik onayının yerine geçmez." />
            <InfoBlock icon={<FileCheck2 />} title="İş akışına bağla" text="Academy’de öğrenilen yaklaşım, SmartCheck kontrolü ve TeklifPro çalışma alanıyla gerçek sürece taşınır." />
          </div>
        </section>

        <section className="bg-orange-500/[0.06] px-6 py-20 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl"><p className="mb-3 text-sm font-medium text-orange-400">BİR SONRAKİ ADIM</p><h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Bilgiyi gerçek bir teklif akışında deneyin.</h2><p className="mt-4 leading-relaxed text-foreground dark:text-muted-foreground">Academy öğrenme katmanıdır. TeklifPro ise metraj, teklif, PDF ve kârlılık sürecinin çalışma alanıdır.</p></div>
            <Link to="/pilot" className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-orange-600 px-6 text-sm font-medium text-white transition-colors hover:bg-orange-700">Pilot başvurusu <ArrowRight size={17} className="ml-2" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10 md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span className="font-medium text-foreground dark:text-muted-foreground">BIMPlan Academy</span><span>İçerikler eğitim ve enablement amacıyla hazırlanır; kritik teknik kararlar yetkili uzman onayı gerektirir.</span></div></footer>
    </div>
  );
}

function InfoBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="border-t border-border pt-5"><div className="text-orange-400">{icon}</div><h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>;
}
