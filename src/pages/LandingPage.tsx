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
              <span className="h-2 w-2 rounded-full bg-orange-400" aria-hidden="true" />
              openBIM IFC ve Excel metrajından kaynak izli teklif
            </div>
            <h1 className="max-w-5xl text-4xl font-black leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
              Metrajınızı modelden alın,
              <span className="block text-orange-400 mt-2">
                teklifinizi kanıtla verin.
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-xl font-normal">
              Allplan, Revit veya Archicad <code className="text-orange-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-sm">.ifc</code> modelinizi ya da Excel metrajınızı yükleyin. TeklifPro, modelde gerçekten bulunan hacim ve özellik verilerini okur, her kalemi kaynağıyla birlikte incelemenize sunar ve onayladığınız kalemlerden teklif taslağı oluşturur.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-13 bg-orange-600 px-7 text-white hover:bg-orange-700 font-bold" onClick={onPilotRequest}>
                Pilot programına başvurun <ArrowRight size={18} className="ml-2" />
              </Button>
              <a href="#engine-tiers" className="inline-flex h-13 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/80 px-7 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white">
                Nasıl çalıştığını görün
              </a>
            </div>
            <div className="mt-14 grid max-w-4xl grid-cols-1 gap-4 border-t border-zinc-800/80 pt-6 text-sm text-zinc-400 sm:grid-cols-3">
              <TrustPoint title="Modelden okunur" text="Hacimler IFC dosyasındaki miktar ve özellik verisinden alınır, tahmin edilmez." />
              <TrustPoint title="Siz onaylarsınız" text="Hiçbir kalem insan incelemesi olmadan teklife girmez." />
              <TrustPoint title="Kaynağı izlenir" text="Her teklif kalemi IFC nesnesine ve fiyat kaynağına bağlı kalır." />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS: WHAT IS READ, WHAT NEEDS REVIEW */}
        <section id="engine-tiers" className="border-b border-zinc-800 bg-[#070709] px-6 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-400">Ne okunur, ne incelenir?</p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Güven sınırları açık bir metraj akışı</h2>
              <p className="mt-4 text-base text-zinc-400">
                TeklifPro her miktarın nereden geldiğini gösterir. Modelde açık veri yoksa değer uydurmaz; kalemi incelemeniz için işaretler.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="relative flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-7">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wide text-emerald-400">Doğrudan okunur</span>
                  <h3 className="mt-3 text-xl font-bold text-white">IFC miktar ve özellik verisi</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Modelde IFC miktar setleri (QTO) veya onaylı özellik setleri altında dışa aktarılmış hacimler okunur. Eleman, kat ve IFC kimliği ile birlikte inceleme listesine düşer.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-emerald-900/40 text-xs text-emerald-300">
                  Kaynak: IFC dosyasının kendisi
                </div>
              </div>

              <div className="relative flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-amber-950/10 p-7">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wide text-amber-400">İnceleme gerekir</span>
                  <h3 className="mt-3 text-xl font-bold text-white">Donatı, kalıp ve geometri tahminleri</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Donatı tonajı, kalıp alanı ve geometriden türetilen miktarlar otomatik olarak teklife alınmaz. Bu kalemler için modelde açık veri ya da mühendis onayı gerekir.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-amber-900/40 text-xs text-amber-300">
                  Kaynak: mühendis kararı
                </div>
              </div>

              <div className="relative flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-blue-950/10 p-7">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wide text-blue-400">Siz karar verirsiniz</span>
                  <h3 className="mt-3 text-xl font-bold text-white">SmartCheck inceleme ve fiyat kanıtı</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Excel/CSV metrajları da aynı akıştan geçer. Satırları onaylar, düzeltir veya gerekçeli istisna olarak kabul edersiniz; fiyatı kendi kataloğunuzdan ya da önerilen eşleşmelerden seçersiniz.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-blue-900/40 text-xs text-blue-300">
                  Kaynak: sizin onayınız ve fiyat kataloğunuz
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800 bg-[#09090b] px-6 py-20 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="mb-4 text-sm font-medium text-orange-400">NEDEN KANIT?</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Teklifteki her rakamın bir cevabı olmalı.</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">"Bu miktar nereden geldi?" sorusu ihalede de hakedişte de sorulur. TeklifPro, miktarı modelden, fiyatı katalogdan ve kararı sizden alır; üçünü de teklif kalemine bağlı tutar.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AcademyPreview title="Kiriş, kolon, döşeme, duvar" text="IFC'de açıkça verilmiş hacimler eleman ve kat bazında listelenir." />
              <AcademyPreview title="Excel ve CSV metrajları" text="Mevcut metraj tablolarınız aynı inceleme akışına alınır." />
              <AcademyPreview title="Fiyat kataloğu" text="Kendi birim fiyatlarınızı CSV ile yükleyin; eşleşme önerileri onayınıza sunulur." />
              <AcademyPreview title="Teklif taslağı" text="Onaylanan kalemler kaynak iziyle yeni ya da mevcut teklife aktarılır." />
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-24 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-medium text-orange-400">İŞ AKIŞI</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">3 adımda modelden teklif taslağına.</h2>
              <p className="mt-5 text-lg leading-relaxed text-zinc-400">Dosyanızı yükleyin, kalemleri inceleyin, onayladıklarınızı teklife aktarın.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <WorkflowCard number="01" icon={<FileSpreadsheet />} title="Dosyayı yükleyin" text="IFC modeli ya da Excel/CSV metrajı. Dosya güvenli şekilde işlenir." />
              <WorkflowCard number="02" icon={<ClipboardCheck />} title="Kalemleri inceleyin" text="Her satırın kaynağını görün; onaylayın, düzeltin ya da gerekçeyle kabul edin." />
              <WorkflowCard number="03" icon={<ShieldCheck />} title="Teklife aktarın" text="Fiyatı seçin, onaylı kalemlerle teklif taslağı oluşturun ve PDF alın." />
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800 px-6 py-24 md:px-8">
          <div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-orange-400">KAYNAK İZİ</p><h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-white">Her aktarılan kalem, teklifin içine kaynak iziyle girer.</h2><div className="mt-12 grid gap-5 md:grid-cols-4"><EvidenceCard title="IFC kimliği ve kat" text="Nesnenin IFC kimliği, sınıfı ve bağlı olduğu kat" /><EvidenceCard title="Miktar kaynağı" text="Miktarın hangi IFC miktar ya da özellik setinden okunduğu" /><EvidenceCard title="İnceleme kararı" text="Onay, düzeltme veya gerekçeli istisna kaydı" /><EvidenceCard title="Fiyat kaynağı" text="Birim fiyatın geldiği katalog ve geçerlilik tarihi" /></div></div>
        </section>

        <section className="border-b border-zinc-800 bg-[#0c0c0e] px-6 py-20 md:px-8">
          <div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-orange-400">DİJİTAL RUHSAT HAZIRLIĞI</p><h2 className="text-3xl font-semibold text-white">Yeni yönetmelikler için şimdiden hazırlanın.</h2><p className="mt-4 max-w-3xl leading-relaxed text-zinc-400">Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik (RG 05.08.2026/33331) 1 Eylül 2027'de yürürlüğe giriyor; IFC teslimi bina büyüklüğü ve belediye nüfusuna göre 2029'dan itibaren kademeli olarak zorunlu hale geliyor. IFC modelinizin özellik verilerini bugünden düzenli tutmak, hem metrajınızı hem ruhsat dosyanızı güçlendirir.</p></div>
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
