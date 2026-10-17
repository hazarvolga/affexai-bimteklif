import { useState } from 'react';
import { Search, Filter, CheckSquare, Square, Award, ArrowRight, ShieldCheck, HelpCircle, Users, ClipboardCheck, Info } from 'lucide-react';
import { Standard } from '../../types';

export default function StandardsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [activeStandardId, setActiveStandardId] = useState<string>('iso19650');
  
  // Dynamic checklist progress state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'iso19650-0': true,
    'iso19650-1': true,
    'ifc-0': true,
    'cobie-0': false,
  });

  const standardsData: Standard[] = [
    {
      id: 'iso19650',
      code: 'ISO 19650-1 & 2',
      title: 'Uluslararası Bilgi Yönetimi Standardı',
      description: 'Yapı varlıklarının tüm yaşam döngüsü boyunca bilgilerin organizasyonu ve dijitalleştirilmesi süreçlerini yönetir.',
      category: 'Yönetim',
      audience: 'İşverenler, Proje Geliştiricileri, Yükleniciler ve BIM Yöneticileri',
      deliverables: [
        'EIR (Bilgi Değişim Gereksinimleri) Şablonu',
        'BEP (BIM Uygulama Planı) Rehberi',
        'CDE (Ortak Veri Ortamı) İş Akışı Şeması',
        'TIDP (Görev Bilgi Teslimatı Planı)'
      ],
      checklist: [
        'Organizasyonel Bilgi Gereksinimlerinin (OIR) Tanımlanması',
        'Proje Bilgi Gereksinimlerinin (PIR) Belirlenmesi',
        'Ortak Veri Ortamı (CDE) Kurulumunun Yapılması',
        'Bilgi Teslimat Yetkinlik Analizlerinin Tamamlanması',
        'Tasarım Ekibi Görev Dağılım Matrislerinin Onaylanması'
      ],
      bgClass: 'border-blue-100 bg-blue-50/10 text-blue-700',
      iconName: 'iso'
    },
    {
      id: 'ifc43',
      code: 'IFC 4.3 (ISO 16739)',
      title: 'Açık Veri Standardı (OpenBIM)',
      description: 'Yazılımlardan bağımsız olarak üç boyutlu model ve parametrik bilgi aktarımını sağlayan openBIM standart protokolüdür.',
      category: 'Birlikte Çalışabilirlik',
      audience: 'Yazılım Entegratörleri, Tasarımcılar, Koordinatörler',
      deliverables: [
        'IFC Model İhracat Kuralları (MVD)',
        'Disiplinler Arası Çakışma Koordinasyon Dosyaları',
        'Sınıflandırma Sistemi Eşleme Tablosu',
        'Yol/Köprü Altyapı IFC Şeması (v4.3 Yeniliği)'
      ],
      checklist: [
        'Tasarım Yazılımlarında IFC İhracat Şablonlarının Ayarlanması',
        'Doğru IFC Nesne Sınıflandırmalarının Yapılması (IfcWall, IfcSlab vb.)',
        'Uluslararası Koordinat Sistemi Entegrasyonu (GIS/Survey Point)',
        'MVD (Model View Definition) Seçim Kurallarının Tanımlanması'
      ],
      bgClass: 'border-orange-100 bg-orange-50/10 text-orange-700',
      iconName: 'ifc'
    },
    {
      id: 'bs1192',
      code: 'BS 1192:2007',
      title: 'Doküman İsimlendirme ve İş Akışı Protokolü',
      description: 'BIM projelerinde yer alan tüm dosya, klasör ve modellerin tekil kodlama ve isimlendirme hiyerarşisidir.',
      category: 'Protokol',
      audience: 'BIM Yöneticileri, Doküman Kontrolörleri, Arşiv Uzmanları',
      deliverables: [
        'Proje Kodlama ve Adlandırma Kılavuzu',
        'Revizyon ve Durum Kodları (S0, S1, S2 vb.)',
        'Klasörleme ve Sorumluluk Matrisi',
        'Dosya Doğrulama Betikleri'
      ],
      checklist: [
        'İsimlendirme Alanlarının Belirlenmesi (Proje-Orijinatör-Hacim-Kat-Tip-Disiplin-Numara)',
        'Metadata Alanlarının ve Durum Kodlarının Entegrasyonu',
        'Gereksiz Dosya Çöplüğünün Engellenmesi İçin Silme Kuralları',
        'Arşivleme ve Teslimat Prosedürünün Tanımlanması'
      ],
      bgClass: 'border-slate-100 bg-slate-50/10 text-slate-700',
      iconName: 'bs'
    },
    {
      id: 'cobiev24',
      code: 'COBie v2.4 (ISO 22057)',
      title: 'Tesis Yönetimi Veri Teslimat Standardı',
      description: 'Yüklenicinin işverene teslim edeceği cihaz, ekipman ve mahal bilgilerini içeren e-tablo tabanlı teslimat standardıdır.',
      category: 'Tesis Yönetimi',
      audience: 'Tesis İşletmecileri, Varlık Yöneticileri, FM Ekipleri',
      deliverables: [
        'COBie Veri Sayfaları (Excel / XML Formatında)',
        'Varlık Bakım ve Garanti Veri Listesi',
        'Yedek Parça ve Sarf Malzemesi Matrisi',
        'Mahal (Spaces) ve Sistem Gruplama Şablonu'
      ],
      checklist: [
        'Modellerde Mahal (Space) ve Bölge (Zone) Tanımlamalarının Yapılması',
        'Ekipmanların Marka, Model, Seri No ve Garanti Bilgilerinin Girişi',
        'COBie İhracat Filtrelerinin ve Sınıflandırmalarının Tamamlanması',
        'Tesis Yönetimi Yazılımı (CAFM/IWMS) Entegrasyon Testleri'
      ],
      bgClass: 'border-emerald-100 bg-emerald-50/10 text-emerald-700',
      iconName: 'cobie'
    }
  ];

  const handleToggleCheck = (key: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter list
  const filteredStandards = standardsData.filter(std => {
    const matchesSearch = std.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          std.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          std.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tümü' || std.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeStandard = standardsData.find(s => s.id === activeStandardId) || standardsData[0];

  // Calculate compliance for active standard
  const activeChecklist = activeStandard.checklist;
  const completedCount = activeChecklist.filter((_, idx) => !!checkedItems[`${activeStandard.id}-${idx}`]).length;
  const complianceScore = Math.round((completedCount / activeChecklist.length) * 100) || 0;

  return (
    <div className="space-y-12">
      {/* Intro */}
      <div className="bg-card text-foreground rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest block">EVRENSEL METODOLOJİ</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">BIM Standartları Teknik Rehberi</h1>
          <p className="text-sm text-foreground dark:text-muted-foreground leading-relaxed">
            Dijital inşaat süreçlerinin temel taşları olan uluslararası ve ulusal teknik standartları inceleyin. Projenizin uyumluluğunu test etmek için interaktif denetim araçlarını kullanın.
          </p>
        </div>
      </div>

      {/* Main Panel with Filter & Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Search and Standard Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Standart ara... (örn: ISO 19650, IFC...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-border rounded-xl text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-800"
                id="search-standards"
              />
            </div>

            {/* Category Filter buttons */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              {['Tümü', 'Yönetim', 'Birlikte Çalışabilirlik', 'Protokol', 'Tesis Yönetimi'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === category
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'
                  }`}
                  id={`filter-category-${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStandards.map((std) => {
              const isActive = activeStandardId === std.id;
              return (
                <div
                  key={std.id}
                  onClick={() => setActiveStandardId(std.id)}
                  className={`border rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isActive 
                      ? 'bg-white border-orange-500 shadow-md ring-1 ring-orange-500' 
                      : 'bg-white border-border hover:border-orange-300 shadow-sm'
                  }`}
                  id={`std-card-${std.id}`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-extrabold text-[10px] uppercase tracking-wider mono">
                        {std.category}
                      </span>
                      <Award className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600">{std.code}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{std.title}</p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Ayrıntılar</span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${isActive ? 'text-orange-600 translate-x-1' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              );
            })}
            
            {filteredStandards.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white border border-slate-100 rounded-2xl text-muted-foreground">
                Arama kriterlerine uygun standart bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* Right Active Detail View Panel */}
        <div className="lg:col-span-5 bg-white border border-border rounded-2xl p-8 shadow-sm space-y-8 sticky top-24">
          <div className="border-b border-slate-100 pb-5 space-y-2">
            <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full font-bold text-[10px] uppercase tracking-widest inline-block">
              {activeStandard.code}
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{activeStandard.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{activeStandard.description}</p>
          </div>

          {/* Details Tabs */}
          <div className="space-y-6">
            
            {/* Target Audience */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                <Users className="w-4 h-4 text-orange-600" />
                Hedef Kitle (Kimler İçin?)
              </div>
              <p className="text-xs text-muted-foreground bg-slate-50 border border-slate-100 p-3.5 rounded-xl leading-relaxed">
                {activeStandard.audience}
              </p>
            </div>

            {/* Deliverables List */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                <ClipboardCheck className="w-4 h-4 text-orange-600" />
                Temel Teknik Teslimatlar
              </div>
              <ul className="grid grid-cols-1 gap-2">
                {activeStandard.deliverables.map((d, index) => (
                  <li key={index} className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dynamic Compliance Checklist */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  Uyum ve Kontrol Listesi
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-muted-foreground">UYUMLULUK:</span>
                  <span className="mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                    %{complianceScore}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-orange-600 h-full transition-all duration-300"
                  style={{ width: `${complianceScore}%` }}
                ></div>
              </div>

              {/* Interactive checklist options */}
              <div className="space-y-2">
                {activeStandard.checklist.map((item, index) => {
                  const checkKey = `${activeStandard.id}-${index}`;
                  const isChecked = !!checkedItems[checkKey];
                  return (
                    <button
                      key={index}
                      onClick={() => handleToggleCheck(checkKey)}
                      className={`flex items-start gap-3 w-full p-3.5 rounded-xl text-left text-xs font-medium transition-all border ${
                        isChecked 
                          ? 'bg-slate-50 border-orange-200 text-slate-800' 
                          : 'bg-white border-slate-150 text-muted-foreground hover:bg-slate-50'
                      }`}
                      id={`chk-${checkKey}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-foreground dark:text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advice Callout */}
            <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-orange-700 text-[10px] font-extrabold uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" />
                PROFESYONEL ÖNERİ
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                Uluslararası ihale şartnamelerinde bu kriterleri tamamlamış olmak, projenin teknik çeyrek denetimlerinde tam puan almasını sağlar.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
