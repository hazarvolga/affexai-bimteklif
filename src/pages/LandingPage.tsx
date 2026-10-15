import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  ClipboardCheck, 
  FileSpreadsheet, 
  ShieldCheck, 
  Boxes, 
  Layers, 
  FileCheck2, 
  Building2, 
  Menu, 
  X,
  ExternalLink,
  SlidersHorizontal,
  FileCode2,
  BadgeCheck
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { PublicPricingSection } from '@/features/public-pricing/PublicPricingSection';
import { PublicMetadata } from '@/components/PublicMetadata';

type LandingPageProps = {
  onGetStarted: () => void;
  onPilotRequest?: () => void;
};

const LANDING_ROUTE_META: Record<string, { title: string; description: string; canonicalPath: string }> = {
  '/pricing': {
    title: 'Paketler ve Fiyatlandırma | BIMMetraj 5D İhale & IFC Metraj Platformu',
    description: 'Teknik ofisler için Deneme, Başlangıç, Ekip, Profesyonel ve Kurumsal paket kotalarını; 6 ay (%10), 1 yıl (%20) ve 2 yıl (%30) peşin ödeme avantajlarıyla inceleyin.',
    canonicalPath: '/pricing',
  },
  '/features': {
    title: 'Özellikler — IFC QTO, TS 500 Sihirbazı, SmartCheck & RG 33331 e-PYS | BIMMetraj',
    description: 'openBIM IFC 2x3/4/4X3 metraj çıkarma, TS 500 kiriş-döşeme kesişim ve CSB_2026_V1 Minha düşümü, ÇŞB 2026 570+ onaylı poz/rayiç kataloğu ve RG 33331 EK-9 ön kontrolü.',
    canonicalPath: '/features',
  },
  '/about': {
    title: 'Nasıl Çalışır? — 4 Adımda Kanıta Dayalı 5D Metraj ve İhale İş Akışı | BIMMetraj',
    description: 'IFC, PDF/A ve Excel dosyalarından RG 33331 e-PYS ön kontrolü, SmartCheck 3x3 & Minha denetimi ve disiplin yetkili mühendis onayıyla 5D teklif cetveline geçiş iş akışı.',
    canonicalPath: '/about',
  },
  '/': {
    title: 'BIMMetraj | openBIM (IFC) Tabanlı Metraj, RG 33331 e-PYS ve 5D İhale Masası',
    description: 'BIMMetraj — İnşaat ve teknik ofis ekipleri için açık BIM (IFC) ve Excel tabanlı metraj çıkarma, ÇŞB 2026 poz entegrasyonu, TS 500 & Minha motoru ve SmartCheck denetimli teklif platformu.',
    canonicalPath: '/',
  },
};

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageMeta = LANDING_ROUTE_META[location.pathname] ?? LANDING_ROUTE_META['/'];

  useEffect(() => {
    const sectionMap: Record<string, string> = {
      '/pricing': 'pricing',
      '/features': 'features',
      '/about': 'workflow',
    };
    const targetId = sectionMap[location.pathname];
    if (targetId && typeof document !== 'undefined') {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <PublicMetadata
        title={pageMeta.title}
        description={pageMeta.description}
        canonicalPath={pageMeta.canonicalPath}
      />
      {/* STICKY NAVBAR */}
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-md md:px-8">
        <a href="#top" className="flex items-center gap-3 font-semibold tracking-tight text-foreground" aria-label="BIMMetraj ana sayfa">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-xs font-mono font-black text-white shadow-xs">
            BM
          </span>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight tracking-tight">BIMMetraj</span>
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">openBIM & 5D İhale Masası</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#workflow" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Nasıl Çalışır?</a>
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Özellikler</a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Paketler</a>
          <Link to="/smartcheck" className="text-sm text-muted-foreground transition-colors hover:text-foreground">SmartCheck Demo</Link>
          
          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground" onClick={onGetStarted}>
            Giriş Yap
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/register')}
            className="bg-primary px-4 text-white hover:bg-primary/90 font-medium text-sm shadow-xs"
          >
            Teklif Hazırlayın
          </Button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onGetStarted}
            className="text-xs"
          >
            Giriş
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/register')}
            className="bg-primary text-xs text-white px-3 font-semibold"
          >
            Ücretsiz Başla
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground focus:outline-none"
            aria-label="Menüyü aç/kapat"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-6 py-4 space-y-3 sticky top-16 z-40">
          <a 
            href="#workflow" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-muted-foreground py-1 hover:text-foreground"
          >
            Nasıl Çalışır?
          </a>
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-muted-foreground py-1 hover:text-foreground"
          >
            Özellikler
          </a>
          <a 
            href="#pricing" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-muted-foreground py-1 hover:text-foreground"
          >
            Paketler
          </a>
          <Link 
            to="/smartcheck"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-muted-foreground py-1 hover:text-foreground"
          >
            SmartCheck Demo
          </Link>
          <div className="pt-2 flex flex-col gap-2 border-t border-border">
            <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}>
              Giriş Yap
            </Button>
            <Button className="w-full bg-primary text-white font-medium" onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}>
              14 Gün Ücretsiz Başla
            </Button>
          </div>
        </div>
      )}

      <main id="top">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-border bg-hairline-grid px-6 pb-20 pt-16 md:px-8 md:pb-28 md:pt-20">
          <div className="relative z-10 mx-auto max-w-6xl">
            {/* Engineering Badge */}
            <div className="mb-6 inline-flex items-center gap-2 border border-border bg-card/80 px-3 py-1 text-xs font-mono text-muted-foreground rounded-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              openBIM QTO · ÇŞB 2026 Poz & Rayiç Kataloğu · RG 33331 e-PYS EK-9 Ön Kontrol
            </div>

            <h1 className="max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.12] tracking-tight text-foreground">
              İhale Masasında Hata Payı Bırakmayın.
            </h1>
            <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground font-normal">
              IFC modellerinizi, PDF/A paftalarınızı ve Excel metrajlarınızı ÇŞB 2026 poz kataloğuyla eşleştirin; TS 500 kiriş–döşeme kesişim düşümü, <code className="text-xs font-mono text-foreground">CSB_2026_V1</code> Minha motoru ve RG 33331 e-PYS ön kontrolü ile teslim öncesi denetleyin.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button 
                onClick={() => navigate('/register')}
                size="lg" 
                className="h-11 bg-primary px-6 text-white hover:bg-primary/90 font-semibold w-full sm:w-auto shadow-xs"
              >
                14 Gün Ücretsiz Başlayın <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/smartcheck')}
                className="h-11 border-border bg-card/60 px-6 text-sm font-medium hover:bg-muted"
              >
                SmartCheck Demosunu İnceleyin
              </Button>
            </div>

            {/* PRODUCT SHOWCASE MOCKUP (Pafta & Metraj Cetveli) */}
            <div className="mt-14 overflow-hidden rounded-md border border-border bg-card shadow-2xl">
              {/* Mockup Title Block (Pafta Anteti) */}
              <div className="border-b border-border bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">PROJE: <strong className="text-foreground">Kadıköy Konutları Kaba Yapı</strong></span>
                  <span className="hidden sm:inline text-muted-foreground">REV: <strong className="text-primary font-bold">02</strong></span>
                  <span className="hidden md:inline text-muted-foreground">HAZIRLAYAN: <strong className="text-foreground">Ahmet Y. (İnş. Müh.)</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="stamp-badge border-primary/40 text-primary bg-primary/10">
                    <BadgeCheck size={13} className="shrink-0" />
                    Teknik Onaylı
                  </span>
                  <span className="text-muted-foreground">ÖRNEK PAFTA: <strong className="text-foreground tabular-nums">REV-02</strong></span>
                </div>
              </div>

              {/* Split Workspace View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Left: Structural CAD / Wireframe preview */}
                <div className="lg:col-span-5 p-5 bg-background/50 flex flex-col justify-between min-h-[260px]">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} className="text-primary" />
                      IFC Yapısal Model (STR)
                    </span>
                    <span className="text-emerald-400">● 142 Eleman Ayrıştırıldı</span>
                  </div>

                  {/* Wireframe Graphic Illustration */}
                  <div className="relative h-44 rounded-sm border border-border/60 bg-muted/20 p-4 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-hairline-grid opacity-50" />
                    {/* Isometric structural wireframe representation */}
                    <div className="relative z-10 w-full max-w-[200px] h-28 border border-primary/40 rounded-xs flex flex-col justify-between p-2 font-mono text-[9px] text-muted-foreground">
                      <div className="flex justify-between border-b border-border/60 pb-1">
                        <span>C30/37 KOLON</span>
                        <span className="text-primary">420.00 m³</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>B420C DONATI</span>
                        <span className="text-foreground">34.50 ton</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-1">
                        <span>KALIP İSKELESİ</span>
                        <span>1.120 m²</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>buildingSMART IFC4 / IFC4X3</span>
                    <span className="text-primary">Qto_WallBaseQuantities</span>
                  </div>
                </div>

                {/* Right: Dense Metraj Cetveli Table */}
                <div className="lg:col-span-7 overflow-x-auto">
                  <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between font-mono text-xs">
                    <span className="font-semibold text-foreground">Metraj Cetveli & Fiyat Dağılımı</span>
                    <span className="text-muted-foreground tabular-nums">Toplam: <strong className="text-foreground">2.888.250,00 ₺</strong></span>
                  </div>
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="p-2.5 pl-4">Poz No</th>
                        <th className="p-2.5">İmalat Kalemi</th>
                        <th className="p-2.5">Mahal</th>
                        <th className="p-2.5 text-right">Miktar</th>
                        <th className="p-2.5 text-right">Birim Fiyat</th>
                        <th className="p-2.5 pr-4 text-right">Tutar (₺)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-foreground">
                      <tr className="hover:bg-muted/20">
                        <td className="p-2.5 pl-4 font-semibold text-primary">15.120.1001</td>
                        <td className="p-2.5 font-sans font-medium">C30/37 Hazır Beton</td>
                        <td className="p-2.5 text-muted-foreground">Zemin Kat</td>
                        <td className="p-2.5 text-right tabular-nums">420,00 m³</td>
                        <td className="p-2.5 text-right tabular-nums">2.850,00 ₺</td>
                        <td className="p-2.5 pr-4 text-right tabular-nums font-semibold">1.197.000,00 ₺</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="p-2.5 pl-4 font-semibold text-primary">15.160.1003</td>
                        <td className="p-2.5 font-sans font-medium">B420C Donatı Çeliği</td>
                        <td className="p-2.5 text-muted-foreground">Tüm Katlar</td>
                        <td className="p-2.5 text-right tabular-nums">34,50 ton</td>
                        <td className="p-2.5 text-right tabular-nums">28.500,00 ₺</td>
                        <td className="p-2.5 pr-4 text-right tabular-nums font-semibold">983.250,00 ₺</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="p-2.5 pl-4 font-semibold text-primary">15.140.1002</td>
                        <td className="p-2.5 font-sans font-medium">Ahşap Düz Kalıp Yapılması</td>
                        <td className="p-2.5 text-muted-foreground">Perde & Döşeme</td>
                        <td className="p-2.5 text-right tabular-nums">1.120,00 m²</td>
                        <td className="p-2.5 text-right tabular-nums">450,00 ₺</td>
                        <td className="p-2.5 pr-4 text-right tabular-nums font-semibold">504.000,00 ₺</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="p-2.5 pl-4 font-semibold text-primary">15.220.1005</td>
                        <td className="p-2.5 font-sans font-medium">Temel Altı Grobeton (C16/20)</td>
                        <td className="p-2.5 text-muted-foreground">Temel Tabanı</td>
                        <td className="p-2.5 text-right tabular-nums">85,00 m³</td>
                        <td className="p-2.5 text-right tabular-nums">2.400,00 ₺</td>
                        <td className="p-2.5 pr-4 text-right tabular-nums font-semibold">204.000,00 ₺</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Hairline Technical Metrics Teaser */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-sm border border-border bg-card/60 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">ÇŞB 2026 & Fiyat Kataloğu</span>
                <p className="mt-1 text-sm font-medium text-foreground">570+ Onaylı Poz & Rayiç Kaydı</p>
                <p className="mt-1 text-xs text-muted-foreground">SHA-256 mühürlü resmi ÇŞB pozları ve kurum içi fiyat kataloglarınız kaynak iziyle cetvele bağlanır.</p>
              </div>
              <div className="rounded-sm border border-border bg-card/60 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">IFC 2x3 / 4 / 4X3 & PDF/A</span>
                <p className="mt-1 text-sm font-medium text-foreground">ALLPLAN 2026 e-PYS Kiti & RG 33331</p>
                <p className="mt-1 text-xs text-muted-foreground">EK-1..EK-7 (Tablo 7.1–7.9), EK-9 (Tablo 9.1 Mimari 21 satır & Tablo 9.2 Diğer Disiplinler 16 satır) ve PDF/A ISO 216 pafta & e-imza uyumluluğunu teslim öncesi denetleyin.</p>
              </div>
              <div className="rounded-sm border border-border bg-card/60 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">SmartCheck 3×3 & Minha</span>
                <p className="mt-1 text-sm font-medium text-foreground">TS 500 Kesişim & Boşluk Düşümü</p>
                <p className="mt-1 text-xs text-muted-foreground">≤%3 QTO toleransı, TS 500 paspayı (mm), kiriş–döşeme kesişim ve CSB_2026_V1 Minha düşümlerini doğrulayın.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="border-b border-border bg-card/40 px-6 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl mb-14">
              <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary">GELİŞMİŞ 5D VE KALİTE ÖZELLİKLERİ</p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">Şantiye ve İhale İçin Güçlü Mühendislik Araçları</h2>
              <p className="mt-3 text-base text-muted-foreground">
                BIMMetraj, IFC model ve pafta yüklemeden 5D teklif çıktısına kadar miktar, mevzuat ve fiyat kaynaklarını kanıt iziyle incelemenize olanak tanır.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                    <Boxes size={18} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">5D BIM & TS 500 Metraj Motoru</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    IFC elemanlarında QTO okuma, TS 500 kiriş–döşeme kesişim düşümü, <code className="font-mono text-[11px]">CSB_2026_V1</code> Minha boşluk düşümü ve kalıp/donatı sihirbazı.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-primary font-mono">
                  IFC 2x3/4/4X3 · TS 500 & Minha
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                    <Building2 size={18} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">ÇŞB 2026 Poz & Rayiç Kataloğu</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    SHA-256 mühürlü 570+ onaylı ÇŞB 2026 imalat pozu ve rayiç kaydı; <code className="font-mono text-[11px]">TREpys_PozOzellikSeti.PozNo</code> ve birim uyum kontrolü.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-emerald-400 font-mono">
                  SHA-256 Kaynak & Birim Kontrolü
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                    <FileCheck2 size={18} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">RG 33331 e-PYS & PDF/A Ön Kontrol</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    EK-1..EK-7 (Tablo 7.1–7.9), EK-9 (Tablo 9.1 Mimari 21 satır & Tablo 9.2 Diğer Disiplinler 16 satır), PDF/A ISO 216 pafta, tek pafta ve e-imza (<code className="font-mono text-[11px]">/Sig</code>) denetimi.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-sky-400 font-mono">
                  EK-9 (Tablo 9.1 & 9.2) · PDF/A & e-İmza
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">SmartCheck 3×3 & Disiplin Onayı</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ≤%3 QTO sapması, TS 500 paspayı (mm) ve <code className="font-mono text-[11px]">LoadBearing</code> denetimi; disiplin yetkili (<code className="font-mono text-[11px]">STR/ARC/MEP</code>) mühendis onayı.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-primary font-mono">
                  STR / ARC / MEP Uzman Onay İzi
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW: HOW IT WORKS */}
        <section id="workflow" className="border-b border-border bg-background px-6 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="max-w-3xl">
                <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary">NASIL ÇALIŞIR? · UÇTAN UCA 5D İŞ AKIŞI</p>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  4 Adımda BIM Modelinden Kanıtlı ve Onaylı İhale Teklifine
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  IFC modelinizi, PDF/A paftalarınızı veya Excel metrajınızı yükleyin; RG 33331 e-PYS ön kontrolü, TS 500 &amp; Minha kesinti hesapları ve disiplin yetkili mühendis onayıyla sıfır veri kaybıyla teklif cetveline dönüştürün.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to="/smartcheck"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-xs font-mono text-foreground hover:border-primary/50 transition-colors"
                >
                  Canlı SmartCheck Demosu <ExternalLink size={12} className="text-primary" />
                </Link>
                <Link
                  to="/bim-sozlugu"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  e-PYS &amp; BIM Sözlüğü <FileCode2 size={12} className="text-primary" />
                </Link>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <WorkflowCard
                number="ADIM 01"
                badge="IFC 2x3/4/4X3 · PDF/A · XLSX"
                icon={<FileSpreadsheet size={20} />}
                title="Model, Pafta veya Metraj Yükleyin"
                text="Allplan (2026 e-PYS Kiti v1), Revit veya Archicad IFC modellerinizi, PDF/A paftalarınızı ya da Excel/CSV cetvellerinizi yükleyin. Dosya içindeki kişisel veriler (TCKN, telefon, e-posta) KVKK kapsamında otomatik maskelenir."
                highlights={[
                  'Qto_*BaseQuantities & IfcCovering okuma',
                  'Kat (IfcBuildingStorey), IfcAnnotation & GlobalId',
                  'ALLPLAN 2026 e-PYS Kiti (.dat/.xml) desteği',
                ]}
              />
              <WorkflowCard
                number="ADIM 02"
                badge="RG 33331 EK-9 · TS 500 · MİNHA"
                icon={<SlidersHorizontal size={20} />}
                title="e-PYS & SmartCheck 3×3 Denetimi"
                text="Modeliniz RG 33331 e-PYS kurallarına (EK-1..EK-7 ve disipline göre EK-9 Tablo 9.1 / Tablo 9.2) göre ön kontrolden geçer. TS 500 Sihirbazı kiriş–döşeme kesişimlerini, CSB_2026_V1 motoru ise kapı/pencere Minha düşümlerini hesaplar."
                highlights={[
                  '≤%3 QTO sapma & TS 500 paspayı (mm) kontrolü',
                  'EK-9 Tablo 9.1 (Mimari 21) & Tablo 9.2 (Diğer 16)',
                  'PDF/A ISO 216 pafta boyutu, tek pafta & e-imza',
                ]}
              />
              <WorkflowCard
                number="ADIM 03"
                badge="ÇŞB 2026 · STR / ARC / MEP"
                icon={<ClipboardCheck size={20} />}
                title="Poz Eşleştirme & Uzman Onayı"
                text="Kalemleriniz TREpys_PozOzellikSeti.PozNo veya akıllı arama ile SHA-256 mühürlü ÇŞB 2026 (570+ onaylı poz & rayiç) kataloğuyla eşleşir. Disiplin yetkili mühendis (STR/ARC/MEP) bulguları onaylar veya gerekçeli istisna (override) kaydeder."
                highlights={[
                  'SHA-256 mühürlü ÇŞB 2026 poz & rayiç kataloğu',
                  'Birim uyuşmazlığı (m² ↔ m³ ↔ ton) kilidi',
                  'Disiplin bazlı (STR/ARC/MEP) uzman onay izi',
                ]}
              />
              <WorkflowCard
                number="ADIM 04"
                badge="5D TEKLİF · ESKALASYON · PDF"
                icon={<ShieldCheck size={20} />}
                title="5D Teklif, Simülasyon & Çıktı"
                text="Onaylanan metraj kalemleri tek tıkla 5D İhale Masasına aktarılır. Kâr marjı, genel gider, KDV ve eskalasyon senaryolarını simüle edin; her kalemi IFC GlobalId ve fiyat kanıtıyla resmi PDF/Excel teklifine dönüştürün."
                highlights={[
                  'Kârlılık, opsiyon ve eskalasyon simülasyonu',
                  'GlobalId ve fiyat kaynak izli 5D cetvel',
                  'Kurumsal PDF & Excel ihale/hakediş paketi',
                ]}
              />
            </div>

            {/* Technical Pipeline Summary Bar */}
            <div className="mt-8 rounded-md border border-border bg-card/60 p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs bg-primary/10 border border-primary/30 font-mono text-xs font-bold text-primary">
                  3×3
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Sıfır Kara Kutu (Zero Black-Box) Mühendislik Prensibi
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hiçbir otomatik hesap mühendis onayı olmadan teklife yazılmaz; tüm Minha, kesişim düşümü ve e-PYS bulguları formül ve kaynak referansıyla denetlenebilir.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="rounded-xs border border-border bg-background px-2.5 py-1 text-muted-foreground">
                  Motor: <strong className="text-foreground">CSB_2026_V1</strong>
                </span>
                <span className="rounded-xs border border-border bg-background px-2.5 py-1 text-muted-foreground">
                  Katalog: <strong className="text-emerald-400">570+ Onaylı Poz</strong>
                </span>
                <span className="rounded-xs border border-border bg-background px-2.5 py-1 text-muted-foreground">
                  Mevzuat: <strong className="text-sky-400">RG 33331 EK-9</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <PublicPricingSection />

        {/* EVIDENCE SECTION */}
        <section className="border-b border-border bg-background px-6 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider text-primary">RESMİ DENETİM İZİ</p>
            <h2 className="max-w-3xl text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Her aktarılan kalem, teklifin içine kaynak iziyle girer.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <EvidenceCard title="IFC Kimliği ve Kat" text="Nesnenin IFC GlobalId değeri, sınıfı (IfcWall, IfcBeam, IfcCovering) ve bağlı katı (IfcBuildingStorey)." />
              <EvidenceCard title="Miktar & Kesinti Kaynağı" text="Miktarın hangi QTO setinden okunduğu, TS 500 kesişim ve CSB_2026_V1 Minha düşüm kanıtları." />
              <EvidenceCard title="Disiplin Yetkili Mühendis Onayı" text="STR, ARC veya MEP disiplin yetkisine göre onay, düzeltme veya gerekçeli istisna kararının tarihli kaydı." />
              <EvidenceCard title="SHA-256 Fiyat Kaynak Kaydı" text="Kullanılan ÇŞB 2026 pozu veya kurum içi rayicin birim, belge, tarih ve SHA-256 doğrulama izi." />
            </div>
          </div>
        </section>

        {/* FREE TRIAL CALLOUT SECTION */}
        <section id="trial" className="border-b border-border bg-card/50 px-6 py-16 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-mono font-semibold text-primary uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Kredi Kartı Gerekmez
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Kendi Projenizle 14 Gün Ücretsiz Deneyin.</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Allplan, Revit veya Archicad IFC modelinizi ya da Excel metrajınızı hemen yükleyin. 14 gün boyunca teklif oluşturma, model miktar incelemesi ve e-PYS denetiminizi taahhüt olmadan test edin.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="h-11 shrink-0 bg-primary px-7 text-white hover:bg-primary/90 font-semibold shadow-xs"
            >
              Hemen Ücretsiz Başlayın <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-background px-6 py-12 md:px-8 font-sans">
        <div className="mx-auto grid max-w-6xl gap-8 text-xs text-muted-foreground md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-primary text-xs font-mono font-black text-white">BM</span>
              BIMMetraj
            </div>
            <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
              İnşaat ve mimarlık teknik ekipleri için açık BIM tabanlı metraj çıkarma, poz/fiyat kataloğu entegrasyonu ve resmi ihale masası.
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-mono font-semibold uppercase tracking-wider text-foreground text-xs">Platform</h3>
            <div className="space-y-2">
              <a href="#workflow" className="block hover:text-foreground">Nasıl Çalışır?</a>
              <a href="#features" className="block hover:text-foreground">Özellikler</a>
              <a href="#pricing" className="block hover:text-foreground">Paketler</a>
              <Link to="/smartcheck" className="block hover:text-foreground">SmartCheck Doğrulama</Link>
              <Link to="/bim-sozlugu" className="block hover:text-foreground">BIM & e-PYS Sözlüğü</Link>
              <Link to="/register" className="block text-primary hover:underline">14 Gün Ücretsiz Deneme</Link>
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-mono font-semibold uppercase tracking-wider text-foreground text-xs">İletişim & Yasal</h3>
            <div className="space-y-2">
              <a href="mailto:info@bimmetraj.com" className="block hover:text-foreground font-mono">info@bimmetraj.com</a>
              <Link to="/terms" className="block hover:text-foreground">Kullanım Koşulları</Link>
              <Link to="/privacy" className="block hover:text-foreground">KVKK & Gizlilik Bildirimi</Link>
              <span className="block text-muted-foreground">İstanbul, Türkiye</span>
              <span className="block text-[11px] text-muted-foreground/80">openBIM · buildingSMART · ISO 19650</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-border pt-4 text-[11px] font-mono text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 BIMMetraj · openBIM 5D Metraj & İhale Platformu. Tüm hakları saklıdır.</span>
          <span>openBIM QTO · RG 33331 e-PYS EK-9 & Kanıtlı Metraj</span>
        </div>
      </footer>
    </div>
  );
}

function WorkflowCard({
  number,
  badge,
  icon,
  title,
  text,
  highlights,
}: {
  number: string;
  badge: string;
  icon: ReactNode;
  title: string;
  text: string;
  highlights: string[];
}) {
  return (
    <article className="border border-border bg-card p-5 rounded-md hover:border-primary/40 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-primary font-bold">{number}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="mb-3 inline-block rounded-xs border border-border bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {badge}
        </div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
      <ul className="mt-4 pt-3 border-t border-border/70 space-y-1.5 text-[11px] font-mono text-muted-foreground">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <Check size={12} className="text-primary shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function EvidenceCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="border border-border bg-card/60 p-4 rounded-md">
      <CheckCircle2 className="text-emerald-400" size={16} />
      <h3 className="mt-3 font-semibold text-foreground text-sm">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </article>
  );
}
