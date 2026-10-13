import type { DocSection, DocSource } from "./doc-types";

export const ROADMAP_META = {
  title: "e-PYS ve ALLPLAN: Değerlendirme ve Geliştirici Yol Haritası",
  subtitle: "Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik (RG 5.8.2026/33331) kapsamında BIMMetraj ürün ve teknik yol haritası",
  preparedOn: "13 Ekim 2026",
  audience: "ALLPLAN Türkiye (Aluplan) ile paylaşım ve Bakanlık görüşmelerine hazırlık",
  status: "Çalışma belgesi — resmî görüş değildir; mevzuat atıfları RG metni ve resmî eklerle karşılaştırılmıştır.",
};

export const ROADMAP_SECTIONS: DocSection[] = [
  {
    id: "ozet",
    title: "Yönetici özeti",
    blocks: [
      { type: "p", text: "5 Ağustos 2026 tarihli ve 33331 sayılı Resmî Gazete'de iki yönetmelik yayımlandı: projelerin dijital olarak nasıl hazırlanacağını düzenleyen Dijital Hazırlama Yönetmeliği (yürürlük 1 Eylül 2027) ve teslim, inceleme ve onay süreçlerini e-PYS üzerinden yürüten Elektronik Teslim Yönetmeliği (yürürlük 1 Eylül 2028). IFC/BIM teslimi kademeli olarak 1 Eylül 2029'da başlıyor." },
      { type: "list", items: [
        "Kazanılacak konum 'en iyi kontrol aracı' olmak değil; doğrulanmış, sürümlü ve makine-okunur yönetmelik verisine (EK-2, EK-5, EK-6, EK-7, EK-9) sahip olup bu veriyi her ortama dağıtmaktır.",
        "ALLPLAN 2026 IDS doğrulamasını kendi içinde yapabildiği için ALLPLAN tarafındaki değer bir 'e-PYS kiti'dir: TREpys nitelik kataloğu, IFC dışa aktarım eşlemesi, 15 karakter kuralına uygun malzeme kütüphanesi, EK-3 mahal listesi ve yönetmelikten üretilmiş IDS dosyası.",
        "BIMMetraj'ın rolü yazılımdan bağımsız iş akışıdır: her yazılımdan gelen IFC için ön kontrol, EK-9 taslağı, ekip ve sürüm geçmişi, kanıt kaydı ve 5D metraj/teklif köprüsü.",
        "İlk zorunluluk 2B tarafında: 1 Eylül 2027'den itibaren büyük şehirlerde 5.000 m² üstü projelerde PDF/A. En yakın ödeme isteği burada.",
        "e-PYS uygunluğu kendisi inceler (Elektronik Teslim Yönetmeliği m.5(2)). Ürünün en önemli teknik hedefi, sonuçlarını resmî kontrolle eşit tutmaktır; bu da Bakanlığın kuralları makine-okunur yayımlamasına bağlıdır.",
      ] },
      { type: "callout", tone: "ok", title: "13 Ekim 2026 itibarıyla hazır olanlar", text: "RG 33331 eklerine dayalı IFC ön kontrolü (EK-9 21 satır, GlobalId atıflı bulgular), IDS dışa aktarımı, kişisel veri maskeleme, PDF/A ön kontrol kitaplığı ve SmartCheck ekranında EK-9 tablosu. Ayrıntılar 'Uygulama durumu' bölümündedir." },
    ],
  },
  {
    id: "mevzuat",
    title: "Mevzuat çerçevesi (doğrulanmış)",
    blocks: [
      { type: "table", columns: ["Yönetmelik", "Kapsam", "Yürürlük"], rows: [
        ["Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik", "Projelerin üretim biçimi: PDF/A, IFC (TS EN ISO 16739-1), isimlendirme (EK-1–EK-5), IFC sınıf ve özellikleri (EK-5, EK-6), proje bilgileri (EK-7), gelişim seviyeleri (EK-8), model kalite kontrol formu (EK-9)", "1 Eylül 2027"],
        ["Mimarlık ve Mühendislik Projelerinin Elektronik Ortamda Teslimi ve Yönetilmesi Hakkında Yönetmelik", "Teslim, inceleme, eksiklik bildirimi, onay ve saklama süreçlerinin e-PYS üzerinden yürütülmesi", "1 Eylül 2028"],
      ] },
      { type: "p", text: "Kademeli geçiş takvimi (Dijital Hazırlama Yönetmeliği geçici hükümleri):" },
      { type: "table", columns: ["Format", "Kapsam", "Tarih"], rows: [
        ["PDF/A", "Nüfusu 2 milyonu aşan illerin nüfusu 600 bini aşan belediyeleri, 5.000 m² üstü yapılar", "1 Eylül 2027"],
        ["PDF/A", "Diğer tüm yapılar", "1 Mart 2029"],
        ["IFC (BIM)", "Nüfusu 2 milyonu aşan il, 600 bini aşan belediye, 10.000 m² üstü", "1 Eylül 2029"],
        ["IFC (BIM)", "Nüfusu 2 milyonu aşan il, 400 bini aşan belediye, 10.000 m² üstü", "1 Eylül 2030"],
        ["IFC (BIM)", "Nüfusu 1 milyonu aşan il, 300 bini aşan belediye, 10.000 m² üstü", "1 Eylül 2031"],
        ["IFC (BIM)", "Diğer tüm yapılar", "1 Eylül 2032"],
        ["—", "Konut ve konut-ticaret karma dışındaki yapılar", "1 Eylül 2033'e kadar uygulanmaz"],
      ] },
      { type: "list", items: [
        "Kapsam dışı: bodrum hariç en çok iki katlı ve 200 m²'yi geçmeyen müstakil yapılar, entegre tesis niteliğinde olmayan tarım/hayvancılık yapıları, uygulama imar planı bulunmayan alanlar.",
        "Geçiş tarihlerinden önce yapılan başvurular ve ihale kararı/tarihi önce olan kamu işleri muaftır (geçici madde).",
        "Bir yapı grubunda IFC zorunlu olduğunda o grup için ayrı PDF/A yükümlülüğü kalkar; modelden üretilen paftalar yine PDF/A olarak verilir.",
      ] },
      { type: "p", text: "Elektronik Teslim Yönetmeliği'nin ürün tasarımını doğrudan etkileyen maddeleri:" },
      { type: "table", columns: ["Madde", "Hüküm", "Ürüne etkisi"], rows: [
        ["m.4(3)", "Kamu kurumlarının yazılım platformları ile e-PYS arasında proje dosyası ve bilgi paylaşımı yapılır.", "Teslim öncesi doğrulama için bir API/test ortamı talep edilebilir."],
        ["m.4(4)", "Bina türleri, kriterler, yükleme formatları ve başlangıç tarihlerini belirlemeye Bakanlık yetkilidir.", "Kural verisi sürümlü olmalı; Bakanlık duyuruları izlenmeli."],
        ["m.4(5), m.7(1)", "İdare sayısal veriyi üçüncü kişilere devredemez; sistemden elde edilen bilgi üçüncü kişilere aktarılamaz.", "Ürün e-PYS verisine erişim iddia etmez; müellifin kendi modelini işler."],
        ["m.5(2)", "Bilgilerin doğruluğundan kaydı yapan müellif sorumludur; dosyalar yönetmeliğe uygunluk açısından incelenir, hata varsa tekrar yükleme istenir.", "Raporlarımız 'ön kontrol'dür; resmî karar e-PYS ve idarenindir."],
        ["m.6(4)", "Kâğıda yazdırılıp taranarak oluşturulan PDF'ler kullanılamaz.", "PDF/A ön kontrolünde taranmış sayfa tespiti yapılır."],
        ["m.7(7)", "Bu Yönetmelik kapsamındaki işlemler için e-PYS dışında elektronik ortam kullanılamaz.", "Ürün bir teslim kanalı değildir; teslimden önceki hazırlık katmanıdır."],
      ] },
    ],
  },
  {
    id: "taslak-nihai",
    title: "Taslak ile nihai metin arasındaki farklar",
    blocks: [
      { type: "p", text: "Kasım 2025 taslağı ve ekleri piyasada hâlâ dolaşıyor. Kural verisi yalnızca nihai RG metni ve resmî eklere (20260805-2-1.pdf, 241 sayfa, taranmış görüntü) dayanmalıdır." },
      { type: "table", columns: ["Konu", "Taslak (Kasım 2025)", "Nihai (RG 33331)"], rows: [
        ["Yürürlük", "1 Ekim 2026", "1 Eylül 2027 (teslim: 1 Eylül 2028)"],
        ["Proje kodu", "Yıl, il, ilçe, mahalle, ada, parsel, durum alanları alt tire ile", "6 karakterli proje kodu; dosya adı 9 alanlı, alt tire ayraçlı (ör. 260001_00_MM_GNEL_PL_MMC_K00_01_000)"],
        ["Özel özellik setleri", "Tr_Pset_CSB (PozNo vb.)", "TREpys_ önekli setler: TREpys_ParselOzellikSeti (TAKS, KAKS, CekmeOn, CekmeYan, CekmeArka), TREpys_EmsalOzellikSeti (EmsalDurumu: DAHIL / HARIC / DIGER), poz için TREpys_PozOzellikSeti"],
        ["Zorunlu sınıflar", "Taslak EK-5 listesi", "EK-5 Tablo 5.1: 69 zorunlu sınıf; Tablo 5.2: 67 isteğe bağlı sınıf; EK-6 Tablo 6.1–6.68"],
        ["EK-9", "Yaklaşık 23 satır", "Tablo 9.1: 21 satır (mimari disiplin)"],
      ] },
      { type: "callout", tone: "info", title: "Bağımsız doğrulama kaydı", text: "Resmî ek PDF'in (SHA-256 7dc88971…0ecb3) Tablo 6.55 (IfcSite ve TREpys_ParselOzellikSeti, CekmeArka dahil), Tablo 6.60 (TREpys_EmsalOzellikSeti.EmsalDurumu) ve Tablo 9.1 satır 1–9 sayfaları görsel olarak kontrol edildi ve makine-okunur veriyle birebir eşleşti. Diğer tablolar için yukarı akış (ifc-ruhsat) doğrulaması geçerlidir; tamamının bağımsız kontrolü Faz 0'da tamamlanacaktır." },
    ],
  },
  {
    id: "teknik-talep",
    title: "Yönetmeliğin teknik talepleri (tasarım ofisi açısından)",
    blocks: [
      { type: "table", columns: ["Ek / Madde", "Talep", "Makine ile denetlenebilirlik"], rows: [
        ["EK-1, EK-2 (m.6)", "Proje kodu ve 9 alanlı dosya adı; disiplin kodları (Tablo 2.2)", "Tam (şablon ve kod listeleri)"],
        ["EK-3", "Mahal numarası (kat, fonksiyon, sıra) ve mahal adı kısaltmaları", "Şablon tam; yaklaşık 150 mahal adı kısaltmasının listesi henüz kodlanmadı"],
        ["EK-5 (m.11, m.13)", "Eleman adı Disiplin-Kategori-Açıklama; zorunlu IFC sınıfları; üst sınıf ve IfcBuildingElementProxy yasağı", "Tam"],
        ["m.12", "Malzeme adı en fazla 15 karakter", "Tam"],
        ["EK-6", "Her zorunlu sınıf için zorunlu öznitelik ve Pset özellikleri (68 tablo)", "Tam (IDS ile de ifade edilebilir)"],
        ["EK-7", "IfcProject, kişi, kurum, rol, IfcProjectedCRS ve IfcMapConversion bilgileri", "Tam"],
        ["EK-8", "Uygulama projesi aşamasında asgari LOD 300", "Makine ile denetlenemez — elle değerlendirme"],
        ["EK-9", "21 satırlık Model Kalite Kontrol Formu", "Satırların çoğu otomatik; dosya boyutu, LOD ve PDF–IFC tutarlılığı elle"],
        ["Emsal (EK-6 Tablo 6.60)", "IfcSpatialZone ile emsal durumu", "Kısmi; plan notları ve yorum gerektiren alanlar elle"],
      ] },
    ],
  },
  {
    id: "yazilim",
    title: "Yazılım ekosistemi değerlendirmesi",
    blocks: [
      { type: "table", columns: ["Yazılım / Araç", "e-PYS açısından güçlü yön", "Dikkat edilecek nokta"], rows: [
        ["ALLPLAN 2026", "IDS desteği tam sürümde; Information Palette içinde IDS doğrulama; 300+ bSDD sözlüğüne erişim; mahal kaplamalarından IfcCovering üretimi; PythonParts (Python 3.13) ile otomasyon; Solibri ve Bimplus ile issue akışı", "Bina modellerinin IFC4X3 (IFC 4.3) dışa aktarımının gerçek bir projede yönetmeliğe karşı test edilmesi gerekir"],
        ["Autodesk Revit", "Pazar payı yüksek; IFC dışa aktarımı ve kullanıcı tanımlı Pset dosyaları", "TREpys setleri için shared parameter ve DefaultUserDefinedParameterSets eşlemesi elle kurulur; IfcPlate gibi listede olmayan sınıflar çıkabilir"],
        ["Graphisoft Archicad", "Özellik yöneticisi ve IFC çevirmenleri", "Yerel şablonların ofis içinde hazırlanması gerekir"],
        ["Solibri / BIMcollab", "IDS ile kural denetimi", "Türkiye'ye özgü kurallar ancak yayımlanan IDS ile çalışır"],
        ["ifc-ruhsat (açık kaynak, MIT)", "Nihai eklerden çıkarılmış kural verisi, CLI/MCP, IDS ve EK-9 üretimi", "Tek geliştiricili, iş akışı ve ekip özelliği yok; BIMMetraj kural motorunu bu projeden atıfla almıştır"],
      ] },
      { type: "callout", tone: "info", text: "Önerilen yaklaşım yazılımdan bağımsızdır: teslim edilen nesne her durumda IFC'dir. ALLPLAN kullanıcıları için kit ve yerinde IDS kontrolü, diğer yazılımlar için şablon dosyaları ve web ön kontrolü." },
    ],
  },
  {
    id: "mimari",
    title: "Önerilen mimari: tek kural kaynağı, çok tüketici",
    blocks: [
      { type: "formula", lines: [
        "RG 33331 + resmî ekler (madde/tablo/sayfa atıflı, sürüm ve yürürlük tarihli, SHA-256 kayıtlı)",
        "  ├─► IDS + bSDD sözlüğü ─► ALLPLAN 2026 yerinde kontrol (Aluplan kanalı)",
        "  │                     ─► Solibri / BIMcollab / ifctester",
        "  ├─► BIMMetraj web ön kontrolü (her yazılımdan IFC; ekip, geçmiş, EK-9 taslağı, BCF)",
        "  └─► ALLPLAN Türkiye e-PYS kiti (şablon, nitelik kataloğu, IFC dışa aktarım eşlemesi)",
      ] },
      { type: "list", items: [
        "Kural verisi koddan ayrıdır; Bakanlık düzeltme yayımladığında yalnızca veri güncellenir.",
        "Her bulgu yönetmelik maddesini, EK-9 satırını ve modeldeki GlobalId'leri taşır; ofis hatayı kendi yazılımında bulabilir.",
        "Makine ile denetlenemeyen satırlar 'Elle' olarak işaretlenir, hiçbir zaman 'uygun' gösterilmez.",
        "IFC içindeki kişisel veriler (TC kimlik, vergi no, e-posta, telefon) saklanmadan önce maskelenir.",
      ] },
    ],
  },
  {
    id: "roller",
    title: "ALLPLAN / Aluplan ve BIMMetraj rollerinin ayrımı",
    blocks: [
      { type: "table", columns: ["Bileşen", "Sahibi", "İçerik"], rows: [
        ["ALLPLAN e-PYS kiti", "Aluplan ile ortak geliştirme", "TREpys nitelik kataloğu ve Allplan → IFC Pset eşlemesi; 15 karakterli malzeme kütüphanesi; EK-3 mahal listesi ve kat yapısı; EK-4 katmanları; yönetmelikten üretilmiş IDS; proje kodu, dosya adı ve mahal kodu yardımcıları (PythonParts, önizleme ve geri alma ile)"],
        ["Yerinde kontrol", "ALLPLAN 2026", "Aynı IDS dosyasıyla Information Palette içinde doğrulama"],
        ["Web ön kontrolü ve EK-9 taslağı", "BIMMetraj", "Yazılımdan bağımsız IFC ve PDF/A ön kontrolü; ekip, sürüm farkı, kanıt kaydı"],
        ["Kural verisi", "Ortak, açık yayın önerilir", "Bakanlık yayımlarsa resmî kaynak esas alınır; yayımlamazsa doğrulanmış veri açık lisansla paylaşılır"],
        ["5D köprüsü", "BIMMetraj", "CSBPozNo kapsamı ve kanıtlı QTO miktarlarıyla metraj ve teklif"],
      ] },
      { type: "p", text: "İş birliği çerçevesinde netleşmesi gereken konular: kural verisinin sahipliği ve açık yayın lisansı, marka kullanımı, kitin dağıtımı ve güncelleme sorumluluğu, destek seviyeleri, pilot ofislerin seçimi ve ticari model." },
    ],
  },
  {
    id: "bakanlik",
    title: "Bakanlık görüşmelerinde istenmesi önerilenler",
    blocks: [
      { type: "p", text: "Önerilen pozisyon: Bakanlığın kurallarını IDS ve bSDD olarak açık yayımlamasına teknik destek. Bu, tüm yazılımların ve ofislerin aynı kuralla çalışmasını sağlar ve e-PYS'deki ret oranını düşürür." },
      { type: "list", ordered: true, items: [
        "e-PYS hangi kontrolleri otomatik çalıştıracak? Kurallar IDS veya başka bir makine-okunur biçimde yayımlanacak mı?",
        "Kabul edilecek IFC sürümü (IFC4X3_ADD2 mi?) ve model görünüm tanımı (MVD) hangisi? Dosya boyutu sınırı (EK-9 satır 1) ne olacak?",
        "Teslim öncesi doğrulama için test ortamı veya API (Elektronik Teslim Yönetmeliği m.4(3)) sağlanacak mı?",
        "TREpys_ setleri ve EK-3 mahal kısaltmaları bSDD üzerinde yayımlanacak mı?",
        "EK-7 kapsamında IFC dosyasına yazılan kişi kimlik bilgileri (TC kimlik numarası) için KVKK açısından minimizasyon veya maskeleme öngörülüyor mu?",
        "Pilot belediyeler, PDF/A kontrollerinin başlangıcı ve teknik kılavuzların (m.5(6)) yayın takvimi nedir?",
      ] },
      { type: "callout", tone: "warn", title: "Tarafsızlık", text: "Bakanlık yazılımdan bağımsız kalmak zorundadır. Katkı açık yayına ve münhasırlık iddiası olmadan yapılmalıdır; aksi halde diğer yazılım üreticilerinin itirazıyla geri teper." },
    ],
  },
  {
    id: "yol-haritasi",
    title: "Yol haritası (fazlar)",
    blocks: [
      { type: "table", columns: ["Faz", "Zaman", "Hedef ve teslimler", "Durum"], rows: [
        ["Faz 0 — Kaynak ve pozisyon", "Ekim–Aralık 2026", "Nihai RG metni ve resmî eklerin edinilmesi; makine-okunur, sürümlü kural kaynağı; mevcut ürün iddialarının düzeltilmesi; Aluplan iş birliği çerçevesi; Bakanlık soru listesi", "Büyük ölçüde tamamlandı: kural motoru ve veri (ifc-ruhsat@cd6d3ce), örneklemeli resmî ek kontrolü, ürün etiketleri ve paket açıklaması güncellendi. Kalan: tüm tabloların bağımsız kontrolü, iş birliği çerçevesi"],
        ["Faz 1 — İlk zorunluluğa hazırlık", "1 Eylül 2027'ye kadar", "PDF/A, dosya adı ve proje kodu ön kontrolü; yazılımdan bağımsız IFC ön kontrolü (beta); ALLPLAN e-PYS kiti v1 ve 2–3 pilot ofis", "IFC ön kontrolü ve EK-9 ekranı hazır (pilot şirketlerde açılacak); PDF/A kitaplığı hazır, yükleme akışı bekliyor; ALLPLAN kiti başlamadı"],
        ["Faz 2 — e-PYS açılışı", "1 Eylül 2028'e kadar", "Ekip iş akışı, revizyon farkı, EK-9 taslak çıktısı; BCF ile ALLPLAN (Bimplus Issue Manager) geri dönüşü; PythonParts yardımcıları; Bakanlık kural yayınıyla eşitlik testleri", "Planlandı"],
        ["Faz 3 — IFC'nin ilk dalgası", "1 Eylül 2029'a kadar", "Revit ve Archicad için statik eşleme şablonları; saha verisine göre Revit eklentisi değerlendirmesi; ölçekleme", "Planlandı"],
      ] },
      { type: "p", text: "İlk sürümlere kesinlikle alınmayacaklar:" },
      { type: "list", items: [
        "'e-PYS onaylı' veya 'uyumluluk garantisi' ifadeleri.",
        "Önizleme, onay, geri alma ve kayıt olmadan toplu yeniden adlandırma.",
        "Emsal veya TAKS hesaplarının bağlayıcı sonuç gibi sunulması.",
        "2029'dan önce Revit eklentisi.",
        "e-PYS'nin yerine geçen bir teslim kanalı (m.7(7)).",
      ] },
    ],
  },
  {
    id: "durum",
    title: "Uygulama durumu (13 Ekim 2026)",
    blocks: [
      { type: "table", columns: ["Yetenek", "Durum", "Not"], rows: [
        ["RG 33331 IFC ön kontrolü (EK-2/5/6/7/9)", "Hazır", "Her IFC çalıştırmasında sunucuda çalışır; ifcopenshell motoru gerektirir"],
        ["EK-9 21 satır kararları", "Hazır", "Evet / Evet (uyarıyla) / Hayır / Elle / Kısmen; makine ile denetlenemeyen satırlar asla 'Evet' olmaz"],
        ["SmartCheck ekranında EK-9 tablosu", "Hazır", "GlobalId'li bulgu ayrıntısı ve kaynak bilgisiyle"],
        ["IDS dışa aktarımı (EK-6, EK-7)", "Hazır", "ALLPLAN 2026, Solibri, BIMcollab ve ifctester ile okunabilir"],
        ["Kişisel veri maskeleme", "Hazır", "TC/VKN, e-posta ve telefon saklanmadan önce gizlenir"],
        ["PDF/A ön kontrolü", "Kitaplık hazır", "PDF/A kimliği, şifreleme, taranmış sayfa, dosya adı; tam PDF/A doğrulaması için veraPDF gerekir; yükleme akışı bekliyor"],
        ["Hızlı e-PYS kontrolü (tarayıcı)", "Güncellendi", "Sınırlı kapsam açıkça yazılı; TREpys_ParselOzellikSeti'nin beş alanı (CekmeArka dahil)"],
        ["SmartCheck canlı kullanım", "Pilot", "Sunucu tarafı IFC işleme canlıda pilot şirketlerde açılacak"],
      ] },
    ],
  },
  {
    id: "riskler",
    title: "Riskler",
    blocks: [
      { type: "table", columns: ["Risk", "Açıklama", "Önlem"], rows: [
        ["Resmî doğrulayıcı", "e-PYS kendi kontrolünü yapacak (m.5(2)); sonuçlarımız farklı çıkarsa güven kaybedilir", "Bakanlık kural yayınına göre eşitlik testleri; bulgularda madde atfı"],
        ["IFC sürümü", "Kural verisi IFC4X3 bekliyor; bazı yazılımlar bina modellerini IFC4 olarak dışa aktarıyor", "ALLPLAN ile gerçek bir modelde IFC4X3 dışa aktarım testi"],
        ["KVKK", "IFC'de kişi kimliği, malik ve parsel verisi", "Maskeleme (yapıldı), saklama süresi, Türkiye'de barındırma, aydınlatma metni"],
        ["Sorumluluk", "Yükleyen müellif sorumludur", "Raporlar 'ön kontrol' etiketli; sözleşmede sorumluluk sınırı"],
        ["Kural oynaklığı", "Taslaktan nihaiye Pset adları, proje kodu ve takvim değişti; Bakanlık ek kılavuz yayımlayacak (m.5(6))", "Sürümlü kural verisi; hangi yönetmelik sürümüne göre kontrol yapıldığı raporda"],
        ["Talep zamanlaması", "IFC zorunluluğu 2029'da başlıyor", "Önce PDF/A ve isimlendirme (2027); ALLPLAN kitiyle erken hazırlık"],
      ] },
    ],
  },
  {
    id: "5d",
    title: "5D metraj ve teklif modülüyle bağlantı",
    blocks: [
      { type: "list", items: [
        "Köprü TREpys_PozOzellikSeti.CSBPozNo ve aynı IFC dosyasıdır: ruhsat ön kontrolündeki poz kapsamı bulgusu metraj kalitesinin girdisidir.",
        "Ön kontrol bulguları hiçbir zaman otomatik fiyat kalemine dönüşmez; aktarım yalnızca kaynağı kanıtlı QTO miktarlarıyla ve 'inceleme gerekli' durumunda yapılır, birim fiyat boş gelir.",
        "Ruhsat modelini mimar, teklifi yüklenici hazırlar; paketler ayrı, ortak hikâye 'aynı model ruhsattan ihaleye' olmalıdır.",
        "ALLPLAN'ın mahal kaplamalarından ürettiği IfcCovering, ince işler metrajı için fırsattır; ölçü esasının (ÇŞB veya DIN 18350) etiketlenmesi gerekir.",
      ] },
    ],
  },
  {
    id: "adimlar",
    title: "Önümüzdeki adımlar",
    blocks: [
      { type: "list", ordered: true, items: [
        "Aluplan ile gerçek bir ALLPLAN modelinin IFC4X3 dışa aktarımını BIMMetraj ön kontrolünden geçirip bulguları birlikte incelemek.",
        "ALLPLAN e-PYS kiti v1 kapsamını ve iş birliği çerçevesini yazılı hale getirmek.",
        "Bakanlık görüşmesine 6 soruluk listeyi götürmek.",
        "Resmî eklerin kalan tablolarını bağımsız olarak kontrol etmek ve kaydını yayımlamak.",
        "PDF/A ön kontrolünü yükleme akışına bağlamak; 2–3 pilot ofisle 2027 hazırlığına başlamak.",
      ] },
    ],
  },
];

