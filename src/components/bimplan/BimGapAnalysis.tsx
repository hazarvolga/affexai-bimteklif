import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  FileCheck, 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  Lock, 
  Database, 
  Check, 
  Sparkles, 
  BookOpen,
  Info,
  Layers,
  Settings,
  RefreshCw,
  Copy
} from 'lucide-react';

// Audit Question structure
interface AuditQuestion {
  id: number;
  category: 'Kültür & İnsan' | 'Süreç & Sözleşme' | 'Teknoloji & Veri' | 'İşletme & Güvenlik';
  text: string;
  options: {
    text: string;
    score: number;
    feedback: string;
  }[];
}

export default function BimGapAnalysis() {
  const [activeTab, setActiveTab] = useState<'rapor' | 'analizor'>('rapor');
  const [activeGapId, setActiveGapId] = useState<string>('eir-sozlesme');
  const [copied, setCopied] = useState(false);

  // Audit Wizard States
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [savedActions, setSavedActions] = useState<Record<string, boolean>>({});

  // 1. GAP REPORT DATA (Mevcut Durum Analizi)
  const gapsData = [
    {
      id: 'eir-sozlesme',
      title: 'İhale Şartnamelerinde EIR ve Sözleşmesel Gaps',
      importance: 'Kritik',
      status: 'Yüksek Risk',
      description: 'Kamu ve özel sektör ihalelerinin büyük çoğunluğunda İşveren Bilgi Gereksinimleri (EIR) dökümanı ya hiç bulunmamakta ya da internetten kopyalanmış genel şablonlardan oluşmaktadır. Bu durum, yüklenicinin teslim etmesi gereken modellerin kalitesini belirsizleştirmekte ve hukuki uyuşmazlıklara zemin hazırlamaktadır.',
      identifiedGaps: [
        'EIR belgesinin ihale sözleşmesinin yasal bir eki olarak konumlandırılmaması.',
        'İdarelerin kendi kurumsal bilgi gereksinimlerini (OIR) tanımlamadan doğrudan proje aşamasına geçmesi.',
        'BIM rollerinin (BIM Yöneticisi, Koordinatörü vb.) görev tanımlarının ve yetki sınırlarının sözleşmelerde net olarak belirtilmemesi.'
      ],
      proposedSolutions: [
        'Her ihale öncesi projeye özel, yazılım sürümlerini, koordinat sistemini ve teslimat formatlarını (IFC, RVT) belirleyen bir EIR hazırlanmalı ve teknik şartnameye bağlanmalıdır.',
        'BEP (BIM Uygulama Planı) ihale sonrasında yüklenici tarafından resmi bir taahhüt dökümanı olarak imzalanmalı ve dinamik olarak güncellenmelidir.',
        'Sözleşmelerde "BIM Bilgi Yönetim Ek Protokolü" kullanılarak yasal sorumluluklar garanti altına alınmalıdır.'
      ],
      expertNote: 'Sözleşmesel olarak tanımlanmayan hiçbir BIM teslimatı gerçekte üretilemez. EIR dökümanı olmayan bir proje, pusulasız yola çıkan bir gemi gibidir.'
    },
    {
      id: 'cde-status-codes',
      title: 'Ortak Veri Ortamı (CDE) ve İş Akışı Eksiklikleri',
      importance: 'Yüksek',
      status: 'Orta Risk',
      description: 'Projelerde WhatsApp, e-posta veya standart bulut depolama servisleri (Drive, Dropbox vb.) Ortak Veri Ortamı (CDE) olarak adlandırılmaktadır. Ancak ISO 19650 standartlarına göre CDE; revizyon kontrolü, durum kodları (WIP, Shared, Published, Archived) ve onay kapıları barındıran disiplinli bir ekosistem olmalıdır.',
      identifiedGaps: [
        'Modellerin ve paftaların onay mekanizmalarının bulunmaması, şantiyede eski revizyon projelerin kullanılması sonucu yıkım/yeniden yapım maliyetleri.',
        'Durum kodlarının (S0: Paylaşıma Uygun, S4: İmalata Uygun vb.) ve revizyon hiyerarşisinin (P01, C01) dosyaların üst verilerinde (metadata) yer almaması.',
        'Bilgi güvenliği ve yetkilendirme seviyelerinin yetersiz olması, kritik dosyaların kaybolması veya yetkisiz kişilerce değiştirilmesi.'
      ],
      proposedSolutions: [
        'ISO 19650 uyumlu profesyonel bir CDE altyapısı (örn. Autodesk Construction Cloud, Oracle Aconex, Revizto veya yerel sunucularda çalışan açık kaynaklı CDE platformları) kurulmalıdır.',
        'Tüm proje paydaşlarına CDE isimlendirme ve onay iş akışı eğitimi verilmelidir.',
        'Verilerin durum kodları (WIP -> Shared -> Published -> Archived) arasındaki geçişleri elektronik onay imzalarıyla yürütülmelidir.'
      ],
      expertNote: 'Ortak Veri Ortamı sadece dosya saklanan bir bulut klasörü değildir; projenin tek gerçek bilgi kaynağı (Single Source of Truth - SSOT) ve denetim merkezidir.'
    },
    {
      id: 'openbim-interoperability',
      title: 'Açık Standartlar (OpenBIM) ve Birlikte Çalışabilirlik Gapleri',
      importance: 'Kritik',
      status: 'Yüksek Risk',
      description: 'Sektör genelinde belirli yazılım markalarına (tekelci yaklaşımlara) aşırı bağımlılık söz konusudur. Projelerin teslim aşamalarında evrensel ve yazılımdan bağımsız openBIM (IFC, BCF, COBie) standartları yerine tescilli (proprietary) yazılım formatları (RVT, PLN) zorunlu tutulmaktadır. Bu durum uzun vadeli dijital veri saklamayı ve çoklu disiplin koordinasyonunu imkansız hale getirmektedir.',
      identifiedGaps: [
        'Farklı tasarım yazılımları kullanan alt yükleniciler arasında veri kaybı korkusu nedeniyle 3D koordinasyonun 2D CAD çizimlerine indirgenmesi.',
        'IFC 4.3 ihracat kurallarının bilinmemesi, ihraç edilen modellerin koordinat kaymaları yaşaması veya nesne sınıflarının (IfcWall, IfcColumn vb.) yanlış atanması.',
        'BIM İşbirlikçi Formatı (BCF) kullanılmadığı için çakışma raporlarının e-posta ile PDF formatında gönderilmesi ve takip edilememesi.'
      ],
      proposedSolutions: [
        'Sözleşmelerde openBIM formatları (özellikle IFC 4.3 ve üstü) asıl teslimat formatı olarak belirlenmelidir.',
        'Tasarımcıların IFC ihracat ayarları, Model Görünüm Tanımları (MVD) ve yerel koordinat (GIS/Survey Point) entegrasyonu standartlaştırılmalıdır.',
        'Koordinasyon süreçlerinde çakışma takipleri için BCF (BIM Collaboration Format) tabanlı canlı takip yazılımları entegre edilmelidir.'
      ],
      expertNote: 'Açık BIM (openBIM), kamu ihalelerinde rekabeti koruyan ve 50 yıl sonra bile bina verilerinin okunabilmesini sağlayan tek sürdürülebilir yöntemdir.'
    },
    {
      id: 'lifecycle-cobie-7d',
      title: 'Tesis Yönetimi (COBie & 7D) Handover Gapleri',
      importance: 'Yüksek',
      status: 'Orta Risk',
      description: 'Milyonlarca dolar harcanarak şantiye aşamasında üretilen kusursuz 3D modeller, inşaat tamamlandığında bir sabit diskte rafa kaldırılmaktadır. Tesis işletme (FM/7D) ekiplerine modellerin teslimi (handover) yapılmamakta, dolayısıyla BIM yatırımları işletme aşamasında (bina yaşam döngüsünün %80 maliyetini oluşturan dönemde) tamamen değersiz kalmaktadır.',
      identifiedGaps: [
        'İşletme aşaması için gerekli olan cihaz garanti, marka, model, seri numarası, yedek parça verilerinin (COBie verisi) modelleme sırasında toplanmaması.',
        'AIM (Varlık Bilgi Modeli) ve PIM (Proje Bilgi Modeli) arasındaki geçiş hiyerarşisinin kurulmamış olması.',
        'Tesis yönetim yazılımlarının (CAFM/IWMS) BIM modellerindeki verileri otomatik olarak çekebileceği API entegrasyon altyapısının bulunmaması.'
      ],
      proposedSolutions: [
        'EIR dökümanında, projenin en başında tesis yönetimi ekibinin ihtiyaç duyduğu parametre listeleri (LOI) ve COBie şablonları tanımlanmalıdır.',
        'İmalat bittikçe as-built model (LOD 500) verileri sahada taranarak veya karekodlar üzerinden güncellenmeli ve dijital ikiz seviyesine getirilmelidir.',
        'Bina teslim aşamasında doğrulanmış bir COBie Excel tablosu ve entegre IFC modeli işletme departmanına teslim edilmelidir.'
      ],
      expertNote: 'COBie, işletmeci için paha biçilmez bir hazinedir. Doğru bir COBie teslimatı, binanın işletmeye geçiş süresini 6 aydan 2 haftaya indirebilir.'
    },
    {
      id: 'cybersecurity-iso19650-5',
      title: 'ISO 19650-5 Siber Güvenlik ve Veri Güvenliği Boşlukları',
      importance: 'Orta',
      status: 'Yeni Risk Grubu',
      description: 'Kritik kamu binalarının (hastaneler, tüneller, metro istasyonları, askeri üsler, enerji tesisleri vb.) tüm üç boyutlu iç mekan mimarileri, havalandırma şaftları ve güvenlik sistemlerinin detaylı modelleri, siber güvenlik tedbiri alınmaksızın paydaşlar arasında kontrolsüzce paylaşılmaktadır. ISO 19650-5 siber güvenlik odaklı BIM standartlarının uygulanması hayati bir zorunluluktur.',
      identifiedGaps: [
        'Hassas kamu binalarına ait 3D modellerin güvensiz depolama alanlarında barındırılması ve üçüncü şahıslara sızdırılma riski.',
        'Yüklenici personeli ve taşeronlara verilen CDE erişim yetkilerinin hiyerarşik sınırlandırmasının bulunmaması.',
        'Modellerin telif hakları, fikri mülkiyet sınırları ve veri silme prosedürlerinin mevzuatta eksik olması.'
      ],
      proposedSolutions: [
        'Kritik altyapı projelerinde ISO 19650-5 standardı uyarınca "Güvenlik Odaklı Bilgi Yönetim Planı" hazırlanmalıdır.',
        'Veriler yerel siber güvenlik protokollerine uygun, yetkilendirmesi katı, şifreli ulusal Ortak Veri Ortamlarında (CDE) tutulmalıdır.',
        'Tasarım ve yapım aşamalarında rol bazlı yetkilendirme (Bileşen seviyesinde yetki kısıtlama) uygulanmalıdır.'
      ],
      expertNote: 'Dijitalleşen inşaat sektörü siber saldırıların yeni hedefidir. Akıllı bir binanın dijital ikizini ele geçirmek, o binanın tüm fiziksel kontrolünü ele geçirmekle eşdeğerdir.'
    }
  ];

  // 2. INTERACTIVE AUDIT QUESTIONNAIRE DATA
  const auditQuestions: AuditQuestion[] = [
    {
      id: 1,
      category: 'Kültür & İnsan',
      text: 'Projenizde veya organizasyonunuzda BIM standartlarını (ISO 19650) bilen, bu süreci yönetecek sertifikalı/deneyimli bir "BIM Yönetim Kadrosu" bulunuyor mu?',
      options: [
        { text: 'Hayır, BIM süreçlerini standart tasarımcılarımız / şantiye ekibimiz ek iş olarak yürütüyor.', score: 0, feedback: 'BIM uzmanı olmadan standart uyumluluğu sağlanamaz. Mutlaka bir BIM Koordinatörü istihdam edilmeli veya dışarıdan teknik danışmanlık alınmalıdır.' },
        { text: 'Evet, yarı zamanlı veya dış kaynaklı bir BIM danışmanımız var.', score: 10, feedback: 'Dış destek başlangıç için iyidir ancak kurum içi teknik kapasitenin geliştirilmesi sürdürülebilirlik için şarttır.' },
        { text: 'Evet, projenin başından beri tam zamanlı ve bağımsız çalışan bir BIM Yöneticimiz/Ekibimiz mevcut.', score: 15, feedback: 'Harika! Bağımsız BIM yönetici kadrosu projenin denetim kalitesini doğrudan artırır.' }
      ]
    },
    {
      id: 2,
      category: 'Süreç & Sözleşme',
      text: 'Proje ihale şartnamesinde "İşveren Bilgi Gereksinimleri" (EIR) dökümanı yer aldı mı ve yüklenici tarafından onaylanmış bir "BIM Uygulama Planı" (BEP) hazırlandı mı?',
      options: [
        { text: 'Hayır, herhangi bir EIR veya BEP dökümanı hazırlanmadı. Doğrudan modelleme yazılımlarıyla çizimlere başlandı.', score: 0, feedback: 'Bu en kritik kural açığıdır (Gap). EIR ve BEP olmadan yapılan modellemeler sadece görsel bir 3D çizimden ibaret kalır, veri analizi yapılamaz.' },
        { text: 'İnternetten bulunan standart bir şablon sözleşmeye eklendi ancak projeye özel revize edilmedi veya takip edilmiyor.', score: 5, feedback: 'Kopyala-yapıştır dökümanlar sahada uyuşmazlıklara yol açar. Projenin yazılımsal ve geometrik gerçeklerine uygun özelleştirme yapılmalıdır.' },
        { text: 'Evet, projenin gereksinimlerine özel detaylı bir EIR hazırlandı ve yüklenici onaylı yasal BEP dökümanı yaşayan bir rehber olarak güncelleniyor.', score: 15, feedback: 'Mükemmel! ISO 19650 standartlarının temel sözleşmesel omurgasını başarıyla kurmuşsunuz.' }
      ]
    },
    {
      id: 3,
      category: 'Teknoloji & Veri',
      text: 'Projedeki tüm modeller, çizimler ve dökümanlar ISO 19650 standartlarına göre durum kodları (WIP, Shared, Published, Archived) atanarak bir Ortak Veri Ortamında (CDE) mı yönetiliyor?',
      options: [
        { text: 'Hayır, dosya paylaşımlarını e-posta, WhatsApp veya Drive üzerinden plansızca yapıyoruz.', score: 0, feedback: 'Siber güvenlik açığı ve revizyon karmaşası çok yüksek. Şantiyede yanlış/eski proje imalatı riski vardır.' },
        { text: 'Bulut depolama sistemi kullanıyoruz ancak durum kodları, isimlendirme standartları ve onay kapıları tanımlı değil.', score: 8, feedback: 'Dosyaları bulutta tutmak bir CDE kullandığınız anlamına gelmez. BS 1192 standart isimlendirme formatını ve onay iş akışlarını sisteme entegre etmelisiniz.' },
        { text: 'Evet, onay iş akışları olan, dosya isimleri BS 1192 uyumlu ve durum kodları otomatik yönetilen kurumsal bir CDE kullanıyoruz.', score: 15, feedback: 'Muazzam! Projede tek doğru bilgi kaynağını (SSOT) kurarak büyük bir imalat revizyon maliyetini engellemişsiniz.' }
      ]
    },
    {
      id: 4,
      category: 'Teknoloji & Veri',
      text: 'Disiplinler arası (Mimari, Statik, MEP vb.) model koordinasyonunu ve çakışma analizlerini (Clash Detection) nasıl gerçekleştiriyorsunuz?',
      options: [
        { text: 'Koordinasyon yapmıyoruz veya sahada göz ucuyla uyuşmazlıkları çözmeye çalışıyoruz.', score: 0, feedback: 'Şantiyede tesisatların betonarme taşıyıcıları delmesi gibi çok yüksek maliyetli gecikmelere ve yıkımlara yol açar.' },
        { text: 'Tasarım yazılımı içinde çakışmaları inceliyoruz ancak resmi raporlama, tolerans belirleme veya görev atama altyapımız yok.', score: 7, feedback: 'Bireysel kontroller yetersizdir. Bağımsız çakışma federasyon yazılımları (Navisworks, Solibri, Revizto) ile disiplinli kontrol süreçleri oluşturulmalıdır.' },
        { text: 'Evet, her hafta disiplinler arası modeller birleştirilerek tolerans matrisine göre analizler yapılıyor ve BCF formatıyla sorumlulara canlı atanıyor.', score: 15, feedback: 'Harika bir mühendislik koordinasyonu! Şantiyeye sıfır geometrik hata ile çıkmanın anahtarı budur.' }
      ]
    },
    {
      id: 5,
      category: 'Teknoloji & Veri',
      text: 'Projenizde model verilerinin paylaşımı ve arşivlenmesinde "openBIM" (özellikle IFC formatı) ve uluslararası bir "Bina Sınıflandırma Sistemi" kullanılıyor mu?',
      options: [
        { text: 'Hayır, sadece kullandığımız yazılımın ham formatını (RVT, PLN) kullanıyoruz. Sınıflandırma sistemimiz yok.', score: 0, feedback: 'Yazılım bağımlılığı (vendor lock-in) riski çok yüksek. Farklı yazılım kullanan paydaşlar veriyi okuyamaz ve 10 yıl sonra modelleriniz açılamayabilir.' },
        { text: 'Tasarım yazılımının kendi standart kütüphanesini kullanıyoruz, bazen IFC çıktısı alıyoruz ancak haritalama kuralları tanımlanmış değil.', score: 6, feedback: 'IFC şemalarının (IfcWall, IfcSpace) doğru sınıflandırılması ve modellerin Uniclass 2015 veya OmniClass gibi evrensel bir sisteme göre kodlanması gerekir.' },
        { text: 'Evet, IFC 4.3 standardına göre model ihracat kurallarımız var ve tüm elemanlar Uniclass 2015 / OmniClass standartlarında kodlu.', score: 15, feedback: 'Mükemmel! openBIM ve uluslararası sınıflandırma uyumunuz tam puan almayı hak ediyor.' }
      ]
    },
    {
      id: 6,
      category: 'Süreç & Sözleşme',
      text: 'BIM modelleri, Türkiye Cumhuriyeti Çevre, Şehircilik ve İklim Değişikliği Bakanlığı resmi birim fiyat poz kodları ile eşleştirilerek parametrik metraj (5D) bütçesi üretilebiliyor mu?',
      options: [
        { text: 'Hayır, metrajları hâlâ 2D paftalar üzerinden veya modellerden bağımsız Excel tablolarıyla geleneksel yöntemle çıkarıyoruz.', score: 0, feedback: 'Modellerden faydalanmıyorsunuz. Tasarım değiştiğinde metrajlar otomatik güncellenmez ve büyük bütçe sapmaları yaşanabilir.' },
        { text: 'Modellerden miktar alıyoruz ancak bakanlık poz kodları modele gömülü değil, eşleştirmeyi manuel Excel formülleriyle yapıyoruz.', score: 5, feedback: 'Model elemanlarına "Poz_No" veya "Bakanlik_Kodu" gibi parametreler ekleyerek bu süreci %90 oranında otomatikleştirebilirsiniz.' },
        { text: 'Evet, modeldeki IFC sınıflarına bakanlık birim fiyat poz kodları entegre edilmiştir. Tasarım değiştikçe 5D bütçe anlık güncelleniyor.', score: 10, feedback: 'Olağanüstü! 5D bütçe simülasyonu sayesinde projenizde tam maliyet kontrolü sağlıyorsunuz.' }
      ]
    },
    {
      id: 7,
      category: 'İşletme & Güvenlik',
      text: 'Projenin inşaat tamamlandığında tesis yönetim ekiplerine (FM) teslim edilmesi için "COBie" veri standardı veya "Asset Information Model" (AIM) planlaması yapıldı mı?',
      options: [
        { text: 'Hayır, COBie veya tesis yönetimi kelimelerini ilk defa duyuyoruz. Klasik basılı as-built projeleri teslim edeceğiz.', score: 0, feedback: 'Tesis yönetiminde dijitalleşme sıfır. İşletmeci cihazların yerini bulmak, bakım tarihlerini ve garantilerini girmek için yıllarca uğraşacaktır.' },
        { text: 'Bina bittikten sonra COBie tablosu doldurmayı düşünüyoruz ancak tasarım aşamasında parametrik veri giriş zorunluluğumuz yok.', score: 4, feedback: 'İnşaat bittikten sonra geriye dönük veri toplamak çok zordur ve pahalıdır. Veriler tasarım ve yapım sürecinde aşamalı olarak (LOD 100-500) girilmelidir.' },
        { text: 'Evet, projenin en başında işletme kriterleri belirlenmiş olup, COBie veri formatında as-built teslimat yapılması sözleşmesel zorunluluktur.', score: 10, feedback: 'Vizyoner bir yaklaşım! Projenizi gelecekte yaşayan bir "Dijital İkiz" (Digital Twin) haline getirmenin en önemli adımını atmışsınız.' }
      ]
    },
    {
      id: 8,
      category: 'İşletme & Güvenlik',
      text: 'Özellikle kritik altyapı ve kamu binaları içeren projenizde, 3D modellerin ve verilerin siber güvenliğini sağlamak için ISO 19650-5 (Güvenlik Odaklı Bilgi Yönetimi) önlemleri alınıyor mu?',
      options: [
        { text: 'Hayır, siber güvenlik önlemimiz yok, tüm taşeronlar projenin her yerine serbestçe erişip internetten dosya indirebiliyor.', score: 0, feedback: 'Kritik kamu binalarının siber güvenlik riski çok yüksek. Bina hassas tesisat detaylarının kötü niyetli kişilerin eline geçmesi milli güvenlik açığı oluşturabilir.' },
        { text: 'CDE bulut sunucumuzda şifre koruması var ancak detaylı siber güvenlik planımız, hassas varlık koruma protokolümüz yok.', score: 2, feedback: 'Sadece şifre koruması yetmez. ISO 19650-5 standartlarına göre veri paylaşım, imha ve erişim yetkilendirme seviyeleri resmi bir siber güvenlik protokolü ile çizilmelidir.' },
        { text: 'Evet, ISO 19650-5 standardına uygun Siber Güvenlik ve Veri Koruma Protokolümüz yürürlükte, tüm veri akışı kontrollü ve şifreli sunucularda saklı.', score: 5, feedback: 'Mükemmel siber olgunluk! Hassas varlıklarınızın verilerini uluslararası standartlarda koruma altına almışsınız.' }
      ]
    }
  ];

  const handleOptionSelect = (score: number) => {
    const updatedAnswers = [...answers, score];
    setAnswers(updatedAnswers);

    if (currentStep < auditQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRestartAudit = () => {
    setAnswers([]);
    setCurrentStep(0);
    setShowResults(false);
    setSavedActions({});
  };

  const totalScore = answers.reduce((acc, curr) => acc + curr, 0);
  
  // Calculate maturity level according to Bew-Richards BIM Maturity Model & ISO 19650
  const getBimMaturityLevel = (score: number) => {
    if (score < 25) {
      return {
        level: 'BIM Düzey 0 (Geleneksel CAD)',
        color: 'text-red-600 bg-red-50 border-red-100',
        desc: 'Projeniz tamamen geleneksel CAD çizim yöntemlerine bağımlı durumdadır. Bilgi paylaşımı kopuk, revizyon hataları yüksek ve süreçler standart dışıdır. Ciddi bir koordinasyon ve iş kaybı riski altındasınız.',
        badge: 'Çok Düşük Olgunluk'
      };
    } else if (score >= 25 && score < 55) {
      return {
        level: 'BIM Düzey 1 (Yalnız BIM)',
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        desc: 'Modelleme yazılımlarını 3D görselleştirme veya kaba metraj için kullanıyorsunuz ancak disiplinler arası ortak veri akışı, standart isimlendirme ve sözleşmesel BEP/EIR süreçleriniz bulunmuyor. Bilgiler paydaşlar arasında silo halinde kalıyor.',
        badge: 'Başlangıç Seviyesi'
      };
    } else if (score >= 55 && score < 85) {
      return {
        level: 'BIM Düzey 2 (İşbirlikçi BIM - ISO 19650)',
        color: 'text-blue-600 bg-blue-50 border-blue-100',
        desc: 'Tebrikler! Projeniz uluslararası ISO 19650 standardına büyük ölçüde uyum sağlamıştır. Ortak Veri Ortamı kullanıyor, disiplinli çakışma testleri yapıyor ve BEP çerçevesinde çalışıyorsunuz. Süreçlerinizi 5D (Bütçe) ve 7D (İşletme) entegrasyonu ile daha da ileriye taşıyabilirsiniz.',
        badge: 'Uyumlu / İyi Düzey'
      };
    } else {
      return {
        level: 'BIM Düzey 3 (Entegre Dijital İkiz)',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        desc: 'Mükemmel! Projeniz, tasarım ve inşaatın çok ötesinde, tesis işletmesine (7D COBie), bulut tabanlı e-PYS sistemlerine, 5D parametrik bütçeye ve ISO 19650-5 siber güvenlik standartlarına tam entegre yaşayan bir dijital ikiz seviyesindedir.',
        badge: 'BIM Vizyoner / Lider'
      };
    }
  };

  const maturity = getBimMaturityLevel(totalScore);

  // Generate Personalized Action Plan Items
  const getActionPlan = () => {
    const actions: { id: string; title: string; task: string; urgency: 'ACİL' | 'ÖNERİLEN' | 'İLERİ DÜZEY' }[] = [];
    
    // Check answer 2 (EIR/BEP)
    if (answers[1] === 0) {
      actions.push({
        id: 'act-eir',
        title: 'Projeye Özel EIR & BEP Hazırlanması',
        task: 'Tasarımcıların veya yüklenicinin çizime başlamasından önce acilen projeye özel yazılım sürümlerini, koordinat verilerini belirten bir EIR hazırlayın ve teknik şartname eki yapın.',
        urgency: 'ACİL'
      });
    }

    // Check answer 3 (CDE)
    if (answers[2] === 0 || answers[2] === 8) {
      actions.push({
        id: 'act-cde',
        title: 'ISO 19650 Uyumlu CDE Kurulumu',
        task: 'E-posta veya standart Drive yerine, onay kapıları (WIP, Shared, Published, Archived) ve BS 1192 dosya isimlendirme formatı olan kurumsal bir CDE altyapısına geçiş yapın.',
        urgency: 'ACİL'
      });
    }

    // Check answer 4 (Clash)
    if (answers[3] === 0 || answers[3] === 7) {
      actions.push({
        id: 'act-clash',
        title: 'Tolerans Matrisli Çakışma Analiz Rutini',
        task: 'Tasarım koordinasyonu toplantılarından önce mimari, statik ve MEP modellerini Navisworks veya Solibri üzerinde federasyon model haline getirip tolerans değerlerine (örn: 2.5 cm) göre çakışma analizlerini zorunlu kılın.',
        urgency: 'ÖNERİLEN'
      });
    }

    // Check answer 5 (OpenBIM / Sınıflandırma)
    if (answers[4] === 0 || answers[4] === 6) {
      actions.push({
        id: 'act-openbim',
        title: 'Evrensel Sınıflandırma Entegrasyonu (IFC)',
        task: 'Modellerdeki yapı elemanlarının yazılımdan bağımsız paylaşılabilmesi için IFC 4.3 ihraç ayarlarını standartlaştırın ve tüm nesnelere Uniclass 2015 veya OmniClass kodları atayın.',
        urgency: 'ÖNERİLEN'
      });
    }

    // Check answer 6 (5D Poz)
    if (answers[5] === 0 || answers[5] === 5) {
      actions.push({
        id: 'act-5d',
        title: 'T.C. ÇŞİDB Bakanlık Poz Parametre Standardizasyonu',
        task: 'Tasarım yazılımındaki elemanların parametre listesine "Bakanlik_Poz_No" adında bir parametre açarak, metrajların otomatik resmi hakediş formatına dönüştürülebilmesini sağlayın.',
        urgency: 'ÖNERİLEN'
      });
    }

    // Check answer 7 (7D COBie)
    if (answers[6] === 0 || answers[6] === 4) {
      actions.push({
        id: 'act-7d',
        title: 'Tesis Yönetimi için COBie Veri Planlaması',
        task: 'İşletme ekiplerinin binaları teslim aldığında saniyeler içinde CAFM yazılımlarına veri aktarabilmesi için modellerde Mahal (Space) tanımlarını tamamlayıp COBie ihraç kurallarını belirleyin.',
        urgency: 'İLERİ DÜZEY'
      });
    }

    // Check answer 8 (ISO 19650-5 Cybersecurity)
    if (answers[7] === 0 || answers[7] === 2) {
      actions.push({
        id: 'act-security',
        title: 'ISO 19650-5 Güvenlik Protokolü Oluşturulması',
        task: 'Hassas kamu ve altyapı verilerinin kötü niyetli paylaşımını engellemek için siber güvenlik politikası yayınlayın, CDE yetkilendirme matrisini katılaştırın.',
        urgency: 'İLERİ DÜZEY'
      });
    }

    // Default action if score is very high
    if (actions.length === 0) {
      actions.push({
        id: 'act-gis',
        title: 'BIM & GIS Canlı Sensör (IoT) Entegrasyonu',
        task: 'Mevcut lider konumunuzu korumak için, BIM modellerinizi bölgesel Coğrafi Bilgi Sistemleri (GIS) ile birleştirin ve binadaki canlı iklimlendirme/enerji sensörlerini (IoT) modele bağlayarak tam bir Dijital İkiz operasyonu başlatın.',
        urgency: 'İLERİ DÜZEY'
      });
    }

    return actions;
  };

  const handleToggleAction = (id: string) => {
    setSavedActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyActionPlan = () => {
    const actions = getActionPlan();
    const actionText = actions.map((act, idx) => `${idx + 1}. [${act.urgency}] ${act.title}\n   Görev: ${act.task}\n`).join('\n');
    const textToCopy = `
=============================================
BIM UYUMLULUK & GAP ANALİZ RAPORU
=============================================
TOPLAM SKOR: ${totalScore} / 100
OLGUNLUK DÜZEYİ: ${maturity.level} (${maturity.badge})

ÖNERİLEN KİŞİSELLEŞTİRİLMİŞ AKSİYON PLANI:
---------------------------------------------
${actionText}

Bu gap analizi ve aksiyon raporu BIM Teknik Portal denetleyicisi tarafından üretilmiştir.
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12">
      {/* HEADER HERO */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest block">MÜHENDİSLİK DENETİMİ &amp; GAP ANALİZİ</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">BIM Gap Raporu &amp; Olgunluk Analizörü</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Türkiye kamu ve özel inşaat sektöründe en çok karşılaşılan teknik BIM boşluklarını (Gap) inceleyin, ardından kendi projenizin olgunluk seviyesini uluslararası ISO 19650 normlarında ücretsiz test ederek size özel aksiyon planınızı anında üretin.
          </p>
          
          {/* Tab buttons switcher */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => setActiveTab('rapor')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'rapor'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              GAP RAPORU (SEKTÖREL ANALİZ)
            </button>
            <button
              onClick={() => setActiveTab('analizor')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === 'analizor'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Activity className="w-4 h-4" />
              İNTERAKTİF GAP ANALİZÖRÜ (TEST)
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'rapor' ? (
        /* TAB 1: SEKTÖREL GAP RAPORU PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-350">
          
          {/* Left Gap Selector list */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">BOŞLUK ALANLARI</span>
              <h3 className="text-sm font-extrabold text-slate-800">Teyit Edilen En Kritik 5 BIM Gapi</h3>
            </div>

            {gapsData.map((gap) => {
              const isActive = gap.id === activeGapId;
              return (
                <button
                  key={gap.id}
                  onClick={() => setActiveGapId(gap.id)}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex gap-3 items-start cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md translate-x-1'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  id={`gap-selector-${gap.id}`}
                >
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-orange-500' : 'text-orange-600'}`} />
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                      ÖNEM: {gap.importance}
                    </span>
                    <h4 className="font-extrabold text-xs mt-0.5 leading-snug">
                      {gap.title}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Gap Details */}
          {(() => {
            const selectedGap = gapsData.find(g => g.id === activeGapId) || gapsData[0];
            return (
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Header info */}
                <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider">
                      {selectedGap.status}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {selectedGap.title}
                    </h3>
                  </div>
                  <span className="text-xs font-black text-slate-400">
                    ETKİ DERECESİ: <strong className="text-orange-600">{selectedGap.importance.toUpperCase()}</strong>
                  </span>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Sektörel Mevcut Durum Analizi</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed font-semibold">
                    {selectedGap.description}
                  </p>
                </div>

                {/* Gaps List and Solution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  
                  {/* Identified Gaps */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      Tespit Edilen Boşluklar (Gaps)
                    </h5>
                    <ul className="space-y-3">
                      {selectedGap.identifiedGaps.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-semibold">
                          <span className="text-red-500 font-bold shrink-0 mt-0.5">●</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Proposed Solutions */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Geliştirme &amp; Çözüm Önerileri
                    </h5>
                    <ul className="space-y-3">
                      {selectedGap.proposedSolutions.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-semibold">
                          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Expert Callout quote */}
                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    BAŞ DANIŞMAN UYARISI
                  </div>
                  <p className="text-[11px] text-slate-600 italic leading-relaxed">
                    "{selectedGap.expertNote}"
                  </p>
                </div>

              </div>
            );
          })()}

        </div>
      ) : (
        /* TAB 2: INTERACTIVE AUDIT TOOL WIZARD */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm animate-in fade-in duration-350">
          
          {!showResults ? (
            /* ACTIVE AUDIT STEP RUNNING */
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Steps Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                  <span className="uppercase tracking-widest">KATEGORİ: {auditQuestions[currentStep].category}</span>
                  <span className="mono">SORU {currentStep + 1} / {auditQuestions.length}</span>
                </div>
                {/* Visual Progress Line */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / auditQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-bold text-[9px] uppercase tracking-wider">
                  Aşama {currentStep + 1}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                  {auditQuestions[currentStep].text}
                </h3>
              </div>

              {/* Options selectors */}
              <div className="space-y-3">
                {auditQuestions[currentStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(opt.score)}
                    className="w-full p-4 text-left border border-slate-200 hover:border-orange-500 hover:bg-orange-50/10 rounded-xl text-xs sm:text-sm font-semibold transition-all group flex justify-between items-center cursor-pointer"
                    id={`audit-step-${currentStep}-opt-${i}`}
                  >
                    <span className="text-slate-700 group-hover:text-slate-900">{opt.text}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 shrink-0 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>

              {/* Info footer */}
              <div className="flex items-start gap-2.5 text-[10px] text-slate-400 font-bold bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Bu denetimdeki sorular uluslararası ISO 19650-1, -2, -3 ve -5 standartları ile Türkiye kamu teknik şartnameleri esas alınarak hazırlanmıştır.</span>
              </div>
            </div>
          ) : (
            /* AUDIT COMPLETED RESULTS REPORT PANEL */
            <div className="space-y-8 animate-in zoom-in-95 duration-200">
              
              {/* Header result card */}
              <div className="text-center space-y-4 max-w-2xl mx-auto pb-6 border-b border-slate-100">
                <div className="inline-flex items-center justify-center p-3.5 bg-orange-50 rounded-full text-orange-600">
                  <FileCheck className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Gap Değerlendirmesi Tamamlandı</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-black">PROJE BIM UYUMLULUK RAPORU</p>
                </div>
                
                {/* Score badge & Maturity Badge */}
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">UYUMLULUK SKORU</span>
                    <span className="mono text-3xl font-black text-orange-600">{totalScore} / 100</span>
                  </div>
                  <div className={`p-4 border rounded-xl flex flex-col justify-center items-center ${maturity.color}`}>
                    <span className="text-[10px] font-black block uppercase tracking-wider opacity-85">OLGUNLUK SEVİYESİ</span>
                    <span className="text-xs sm:text-sm font-extrabold text-center mt-1 leading-tight">{maturity.level}</span>
                  </div>
                </div>
              </div>

              {/* Assessment description card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-3xl mx-auto space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  Durum Özeti ve Değerlendirme
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold">
                  {maturity.desc}
                </p>
              </div>

              {/* DYNAMIC ACTION PLAN BASED ON RESULTS */}
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-black text-base text-slate-900 tracking-tight">Size Özel BIM Aksiyon ve İyileştirme Planı</h4>
                    <p className="text-[11px] text-slate-400 font-bold">Aşağıdaki adımları uygulayarak projenizdeki gapleri (açıkları) kapatabilirsiniz.</p>
                  </div>
                  <button
                    onClick={handleCopyActionPlan}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        KOPYALANDI!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-orange-600" />
                        PLANINI KOPYALA
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {getActionPlan().map((act) => {
                    const isChecked = !!savedActions[act.id];
                    return (
                      <div 
                        key={act.id}
                        className={`p-4 border rounded-xl transition-all flex gap-3.5 items-start ${
                          isChecked 
                            ? 'bg-slate-50 border-orange-200 opacity-75' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleAction(act.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-1 cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-orange-600 border-orange-600 text-white' 
                              : 'bg-white border-slate-300 hover:border-orange-500'
                          }`}
                          id={`action-check-${act.id}`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              act.urgency === 'ACİL' 
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : act.urgency === 'ÖNERİLEN'
                                ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {act.urgency}
                            </span>
                            <h5 className={`font-black text-xs sm:text-sm text-slate-900 ${isChecked ? 'line-through text-slate-400' : ''}`}>
                              {act.title}
                            </h5>
                          </div>
                          <p className={`text-xs text-slate-500 leading-relaxed ${isChecked ? 'text-slate-400' : ''}`}>
                            {act.task}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Restart button */}
              <div className="text-center pt-4">
                <button
                  onClick={handleRestartAudit}
                  className="px-6 py-3 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  YENİDEN TEST ET
                </button>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
