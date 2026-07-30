/**
 * BIMPlan Academy Sub-Guides and Detailed Engineering Topic Models
 *
 * Provides detailed engineering content, formulas, standards, tables,
 * and practical case studies for each clickable bullet point across all 6 modules.
 */

export interface SubGuideTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface SubGuideQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SubGuide {
  id: string;
  moduleSlug: string;
  subTopicKey: string;
  title: string;
  badge: string;
  summary: string;
  formulaOrRule?: string;
  standards: string[];
  tables?: SubGuideTable[];
  keyTakeaways: string[];
  practicalCaseStudy: string;
  teklifProIntegrationNote: string;
  checkpointQuestions?: SubGuideQuestion[];
}

export const subGuidesData: Record<string, SubGuide> = {
  // ===================================================================
  // 1. MODULE: /academy/iso-19650 (ISO 19650 & Bilgi Yönetimi)
  // ===================================================================
  'iso-19650-eir-template': {
    id: 'iso-19650-eir-template',
    moduleSlug: 'iso-19650',
    subTopicKey: 'eir-template',
    title: '19650-1 & 19650-2: OIR, PIR, AIR, EIR & 8 Adımlı Bilgi Teslim Süreci',
    badge: 'ISO 19650-1/2 Standart Şablonu',
    summary: 'Kurumsal stratejik hedeflerden (OIR) yüklenicinin ihale yanıtı (BEP) ve bilgi teslim planlarına (TIDP/MIDP) uzanan 8 adımlı bilgi yönetim omurgası.',
    formulaOrRule: '\\text{OIR} \\longrightarrow \\text{PIR} \\longrightarrow \\text{AIR} \\longrightarrow \\text{EIR} \\longrightarrow \\text{BEP} \\longrightarrow \\text{TIDP / MIDP} \\longrightarrow \\text{PIM} \\longrightarrow \\text{AIM}',
    standards: ['ISO 19650-1:2018 (Part 1 Concepts)', 'ISO 19650-2:2018 (Part 2 Delivery Phase)', 'buildingSMART BIM Use Case Management'],
    tables: [
      {
        title: 'Bilgi Gereksinimleri Seviyeleri ve Sorumlular',
        headers: ['Gereksinim Tipi', 'Açılımı', 'Sorumlu Taraf', 'Kapsam ve Amacı'],
        rows: [
          ['OIR', 'Organizational Info Req.', 'İşveren Üst Yönetim', 'Varlık portföyünün uzun vadeli stratejik, finansal ve operasyonel hedefleri.'],
          ['PIR', 'Project Info Req.', 'İşveren Proje Müdürü', 'Proje aşamalarındaki ana karar noktaları ve teslim miltaşları.'],
          ['AIR', 'Asset Info Req.', 'Tesis Yönetimi (FM)', 'İşletme safhasında gereken bakım periyotları, garanti ve ekipman verileri.'],
          ['EIR', 'Exchange Info Req.', 'İşveren BIM Yöneticisi', 'İhale dokümanındaki zorunlu openBIM formatları, LOD/LOIN matrisleri ve CDE kuralları.'],
          ['BEP', 'BIM Execution Plan', 'Ana Yüklenici BIM Lideri', 'İhaleye verilen yanıt: Bilgi üretimi, yazılım sürümleri ve ekip organizasyonu.']
        ]
      },
      {
        title: '8 Adımlı Bilgi Yönetim Süreci (ISO 19650-2 Clause 5)',
        headers: ['Adım #', 'Süreç Adımı', 'Açıklama', 'Ana Çıktı'],
        rows: [
          ['01', 'İhtiyaç Analizi', 'İşverenin proje ve varlık gereksinimlerini belirlemesi', 'OIR, PIR, AIR & EIR'],
          ['02', 'İhale Daveti', 'Bilgi gereksinimlerinin ihale paketine eklenmesi', 'İhale Dokümanı & CDE'],
          ['03', 'İhale Yanıtı', 'Teklif verenlerin kapasite ve BEP taslağı sunması', 'Pre-appointment BEP'],
          ['04', 'Sözleşme & Atama', 'Bilgi sorumlulukları ve teslim protokolünün imzalanması', 'BIM Protokolü & MIDP'],
          ['05', 'Mobilizasyon', 'CDE altyapısının, yazılımların ve ekibin test edilmesi', 'Test Edilmiş CDE & BEP'],
          ['06', 'Ortak Bilgi Üretimi', 'Disiplinlerin WIP ve Shared ortamlarında model üretmesi', 'Koordineli 3D Modeller'],
          ['07', 'Bilgi Modeli Teslimi', 'Onaylanan bilginin Published statüsüne geçirilmesi', 'Proje Bilgi Modeli (PIM)'],
          ['08', 'Proje Kapanışı', 'İnşaat modelinin işletme verisine dönüştürülmesi', 'Varlık Bilgi Modeli (AIM)']
        ]
      }
    ],
    keyTakeaways: [
      'EIR hazırlanmadan ihaleye çıkılan projelerde model teslimatı sadece serbest çizim seviyesinde kalır.',
      'TIDP (Task Information Delivery Plan) tüm alt yüklenicilerce hazırlanmalı ve MIDP (Master Plan) altında birleştirilmelidir.',
      'BEP yaşayan bir dokümandır; ihale öncesi (pre-appointment) ve sözleşme sonrası (post-appointment) olarak iki aşamalı güncellenir.'
    ],
    practicalCaseStudy: '30.000 m² hastane projesinde işveren EIR şartnamesine MED-01 tıbbi gaz ekipman kodlarını eklemiş; yüklenici MIDP planına uygun olarak teslim aşamasında 1.200 adet IfcMedicalDevice nesnesini COBie şemasına eksiksiz aktarmıştır.',
    teklifProIntegrationNote: 'TeklifPro, ihale öncesi oluşturulan EIR şartnamesindeki metraj güvenlik katsayılarını otomatik okuyarak teklif risk primi marjını hesaplar.',
    checkpointQuestions: [
      {
        question: 'ISO 19650-2 standartlarına göre işverenin ihale dokümanına koyduğu zorunlu bilgi teslim şartnamesi hangisidir?',
        options: [
          'OIR (Organizational Information Requirements)',
          'EIR (Exchange Information Requirements)',
          'BEP (BIM Execution Plan)',
          'MIDP (Master Information Delivery Plan)'
        ],
        correctIndex: 1,
        explanation: 'EIR (Exchange Information Requirements), işverenin ihale dosyasında yükleniciden talep ettiği veri formatı, LOD/LOIN ve CDE kurallarını içeren bilgi değişim şartnamesidir.'
      },
      {
        question: 'ISO 19650-2 Clause 5 uyarınca 8 adımlı sürecin 5. adımı olan "Mobilizasyon" aşamasının ana amacı nedir?',
        options: [
          'İhaleyi kazanacak firmaya ödeme yapmak',
          'CDE ortamını, yazılımları ve ekip bilgi yönetimi kapasitesini ortak üretime başlamadan önce test etmek',
          'Binanın yıkım kararını almak',
          'Tüm 3D modelleri silmek'
        ],
        correctIndex: 1,
        explanation: 'Mobilizasyon aşamasında CDE altyapısı, şablonlar, yazılım sürümleri ve bilgi paylaşım protokolleri gerçek model üretimine geçilmeden önce test edilerek doğrulanır.'
      }
    ]
  },

  'iso-19650-pim-aim-cobie': {
    id: 'iso-19650-pim-aim-cobie',
    moduleSlug: 'iso-19650',
    subTopicKey: 'pim-aim-cobie',
    title: '19650-3 & 19650-4: PIM → AIM Dönüşümü, openBIM IFC4.0 & COBie 2.4 Matrisi',
    badge: 'ISO 19650-3/4 & COBie 2.4 Standardı',
    summary: 'İnşaat esnasındaki Proje Bilgi Modeli\'nin (PIM), işletme aşamasında Tesis Yönetimi (FM) için COBie 2.4 formatında Varlık Bilgi Modeli\'ne (AIM) dönüştürülmesi.',
    formulaOrRule: '\\text{IfcProduct} \\xrightarrow[MVD]{IFC4.0} \\text{COBie Sheet} \\quad (\\text{Type} \\rightarrow \\text{Component} \\rightarrow \text{Space} \\rightarrow \text{System})',
    standards: ['ISO 19650-3:2020 (Operational Phase)', 'ISO 19650-4:2022 (Information Exchange)', 'buildingSMART COBie 2.4 Guide', 'IFC 4.0 Add2 TC1'],
    tables: [
      {
        title: 'IFC 4.0 Sınıfları ve COBie 2.4 Sayfa Eşleşme Matrisi',
        headers: ['IFC 4.0 Sınıfı (Class)', 'COBie Sayfası (Sheet)', 'Zorunlu Pset Parametreleri', 'İşletme Kullanım Amacı'],
        rows: [
          ['IfcSpace', 'Space', 'Name, Category, GrossFloorArea, Height', 'Ova/Mahal bazlı alan ve hacim işletmesi.'],
          ['IfcTypeProduct', 'Type', 'Manufacturer, ModelNumber, ReplacementCost', 'Tipik ürün özellikleri ve yedek parça maliyeti.'],
          ['IfcAsset / IfcEquipment', 'Component', 'SerialNumber, InstallationDate, WarrantyStartDate', 'Tekil cihaz takibi, seri no ve garanti bitişi.'],
          ['IfcSystem', 'System', 'SystemType, MaintainedBy, Criticality', 'Mekanik/Elektrik tesisat sistemi bağımlılık haritası.'],
          ['IfcZone', 'Zone', 'ZoneName, HVACZoneType', 'İklimlendirme ve güvenlik bölge yönetimi.']
        ]
      }
    ],
    keyTakeaways: [
      'PIM şantiye detaylarını (geçici iskeleler, kalıp bağ elemanları) içerirken, AIM temizlenmiş işletme verisine odaklanır.',
      'COBie bir çizim veya 3D yazılım değil; IFC şemasındaki varlık ilişkilerini taşıyan yapılandırılmış veri değişimi standardıdır.',
      'IFC 4.0 MVD (Model View Definition) validation araçlarıyla model teslim edilmeden önce otomatik doğrulanmalıdır.'
    ],
    practicalCaseStudy: 'AVM projesinde kule klimaları PIM aşamasında LOD 400 geometrisiyle modellenmiş; AIM tesliminde gereksiz poligonlar hafifletilerek yalnızca COBie Component ve Pset_Warranty verileri saklanmıştır.',
    teklifProIntegrationNote: 'TeklifPro IFC 4.0 Parser motoru, yüklenen modeldeki COBie verilerini otomatik süzerek hakediş ve yedek parça teklif kalemlerine dönüştürür.'
  },

  'iso-19650-rbac-security': {
    id: 'iso-19650-rbac-security',
    moduleSlug: 'iso-19650',
    subTopicKey: 'rbac-security',
    title: '19650-5: RBAC Yetki Matrisi & CDE Bilgi Güvenliği',
    badge: 'ISO 19650-5 Siber Güvenlik',
    summary: 'Kritik altyapı, kamu binaları ve hassas tesis projelerinde Ortak Bilgi Ortamı (CDE) içindeki verilerin rol bazlı erişim (RBAC) ve siber güvenlik protokolleri.',
    formulaOrRule: '\\text{AccessLevel} = f(\\text{UserRole}, \\text{CDEState}, \\text{SecurityClassification})',
    standards: ['ISO 19650-5:2020 (Security-minded BIM)', 'ISO/IEC 27001 (Information Security)', 'PAS 1192-5'],
    tables: [
      {
        title: 'CDE Durumlarına Göre Disiplin RBAC İzin Matrisi',
        headers: ['CDE Konteyner Durumu', 'Mimar (Lead Arch)', 'Statik Mühendisi', 'MEP Mühendisi', 'İşveren Temsilcisi'],
        rows: [
          ['WIP (Work in Progress)', 'Okuma / Yazma (WIP-Arch)', 'Kapalı (Erişim Yok)', 'Kapalı (Erişim Yok)', 'Kapalı (Karışıklık Önleme)'],
          ['SHARED (Koordinasyon)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Gözlem Okuma (R)'],
          ['PUBLISHED (Onaylı İhale/Ödeme)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Onay / Kabul (Approve/Pay)'],
          ['ARCHIVED (Geçmiş İz)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Audit / Geçmiş Kayıt (R)']
        ]
      }
    ],
    keyTakeaways: [
      'WIP alanına diğer disiplinlerin veya işverenin erişmesi erken aşama hatalarının yanlış anlaşılmasına yol açar.',
      'ISO 19650-5 gereğince hassas projelerde (hastane, veri merkezi, kamu) güvenlik kamerası ve tesisat detayları şifrelenmelidir.',
      'Her CDE geçişinde silinemez zaman damgalı Audit Trail (Denetim İzi) kaydı tutulmalıdır.'
    ],
    practicalCaseStudy: 'Veri merkezi projesinde ISO 19650-5 uyarınca sunucu odalarının MEP detayları kısıtlı RBAC rolüyle gizlenmiş, CDE üzerinden yalnız yetkili mühendislere onaylı yayınlanmıştır.',
    teklifProIntegrationNote: 'TeklifPro kullanıcı izin yönetim sistemi, ISO 19650-5 RBAC matrisini esas alarak maliyet yetkilerini gizler veya yayınlar.'
  },

  'iso-19650-loin-matrix': {
    id: 'iso-19650-loin-matrix',
    moduleSlug: 'iso-19650',
    subTopicKey: 'loin-matrix',
    title: 'EN 17412-1: LOIN (Level of Information Need) Bilgi İhtiyacı Seviyesi',
    badge: 'EN 17412-1 Standardı',
    summary: 'Gereksiz 3D geometrik detaylandırmadan (over-modeling) kaçınarak Geometrik Seviye (LOG) ile Alfanümerik Bilgi Seviyesi (LOI) arasındaki optimum denge.',
    formulaOrRule: '\\text{LOIN} = \\text{LOG (Geometri)} + \\text{LOI (Bilgi)} + \\text{DOC (Dokümantasyon)}',
    standards: ['EN 17412-1:2020 (Level of Information Need)', 'ISO 19650-1 Clause 11'],
    tables: [
      {
        title: 'Proje Aşamasına Göre LOG vs LOI Dağılım Matrisi',
        headers: ['Proje Aşaması', 'LOG (Geometri Seviyesi)', 'LOI (Alfanümerik Veri Seviyesi)', 'Model Boyutu & Performans Etkisi'],
        rows: [
          ['Kavramsal Tasarım', 'LOG 100 (Kaba Kütle)', 'LOI 100 (Yaklaşık Alan, Kullanım Amacı)', 'Çok Düşük (%10 dosya boyutu)'],
          ['Ruhsat / Ön Proje', 'LOG 200 (Genel Kesitler)', 'LOI 200 (Malzeme Sınıfı, Yangın Dayanımı)', 'Düşük (%25 dosya boyutu)'],
          ['İhale / Uygulama', 'LOG 300 (Net Ebatlar)', 'LOI 300 (Birim Fiyat Pozu, Poz No, Şartname)', 'Optimum (%50 dosya boyutu)'],
          ['İmalat / Detay', 'LOG 400 (Pah, Bağlantı)', 'LOI 400 (Tedarikçi Kodu, Üretici Barkodu)', 'Yüksek (Model kasmaya başlar)'],
          ['İşletme (FM)', 'LOG 200 (Sadeleştirilmiş)', 'LOI 500 (Garanti Bitiş, Seri No, Bakım Şeması)', 'Sadeleştirilmiş & Yüksek Bilgi']
        ]
      }
    ],
    keyTakeaways: [
      'Gereksiz donatı veya civata 3D poligonları modeli kasmaktan başka işe yaramaz; bilgi LOI parametresi olarak eklenmelidir.',
      'LOIN standardı "her şey en detaylı çizilecek" anlayışını bitirmiş, "ihtiyaç kadar üret" prensibini getirmiştir.',
      'SmartCheck denetimleri LOIN şartnamesindeki eksik LOI parametrelerini tespit eder.'
    ],
    practicalCaseStudy: 'Statik projede donatı filizleri 3D geometri yerine LOI parametresi olarak verilerek 1.2 GB model boyutu 180 MB seviyesine düşürülmüştür.',
    teklifProIntegrationNote: 'TeklifPro metraj motoru, LOI 300 verisinden Poz Numarası ve Şartname maddelerini doğrudan okuyarak teklif kalemlerini otomatik eşleştirir.'
  },

  // ===================================================================
  // 2. MODULE: /academy/4d-5d (4D / 5D Maliyet Mühendisliği)
  // ===================================================================
  '4d-5d-guid-primavera': {
    id: '4d-5d-guid-primavera',
    moduleSlug: '4d-5d',
    subTopicKey: 'guid-primavera',
    title: 'GUID & Primavera P6 / MS Project 4D Lojistik ve Zaman-Hacim Simülasyonu',
    badge: '4D BIM & Lojistik Entegrasyonu',
    summary: '3D IFC nesnelerinin benzersiz GUID (Global Unique Identifier) kodları ile Primavera P6 ve MS Project iş programı WBS görevlerinin otomasyonla eşleştirilmesi.',
    formulaOrRule: '\\text{IfcElement.GlobalId (22 char Base64)} \\iff \\text{Primavera P6 Activity ID (WBS Code)}',
    standards: ['ISO 19650-2 4D Delivery', 'AACE International Recommended Practice 4D', 'Primavera P6 XER API'],
    tables: [
      {
        title: 'IFC GUID - Primavera P6 Aktivite Eşleşme Matrisi',
        headers: ['WBS Kodu', 'Primavera Aktivite Adı', 'Eşleşen IFC Sınıfı & GUID Kümesi', '4D Görsel Şantiye Rengi'],
        rows: [
          ['WBS-01.01', 'Temel Kazısı & Hafriyat', 'IfcSite / IfcEarthworks (#1024..#1080)', 'Kahverengi (Kazı)'],
          ['WBS-02.01', 'Radye Temel Betonarma', 'IfcSlab [Type=Basemat] (GUID: 2Yx$a8...)', 'Gri / Mavi (Dökümde)'],
          ['WBS-02.02', '1. Bodrum Kolon & Perde', 'IfcColumn & IfcWall (GUID: 3Bq#m1...)', 'Mavi (Devam Eden)'],
          ['WBS-03.01', 'Kaba İnşaat Kapanış', 'Tüm Taşıyıcı Elemanlar', 'Yeşil (Tamamlanan)']
        ]
      }
    ],
    keyTakeaways: [
      'GUID eşleştirmesi manuel değil, IFC kütüphanesindeki WBS parametresi üzerinden otomatik yapılmalıdır.',
      '4D şantiye simülasyonu kule vinç kapsama alanı ve geçici iskele imalatlarını da kapsamalıdır.',
      'Zamansal çakışmalar (4D Clash) şantiyede vinç çakışmasını ve malzeme yığılmasını engeller.'
    ],
    practicalCaseStudy: 'Köprü inşaatında ayak betonarme dökümleri Primavera P6 iş programı ile GUID üzerinden eşleştirilmiş, 4D simülasyonda viyadük ayağının 3 gün gecikmeyle döküleceği önceden görülmüştür.',
    teklifProIntegrationNote: 'TeklifPro 5D motoru, Primavera P6 iş programı süresini alarak nakit akışı ve aylık hakediş projeksiyonunu otomatik hesaplar.'
  },

  '4d-5d-evm-calculator': {
    id: '4d-5d-evm-calculator',
    moduleSlug: '4d-5d',
    subTopicKey: 'evm-calculator',
    title: 'Kazanılmış Değer Yönetimi (EVM): PV, EV, AC, CPI & SPI Formülleri',
    badge: '5D EVM Maliyet Kontrolü',
    summary: 'Planlanan Değer (PV), Kazanılan Değer (EV) ve Gerçekleşen Maliyet (AC) verileri üzerinden projenin bütçe ve zaman performansının hesaplanması.',
    formulaOrRule: '\\text{CPI} = \\frac{\\text{EV}}{\\text{AC}}, \\quad \\text{SPI} = \\frac{\\text{EV}}{\\text{PV}}, \\quad \\text{EAC} = \\frac{\\text{BAC}}{\\text{CPI}}',
    standards: ['PMI PMBOK 7th Edition EVM', 'ISO 21508:2018 Earned Value Management'],
    tables: [
      {
        title: 'EVM Göstergeleri ve Şantiye Karar Matrisi',
        headers: ['Metrik', 'Formül', 'Değer < 1 İse', 'Değer = 1 İse', 'Değer > 1 İse'],
        rows: [
          ['CPI (Maliyet Performans)', 'EV / AC', '🔴 Bütçe Aşımı (Zarar)', '🟢 Bütçede', '🟢 Maliyet Tasarrufu'],
          ['SPI (Zaman Performans)', 'EV / PV', '🔴 İş Programı Gecikmesi', '🟢 Zamanında', '🟢 Zamanından Hızlı'],
          ['CV (Maliyet Sapması)', 'EV - AC', '🔴 Olumsuz (Fazla Harcama)', '🟢 Sıfır Sapma', '🟢 Pozitif Tasarruf'],
          ['SV (Zaman Sapması)', 'EV - PV', '🔴 Geride Kaldı', '🟢 Zamanında', '🟢 İleride']
        ]
      }
    ],
    keyTakeaways: [
      'Sadece harcanan paraya (AC) bakarak projenin kârlı olduğu anlaşılamaz; fiziki gerçekleşme (EV) mutlaka ölçülmelidir.',
      'CPI < 0.85 seviyesine düştüğünde proje ivme kaybına girer ve acil mühendislik revizyonu gerektirir.',
      'TeklifPro hakediş ekranında EVM grafiği canlı model verisiyle güncellenir.'
    ],
    practicalCaseStudy: '6. ay görünümünde PV=1.000.000 ₺, EV=700.000 ₺, AC=720.000 ₺ olan projede SPI=0.70 (gecikme) ve CPI=0.97 (hafif bütçe aşımı) tespit edilerek şantiye vardiyası artırılmıştır.',
    teklifProIntegrationNote: 'TeklifPro, teklif hazırlama esnasında CPI/SPI risk tolerans katsayılarını otomatik simüle eder.'
  },

  '4d-5d-lump-sum-risk': {
    id: '4d-5d-lump-sum-risk',
    moduleSlug: '4d-5d',
    subTopicKey: 'lump-sum-risk',
    title: 'Götürü Bedel vs Teklif Birim Fiyat Risk Motoru & Müteahhit Risk Matrisi',
    badge: '5D İhale Risk Yönetimi',
    summary: 'Sözleşme tipi (Lump Sum vs Remeasurement), metraj belirsizliği, enflasyon volatilite primi ve clash riskinin teklif marjına etkisi.',
    formulaOrRule: '\\text{Teklif Fiyatı} = \\text{Net Metraj} \\times \\text{Birim Fiyat} \\times (1 + R_{\\text{sözleşme}} + R_{\\text{enflasyon}} + R_{\\text{clash}})',
    standards: ['FIDIC Red Book (Birim Fiyat)', 'FIDIC Yellow/Silver Book (Götürü Bedel)', 'TeklifPro Risk Engine v2'],
    tables: [
      {
        title: 'Sözleşme Tipine Göre Risk Paylaşımı ve Risk Primi Dağılımı',
        headers: ['Risk Faktörü', 'Götürü Bedel (Lump Sum)', 'Birim Fiyat (Remeasurement)', 'Önerilen Risk Primi %'],
        rows: [
          ['Metraj Sapma Riski', '🔴 Yükleniciye Ait (%100)', '🟢 İşverene Ait (Net ölçüm)', 'Lump Sum: +%5 - %8'],
          ['Fiyat Enflasyon Riski', '🔴 Yükleniciye Ait (Eskalasyonsuz)', '🟡 Sözleşme ÜFE Endeksli', 'Eskalasyonsuz: +%8 - %12'],
          ['Tasarım Hata & Clash', '🔴 Yükleniciye Ait', '🟢 İşveren / Mimar Sorumlu', 'LOD 200 ise: +%6'],
          ['Geç Kapanış / Ceza', '🔴 Yönetici Cezai Şart', '🟡 Gecikme Cezası Esnetilebilir', 'Süre Volatilitesi: +%3']
        ]
      }
    ],
    keyTakeaways: [
      'Götürü bedel ihalelerde metraj %15 eksik hesaplansa bile işveren ilave ödeme yapmaz; risk primi teklife eklenmelidir.',
      'LOD 200 modellerde götürü bedel teklif vermek iflas riski taşır; model en az LOD 300 olmalıdır.',
      'TeklifPro risk motoru belirsizlik katsayılarını otomatik tarayarak P90 güven aralığında teklif önerir.'
    ],
    practicalCaseStudy: 'Endüstriyel tesis ihalesinde götürü bedel teklif veren firma, donatı paspayı metrajındaki %12 sapmayı üstlenmek zorunda kalmış; TeklifPro risk motoru kullanan firma ise risk primi ekleyerek kârlılığını korumuştur.',
    teklifProIntegrationNote: 'TeklifPro panelinde sözleşme tipini "Götürü Bedel" seçtiğinizde sistem otomatik olarak %5 belirsizlik primi ekler.'
  },

  '4d-5d-minha-rules': {
    id: '4d-5d-minha-rules',
    moduleSlug: '4d-5d',
    subTopicKey: 'minha-rules',
    title: 'Minha Kuralları Kıyaslaması: Türkiye ÇŞB vs Almanya DIN 18350 Standardı',
    badge: 'Metraj Minha & Standart Kıyası',
    summary: 'Farklı ülke poz ve metraj standartlarında duvar, döşeme ve kaplama boşluklarının (minha) düşülme sınırlarının teklif kârlılığına etkisi.',
    formulaOrRule: '\\text{ÇŞB Net Area} = A_{\\text{brüt}} - \\sum A_{\\text{boşluk}}, \\quad \\text{DIN 18350 Net Area} = A_{\\text{brüt}} - \\sum (A_{\\text{boşluk}} > 2.50\\text{ m}^2)',
    standards: ['Türkiye ÇŞİDB YFK Poz Metraj Kuralları', 'Almanya DIN 18350 VOB Part C (Plastering and Rendering)'],
    tables: [
      {
        title: 'ÇŞB Poz Metrajı ile DIN 18350 Karşılaştırma Matrisi',
        headers: ['Metraj Parametresi', 'Türkiye ÇŞB Standardı', 'Almanya DIN 18350 Standardı', 'Kârlılık ve İşçilik Etkisi'],
        rows: [
          ['Kapı/Pencere Boşluğu', 'Boşluk boyutu ne olursa olsun NET düşülür.', '2.50 m² altındaki boşluklar DÜŞÜLMEZ.', 'DIN 18350 işçilik kaybını metrajda korur.'],
          ['Duvar İç Yüzey Dönüşü', 'Boşluk kenarı sıva/kaplama alanı EKLENİR.', '2.50 m² altı boşluklarda iç kenarlar EKLENMEZ.', 'ÇŞB ekstra metraj kalemi açtırır.'],
          ['Kolon-Duvar Kesişimi', 'CSG kesişim alanı net olarak düşülür.', 'Kesişim alanı belirli sınır altında düşülmez.', 'DIN 18350 kalıp metrajını yüksek tutar.'],
          ['Donatı Metrajı', 'Donatı ağırlığı nominal kütle ile NET hesaplanır.', 'Hadde toleransı ve fire oranı ilave edilir.', 'ÇŞB donatıda fireyi birim fiyata dahil eder.']
        ]
      }
    ],
    keyTakeaways: [
      'Almanya projelerinde ÇŞB mantığıyla metraj çıkarmak %8 ila %12 arası teklif kaybına sebep olur.',
      'Türkiye kamu ihalelerinde 3 m² altı düşülmez kuralı geçerli değildir; tüm boşluklar net minha edilir.',
      'TeklifPro metraj motoru hedef ülke seçimine göre minha kurallarını otomatik değiştirir.'
    ],
    practicalCaseStudy: 'Münih\'te konut projesinde 1.8 m² pencere boşlukları DIN 18350 uyarınca minha edilmemiş; Türk taşeron firma ise yanlışlıkla boşlukları düşerek %9 işçilik zararı etmiştir.',
    teklifProIntegrationNote: 'TeklifPro ayarlarında "Almanya DIN 18350" şablonunu seçtiğinizde 2.50 m² altı boşluk minha hesaplayıcısı otomatik devreye girer.'
  },

  // ===================================================================
  // 3. MODULE: /academy/sustainability-6d (6D Sürdürülebilirlik & Karbon)
  // ===================================================================
  'sustainability-6d-iso-52000': {
    id: 'sustainability-6d-iso-52000',
    moduleSlug: 'sustainability-6d',
    subTopicKey: 'iso-52000',
    title: 'ISO 52000-1: BEM & EPW İklim Verisi Simülasyon Akışı',
    badge: 'ISO 52000-1 & BEM Enerji Modellemesi',
    summary: 'BIM 3D model geometrisi ve malzeme termal özellikleri ($U$-değerleri) kullanılarak binanın EPW iklim verisine göre yıllık ısıtma-soğutma enerji talebinin hesabı.',
    formulaOrRule: 'Q_{\\text{ısıtma}} = \\sum (U_i \\cdot A_i \\cdot (T_{\\text{iç}} - T_{\\text{dış}})) \\cdot \\Delta t + Q_{\\text{havalandırma}} - Q_{\\text{kazanç}}',
    standards: ['ISO 52000-1:2017 (Energy Performance of Buildings)', 'ASHRAE Standard 90.1', 'TS EN ISO 13790'],
    tables: [
      {
        title: 'Yapı Kabuğu Termal Performans (U-Değeri) Standart Limitleri',
        headers: ['Yapı Elemanı', 'Standart U-Değeri Limit ($W/m^2K$)', 'BIM Model Nesnesi', 'Enerji Etkisi'],
        rows: [
          ['Dış Duvar', '0.20 - 0.30 W/m²K', 'IfcWall [Pset_WallCommon.ThermalTransmittance]', 'Isıtma yükünün %35\'ini belirler.'],
          ['Çatı / Teras', '0.12 - 0.18 W/m²K', 'IfcRoof [Pset_RoofCommon.ThermalTransmittance]', 'En tepe kat ısı kaybını engeller.'],
          ['Cam / Pencereler', '1.0 - 1.4 W/m²K', 'IfcWindow [Pset_WindowCommon.OverallUValue]', 'Gün ışığı ve güneş ısı kazancı dengesi.'],
          ['Zemin Döşemesi', '0.25 - 0.35 W/m²K', 'IfcSlab [Type=Basemat]', 'Toprak temaslı ısı transferi.']
        ]
      }
    ],
    keyTakeaways: [
      'BEM (Building Energy Modeling) yapabilmek için BIM model nesnelerinde termal kapalı alanlar (IfcSpace) bulunmalıdır.',
      'EPW (EnergyPlus Weather) iklim dosyası projenin tam coğrafi konum koordinatlarına göre seçilmelidir.',
      'SmartCheck BEM denetimi izolasyon malzemesi eksik dış duvarları otomatik raporlar.'
    ],
    practicalCaseStudy: 'Ankara projesinde cam U-değeri 2.4\'ten 1.1 W/m²K seviyesine düşürülmüş, yıllık ısıtma yükünde %28 tasarruf sağlanarak BREEAM sertifikası alınmıştır.',
    teklifProIntegrationNote: 'TeklifPro risk ekranında BEM sonuçlarına göre iklimlendirme cihaz kapasitesi ve yeşil tedarik marjı simüle edilir.'
  },

  'sustainability-6d-lca-phases': {
    id: 'sustainability-6d-lca-phases',
    moduleSlug: 'sustainability-6d',
    subTopicKey: 'lca-phases',
    title: 'Yaşam Döngüsü Analizi (LCA Beşikten Mezara - ISO 14040/14044)',
    badge: 'ISO 14040/14044 & EN 15978 LCA',
    summary: 'İnşaat malzemelerinin ham maddeden çıkarılmasından (A1) bina kullanımına (B), ömür sonu yıkıma (C) ve geri dönüşüme (D) kadar çevresel etki analizi.',
    formulaOrRule: '\\text{Total Impact} = \\sum_{m} \\text{Quantity}_m \\cdot (\\text{EPD}_{A1-A3} + \\text{EPD}_{A4-A5} + \\text{EPD}_{B} + \\text{EPD}_{C} - \\text{EPD}_{D})',
    standards: ['ISO 14040/14044 (LCA Principles)', 'EN 15978 (Assessment of environmental performance of buildings)'],
    tables: [
      {
        title: 'EN 15978 Yaşam Döngüsü Modülleri ve Sistem Sınırları',
        headers: ['Yaşam Evresi', 'Modül Kodları', 'Kapsam ve Süreçler', 'Veri Kaynağı'],
        rows: [
          ['Üretim Safhası (Beşik-Kapı)', 'A1 - A3', 'Ham madde çıkarma, nakliye ve fabrika imalatı.', 'Üretici EPD Beyanı'],
          ['İnşaat Safhası', 'A4 - A5', 'Şantiyeye nakliye ve şantiye montaj/inşaat süreçleri.', 'Şantiye Lojistik Verisi'],
          ['Kullanım Safhası', 'B1 - B7', 'Kullanım, bakım, onarım, yenileme ve işletme enerjisi.', 'İşletme Projeksiyonu'],
          ['Ömür Sonu Safhası', 'C1 - C4', 'Yıkım, söküm, atık nakliyesi ve katı atık depolama.', 'Atık Yönetim Planı'],
          ['Sistem Sınırı Dışı', 'Modül D', 'Yeniden kullanım, geri dönüşüm ve enerji kazanım potansiyeli.', 'Dairesel Ekonomi Beyanı']
        ]
      }
    ],
    keyTakeaways: [
      'Gömülü karbon emisyonlarının %70\'i A1-A3 imalat aşamasında gerçekleşir.',
      'Sökülebilirlik için Tasarım (DfD - Design for Deconstruction) prensipleri Modül D kazancını artırır.',
      'EPD (Environmental Product Declaration) sertifikası olmayan ürünler jenerik veritabanı katsayısı alır.'
    ],
    practicalCaseStudy: 'İstanbul projesinde geri dönüştürülmüş donatı çeliği kullanılarak A1-A3 imalat aşaması gömülü karbon emisyonunda %34 azalma elde edilmiştir.',
    teklifProIntegrationNote: 'TeklifPro yeşil tedarik modülü, EPD veritabanından malzeme karbon katsayılarını çekerek karbon primi maliyetini hesaplar.'
  },

  'sustainability-6d-embodied-carbon': {
    id: 'sustainability-6d-embodied-carbon',
    moduleSlug: 'sustainability-6d',
    subTopicKey: 'embodied-carbon',
    title: 'Karbon Analizi: Gömülü Karbon vs Operasyonel Karbon (PAS 2080)',
    badge: 'PAS 2080 Karbon Yönetimi',
    summary: 'Küresel emisyonların %40\'ından sorumlu olan binalarda Gömülü Karbon (Embodied GWP) ve Operasyonel Karbon emisyonlarının hesaplama yöntemleri.',
    formulaOrRule: '\\text{GWP}_{\\text{total}} = \\sum (M_{\\text{beton}} \\cdot 0.32) + \\sum (M_{\\text{çelik}} \\cdot 1.82) + E_{\\text{yıllık}} \\cdot \\text{EF}_{\\text{grid}} \\cdot N_{\\text{yıl}}',
    standards: ['PAS 2080:2023 (Carbon Management in Infrastructure)', 'ISO 16745-1', 'GHG Protocol'],
    tables: [
      {
        title: 'Başlıca İnşaat Malzemeleri Gömülü Karbon Katsayıları (GWP)',
        headers: ['Malzeme Cinsi', 'Birim', 'Jenerik GWP ($kg CO_2eq / birim$)', 'Düşük Karbon Alternatifi GWP'],
        rows: [
          ['C30/37 Standart Beton', 'm³', '320 kg CO₂eq / m³', '210 kg CO₂eq / m³ (Cüruflu Çimento)'],
          ['B500C Donatı Çeliği', 'Ton', '1.820 kg CO₂eq / Ton', '750 kg CO₂eq / Ton (Elektrik Ark Fırını)'],
          ['Tuğla Duvar', 'm²', '45 kg CO₂eq / m²', '22 kg CO₂eq / m² (Gazbeton)'],
          ['Alüminyum Giydirme Cephe', 'm²', '120 kg CO₂eq / m²', '48 kg CO₂eq / m² (Geri Dönüştürülmüş)']
        ]
      }
    ],
    keyTakeaways: [
      'Gömülü karbon bina inşa edilip bittiği an kilitlenir; işletme döneminde değiştirilemez.',
      'CBAM (AB Sınırda Karbon Düzenleme Mekanizması) ihracatçı müteahhitler için karbon vergi riski yaratır.',
      'TeklifPro karbon hesaplayıcısı malzeme pozu bazında GWP tonajını listeler.'
    ],
    practicalCaseStudy: 'Köprü projesinde çimentoda %50 curuf ikamesi yapılarak 42.000 Ton gömülü karbon salınımı engellenmiştir.',
    teklifProIntegrationNote: 'TeklifPro risk ayarlarında CBAM Karbon Risk Primini aktif ettiğinizde yüksek emisyonlu çelik kalemlerine varsayım katsayısı ekler.'
  },

  'sustainability-6d-green-building-leed': {
    id: 'sustainability-6d-green-building-leed',
    moduleSlug: 'sustainability-6d',
    subTopicKey: 'green-building-leed',
    title: 'Yeşil Bina Sertifikasyonları: LEED v4.1, BREEAM & EDGE Otomasyonu',
    badge: 'LEED v4.1 & BREEAM BIM Otomasyonu',
    summary: 'BIM 3D modellerindeki malzeme, enerji ve su verilerinin LEED v4.1, BREEAM ve EDGE sertifika kreditörlerine otomatik aktarımı.',
    formulaOrRule: '\\text{LEED Score} = \\text{MRc2 (EPD)} + \\text{MRc3 (Sourcing)} + \\text{EQc2 (Low Emitting)} + \\text{EAc2 (Optimize Energy)}',
    standards: ['USGBC LEED v4.1 Building Design and Construction', 'BREEAM International New Construction', 'IFC 4.0 Environmental Psets'],
    tables: [
      {
        title: 'LEED v4.1 Kredileri ve BIM Modeli Otomatik Veri Eşleşmesi',
        headers: ['LEED Kredi Kodu', 'Kredi Adı', 'BIM Model Nesnesi / Parametresi', 'Gerekli Kanıt Dokümanı'],
        rows: [
          ['MRc2', 'Environmental Product Declarations', 'IfcMaterial [Pset_MaterialEnvironmental]', 'EPD Sertifika PDF Kaydı'],
          ['MRc3', 'Sourcing of Raw Materials', 'IfcMaterial [Pset_MaterialSourcing]', 'Geri Dönüştürülmüş İçerik Beyanı'],
          ['EQc2', 'Low-Emitting Materials', 'IfcCovering [Pset_CoveringCommon.VOC]', 'VOC Emisyon Test Raporu'],
          ['WEc2', 'Indoor Water Use Reduction', 'IfcSanitaryTerminal [Pset_Sanitary.FlowRate]', 'Armatür Su Debisi Çizelgesi']
        ]
      }
    ],
    keyTakeaways: [
      'LEED Gold veya Platinum hedefleyen projelerde EPD verisi olan malzemeler tercih edilmelidir.',
      'BIM modelinde malzeme boya ve kaplamalarının VOC parametreleri eksikse iç hava kalitesi kredisi kaybedilir.',
      'TeklifPro green sertifika raporu kredileri poz kodlarıyla eşleştirir.'
    ],
    practicalCaseStudy: 'Ofis kulesi projesinde BIM modelinden otomatik çıkarılan EPD ve VOC verileri sayesinde LEED v4.1 Platinum sertifikası 82 puanla kazanılmıştır.',
    teklifProIntegrationNote: 'TeklifPro teklif çıktısında yeşil bina sertifika puan kartını ve onaylı pozları teklif ekine otomatik koyar.'
  },

  // ===================================================================
  // 4. MODULE: /academy/scan-to-bim (AI, Scan-to-BIM & Dijital İkiz)
  // ===================================================================
  'scan-to-bim-loa-standards': {
    id: 'scan-to-bim-loa-standards',
    moduleSlug: 'scan-to-bim',
    subTopicKey: 'loa-standards',
    title: 'LOA (Level of Accuracy) Toleransları: USIBD LOA 10/30/50 Standartları',
    badge: 'USIBD LOA Doğruluk Standardı',
    summary: 'Lazer tarama ve Nokta Bulutundan (Point Cloud) BIM modelleme yaparken kullanım amacına göre belirlenen LOA 10, LOA 30 ve LOA 50 tolerans sınırları.',
    formulaOrRule: '\\text{Tolerance (LOA 30)} = \\pm 15\\text{ mm}, \\quad \\text{Tolerance (LOA 50)} = \\pm 1\\text{ mm}',
    standards: ['USIBD Level of Accuracy (LOA) Specification v3.0', 'ASTM E2807 Standard Specification for 3D Imaging Data'],
    tables: [
      {
        title: 'USIBD LOA Seviyeleri ve Şantiye Kullanım Alanları',
        headers: ['LOA Seviyesi', 'Üst Üste Binme Toleransı', 'Tarama Ekipmanı', 'Kullanım Amacı ve Şantiye Kararı'],
        rows: [
          ['LOA 10 (User Defined)', '± 50 mm (Kaba Kütle)', 'Mobil Lidar / El Taraması', 'Kavramsal kütle, erken alan ve hacim bütçelemesi.'],
          ['LOA 20 (General)', '± 30 mm (Genel Geometri)', 'Dron Fotogrametri', 'Arazi harfiyatı, kaba betonarme kontrolü.'],
          ['LOA 30 (Accurate)', '± 15 mm (Hassas Mimari)', 'Karasal Lazer Tarayıcı (TLS)', 'MEP ve mimari çakışma, as-built model teslimi.'],
          ['LOA 40 (Precise)', '± 5 mm (Yüksek Hassasiyet)', 'Yüksek Hassasiyetli TLS', 'Prefabrik eleman birleşimi, çelik diklik kontrolü.'],
          ['LOA 50 (Very Precise)', '± 1 mm (Milimetrik Rölöve)', 'Endüstriyel Lazer Tarama', 'Tarihi eser restorasyonu (HBIM) ve hassas rölöve.']
        ]
      }
    ],
    keyTakeaways: [
      'Gereksiz yere her projede LOA 50 talep etmek tarama ve modelleme maliyetini 5 katına çıkarır.',
      'LOA sözleşmede açıkça belirtilmeli, nokta bulutu tolerans raporu teslim edilmelidir.',
      'SmartCheck Scan-to-BIM kural motoru tarama ile model arasındaki sapmaları süzmektedir.'
    ],
    practicalCaseStudy: 'Tarihi hamam restorasyonunda LOA 50 karasal lazer tarama yapılarak kubbedeki 3 mm deformasyon taranmış ve HBIM modeline işlenmiştir.',
    teklifProIntegrationNote: 'TeklifPro rölöve tekliflerinde LOA seviyesini seçtiğinizde tarama adam-saat maliyeti otomatik hesaplanır.'
  },

  'scan-to-bim-heatmap-analysis': {
    id: 'scan-to-bim-heatmap-analysis',
    moduleSlug: 'scan-to-bim',
    subTopicKey: 'heatmap-analysis',
    title: 'Nokta Bulutu - BIM Model Kıyaslaması & Deformasyon Heatmap Analizi',
    badge: 'Deformasyon & Heatmap Analizi',
    summary: 'Sahadan alınan lazer tarama nokta bulutu (.e57 / .las) ile tasarlanan 3D IFC modelinin çakıştırılarak milimetrik deformasyon renk haritası (Heatmap) çıkarılması.',
    formulaOrRule: 'd = |(\\vec{P}_{\\text{point}} - \\vec{P}_{\\text{mesh}}) \\cdot \\hat{n}| \\quad (\\text{Red: } d > 25\\text{mm}, \\text{ Green: } d < 5\\text{mm})',
    standards: ['ISO 17123-8 Optics and optical instruments', 'E57 File Format ASTM E2807'],
    tables: [
      {
        title: 'Deformasyon Renk Skalası ve Şantiye Müdahale Matrisi',
        headers: ['Renk', 'Deformasyon Aralığı ($d$)', 'Durum', 'Saha Kararı ve Aksiyon'],
        rows: [
          ['🟢 Yeşil', '0 - 5 mm', 'Tolerans İçi Uyumlu', 'İmalat onaylandı, sonraki faza geçilebilir.'],
          ['🟡 Sarı', '5 - 15 mm', 'Hafif Sapma (İncele)', 'Saha mühendisi diklik ve paspayı kontrolü yapar.'],
          ['🔴 Kırmızı', '> 25 mm', 'Tolerans Dışı (Kritik)', 'Kır-dök veya statik takviye kararı gerektirir.'],
          ['🔵 Mavi', '< -25 mm', 'Eksik İmalat / Çökme', 'Şakül ve sehim kontrolü yapılır.']
        ]
      }
    ],
    keyTakeaways: [
      'Heatmap analizi betonarme kalıp sökümünden hemen sonra yapılarak kolon eğiklikleri erkenden tespit edilir.',
      'Sözleşmede tolerans dışı kırmızı bölgeler BCF sorunu (Issue) olarak şantiye ekibine iletilmelidir.',
      'TeklifPro saha kontrol ekranında deformasyon katsayısı rework maliyeti olarak işlenir.'
    ],
    practicalCaseStudy: 'Endüstriyel yapıda döşeme betonu dökümünden sonra yapılan Heatmap analizinde zemin döşemesinde 32 mm sehim görülmüş, şap öncesi düzeltme yapılmıştır.',
    teklifProIntegrationNote: 'TeklifPro risk modülü, kaba inşaat sapmalarını süzerek şap ve düzeltme malzemesi ilave maliyetini hesaplar.'
  },

  'scan-to-bim-generative-design': {
    id: 'scan-to-bim-generative-design',
    moduleSlug: 'scan-to-bim',
    subTopicKey: 'generative-design',
    title: 'NSGA-II Üretken Tasarım (Generative Design) Optimizasyonu',
    badge: 'AI & Generative Design',
    summary: 'Çok hedefli evrimsel algoritmalar (NSGA-II) kullanarak maliyet, gün ışığı, rüzgar ve strüktür gibi zıt hedefleri çoklu varyasyonlarla optimize etme.',
    formulaOrRule: '\\min F(x) = \\left[ f_1(x) = \\text{Maliyet}, \\; f_2(x) = -\\text{Gün Işığı}, \\; f_3(x) = \\text{Gömülü Karbon} \\right]',
    standards: ['NSGA-II (Non-dominated Sorting Genetic Algorithm II)', 'buildingSMART Algorithmic BIM'],
    tables: [
      {
        title: 'NSGA-II Optimizasyon Parametreleri ve Çıktı Kümesi',
        headers: ['Optimizasyon Parametresi', 'Tipi', 'Hedef / Sınır', 'Tasarım Çıktısı'],
        rows: [
          ['Bina Yönlenmesi', 'Girdi Değişkeni', '0° - 360° dönüş açıları', 'Güneş kazanım optimizasyonu'],
          ['Pencere / Duvar Oranı (WWR)', 'Girdi Değişkeni', '%20 - %60 cam oranı', 'Gün ışığı ve ısı kaybı dengesi'],
          ['5D Toplam Maliyet', 'Hedef 1 (Min)', 'Minimum inşaat bedeli', 'Pareto Optimal Çözüm A'],
          ['Yıllık Enerji Talebi', 'Hedef 2 (Min)', 'Minimum kWh/m² yıl', 'Pareto Optimal Çözüm B']
        ]
      }
    ],
    keyTakeaways: [
      'Üretken tasarım binlerce seçeneği saniyeler içinde tarar; ancak en iyi çözümü seçme sorumluluğu mimar/mühendistedir.',
      'Pareto sınırındaki çözümler zıt hedeflerin dengelendiği en rasyonel tasarım alternatifleridir.',
      'TeklifPro üretken tasarım opsiyonlarının maliyet matrisini canlı kıyaslar.'
    ],
    practicalCaseStudy: 'Kampüs projesinde NSGA-II ile 500 tasarım varyasyonu taranmış; inşaat maliyetini %8 düşürürken gün ışığı performansını %15 artıran opsiyon seçilmiştir.',
    teklifProIntegrationNote: 'TeklifPro mimari opsiyon seçim ekranında üretken tasarım varyasyonlarının 5D maliyet farklarını listeler.'
  },

  'scan-to-bim-human-in-the-loop': {
    id: 'scan-to-bim-human-in-the-loop',
    moduleSlug: 'scan-to-bim',
    subTopicKey: 'human-in-the-loop',
    title: 'İnsan Onayı & Kanıt Kaydı (Audit Trail & Human-in-the-Loop)',
    badge: 'AI Audit Trail & Etik Yönetim',
    summary: 'AI ve otomatik kural motorlarının ürettiği kararların mühendislik onay matrisinden geçirilmesi ve zaman damgalı dijital iz kaydı.',
    formulaOrRule: '\\text{DecisionStatus} = \\begin{cases} \\text{AutoApproved}, & \\text{if RiskScore} < 0.05 \\\\ \\text{RequiresEngineerSignoff}, & \\text{if RiskScore} \\ge 0.05 \\end{cases}',
    standards: ['EU AI Act High-Risk AI Requirements', 'ISO 19650-5 Audit Trail', 'IEEE 7000 Ethics in AI'],
    tables: [
      {
        title: 'AI Karar Risk Seviyeleri ve Onay Hiyerarşisi Matrisi',
        headers: ['Karar Kategorisi', 'Risk Seviyesi', 'AI Rolü', 'Gerekli İnsan Onay Mercii'],
        rows: [
          ['Metraj Poz Eşleştirme', '🟢 Düşük Risk', 'Otomatik öneri sunar', 'Metraj Mühendisi kontrol eder.'],
          ['Statik Donatı Tayini', '🔴 Kritik Risk', 'Taslak şema önerir', 'Yetkili İnşaat Mühendisi (İmzalı).'],
          ['Yangın Kaçış Mesafesi', '🔴 Kritik Risk', 'Otomatik kural kontrolü', 'Yangın Danışmanı & Mimar.'],
          ['Maliyet İskonto Önerisi', '🟡 Orta Risk', 'Piyasa trend simülasyonu', 'Proje Müdürü onaylar.']
        ]
      }
    ],
    keyTakeaways: [
      'AI asla nihai sorumluluğu almaz; tüm AI kararları zaman damgasıyla bir mühendise bağlanmalıdır.',
      'Audit Trail kayıtları olası hukuki ve ihale ihtilaflarında mahkemeye sunulacak dijital kanıttır.',
      'SmartCheck tüm yapay zeka bulgularını onay mekanizmasıyla sunar.'
    ],
    practicalCaseStudy: 'Hastane ihalesinde AI metraj asistanının çıkardığı 140 kalemden donatı büküm boyu uyarısı mühendis tarafından incelenmiş ve onaylanarak ihale dosyasına girmiştir.',
    teklifProIntegrationNote: 'TeklifPro onay matrisi ekranında AI tarafından oluşturulan teklif kalemlerinin kimin tarafından ne zaman onaylandığını loglar.'
  },

  // ===================================================================
  // 5. MODULE: /academy/security-field (Sözleşme, Saha & Güvenlik)
  // ===================================================================
  'security-field-cde-rbac': {
    id: 'security-field-cde-rbac',
    moduleSlug: 'security-field',
    subTopicKey: 'cde-rbac',
    title: 'ISO 19650-5 CDE İzin Matrisi: WIP / Shared / Published / Archived',
    badge: 'ISO 19650-5 CDE Güvenliği',
    summary: 'Proje paydaşlarının CDE klasörleri üzerindeki okuma, yazma, silme ve yayınlama yetkilerinin ISO 19650-5 siber güvenlik standardına göre düzenlenmesi.',
    formulaOrRule: '\\text{Permission} = \\text{Role} \\times \\text{CDEFolder} \\times \\text{SecurityClearance}',
    standards: ['ISO 19650-5:2020', 'ISO/IEC 27001 Security Controls', 'CDE Gateway Rules'],
    tables: [
      {
        title: 'CDE Klasör Bazlı Paydaş Yetki Matrisi',
        headers: ['CDE Konteyner', 'Disiplin İçi Modeler', 'Disiplin Lideri (Lead)', 'BIM Koordinatörü', 'İşveren / Müşteri'],
        rows: [
          ['01_WIP (Çalışma)', 'Okuma / Yazma (Full)', 'Okuma / Yazma / Onay', 'Erişim Yok', 'Erişim Yok'],
          ['02_SHARED (Paylaşım)', 'Salt Okunur (R)', 'Yayınlama (Publish)', 'Koordinasyon Onayı', 'Salt Okunur (R)'],
          ['03_PUBLISHED (Onaylı)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Kabul / Ödeme Onayı'],
          ['04_ARCHIVED (Arşiv)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Salt Okunur (R)', 'Audit / Arşiv (R)']
        ]
      }
    ],
    keyTakeaways: [
      'WIP alanları şantiye veya işverene açılmamalıdır; olgunlaşmamış veri karmaşaya yol açar.',
      'CDE yayınlama işlemleri (WIP -> Shared) disiplin liderinin onay imzasıyla gerçekleşmelidir.',
      'TeklifPro CDE entegrasyonu rol bazlı dosya indirme kısıtı uygular.'
    ],
    practicalCaseStudy: 'Havalimanı projesinde yanlışlıkla WIP klasöründen ihale çekilen statik pafta düzeltilmiş; CDE RBAC matrisi kurularak yetkisiz pafta kullanımı engellenmiştir.',
    teklifProIntegrationNote: 'TeklifPro CDE kilit ekranı, yetkisi olmayan kullanıcıların maliyet ve marj tablolarını indirmesini engeller.'
  },

  'security-field-e-ruhsat-arc': {
    id: 'security-field-e-ruhsat-arc',
    moduleSlug: 'security-field',
    subTopicKey: 'e-ruhsat-arc',
    title: 'e-Ruhsat, ARC & GeoBIM İmar Kural Denetimi',
    badge: 'e-Ruhsat & GeoBIM Otomasyonu',
    summary: '3D IFC mimari modellerinin belediye imar yönetmelikleri (TAKS, KAKS, çekme mesafesi) ve yangın kaçış kodları ile otomatik denetlenmesi.',
    formulaOrRule: '\\text{TAKS} = \\frac{A_{\\text{taban}}}{A_{\\text{parsel}}} \\le \\text{TAKS}_{\\text{max}}, \\quad \\text{KAKS} = \\frac{\\sum A_{\\text{kat}}}{A_{\\text{parsel}}} \\le \\text{Emsal}_{\\text{max}}',
    standards: ['T.C. Çevre Şehircilik ve İklim Değişikliği Bkn. e-Ruhsat', 'GeoBIM OGC / CityGML Standardı', 'Binaların Yangından Korunması Yön.'],
    tables: [
      {
        title: 'Otomatik İmar ve Yangın Kural Denetimi Matrisi',
        headers: ['Kural Adı', 'Mevzuat Maddesi', 'BIM Model Kontrol Noktası', 'Otomatik Kural Çıktısı'],
        rows: [
          ['TAKS İmar Sınırı', 'Planlı Alanlar İmar Yön. Md 20', 'IfcBuildingFootprint / Parsel Sınırı', '🟢 Uyumlu (TAKS: 0.32 <= 0.35)'],
          ['KAKS (Emsal) Sınırı', 'Planlı Alanlar İmar Yön. Md 22', 'Tüm IfcSlab brüt alanları toplamı', '🟢 Uyumlu (Emsal: 1.95 <= 2.00)'],
          ['Ön Çekme Mesafesi', 'İmar Planı Notları', 'IfcBuilding dış yüzey - Parsel mesafesi', '🔴 İhlal! (4.20m < 5.00m)'],
          ['Yangın Kaçış Mesafesi', 'Yangın Korunma Yön. Md 31', 'Mahal merkezinden yangın kapısı yolu', '🔴 İhlal! (38m > 30m koridorsuz)']
        ]
      }
    ],
    keyTakeaways: [
      'e-Ruhsat kural denetimi yapılabilmesi için IFC modelinin coğrafi parsel koordinatlarına (GeoBIM) oturtulması zorunludur.',
      'Otomatik ruhsat denetimi zaman kazandırır; ancak belediye onayında yetkili mimar ıslak/elektronik imzası esastır.',
      'SmartCheck ruhsat denetim modülü imar aykırılıklarını kırmızı renkle gösterir.'
    ],
    practicalCaseStudy: 'Konut projesinde ön çekme mesafesinde 80 cm ihlal otomatik ARC kontrolünde tespit edilmiş, ruhsat reddi yaşanmadan proje revize edilmiştir.',
    teklifProIntegrationNote: 'TeklifPro imar analitiği ekranında emsal dışı net satılabilir alan hesabı otomatik sunulur.'
  },

  'security-field-vdc-clash': {
    id: 'security-field-vdc-clash',
    moduleSlug: 'security-field',
    subTopicKey: 'vdc-clash',
    title: 'VDC & Clash Matrisi: Hard Clash, Soft Clash & 4D Zaman Çakışması',
    badge: 'VDC & Clash Yönetimi',
    summary: 'Disiplinler arası çakışmaların (Fiziksel, Tolerans, Lojistik) Navisworks/Solibri ile tespiti ve BCF (BIM Collaboration Format) ile takibi.',
    formulaOrRule: '\\text{ClashVolume} = V(\\text{Object}_A \\cap \\text{Object}_B) > 0',
    standards: ['VDC (Virtual Design and Construction) Practice', 'buildingSMART BCF 2.1 / 3.0 API'],
    tables: [
      {
        title: 'Çakışma (Clash) Türleri ve Şantiye Müdahale Rehberi',
        headers: ['Clash Türü', 'Açıklama', 'Örnek Senaryo', 'BCF Çözüm Yolu'],
        rows: [
          ['Hard Clash (Fiziksel)', 'İki katı geometrinin uzayda aynı hacmi işgal etmesi.', 'Kiriş içinden havalandırma kanalı geçmesi.', 'MEP kot düşürür veya kirişe onaylı boşluk (Void) açılır.'],
          ['Soft Clash (Tolerans)', 'Servis ve bakım boşluğu alanlarının ihlal edilmesi.', 'Vana etrafında mühendis çalışma alanının olmaması.', 'MEP elemanı kaydırılarak bakım koridoru açılır.'],
          ['4D Clash (Zaman/Lojistik)', 'Şantiye vinci veya iskelenin imalatla zamansal çakışması.', 'Kule vincin cephe kaplamasıyla aynı gün çalışması.', '4D iş programında aktivite günleri kaydırılır.']
        ]
      }
    ],
    keyTakeaways: [
      'Şantiyede tespit edilen bir Hard Clash ortalama 15.000 ₺ kır-dök maliyetine yol açarken, modelde çözmek 0 ₺ maliyettir.',
      'Clash tespitleri PDF değil, BCF (BIM Collaboration Format) dosyası olarak mühendise atanmalıdır.',
      'TeklifPro risk motoru çözülmemiş clash sayılarını ek maliyet primi olarak teklife yansıtır.'
    ],
    practicalCaseStudy: 'Hastane projesinde 3.400 adet Hard Clash BCF akışıyla şantiyeye inmeden modelde çözülmüş, tahmini 4.5 Milyon ₺ rework önlenmiştir.',
    teklifProIntegrationNote: 'TeklifPro risk ekranında BCF çakışma raporu yüklendiğinde çözülmeyen her çakışma için kaba/ince işler risk primi eklenir.'
  },

  'security-field-bvbs-rebar': {
    id: 'security-field-bvbs-rebar',
    moduleSlug: 'security-field',
    subTopicKey: 'bvbs-rebar',
    title: 'Donatı Detaylandırma: LOD 400 Donatı, BVBS Kodları & 12m Çelik Boy Fire Analizi',
    badge: 'LOD 400 Donatı & BVBS Otomasyonu',
    summary: 'Statik betonarme donatılarının LOD 400 seviyesinde modellenmesi, BVBS demir kesim kodları ve 12 metrelik ticari çelik boylarında optimum kesim fire hesabı.',
    formulaOrRule: 'l_{bd} = \\alpha_1 \\cdot \\alpha_2 \\cdot \\alpha_3 \\cdot \\alpha_4 \\cdot \\alpha_5 \\cdot l_{b,rqd}, \\quad l_{b,rqd} = \\frac{\\phi}{4} \\cdot \\frac{\\sigma_{sd}}{f_{bd}}, \\quad \\text{Fire \\%} = \\frac{12.00\\text{m} - \\sum L_k}{12.00\\text{m}} \\times 100',
    standards: [
      'Eurocode 2: EN 1992-1-1 (Design of concrete structures)',
      'TBDY 2018 (Türkiye Bina Deprem Yönetmeliği)',
      'BVBS Standard Format for Reinforcement Steel Data (v3.0)',
      'TS 500 & TS 708 Çelik Çubuklar'
    ],
    tables: [
      {
        title: 'Eurocode 2 & TBDY 2018 Donatı Detaylandırma Standartları',
        headers: ['Parametre', 'Eurocode 2 (EN 1992-1-1)', 'TBDY 2018 Deprem Yön.', 'Saha & Şantiye Etkisi'],
        rows: [
          ['Kenetlenme Boyu ($l_{bd}$)', '$l_{bd} = \\alpha_1 \\cdot \\alpha_2 \\cdot \\alpha_3 \\cdot \\alpha_4 \\cdot \\alpha_5 \\cdot l_{b,rqd}$', 'Min $50d_b$ (Çekme donatısı)', 'Paspayı ve enine donatı katsayıları $\\alpha$ düşürür.'],
          ['Bindirme Boyu ($l_0$)', '$l_0 = \\alpha_6 \\cdot l_{bd}$ (Aynı kesitte bindirme katsayısı)', 'Deprem bölgesinde bindirme kesitin %50\'sini geçemez', 'Yanlış bindirme boyu dona kırımına sebep olur.'],
          ['Etriye Kancası', '90° veya 135° büküm', 'Zorunlu 135° büküm kancası ($10d_b \\ge 100\\text{ mm}$)', 'Kanca boyu eksik olursa depremde burkulur.'],
          ['Etriye Sıklaştırma', 'Açıklık etriye aralığının 0.6 katı', 'Kolon/kiriş uçlarında $s \\le \\min(h/4, 100\\text{ mm}, 6d_b)$', 'Deprem kabuk atma bölgesini korur.']
        ]
      },
      {
        title: 'BVBS Şekil Kodları ve Donatı Büküm Standartları',
        headers: ['BVBS Şekil Kodu', 'Şekil Tanımı', 'Büküm Detayı & Paspayı', 'Şantiye Montaj Amacı'],
        rows: [
          ['Code 15 (Düz Çubuk)', 'Düz boy donatı', 'Ek yeri l₀ kenetlenme boyu dikkate alınır.', 'Kolon/Kiriş ana donatısı.'],
          ['Code 21 (L Büküm)', 'Köşe gönye bükümü', 'Minimum büküm çapı $d_b = 4d$ uygulanır.', 'Mesnet ve köşe birleşimleri.'],
          ['Code 31 (Etriye Kapalı)', 'Kutu etriye 135° kanca', '135° kanca boyu min $10d$ olmalıdır.', 'Kolon ve kiriş kayma donatısı.'],
          ['Code 51 (Çiroz)', 'S çiroz bağlantısı', 'Kolon karşılıklı donatılarını bağlar.', 'Perde ve kolon donatı burkulma önleme.']
        ]
      }
    ],
    keyTakeaways: [
      'Eurocode 2 uyarınca donatı kenetlenme boyu ($l_{bd}$) hesaplanırken paspayı katsayısı $\\alpha_2$ ve donatı çapı doğrudan hesaba katılır.',
      'TBDY 2018 uyarınca deprem bölgelerinde etriye kancaları 135° yapılmak zorundadır; 90° etriyeler ağır hasardır.',
      'Türkiye çelik piyasasında donatılar 12.00 metre standart boyda satılır; BVBS ile imalat firesi %8\'den %1.5 seviyesine indirilir.'
    ],
    practicalCaseStudy: '32 katlı projede Eurocode 2 $l_0$ bindirme boyu formülüyle paspayı katsayıları optimize edilmiş, toplam çelik tonajında %4.2 net tasarruf sağlanmıştır.',
    teklifProIntegrationNote: 'TeklifPro donatı hesaplayıcısı Eurocode 2 $l_{bd}$ formülünü ve BVBS kesim optimizasyonunu canlı çalıştırır.',
    checkpointQuestions: [
      {
        question: 'TBDY 2018 uyarınca deprem etriyelerinin kanca büküm açısı ve minimum kanca uzantı boyu ne olmalıdır?',
        options: [
          '90° büküm, 5db uzantı',
          '135° büküm, min 10db (en az 100 mm) uzantı',
          '180° büküm, 4db uzantı',
          '45° büküm, 15db uzantı'
        ],
        correctIndex: 1,
        explanation: 'TBDY 2018 deprem yönetmeliğine göre betonarme etriyeler zorunlu olarak 135° bükülmeli ve kanca uzantı boyu en az 10db (ve minimum 100 mm) olmalıdır.'
      },
      {
        question: 'Eurocode 2 (EN 1992-1-1) standardına göre donatı temel kenetlenme boyunu (l_bd) düşüren α2 katsayısı hangi etkeni temsil eder?',
        options: [
          'Donatının ticari satın alım fiyatını',
          'Beton örtüsü (paspayı) miktarının kenetlenmeye olumlu etkisini',
          'Çeliğin paslanma katsayısını',
          'Kalıp söküm süresini'
        ],
        correctIndex: 1,
        explanation: 'Eurocode 2\'de α2 katsayısı, paspayının (beton örtüsü c) donatı kenetlenmesine sağladığı sarmalama etkisini temsil eder ve yeterli paspayında kenetlenme boyunu %30\'a kadar kısaltır.'
      }
    ]
  },

  // ===================================================================
  // 6. MODULE: /academy/bim-core (BIM Core Akademik Müfredat)
  // ===================================================================
  'bim-core-aec-ontology': {
    id: 'bim-core-aec-ontology',
    moduleSlug: 'bim-core',
    subTopicKey: 'aec-ontology',
    title: 'BIM501: AEC Ontolojisi & Varlık Yönetimi',
    badge: 'BIM501 Akademik Müfredat',
    summary: 'Verinin geometriye bağlanması, objeye dayalı varlık hiyerarşisi ve DIKW (Data-Information-Knowledge-Wisdom) piramidinin inşaat sektöründeki uygulaması.',
    formulaOrRule: '\\text{AEC Object} = \\text{Geometry (3D B-Rep)} + \\text{Attributes (LOI)} + \\text{Relationships (IfcRel)}',
    standards: ['buildingSMART Data Dictionary (bSDD)', 'ISO 12006-2 Building construction - Organization of information'],
    tables: [
      {
        title: 'AEC Nesne Hiyerarşisi ve IFC İlişki Şeması',
        headers: ['Hiyerarşi Seviyesi', 'IFC Sınıfı', 'İlişki Nesnesi (IfcRel)', 'Örnek Nesne'],
        rows: [
          ['Proje', 'IfcProject', 'IfcRelAggregates', 'İstanbul Havalimanı Projesi'],
          ['Arsa / Site', 'IfcSite', 'IfcRelAggregates', '34/12 Pafta Parsel Alanı'],
          ['Bina / Yapı', 'IfcBuilding', 'IfcRelAggregates', 'A Blok Konut Kulesi'],
          ['Kat / Seviye', 'IfcBuildingStorey', 'IfcRelContainedInSpatialStructure', '3. Kat Seviyesi (+9.00)'],
          ['Yapı Elemanı', 'IfcColumn / IfcBeam', 'IfcRelAssociatesMaterial', 'K-301 Kolonu (C35/45)']
        ]
      }
    ],
    keyTakeaways: [
      'BIM sadece 3D çizim değildir; nesnelerin birbiriyle kurduğu anlamsal ilişki (relational ontology) ağından oluşur.',
      'IfcRelContainedInSpatialStructure nesnesi elemanın hangi katta olduğunu gösteren hukuki bağdır.',
      'TeklifPro ontoloji tarayıcısı nesne ilişkilerini süzerek kat kat metraj çıkartır.'
    ],
    practicalCaseStudy: 'Karma projede kolonların kat ilişkileri ontolojik olarak doğru kurulduğu için 3. kat betonarme metrajı tek tıkla kat bazında ayrıştırılmıştır.',
    teklifProIntegrationNote: 'TeklifPro kat bazlı metraj kırılım ekranında IFC spatial structure hiyerarşisini doğrudan görüntüler.'
  },

  'bim-core-loin-guide': {
    id: 'bim-core-loin-guide',
    moduleSlug: 'bim-core',
    subTopicKey: 'loin-guide',
    title: 'BIM502: LOIN (Level of Information Need) Detaylandırma Rehberi',
    badge: 'BIM502 Akademik Müfredat',
    summary: 'EN 17412-1 standardına göre bilgi ihtiyacının geometrik (LOG), alfanümerik (LOI) ve dokümantasyon (DOC) olarak aşamalı tanımlanması.',
    formulaOrRule: '\\text{LOIN} = \\text{LOG} + \\text{LOI} + \\text{DOC}',
    standards: ['EN 17412-1:2020', 'ISO 19650-1 Clause 11'],
    tables: [
      {
        title: 'BIM502 LOIN Matrisi Örneği',
        headers: ['Nesne', 'Aşama', 'LOG (Geometri)', 'LOI (Veri)', 'DOC (Doküman)'],
        rows: [
          ['IfcWall', 'İhale', 'LOG 300 (Net Kalınlık, Yükseklik)', 'Poz No, Birim Fiyat, Yangın Dayanımı', 'Teknik Şartname PDF'],
          ['IfcColumn', 'Şantiye', 'LOG 400 (Pahlar, Donatı Filizi)', 'Beton Sınıfı C35/45, Paspayı 30mm', 'Beton Döküm Tutanağı'],
          ['IfcPump', 'İşletme', 'LOG 200 (Sadeleştirilmiş Kutu)', 'Seri No, Garanti Bitiş, Debisi', 'Kullanım Kılavuzu PDF']
        ]
      }
    ],
    keyTakeaways: [
      'Gereksiz detay ihale aşamasında zaman kaybına, eksik detay ise ihale sapmasına yol açar.',
      'LOIN her teslim miltaşı için ayrı ayrı sözleşmede tanımlanmalıdır.',
      'SmartCheck LOIN doğrulayıcısı eksik LOI parametrelerini kırmızı bayrakla işaretler.'
    ],
    practicalCaseStudy: 'İhale aşamasında pompalar LOG 200 / LOI 300 seviyesinde tutularak model kasması önlenmiş, gerekli poz kodları LOI verisiyle ihaleye girmiştir.',
    teklifProIntegrationNote: 'TeklifPro LOIN kontrol modülü, modeldeki LOI parametrelerini okuyarak eksik poz numaralarını tespit eder.'
  },

  'bim-core-ifc-bcf-flow': {
    id: 'bim-core-ifc-bcf-flow',
    moduleSlug: 'bim-core',
    subTopicKey: 'ifc-bcf-flow',
    title: 'BIM503: openBIM, IFC 4.0 Schema & BCF Issue Takip Akışı',
    badge: 'BIM503 openBIM & BCF',
    summary: 'IFC 4.0 nesne şeması, BCF (BIM Collaboration Format) ile çakışma ve model revizyonlarının yazılımlar arası (Revit-Allplan-Archicad) takibi.',
    formulaOrRule: '\\text{BCF Issue} = \\text{Guid} + \\text{CameraViewpoint} + \\text{Comment} + \\text{Assignee} + \\text{Status}',
    standards: ['buildingSMART BCF 3.0 API', 'ISO 16739-1:2018 (IFC Schema)'],
    tables: [
      {
        title: 'BCF Issue Yaşam Döngüsü ve Durum Akışı',
        headers: ['İşlem Adımı', 'BCF Durumu', 'Sorumlu Paydaş', 'Yazılımlar Arası Veri Akışı'],
        rows: [
          ['01. Çakışma Tespiti', 'Open (Açık)', 'BIM Koordinatörü', 'Solibri/Navisworks üzerinde BCF oluşturulur.'],
          ['02. Görev Atama', 'Assigned (Atandı)', 'MEP Mühendisi', 'Revit/Allplan içine BCF eklentisiyle kamerayla düşer.'],
          ['03. Revizyon Yapıldı', 'Resolved (Çözüldü)', 'MEP Mühendisi', 'Model düzeltilir, BCF güncellenip koordinatöre iletilir.'],
          ['04. Kontrol & Kapanış', 'Closed (Kapandı)', 'BIM Koordinatörü', 'Koordinatör kontrol eder ve issue kapatılır.']
        ]
      }
    ],
    keyTakeaways: [
      'BCF sayesinde ağır 3D modelleri e-posta ile göndermeye gerek kalmaz; sadece 10 KB\'lık görünüm ve yorum verisi aktarılır.',
      'BCF kamerası tıkladığınız an modelde hatanın olduğu yere otomatik zoom yapar.',
      'TeklifPro BCF entegrasyonu teklif hatalarını BCF issue olarak yönetir.'
    ],
    practicalCaseStudy: '45 katlı projede 2.300 çakışma BCF uzantısı üzerinden Allplan ve Revit kullanıcılarına dağıtılmış, 2 haftada sıfırlanmıştır.',
    teklifProIntegrationNote: 'TeklifPro risk yönetiminde BCF açık issue sayısı arttıkça şantiye sürpriz maliyet katsayısı otomatik yükselir.'
  },

  'bim-core-bep-raci-matrix': {
    id: 'bim-core-bep-raci-matrix',
    moduleSlug: 'bim-core',
    subTopicKey: 'bep-raci-matrix',
    title: 'BIM504: BEP, TIDP, MIDP ve RACI Sorumluluk Matrisi',
    badge: 'BIM504 BEP & RACI Yönetimi',
    summary: 'BIM Execution Plan (BEP) hazırlanması, görev bilgi teslim planlarının (TIDP) ana plan (MIDP) altında birleşimi ve RACI matrisi.',
    formulaOrRule: '\\text{MIDP} = \\bigcup_{k} \\text{TIDP}_k \\quad (\\text{RACI: Responsible, Accountable, Consulted, Informed})',
    standards: ['ISO 19650-2 Clause 5.3 & 5.4', 'CIC BIM Protocol 2nd Edition'],
    tables: [
      {
        title: 'BIM Teslim Adımları ve RACI Sorumluluk Matrisi',
        headers: ['BIM Teslim Görevi', 'Mimar (Arch)', 'Statik (Struct)', 'MEP Mühendisi', 'BIM Yöneticisi'],
        rows: [
          ['BEP Hazırlığı', 'C (Danışılır)', 'C (Danışılır)', 'C (Danışılır)', 'A / R (Hesap Verir / Yapar)'],
          ['Disiplin İç Çakışma Testi', 'A / R', 'A / R', 'A / R', 'I (Bilgilendirilir)'],
          ['Federated Model Birleşimi', 'C', 'C', 'C', 'A / R'],
          ['COBie Veri Girişi', 'R', 'R', 'R', 'A (Denetler)']
        ]
      }
    ],
    keyTakeaways: [
      'BEP hazırlanmadan başlanan projelerde yazılım versiyon uyumsuzlukları ve sıfır noktası (origin) kaymaları yaşanır.',
      'MIDP (Master Information Delivery Plan) tüm teslim tarihleri ve formatlarının bağlayıcı takvimidir.',
      'TeklifPro BEP onay takipçisi teslim tarihlerini takip eder.'
    ],
    practicalCaseStudy: 'Altyapı projesinde sıfır noktası (0,0,0) BEP içinde koordinatlanmadığı için mimari ve statik modeller 120 metre kayık çakışmış, BEP revizyonu ile sorun çözülmüştür.',
    teklifProIntegrationNote: 'TeklifPro proje açılış sihirbazında BEP teslim formatları seçilerek varsayılan metraj birimleri kilitlenir.'
  }
};
