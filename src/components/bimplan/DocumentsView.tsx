import { useEffect, useState } from 'react';
import { FileText, ClipboardList, Layers, HelpCircle, Copy, Check, Info, FileEdit, Settings, Save, Sparkles } from 'lucide-react';
import { TechnicalDocument } from '../../types';
import { useAuth } from '@/hooks/useAuth';

export default function DocumentsView() {
  const { company } = useAuth();
  const [activeDocId, setActiveDocId] = useState<string>('eir');
  
  // Generator states
  const [generatorDocType, setGeneratorDocType] = useState<'EIR' | 'BEP'>('EIR');
  const [projName, setProjName] = useState('İstanbul Finans Merkezi T3');
  const [clientName, setClientName] = useState('Varlık Fonu / ÇŞIDB');
  const [contractorName, setContractorName] = useState(company?.name || 'Arapaslan İnşaat A.Ş.');
  const [softwareVer, setSoftwareVer] = useState('Autodesk Revit 2026');
  const [cdePlatform, setCdePlatform] = useState('Autodesk Construction Cloud (ACC)');

  useEffect(() => {
    if (company?.name) {
      setContractorName((prev) => (prev === 'Arapaslan İnşaat A.Ş.' ? company.name : prev));
    }
  }, [company?.name]);
  
  const [copied, setCopied] = useState(false);
  const [activeLod, setActiveLod] = useState<100 | 200 | 300 | 400 | 500>(300);

  const docList: TechnicalDocument[] = [
    {
      id: 'eir',
      title: 'EIR (Exchange Information Requirements)',
      subtitle: 'İşveren Bilgi Gereksinimleri Şablonu',
      category: 'İşveren Gereksinimleri',
      description: 'İhale öncesi hazırlanan ve yükleniciden beklenen veri teslim formatlarını, yazılım sürümlerini ve koordinasyon kurallarını içeren en kritik işveren belgesidir.',
      points: [
        'Yazılım Versiyon Gereksinimleri (Geriye dönük uyumsuzluk engelleme)',
        'Veri Teslimat Format Standartları (IFC 4.3, PDF, RVT, DWG)',
        'LOD/LOI Matrisleri (Hangi aşamada hangi bilginin girileceği)',
        'Koordinat Sistemi ve Proje Başlangıç Noktası (Survey Point/Project Base Point)'
      ],
      expertNote: 'EIR belgesi ihale dosyasının resmi bir ekidir. Yüklenici bu belgedeki tüm maddeleri yerine getireceğini taahhüt ederek fiyat teklifi sunar. Eksik veya hatalı bir EIR, projenin sonunda işe yaramaz ve birbirleriyle entegre olamayan 3D veri yığınlarına yol açar.',
      templateFields: [
        { field: 'OIR (Organizasyonel Gereksinimler)', desc: 'İşverenin kurumsal hedefleri ve operasyon yapısı', required: true },
        { field: 'Yazılım Sürümleri', desc: 'Modellemede kullanılacak yetkili yazılım adları ve sürümleri', required: true },
        { field: 'Koordinat Sistemi', desc: 'Raporlama ve saha yerleşiminde kullanılacak ortak datum koordinatları', required: true },
        { field: 'Ortak Veri Ortamı (CDE)', desc: 'Doküman kontrol ve paylaşım yazılımının kuralları', required: true },
      ]
    },
    {
      id: 'bep',
      title: 'BEP (BIM Execution Plan)',
      subtitle: 'BIM Uygulama Planı Matrisi',
      category: 'Uygulama Planı',
      description: 'Yüklenicinin, işverenin EIR belgesinde belirttiği tüm teknik gereksinimlere nasıl cevap vereceğini, ekibini ve iş akışını anlattığı taahhüt planıdır.',
      points: [
        'BIM Ekibinin Rol ve Sorumluluk Tablosu (BIM Manager, Coordinator, Modeler)',
        'Disiplinler Arası Çakışma Tolerans Limitleri (Mimari vs Statik vb.)',
        'Model İletişim ve Toplantı Sıklıkları (Koordinasyon Takvimi)',
        'CDE (Ortak Veri Ortamı) Klasörleme ve Durum Kodu Kullanım Şeması'
      ],
      expertNote: 'BEP, imza atılıp rafa kaldırılacak statik bir döküman değildir. Proje süresince yeni tasarımcıların katılımı, revizyonlar veya yazılım güncellemeleri doğrultusunda revize edilen, yaşayan dinamik bir organizasyon belgesidir.',
      templateFields: [
        { field: 'Model Dağıtım Tablosu', desc: 'Modellerin ne zaman ve hangi hiyerarşiyle paylaşılacağı', required: true },
        { field: 'Çakışma Analiz Ayarları', desc: 'Yazılımsal çakışma kuralları ve hata tolerans eşikleri', required: true },
        { field: 'Donanım/Yazılım Listesi', desc: 'Ekibin kullanacağı bilgisayar kapasiteleri ve lisans listeleri', required: false },
        { field: 'Donatı Modelleme Kriterleri', desc: 'Statik betonarme donatılarının hangi detayda çizileceği', required: true },
      ]
    },
    {
      id: 'lod',
      title: 'LOD (Level of Development) Tanım Tablosu',
      subtitle: 'Model Gelişim Seviyeleri Kılavuzu',
      category: 'Gelişim Seviyeleri',
      description: 'Modeldeki elemanların hem geometrik detay (LOG - Level of Geometry) hem de niteliksel veri (LOI - Level of Information) derinliğini aşama aşama tanımlayan metriktir.',
      points: [
        'LOD 100: Kavramsal / Şematik tasarım (Kütlesel boyutlar, tahmini hacimler)',
        'LOD 200: Tasarım Geliştirme (Genel boyutlar, kaba montaj alanları)',
        'LOD 300: Uygulama Projesi (Hassas boyut, konum, malzeme tipi)',
        'LOD 400: İmalat / Şantiye (Fabrika kesim detayları, montaj donatıları, askı sistemleri)',
        'LOD 500: As-Built / Tesis Yönetimi (Gerçek saha imalatı, marka, seri no, garanti verisi)'
      ],
      expertNote: 'LOD seviyesi sadece görsel güzellik demek değildir. LOD 400 seviyesinde mükemmel görünen bir modelin içinde eğer üretici bilgisi veya test raporları yoksa o model tesis işletme aşamasında (LOD 500) verimsiz kalır. Geometri (LOG) ve Veri (LOI) dengesi iyi kurulmalıdır.',
      templateFields: [
        { field: 'LOG Derecesi', desc: 'Fiziksel 3D çizim detay düzeyi (Görsel)', required: true },
        { field: 'LOI Derecesi', desc: 'Parametrik metadata ve dokümantasyon düzeyi (Metin/Sayı)', required: true },
        { field: 'Disiplin Sorumluluk Ataması', desc: 'İlgili elemanın hangi aşamada kim tarafından modelleneceği', required: true },
      ]
    },
    {
      id: 'metraj',
      title: 'Metraj ve Maliyet (5D) Rehberi',
      subtitle: '5D Parametrik Veri Çıkarımı Standartları',
      category: '5D Veri Çıkarımı',
      description: 'Modellerdeki yapı elemanlarının boyut ve adet verilerinden yola çıkarak, Türkiye Cumhuriyeti Çevre ve Şehircilik Bakanlığı pozları ile dinamik metraj ve bütçe eşleştirmesi yapma yöntemidir.',
      points: [
        'Eleman Bazlı Otomatik Metraj Formülleri (Hacim, Alan, Adet, Ağırlık)',
        'Bakanlık Poz Numaralarının Model Parametrelerine Gömülmesi',
        'Hakediş Dosyaları ile Model Arasında Dinamik Entegrasyon Kuralları',
        'Model Kaynaklı Eksik/Hatalı İmalatların Otomatik Raporlanması'
      ],
      expertNote: 'Metrajların hatasız alınabilmesi için modelleme kurallarına katı bir şekilde uyulmalıdır. Örneğin, bir betonarme kolonun kirişle kesiştiği yerde çakışma ayarı yapılmazsa beton hacmi mükerrer (iki kere) hesaplanır. Modelleme kalitesi eşittir bütçe doğruluğudur.',
      templateFields: [
        { field: 'Poz Kodu Atama Kuralı', desc: 'Bakanlık poz kodlarının modeldeki parametre karşılıkları', required: true },
        { field: 'Kesişim Birleştirme Kuralları', desc: 'Kolon, Kiriş ve Döşeme kesişim hacim öncelik sıralaması', required: true },
        { field: 'Fire Oranı Parametreleri', desc: 'Malzemelere göre uygulanacak fire katsayıları', required: false },
      ]
    }
  ];

  const activeDoc = docList.find(d => d.id === activeDocId) || docList[0];

  const handleCopyText = () => {
    const textToCopy = `
=============================================
ISO 19650 ESASLI ${generatorDocType} TASLAK ŞABLONU (uyum doğrulaması yapılmamıştır)
=============================================
PROJE ADI: ${projName}
İŞVEREN: ${clientName}
ANA YÜKLENİCİ: ${contractorName}
ANA MODELLEME YAZILIMI: ${softwareVer}
ORTAK VERİ ORTAMI (CDE): ${cdePlatform}

---------------------------------------------
TEMEL İÇERİK YAPISI VE HİYERARŞİSİ (ISO 19650)
---------------------------------------------
1. Proje Yönetimsel Bilgiler ve Temel Hedefler
2. Bilgi Teslimat Takvimi ve Teslim Noktaları
3. Modelleme Standartları, Birimler ve Koordinat Sistemi
4. Sınıflandırma Sistemi ve COBie Gereksinimleri
5. Kalite Kontrol, Çakışma Analizleri ve Onay İş Akışları
6. Ortak Veri Ortamı (CDE) Rol Yetkilendirme Matrisi

Bu taslak ${generatorDocType} dökümanı BIM MASTER portalı jeneratörü tarafından oluşturulmuştur.
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // LOD Details database
  const lodInfo = {
    100: {
      log: "Kavramsal kütle çizimi. Detaylı geometri yoktur. Sadece genel sınırlar ve kaba lokasyon bellidir.",
      loi: ["Sistem Sınıfı", "Kaba Hacim Takdiri", "Tahmini Alan", "Disiplin Sorumlusu"],
      graphicStyle: "border-border bg-card text-muted-foreground",
      graphicName: "Kaba Kutu (Bounding Box)",
      visualClass: "h-20 w-20 bg-muted border-2 border-border rounded"
    },
    200: {
      log: "Genel sistem tasarımı. Elemanın kaba boyutları, kalınlığı ve yaklaşık konumu modellenmiştir.",
      loi: ["Sistem Sınıfı", "Malzeme Tipi (Kaba)", "Yangın Dayanımı Sınıfı", "Boyutsal Sınırlar"],
      graphicStyle: "border-blue-300 bg-blue-50 text-blue-700",
      graphicName: "Basit Kolon / Duvar Profili",
      visualClass: "h-24 w-24 bg-blue-100 border-4 border-blue-400 rounded-md flex items-center justify-center text-[10px] font-bold"
    },
    300: {
      log: "Uygulama projesi kalitesi. Elemanın kesin boyutları, montaj koordinatları ve gerçek katmanları çizilmiştir.",
      loi: ["Sistem Sınıfı", "Detaylı Malzeme Tipi", "Isı Geçirgenlik Katsayısı", "Net Ağırlık", "Poz Numarası"],
      graphicStyle: "border-orange-300 bg-orange-50 text-orange-700",
      graphicName: "Uygulama Kalitesinde Yapı Elemanı",
      visualClass: "h-28 w-28 bg-orange-100 border-4 border-orange-500 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold shadow-md"
    },
    400: {
      log: "Şantiye / İmalat kalitesi. Montaj elemanları, ankrajlar, kaynak çizgileri ve donatılar tamamen çizilmiştir.",
      loi: ["Üretici Tedarikçi İsmi", "Malzeme Teknik Kodu", "Tolerans Değerleri", "Montaj Detay Kodları", "Poz Numarası"],
      graphicStyle: "border-purple-300 bg-purple-50 text-purple-700",
      graphicName: "İmalat & Donatı Detaylı Eleman",
      visualClass: "h-32 w-32 bg-purple-100 border-4 border-purple-500 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold shadow-lg ring-2 ring-purple-300"
    },
    500: {
      log: "As-Built kalitesi. Şantiyede yapılan değişikliklerin birebir işlendiği, işletmeye hazır nihai geometridir.",
      loi: ["Marka", "Model No", "Seri Numarası", "Montaj Tarihi", "Garanti Başlangıç/Bitiş", "Bakım Sıklığı (Gün)", "İşletme Yetkilisi"],
      graphicStyle: "border-emerald-300 bg-emerald-50 text-emerald-700",
      graphicName: "Operasyonel Dijital İkiz Elemanı",
      visualClass: "h-36 w-36 bg-emerald-100 border-4 border-emerald-500 rounded-2xl flex flex-col items-center justify-center text-[10px] font-bold shadow-xl ring-4 ring-emerald-200"
    }
  };

  const selectedLodInfo = lodInfo[activeLod];

  return (
    <div className="space-y-16">
      
      {/* Tab Navigation & Doc Preview */}
      <section className="bg-white border border-border rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Left Navigation Tree */}
          <div className="lg:w-1/3 space-y-6">
            <div>
              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-widest block mb-2">DOKÜMAN NAVİGASYONU</span>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Teknik Doküman Merkezi</h2>
              <p className="text-xs text-muted-foreground mt-1">ISO 19650 uyumluluğu için her projede oluşturulması, takip edilmesi ve onaylanması zorunlu olan 4 ana doküman.</p>
            </div>

            <div className="space-y-3.5">
              {docList.map((doc) => {
                const isActive = doc.id === activeDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setActiveDocId(doc.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border flex items-start gap-3.5 ${
                      isActive
                        ? 'bg-card text-foreground border-border shadow-md translate-x-1'
                        : 'bg-card text-foreground border-border hover:border-border hover:bg-card'
                    }`}
                    id={`doc-btn-${doc.id}`}
                  >
                    <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        {doc.category}
                      </h4>
                      <h3 className="font-extrabold text-sm mt-0.5">
                        {doc.id.toUpperCase()} Rehberi
                      </h3>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Detailed Area */}
          <div className="lg:w-2/3 space-y-8 lg:border-l lg:border-border lg:pl-12">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block">
                {activeDoc.category}
              </span>
              <h3 className="text-3xl font-black text-foreground tracking-tight">{activeDoc.title}</h3>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{activeDoc.subtitle}</p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed bg-card p-4 rounded-xl border border-border">
              {activeDoc.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Core points */}
              <div className="space-y-4">
                <h5 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-orange-600" />
                  Kritik Bölüm Başlıkları
                </h5>
                <ul className="space-y-3">
                  {activeDoc.points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 shrink-0"></span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Template fields required */}
              <div className="space-y-4">
                <h5 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-orange-600" />
                  Gerekli Değişkenler
                </h5>
                <div className="space-y-2.5">
                  {activeDoc.templateFields.map((f, idx) => (
                    <div key={idx} className="bg-card border border-border p-2.5 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <div className="font-extrabold text-foreground text-[11px]">{f.field}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</div>
                      </div>
                      {f.required ? (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-black uppercase">ZORUNLU</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-card text-muted-foreground rounded text-[10px] font-black uppercase">OPSİYONEL</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Expert Callout */}
            <div className="p-6 bg-orange-50/40 border border-orange-100/70 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-orange-800">
                <Info className="w-4 h-4 shrink-0" />
                <span className="text-xs font-extrabold uppercase tracking-wider">BIM Baş Koordinatörü Tavsiyesi</span>
              </div>
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                "{activeDoc.expertNote}"
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* LOD INTERACTIVE VISUALIZER */}
      <section className="bg-white border border-border rounded-3xl p-6 sm:p-10 shadow-sm" id="lod-explorer">
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-1.5 text-orange-600 font-extrabold text-xs uppercase tracking-widest mb-2">
            <Layers className="w-4 h-4" />
            GEOMETRİ (LOG) VS VERİ (LOI) DENGESİ
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            LOD (Gelişim Seviyesi) İnteraktif Tablosu
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Seviyeler arasında geçiş yaparak bir yapı elemanının tasarım aşamasından tesis işletme aşamasına kadar geçirdiği geometrik evrimi (LOG) ve parametrik bilgi zenginleşmesini (LOI) gözlemleyin.
          </p>
        </div>

        {/* Level Switchers */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-8">
          {([100, 200, 300, 400, 500] as const).map((level) => (
            <button
              key={level}
              onClick={() => setActiveLod(level)}
              className={`py-3.5 px-2 rounded-xl text-center font-black text-xs sm:text-sm tracking-wider transition-all border ${
                activeLod === level
                  ? 'bg-card text-foreground border-border shadow-md scale-[1.03]'
                  : 'bg-card text-muted-foreground border-border hover:border-border'
              }`}
              id={`lod-tab-${level}`}
            >
              LOD {level}
            </button>
          ))}
        </div>

        {/* Level Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card p-6 sm:p-8 rounded-2xl border border-border">
          
          {/* Mock Visual representation */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white border border-border rounded-xl min-h-[220px]">
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-4">LOG (Geometrik Görünüm)</div>
            
            {/* Visual block */}
            <div className={`${selectedLodInfo.visualClass} transition-all duration-300 flex items-center justify-center text-center p-2`}>
              <span className="opacity-80">
                {activeLod === 100 && "Kutu"}
                {activeLod === 200 && "Kaba Kolon"}
                {activeLod === 300 && "Revit\nKolonu"}
                {activeLod === 400 && "Donatılı\nBetonarme"}
                {activeLod === 500 && "Üretici\nDamgalı"}
              </span>
            </div>

            <span className="text-[10px] font-bold text-muted-foreground mt-4 text-center">{selectedLodInfo.graphicName}</span>
          </div>

          {/* Metadata parameters listing (LOI) */}
          <div className="lg:col-span-8 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">LOG Fiziksel Detayı</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{selectedLodInfo.log}</p>
            </div>

            <div className="border-t border-border pt-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">LOI (Bilgi Detayı / Parametre Listesi)</span>
              <div className="flex flex-wrap gap-2">
                {selectedLodInfo.loi.map((param, i) => (
                  <span 
                    key={i} 
                    className="px-2.5 py-1.5 bg-white border border-border rounded-lg text-[11px] font-bold text-foreground mono shadow-xs flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    {param}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* DRAFT OUTLINE GENERATOR */}
      <section className="bg-white border border-border rounded-3xl p-6 sm:p-10 shadow-sm" id="bep-generator">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs uppercase tracking-widest mb-2">
                <FileEdit className="w-4 h-4" />
                ŞABLON OLUŞTURUCU
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                ISO 19650 Şablon Taslak Üretici
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Aşağıdaki alanları projenize göre özelleştirerek, ihale şartnamelerine ve BIM uygulama planlarına uyarlayabileceğiniz ISO 19650 esaslı bir taslak içeriği üretin. Uyum, proje bilgi yöneticisi tarafından doğrulanmalıdır.
              </p>
            </div>

            {/* Form inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGeneratorDocType('EIR')}
                  className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                    generatorDocType === 'EIR'
                      ? 'bg-card text-foreground border-border'
                      : 'bg-card text-muted-foreground border-border hover:border-border'
                  }`}
                >
                  EIR (İşveren Şartı)
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratorDocType('BEP')}
                  className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                    generatorDocType === 'BEP'
                      ? 'bg-card text-foreground border-border'
                      : 'bg-card text-muted-foreground border-border hover:border-border'
                  }`}
                >
                  BEP (Uygulama Planı)
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Proje İsmi</label>
                <input 
                  type="text"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold text-foreground bg-card focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">İşveren / Kurum</label>
                  <input 
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold text-foreground bg-card focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ana Yüklenici</label>
                  <input 
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold text-foreground bg-card focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Modelleme Yazılımı</label>
                  <input 
                    type="text"
                    value={softwareVer}
                    onChange={(e) => setSoftwareVer(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold text-foreground bg-card focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">CDE Platformu</label>
                  <input 
                    type="text"
                    value={cdePlatform}
                    onChange={(e) => setCdePlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold text-foreground bg-card focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Copy-paste area output */}
          <div className="lg:col-span-7 bg-background text-foreground p-6 sm:p-8 rounded-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-border mb-4">
              <span className="text-[10px] text-orange-500 font-extrabold tracking-wider uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                DİNAMİK ÇIKTI ÖNİZLEMESİ
              </span>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated hover:bg-orange-600 hover:text-foreground rounded text-[10px] font-black tracking-widest uppercase transition-all text-foreground dark:text-muted-foreground"
                id="btn-copy-template"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    KOPYALANDI!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    KOPYALA
                  </>
                )}
              </button>
            </div>

            {/* Preview preformatted box */}
            <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto pr-2 text-foreground dark:text-muted-foreground">
{`=============================================
ISO 19650 ESASLI ${generatorDocType} TASLAK ŞABLONU (uyum doğrulaması yapılmamıştır)
=============================================
PROJE ADI         : ${projName}
İŞVEREN           : ${clientName}
ANA YÜKLENİCİ     : ${contractorName}
MODELLEME YAZILIMI: ${softwareVer}
ORTAK VERİ ORTAMI : ${cdePlatform}

---------------------------------------------
TEMEL İÇERİK YAPISI VE HİYERARŞİSİ (ISO 19650)
---------------------------------------------
1. Proje Yönetimsel Bilgiler ve Temel Hedefler
2. Bilgi Teslimat Takvimi ve Teslim Noktaları
3. Modelleme Standartları, Birimler ve Koordinat Sistemi
4. Sınıflandırma Sistemi ve COBie Gereksinimleri
5. Kalite Kontrol, Çakışma Analizleri ve Onay İş Akışları
6. Ortak Veri Ortamı (CDE) Rol Yetkilendirme Matrisi

Bu taslak ${generatorDocType} dökümanı BIM MASTER portalı jeneratörü tarafından oluşturulmuştur.`}
            </pre>
          </div>

        </div>
      </section>

    </div>
  );
}
