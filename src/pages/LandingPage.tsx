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
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PaftaDrawing } from '@/components/ui/PaftaDrawing';

type LandingPageProps = {
  onGetStarted: () => void;
  onPilotRequest?: () => void;
};

const LANDING_ROUTE_META: Record<string, { title: string; description: string; canonicalPath: string }> = {
  '/pricing': {
    title: 'Paketler ve Fiyatlandırma | BIMMetraj 5D İhale & IFC Metraj Platformu',
    description: 'Teknik ofisler için paket kotalarını; 6 ay (%10), 1 yıl (%20) ve 2 yıl (%30) peşin ödeme avantajlarını, tekil sipariş referansı ve dekont kontrollü Havale/EFT akışıyla inceleyin.',
    canonicalPath: '/pricing',
  },
  '/features': {
    title: 'Özellikler — IFC QTO, TS 500 Sihirbazı, SmartCheck & RG 33331 e-PYS | BIMMetraj',
    description: 'openBIM IFC 2x3/4/4X3 metraj çıkarma, TS 500 kiriş-döşeme kesişim ve CSB_2026_V1 Minha düşümü, kaynağı kayıtlı firma fiyatları ve RG 33331 EK-9 ön kontrolü.',
    canonicalPath: '/features',
  },
  '/about': {
    title: 'Nasıl Çalışır? — 4 Adımda Kanıta Dayalı 5D Metraj ve İhale İş Akışı | BIMMetraj',
    description: 'IFC, PDF/A ve Excel dosyalarından RG 33331 e-PYS ön kontrolü, SmartCheck 3x3 & Minha denetimi ve disiplin yetkili mühendis onayıyla 5D teklif cetveline geçiş iş akışı.',
    canonicalPath: '/about',
  },
  '/': {
    title: 'BIMMetraj | openBIM (IFC) Metraj, e-PYS & 5D İhale Masası',
    description: 'BIMMetraj — İnşaat ve teknik ofis ekipleri için açık BIM (IFC) ve Excel tabanlı metraj çıkarma, ÇŞB 2026 poz entegrasyonu, TS 500 & Minha motoru ve SmartCheck denetimli teklif platformu.',
    canonicalPath: '/',
  },
};

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageMeta = LANDING_ROUTE_META[location.pathname] ?? LANDING_ROUTE_META['/'];

  // Erken Erişim / Ön Kayıt (Potansiyel Müşteri) Form Durumu
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistNameOrCompany, setWaitlistNameOrCompany] = useState('');
  const [waitlistRole, setWaitlistRole] = useState('Müteahhit / Teknik Ofis');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistResult, setWaitlistResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = waitlistEmail.trim().toLowerCase();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setWaitlistResult({ ok: false, message: 'Lütfen geçerli bir e-posta adresi girin.' });
      return;
    }
    setWaitlistSubmitting(true);
    setWaitlistResult(null);
    try {
      const nameClean = waitlistNameOrCompany.trim();
      const res = await fetch('/api/pilot-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailClean,
          fullName: nameClean || undefined,
          companyName: nameClean || 'Erken Erişim Ön Kayıt',
          teamSize: waitlistRole,
          currentWorkflow: `Ana sayfa ön kayıt formu (${waitlistRole})`,
          source: 'landing_waitlist',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Ön kayıt işlemi tamamlanamadı.');
      }
      setWaitlistEmail('');
      setWaitlistNameOrCompany('');
      setWaitlistResult({
        ok: true,
        message: body.alreadyRegistered
          ? 'Bu e-posta adresi zaten erken erişim ön kayıt listemizde yer alıyor.'
          : 'Ön kaydınız başarıyla alındı! Yeni sürüm ve erken erişim açıldığında ilk size haber vereceğiz.',
      });
    } catch (err: any) {
      setWaitlistResult({
        ok: false,
        message: err?.message || 'Kayıt sırasında bir hata oluştu, lütfen tekrar deneyin.',
      });
    } finally {
      setWaitlistSubmitting(false);
    }
  };

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
      {/* GELİŞTİRME AŞAMASI BİLGİLENDİRME ŞERİDİ */}
      <div role="region" aria-label="Proje geliştirme duyurusu" className="border-b border-border bg-card px-4 py-2.5 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="stamp-badge border-primary bg-primary text-primary-foreground">
              GELİŞTİRME AŞAMASINDADIR
            </span>
            <span className="text-foreground font-medium">
              BIMMetraj şu anda aktif mühendislik geliştirme ve saha doğrulama aşamasındadır.
            </span>
          </div>
          <a
            href="#on-kayit"
            className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary underline underline-offset-4 hover:opacity-80"
          >
            Ön Kayıt &amp; Erken Erişim Listesine Katıl ↓
          </a>
        </div>
      </div>

      {/* STICKY NAVBAR (PAFTA ANTETİ) */}
      <nav className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur-md md:px-10">
        <a href="#top" className="flex items-center gap-3 text-foreground">
          <span className="flex h-8 w-8 items-center justify-center border border-primary bg-primary text-xs font-mono font-bold text-primary-foreground">
            BM
          </span>
          <div className="flex flex-col">
            <span className="font-display-serif text-2xl leading-none tracking-tight">BIMMetraj</span>
            <span className="mt-1 text-[10px] text-muted-foreground font-mono tracking-widest uppercase">openBIM &amp; 5D İhale Masası</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#on-kayit" className="text-xs font-semibold text-primary transition-colors hover:opacity-80">Ön Kayıt</a>
          <a href="#workflow" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">Nasıl Çalışır?</a>
          <a href="#features" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">Özellikler</a>
          <a href="#pricing" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">Paketler</a>
          <Link to="/smartcheck" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">SmartCheck Demo</Link>

          <div className="h-5 w-px bg-border mx-1" />

          <ThemeToggle />

          <Button variant="ghost" size="sm" className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={onGetStarted}>
            Giriş Yap
          </Button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="pafta-button !min-h-9 !py-2 !px-4"
          >
            <span>Teklif Hazırlayın</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle showLabel={false} />
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
            className="bg-primary text-xs text-primary-foreground px-3 font-semibold"
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
        <div className="md:hidden border-b border-border bg-card px-6 py-4 space-y-3 sticky top-20 z-40">
          <a
            href="#on-kayit"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-primary py-1"
          >
            Ön Kayıt (Geliştirme Aşaması)
          </a>
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
            <Button className="w-full bg-primary text-primary-foreground font-medium" onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}>
              14 Gün Ücretsiz Başla
            </Button>
          </div>
        </div>
      )}

      <main id="top">
        {/* HERO SECTION (PAFTA ANTETİ + EDİTÖRYAL BAŞLIK + TEKNİK İZOMETRİK ÇİZİM) */}
        <section className="relative overflow-hidden border-b border-border px-6 pb-20 pt-8 md:px-10 md:pb-24">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-8 flex items-center justify-between border-b border-border pb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>DİJİTAL PROJE / METRAJ &amp; e-PYS PAFTASI</span>
              <span>TEKNİK REHBER &amp; 5D İHALE — 2026</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <div className="eyebrow mb-4">
                  <span className="status-dot" />
                  <span>openBIM QTO · ÇŞB 2026 Poz &amp; Rayiç Kataloğu · RG 33331 e-PYS EK-9 Ön Kontrol</span>
                </div>

                <h1 className="font-display-serif text-4xl sm:text-6xl lg:text-7xl text-foreground">
                  İhale Masasında <em>Hata Payı</em> Bırakmayın.
                </h1>
                <p className="mt-6 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground font-normal">
                  IFC modellerinizi, PDF/A paftalarınızı ve Excel metrajlarınızı ÇŞB 2026 poz kataloğuyla eşleştirin; TS 500 kiriş–döşeme kesişim düşümü, <code className="text-xs font-mono text-primary">CSB_2026_V1</code> Minha motoru ve RG 33331 e-PYS ön kontrolü ile teslim öncesi denetleyin.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="pafta-button"
                  >
                    <span>14 Gün Ücretsiz Başlayın</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/smartcheck')}
                    className="pafta-button-secondary"
                  >
                    <span>SmartCheck Demosunu İnceleyin</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <PaftaDrawing
                  captionLeft="01 / MODEL → TESLİM"
                  captionCenter="İZOMETRİK METRAJ / 01"
                  captionRight="IFC4 + PDF/A"
                />
              </div>
            </div>

            {/* ERKEN ERİŞİM & ÖN KAYIT PAFTASI (POTANSİYEL MÜŞTERİ KAYDI) */}
            <div id="on-kayit" className="mt-12 border border-primary/50 bg-card p-6 md:p-8 scroll-mt-24">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="status-dot" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
                    00 / PROJE GELİŞTİRME BİLDİRİMİ &amp; ERKEN ERİŞİM ÖN KAYIT FORMU
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  DURUM: AKTİF AR-GE &amp; SAHA DOĞRULAMA FAZI
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5">
                  <h2 className="font-display-serif text-2xl sm:text-3xl text-foreground">
                    Projemiz Geliştirme Aşamasındadır — <em>Ön Kayıt</em> Oluşturun
                  </h2>
                  <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    BIMMetraj şu anda gerçek ALLPLAN / Revit / Archicad IFC modelleriyle kapalı mühendislik doğrulama aşamasındadır. E-posta adresinizi bırakarak erken erişim daveti, kendi IFC dosyanızla ücretsiz test hakkı ve kurucu üye avantajlarından ilk siz haberdar olun.
                  </p>
                </div>

                <div className="lg:col-span-7">
                  <form onSubmit={handleWaitlistSubmit} className="space-y-3" aria-label="Erken erişim ön kayıt formu">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label htmlFor="waitlist-email" className="block">
                        <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          E-Posta Adresiniz *
                        </span>
                        <input
                          id="waitlist-email"
                          type="email"
                          required
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          placeholder="ornek@firmaniz.com"
                          className="h-11 w-full border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label htmlFor="waitlist-name" className="block">
                        <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Ad Soyad / Firma (İsteğe Bağlı)
                        </span>
                        <input
                          id="waitlist-name"
                          type="text"
                          value={waitlistNameOrCompany}
                          onChange={(e) => setWaitlistNameOrCompany(e.target.value)}
                          placeholder="Ad Soyad veya Ofis Adı"
                          className="h-11 w-full border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Uzmanlık / Alan
                        </span>
                        <select
                          value={waitlistRole}
                          onChange={(e) => setWaitlistRole(e.target.value)}
                          className="h-11 w-full border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="Müteahhit / Teknik Ofis">Müteahhit / Teknik Ofis</option>
                          <option value="Mimar / BIM Yöneticisi">Mimar / BIM Yöneticisi</option>
                          <option value="İnşaat / Statik Mühendisi">İnşaat / Statik Mühendisi</option>
                          <option value="Yapı Denetim / İdare">Yapı Denetim / İdare</option>
                          <option value="Diğer">Diğer</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-muted-foreground">
                        Spam gönderilmez. Yalnızca erken erişim daveti ve önemli sürüm kilometre taşları paylaşılır.
                      </p>
                      <button
                        type="submit"
                        disabled={waitlistSubmitting}
                        className="pafta-button !min-h-10 !py-2.5 !px-5"
                      >
                        <span>{waitlistSubmitting ? 'Kaydediliyor...' : 'Ön Kayıt Oluştur'}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {waitlistResult && (
                      <div
                        role="status"
                        className={`mt-2 border p-3 text-xs font-medium ${
                          waitlistResult.ok
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-destructive/40 bg-destructive/10 text-destructive'
                        }`}
                      >
                        {waitlistResult.message}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* PRODUCT SHOWCASE MOCKUP (Pafta & Metraj Cetveli) */}
            <div className="mt-14 overflow-hidden border border-border bg-card">
              {/* Mockup Title Block (Pafta Anteti) */}
              <div className="border-b border-border bg-background px-5 py-3 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">PROJE: <strong className="text-foreground">Kadıköy Konutları Kaba Yapı</strong></span>
                  <span className="hidden sm:inline text-muted-foreground">REV: <strong className="text-primary font-bold">02</strong></span>
                  <span className="hidden md:inline text-muted-foreground">VERİ TÜRÜ: <strong className="text-foreground">Sentetik ürün demosu</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="stamp-badge border-primary/40 text-primary bg-primary/10">
                    <BadgeCheck size={13} className="shrink-0" />
                    Sentetik Demo · Uzman Onayı Değil
                  </span>
                  <span className="text-muted-foreground">ÖRNEK PAFTA: <strong className="text-foreground tabular-nums">REV-02</strong></span>
                </div>
              </div>

              {/* Split Workspace View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Left: Structural CAD / Wireframe preview */}
                <div className="lg:col-span-5 p-5 bg-background flex flex-col justify-between min-h-[260px]">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} className="text-primary" />
                      IFC Yapısal Model (STR)
                    </span>
                    <span className="text-primary font-semibold">● 142 Eleman Ayrıştırıldı</span>
                  </div>

                  {/* Wireframe Graphic Illustration */}
                  <div className="relative h-44 border border-border bg-card p-4 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-hairline-grid opacity-50" />
                    {/* Isometric structural wireframe representation */}
                    <div className="relative z-10 w-full max-w-[200px] h-28 border border-primary/40 bg-background flex flex-col justify-between p-2 font-mono text-[10px] text-muted-foreground">
                      <div className="flex justify-between border-b border-border pb-1">
                        <span>C30/37 KOLON</span>
                        <span className="text-primary font-semibold">420.00 m³</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>B420C DONATI</span>
                        <span className="text-foreground font-semibold">34.50 ton</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1">
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
                <div className="lg:col-span-7 overflow-x-auto" tabIndex={0} role="region" aria-label="Metraj Cetveli ve Fiyat Dağılımı">
                  <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between font-mono text-xs">
                    <span className="font-semibold text-foreground">Örnek Metraj Cetveli & Demo Fiyat Dağılımı</span>
                    <span className="text-muted-foreground tabular-nums">Sentetik toplam: <strong className="text-foreground">2.888.250,00 ₺</strong></span>
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
                <p className="mt-1 text-sm font-medium text-foreground">18.848 Kaynak Satırı · Kullanım Yetkisi Ayrı Kapı</p>
                <p className="mt-1 text-xs text-muted-foreground">ÇŞB 2026 birim fiyat kitaplarından okunan satırlar ile firmanızın kendi fiyat kataloğu ayrı tutulur. Cetvele yalnız kullanım izni yetkili kişi tarafından incelenmiş, firmanıza ait ve geçerlilik süresi dolmamış fiyatlar bağlanır; kayıt hukuki geçerliliği otomatik doğrulamaz.</p>
              </div>
              <div className="rounded-sm border border-border bg-card/60 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">IFC 2x3 / 4 / 4X3 · ISO 19650 & PDF/A</span>
                <p className="mt-1 text-sm font-medium text-foreground">e-PYS & ISO 19650 Kanıtlı Ön Kontrol</p>
                <p className="mt-1 text-xs text-muted-foreground">EK-1..EK-9 ve CDE/LOIN kontrolleri kanıt durumunu raporlar. e-PYS belge kimliği veya lisanslı ISO metni doğrulanmadıysa sonuç uzman incelemesinde kalır.</p>
              </div>
              <div className="rounded-sm border border-border bg-card/60 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">SmartCheck 3×3 & Minha</span>
                <p className="mt-1 text-sm font-medium text-foreground">ÇŞB 0,50 m² · DIN 18350 2,50 m² · Özel Eşik</p>
                <p className="mt-1 text-xs text-muted-foreground">Şirket politikası olan ≤%3 QTO/STR kontrollerini standart incelemesinden ayırın; Minha'yı host, hedef kalem ve brüt/net ölçü esasıyla tek kez uygulayın.</p>
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
                BIMMetraj, IFC model ve pafta yüklemeden 5D teklif çıktısına kadar miktar, mevzuat ve fiyat kaynaklarını kanıt iziyle incelemenize olanak tanır. Dosyada yüksek önem düzeyinde miktar bulgusu varsa teklif aktarımı inceleme için durdurulur.
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
                    IFC elemanlarında QTO okuma, TS 500 kiriş–döşeme kesişim düşümü, <code className="font-mono text-[11px]">CSB_2026 (0,50 m²)</code> / <code className="font-mono text-[11px]">DIN_18350 (2,50 m²)</code> / özel şartname Minha düşümü ve kalıp/donatı sihirbazı.
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
                  <h3 className="text-base font-bold text-foreground mb-1.5">ÇŞB 2026 Kitapları & Firma Kataloğu</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    18.848 ayrıştırılmış ÇŞB 2026 kaynak satırı (İnşaat/Mekanik/Elektrik) yapısal denetime tabidir; ticari kullanım yetkisi ayrıca kaydedilir. Kurum içi BYOL yükleme ve <code className="font-mono text-[11px]">TREpys_PozOzellikSeti.PozNo</code> birim uyum kontrolü.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-emerald-400 font-mono">
                  18.848 Kaynak Satırı · Yetki Kanıtı & BYOL
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                    <FileCheck2 size={18} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">RG 33331 e-PYS, ISO 19650 & PDF/A</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    EK-1..EK-9 ön kontrolü, PDF/A kimlik/ISO 216 pafta ve e-imza yapısal ön kontrolü ile CDE/LOIN kontrolü. <code className="font-mono text-[11px]">/Sig</code> bulgusu kriptografik güven kanıtı değildir; harici validator veya belge kimliği yoksa otomatik uygunluk verilmez.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-sky-400 font-mono">
                  RG 33331 EK-9 · ISO 19650 Desteği
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">4734 KİK m.38 ADT & SmartCheck 3×3</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Kullanıcı girdili Genel Tebliğ m.45.1.1 Sınır Değer (SD); kaynak kimlikli idare YM cetvelinden %80 listesi; şirket politikası olan ≤%3 QTO/STR kontrolü ve ayrı lisanslı standart incelemesi.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-border text-[11px] text-primary font-mono">
                  KİK m.45.1 SD · STR / ARC / MEP Onayı
                </div>
              </div>
            </div>

            {/* Dated Roadmap Badges Bar (YOL_HARITASI §7 Karar #2 & #6) */}
            <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground font-semibold">Şeffaf Ürün Vitrini (Kanıt Kapısı L3):</strong>{' '}
                Pilot özellikler kural motorları ve altın testlerle kontrol edilir; bağımsız uzman onayı henüz yoktur. Geliştirme aşamasındaki modüller yol haritası rozetiyle ayrı gösterilir.
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-mono">
                <span className="rounded-xs border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                  Pilot/L2 · Hakediş Çekirdeği Varsayılan Kapalı · Resmî EKAP Gönderimi Yok
                </span>
                <span className="rounded-xs border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                  Kısmi · veraPDF Runtime & Lisanslı PDF/A Dönüşümü Bekliyor
                </span>
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
                  4 Adımda BIM Modelinden Kanıtı Görünen, Sizin Onayınızla Hazırlanan Teklife
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  IFC modelinizi, PDF/A paftalarınızı veya Excel metrajınızı yükleyin; e-PYS ön kontrolü ve hesap sonuçlarını yetkili kullanıcı olarak inceleyin. Uzmanlık ve mühendislik kabulü ayrıca değerlendirilmelidir.
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
                text="Modeliniz e-PYS kural kopyalarıyla ön kontrolden geçer; her EK-9 satırı otomatik/manuel mod ve kanıt referansı taşır. 3×3 şirket politikası standart kararından ayrılır; Minha motoru host, hedef kalem ve brüt/net ölçü esasına göre tek düşüm yapar."
                highlights={[
                  '≤%3 QTO şirket politikası & lisanslı standart inceleme ayrımı',
                  'EK-9 Tablo 9.1 (Mimari 21) & Tablo 9.2 (Diğer 16)',
                  'Kaynak kimlikli 3B inceleme; QTO ve özellik kaynak yolu ayrı gösterilir',
                ]}
              />
              <WorkflowCard
                number="ADIM 03"
                badge="ÇŞB 2026 · STR / ARC / MEP"
                icon={<ClipboardCheck size={20} />}
                title="Poz Eşleştirme & İnceleme"
                text="Kalemleriniz poz numarası veya denetimli arama ile firmanızın kayıtlı fiyatlarıyla eşleşir. Birim, geçerlilik veya kullanım izni eksikse fiyat otomatik seçilmez; yetkili kişinin incelemesi gerekir."
                highlights={[
                  'Kaynak izi + yetkili kişi tarafından kaydedilen kullanım izni incelemesi',
                  'Birim uyuşmazlığı (m² ↔ m³ ↔ ton) kilidi',
                  'Yetkili kullanıcı inceleme izi; uzmanlık ayrıca doğrulanır',
                ]}
              />
              <WorkflowCard
                number="ADIM 04"
                badge="5D TEKLİF · ESKALASYON · PDF"
                icon={<ShieldCheck size={20} />}
                title="5D Teklif, Simülasyon & Çıktı"
                text="Seçilen icmal satırları aynı IFC dosyasından sunucuda yeniden kurulur ve yalnız kayıtlı fiyatla teklifin yeni bir sürümüne aktarılır. Önceki sürüm korunur; dosya kimliği, model elemanı ve fiyat kaynağı her satırda saklanır."
                highlights={[
                  'Kârlılık, opsiyon ve eskalasyon simülasyonu',
                  'Kaynağı kayıtlı, önceki sürümü korunan teklif',
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
                    Geometriden türetilen miktarlar otomatik metraj kanıt satırına alınmaz. Kaynak yolu ve inceleme kararı kontrol edilmelidir; AI tahmini doğrulanmış metraj veya fiyat değildir ve uzman incelemesi gerektirir.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="rounded-xs border border-border bg-background px-2.5 py-1 text-muted-foreground">
                  Motor: <strong className="text-foreground">CSB_2026_V1</strong>
                </span>
                <span className="rounded-xs border border-border bg-background px-2.5 py-1 text-muted-foreground">
                  Fiyat kapısı: <strong className="text-emerald-400">Yetki + Onay + Geçerlilik</strong>
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
              <EvidenceCard title="Yetkili Kullanıcı İncelemesi" text="Yetkili kullanıcının onay, düzeltme veya gerekçeli istisna kararının tarihli kaydı; disiplin uzmanlığı ve mühendislik kabulü ayrıca değerlendirilir." />
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
              className="h-11 shrink-0 bg-primary px-7 text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs"
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
              <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-primary text-xs font-mono font-black text-primary-foreground">BM</span>
              BIMMetraj
            </div>
            <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
              İnşaat ve mimarlık teknik ekipleri için açık BIM tabanlı metraj çıkarma, firma fiyat kataloğu ve teknik ofis teklif çalışma alanı.
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
              <Link to="/hesaplayicilar" className="block hover:text-foreground">Ücretsiz Hesaplayıcılar</Link>
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
              <span className="block text-[11px] text-muted-foreground/80">openBIM · buildingSMART IFC · RG 33331 e-PYS</span>
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
