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
  Sparkles,
  Building2,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';

type LandingPageProps = {
  onGetStarted: () => void;
  onPilotRequest?: () => void;
};

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200">
      {/* STICKY NAVBAR */}
      <nav className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-zinc-800/80 bg-[#09090b]/95 px-6 backdrop-blur-md md:px-8">
        <a href="#top" className="flex items-center gap-3 font-semibold tracking-tight text-white" aria-label="TeklifPro ana sayfa">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-sm font-black text-white shadow-lg shadow-orange-600/20">TP</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-tight">TeklifPro</span>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">openBIM & 5D Teklif</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-7 md:flex">
          <a href="#workflow" className="text-sm text-zinc-400 transition-colors hover:text-white">Nasıl çalışır?</a>
          <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-white">Özellikler</a>
          <a href="#pricing" className="text-sm text-zinc-400 transition-colors hover:text-white">Fiyatlandırma</a>
          <Button variant="ghost" className="text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm" onClick={onGetStarted}>Giriş yap</Button>
          <Button 
            onClick={() => navigate('/register')}
            className="bg-orange-600 px-5 text-white hover:bg-orange-700 font-medium text-sm shadow-md shadow-orange-600/20"
          >
            14 Gün Ücretsiz Başla
          </Button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onGetStarted}
            className="text-xs text-zinc-300"
          >
            Giriş
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/register')}
            className="bg-orange-600 text-xs text-white px-3 font-semibold"
          >
            Ücretsiz Başla
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white focus:outline-none"
            aria-label="Menüyü aç/kapat"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-[#0c0c0e] px-6 py-4 space-y-3 sticky top-20 z-40">
          <a 
            href="#workflow" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 py-1 hover:text-orange-400"
          >
            Nasıl çalışır?
          </a>
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 py-1 hover:text-orange-400"
          >
            Özellikler
          </a>
          <a 
            href="#pricing" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 py-1 hover:text-orange-400"
          >
            Fiyatlandırma
          </a>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="outline" className="w-full text-zinc-200 border-zinc-700" onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}>
              Giriş yap
            </Button>
            <Button className="w-full bg-orange-600 text-white font-bold" onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}>
              14 Gün Ücretsiz Başla
            </Button>
          </div>
        </div>
      )}

      <main id="top">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-zinc-800/80 px-6 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28">
          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-6 inline-flex items-center gap-2 border border-orange-500/25 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-300 rounded-full">
              <span className="h-2 w-2 rounded-full bg-orange-400" aria-hidden="true" />
              IFC, Excel metrajı ve kaynak izli fiyatlarla teklif hazırlama
            </div>
            <h1 className="max-w-5xl text-4xl font-black leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
              Metrajınızı modelden alın,
              <span className="block text-orange-400 mt-2">
                teklifinizi kanıtla verin.
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-xl font-normal">
              Allplan, Revit veya Archicad <code className="text-orange-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-sm">.ifc</code> modelinizi ya da Excel metrajınızı yükleyin. TeklifPro, desteklenen QTO ve özellik setlerinden hacimleri okur. Miktarları ve fiyat kaynaklarını inceleyip onaylayarak teklif taslağı ve PDF oluşturun.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button 
                onClick={() => navigate('/register')}
                size="lg" 
                className="h-13 bg-orange-600 px-7 text-white hover:bg-orange-700 font-bold w-full sm:w-auto shadow-lg shadow-orange-600/20"
              >
                14 Gün Ücretsiz Başlayın <ArrowRight size={18} className="ml-2" />
              </Button>
              <a href="#pricing" className="inline-flex h-13 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/80 px-7 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white">
                Paketleri ve Fiyatları Görün
              </a>
            </div>
            <div className="mt-14 grid max-w-4xl grid-cols-1 gap-4 border-t border-zinc-800/80 pt-6 text-sm text-zinc-400 sm:grid-cols-3">
              <TrustPoint title="Modelden Doğrudan Okunur" text="Desteklenen eleman hacimleri IFC miktar ve özellik setlerinden kaynak referanslarıyla okunur." />
              <TrustPoint title="Siz Onaylarsınız" text="Her bir metraj kalemi insan onayından geçer; kontrolünüz olmadan teklife girmez." />
              <TrustPoint title="Poz ve Özellik Ön Kontrolü" text="Modeldeki poz numarası ve desteklenen özellik alanlarını kontrol edin; eksikleri teknik incelemeye alın." />
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="border-b border-zinc-800 bg-[#070709] px-6 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-400">GELİŞMİŞ 5D VE KALİTE ÖZELLİKLERİ</p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Şantiye ve İhale İçin Güçlü Araçlar</h2>
              <p className="mt-4 text-base text-zinc-400">
                TeklifPro, dosya yüklemeden teklif PDF'i oluşturmaya kadar miktar ve fiyat kaynaklarını incelemenize yardımcı olur.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-5">
                    <Boxes size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">5D BIM Metraj Motoru</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Desteklenen IFC elemanlarında QTO ve özellik seti hacimlerini kaynak referanslarıyla okuma ve inceleme.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs text-orange-400 font-mono">
                  openBIM · QTO Standart
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                    <Building2 size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Fiyat Kataloğu ve Kaynak İzi</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    İçe aktardığınız kataloglardan ve manuel fiyat kayıtlarından yararlanın; kaynağı, tarihi ve birim uyumunu doğrulayın.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs text-emerald-400 font-mono">
                  Kaynak ve Tarih Kontrolü
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
                    <FileCheck2 size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">e-PYS Teknik Ön Kontrol</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Desteklenen poz, parsel özelliği ve isimlendirme kurallarına göre ön inceleme. Sonuçlar teknik değerlendirme gerektirir.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs text-sky-400 font-mono">
                  Sınırlı Kural Kapsamı
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">SmartCheck Kaynak İzi</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    SmartCheck üzerinden aktarılan kalemlerin miktar kaynağını ve inceleme geçmişini takip edin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs text-indigo-400 font-mono">
                  Kaynak ve İnceleme Kaydı
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW: HOW IT WORKS */}
        <section id="workflow" className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-24 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-medium text-orange-400">İŞ AKIŞI</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">3 adımda modelden incelenmiş teklif taslağına.</h2>
              <p className="mt-5 text-lg leading-relaxed text-zinc-400">Dosyanızı yükleyin, miktar ve isimlendirmeleri denetleyin, onayladıklarınızı teklife aktarın.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <WorkflowCard number="01" icon={<FileSpreadsheet />} title="Dosyayı Yükleyin" text="Allplan/Revit IFC modeli ya da Excel/CSV metrajı. Modeliniz güvenli şekilde işlenir." />
              <WorkflowCard number="02" icon={<ClipboardCheck />} title="Denetleyin & Eşleştirin" text="Hacimleri, poz alanlarını ve fiyat kaynaklarını inceleyin." />
              <WorkflowCard number="03" icon={<ShieldCheck />} title="Teklife Aktarın & PDF Alın" text="Onayladığınız kalemlerden, kâr marjınızı ekleyerek teklif taslağı ve PDF oluşturun." />
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="border-b border-zinc-800 bg-[#09090b] px-6 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-400">ŞEFFAF VE ESNEK PAKETLER</p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Her İhtiyaca Uygun Fiyatlandırma</h2>
              <p className="mt-4 text-base text-zinc-400">
                Desteklenen e-PYS kurallarıyla teknik ön kontrol yapın veya model miktarlarını inceleyerek teklif hazırlayın. Kredi kartı gerekmez.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {/* PLAN 0: TRIAL */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <h3 className="text-base font-bold text-white">Ücretsiz Deneme</h3>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">14 Gün</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-emerald-400">0 ₺</span>
                    <span className="text-zinc-500 text-xs ml-1">/ 14 gün</span>
                  </div>
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span><strong>5 Adet</strong> Teklif Kotası</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span><strong>1 Adet</strong> IFC Analizi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>Maks <strong>35 MB</strong> Dosya</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>Temel Metraj & e-PYS Denetimi</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => navigate('/register')}
                  variant="outline" 
                  className="w-full mt-6 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs py-2"
                >
                  Ücretsiz Başlayın
                </Button>
              </div>

              {/* PLAN 1: e-PYS MİKRO */}
              <div className="rounded-2xl border border-sky-500/20 bg-sky-950/10 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <h3 className="text-base font-bold text-white">e-PYS Standart</h3>
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">Mikro Plan</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-white">₺390</span>
                    <span className="text-zinc-500 text-xs ml-1">/ ay</span>
                  </div>
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2 text-zinc-400">
                      <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-[10px] shrink-0">-</span>
                      <span>Teklif Modülü Dahil Değil</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-sky-400 shrink-0" />
                      <span><strong>50 Model</strong> İsimlendirme Denetimi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-sky-400 shrink-0" />
                      <span>Maks <strong>50 MB</strong> Dosya</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-sky-400 shrink-0" />
                      <span>Desteklenen e-PYS Kuralları Ön Kontrolü</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => navigate('/register')}
                  variant="outline" 
                  className="w-full mt-6 border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs py-2"
                >
                  Denetçiyi Seçin
                </Button>
              </div>

              {/* PLAN 2: TEKLİF & ŞANTİYE */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <h3 className="text-base font-bold text-white">Teklif & Şantiye</h3>
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">Başlangıç</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-white">₺1.450</span>
                    <span className="text-zinc-500 text-xs ml-1">/ ay</span>
                  </div>
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span><strong>30 Adet</strong> Teklif Kotası</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span><strong>2 Adet</strong> IFC Analizi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span>Maks <strong>30 MB</strong> Dosya</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span>Excel Metrajı & Fiyat Kataloğu</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => navigate('/register')}
                  variant="outline" 
                  className="w-full mt-6 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs py-2"
                >
                  Hemen Başlayın
                </Button>
              </div>

              {/* PLAN 3: 5D BIM (POPÜLER) */}
              <div className="rounded-2xl border-2 border-orange-500 bg-orange-950/15 p-6 flex flex-col justify-between relative shadow-xl shadow-orange-600/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  En Çok Tercih Edilen
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-3 mt-1">
                    <h3 className="text-base font-bold text-white">5D BIM & SmartCheck</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-white">₺3.950</span>
                    <span className="text-zinc-500 text-xs ml-1">/ ay</span>
                  </div>
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span><strong>150 Adet</strong> Teklif Kotası</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span><strong>25 Adet</strong> IFC Analizi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span>Maks <strong>100 MB</strong> Model Boyutu</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span><strong>2 Eşzamanlı</strong> İşlem Kapasitesi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-orange-400 shrink-0" />
                      <span>SmartCheck Kalite & Kaynak İzi</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => navigate('/register')}
                  className="w-full mt-6 bg-orange-600 text-white hover:bg-orange-700 text-xs py-2 font-bold shadow-md shadow-orange-600/20"
                >
                  5D BIM'e Başlayın
                </Button>
              </div>

              {/* PLAN 4: KURUMSAL */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <h3 className="text-base font-bold text-white">Kurumsal Taahhüt</h3>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">Kurumsal</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-white">₺8.900</span>
                    <span className="text-zinc-500 text-xs ml-1">/ ay</span>
                  </div>
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-400 shrink-0" />
                      <span><strong>99.999</strong> Teklif Kotası</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-400 shrink-0" />
                      <span><strong>100 Adet</strong> IFC Analizi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-400 shrink-0" />
                      <span>Maks <strong>100 MB</strong> Büyük Proje</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-400 shrink-0" />
                      <span><strong>4 Eşzamanlı</strong> İş & Öncelikli Kuyruk</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-400 shrink-0" />
                      <span>Ekip Yönetimi & Özel Destek</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  onClick={() => { window.location.href = 'mailto:info@teklifpro.ai'; }}
                  variant="outline" 
                  className="w-full mt-6 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs py-2"
                >
                  İletişime Geçin
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* EVIDENCE SECTION */}
        <section className="border-b border-zinc-800 px-6 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-sm font-medium text-orange-400">RESMİ DENETİM İZİ</p>
            <h2 className="max-w-3xl text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Her aktarılan kalem, teklifin içine kaynak iziyle girer.
            </h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
              <EvidenceCard title="IFC Kimliği ve Kat" text="Nesnenin IFC GlobalId değeri, sınıfı (IfcWall, IfcBeam) ve bağlı katı." />
              <EvidenceCard title="Miktar Kaynağı" text="Miktarın hangi IFC miktar setinden (Qto_WallBaseQuantities vb.) okunduğu." />
              <EvidenceCard title="Mühendis Onayı" text="Onay, düzeltme veya gerekçeli istisna kararının tarihli kayıt altına alınması." />
              <EvidenceCard title="Fiyat Kaynak Kaydı" text="Kullanılan poz, fiyat, belge ve tarih bilgilerini inceleyin." />
            </div>
          </div>
        </section>

        {/* REGULATION SECTION */}
        <section className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-sm font-medium text-orange-400">DİJİTAL RUHSAT VE KAMU İHALESİ HAZIRLIĞI</p>
            <h2 className="text-3xl font-semibold text-white">Model teslimine teknik ön kontrolle hazırlanın.</h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-zinc-400">
              Desteklenen IFC özellik ve miktar kaynaklarını kontrol edin; teslim şartlarını projenizin güncel şartnamesiyle ayrıca doğrulayın.
            </p>
          </div>
        </section>

        {/* FREE TRIAL CALLOUT SECTION */}
        <section id="trial" className="border-y border-orange-500/20 bg-orange-500/[0.06] px-6 py-20 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-orange-400 tracking-wider uppercase">
                <span className="h-2 w-2 rounded-full bg-orange-400" /> Kredi Kartı Gerekmez
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Kendi Projenizle 14 Gün Ücretsiz Deneyin.</h2>
              <p className="mt-4 leading-relaxed text-zinc-300">
                Allplan, Revit veya Archicad IFC modelinizi ya da Excel metrajınızı hemen sisteme yükleyin. 14 gün boyunca 5 teklifinizi, model miktar incelemenizi ve e-PYS denetiminizi hiçbir taahhüt olmadan test edin.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="h-13 shrink-0 bg-orange-600 px-8 text-white hover:bg-orange-700 font-bold shadow-lg shadow-orange-600/20"
            >
              Hemen Ücretsiz Başlayın <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-[#09090b] px-6 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 text-sm text-zinc-500 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-sm font-black text-white">TP</span>
              TeklifPro
            </div>
            <p className="mt-5 max-w-sm leading-relaxed">
              İnşaat ve mimarlık ekipleri için model tabanlı metraj, e-PYS denetimi ve kanıtlı teklif platformu.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-medium text-zinc-300">Platform</h3>
            <a href="#workflow" className="block py-1 hover:text-orange-400">Nasıl Çalışır?</a>
            <a href="#features" className="block py-1 hover:text-orange-400">Özellikler</a>
            <a href="#pricing" className="block py-1 hover:text-orange-400">Fiyatlandırma</a>
            <Link to="/register" className="block py-1 hover:text-orange-400">Ücretsiz Deneme (14 Gün)</Link>
          </div>
          <div>
            <h3 className="mb-4 font-medium text-zinc-300">İletişim</h3>
            <a href="mailto:info@teklifpro.ai" className="block py-1 hover:text-orange-400">info@teklifpro.ai</a>
            <span className="block py-1">İstanbul, Türkiye</span>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-zinc-800 pt-6 text-xs text-zinc-600">
          © 2026 TeklifPro · openBIM 5D Metraj & Teklif Yönetimi. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}

function TrustPoint({ title, text }: { title: string; text: string }) {
  return <div><p className="font-medium text-zinc-200">{title}</p><p className="mt-1 text-zinc-500">{text}</p></div>;
}

function WorkflowCard({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) {
  return (
    <article className="border border-zinc-800 bg-[#09090b] p-7 transition-colors hover:border-orange-500/40 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-orange-400 font-bold">{number}</span>
        <span className="text-orange-400">{icon}</span>
      </div>
      <h3 className="mt-8 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 leading-relaxed text-zinc-400 text-sm">{text}</p>
    </article>
  );
}

function EvidenceCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="border border-emerald-500/20 bg-emerald-500/[0.04] p-6 rounded-xl">
      <CheckCircle2 className="text-emerald-400" size={20} />
      <h3 className="mt-5 font-semibold text-white text-base">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
    </article>
  );
}
