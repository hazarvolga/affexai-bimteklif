/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-500/30 selection:text-orange-500">
      {/* Navbar */}
      <nav className="h-20 px-8 flex items-center justify-between bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
        <div className="flex items-center gap-3 font-semibold text-xl tracking-tight text-white">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center font-bold text-white">TP</div>
          TeklifPro <span className="text-orange-500">AI</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Özellikler</a>
          <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Fiyatlandırma</a>
          <div className="h-6 w-[1px] bg-zinc-800 mx-2"></div>
          <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800" onClick={onGetStarted}>Giriş Yap</Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 shadow-lg shadow-orange-900/20" onClick={onGetStarted}>Ücretsiz Başla</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-orange-600/5 blur-[120px] -z-10 rounded-full" />
        
        <div className="text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-600/10 text-orange-500 border border-orange-600/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={14} />
            Türkiye'nin İlk AI Destekli İnşaat Teklif Platformu
          </div>
          <h1 className="text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1] font-heading animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            İnşaat Tekliflerinde <br />
            <span className="text-orange-500 italic">Yapay Zeka</span> Dönemi
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
            Excel ve karmaşık hesaplamalardan kurtulun. Yapay zeka ile dakikalar içinde profesyonel teklifler hazırlayın, kârlılığınızı anlık takip edin.
          </p>
          <div className="flex items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
            <Button size="lg" className="h-14 px-10 text-md bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-orange-900/30" onClick={onGetStarted}>
              Hemen Deneyin
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-10 text-md border-zinc-800 bg-[#0c0c0e] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all">
              Demo Talep Et
            </Button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="text-xs font-bold uppercase tracking-[0.3em]">Referanslar:</div>
            <div className="h-4 w-24 bg-zinc-700 rounded-sm"></div>
            <div className="h-4 w-24 bg-zinc-700 rounded-sm"></div>
            <div className="h-4 w-24 bg-zinc-700 rounded-sm"></div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-32 bg-[#0c0c0e] relative border-y border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold text-white mb-4">Müteahhitler İçin Özel Geliştirildi</h2>
              <p className="text-zinc-500 text-lg">Hataları minimize edin, hızı maksimize edin.</p>
            </div>
            <div className="text-orange-500 font-mono text-sm uppercase tracking-widest border-b border-orange-500/30 pb-2">
              Teknolojik Üstünlük
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-orange-500" />} 
              title="AI Teklif Üretici" 
              description="Siz projeyi anlatın, AI kalemleri ve tahmini metrajları saniyeler içinde çıkarsın."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-orange-500" />} 
              title="Mevzuat Zekâsı" 
              description="KDV ve Tevkifat değişikliklerini anlık takip eder, tekliflerinizi yasal risklere karşı korur."
            />
            <FeatureCard 
              icon={<CheckCircle2 className="text-orange-500" />} 
              title="Kârlılık Analizi" 
              description="Her teklifte kâr marjınızı ve maliyet risklerinizi anlık olarak görün."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-8">
           <div className="text-center mb-24">
            <h2 className="text-4xl font-bold text-white mb-4">Her Ölçeğe Uygun Planlar</h2>
            <p className="text-zinc-500 text-lg">İhtiyacınız olan paketi seçin, profesyonelliğe adım atın.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard plan="Starter" price="1.990" features={['20 Teklif/Ay', 'Tek Kullanıcı', 'Standart PDF']} />
            <PricingCard plan="Pro" price="4.990" features={['Sınırsız Teklif', '5 Kullanıcı', 'AI Asistan', 'Mevzuat Takibi', 'Özel Logo']} popular />
            <PricingCard plan="Elite" price="9.990" features={['Sınırsız Teklif', 'Sınırsız Kullanıcı', 'Detaylı Analitik', 'CRM Entegrasyonu', 'API Erişimi']} />
          </div>
        </div>
      </section>

      {/* Footer */}
       <footer className="py-20 bg-[#09090b] border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12 text-zinc-500 text-sm">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 font-semibold text-xl tracking-tight text-white mb-6">
              <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center font-bold text-white text-xs">TP</div>
              TeklifPro AI
            </div>
            <p className="max-w-xs leading-relaxed">
              İnşaat sektöründe dijital dönüşümün öncüsü. 
              Yapay zeka desteği ile teklif süreçlerinizi optimize ediyoruz.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-widest text-[10px] uppercase">Hizmetler</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-orange-500 transition-colors">AI Teklif</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">CRM</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Analitik</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-widest text-[10px] uppercase">İrtibat</h4>
            <ul className="space-y-4">
              <li>info@teklifpro.ai</li>
              <li>İstanbul, Türkiye</li>
              <li>+90 212 ...</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between gap-4 text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
          <p>© 2026 TeklifPro AI. Tüm hakları saklıdır.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-zinc-400">Gizlilik</a>
            <a href="#" className="hover:text-zinc-400">Kullanım Koşulları</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-10 rounded-2xl border border-zinc-800 bg-[#09090b] hover:bg-zinc-900 transition-all group hover:border-orange-500/30">
      <div className="w-12 h-12 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-orange-500/10 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">{description}</p>
    </div>
  );
}

function PricingCard({ plan, price, features, popular = false }: any) {
  return (
    <div className={`p-10 rounded-3xl border flex flex-col relative transition-all duration-500 hover:scale-105 ${popular ? 'border-orange-500 bg-orange-600/5 shadow-2xl shadow-orange-900/10' : 'border-zinc-800 bg-zinc-900/30'}`}>
      {popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">EN ÇOK TERCİH EDİLEN</span>}
      <h3 className="text-lg font-bold text-white mb-2">{plan}</h3>
      <div className="mb-8">
        <span className="text-5xl font-bold text-white tracking-tighter">₺{price}</span>
        <span className="text-zinc-500 ml-2 font-mono text-xs">/ay</span>
      </div>
      <div className="space-y-5 mb-10 flex-1">
        {features.map((f: string) => (
          <div key={f} className="flex items-center gap-3 text-sm text-zinc-400 group">
            <CheckCircle2 size={16} className={popular ? "text-orange-500" : "text-zinc-600"} />
            {f}
          </div>
        ))}
      </div>
      <Button className={`w-full h-12 rounded-xl text-sm font-bold tracking-tight transition-all ${popular ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/20' : 'bg-white text-zinc-950 hover:bg-zinc-200'}`}>
        Hemen Başla
      </Button>
    </div>
  );
}
