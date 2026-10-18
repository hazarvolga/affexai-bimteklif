import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, FileText, FlaskConical, ShieldAlert } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { data6D, dataLCAStages, dataIsoParts, dataPyramid, dataCdeStates, data4D, rebarData, rbacData, clashData, curriculumDetailData } from '@/academy/sourceData';
import { loaData, arcRuleData, careerMatrixData } from '@/academy/nativeDerivedData';

type Detail = {
  title: string;
  label: string;
  intro: string;
  why: string;
  modules: { title: string; body: string; points: string[] }[];
  outputs: string[];
  standards: string[];
  next: string;
};

const details: Record<string, Detail> = {
  'iso-19650': {
    title: 'ISO 19650: Bilginin yaşam döngüsünü yönetmek',
    label: 'Çekirdek müfredat · 5 bölüm',
    intro: 'ISO 19650 serisini yalnızca standart isimleri olarak değil; ihtiyaçtan ihale yanıtına, ortak üretimden işletme modeline uzanan bir bilgi yönetimi sistemi olarak ele alıyoruz.',
    why: 'Kaynak platformun ana fikri nettir: BIM, üç boyutlu çizim üretmekten önce bilginin kim tarafından, hangi amaçla, hangi durumda ve hangi kanıtla üretileceğine karar vermektir.',
    modules: [
      { 
        title: '19650-1 & 19650-2 · Kavramlar, İlkeler & Teslim Aşaması (OIR, PIR, AIR, EIR & CDE)', 
        body: 'Organizasyonel hedeflerden proje bilgi teslimine uzanan 8 adımlı omurga: OIR → PIR → AIR → EIR nedensellik zinciri ve CDE (WIP, Shared, Published, Archived) bilgi konteyneri yaşam döngüsü.', 
        points: [
          'OIR / PIR / AIR / EIR: Stratejik kurum hedeflerinden yüklenici ihale teslim şartnamesine geçiş',
          '8 Adımlı Süreç: İhtiyaç Analizi → İhale Daveti → Yanıt (BEP) → Sözleşme → Mobilizasyon → Üretim → PIM Teslimi → Kapanış',
          'CDE Durum Geçişleri: WIP (Taslak), Shared (Koordinasyon R/O), Published (Onaylı İhale/Ödeme), Archived (Audit Trail)',
          'TIDP & MIDP: Görev Teslim Planı (TIDP) birleşimiyle Ana Bilgi Teslim Planı (MIDP) oluşturulması'
        ] 
      },
      { 
        title: '19650-3 & 19650-4 · İşletme Aşaması, openBIM & COBie Teslimi (PIM → AIM)', 
        body: 'İnşaat esnasındaki Canlı Proje Bilgi Modeli\'nin (PIM), işletme safhasında Tesis Yönetimi (FM) için COBie standartlarında Varlık Bilgi Modeli\'ne (AIM) dönüştürülmesi.', 
        points: [
          'PIM → AIM Dönüşümü: İnşaat karmaşasından temizlenmiş, garanti ve bakım verisi içeren AIM varlık modeli',
          'COBie Eşleşmesi: IFC IfcAsset, IfcTypeProduct ve IfcSpace nesnelerinin COBie Excel/XML yapısına aktarımı',
          'openBIM & IFC 4.0: Yazılımdan bağımsız NVD (Model View Definition) validation & verification denetimi',
          'İşletme Garanti & Bakım: Cihaz ve ekipman seri no, son bakım tarihi ve üretici belgelerinin gömülmesi'
        ] 
      },
      { 
        title: '19650-5 · Güvenlik Odaklı Yönetim (RBAC & Audit Trail)', 
        body: 'Kritik altyapı, hastane ve kamu binalarında dijital ikiz verisinin rol bazlı yetkilendirilmesi, şifrelenmesi ve siber güvenlik uyumunun sağlanması.', 
        points: [
          'RBAC Yetki Matrisi: Mimar, Statikçi, MEP ve İşveren için WIP/Shared/Published klasör bazlı erişim kontrolü',
          'Hassas Veri Sınıflandırması: Güvenlik kamerası, havalandırma ve yapısal kritik detayların şifrelenmesi',
          'Audit Trail Kaydı: Modeldeki her geometrik ve alfanümerik değişikliğin zaman damgalı dijital izi',
          'Sözleşmesel Güvenlik: Yüklenici ve alt yüklenici verilerinin ISO 19650-5 güvenlik protokolüne bağlanması'
        ] 
      },
      { 
        title: 'EN 17412-1 · LOIN (Level of Information Need) Bilgi İhtiyacı Seviyesi', 
        body: 'Gereksiz 3D geometrik modellemeden kaçınarak geometric (LOG) ve alfanümerik (LOI) bilgenin doğru aşamada doğru miktarda üretilmesi ilkesi.', 
        points: [
          'LOG vs LOI Ayrımı: LOG (Geometrik Temsil Seviyesi) ile LOI (Alfanümerik Bilgi Zenginliği) dengesi',
          'Brutal Truth İlkesi: "Gereksiz donatıyı 3D çizme, LOI parametresine yaz" ile model boyutunu ve kasmayı engelleme',
          'İhtiyaca Göre Bilgi Seviyesi: Tasarım, ihale ve işletme aşamalarına özel LOIN matrislerinin hazırlanması',
          'SmartCheck Uyum Denetimi: Model nesnelerinin LOIN şartnamesine göre eksiksizlik kontrolü'
        ] 
      },
    ],
    outputs: ['Örnek OIR/PIR/AIR/EIR ilişkisi', 'CDE durum kodları ve gateway haritası', 'Rol–sorumluluk–teslim matrisi', 'Teklif öncesi bilgi gereksinimi kontrol listesi'],
    standards: ['ISO 19650-1 / -2 / -3 / -4 / -5', 'buildingSMART / IFC / MVD', 'COBie ve bilgi teslim yaklaşımı'],
    next: 'TeklifPro’da teklif hazırlarken bilgi kaynağını, sorumluluğu ve kontrol sınırını görünür kılın.',
  },
  'bim-core': {
    title: 'BIM Core: veriyi geometriye bağlayan düşünce sistemi',
    label: 'Akademik müfredat · BIM501–BIM505',
    intro: 'BIM Core hattı, yazılım operatörlüğünün ötesine geçerek ontoloji, bilgi yazarlığı, openBIM, sözleşme protokolleri ve dijital ikiz yönetimini aynı akademik omurgada toplar.',
    why: 'Kaynak HTML’deki yüksek lisans seviyesi yaklaşımın ticari karşılığı şudur: modeldeki bir kolon yalnızca şekil değil; maliyet, zaman, yangın dayanımı, üretim ve işletme bilgisi taşıyan bir varlıktır.',
    modules: [
      { 
        title: 'BIM501 · AEC Ontolojisi & Varlık Yönetimi', 
        body: 'IfcColumn ve IfcBeam gibi varlıkların geometri, maliyet, zaman ve performans bağlamlarını nesne tabanlı mimaride taşır.', 
        points: [
          'DIKW Piramidi: Veri → Bilgi → Bilgelik sürecinin AEC şantiyelerine uyarlanması',
          'Objeye Dayalı Düşünme: Geometrinin arkasında alfanümerik veri zenginliği oluşturma',
          'Bilgi Yöneticisi Rolü: Disiplinler arası veri akışının kurumsal yönetimi'
        ] 
      },
      { 
        title: 'BIM502 · Bilgi Yazarlığı & EN 17412-1 LOIN', 
        body: '“Gereksizse 3D donatı çizme, alfanümerik LOI parametresine yaz” ilkesiyle LOG ve LOI dengesini kurar.', 
        points: [
          'LOG vs LOI Ayrımı: LOG (Geometrik Temsil) ve LOI (Alfanümerik Veri) dengesi',
          'Aşırı Modelleme Riski: Gereksiz poligon çizimlerinin model boyutunu ve kasmayı artırmasını önleme',
          'Aşamalı LOIN Matrisi: İhale, inşaat ve işletme safhalarına özel veri seviyesi tanımları'
        ] 
      },
      { 
        title: 'BIM503 · openBIM, IFC 4.0 & BCF Issue Akışı', 
        body: 'IFC şeması, BCF (BIM Collaboration Format), buildingSMART ve EXPRESS-G üzerinden ortak veri dilini çalıştırır.', 
        points: [
          'IFC 4.0 Veri Şeması: Software-independent openBIM nesne hiyerarşisi',
          'BCF Issue Akışı: Çakışma ve model hatalarının yazılımlar arası BCF ile takibi',
          'B-Rep vs Analitik Model: Statik hesap modeli ile 3D fiziksel geometrinin ayrıştırılması'
        ] 
      },
      { 
        title: 'BIM504 · Sözleşmeler, BEP & RACI Matrisi', 
        body: 'BEP (BIM Execution Plan), CIC/AIA protokolleri, fikri mülkiyet ve RACI matrisi ile bilgi sorumluluğunu sözleşmeye bağlar.', 
        points: [
          'TIDP / MIDP Sorumluluğu: Görev bazlı bilgi teslim planlarının hiyerarşik yönetimi',
          'RACI Matrisi: Kim Sorumlu (Responsible), Kim Hesap Verir (Accountable), Kim Danışılır (Consulted), Kim Bilgilendirilir (Informed)',
          'Model Kullanım Lisansı: Fikri mülkiyet ve model verisinin telif sınırları'
        ] 
      },
      { 
        title: 'BIM505 · Dijital İkiz, PIM → AIM & COBie Teslimi', 
        body: 'İnşaat esnasındaki PIM modelinin işletme aşaması için COBie standartlarında AIM varlık modeline dönüştürülmesi.', 
        points: [
          'Operasyonel Bilgi Modeli (AIM): İşletme ve Tesis Yönetimi (FM) odaklı temiz veri yapısı',
          'COBie Veri Eşleşmesi: Garanti süreleri, seri numaraları ve bakım periyotlarının aktarımı',
          'IoT & Sensör Bağlantısı: Dijital ikizde canlı bina verisinin izlenmesi'
        ] 
      },
    ],
    outputs: ['LOIN karar tablosu', 'IFC/BCF veri değişim kontrolü', 'BEP ve RACI taslakları', 'AIM/COBie teslim veri listesi'],
    standards: ['ISO 19650-1 / -3', 'EN 17412-1 LOIN yaklaşımı', 'IFC, BCF ve COBie'],
    next: 'SmartCheck bulgularını bir “hata” olarak değil, kaynağı ve sorumlusu gösterilmiş bir öğrenme konusu olarak inceleyin.',
  },
  'sustainability-6d': {
    title: '6D sürdürülebilirlik: modelden yaşam döngüsüne',
    label: 'İleri seviye · 4 uygulama modülü',
    intro: '6D hattı, model geometrisini enerji, yaşam döngüsü maliyeti, gömülü karbon ve sertifikasyon verileriyle ilişkilendirir. Her sonuç veri sınırı ve varsayımla birlikte okunmalıdır.',
    why: 'Kaynakta dört ayrı laboratuvar bulunuyor: enerji performansı, LCA, karbon ayak izi ve yeşil bina sertifikasyonları. Bunlar tek bir “yeşil skor” değil, farklı karar sorularıdır.',
    modules: [
      { 
        title: 'BEM & Enerji Performans Simülasyonu (ISO 52000-1)', 
        body: 'BEM yaklaşımıyla 3D modelin geometrisini ve termal iletkenlik değerlerini yıllık enerji tüketim simülasyonuna taşır.', 
        points: [
          'EPW İklim Verisi: Bölgesel meteorolojik iklim verilerinin simülasyona aktarımı',
          'Isıtma-Soğutma Yükü: Yapı kabuğu U-değerleri üzerinden iklimlendirme yükü hesabı',
          'Gün Işığı Analizi: Doğal aydınlatma otomasyonu ile elektrik enerjisi tasarrufu'
        ] 
      },
      { 
        title: 'LCA Beşikten Mezara Yaşam Döngüsü Analizi (ISO 14040/14044)', 
        body: 'Malzemenin topraktan çıkarılmasından (A1) ömür sonu geri dönüşümüne (D) kadar tüm çevresel etkisini ölçer.', 
        points: [
          'EPD Veri Tabanı: Üretici Çevresel Ürün Beyanları (EPD) ile malzeme karşılaştırması',
          'A1–D Sistem Sınırları: A1-A3 (Üretim), A4-A5 (İnşaat), B1-B7 (Kullanım), C1-C4 (Ömür Sonu), D (Kazanım)',
          'Sökülebilirlik (DfD): Tasarım aşamasında yeniden kullanım ve dairesel ekonomi planı'
        ] 
      },
      { 
        title: 'Karbon Ayak İzi & Dekarbonizasyon (PAS 2080 / ISO 16745)', 
        body: 'Gömülü Karbon (Embodied) ve Operasyonel Karbon emisyonlarını ayrıştırarak düşük karbonlu malzeme kararlarını destekler.', 
        points: [
          'GWP Göstergesi: Küresel Isınma Potansiyeli ($kg CO_2eq$) metriği',
          'Düşük Karbonlu Malzeme: Yeşil çimento, geri dönüştürülmüş donatı ve ahşap karkas seçimi',
          'TeklifPro Karbon Primi: Teklif risk motorunda karbon tedarik volatilite senaryoları'
        ] 
      },
      { 
        title: 'Yeşil Bina Sertifikasyonları (LEED, BREEAM, EDGE)', 
        body: 'BIM model nesne verilerinin yeşil bina sertifika kreditörlerine otomatik raporlanması sürecidir.', 
        points: [
          'Kredi Takip Matrisi: LEED v4.1 ve BREEAM puan katsayılarının modelden takibi',
          'Su & Enerji Verimliliği: Tesisat modellerinden su tüketim debilerinin doğrulanması',
          'İç Hava Kalitesi: Düşük emisyonlu uçucu organik bileşik (VOC) malzeme seçimi'
        ] 
      },
    ],
    outputs: ['LCA veri sınırı ve varsayım notu', 'Malzeme karbon karşılaştırma şeması', 'Sertifika kredi takip matrisi', 'Tedarik sınıfı için senaryo özeti'],
    standards: ['ISO 52000-1 / TS EN ISO 13790', 'ISO 14040 / 14044 ve EN 15978', 'ISO 16745-1, GHG Protocol, PAS 2080', 'LEED v4.1, BREEAM, EDGE'],
    next: 'TeklifPro risk ekranında karbon/tedarik varsayımlarını kesin vergi sonucu değil, izlenebilir senaryo olarak değerlendirin.',
  },
  '4d-5d': {
    title: '4D / 5D: zaman, maliyet ve nakit akışı',
    label: 'Uygulamalı laboratuvar · TeklifPro bağlantısı',
    intro: '4D ve 5D laboratuvarı, statik metraj listesini iş programına ve maliyet gerçekleşmesine bağlar. Model yalnızca “ne kadar” değil, “ne zaman” sorusunu da yanıtlamaya başlar.',
    why: 'Kaynakta GUID tabanlı eşleştirme, 4D şantiye fazları ve EVM göstergeleri birlikte kullanılıyor. Bu, teklif hazırlama ile uygulama takibi arasında doğrudan bir veri köprüsü kurar.',
    modules: [
      { 
        title: 'GUID ile Primavera/MS Project 4D İş Programı Eşleştirme', 
        body: '3D model elemanlarını (IfcBeam, IfcColumn, IfcSlab) iş programı benzersiz WBS görevleriyle ilişkilendirir.', 
        points: [
          'Eleman–Görev Eşleşmesi: Model GUID\'lerinin 4D lojistik iş adımlarıyla otomasyonu',
          'Şantiye Fazlama: Temel/kazı, karkas ve ince işler 4D görsel lojistik simülasyonu',
          'Şantiye Kule Vinç & Lojistik: Geçici imalatların 4D çakışma kontrolüne dahil edilmesi'
        ] 
      },
      { 
        title: 'EVM (Earned Value Management) Performans Monitörü', 
        body: 'Planlanan değer, kazanılmış değer ve gerçekleşen maliyeti aynı 5D izleme çerçevesinde okur.', 
        points: [
          'PV (Planned Value): İş programına göre harcanması planlanan bütçe',
          'EV (Earned Value): Sahada fiziki olarak tamamlanan işin bütçelenmiş karşılığı',
          'AC (Actual Cost) & SPI/CPI: Gerçekleşen maliyet ile Zaman/Maliyet Performans Endeksleri'
        ] 
      },
      { 
        title: 'Teklif Risk Motoru & Eskalasyon Primi', 
        body: 'Süre, sözleşme tipi, LOD seviyesi, donatı standardı ve piyasa enflasyonunu teklif primine dönüştürür.', 
        points: [
          'Götürü Bedel vs Birim Fiyat: Risk sahibinin sözleşme tipine göre belirlenmesi',
          'Enflasyon Volatilite Primi: Proje süresince aylık malzeme fiyat artış senaryoları',
          'TeklifPro Entegrasyonu: Teklif oluşturucuda otomatik risk primi marj hesabı'
        ] 
      },
      { 
        title: 'Metraj Minha Kuralları (Türkiye ÇŞB vs Almanya DIN 18350)', 
        body: 'Farklı ülke standartlarındaki metraj minha (boşluk düşümü) kurallarının kârlılığa etkisini analiz eder.', 
        points: [
          'Türkiye ÇŞB Standardı: Boşluk alanı ne olursa olsun net metrajdan düşülür',
          'Almanya DIN 18350 Standardı: $2.50 m^2$ altındaki boşluklar işçilik kaybını dengelemek için düşülmez',
          'Mükerrer Metraj Engelleme: Kolon-kiriş-duvar çakışmalarının CSG Boolean kurallarıyla temizlenmesi'
        ] 
      },
    ],
    outputs: ['4D faz ve bağımlılık haritası', 'PV/EV/AC izleme tablosu', 'Teklif varsayımları ve risk notu', 'TeklifPro’ya aktarılabilir kontrol listesi'],
    standards: ['EVM: PV / EV / AC mantığı', 'LOD/LOIN bilgi seviyesi yaklaşımı', 'Proje sözleşmesi ve BIM protokolü birlikte okuma'],
    next: 'Gerçek teklifinizi TeklifPro pilotunda hazırlarken süre, sözleşme ve belirsizlik varsayımlarını kayda alın.',
  },
  'scan-to-bim': {
    title: 'AI, Scan-to-BIM ve algoritmik tasarım',
    label: 'Uygulamalı laboratuvar · Veri doğruluğu',
    intro: 'Scan-to-BIM hattı, nokta bulutundan dijital modele geçerken doğruluk seviyesinin, toleransın ve kullanım amacının birlikte belirlenmesi gerektiğini öğretir.',
    why: 'Kaynakta LOA 10, LOA 30 ve LOA 50 senaryoları farklı doğruluk toleranslarıyla gösteriliyor. Aynı nokta bulutu her kullanım için aynı modelleme yoğunluğunu gerektirmez.',
    modules: [
      { 
        title: 'LOA 10 · Kavramsal Boyutlandırma (±50 mm Tolerans)', 
        body: 'Nokta bulutundan best-fit kütle okumasıyla deformasyonları detaylandırmadan genel kütleyi temsil eder.', 
        points: [
          'Kavramsal Geometri: Yaklaşık $\pm 50\text{ mm}$ toleranslı ilk kütle modellemesi',
          'Hızlı Hacim Okuması: Erken aşama ihale ve konsept karar destek sistemi',
          'Düşük Maliyetli Lazer Tarama: Hızlı saha verisi toplama protokolü'
        ] 
      },
      { 
        title: 'LOA 30 · Hassas Koordinasyon (±15 mm Tolerans)', 
        body: 'As-built sahaya yakın, genel mimari ve MEP koordinasyonu için kullanılan standart modelleme seviyesidir.', 
        points: [
          'Yaklaşık $\pm 15\text{ mm}$ Tolerans: Şantiye içi çakışma ve as-built kontrolü',
          'MEP & Mimari Uyum: Tesisat geçiş boşlukları ve duvar diklik kontrolleri',
          'Saha Doğrulama: Nokta bulutu ile IFC modelinin çakıştırılması'
        ] 
      },
      { 
        title: 'LOA 50 · Dijital İkiz & HBIM (±1 mm Tolerans)', 
        body: 'Tarihi eser restorasyonlarında ve hassas dijital ikizlerde milimetrik deformasyon modellemesidir.', 
        points: [
          'Yaklaşık $\pm 1\text{ mm}$ Tolerans: Restorasyon ve tarihi bina (HBIM) rölövesi',
          'Dokusal & Yapısal Eğimler: Duvarlardaki ve kemerlerdeki milimetrik oturmaların işlenmesi',
          'Tolerans Belgelendirmesi: Resmi kurul ve restorasyon projelerine hazır belge üretimi'
        ] 
      },
      { 
        title: 'NSGA-II Üretken Tasarım & AI İnsan Onay Sınırı', 
        body: 'AI asistanların maliyet, enerji ve statik gibi zıt hedefleri çoklu varyasyonlarla tarama sınırları.', 
        points: [
          'NSGA-II Algoritması: 5D Maliyet vs 6D Sürdürülebilirlik zıt hedeflerinin optimizasyonu',
          'AI Sınırları: Algoritma öneri sunar; mühendislik sorumluluğu insana aittir',
          'Audit & Kanıt Kaydı: AI önerilerinin zaman damgalı doğrulama kayıtları'
        ] 
      },
    ],
    outputs: ['Kullanım amacına göre LOA seçimi', 'Nokta bulutu–model tolerans notu', 'AI çıktısı için kanıt ve insan onayı kaydı', 'Scan-to-BIM teslim kapsamı'],
    standards: ['LOA / as-built doğruluk senaryoları', 'IFC ve point cloud bilgi akışı', 'AI sonucu: öneri, doğrulama gerektirir'],
    next: 'SmartCheck ile veri eksikliği veya model–metraj uyuşmazlığını görünür kılın; otomatik sonucu nihai mühendislik kararı saymayın.',
  },
  'security-field': {
    title: 'Güvenlik, e-Ruhsat ve saha pratiği',
    label: 'Kurumsal uygulama · Saha ve kariyer',
    intro: 'Bu hat, dijital modelin sözleşme, güvenlik, e-Ruhsat, clash yönetimi ve üretilebilirlik ile temas ettiği noktaları birlikte ele alır.',
    why: 'Kaynak HTML yalnızca model doğruluğunu değil, modelin sahada gerçekten üretilebilir olup olmadığını sorguluyor: geçici yapılar, toleranslar, BCF issue’ları, SAF ve GeoBIM bu yüzden aynı çerçevede yer alıyor.',
    modules: [
      { 
        title: 'ISO 19650-5 CDE RBAC Yetki Matrisi', 
        body: 'Mimar, Statikçi, MEP Mühendisi ve İşveren temsilcisinin CDE klasörleri üzerindeki erişim ve onay hakları.', 
        points: [
          'WIP / Shared / Published Yetkileri: Disiplin içi yazma (W) vs dış disiplin okuma (R) erişimleri',
          'Hassas Veri Şifreleme: Kritik tesis ve havalandırma verilerinin gizlilik protokolleri',
          'Audit Trail: CDE üzerindeki onay ve revizyon hareketlerinin silinemez dijital kaydı'
        ] 
      },
      { 
        title: 'e-Ruhsat, ARC & GeoBIM Otomatik Kural Denetimi', 
        body: 'IFC modelinin imar parseli (GIS/GeoBIM) verileriyle eşleştirilerek ruhsat kurallarına uygunluğunun denetlenmesi.', 
        points: [
          'TAKS / KAKS Parsel Hesabı: Taban alanı ve katlar alanı katsayısının IFC modelden hesabı',
          'Yangın Kaçış Koridoru: Yangın kapısı mesafeleri ve kaçış genişliği kural kontrolü',
          'İnsan Onay Şartı: e-Ruhsat kural motoru çıktıları yetkili mimar/mühendis onayı gerektirir'
        ] 
      },
      { 
        title: 'VDC & Clash Matrisi (Hard, Soft & 4D Clash)', 
        body: 'Disiplinler arası çakışmaların BCF issue formatında yönetilmesi ve saha rework maliyetlerinin sıfırlanması.', 
        points: [
          'Hard Clash (Fiziksel): Betonarme kiriş ile havalandırma kanalının çakışması',
          'Soft Clash (Tolerans): Vana ve ekipman etrafında bakım ve çalışma boşluğu ihlali',
          '4D Lojistik Clash: Şantiye kule vinci ile geçici iskele imalatlarının zamansal çakışması'
        ] 
      },
      { 
        title: 'Üretilebilirlik & Donatı LOD 400 (BVBS Kodları)', 
        body: 'Statik betonarme donatılarının sahada bükülüp bağlanabilirliğini ve demir büküm otomasyonunu yönetir.', 
        points: [
          'BVBS Demir Kesim Kodları: CNC demir büküm makinelerine doğrudan veri aktarımı',
          '12 Metre Çelik Sınırı: Nakliye ve ticari boy sınırları nedeniyle donatı ek yerlerinin planlanması',
          'BIM Kariyer Matrisi: Modeler → Coordinator → Information Manager gelişim adımları'
        ] 
      },
    ],
    outputs: ['RBAC görev matrisi', 'Clash sınıflandırma ve BCF issue şablonu', 'ARC/e-Ruhsat veri sınırı notu', 'Rol bazlı kariyer gelişim haritası'],
    standards: ['ISO 19650-5 güvenlik yaklaşımı', 'BCF issue yönetimi', 'SAF / analitik model veri aktarımı', 'VDC ve üretilebilirlik prensipleri'],
    next: 'Bir bulguyu SmartCheck’te kanıtı, sorumlusu ve çözüm adımıyla takip edin; saha kabulünü ayrıca belgeleyin.',
  },
};

