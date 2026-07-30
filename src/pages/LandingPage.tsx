import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ClipboardCheck, FileSpreadsheet, GraduationCap, ShieldCheck } from 'lucide-react';
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
          <Button className="bg-orange-600 px-5 text-white hover:bg-orange-700" onClick={onPilotRequest}>Pilot metrajınızı doğrulayın</Button>
        </div>
      </nav>

      <main id="top">
        <section className="relative overflow-hidden border-b border-zinc-800/80 px-6 pb-24 pt-24 md:px-8 md:pb-32 md:pt-32">
          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-7 inline-flex items-center gap-2 border border-orange-500/25 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-300 rounded-full">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              openBIM IFC 4.0 &amp; Allplan Hassasiyetinde 5D BIM Metraj Motoru
            </div>
            <h1 className="max-w-5xl text-4xl font-black leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
              openBIM IFC 4.0 Standartlarında
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 mt-2">
                %100 Kesin 5D BIM Metraj Motoru
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-xl font-normal">
              İhalelerde sürpriz maliyet risklerine son verin. Revit, Allplan ve Archicad <code className="text-orange-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-sm">.ifc</code> modellerinden <span className="text-white font-semibold">IfcBeam, IfcColumn, IfcSlab</span> hacimlerini ($m^3$) ve donatı tonajlarını ($Ton$) %100 kesinlikle hesaplayın.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-13 bg-orange-600 px-7 text-white hover:bg-orange-700 font-bold" onClick={onPilotRequest}>
                5D IFC Metraj Motorunu Dene <ArrowRight size={18} className="ml-2" />
              </Button>
              <a href="#engine-tiers" className="inline-flex h-13 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/80 px-7 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white">
                3-Kademeli Metraj Motorunu Gör
              </a>
            </div>
            <div className="mt-14 grid max-w-4xl grid-cols-1 gap-4 border-t border-zinc-800/80 pt-6 text-sm text-zinc-400 sm:grid-cols-3">
              <TrustPoint title="🟢 Seviye 1: openBIM IFC 4.0" text="%100 Kesin 5D İhale & Hakediş Metrajı" />
              <TrustPoint title="🟡 Seviye 2: 2D Akıllı Ön-Keşif" text="İhale Öncesi 5 Dakikada Akıllı Ön-Keşif (±%8-%12 Toleranslı)" />
              <TrustPoint title="🔵 Seviye 3: 3x3 SmartCheck" text="Eurocode 2 & TS 708 Kalite Denetimi" />
            </div>
          </div>
        </section>

        {/* 3-TIER ENGINE SECTION */}
        <section id="engine-tiers" className="border-b border-zinc-800 bg-[#070709] px-6 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-400">TEKLİFPRO 3-KADEMELİ METRAJ MİMARİSİ</p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Metraj Hassasiyet Motoru</h2>
              <p className="mt-4 text-base text-zinc-400">
                2D PDF hızlı çizimlerinden 3D openBIM IFC modellerine kadar projenizin aşamasına göre en doğru metraj yöntemini kullanın.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Tier 1 */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-7 backdrop-blur-sm transition-all hover:border-emerald-500/60">
                <div className="absolute top-4 right-4 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  %100 KESİN HASSASİYET
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-emerald-400">SEVİYE 1</span>
                  <h3 className="mt-3 text-xl font-bold text-white">openBIM IFC 4.0 Metraj Motoru</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Allplan, Revit veya Archicad <code className="text-emerald-300 font-mono">.ifc</code> 3D modellerini yükleyin. <strong className="text-zinc-200">IfcBeam, IfcColumn, IfcSlab, IfcWall</strong> eleman hacimleri ($m^3$), kalıp alanı ($m^2$) ve donatı tonajları ($Ton$) doğrudan 3D geometriden sıfır sapmayla çekilir.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-emerald-900/40 text-xs text-emerald-300 font-mono">
                  ✓ Bağlayıcı İhale &amp; Hakediş Metrajı
                </div>
              </div>

              {/* Tier 2 */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-amber-950/10 p-7 backdrop-blur-sm transition-all hover:border-amber-500/60">
                <div className="absolute top-4 right-4 rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  ±%8-%12 TOLERANSLI
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-amber-400">SEVİYE 2</span>
                  <h3 className="mt-3 text-xl font-bold text-white">İhale Öncesi 5 Dakikada Akıllı Ön-Keşif Metrajı</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    2D PDF veya DWG projesinden hızlı ihale öncesi bütçeleme yapın. Paspayı ve bindirme toleransı uyarısı ile 5 dakikada ön-keşif teklifi hazırlayın.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-amber-900/40 text-xs text-amber-300 font-mono">
                  ✓ Hızlı İhale Ön-Bütçeleme
                </div>
              </div>

              {/* Tier 3 */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-blue-950/10 p-7 backdrop-blur-sm transition-all hover:border-blue-500/60">
                <div className="absolute top-4 right-4 rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-bold text-blue-400 border border-blue-500/30">
                  SMARTCHECK &amp; TS 708
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-blue-400">SEVİYE 3</span>
                  <h3 className="mt-3 text-xl font-bold text-white">3x3 SmartCheck &amp; Eurocode 2 Denetimi</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Statik raporlar, TS 708 nominal kütleler ve Eurocode 2 paspayı/donatı sıkışıklığı standartlarına göre metrajın kural uyumunu denetleyin.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-blue-900/40 text-xs text-blue-300 font-mono">
                  ✓ Otomatik Kural &amp; Kalite Kontrolü
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800 bg-[#09090b] px-6 py-20 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="mb-4 text-sm font-medium text-orange-400">İHALE RİSKİNİ SIFIRLAYIN</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">2D Tahminlerle İhaleye Girmek İflas Riski Taşır.</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">2D PDF çizimlerinde kesit detayları ve 3D geometri bulunmadığı için %15-25 arası sapmalar yaşanır. openBIM IFC 4.0 motorumuz ile tüm taşıyıcı eleman hacimleri ve donatılar Allplan hassasiyetinde taranır.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AcademyPreview title="IfcBeam & IfcColumn Hacimleri" text="Kiriş ve kolon çakışmaları ayıklanmış %100 kesin m³ hesabı" />
              <AcademyPreview title="IfcSlab Döşeme Metrajı" text="Döşeme anoları, boşluklar ve net kalıp alanları ($m²$)" />
              <AcademyPreview title="IfcReinforcingBar Tonajı" text="TS 708 ve Eurocode 2 nominal kütle formülleriyle net donatı tonajı ($Ton$)" />
              <AcademyPreview title="SmartCheck Kural Denetimi" text="Şantiyede çakışma ve kır-dök maliyetini engelleme" />
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-24 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-medium text-orange-400">openBIM 5D METRAJ İŞ AKIŞI</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">3 Adımda IFC Modellerinizden İhale Teklifi Üretin.</h2>
              <p className="mt-5 text-lg leading-relaxed text-zinc-400">openBIM IFC dosyalarınızı yükleyin, nesne hacimlerini ayrıştırın ve ihale teklif listenizi otomatik oluşturun.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <WorkflowCard number="01" icon={<FileSpreadsheet />} title="IFC Dosyasını Yükleyin" text="Allplan, Revit veya Archicad .ifc dosyanızı tarayıcıda sürükleyip bırakın." />
              <WorkflowCard number="02" icon={<ClipboardCheck />} title="Eleman & Donatı Ayrıştırma" text="IfcBeam, IfcColumn, IfcSlab hacimlerini ve donatı kg/ton kütlelerini 3D detayla çıkarın." />
              <WorkflowCard number="03" icon={<ShieldCheck />} title="5D İhale Teklifine Aktarın" text="TeklifPro birim fiyatları ile eşleştirip %100 kesinlikte 5D teklif çıktısı alın." />
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800 px-6 py-24 md:px-8">
          <div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-orange-400">GERÇEK KANIT MEKANİZMASI</p><h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-white">Her aktarılan kalem, teklifin içine kaynak iziyle girer.</h2><div className="mt-12 grid gap-5 md:grid-cols-4"><EvidenceCard title="IFC GUID &amp; Kaynak" text="Nesne GUID'si, IFC sınıfı ve kat seviyesi" /><EvidenceCard title="TS 708 Kuralı" text="Donatı kütle hesabı ve Eurocode 2 doğrulaması" /><EvidenceCard title="Mühendislik Onayı" text="Reviewer kararı ve kesin metraj onayı" /><EvidenceCard title="Ölçülebilir Sonuç" text="Sıfır metraj sapması ve %100 kârlılık koruması" /></div></div>
        </section>

        <section className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-20 md:px-8">
          <div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-orange-400">GÜVEN SINIRLARI</p><h2 className="text-3xl font-semibold text-white">2D PDF Akıllı Ön-Keşif (Seviye 2) vs 5D IFC Kesin Metraj (Seviye 1)</h2><p className="mt-4 max-w-3xl leading-relaxed text-zinc-400">TeklifPro 2D PDF metraj modülünü kaldırmaz; hızlı ihale öncesi değerlendirmeler için <strong>"İhale Öncesi 5 Dakikada Akıllı Ön-Keşif Metrajı (±%8-%12 Toleranslı)"</strong> olarak sunar. Kesin ihale tekliflerinde ve hakediş teslimlerinde ise <strong>openBIM IFC 4.0 5D Metraj Motoru</strong> standart olarak önerilir.</p></div>
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
            <Button size="lg" className="h-13 shrink-0 bg-orange-600 px-7 text-white hover:bg-orange-700" onClick={onPilotRequest}>Pilot metrajınızı doğrulayın <ArrowRight size={18} className="ml-2" /></Button>
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

function EvidenceCard({ title, text }: { title: string; text: string }) {
  return <article className="border border-emerald-500/20 bg-emerald-500/[0.04] p-6"><CheckCircle2 className="text-emerald-400" size={20} /><h3 className="mt-6 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p></article>;
}
