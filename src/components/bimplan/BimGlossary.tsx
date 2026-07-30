import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, ChevronDown, ChevronUp, Tag, HelpCircle, Trophy, RefreshCw, Sparkles, Check, X, ArrowRight } from 'lucide-react';

interface GlossaryTerm {
  term: string;
  abbreviation?: string;
  turkishName: string;
  category: 'Genel' | 'Süreç' | 'Teknoloji' | 'Mali & Yönetim' | 'ISO 19650';
  definition: string;
  englishTranslation: string;
  isoRole: string;
  importance: 'Çok Yüksek' | 'Yüksek' | 'Orta';
}

export default function BimGlossary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [expandedTerm, setExpandedTerm] = useState<string | null>('EIR');
  
  // Quiz States
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const glossaryTerms: GlossaryTerm[] = [
    {
      term: 'EIR',
      abbreviation: 'Exchange Information Requirements',
      turkishName: 'İşveren Bilgi Gereksinimleri',
      category: 'ISO 19650',
      definition: 'İşverenin ihale öncesi hazırladığı, yükleniciden beklenen bilgi teslimat biçimlerini, kullanılacak yazılım standartlarını ve veri hiyerarşisini belirten resmi kılavuz dökümandır.',
      englishTranslation: 'Exchange Information Requirements',
      isoRole: 'Bilgi yönetim sürecinin başlangıç noktası ve ihale şartnamesinin teknik omurgasıdır.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'BEP',
      abbreviation: 'BIM Execution Plan',
      turkishName: 'BIM Uygulama Planı',
      category: 'ISO 19650',
      definition: 'Yüklenicinin, işverenin EIR dökümanındaki taleplerine nasıl cevap vereceğini, koordinasyon takvimini, yazılım/donanım altyapısını ve ekibini detaylandırdığı yaşayan uygulama dökümanıdır.',
      englishTranslation: 'BIM Execution Plan',
      isoRole: 'Projenin tüm taraflarının uyması gereken teknik koordinasyon sözleşmesi niteliğindedir.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'CDE',
      abbreviation: 'Common Data Environment',
      turkishName: 'Ortak Veri Ortamı',
      category: 'Teknoloji',
      definition: 'Projedeki tüm teknik dökümanların, 3D modellerin ve yazışmaların tek bir güvenli kaynak üzerinden yönetilmesini, onaylanmasını ve revizyon kontrolünü sağlayan bulut veya yerel veri havuzudur.',
      englishTranslation: 'Common Data Environment',
      isoRole: 'ISO 19650 standartlarına göre bilgi paylaşımları CDE üzerinde "WIP", "Shared", "Published" ve "Archived" durum kodlarıyla yönetilir.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'IFC',
      abbreviation: 'Industry Foundation Classes',
      turkishName: 'Endüstri Temel Sınıfları',
      category: 'Teknoloji',
      definition: 'BuildingSMART tarafından geliştirilen, farklı BIM yazılımlarının (Revit, ArchiCAD, Allplan vb.) birbirleriyle veri kaybı olmadan model paylaşabilmesini sağlayan openBIM evrensel dosya formatıdır.',
      englishTranslation: 'Industry Foundation Classes',
      isoRole: 'Sözleşmesel teslimatlarda yazılım bağımsızlığı ve uzun ömürlü arşivleme için zorunlu formattır.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'IFC 4.3',
      abbreviation: 'IFC Infrastructure & Civil Schema',
      turkishName: 'Altyapı ve Sivil Yapılar openBIM Şeması',
      category: 'Teknoloji',
      definition: 'buildingSMART tarafından yayınlanan ve altyapı projelerini (Yol, Demiryolu, Köprü, Tünel ve Hizmet Hatları) kapsayan en güncel ISO 16739-1:2024 openBIM şemasıdır.',
      englishTranslation: 'IFC 4.3 Infrastructure Standard',
      isoRole: 'Karayolu, demiryolu ve viyadük gibi sivil altyapı modellerinde IfcAlignment ve IfcBridge sınıflarıyla veri değişimi sağlar.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'Eurocode 2',
      abbreviation: 'EN 1992-1-1 Structural Concrete Design',
      turkishName: 'Avrupa Betonarme Yapı Tasarım Standardı',
      category: 'Genel',
      definition: 'Betonarme yapıların tasarımı, donatı kenetlenme boyu (l_bd), bindirme boyu (l_0) ve paspayı şartlarını belirleyen Avrupa standardıdır.',
      englishTranslation: 'Eurocode 2: Design of concrete structures',
      isoRole: 'BIM donatı modellerinde (LOD 400) kenetlenme katsayıları ve etriye bükümlerinin mühendislik kontrolünü sağlar.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'ÇŞB Pozu',
      abbreviation: 'ÇŞİDB Birim Fiyat Poz Kütüphanesi',
      turkishName: 'Resmi Birim Fiyat Poz Numaraları',
      category: 'Mali & Yönetim',
      definition: 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı tarafından her yıl yayınlanan, inşaat imalatlarının (beton, donatı, kalıp) resmi poz numaraları ve birim fiyat tarifleridir.',
      englishTranslation: 'Official Ministry Unit Price Cost Codes',
      isoRole: '5D BIM metrajlarında IFC model nesnelerine Pset_ElementCost.CostCode olarak atanarak otomatik maliyet hesabı sağlar.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'BVBS',
      abbreviation: 'Bundesvereinigung Bausoftware Standard',
      turkishName: 'Otomatik Donatı Büküm Veri Formatı',
      category: 'Teknoloji',
      definition: 'LOD 400 donatı modellerinden elde edilen donatı çapı, büküm açısı, paspayı ve kesim boyu verilerinin CNC demir büküm makinelerine aktarıldığı uluslararası formattır.',
      englishTranslation: 'Rebar CNC Bending Code Standard',
      isoRole: 'Şantiyelerde donatı kesim firesini %8\'den %1.5 seviyesine indiren donatı imalat otomasyon standardıdır.',
      importance: 'Yüksek'
    },
    {
      term: 'COBie',
      abbreviation: 'Construction Operations Building Information Exchange',
      turkishName: 'Yapım Operasyonları Bina Bilgi Değişimi',
      category: 'Mali & Yönetim',
      definition: 'Yapı elemanlarının marka, model, seri numarası, yedek parça ve garanti bilgilerini içeren, inşaat tamamlandığında tesis işletme ekiplerine (FM) teslim edilen standart e-tablo verisidir.',
      englishTranslation: 'Construction Operations Building Information Exchange',
      isoRole: 'Yatırımın işletme aşamasına (CAFM/IWMS yazılımları) sorunsuz aktarılmasını sağlar.',
      importance: 'Yüksek'
    },
    {
      term: 'LOD',
      abbreviation: 'Level of Development',
      turkishName: 'Model Gelişim Seviyesi',
      category: 'Süreç',
      definition: 'Modeldeki elemanların hem geometrik detay (LOG) hem de bilgi derinliği (LOI) olarak hangi olgunlukta olduğunu gösteren ölçek sistemidir (LOD 100 - LOD 500).',
      englishTranslation: 'Level of Development',
      isoRole: 'Hangi aşamada hangi model detayına güvenilerek metraj ve analiz yapılacağını netleştirir.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'LOG',
      abbreviation: 'Level of Geometry',
      turkishName: 'Geometrik Detay Derecesi',
      category: 'Süreç',
      definition: 'Bir model elemanının fiziksel görünümünün ne derece detaylandırıldığını gösteren metriktir. Sadece kütlesel boyuttan (LOG 100) fabrika imalat detaylarına (LOG 400) kadar değişir.',
      englishTranslation: 'Level of Geometry',
      isoRole: 'Modellerin gereksiz yere ağırlaşmasını (over-modeling) engellemek için doğru sınırlandırılmalıdır.',
      importance: 'Yüksek'
    },
    {
      term: 'LOI',
      abbreviation: 'Level of Information',
      turkishName: 'Bilgi Detay Derecesi',
      category: 'Süreç',
      definition: 'Model elemanlarına tanımlanan parametrik nitelik verilerinin derinliğidir. Malzeme mukavemeti, U-değeri, poz numaraları, üretici bilgileri bu kapsamdadır.',
      englishTranslation: 'Level of Information',
      isoRole: 'Metraj, 5D maliyet analizi ve 7D tesis yönetiminde otomatik veri ayıklamayı mümkün kılar.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'OIR',
      abbreviation: 'Organizational Information Requirements',
      turkishName: 'Kurumsal Bilgi Gereksinimleri',
      category: 'ISO 19650',
      definition: 'İşveren kurumun veya şirketin kendi ticari ve operasyonel hedefleri doğrultusunda ihtiyaç duyduğu genel kurumsal bilgi standartları kılavuzudur.',
      englishTranslation: 'Organizational Information Requirements',
      isoRole: 'ISO 19650 hiyerarşisinde en tepede yer alan ve proje seviyesindeki diğer dökümanları besleyen ana referanstır.',
      importance: 'Orta'
    },
    {
      term: 'PIR',
      abbreviation: 'Project Information Requirements',
      turkishName: 'Proje Bilgi Gereksinimleri',
      category: 'ISO 19650',
      definition: 'Belirli bir projenin tasarımı ve yapımı süresince idarenin ihtiyaç duyduğu stratejik bilgileri listeleyen dökümandır.',
      englishTranslation: 'Project Information Requirements',
      isoRole: 'OIR belgesindeki kurumsal beklentilerin, spesifik bir proje bazında somutlaştırılmış halidir.',
      importance: 'Yüksek'
    },
    {
      term: 'Clash Detection',
      turkishName: 'Çakışma Analizi',
      category: 'Süreç',
      definition: 'Mimari, statik ve MEP (mekanik-elektrik-tesisat) modellerinin birleştirilerek, şantiyeye çıkmadan önce bilgisayar ortamında birbirinin içinden geçen hatalı elemanların tespit edilmesidir.',
      englishTranslation: 'Clash Detection / Clash Coordination',
      isoRole: 'Maddi kayıpları ve sahada oluşacak gecikmeleri tasarım aşamasında engeller.',
      importance: 'Çok Yüksek'
    },
    {
      term: '5D BIM',
      turkishName: 'Maliyet Entegre Modelleme',
      category: 'Mali & Yönetim',
      definition: '3D model elemanlarının zaman planı (4D) ile beraber bütçe, hakediş ve bakanlık poz kodlarıyla ilişkilendirilerek maliyet simülasyonlarının yapılması sürecidir.',
      englishTranslation: '5D Cost Estimation & Management',
      isoRole: 'Otomatik metraj üretimi ve dinamik nakit akış takibi sağlayarak bütçe sapmalarını önler.',
      importance: 'Çok Yüksek'
    },
    {
      term: 'AIM',
      abbreviation: 'Asset Information Model',
      turkishName: 'Varlık Bilgi Modeli',
      category: 'Mali & Yönetim',
      definition: 'Bina veya altyapı tesisinin işletme ve bakım aşaması boyunca kullanılan, operasyonel verileri, bakım geçmişini barındıran dijital ikiz modelidir.',
      englishTranslation: 'Asset Information Model',
      isoRole: 'Tesis işletmesi (7D) boyunca güncellenen yaşayan nihai veri modelidir.',
      importance: 'Yüksek'
    },
    {
      term: 'PIM',
      abbreviation: 'Project Information Model',
      turkishName: 'Proje Bilgi Modeli',
      category: 'Süreç',
      definition: 'Tasarım ve yapım (inşaat) aşamalarında üretilen, teslimat koordinasyonunu sağlamak için kullanılan geçici ve sürekli gelişen bilgi modelidir.',
      englishTranslation: 'Project Information Model',
      isoRole: 'Tasarım ve inşaat bittiğinde doğrulanarak AIM (Varlık Bilgi Modeli) haline dönüştürülür.',
      importance: 'Yüksek'
    },
    {
      term: 'OpenBIM',
      turkishName: 'Açık BIM',
      category: 'Genel',
      definition: 'Tüm üreticilerin ve paydaşların yazılım sınırlaması olmadan işbirliği yapabilmesini destekleyen, evrensel açık standartlar ve iş akışları felsefesidir.',
      englishTranslation: 'OpenBIM',
      isoRole: 'Kamu ihalelerinde tekelleşmeyi engeller ve açık rekabet koşulları sağlar.',
      importance: 'Çok Yüksek'
    }
  ];

  // Quiz Questions database
  const quizQuestions = [
    {
      question: "İşverenin ihale öncesi hazırladığı ve teknik standartları belirleyen dokümanın adı nedir?",
      options: ["BEP (BIM Uygulama Planı)", "EIR (İşveren Bilgi Gereksinimleri)", "CDE (Ortak Veri Ortamı)", "COBie Tablosu"],
      answer: "EIR (İşveren Bilgi Gereksinimleri)",
      tip: "Bu doküman ihale şartnamesinin teknik ekidir."
    },
    {
      question: "Farklı yazılımlar arasında veri kaybı olmadan model paylaşımını sağlayan açık veri formatı hangisidir?",
      options: ["RVT", "DWG", "IFC", "PDF"],
      answer: "IFC",
      tip: "BuildingSMART tarafından openBIM standardı olarak geliştirilmiştir."
    },
    {
      question: "Tesis işletme ekiplerine marka, model ve garanti bilgilerini teslim etmek için kullanılan standart e-tablo formatı hangisidir?",
      options: ["COBie", "LOD 300", "BEP", "OIR"],
      answer: "COBie",
      tip: "Bu döküman Excel formatında FM (Facility Management) ekiplerine sunulur."
    },
    {
      question: "Yüklenicinin, işverenin taleplerine nasıl yanıt vereceğini açıkladığı yaşayan sözleşmesel plan nedir?",
      options: ["EIR", "BEP (BIM Uygulama Planı)", "CDE", "LOG 400"],
      answer: "BEP (BIM Uygulama Planı)",
      tip: "Static değildir, projenin gidişatına göre güncellenir."
    },
    {
      question: "BIM'in hangi boyutunda bütçe, maliyet simülasyonları ve Poz eşleştirmeleri entegre edilir?",
      options: ["3D", "4D", "5D", "7D"],
      answer: "5D",
      tip: "4D zaman planlaması iken, 5D maliyet boyutudur."
    }
  ];

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setQuizCompleted(false);
  };

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return; // Prevent multiple selection
    setSelectedAnswer(option);
    if (option === quizQuestions[currentQuestionIndex].answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setQuizCompleted(true);
    }
  };

  // Filter glossary
  const filteredTerms = glossaryTerms.filter(t => {
    const matchesSearch = t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.turkishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.abbreviation && t.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          t.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tümü' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest block">ETKİLEŞİMLİ SÖZLÜK</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">BIM Terimleri &amp; Kısaltmalar Sözlüğü</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Dijital inşaat ekosistemindeki en çok kullanılan akronimler, teknik kavramlar ve ISO 19650 terminolojisi. Kelimelerin üzerine tıklayarak detaylı tanımlara, İngilizce karşılıklarına ve proje içi önem seviyelerine erişebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* GLOSSARY LIST PANEL */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Terim veya tanım ara... (örn: EIR, COBie, Çakışma...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-800"
                id="search-glossary"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              {['Tümü', 'Genel', 'Süreç', 'Teknoloji', 'Mali & Yönetim', 'ISO 19650'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === category
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  id={`filter-glossary-cat-${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Term Accordion List */}
          <div className="space-y-3">
            {filteredTerms.map((item) => {
              const isExpanded = expandedTerm === item.term;
              return (
                <div
                  key={item.term}
                  className={`border rounded-2xl transition-all duration-300 bg-white ${
                    isExpanded 
                      ? 'border-orange-500 shadow-md ring-1 ring-orange-100' 
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                  id={`term-wrapper-${item.term}`}
                >
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setExpandedTerm(isExpanded ? null : item.term)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                    id={`term-header-${item.term}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900 mono">{item.term}</span>
                        {item.abbreviation && (
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                            ({item.abbreviation})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                          {item.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          item.importance === 'Çok Yüksek'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : item.importance === 'Yüksek'
                            ? 'bg-orange-50 text-orange-600 border border-orange-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          ÖNEM: {item.importance}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-orange-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Expanded Content with Animation */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-xs leading-relaxed text-slate-600">
                          
                          {/* Turkish Name */}
                          <div>
                            <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-widest block">TÜRKÇE KARŞILIĞI</span>
                            <span className="font-bold text-slate-800 text-sm">{item.turkishName}</span>
                          </div>

                          {/* Definition */}
                          <div>
                            <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-widest block mb-1">KISA TANIMI</span>
                            <p className="text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-medium">
                              {item.definition}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* English name */}
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-widest block">İNGİLİZCE LİTERATÜR</span>
                              <span className="font-bold text-slate-700 block italic">{item.englishTranslation}</span>
                            </div>

                            {/* ISO 19650 workflow role */}
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-widest block">ISO 19650 PROJE ROLÜ</span>
                              <span className="font-bold text-slate-700 block">{item.isoRole}</span>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {filteredTerms.length === 0 && (
              <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-slate-400">
                Arama kriterlerine uygun terim bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* INTERACTIVE QUIZ SIDEBAR */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 sticky top-24" id="quiz-panel">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Trophy className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              BIM Terimleri Bilgi Testi
            </h3>
          </div>

          {!quizStarted ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-600">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">BIM Bilgini Test Et!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  BIM standartları, kısaltmalar ve roller hakkındaki bilginizi ölçen 5 soruluk eğlenceli ve öğretici mini testi tamamlayın.
                </p>
              </div>
              <button
                onClick={handleStartQuiz}
                className="w-full bg-slate-900 hover:bg-orange-600 text-white py-3 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-sm"
              >
                TESTİ BAŞLAT
              </button>
            </div>
          ) : quizCompleted ? (
            <div className="space-y-6 text-center py-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-base text-slate-900">Test Tamamlandı!</h4>
                <p className="text-sm font-bold text-slate-700">Skorunuz: <span className="text-orange-600 text-lg">{score} / {quizQuestions.length}</span></p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {score === quizQuestions.length 
                    ? "Tebrikler! Kusursuz bir BIM uzmanısınız. Tüm standartlara hakimsiniz!" 
                    : score >= 3 
                    ? "Harika! BIM temelleriniz oldukça güçlü. Kendinizi geliştirmeye devam edin." 
                    : "Başlangıç için fena değil! Terimler sözlüğündeki detayları okuyarak bilginizi tazeleyebilirsiniz."}
                </p>
              </div>
              <button
                onClick={handleStartQuiz}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-800 py-3 px-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-orange-600" />
                YENİDEN BAŞLAT
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Progress */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>SORU {currentQuestionIndex + 1} / {quizQuestions.length}</span>
                <span className="mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">SKOR: {score}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-orange-500 h-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>

              {/* Question */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                  {quizQuestions[currentQuestionIndex].question}
                </h4>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {quizQuestions[currentQuestionIndex].options.map((opt) => {
                  const isSelected = selectedAnswer === opt;
                  const isCorrect = opt === quizQuestions[currentQuestionIndex].answer;
                  let optStyle = 'border-slate-200 hover:border-orange-200 bg-white';
                  
                  if (selectedAnswer !== null) {
                    if (isCorrect) {
                      optStyle = 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500';
                    } else if (isSelected) {
                      optStyle = 'border-red-500 bg-red-50/50 text-red-900 ring-1 ring-red-500';
                    } else {
                      optStyle = 'border-slate-100 bg-slate-50/30 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswerSelect(opt)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3.5 rounded-xl text-left text-xs font-semibold border transition-all flex justify-between items-center ${optStyle}`}
                      id={`quiz-opt-${opt}`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer !== null && isCorrect && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {selectedAnswer !== null && isSelected && !isCorrect && (
                        <X className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tip or Feedback */}
              {selectedAnswer !== null && (
                <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl space-y-1.5 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-700 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    AÇIKLAYICI TEKNİK NOT
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {quizQuestions[currentQuestionIndex].tip}
                  </p>
                  
                  <button
                    onClick={handleNextQuestion}
                    className="w-full bg-slate-900 hover:bg-orange-600 text-white py-2.5 px-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 mt-3"
                  >
                    <span>{currentQuestionIndex === quizQuestions.length - 1 ? 'SONUÇLARI GÖR' : 'SONRAKİ SORU'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
