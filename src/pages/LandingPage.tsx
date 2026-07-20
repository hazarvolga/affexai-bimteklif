import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileSpreadsheet, GraduationCap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type LandingPageProps = {
  onGetStarted: () => void;
  onPilotRequest: () => void;
};

export function LandingPage({ onGetStarted, onPilotRequest }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200">
      <nav className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-zinc-800/80 bg-[#09090b]/95 px-6 backdrop-blur-md md:px-8">
        <a href="#top" className="flex items-center gap-3 font-semibold tracking-tight text-white" aria-label="BIMPlan Academy ana sayfa">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold text-white">BP</span>
          <span className="text-lg">BIMPlan Academy</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          <a href="#workflow" className="text-sm text-zinc-400 transition-colors hover:text-white">Nasıl çalışır?</a>
          <Link to="/academy" className="text-sm text-zinc-400 transition-colors hover:text-white">Academy</Link>
          <a href="#pilot" className="text-sm text-zinc-400 transition-colors hover:text-white">Pilot programı</a>
          <Button variant="ghost" className="text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={onGetStarted}>Giriş yap</Button>
          <Button className="bg-orange-600 px-5 text-white hover:bg-orange-700" onClick={onPilotRequest}>Pilot başvurusu</Button>
        </div>
      </nav>

      <main id="top">
        <section className="relative overflow-hidden border-b border-zinc-800/80 px-6 pb-24 pt-24 md:px-8 md:pb-32 md:pt-32">
          <div className="absolute left-1/2 top-0 -z-0 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-orange-600/5 blur-[120px]" />
          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-7 inline-flex items-center gap-2 border border-orange-500/25 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              BIMPlan Academy · İlk ticari ürün: TeklifPro
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">
              Tekliflerinizi daha hızlı hazırlayın.
              <span className="block text-orange-400">Kârlılığınızı kontrol altında tutun.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
              TeklifPro, inşaat ekiplerinin metrajdan teklif PDF&apos;ine kadar uzanan sürecini tek bir çalışma alanında düzenler. Hesabı hızlandırır; son kararı ve sorumluluğu sizde bırakır.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-13 bg-orange-600 px-7 text-white hover:bg-orange-700" onClick={onPilotRequest}>
                Pilot başvurusu <ArrowRight size={18} className="ml-2" />
              </Button>
              <a href="#workflow" className="inline-flex h-13 items-center justify-center rounded-md border border-zinc-700 bg-transparent px-7 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white">Ürün akışını görün</a>
            </div>
            <div className="mt-14 grid max-w-3xl grid-cols-1 gap-4 border-t border-zinc-800 pt-6 text-sm text-zinc-400 sm:grid-cols-3">
              <TrustPoint title="TeklifPro" text="Teklif ve metraj çalışma alanı" />
              <TrustPoint title="SmartCheck" text="Kalite kontrol katmanı" />
              <TrustPoint title="Akademi" text="Ekiplerin kullanımını güçlendirir" />
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800 bg-[#09090b] px-6 py-20 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="mb-4 text-sm font-medium text-orange-400">BİMPLAN ACADEMY · AÇIK BİLGİ ALANI</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">BIM’i gerçek iş kararlarıyla öğrenin.</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">ISO 19650’den 5D maliyet mühendisliğine, sürdürülebilirlikten saha pratiğine uzanan içerik haritasını inceleyin.</p>
              <Link to="/academy" className="mt-7 inline-flex h-11 items-center rounded-md border border-zinc-700 px-5 text-sm font-medium text-zinc-200 transition-colors hover:border-orange-500/50 hover:bg-zinc-800">Academy’yi keşfet <BookOpen size={17} className="ml-2 text-orange-400" /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AcademyPreview title="ISO 19650" text="Bilgi üretimi ve teslim disiplini" />
              <AcademyPreview title="4D / 5D" text="Zaman, metraj ve teklif riski" />
              <AcademyPreview title="6D" text="Sürdürülebilirlik ve karbon" />
              <AcademyPreview title="Saha pratiği" text="Üretilebilirlik ve kariyer" />
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-24 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-medium text-orange-400">İLK ODAK: GELİR ÜRETEN İŞ AKIŞI</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Teklif hazırlamayı ölçülebilir bir sürece çevirin.</h2>
              <p className="mt-5 text-lg leading-relaxed text-zinc-400">TeklifPro&apos;nun ilk sürümünde geniş bir platform sözü vermiyoruz. Bir ekibin gerçek teklifini daha hızlı, izlenebilir ve kontrol edilebilir biçimde tamamlamasına odaklanıyoruz.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <WorkflowCard number="01" icon={<FileSpreadsheet />} title="Metrajı düzenleyin" text="Kalem, miktar, birim ve maliyet bilgilerini tek çalışma alanında toplayın." />
              <WorkflowCard number="02" icon={<ClipboardCheck />} title="Teklifi kontrol edin" text="Eksik, uyumsuz veya tekrar eden kalemleri gözden geçirin; insan onayını koruyun." />
              <WorkflowCard number="03" icon={<ShieldCheck />} title="Kârlılıkla gönderin" text="Maliyet ve marjı görün, profesyonel teklif çıktısını hazırlayın ve süreci izleyin." />
            </div>
          </div>
        </section>

        <section className="px-6 py-24 md:px-8 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.1fr] md:items-start">
            <div>
              <p className="mb-4 text-sm font-medium text-orange-400">BIMPLAN ACADEMY ÇATISI</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white">Önce teklif. Sonra kalite ve yetkinlik.</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">BIMPlan Academy, birbirinden kopuk ürünler toplamı değil; inşaat ekiplerinin daha iyi iş üretmesine yardım eden bir ürün ailesidir. Ticari giriş noktamız TeklifPro&apos;dur.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <EcosystemCard icon={<FileSpreadsheet />} title="TeklifPro" status="Şimdi" text="Metraj, teklif, PDF ve kârlılık akışının ilk ticari ürünü." />
              <EcosystemCard icon={<ShieldCheck />} title="SmartCheck" status="Pilot kapsamı" text="Teklifteki kontrol noktalarını görünür kılan kalite katmanı." />
              <EcosystemCard icon={<GraduationCap />} title="Akademi" status="Enablement" text="Ekiplerin ürünü doğru ve sürekli kullanmasına yardımcı olur." />
              <EcosystemCard icon={<CheckCircle2 />} title="BIMPLAN" status="İleri aşama" text="Standartlar ve kaynaklar için uzun vadeli kurumsal çatı." muted />
            </div>
          </div>
        </section>

        <section id="pilot" className="border-y border-orange-500/20 bg-orange-500/[0.06] px-6 py-20 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-medium text-orange-400">KONTROLLÜ İLK ADIM</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">İlk pilot ekipler için birlikte kurulum.</h2>
              <p className="mt-4 leading-relaxed text-zinc-300">Pilot sürecinde hedefimiz özellik sayısını artırmak değil; ekibinizin gerçek bir teklifi başarıyla tamamlaması ve sonucu ölçebilmek. Kapsam, onboarding ve fiyat görüşmede netleştirilir.</p>
            </div>
            <Button size="lg" className="h-13 shrink-0 bg-orange-600 px-7 text-white hover:bg-orange-700" onClick={onPilotRequest}>Pilot başvurusu yapın <ArrowRight size={18} className="ml-2" /></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 bg-[#09090b] px-6 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 text-sm text-zinc-500 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-white"><span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold text-white">BP</span>BIMPlan Academy</div>
            <p className="mt-5 max-w-sm leading-relaxed">İnşaat ekipleri için daha hızlı teklif, daha görünür kalite ve daha güçlü yetkinlik.</p>
          </div>
          <div><h3 className="mb-4 font-medium text-zinc-300">Ürün</h3><a href="#workflow" className="block py-1 hover:text-orange-400">TeklifPro akışı</a><Link to="/academy" className="block py-1 hover:text-orange-400">BIMPlan Academy</Link><a href="#pilot" className="block py-1 hover:text-orange-400">Pilot programı</a></div>
          <div><h3 className="mb-4 font-medium text-zinc-300">İletişim</h3><a href="mailto:info@teklifpro.ai" className="block py-1 hover:text-orange-400">info@teklifpro.ai</a><span className="block py-1">İstanbul, Türkiye</span></div>
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-zinc-800 pt-6 text-xs text-zinc-600">© 2026 BIMPlan Academy. TeklifPro, BIMPlan Academy çatısı altında geliştirilir.</div>
      </footer>
    </div>
  );
}

function TrustPoint({ title, text }: { title: string; text: string }) {
  return <div><p className="font-medium text-zinc-200">{title}</p><p className="mt-1 text-zinc-500">{text}</p></div>;
}

function WorkflowCard({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) {
  return <article className="border border-zinc-800 bg-[#09090b] p-7 transition-colors hover:border-orange-500/40"><div className="flex items-center justify-between"><span className="font-mono text-xs text-orange-400">{number}</span><span className="text-orange-400">{icon}</span></div><h3 className="mt-10 text-xl font-semibold text-white">{title}</h3><p className="mt-3 leading-relaxed text-zinc-500">{text}</p></article>;
}

function EcosystemCard({ icon, title, status, text, muted = false }: { icon: ReactNode; title: string; status: string; text: string; muted?: boolean }) {
  return <article className={`border p-6 ${muted ? 'border-zinc-800/70 bg-zinc-900/30 opacity-75' : 'border-zinc-800 bg-[#0c0c0e]'}`}><div className="flex items-start justify-between gap-4"><span className="text-orange-400">{icon}</span><span className="text-xs text-zinc-500">{status}</span></div><h3 className="mt-8 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p></article>;
}

function AcademyPreview({ title, text }: { title: string; text: string }) {
  return <div className="border border-zinc-800 bg-[#0c0c0e] p-5"><p className="font-medium text-white">{title}</p><p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p></div>;
}