import { subGuidesData } from '@/academy/subGuidesData';
import { SubGuideDrawer } from '@/components/academy/SubGuideDrawer';

const moduleKeyMap: Record<string, string[]> = {
  'iso-19650': ['iso-19650-eir-template', 'iso-19650-pim-aim-cobie', 'iso-19650-rbac-security', 'iso-19650-loin-matrix'],
  '4d-5d': ['4d-5d-guid-primavera', '4d-5d-evm-calculator', '4d-5d-lump-sum-risk', '4d-5d-minha-rules'],
  'sustainability-6d': ['sustainability-6d-iso-52000', 'sustainability-6d-lca-phases', 'sustainability-6d-embodied-carbon', 'sustainability-6d-green-building-leed'],
  'scan-to-bim': ['scan-to-bim-loa-standards', 'scan-to-bim-heatmap-analysis', 'scan-to-bim-generative-design', 'scan-to-bim-human-in-the-loop'],
  'security-field': ['security-field-cde-rbac', 'security-field-e-ruhsat-arc', 'security-field-vdc-clash', 'security-field-bvbs-rebar'],
  'bim-core': ['bim-core-aec-ontology', 'bim-core-loin-guide', 'bim-core-ifc-bcf-flow', 'bim-core-bep-raci-matrix', 'iso-19650-pim-aim-cobie'],
};

