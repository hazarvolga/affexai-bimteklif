import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Leaf, 
  Activity, 
  Zap, 
  Layers, 
  Award, 
  Hammer, 
  Check, 
  Sparkles, 
  BarChart2, 
  Calculator, 
  HelpCircle,
  Building2,
  AlertCircle,
  LineChart as LineIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

export default function BimDashboard() {
  const [dashboardTab, setDashboardTab] = useState<'genel' | 'roi'>('genel');

  // ROI Calculator States
  const [projectBudget, setProjectBudget] = useState<number>(250); // milyon TL
  const [projectType, setProjectType] = useState<'metro' | 'hastane' | 'konut' | 'havalimani' | 'alt-yapi'>('hastane');
  const [bimLevel, setBimLevel] = useState<number>(2); // Düzey 0 - Düzey 3

  // Mock Trend & Comparison Data
  const industryComparisonData = [
    { name: 'Geleneksel (CAD)', 'Tasarım Hataları': 92, 'Metraj Sapması': 18, 'Koordinasyon Süresi': 100, 'Tesis Devir Süresi (Gün)': 180 },
    { name: 'BIM Seviye 1', 'Tasarım Hataları': 65, 'Metraj Sapması': 11, 'Koordinasyon Süresi': 75, 'Tesis Devir Süresi (Gün)': 120 },
    { name: 'BIM Seviye 2', 'Tasarım Hataları': 25, 'Metraj Sapması': 4, 'Koordinasyon Süresi': 35, 'Tesis Devir Süresi (Gün)': 30 },
    { name: 'BIM Seviye 3', 'Tasarım Hataları': 5, 'Metraj Sapması': 1, 'Koordinasyon Süresi': 15, 'Tesis Devir Süresi (Gün)': 7 }
  ];

  const monthlyEfficiencyData = [
    { month: 'Başlangıç', 'Tasarım Hızı (%)': 40, 'Maliyet Kontrolü (%)': 50, 'Koordinasyon Kalitesi (%)': 30 },
    { month: 'Konsept', 'Tasarım Hızı (%)': 55, 'Maliyet Kontrolü (%)': 62, 'Koordinasyon Kalitesi (%)': 45 },
    { month: 'Ruhsat', 'Tasarım Hızı (%)': 70, 'Maliyet Kontrolü (%)': 75, 'Koordinasyon Kalitesi (%)': 65 },
    { month: 'Uygulama', 'Tasarım Hızı (%)': 88, 'Maliyet Kontrolü (%)': 87, 'Koordinasyon Kalitesi (%)': 85 },
    { month: 'As-Built/Teslim', 'Tasarım Hızı (%)': 95, 'Maliyet Kontrolü (%)': 98, 'Koordinasyon Kalitesi (%)': 98 }
  ];

  const maturityDimensionData = [
    { subject: 'EIR & Sözleşme', A: 30, B: 95, fullMark: 100 },
    { subject: 'Ortak Veri Ortamı (CDE)', A: 20, B: 90, fullMark: 100 },
    { subject: 'OpenBIM/IFC', A: 15, B: 85, fullMark: 100 },
    { subject: '5D Metraj', A: 45, B: 80, fullMark: 100 },
    { subject: '7D COBie / Tesis', A: 10, B: 75, fullMark: 100 },
    { subject: 'Siber Güvenlik', A: 25, B: 85, fullMark: 100 }
  ];

  // Dynamic ROI calculations based on user input
  const calculateROI = () => {
    let baseErrorRate = 0.15; // Proje bütçesinin %15'i oranında potansiyel hata maliyetleri
    let errorPreventionRate = 0;
    let timeSavingsWeeks = 0;
    let carbonReductionTons = 0;
    let designPhaseAcceleration = 0;

    // Adjust multipliers by Project Type
    let typeMultiplier = 1.0;
    if (projectType === 'metro') {
      typeMultiplier = 1.6; // Raylı sistemler aşırı karmaşık, çakışma riski devasa
    } else if (projectType === 'hastane') {
      typeMultiplier = 1.4; // MEP ağırlıklı binalar, çakışma önleme getirisi çok yüksek
    } else if (projectType === 'havalimani') {
      typeMultiplier = 1.5;
    } else if (projectType === 'alt-yapi') {
      typeMultiplier = 1.2;
    } else {
      typeMultiplier = 0.8; // Konut/ofis daha standart
    }

    // Adjust variables by BIM Level selected
    if (bimLevel === 0) {
      errorPreventionRate = 0.05; // Level 0 standard CAD - neredeyse sıfır koordinasyon getirisi
      timeSavingsWeeks = 0;
      carbonReductionTons = projectBudget * 1.5;
      designPhaseAcceleration = 0;
    } else if (bimLevel === 1) {
      errorPreventionRate = 0.35; 
      timeSavingsWeeks = Math.round(projectBudget * 0.1 * typeMultiplier);
      carbonReductionTons = Math.round(projectBudget * 5 * typeMultiplier);
      designPhaseAcceleration = 15;
    } else if (bimLevel === 2) {
      errorPreventionRate = 0.75; 
      timeSavingsWeeks = Math.round(projectBudget * 0.25 * typeMultiplier);
      carbonReductionTons = Math.round(projectBudget * 12 * typeMultiplier);
      designPhaseAcceleration = 35;
    } else {
      // Düzey 3 (Dijital İkiz & Cloud)
      errorPreventionRate = 0.95; 
      timeSavingsWeeks = Math.round(projectBudget * 0.4 * typeMultiplier);
      carbonReductionTons = Math.round(projectBudget * 22 * typeMultiplier);
      designPhaseAcceleration = 50;
    }

    // Final Metric calculations
    const potentialWasteCost = projectBudget * baseErrorRate * typeMultiplier; // Toplam potansiyel hata maliyeti
    const savedWasteCost = potentialWasteCost * errorPreventionRate;
    const netReturnOnInvestment = (savedWasteCost / (projectBudget * 0.015 * (bimLevel + 1))) * 100; // ROI Oranı %
    const quantitySurveyDeviation = Math.max(1, Math.round(18 - (bimLevel * 5.5))); // Metraj sapması %
    const facilityHandoverDays = Math.max(5, Math.round(180 - (bimLevel * 58))); // Tesis işletmeye devir süresi (gün)

    return {
      savedWasteCost: Number(savedWasteCost.toFixed(1)),
      timeSavingsWeeks,
      carbonReductionTons,
      designPhaseAcceleration,
      netROI: isNaN(netReturnOnInvestment) ? 0 : Math.round(netReturnOnInvestment),
      quantitySurveyDeviation,
      facilityHandoverDays,
      clashesPrevented: Math.round(projectBudget * 4.5 * bimLevel * typeMultiplier)
    };
  };

  const roiResult = calculateROI();

  return (
    <div className="space-y-12">
      {/* HEADER SECTION */}
      <div className="bg-card text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest block">ANALİTİK PANEL &amp; ROI</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">BIM Verimlilik &amp; Olgunluk Dashboard</h1>
          <p className="text-sm text-foreground dark:text-muted-foreground leading-relaxed">
            BIM (Yapı Bilgi Modellemesi) yatırımlarının mühendislik kalitesine, proje takvimine ve bütçe sapmalarına olan somut verimlilik kazançlarını etkileşimli grafiklerle inceleyin. ROI Simülatörünü kullanarak projenizin tahmini kazanç analizini yapabilirsiniz.
          </p>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => setDashboardTab('genel')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                dashboardTab === 'genel'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white/10 text-foreground hover:bg-white/20'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              SEKTÖREL VERİMLİLİK ANALİZLERİ
            </button>
            <button
              onClick={() => setDashboardTab('roi')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                dashboardTab === 'roi'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white/10 text-foreground hover:bg-white/20'
              }`}
              id="dashboard-roi-tab-btn"
            >
              <Calculator className="w-4 h-4" />
              İNTERAKTİF BIM ROI SİMÜLATÖRÜ
            </button>
          </div>
        </div>
      </div>

      {dashboardTab === 'genel' ? (
        /* TAB 1: SEKTÖREL VERİMLİLİK GRAFİKLERİ */
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-extrabold block uppercase">YAPIM SÜRESİ KAZANCI</span>
                <span className="text-xl font-black text-foreground">%25 - %35</span>
                <span className="text-[10px] text-emerald-600 font-bold block">Sahada Hata Engelleme ile</span>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-extrabold block uppercase">BÜTÇE/METRAJ SAPMASI</span>
                <span className="text-xl font-black text-foreground">&lt; %3'ün Altı</span>
                <span className="text-[10px] text-emerald-600 font-bold block">BIM Düzey 2 Olgunlukta</span>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-extrabold block uppercase">TESİS DEVREYE ALMA</span>
                <span className="text-xl font-black text-foreground">15 Kat Daha Hızlı</span>
                <span className="text-[10px] text-emerald-600 font-bold block">Entegre COBie Standardı</span>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-extrabold block uppercase">KAFEİN &amp; MALZEME İSRAFI</span>
                <span className="text-xl font-black text-foreground">%40 Azalma</span>
                <span className="text-[10px] text-emerald-600 font-bold block">Doğru 3D İmalat Detayları</span>
              </div>
            </div>
          </div>

          {/* Graphs Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: BIM Level Comparison */}
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-sm text-foreground uppercase tracking-tight">CAD ve BIM Olgunluk Seviyeleri Karşılaştırması</h3>
                  <p className="text-[11px] text-muted-foreground font-bold">Hata oranları ve zaman sapmalarının BIM seviyesine göre radikal düşüşü</p>
                </div>
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded border border-orange-100">SEKTÖREL VERİ</span>
              </div>
              
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={industryComparisonData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                    <Bar dataKey="Tasarım Hataları" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Metraj Sapması" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Koordinasyon Süresi" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Project Phase Efficiency Trend */}
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-sm text-foreground uppercase tracking-tight">Proje Aşamalarına Göre Verimlilik Gelişimi</h3>
                  <p className="text-[11px] text-muted-foreground font-bold">BIM entegrasyonu sonrası aşamalar boyunca tırmanan mühendislik kalitesi (%)</p>
                </div>
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded border border-orange-100">YAŞAM DÖNGÜSÜ</span>
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyEfficiencyData}
                    margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                    <Line type="monotone" dataKey="Tasarım Hızı (%)" stroke="#0284c7" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Maliyet Kontrolü (%)" stroke="#10b981" strokeWidth={3} />
                    <Line type="monotone" dataKey="Koordinasyon Kalitesi (%)" stroke="#ea580c" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Dimensions Radar & Key Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            
            {/* Chart 3: Radar Chart for ISO 19650 Implementation Areas */}
            <div className="lg:col-span-6 bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-black text-sm text-foreground uppercase tracking-tight">Geleneksel vs ISO 19650 Standart Uyum Olgunluğu</h3>
                <p className="text-[11px] text-muted-foreground font-bold">Mühendislik departmanlarında kriter bazlı olgunluk derecesi karşılaştırması</p>
              </div>

              <div className="h-72 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={maturityDimensionData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Geleneksel Seviye" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
                    <Radar name="BIM ISO 19650 Standardı" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Strategic Insights Cards */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              <div className="bg-gradient-to-br from-background to-card text-foreground rounded-2xl p-6 shadow-md flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-orange-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    DIJITALLEŞME ETKİ RAPORU
                  </div>
                  <h4 className="text-base font-black tracking-tight leading-snug">Metraj ve Hakediş Süreçlerinde Kusursuzluk</h4>
                  <p className="text-xs text-foreground dark:text-muted-foreground leading-relaxed font-medium">
                    Geleneksel 2D çizimlerde metraj hataları ve buna bağlı bütçe sapmaları ortalama <strong className="text-orange-400">%15 - %18</strong> civarındadır. BIM 5D modelleme yönteminde ise nesne parametreleri doğrudan T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı pozlarıyla eşleştiği için bu sapma <strong className="text-emerald-400">%2'nin altına</strong> indirilir.
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground pt-2 border-t border-border">
                  <span>KAYNAK: buildingSMART Türkiye</span>
                  <span>RAPOR: 2026-Q2</span>
                </div>
              </div>

              <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-orange-600" />
                  Mühendislikte Verimlilik Kazanım Matrisi
                </h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-card border border-border rounded-xl font-bold">
                    <span className="text-muted-foreground">3D Çakışma Analizi (Clash)</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">%90 Sahada Sıfır Hata</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-card border border-border rounded-xl font-bold">
                    <span className="text-muted-foreground">4D Zaman Simülasyonu</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">%20 Takvim Kısaltma</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-card border border-border rounded-xl font-bold">
                    <span className="text-muted-foreground">COBie ile Bilgi Teslimatı</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">15 Kat Hızlı Devir</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* TAB 2: INTERACTIVE BIM ROI CALCULATOR SIMULATOR */
        <div className="bg-white border border-border rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 animate-in fade-in duration-300" id="roi-simulator">
          
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-orange-600" />
              Kişiselleştirilmiş BIM ROI Simülasyonu
            </h3>
            <p className="text-xs text-muted-foreground font-bold">
              Proje bütçesini, disiplin tipini ve hedeflediğiniz BIM olgunluk seviyesini değiştirerek sağlayacağınız verimliliği ve finansal tasarrufu anlık görün.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Controls Column */}
            <div className="lg:col-span-5 bg-card border border-border p-6 rounded-2xl space-y-6">
              
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block border-b border-border pb-2">PROJE PARAMETRELERİ</span>

              {/* Input 1: Budget Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <label className="text-foreground flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Proje Yaklaşık Bütçesi
                  </label>
                  <span className="text-orange-600 font-extrabold text-sm">{projectBudget} Milyon TL</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="10"
                  value={projectBudget} 
                  onChange={(e) => setProjectBudget(Number(e.target.value))}
                  className="w-full accent-orange-600 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  id="budget-range-slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                  <span>10 Milyon TL</span>
                  <span>500 Milyon</span>
                  <span>1 Milyar TL</span>
                </div>
              </div>

              {/* Input 2: Project Type Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Proje Yapı Sınıfı &amp; Disiplini</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'hastane', name: 'Sağlık Kompleksi / Hastane (MEP Ağırlıklı)', desc: 'Yüksek çakışma riski barındıran hassas yapılar.' },
                    { id: 'metro', name: 'Altyapı & Raylı Sistem / Metro', desc: 'Aşırı karmaşık mühendislik ve yüksek lojistik koordinasyon.' },
                    { id: 'havalimani', name: 'Havalimanı / Terminal Binası', desc: 'Çok geniş alana yayılan ve geniş açıklıklı tasarımlar.' },
                    { id: 'alt-yapi', name: 'Ulaştırma, Yol & Köprüler', desc: 'GIS-BIM ve arazi entegrasyonu odaklı altyapı işleri.' },
                    { id: 'konut', name: 'Toplu Konut / Rezidans & Ofis', desc: 'Tekrarlayan kat planları ve standart tesisat tasarımları.' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setProjectType(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        projectType === t.id
                          ? 'border-orange-500 bg-orange-50/15 text-foreground ring-1 ring-orange-500'
                          : 'border-border bg-white text-muted-foreground hover:border-border'
                      }`}
                      id={`proj-type-${t.id}`}
                    >
                      <span className="text-xs font-black block">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input 3: BIM Maturity Level Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Hedeflenen BIM Olgunluk Seviyesi</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setBimLevel(lvl)}
                      className={`p-3 rounded-xl border font-black text-xs text-center transition-all cursor-pointer flex flex-col justify-center items-center ${
                        bimLevel === lvl
                          ? 'bg-card border-border text-white'
                          : 'border-border bg-white text-muted-foreground hover:bg-card'
                      }`}
                      id={`target-bim-lvl-${lvl}`}
                    >
                      <span>DÜZEY</span>
                      <span className="text-lg font-black">{lvl}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold leading-normal pt-1 italic">
                  {bimLevel === 0 && 'Geleneksel CAD çizimi. Koordinasyon ve veri transferi getirisi bulunmaz.'}
                  {bimLevel === 1 && 'Kısmi 3D modelleme. Sınırlı işbirliği, veriler silolar halinde saklanır.'}
                  {bimLevel === 2 && 'ISO 19650 bilgi konteyneri ve durum geçiş kurallarını destekleyen, Ortak Veri Ortamı (CDE) yönetimli işbirlikçi BIM.'}
                  {bimLevel === 3 && 'Tesis işletmesine entegre COBie veritabanı, bulut e-PYS sistemleri ve yaşayan Dijital İkiz.'}
                </p>
              </div>

            </div>

            {/* Right Output Dashboard Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* ROI Main Banner */}
              <div className="bg-card text-white p-6 rounded-2xl relative overflow-hidden shadow-md space-y-4">
                <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
                
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block">SİMÜLASYON ANALİZİ</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs text-foreground dark:text-muted-foreground font-bold block">Öngörülen Tahmini Finansal Tasarruf</span>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 block tracking-tight mt-1">
                      {roiResult.savedWasteCost === 0 ? '0' : `₺${roiResult.savedWasteCost}M`}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                      (Tasarım hata ve çakışma maliyetlerinden)
                    </span>
                  </div>

                  <div className="border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
                    <span className="text-xs text-foreground dark:text-muted-foreground font-bold block">Yatırım Geri Dönüş Oranı (ROI)</span>
                    <span className="text-3xl sm:text-4xl font-black text-orange-500 block tracking-tight mt-1">
                      {roiResult.netROI === 0 ? 'Sıfır Getiri' : `%${roiResult.netROI}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                      (BIM teknolojik/insan bütçesine oranla)
                    </span>
                  </div>
                </div>

                {bimLevel === 0 && (
                  <div className="flex gap-2 p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-[11px] text-red-300 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    Düzey 0'da herhangi bir dijital verimlilik tasarrufu hesaplanamaz. Lütfen en az BIM Düzey 1 veya 2'yi seçerek kazançları analiz edin.
                  </div>
                )}
              </div>

              {/* ROI Core Metrics Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Metric 1 */}
                <div className="bg-white border border-border p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">MÜHENDİSLİK HATA KOORDİNASYONU</span>
                    <Zap className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-foreground">{roiResult.clashesPrevented} Çakışma</span>
                    <p className="text-[11px] text-muted-foreground leading-normal font-semibold mt-1">
                      Sahaya çıkmadan tasarım aşamasında engellenen boru-kiriş, elektrik-kanal çakışması sayısı.
                    </p>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-border p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">TAKTAK KAZANCI / TESLİMAT SÜRESİ</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-foreground">{roiResult.timeSavingsWeeks} Hafta Tasarruf</span>
                    <p className="text-[11px] text-muted-foreground leading-normal font-semibold mt-1">
                      BIM 4D simülasyonları ve koordinasyon toplantıları sayesinde şantiyede kazanılan yapım takvimi.
                    </p>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white border border-border p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">PARAMETRİK METRAJ GÜVENİLİRLİĞİ</span>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-foreground">% {roiResult.quantitySurveyDeviation} Sapma</span>
                    <p className="text-[11px] text-muted-foreground leading-normal font-semibold mt-1">
                      BIM modellerinden doğrudan çıkartılan malzeme miktarı toleransı (Geleneksel yöntemlerde sapma %18'dir).
                    </p>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white border border-border p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">TESİS DEVİR HIZI (HANDOVER)</span>
                    <Hammer className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-foreground">{roiResult.facilityHandoverDays} Gün</span>
                    <p className="text-[11px] text-muted-foreground leading-normal font-semibold mt-1">
                      COBie standardında doğrulanmış veritabanı sayesinde as-built verilerin tesis işletme ekibine sorunsuz devir süresi.
                    </p>
                  </div>
                </div>

              </div>

              {/* Environmental Carbon savings */}
              <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">6D Yeşil BIM &amp; Karbon Tasarrufu</h4>
                  <p className="text-xs text-muted-foreground leading-normal font-semibold">
                    Simüle edilen bu projede, tasarımda sağlanan malzeme optimizasyonu ve şantiyedeki israfın engellenmesi sayesinde tahmini <strong className="text-emerald-700">{roiResult.carbonReductionTons} Ton CO₂</strong> karbon ayak izi salınımı önlenebilir.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
