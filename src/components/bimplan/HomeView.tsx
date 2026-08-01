import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Award, Layers, Sliders, ArrowRight, Activity, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { ViewType } from '../../types';

interface HomeViewProps {
  setView: (view: ViewType) => void;
}

export default function HomeView({ setView }: HomeViewProps) {
  // ROI Calculator States
  const [budget, setBudget] = useState<number>(100000000); // Default 100M TL
  const [complexity, setComplexity] = useState<'basit' | 'orta' | 'karmasik'>('orta');

  // ROI Calculator Logic
  const getSavingsPercentage = () => {
    switch (complexity) {
      case 'basit': return 0.06;  // 6% savings
      case 'orta': return 0.09;   // 9% savings
      case 'karmasik': return 0.14; // 14% savings
    }
  };

  const savingsPercentage = getSavingsPercentage();
  const estimatedSavings = budget * savingsPercentage;
  const designReworkSaved = estimatedSavings * 0.40;
  const clashingPrevented = complexity === 'basit' ? 45 : complexity === 'orta' ? 180 : 450;
  const timeReductionDays = complexity === 'basit' ? 15 : complexity === 'orta' ? 45 : 90;

  // Format currency helper
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M TL`;
    }
    return `${val.toLocaleString('tr-TR')} TL`;
  };

  // SVG MacLeamy Curve Helper
  // Curve 1 (Traditional): peak is late (detailed design / construction document phase)
  // Curve 2 (BIM-driven): peak is early (concept / schematic design phase)
  // Curve 3 (Cost of change): starts low, grows exponentially
  // Curve 4 (Ability to impact cost): starts high, drops exponentially
  const getCurvePoints = (type: 'traditional' | 'bim' | 'cost' | 'impact') => {
    switch (type) {
      case 'traditional':
        return "M 50,220 C 150,220 250,200 350,50 C 420,50 480,210 550,220";
      case 'bim':
        return "M 50,220 C 100,220 180,60 250,60 C 350,60 450,215 550,220";
      case 'cost':
        return "M 50,220 Q 250,200 500,40";
      case 'impact':
        return "M 50,40 Q 250,80 500,220";
    }
  };

  return (
    <div className="space-y-24">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
              ISO 19650 &amp; Kamu BIM Uyum Portalı
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              BIM Stratejisi ve <br />
              <span className="text-orange-600 relative inline-block">
                Teknik Uygulama
                <span className="absolute bottom-1 left-0 w-full h-2 bg-orange-100 -z-10 rounded"></span>
              </span> Merkesi
            </h1>
            
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
              Türkiye inşaat sektörünün dijital dönüşüm rehberi. ISO 19650 standartlarından 5D entegrasyonuna, kamu mevzuatından teknik dökümantasyon standartlarına kadar projeniz için her şey tek bir portalda.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setView('dokumanlar')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-7 py-4 rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all shadow-lg shadow-orange-100 hover:shadow-orange-200 cursor-pointer text-center"
              >
                Dokümanları İncele
              </button>
              <button 
                onClick={() => setView('standartlar')}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-800 px-7 py-4 rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all hover:bg-slate-50 cursor-pointer text-center"
              >
                Standartlar Rehberi
              </button>
            </div>

            {/* Micro badges */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xl font-extrabold text-slate-900">%40</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Şantiye Hata Azalımı</div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900">ISO 19650</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uluslararası Uyum</div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900">%14'e Varan</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bütçe Tasarrufu (5D)</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-4 bg-orange-100/40 rounded-[2.5rem] blur-2xl -z-10"></div>
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-sm text-slate-800">Canlı Sistem Özeti</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">AKTİF</span>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Temel Metrik</div>
                  <div className="text-sm font-bold text-slate-800">Kamu BIM Zorunluluk Durumu</div>
                  <p className="text-xs text-slate-500">2023 itibarıyla büyük ölçekli altyapı ve kamu projelerinde BIM (ISO 19650) kullanımı zorunludur.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mevzuat Entegrasyonu</div>
                  <div className="text-sm font-bold text-slate-800">e-PYS Onay ve Denetimi</div>
                  <p className="text-xs text-slate-500">Bakanlık projelerinde teknik çakışma raporları ve model onayları elektronik sistemler üzerinden yönetilmektedir.</p>
                </div>
              </div>

              <button 
                onClick={() => setView('mevzuat')}
                className="w-full bg-slate-900 hover:bg-orange-600 text-white p-3.5 rounded-xl text-center text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
              >
                <span>TÜM MEVZUATI OKU</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE ROI CALCULATOR & EFFICIENCY ANALYZER */}
      <section className="max-w-7xl mx-auto px-6" id="roi-analyzer">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -z-10 translate-x-12 -translate-y-12"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-8">
              <div>
                <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs uppercase tracking-widest mb-3">
                  <Sliders className="w-4 h-4" />
                  İNTERAKTİF ANALİZÖR
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  BIM Yatırım Getirisi (ROI) ve Verimlilik Hesaplama
                </h2>
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                  Projenizin bütçe ve karmaşıklık verilerini girerek, ISO 19650 uyumlu BIM süreçlerinin sağlayacağı finansal ve zamansal tasarrufları simüle edin.
                </p>
              </div>

              {/* Slider Input */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">PROJE BÜTÇESİ</label>
                  <span className="mono font-bold text-orange-600 text-lg bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                    {formatCurrency(budget)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5000000" 
                  max="500000000" 
                  step="5000000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full accent-orange-600 cursor-pointer"
                  id="budget-range"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mono">
                  <span>5M TL</span>
                  <span>250M TL</span>
                  <span>500M TL</span>
                </div>
              </div>

              {/* Complexity Selection */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">PROJE KARMAŞIKLIĞI</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['basit', 'orta', 'karmasik'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setComplexity(type)}
                      className={`py-3 px-2 rounded-xl text-xs font-extrabold uppercase tracking-tight transition-all border ${
                        complexity === type
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                      id={`complexity-${type}`}
                    >
                      {type === 'basit' ? 'Basit' : type === 'orta' ? 'Orta Derece' : 'Karmaşık'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 border border-slate-100 p-8 rounded-2xl">
              
              <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600">
                  <DollarSign className="w-5 h-5 bg-orange-50 p-1 rounded-lg" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Tahmini Bütçe Tasarrufu</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(estimatedSavings)}</div>
                <p className="text-[11px] text-slate-500">
                  Toplam inşaat maliyetinin <strong className="text-orange-600">%{(savingsPercentage * 100).toFixed(0)}</strong> oranında net tasarruf potansiyeli.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600">
                  <ShieldCheck className="w-5 h-5 bg-orange-50 p-1 rounded-lg" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Saha Revizyon Tasarrufu</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(designReworkSaved)}</div>
                <p className="text-[11px] text-slate-500">
                  Çakışma tespiti sayesinde şantiyede engellenen hatalı imalat ve yıkım bütçesi.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600">
                  <Activity className="w-5 h-5 bg-orange-50 p-1 rounded-lg" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Engellenen Çakışmalar</span>
                </div>
                <div className="text-2xl font-black text-slate-900">+{clashingPrevented} Adet</div>
                <p className="text-[11px] text-slate-500">
                  Disiplinler arası (Mimari, Statik, MEP) otomatik çakışma raporları ile çözülen krizler.
                </p>
              </div>

              <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600">
                  <Clock className="w-5 h-5 bg-orange-50 p-1 rounded-lg" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Proje Süresi Kısalması</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{timeReductionDays} Gün</div>
                <p className="text-[11px] text-slate-500">
                  Tasarım koordinasyonu, koordinasyon toplantısı tasarrufu ve hızlı imalat onayı.
                </p>
              </div>

              <div className="sm:col-span-2 pt-4 border-t border-slate-200">
                <div className="flex items-start gap-3 bg-orange-50/50 border border-orange-100/50 p-4 rounded-xl">
                  <Award className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Teknik Not:</strong> Bu analiz, MacLeamy Eğrisi metodolojisini ve Türkiye Kamu Altyapı yatırımlarındaki geçmiş veri tabanlarını temel alır. BIM'in erken aşama efor odağı sayesinde şantiyede oluşabilecek riskler tasarım aşamasında minimize edilir.
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2 pt-2 text-center">
                <button
                  onClick={() => setView('dashboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-orange-100 hover:shadow-orange-200"
                  id="home-goto-dashboard-btn"
                >
                  <span>Gelişmiş Verimlilik &amp; ROI Simülatörünü Aç</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MACLEAMY CURVE METODOLOJİSİ */}
      <section className="max-w-7xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-orange-600 font-extrabold text-xs uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" />
              MAKALE VE ANALİZ
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              MacLeamy Eğrisi ile Tasarım Eforunun Dönüşümü
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Geleneksel inşaat projelerinde, tasarımdaki değişiklikler ve kritik kararlar genellikle imalat çizimleri aşamasında (şantiyeye çok yakın) alınır. Bu durum, revizyonların maliyetini astronomik olarak artırır.
            </p>
            
            <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm">Altın Kural: "Zamanın %20'sini başta harca, bütçenin %30'unu sonda kurtar."</h4>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                "BIM felsefesinin temeli, efor eğrisini tasarımın erken aşamalarına (Konsept ve Gelişmiş Tasarım) çekmektir. Böylece değişiklik yeteneği en yüksekteyken ve maliyet etkisi en düşükken kritik kararlar alınmış olur."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-200 p-4 rounded-xl space-y-1 bg-white">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Geleneksel Yöntem</div>
                <div className="text-sm font-extrabold text-slate-800">Geç Karar & Yüksek Revizyon Maliyeti</div>
              </div>
              <div className="border border-orange-200 p-4 rounded-xl space-y-1 bg-orange-50/20">
                <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">BIM Entegrasyonu</div>
                <div className="text-sm font-extrabold text-slate-800">Erken Koordinasyon & Sıfır Çakışma</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Macleamy Efor/Maliyet Eğrisi Grafiği</span>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded mono font-bold">ETKİLEŞİMLİ</span>
            </div>

            {/* SVG Visual Chart */}
            <div className="relative w-full aspect-[4/3] bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden p-4">
              <svg viewBox="0 0 500 300" className="w-full h-full">
                {/* Grid Lines */}
                <line x1="50" y1="40" x2="50" y2="260" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="160" y1="40" x2="160" y2="260" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="270" y1="40" x2="270" y2="260" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="380" y1="40" x2="380" y2="260" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="480" y1="40" x2="480" y2="260" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                
                <line x1="50" y1="260" x2="480" y2="260" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="50" y1="40" x2="50" y2="260" stroke="#94a3b8" strokeWidth="1.5" />

                {/* Legend and Axis Labels */}
                <text x="50" y="275" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">Konsept</text>
                <text x="160" y="275" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">Detay Tasarım</text>
                <text x="270" y="275" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">Uygulama Projesi</text>
                <text x="380" y="275" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">İhale/İmalat</text>
                <text x="470" y="275" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">Şantiye</text>

                {/* Curve 4: Ability to impact cost (Drops exponentially) - Blue */}
                <path d="M 50,60 Q 200,90 470,250" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="2 2" />
                
                {/* Curve 3: Cost of design changes (Rises exponentially) - Red */}
                <path d="M 50,250 Q 250,220 470,50" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="2 2" />

                {/* Curve 1: Traditional Design Effort (Peak is late) - Slate */}
                <path d="M 50,260 C 130,260 230,250 310,100 C 350,100 400,240 470,260" fill="none" stroke="#475569" strokeWidth="3" />

                {/* Curve 2: BIM-Driven Design Effort (Peak is early) - Orange */}
                <path d="M 50,260 C 100,260 140,80 200,80 C 260,80 340,250 470,260" fill="none" stroke="#ea580c" strokeWidth="4.5" />

                {/* Points highlights on BIM curve peak */}
                <circle cx="200" cy="80" r="5" fill="#ea580c" />
                <circle cx="310" cy="100" r="4" fill="#475569" />
              </svg>

              {/* Float indicators */}
              <div className="absolute top-8 left-16 bg-white border border-slate-100 p-2 rounded-lg shadow-sm space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-tighter">BIM Odaklı Efor</span>
                </div>
                <div className="text-[8px] text-slate-400">Efor erken aşamada yoğunlaşır, hata payı düşer</div>
              </div>

              <div className="absolute bottom-16 right-12 bg-white border border-slate-100 p-2 rounded-lg shadow-sm space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-500 rounded-full"></span>
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-tighter">Geleneksel Efor</span>
                </div>
                <div className="text-[8px] text-slate-400">Kararlar geç aşamada verilir, imalat risklidir</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 justify-center">
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-orange-500 inline-block"></span> BIM Efor Eğrisi</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-slate-600 inline-block"></span> Geleneksel Efor</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-500 border-t border-dashed inline-block"></span> Tasarımı Etkileme Gücü</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-red-500 border-t border-dashed inline-block"></span> Revizyon Maliyeti</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