export function PublicAcademyDetail() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialGuideKey = searchParams.get('guide');
  const [activeGuideKey, setActiveGuideKey] = useState<string | null>(initialGuideKey);

  const detail = slug ? details[slug] : undefined;

  const handleOpenGuide = (guideKey: string) => {
    setActiveGuideKey(guideKey);
    setSearchParams({ guide: guideKey });
  };

  const handleCloseGuide = () => {
    setActiveGuideKey(null);
    setSearchParams({});
  };

  if (!detail) {
    return <div className="min-h-screen bg-[#09090b] px-6 py-24 text-foreground"><div className="mx-auto max-w-3xl"><p className="text-orange-400">Academy</p><h1 className="mt-4 text-4xl font-semibold">İçerik bulunamadı.</h1><Link to="/academy" className="mt-8 inline-flex text-orange-300">Academy’ye dön <ArrowRight size={17} className="ml-2" /></Link></div></div>;
  }

  const activeGuideObj = activeGuideKey ? subGuidesData[activeGuideKey] || null : null;

  return <div className="min-h-screen bg-[#09090b] font-sans text-foreground selection:bg-orange-500/30 selection:text-orange-200">
    <header className="border-b border-border px-6 md:px-8"><nav className="mx-auto flex h-20 max-w-7xl items-center justify-between"><Link to="/academy" className="flex items-center gap-3 font-semibold text-foreground"><span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold">BP</span>BIMPlan Academy</Link><Link to="/pilot" className="inline-flex h-10 items-center rounded-md bg-orange-600 px-4 text-sm font-medium text-white hover:bg-orange-700">Pilot başvurusu</Link></nav></header>
    <main>
      <section className="border-b border-border px-6 pb-20 pt-16 md:px-8 md:pb-24 md:pt-24"><div className="mx-auto max-w-7xl"><Link to="/academy" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} className="mr-2" />Tüm Academy içerikleri</Link><div className="mt-12 grid gap-12 md:grid-cols-[1fr_0.7fr] md:items-end"><div><p className="mb-5 text-sm font-medium text-orange-400">{detail.label}</p><h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-foreground md:text-6xl md:text-balance">{detail.title}</h1><p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">{detail.intro}</p></div><div className="border border-orange-500/25 bg-orange-500/[0.06] p-6"><div className="flex gap-3 text-orange-300"><FlaskConical size={19} /><span className="text-sm font-medium">Kaynak yaklaşımı</span></div><p className="mt-4 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{detail.why}</p></div></div></div></section>
      <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="mb-4 text-sm font-medium text-orange-400">AYRINTILI MÜFREDAT &amp; İNTERAKTİF MÜHENDİSLİK REHBERLERİ</p>
              <h2 className="text-3xl font-semibold text-foreground md:text-4xl">Modüller ve uygulama konuları</h2>
              <p className="mt-2 text-sm text-muted-foreground">Tıklanabilir alt maddeler ile formüller, standart tabloları ve saha rehberlerine ulaşabilirsiniz.</p>
            </div>
            <BookOpen className="hidden text-muted-foreground sm:block" size={28} />
          </div>
          <div className="mt-12 space-y-4">
            {detail.modules.map((module, index) => {
              const guideKeys = slug && moduleKeyMap[slug] ? moduleKeyMap[slug] : [];
              const guideKey = guideKeys[index] || null;

              return (
                <article key={module.title} className="grid gap-6 border border-border bg-[#09090b] p-6 md:grid-cols-[70px_0.8fr_1.1fr] md:p-8 hover:border-border transition-colors">
                  <span className="font-mono text-sm text-orange-400">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{module.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{module.body}</p>
                    {guideKey && (
                      <div className="mt-5">
                        <button
                          onClick={() => handleOpenGuide(guideKey)}
                          className="inline-flex items-center gap-2 rounded-md bg-orange-500/10 border border-orange-500/30 px-3.5 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/20 hover:text-white transition-all shadow-sm"
                        >
                          <BookOpen size={14} />
                          <span>Formüller &amp; Detaylı Mühendislik Rehberini İncele</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-3 border-t border-border pt-4 text-sm text-muted-foreground md:border-l md:border-t-0 md:pl-6 md:pt-0">
                    {module.points.map((point) => (
                      <li key={point}>
                        <button
                          onClick={() => guideKey && handleOpenGuide(guideKey)}
                          className="flex items-start gap-3 text-left w-full group rounded-lg p-1.5 hover:bg-surface-elevated transition-colors"
                        >
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400 group-hover:text-orange-400 transition-colors" />
                          <span className="group-hover:text-foreground transition-colors">{point}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Sub-Guide Drawer */}
      <SubGuideDrawer guide={activeGuideObj} onClose={handleCloseGuide} />

      {slug === 'sustainability-6d' && <SixDNativeLab />}
      {slug === 'iso-19650' && <IsoNativeLab />}
      {slug === '4d-5d' && <CostNativeLab />}
      {slug === 'scan-to-bim' && <ScanNativeLab />}
      {slug === 'security-field' && <SecurityNativeLab />}
      {slug === 'security-field' && <CareerMatrixNative />}
      {slug === 'bim-core' && <BimCoreNativeAcademy />}
      <section className="border-b border-border px-6 py-20 md:px-8 md:py-24"><div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2"><div><div className="flex items-center gap-3 text-orange-300"><FileText size={19} /><h2 className="text-2xl font-semibold text-foreground">Bu hattın çıktıları</h2></div><ul className="mt-7 space-y-4 text-sm leading-relaxed text-muted-foreground">{detail.outputs.map(item => <li key={item} className="flex gap-3"><span className="text-orange-400">—</span>{item}</li>)}</ul></div><div><div className="flex items-center gap-3 text-sky-300"><ShieldAlert size={19} /><h2 className="text-2xl font-semibold text-foreground">Kaynak ve sınırlar</h2></div><ul className="mt-7 space-y-4 text-sm leading-relaxed text-muted-foreground">{detail.standards.map(item => <li key={item} className="flex gap-3"><span className="text-sky-400">•</span>{item}</li>)}</ul><p className="mt-7 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">Bu sayfa eğitim ve enablement amacı taşır. Teknik, hukuki, vergi veya mühendislik kararı için güncel kaynak, proje bağlamı ve yetkili uzman incelemesi gerekir.</p></div></div></section>
      <section className="bg-orange-500/[0.06] px-6 py-16 md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between"><div className="max-w-3xl"><p className="mb-3 text-sm font-medium text-orange-400">İŞ AKIŞINA BAĞLA</p><h2 className="text-2xl font-semibold text-foreground">{detail.next}</h2></div><Link to="/pilot" className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-orange-600 px-6 text-sm font-medium text-white hover:bg-orange-700">Pilot başvurusu <ArrowRight size={17} className="ml-2" /></Link></div></section>
    </main>
  </div>;
}

function SixDNativeLab() {
  const [searchParams] = useSearchParams();
  const requestedModule = Number(searchParams.get('value'));
  const requestedStage = searchParams.get('value') as keyof typeof dataLCAStages;
  const [activeIndex, setActiveIndex] = useState(Number.isInteger(requestedModule) && requestedModule >= 0 && requestedModule < data6D.length ? requestedModule : 0);
  const [lcaStage, setLcaStage] = useState<keyof typeof dataLCAStages>(requestedStage in dataLCAStages ? requestedStage : 'A');
  const active = data6D[activeIndex];
  const stage = dataLCAStages[lcaStage];

  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div className="flex items-center justify-between gap-6"><div><p className="mb-4 text-sm font-medium text-emerald-400">NATIVE REACT LABORATUVARI · KAYNAK VERİSİYLE</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">6D verisini çalıştırın</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Bu panel kaynak HTML’deki `data6D` ve `dataLCAStages` modellerinden beslenir. Grafik değerleri ve standart listeleri özetlenmemiştir.</p></div><FlaskConical className="hidden text-emerald-400 sm:block" size={28} /></div><div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div className="space-y-3">{data6D.map((item, index) => <button key={item.title} type="button" onClick={() => setActiveIndex(index)} className={`w-full border p-4 text-left transition-colors ${index === activeIndex ? 'border-emerald-500/60 bg-emerald-500/[0.08]' : 'border-border bg-[#09090b] hover:border-border'}`}><div className="flex items-start justify-between gap-3"><span className="text-lg">{item.icon}</span><span className="text-[11px] text-muted-foreground">{item.subtitle}</span></div><p className="mt-4 font-medium text-foreground">{item.title}</p></button>)}</div><div className="border border-border bg-[#09090b] p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-emerald-400">{active.subtitle}</p><h3 className="mt-2 text-2xl font-semibold text-foreground">{active.title}</h3></div><span className="text-3xl">{active.icon}</span></div><p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{active.desc}</p><div className="mt-7 grid gap-6 md:grid-cols-2"><div><p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Parametreler</p><ul className="space-y-2 text-sm text-foreground dark:text-muted-foreground">{active.params.map(item => <li key={item}>• {item}</li>)}</ul></div><div><p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Standartlar / metodolojiler</p><ul className="space-y-2 text-sm text-foreground dark:text-muted-foreground">{active.standards.map(item => <li key={item}>• {item}</li>)}</ul></div></div><div className="mt-8 border-t border-border pt-6"><div className="flex items-center justify-between gap-4"><p className="text-sm font-medium text-foreground">{active.chartTitle}</p><span className="text-xs text-muted-foreground">Kaynak grafik datası</span></div><div className="mt-5 space-y-3">{active.chartData.map((value, index) => <div key={active.chartLabels[index]}><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{active.chartLabels[index]}</span><span>{value}</span></div><div className="h-2 bg-surface-elevated"><div className="h-2 bg-emerald-500" style={{ width: `${Math.min(100, (value / Math.max(...active.chartData)) * 100)}%` }} /></div></div>)}</div></div></div></div><div className="mt-8 border border-border bg-[#09090b] p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-sm font-medium text-emerald-400">LCA yaşam döngüsü simülatörü</p><h3 className="mt-2 text-xl font-semibold text-foreground">A–D sistem sınırlarını seçin</h3></div><div className="flex flex-wrap gap-2">{(Object.keys(dataLCAStages) as Array<keyof typeof dataLCAStages>).map(key => <button key={key} type="button" onClick={() => setLcaStage(key)} className={`h-9 min-w-10 border px-3 text-sm font-medium ${key === lcaStage ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated'}`}>{key}</button>)}</div></div><div className="mt-7 grid gap-6 md:grid-cols-[1fr_0.8fr]"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{stage.type}</p><h4 className="mt-2 text-xl font-semibold text-foreground">{stage.title}</h4><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stage.desc}</p></div><div className="border border-border p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">BIM kuralı</p><p className="mt-3 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{stage.bimRule}</p><div className="mt-5 h-3 bg-surface-elevated"><div className="h-3 bg-emerald-500" style={{ width: `${stage.percentage === '+Kazanç' ? 100 : stage.percentage}%` }} /></div><p className="mt-2 text-right text-xs text-emerald-400">{stage.percentage}</p></div></div></div></div></section>;
}

const isoProcess = [
  ['Değerlendirme ve İhtiyaç Analizi', 'Assessment and Need', 'OIR, PIR, AIR ve EIR ile kurumun ve projenin hangi bilgiye ihtiyaç duyduğu tanımlanır.'],
  ['İhale Daveti', 'Invitation to Tender', 'İşverenin bilgi gereksinimleri, teslim formatı ve bilgi yönetimi beklentileri ihale dokümanına girer.'],
  ['İhale Yanıtı', 'Tender Response', 'Teklif veren taraf, bilgi üretim yaklaşımını, kapasitesini ve önerilen BEP çerçevesini ortaya koyar.'],
  ['Sözleşme ve Atama', 'Appointment', 'Bilgi sorumlulukları, teslim koşulları ve tarafların sözleşmesel rolü netleştirilir.'],
  ['Seferberlik ve Kurulum', 'Mobilization', 'CDE, BEP, TIDP/MIDP, yazılım ve görev akışları proje başlangıcında kurulur.'],
  ['Ortak Bilgi Üretimi', 'Collaborative Production', 'Disiplinler WIP ve Shared alanlarında bilgiyi üretir, koordine eder ve kontrol eder.'],
  ['Bilgi Modeli Teslimi', 'Information Model Delivery', 'Onaylanmış bilgi konteynerleri Published statüsüne geçer ve teslim kanıtı oluşturur.'],
  ['Proje Kapanış ve AIM’e Geçiş', 'Project Close-out', 'Teslim bilgisi işletme safhası için AIM ve gerekli tesis yönetimi verisine dönüştürülür.'],
] as const;

function IsoNativeLab() {
  const [searchParams] = useSearchParams();
  const requestedValue = searchParams.get('value');
  const requestedPart = Number(requestedValue);
  const [part, setPart] = useState(Number.isInteger(requestedPart) && requestedPart >= 1 && requestedPart <= 5 ? requestedPart as keyof typeof dataIsoParts : 1);
  const [pyramid, setPyramid] = useState<keyof typeof dataPyramid>(requestedValue && requestedValue in dataPyramid ? requestedValue as keyof typeof dataPyramid : 'oir');
  const [cde, setCde] = useState<keyof typeof dataCdeStates>(requestedValue && requestedValue in dataCdeStates ? requestedValue as keyof typeof dataCdeStates : 'wip');
  const iso = dataIsoParts[part];
  const pyramidDetail = dataPyramid[pyramid];
  const cdeDetail = dataCdeStates[cde];

  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div><p className="mb-4 text-sm font-medium text-orange-400">NATIVE REACT LABORATUVARI · ISO 19650 KAYNAK VERİSİ</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">Bilgi yönetimini adım adım çalıştırın</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Bölüm açıklamaları, piramit örnekleri ve CDE durumları kaynak HTML’deki veri modellerinden doğrudan okunur.</p></div><div className="mt-10 border border-border bg-[#09090b] p-6 md:p-8"><div className="flex flex-wrap gap-2">{([1, 2, 3, 4, 5] as const).map(number => <button key={number} type="button" onClick={() => setPart(number)} className={`border px-4 py-3 text-left text-sm ${part === number ? 'border-orange-500 bg-orange-600 text-white' : 'border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated'}`}><span className="block font-medium">Bölüm {number}</span><span className="mt-1 block text-[11px] opacity-75">{dataIsoParts[number].focus}</span></button>)}</div><div className="mt-6 grid gap-6 md:grid-cols-[70px_1fr]"><div className="flex h-12 w-12 items-center justify-center bg-orange-500 font-bold text-foreground">P{part}</div><div><h3 className="text-xl font-semibold text-foreground">{iso.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{iso.desc}</p><ul className="mt-5 grid gap-2 text-sm text-foreground dark:text-muted-foreground md:grid-cols-3">{iso.points.map(point => <li key={point} className="border-t border-border pt-3">• {point}</li>)}</ul><div className="mt-6 border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-orange-400">Sözleşme / sorumluluk bağlamı</p><p className="mt-2 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{iso.legal}</p></div></div></div></div><div className="mt-8 grid gap-8 lg:grid-cols-2"><div className="border border-border bg-[#09090b] p-6 md:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-orange-400">Bilgi gereksinimleri piramidi</p><h3 className="mt-2 text-xl font-semibold text-foreground">OIR → PIR → AIR → EIR</h3></div><span className="text-xs text-muted-foreground">Kaynak veri modeli</span></div><div className="mt-6 space-y-2">{(['oir', 'pir', 'air', 'eir'] as const).map((key, index) => <button key={key} type="button" onClick={() => setPyramid(key)} className={`block w-full border px-4 py-3 text-left transition-colors ${pyramid === key ? 'border-orange-500 bg-orange-500/[0.12]' : 'border-border hover:border-border'}`} style={{ width: `${92 - index * 8}%`, marginInline: 'auto' }}><span className="font-mono text-orange-400">{key.toUpperCase()}</span><span className="ml-3 text-sm text-foreground dark:text-muted-foreground">{pyramidDetail.title && key === pyramid ? pyramidDetail.title : key === 'oir' ? 'Organizasyonel Bilgi Gereksinimleri' : key === 'pir' ? 'Proje Bilgi Gereksinimleri' : key === 'air' ? 'Varlık Bilgi Gereksinimleri' : 'Bilgi Değişimi Gereksinimleri'}</span></button>)}</div><div className="mt-6 border border-orange-500/25 bg-orange-500/[0.06] p-4"><h4 className="text-sm font-medium text-orange-300">{pyramidDetail.title}</h4><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pyramidDetail.desc}</p><p className="mt-3 border-t border-orange-500/20 pt-3 text-xs leading-relaxed text-foreground dark:text-muted-foreground">{pyramidDetail.example}</p></div></div><div className="border border-border bg-[#09090b] p-6 md:p-8"><div><p className="text-sm font-medium text-orange-400">CDE durum simülatörü</p><h3 className="mt-2 text-xl font-semibold text-foreground">Bilgi konteyneri yaşam döngüsü</h3></div><div className="mt-6 grid grid-cols-2 gap-2">{(['wip', 'shared', 'published', 'archived'] as const).map(key => <button key={key} type="button" onClick={() => setCde(key)} className={`border px-3 py-3 text-xs font-medium ${cde === key ? 'border-orange-500 bg-orange-600 text-white' : 'border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated'}`}>{key.toUpperCase()}</button>)}</div><div className="mt-5 space-y-4 border border-border bg-card p-5 font-mono text-xs"><div><span className="text-muted-foreground">Dosya:</span><span className="ml-2 text-emerald-400">{cdeDetail.filename}</span></div><div><span className="text-muted-foreground">Uygunluk:</span><span className="ml-2 text-amber-300">{cdeDetail.suitability}</span></div><div><span className="text-muted-foreground">Revizyon:</span><span className="ml-2 text-amber-300">{cdeDetail.revision}</span></div><div><span className="text-muted-foreground">Erişim:</span><span className="ml-2 text-sky-300">{cdeDetail.access}</span></div></div><p className="mt-5 text-sm leading-relaxed text-muted-foreground">{cdeDetail.rule}</p></div></div><div className="mt-8 border border-border bg-[#09090b] p-6 md:p-8"><p className="text-sm font-medium text-orange-400">ISO 19650-2 · 8 adımlı bilgi yönetim süreci</p><div className="mt-6 grid gap-3 md:grid-cols-2">{isoProcess.map((step, index) => <article key={step[0]} className="border border-border p-5"><div className="flex gap-4"><span className="font-mono text-orange-400">{String(index + 1).padStart(2, '0')}</span><div><h4 className="font-medium text-foreground">{step[0]}</h4><p className="mt-1 text-xs text-muted-foreground">{step[1]}</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step[2]}</p></div></div></article>)}</div></div></div></section>;
}

function CostNativeLab() {
  const [searchParams] = useSearchParams();
  const requestedValue = searchParams.get('value');
  const [area, setArea] = useState(10000);
  const [unitCost, setUnitCost] = useState(25000);
  const [duration, setDuration] = useState(18);
  const [contractType, setContractType] = useState<'lump_sum' | 'remeasurement'>('lump_sum');
  const [carbon, setCarbon] = useState<'traditional' | 'green'>('traditional');
  const [lod, setLod] = useState<200 | 300 | 400>(300);
  const [clashTested, setClashTested] = useState(true);
  const [rebar, setRebar] = useState<8 | 12 | 18 | 25 | 32>(18);
  const [rebarStandard, setRebarStandard] = useState<'market' | 'ts708'>('ts708');
  const [csg, setCsg] = useState<'cad' | 'bim'>(requestedValue === 'bim' ? 'bim' : 'cad');
  const [minha, setMinha] = useState<'tr' | 'de'>(requestedValue === 'de' ? 'de' : 'tr');
  const [phase, setPhase] = useState<keyof typeof data4D>(requestedValue && requestedValue in data4D ? requestedValue as keyof typeof data4D : 'foundation');

  const baseCost = area * unitCost;
  const escalationRisk = baseCost * duration * 0.015;
  const carbonRisk = carbon === 'traditional' ? baseCost * 0.04 : 0;
  const lodRate = contractType === 'lump_sum' ? ({ 200: 0.2, 300: 0.08, 400: 0.02 } as const)[lod] : ({ 200: 0.06, 300: 0.02, 400: 0 } as const)[lod];
  const lodRisk = baseCost * lodRate;
  const clashRisk = clashTested ? 0 : baseCost * 0.06;
  const bimSavings = lod >= 300 && rebarStandard === 'ts708' ? baseCost * 0.03 : 0;
  const totalBid = baseCost + escalationRisk + carbonRisk + lodRisk + clashRisk - bimSavings;
  const format = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
  const phaseData = data4D[phase];
  const rebarMass = rebarData[rebar];

  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><div><p className="mb-4 text-sm font-medium text-amber-400">NATIVE REACT LABORATUVARI · 5D MALİYET MÜHENDİSLİĞİ</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">Metrajdan riske, riske tekliften</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Bu panel kaynak HTML’deki CSG, TS 708, Minha, 4D/5D EVM ve teklif motoru girdilerini tek bir native React çalışma alanında birleştirir. Hesap, kaynak katsayıları görünür tutularak yapılır.</p></div><div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]"><div className="space-y-6"><div className="border border-border bg-[#09090b] p-6"><div className="flex items-center justify-between"><h3 className="font-semibold text-foreground">Proje ve BIM verileri</h3><span className="text-xs text-muted-foreground">Kaynak formu</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-muted-foreground">Alan (m²)<input type="number" min="0" value={area} onChange={e => setArea(Number(e.target.value))} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground" /></label><label className="text-sm text-muted-foreground">Birim maliyet<input type="number" min="0" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground" /></label><label className="text-sm text-muted-foreground">Süre (ay)<input type="number" min="0" value={duration} onChange={e => setDuration(Number(e.target.value))} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground" /></label><label className="text-sm text-muted-foreground">Sözleşme tipi<select value={contractType} onChange={e => setContractType(e.target.value as typeof contractType)} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground"><option value="lump_sum">Götürü bedel</option><option value="remeasurement">Teklif birim fiyat</option></select></label><label className="text-sm text-muted-foreground">Karbon tedariki<select value={carbon} onChange={e => setCarbon(e.target.value as typeof carbon)} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground"><option value="traditional">Geleneksel</option><option value="green">Yeşil</option></select></label><label className="text-sm text-muted-foreground">LOD<select value={lod} onChange={e => setLod(Number(e.target.value) as typeof lod)} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground"><option value="200">LOD 200</option><option value="300">LOD 300</option><option value="400">LOD 400</option></select></label></div><label className="mt-4 flex items-center gap-3 border-t border-border pt-4 text-sm text-foreground dark:text-muted-foreground"><input type="checkbox" checked={clashTested} onChange={e => setClashTested(e.target.checked)} className="h-4 w-4 accent-orange-500" /> Clash testi yapıldı</label></div><div className="border border-border bg-[#09090b] p-6"><div className="flex items-center justify-between"><h3 className="font-semibold text-foreground">CSG ve donatı doğrulama</h3><span className="text-xs text-muted-foreground">TS 708</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setCsg('cad')} className={`border p-4 text-left text-sm ${csg === 'cad' ? 'border-red-500 bg-red-500/[0.08] text-white' : 'border-border text-muted-foreground'}`}>Geleneksel hacim<p className="mt-1 text-xs text-muted-foreground">Öncelik yok · mükerrer metraj riski</p></button><button type="button" onClick={() => setCsg('bim')} className={`border p-4 text-left text-sm ${csg === 'bim' ? 'border-emerald-500 bg-emerald-500/[0.08] text-white' : 'border-border text-muted-foreground'}`}>BIM / CSG<p className="mt-1 text-xs text-muted-foreground">Boolean çıkarma · hiyerarşik öncelik</p></button></div><label className="mt-5 block text-sm text-muted-foreground">Donatı kesiti<select value={rebar} onChange={e => setRebar(Number(e.target.value) as typeof rebar)} className="mt-2 h-10 w-full border border-border bg-card px-3 text-foreground">{Object.entries(rebarData).map(([diameter, mass]) => <option key={diameter} value={diameter}>Φ{diameter} · {mass} kg/m</option>)}</select></label><p className="mt-4 text-xs leading-relaxed text-muted-foreground">TS 708 nominal kütle: Φ{rebar} = <span className="font-mono text-amber-300">{rebarMass} kg/m</span>. Kaynakta ayrıca çaplara göre ±%4–±%6 hadde toleransı ve TS 500 kenetlenme boyu l₀ formülü vurgulanır.</p><div className={`mt-4 border p-3 text-sm ${csg === 'bim' ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300' : 'border-red-500/30 bg-red-500/[0.06] text-red-300'}`}>{csg === 'bim' ? 'CSG çıkarma uygulanıyor: kesişen hacim net metrajdan düşülür.' : 'Mükerrer metraj riski: duvar ve kolon kesişimi iki kez hesaplanabilir.'}</div></div></div><div className="border border-border bg-[#09090b] p-6 md:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm text-amber-400">Akademik 5D teklif hesabı</p><h3 className="mt-2 text-3xl font-semibold text-foreground">{format(totalBid)}</h3></div><span className="border border-amber-500/30 px-3 py-2 text-xs text-amber-300">P90 senaryosu</span></div><div className="mt-8 space-y-2 text-sm"><CostLine label="Baz maliyet" value={format(baseCost)} /><CostLine label="Eskalasyon · aylık %1.5 × süre" value={`+ ${format(escalationRisk)}`} tone="orange" /><CostLine label="Karbon primi · geleneksel ise %4" value={`+ ${format(carbonRisk)}`} tone="purple" /><CostLine label={`LOD ${lod} · ${contractType === 'lump_sum' ? 'götürü' : 'birim fiyat'} risk oranı ${(lodRate * 100).toFixed(0)}%`} value={`+ ${format(lodRisk)}`} tone="red" /><CostLine label="Clash / rework riski · test yoksa %6" value={`+ ${format(clashRisk)}`} tone="red" /><CostLine label="CSG + TS 708 doğruluk indirimi" value={`- ${format(bimSavings)}`} tone="green" /></div><div className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">Bu hesap kaynak HTML’deki senaryo katsayılarını kullanır. Gerçek enflasyon, CBAM yükümlülüğü, mühendislik riski veya P90 istatistiksel güven aralığı olarak yorumlanmamalıdır; proje verisiyle kalibre edilmesi gerekir.</div></div></div><div className="mt-8 grid gap-8 lg:grid-cols-2"><div className="border border-border bg-[#09090b] p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-blue-400">4D lojistik simülatörü</p><h3 className="mt-2 text-xl font-semibold text-foreground">Model elemanını faza bağla</h3></div><span className="text-xs text-muted-foreground">GUID / EVM</span></div><div className="mt-5 flex flex-wrap gap-2">{Object.keys(data4D).map(key => <button key={key} type="button" onClick={() => setPhase(key as keyof typeof data4D)} className={`border px-3 py-2 text-xs ${phase === key ? 'border-blue-500 bg-blue-600 text-white' : 'border-border text-foreground dark:text-muted-foreground'}`}>{data4D[key as keyof typeof data4D].title}</button>)}</div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><Metric label="PV" value={`₺${phaseData.pv}K`} /><Metric label="EV" value={`₺${phaseData.ev}K`} /><Metric label="AC" value={`₺${phaseData.ac}K`} /></div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{phaseData.month}. Kaynak simülatörü bu fazda modelin Published durumu, nakit akışı ve hakediş bağlamını günceller.</p></div><div className="border border-border bg-[#09090b] p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-emerald-400">Minha laboratuvarı</p><h3 className="mt-2 text-xl font-semibold text-foreground">Türkiye ve Almanya farkı</h3></div><span className="text-xs text-muted-foreground">ÇŞB / DIN 18350</span></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => setMinha('tr')} className={`border px-4 py-2 text-xs ${minha === 'tr' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-border text-foreground dark:text-muted-foreground'}`}>Türkiye · ÇŞB</button><button type="button" onClick={() => setMinha('de')} className={`border px-4 py-2 text-xs ${minha === 'de' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-border text-foreground dark:text-muted-foreground'}`}>Almanya · DIN</button></div><p className="mt-5 text-sm leading-relaxed text-muted-foreground">{minha === 'tr' ? 'Türkiye’de kaynak metne göre boşluk alanı ne olursa olsun metrajdan düşülür; işçilik gerektiren iç yan yüzeyler eklenir. 3 m² altı düşülmez kuralı kamu projeleri için geçerli kabul edilmez.' : 'DIN 18350 senaryosunda 2.50 m²’den küçük boşluklar metrajda yok sayılır; duvar dolu kabul edilir ve işçilik kaybı bu varsayımla dengelenir.'}</p></div></div></div></section>;
}

function CostLine({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'orange' | 'purple' | 'red' | 'green' }) {
  const tones = { default: 'border-border text-foreground dark:text-muted-foreground', orange: 'border-orange-500/20 text-orange-300', purple: 'border-purple-500/20 text-purple-300', red: 'border-red-500/20 text-red-300', green: 'border-emerald-500/20 text-emerald-300' };
  return <div className={`flex items-center justify-between gap-4 border bg-card px-4 py-3 ${tones[tone]}`}><span>{label}</span><span className="shrink-0 font-mono text-xs">{value}</span></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border border-border bg-card p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm text-foreground">{value}</p></div>;
}

function ScanNativeLab() {
  const [loa, setLoa] = useState<keyof typeof loaData>('10');
  const active = loaData[loa];
  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-purple-400">NATIVE REACT LABORATUVARI · SCAN-TO-BIM</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">Nokta bulutundan amaca uygun modele</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">LOA seviyesi, “en ayrıntılı model” yarışması değil; modelin hangi kararı destekleyeceğine göre seçilen doğruluk ve tolerans sözleşmesidir.</p><div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div className="space-y-3">{(Object.keys(loaData) as Array<keyof typeof loaData>).map(level => <button key={level} type="button" onClick={() => setLoa(level)} className={`w-full border p-5 text-left ${loa === level ? 'border-purple-500 bg-purple-500/[0.08]' : 'border-border bg-[#09090b] hover:border-border'}`}><span className="font-mono text-purple-300">LOA {level}</span><p className="mt-2 font-medium text-foreground">{loaData[level].title.replace(`LOA ${String(level)}: `, '')}</p><p className="mt-2 text-xs text-muted-foreground">Tolerans: {loaData[level].tolerance}</p></button>)}</div><div className="border border-border bg-[#09090b] p-6 md:p-8"><div className="flex items-start justify-between gap-6"><div><p className="text-sm text-purple-400">{active.tolerance} senaryosu</p><h3 className="mt-2 text-2xl font-semibold text-foreground">{active.title}</h3></div><div className="flex h-24 w-32 items-center justify-center border border-purple-500/30 bg-purple-500/[0.06] text-3xl text-purple-300">▱</div></div><p className="mt-6 text-sm leading-relaxed text-muted-foreground">{active.desc}</p><div className="mt-6 border border-border p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Kullanım amacı</p><p className="mt-2 text-sm text-foreground dark:text-muted-foreground">{active.use}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Model girdisi</p><p className="mt-2 text-sm text-foreground">Point cloud</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Doğruluk</p><p className="mt-2 text-sm text-foreground">{active.tolerance}</p></div><div className="border border-border p-4"><p className="text-xs text-muted-foreground">Karar</p><p className="mt-2 text-sm text-foreground">İnsan onayı</p></div></div></div></div><div className="mt-8 border border-purple-500/20 bg-purple-500/[0.05] p-6"><h3 className="text-xl font-semibold text-foreground">Üretken tasarım ve AI sınırı</h3><p className="mt-3 max-w-4xl text-sm leading-relaxed text-foreground dark:text-muted-foreground">Kaynak yaklaşımındaki generative design mantığı; enerji performansı (6D) ve maliyet (5D) gibi zıt hedefleri çoklu varyasyonlarla tarayabilir. Bu, girdilerin doğruluğunu veya tasarım sorumluluğunu AI’a devretmez. Üretim çıktısı öneridir; mühendislik kararı, kaynak ve insan onayı gerektirir.</p><div className="mt-5 flex flex-wrap gap-2 text-xs text-purple-200"><span className="border border-purple-400/30 px-3 py-2">NSGA-II optimizasyonu</span><span className="border border-purple-400/30 px-3 py-2">5D maliyet</span><span className="border border-purple-400/30 px-3 py-2">6D performans</span><span className="border border-purple-400/30 px-3 py-2">Kanıt kaydı</span></div></div></div></section>;
}

function SecurityNativeLab() {
  const [role, setRole] = useState<keyof typeof rbacData>('architect');
  const [clash, setClash] = useState<keyof typeof clashData>('hard');
  const [rule, setRule] = useState<keyof typeof arcRuleData>('fire');
  const rows = rbacData[role];
  const clashDetail = clashData[clash];
  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-red-400">NATIVE REACT LABORATUVARI · GÜVENLİK / e-RUHSAT / VDC</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">Model doğruluğu kadar erişim ve saha kararı da önemlidir</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">RBAC, ARC ve clash modelleri kaynak verileriyle native olarak çalışır; sonuçlar otomatik mühendislik veya ruhsat onayı değildir.</p><div className="mt-10 grid gap-8 lg:grid-cols-2"><div className="border border-border bg-[#09090b] p-6 md:p-8"><p className="text-sm text-red-400">ISO 19650-5 · RBAC matrisi</p><h3 className="mt-2 text-xl font-semibold text-foreground">Rol tabanlı erişim kontrolü</h3><div className="mt-5 flex flex-wrap gap-2">{(['architect', 'mep', 'client'] as const).map(key => <button key={key} type="button" onClick={() => setRole(key)} className={`border px-3 py-2 text-xs ${role === key ? 'border-red-500 bg-red-600 text-white' : 'border-border text-foreground dark:text-muted-foreground'}`}>{key === 'architect' ? 'Mimar' : key === 'mep' ? 'MEP mühendisi' : 'İşveren'}</button>)}</div><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-border text-muted-foreground"><tr><th className="pb-3 pr-3">CDE klasörü</th><th className="pb-3 px-2">Read</th><th className="pb-3 px-2">Write</th><th className="pb-3 pl-2">Approve</th></tr></thead><tbody>{rows.map(row => <tr key={row.folder} className="border-b border-border"><td className="py-3 pr-3 text-foreground dark:text-muted-foreground">{row.folder}</td><td className="px-2 text-muted-foreground">{row.r}</td><td className="px-2 text-muted-foreground">{row.w}</td><td className="pl-2 text-muted-foreground">{row.a}</td></tr>)}</tbody></table></div></div><div className="border border-border bg-[#09090b] p-6 md:p-8"><p className="text-sm text-orange-400">VDC · Clash matrisi</p><h3 className="mt-2 text-xl font-semibold text-foreground">Çakışmayı sınıflandır, issue’a dönüştür</h3><div className="mt-5 grid gap-2 sm:grid-cols-3">{(['hard', 'soft', 'time'] as const).map(key => <button key={key} type="button" onClick={() => setClash(key)} className={`border p-3 text-left text-xs ${clash === key ? 'border-orange-500 bg-orange-500/[0.1]' : 'border-border'}`}><span className="font-medium text-foreground">{key === 'hard' ? 'Hard Clash' : key === 'soft' ? 'Soft Clash' : '4D Clash'}</span><span className="mt-1 block text-muted-foreground">{key === 'hard' ? 'Fiziksel' : key === 'soft' ? 'Tolerans' : 'Zaman / lojistik'}</span></button>)}</div><div className="mt-5 border border-orange-500/20 bg-orange-500/[0.06] p-5"><h4 className="font-medium text-orange-300">{clashDetail.title}</h4><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{clashDetail.desc}</p><p className="mt-4 border-t border-orange-500/20 pt-4 text-xs leading-relaxed text-foreground dark:text-muted-foreground">Çözüm protokolü: {clashDetail.solution}</p></div></div></div><div className="mt-8 grid gap-8 lg:grid-cols-2"><div className="border border-border bg-[#09090b] p-6 md:p-8"><p className="text-sm text-teal-400">ARC / GeoBIM</p><h3 className="mt-2 text-xl font-semibold text-foreground">e-Ruhsat kural kontrolü</h3><div className="mt-5 flex gap-2"><button type="button" onClick={() => setRule('fire')} className={`border px-3 py-2 text-xs ${rule === 'fire' ? 'border-teal-500 bg-teal-600 text-white' : 'border-border text-foreground dark:text-muted-foreground'}`}>Yangın kapısı</button><button type="button" onClick={() => setRule('zone')} className={`border px-3 py-2 text-xs ${rule === 'zone' ? 'border-teal-500 bg-teal-600 text-white' : 'border-border text-foreground dark:text-muted-foreground'}`}>TAKS/KAKS + GIS</button></div><div className="mt-5 min-h-56 border border-border bg-black p-4 font-mono text-[11px] leading-relaxed text-foreground dark:text-muted-foreground">{arcRuleData[rule].map(line => <div key={line} className={line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-emerald-400' : undefined}>{'> '}{line}</div>)}</div></div><div className="border border-border bg-[#09090b] p-6 md:p-8"><p className="text-sm text-blue-400">Interoperability</p><h3 className="mt-2 text-xl font-semibold text-foreground">SAF ve analitik model</h3><p className="mt-4 text-sm leading-relaxed text-muted-foreground">IFC’nin geometrik modeli ile statik analiz için gereken analitik çubuk model aynı şey değildir. Kaynakta SAF, merkez çizgileri, mesnet koşulları, yük kombinasyonları ve düğüm toleransları bu dönüşümün teknik sınırı olarak ele alınır.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="border border-border p-4"><p className="text-xs text-blue-300">SAF</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Excel tabanlı yapısal analiz veri değişimi; 1D centerline, boundary condition ve yük kombinasyonu.</p></div><div className="border border-border p-4"><p className="text-xs text-red-300">Node adjustment</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Stretch, Trim ve Snap toleranslarıyla analitik düğümlerin çözülmesi.</p></div></div></div></div><div className="mt-8 border border-border bg-[#09090b] p-6 md:p-8"><p className="text-sm text-emerald-400">Saha ve kariyer</p><h3 className="mt-2 text-xl font-semibold text-foreground">Modeler → Coordinator → Information Manager</h3><p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">Kaynak saha bölümü; LOD 400 donatı, BVBS CNC üretimi, geçici işler, tolerans, asma tavan ve 12 metrelik demir gerçeği üzerinden modelin sahada üretilebilir olmasını sorgular. Kariyer hattı ise yazılım operatörlüğünü BIM yöneticiliğiyle karıştırmayan üç kademeli bir rol haritası kurar.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="border border-border p-4"><p className="font-medium text-foreground">BIM Modeler</p><p className="mt-2 text-xs text-muted-foreground">BEP kurallarına göre model ve parametrik veri üretir.</p></div><div className="border border-border p-4"><p className="font-medium text-foreground">BIM Coordinator</p><p className="mt-2 text-xs text-muted-foreground">Federated model, clash ve BCF issue akışını yönetir.</p></div><div className="border border-border p-4"><p className="font-medium text-foreground">Information Manager</p><p className="mt-2 text-xs text-muted-foreground">ISO 19650, EIR/BEP, CDE ve kurumsal bilgi stratejisini yönetir.</p></div></div></div></div></section>;
}

function BimCoreNativeAcademy() {
  const levels = Object.keys(curriculumDetailData).map(Number) as Array<keyof typeof curriculumDetailData>;
  const [level, setLevel] = useState<keyof typeof curriculumDetailData>(1);
  const [week, setWeek] = useState(0);
  const course = curriculumDetailData[level];
  const lecture = course.lectures[week as keyof typeof course.lectures];

  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-indigo-400">NATIVE REACT AKADEMİ · BIM501–BIM505</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">Yüksek lisans seviyesi BIM müfredatı</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Kaynak HTML’deki akademik veri modeli; ders kartları, öğrenme çıktıları, bibliyografya, syllabus ve ders notlarıyla birlikte korunur.</p><div className="mt-10 grid gap-8 lg:grid-cols-[0.65fr_1.35fr]"><div className="space-y-3">{levels.map(item => { const itemData = curriculumDetailData[item]; return <button key={item} type="button" onClick={() => { setLevel(item); setWeek(0); }} className={`w-full border p-5 text-left ${level === item ? 'border-indigo-500 bg-indigo-500/[0.08]' : 'border-border bg-[#09090b] hover:border-border'}`}><div className="flex items-start justify-between gap-3"><span className="font-mono text-indigo-300">{itemData.badge}</span><span className="text-xs text-muted-foreground">{itemData.ects}</span></div><h3 className="mt-4 font-medium text-foreground">{itemData.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{itemData.desc}</p></button>; })}</div><div className="border border-border bg-[#09090b] p-6 md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-indigo-400">{course.badge}</p><h3 className="mt-2 text-2xl font-semibold text-foreground">{course.title}</h3></div><span className="border border-indigo-500/30 px-3 py-2 text-xs text-indigo-300">{course.ects}</span></div><p className="mt-5 text-sm leading-relaxed text-muted-foreground">{course.desc}</p><div className="mt-8 grid gap-8 md:grid-cols-2"><div><h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Öğrenme çıktıları</h4><ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{course.outcomes.map(item => <li key={item} className="flex gap-3"><span className="text-indigo-400">•</span>{item}</li>)}</ul></div><div><h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zorunlu literatür</h4><ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{course.literature.map(item => <li key={item} className="flex gap-3"><span className="text-indigo-400">•</span>{item}</li>)}</ul></div></div><div className="mt-8 border-t border-border pt-6"><h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Haftalık ders izlencesi</h4><div className="mt-4 grid gap-2 sm:grid-cols-2">{course.syllabus.map((item, index) => <button key={item.week} type="button" onClick={() => setWeek(index)} className={`border p-3 text-left ${week === index ? 'border-indigo-500 bg-indigo-500/[0.08]' : 'border-border hover:border-border'}`}><span className="font-mono text-xs text-indigo-300">{item.week}</span><span className="mt-2 block text-sm text-foreground dark:text-muted-foreground">{item.topic}</span></button>)}</div></div></div></div><div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]"><article className="border border-border bg-[#09090b] p-6 md:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm text-indigo-400">{course.syllabus[week]?.week}</p><h3 className="mt-2 text-xl font-semibold text-foreground">{course.syllabus[week]?.topic}</h3></div><span className="text-xs text-muted-foreground">Ders notu</span></div><div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-foreground dark:text-muted-foreground [&_code]:rounded [&_code]:bg-surface-elevated [&_code]:px-1 [&_code]:text-emerald-300 [&_h4]:mt-8 [&_h4]:border-b [&_h4]:border-border [&_h4]:pb-3 [&_h4]:text-lg [&_h4]:font-semibold [&_p]:mt-4" dangerouslySetInnerHTML={{ __html: lecture ?? '<p>Bu hafta için ders notu bulunamadı.</p>' }} /></article><aside className="border border-border bg-[#09090b] p-6"><p className="text-sm font-medium text-indigo-400">Global / Türkiye karşılaştırması</p><div className="mt-5 space-y-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Global bağlam</p><p className="mt-2 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{course.global}</p></div><div className="border-t border-border pt-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Türkiye uygulaması</p><p className="mt-2 text-sm leading-relaxed text-foreground dark:text-muted-foreground">{course.tr}</p></div></div><div className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">Ders metni eğitim içindir. Standart, sözleşme veya mühendislik kararlarında güncel kaynak ve yetkili uzman incelemesi gerekir.</div></aside></div></div></section>;
}

function CareerMatrixNative() {
  const max = 100;
  return <section className="border-b border-border bg-[#0c0c0e] px-6 py-20 md:px-8 md:py-24"><div className="mx-auto max-w-7xl"><p className="mb-4 text-sm font-medium text-amber-400">NATIVE REACT GRAFİĞİ · KARİYER MATRİSİ</p><h2 className="text-3xl font-semibold text-foreground md:text-4xl">BIM rolü yazılım kullanmaktan ibaret değildir</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">Kaynak HTML’deki kariyer matrisi; yazılım, saha, koordinasyon, sözleşme/hukuk ve liderlik eksenlerini üç rol arasında karşılaştırır.</p><div className="mt-10 border border-border bg-[#09090b] p-6 md:p-8"><div className="grid gap-8 md:grid-cols-[1fr_0.35fr]"><div className="space-y-5">{careerMatrixData.labels.map((label, index) => <div key={label}><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-mono">%100</span></div><div className="space-y-2">{careerMatrixData.datasets.map(dataset => <div key={dataset.label} className="flex items-center gap-3"><span className="w-32 shrink-0 text-[11px] text-muted-foreground">{dataset.label}</span><div className="h-3 flex-1 bg-surface-elevated"><div className="h-3" style={{ width: `${(dataset.data[index] / max) * 100}%`, backgroundColor: dataset.color }} /></div><span className="w-8 text-right font-mono text-[11px] text-muted-foreground">{dataset.data[index]}</span></div>)}</div></div>)}</div><div className="border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">Kaynak dataset</p><ul className="mt-4 space-y-3 text-xs text-foreground dark:text-muted-foreground">{careerMatrixData.datasets.map(dataset => <li key={dataset.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5" style={{ backgroundColor: dataset.color }} />{dataset.label}</li>)}</ul><p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">Bu grafik kariyer gelişimi için kaynak senaryodur; işe alım, yetkinlik sertifikası veya ücretlendirme standardı değildir.</p></div></div></div></div></section>;
}