export const ROADMAP_SOURCES: DocSource[] = [
  { label: "RG 5.8.2026/33331 — Dijital Hazırlama Yönetmeliği", url: "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2.htm" },
  { label: "RG 5.8.2026/33331 — Yönetmelik ekleri (EK-1 – EK-9, taranmış PDF)", url: "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2-1.pdf", note: "SHA-256 7dc88971d3a7a8ae837ef148169fa5bf6c9ce7a01cc8fcd560ae3d342bb0ecb3" },
  { label: "RG 5.8.2026/33331 — Elektronik Teslim Yönetmeliği", url: "https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-3.htm" },
  { label: "ÇŞB taslak dokümanlar (Kasım 2025, kullanılmadı)", url: "https://webdosya.csb.gov.tr/db/meslekihizmetler/icerikler/cal-stay-taslak-dokumanlar--20251107085546-20251110130354.pdf" },
  { label: "ifc-ruhsat (MIT) — kural motoru ve ek verisi", url: "https://github.com/BerkantACUN/ifc-ruhsat", note: "BIMMetraj'a cd6d3ce commit'i ile alındı" },
  { label: "ALLPLAN 2026 özellikleri", url: "https://www.allplan.com/products/allplan-2026-features/modeling-management-collaboration/" },
  { label: "ALLPLAN 2026 sürüm notları", url: "https://www.allplan.com/system/releasenotes/2026/allplan-2026/" },
  { label: "PythonParts 2026 sürüm notları", url: "https://pythonparts.allplan.com/2026/release_notes/" },
  { label: "Allplan–Solibri issue akışı (Nemetschek)", url: "https://www.mynewsdesk.com/nemetschek-ag/pressreleases/real-time-issue-workflows-introduced-between-allplan-and-solibri-3204144" },
];
