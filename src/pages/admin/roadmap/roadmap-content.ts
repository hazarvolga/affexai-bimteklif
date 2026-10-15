import type { DocSection, DocSource } from "./doc-types";

export const ROADMAP_META = {
  title: "e-PYS ve ALLPLAN: Değerlendirme ve Geliştirici Yol Haritası",
  subtitle: "Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik (RG 5.8.2026/33331) kapsamında BIMMetraj ürün ve teknik yol haritası",
  preparedOn: "15 Ekim 2026",
  audience: "ALLPLAN Türkiye (Aluplan) ile paylaşım ve Bakanlık görüşmelerine hazırlık",
  status: "Çalışma belgesi — resmî görüş değildir. Resmî yönetmelik metinleri (#1.pdf, #2.pdf), ekler (EK-1..EK-9; Tablo 7.1–7.9 ve Tablo 9.1/9.2 dahil) ve ÇŞB 2026 birim fiyat/rayiç katalogları makine-okunur olarak mühürlenmiştir; gerçek proje saha ve yetkili mühendis kabulü sıradadır.",
};

export const ROADMAP_SECTIONS: DocSection[] = [
  {
    id: "ozet",
    title: "Yönetici özeti",
    blocks: [
      { type: "p", text: "5 Ağustos 2026 tarihli ve 33331 sayılı Resmî Gazete'de iki yönetmelik yayımlandı: projelerin dijital olarak nasıl hazırlanacağını düzenleyen Dijital Hazırlama Yönetmeliği (yürürlük 1 Eylül 2027) ve teslim, inceleme ve onay süreçlerini e-PYS üzerinden yürüten Elektronik Teslim Yönetmeliği (yürürlük 1 Eylül 2028). IFC/BIM teslimi kademeli olarak 1 Eylül 2029'da başlıyor." },
      { type: "list", items: [
        "Kazanılacak konum 'en iyi kontrol aracı' olmak değil; doğrulanmış, sürümlü ve makine-okunur yönetmelik verisine (EK-1..EK-9; Tablo 7.1–7.9 ve Tablo 9.1/9.2 dahil) sahip olup bu veriyi her ortama dağıtmaktır.",
        "ALLPLAN 2026 IDS doğrulamasını kendi içinde yapabildiği için ALLPLAN tarafındaki değer bir 'e-PYS kiti'dir: TREpys nitelik kataloğu, IFC dışa aktarım eşlemesi, m.13(3) Malzeme İsmi_Dayanım + 15 karakter kuralına uygun malzeme kütüphanesi, EK-3 mahal listesi ve yönetmelikten üretilmiş IDS dosyası (/api/smartcheck/epys-allplan-kit).",
        "BIMMetraj'ın rolü yazılımdan bağımsız iş akışıdır: her yazılımdan gelen IFC için ön kontrol, disipline göre EK-9 taslağı (Mimari Tablo 9.1 — 21 satır; Diğer Disiplinler Tablo 9.2 — 16 satır), ekip ve sürüm geçmişi, kanıt kaydı ve 5D metraj/teklif köprüsü (TREpys_PozOzellikSeti + IfcCovering + CSB_2026_V1 Minha).",
        "İlk zorunluluk 2B tarafında: 1 Eylül 2027'den itibaren büyük şehirlerde 5.000 m² üstü projelerde PDF/A, ISO 216 A4 katları pafta boyutu (m.8(1)) ve çizim paftalarında tek pafta düzeni (m.8(2)). En yakın ödeme isteği burada.",
        "e-PYS uygunluğu kendisi inceler (Elektronik Teslim Yönetmeliği m.5(2)). Ürünün en önemli teknik hedefi, sonuçlarını resmî kontrolle eşit tutmaktır; bu da Bakanlığın kuralları makine-okunur yayımlamasına bağlıdır.",
      ] },
      { type: "callout", tone: "ok", title: "15 Ekim 2026 itibarıyla hazır olanlar", text: "RG 33331 nihai metinleri (#1.pdf, #2.pdf) ve eklerine (EKLER.pdf) dayalı tam kapsamlı IFC ön kontrolü (EK-1 6 haneli proje kodu, EK-2 Tablo 2.1–2.14, EK-3 ~130 mahal sözlüğü, EK-5/6/7 Tablo 7.1–7.9 IfcAnnotation dahil, EK-9 Tablo 9.1 Mimari 21 satır + Tablo 9.2 Diğer Disiplinler 16 satır), IDS dışa aktarımı, ALLPLAN 2026 e-PYS Kiti v1 indirme uç noktası, TREpys_PozOzellikSeti + IfcCovering 5D metraj/teklif köprüsü, TS 500 Yapısal Metraj Sihirbazı + Kiriş–Döşeme Kesişim Düşüm Motoru, CSB_2026_V1 Minha motoru, ÇŞB 2026 resmî PDF katalog mühürleme (570 onaylı poz/rayiç), PDF/A ön kontrol akışı (ISO 216 pafta boyutu m.8(1), tek pafta kuralı m.8(2) ve e-imza m.6(1)-(2) dahil) ve sunucu korumalı v6 paket kataloğu canlıdadır. Ayrıntılar 'Uygulama durumu (15 Ekim 2026)' bölümündedir." },
    ],
  },
  {
    id: "mevzuat",
    title: "Mevzuat çerçevesi (doğrulanmış)",
    blocks: [
      { type: "table", columns: ["Yönetmelik", "Kapsam", "Yürürlük"], rows: [
        ["Mimarlık ve Mühendislik Projelerinin Dijital Olarak Hazırlanması Hakkında Yönetmelik (#1.pdf)", "Projelerin üretim biçimi: PDF/A ve ISO 216 A4 katları pafta boyutu (m.7–8), IFC4X3 (TS EN ISO 16739-1, m.10), isimlendirme (EK-1–EK-5), IFC sınıf ve özellikleri (EK-5, EK-6), proje ve kot bilgileri (EK-7 Tablo 7.1–7.9), gelişim seviyeleri (EK-8), model kalite kontrol formu (EK-9 Tablo 9.1 & 9.2)", "1 Eylül 2027"],
        ["Mimarlık ve Mühendislik Projelerinin Elektronik Ortamda Teslimi ve Yönetilmesi Hakkında Yönetmelik (#2.pdf)", "Teslim, 5070 sayılı Kanuna uygun güvenli elektronik imza (m.6), inceleme, eksiklik bildirimi, onay ve saklama süreçlerinin e-PYS üzerinden yürütülmesi", "1 Eylül 2028"],
      ] },
      { type: "p", text: "Kademeli geçiş takvimi (Dijital Hazırlama Yönetmeliği Geçici Madde 1):" },
      { type: "table", columns: ["Format", "Kapsam", "Tarih"], rows: [
        ["PDF/A", "Nüfusu 2 milyonu aşan illerin nüfusu 600 bini aşan belediyeleri, 5.000 m² üstü yapılar (Geçici m.1(1)(a))", "1 Eylül 2027"],
        ["PDF/A", "Diğer tüm yapılar (Geçici m.1(1)(b))", "1 Mart 2029"],
        ["IFC (BIM)", "Nüfusu 2 milyonu aşan il, 600 bini aşan belediye, 10.000 m² üstü (Geçici m.1(1)(c))", "1 Eylül 2029"],
        ["IFC (BIM)", "Nüfusu 2 milyonu aşan il, 400 bini aşan belediye, 10.000 m² üstü (Geçici m.1(1)(ç))", "1 Eylül 2030"],
        ["IFC (BIM)", "Nüfusu 1 milyonu aşan il, 300 bini aşan belediye, 10.000 m² üstü (Geçici m.1(1)(d))", "1 Eylül 2031"],
        ["IFC (BIM)", "Diğer tüm yapılar (Geçici m.1(1)(e))", "1 Eylül 2032"],
        ["—", "Konut ve konut+ticaret karma dışındaki yapılar (Geçici m.1(2))", "1 Eylül 2033'e kadar uygulanmaz"],
      ] },
      { type: "list", items: [
        "Kapsam dışı (m.2(2)-(3)): bodrum hariç en çok iki katlı ve toplam inşaat alanı 200 m²'yi geçmeyen müstakil yapılar, entegre tesis niteliğinde olmayan tarım/hayvancılık yapıları, uygulama imar planı bulunmayan alanlar.",
        "Geçiş tarihlerinden önce yapılan başvurular ve ihale kararı/tarihi önce olan kamu işleri muaftır (Geçici m.1(3)-(4)).",
        "Bir yapı grubunda IFC zorunlu olduğunda o grup için ayrı PDF/A yükümlülüğü kalkar (Geçici m.1(5)); modelden üretilen paftalar yine PDF/A olarak verilir (m.10(2)).",
      ] },
      { type: "p", text: "Elektronik Teslim Yönetmeliği'nin (#2.pdf) ürün tasarımını doğrudan etkileyen maddeleri:" },
      { type: "table", columns: ["Madde", "Hüküm", "Ürüne etkisi"], rows: [
        ["m.4(3)", "Kamu kurumlarının yazılım platformları ile e-PYS arasında proje dosyası ve bilgi paylaşımı yapılır.", "Teslim öncesi doğrulama için bir API/test ortamı talep edilebilir."],
        ["m.4(4)", "Bina türleri, kriterler, yükleme formatları ve başlangıç tarihlerini belirlemeye Bakanlık yetkilidir.", "Kural verisi sürümlü olmalı; Bakanlık duyuruları izlenmeli."],
        ["m.4(5), m.7(1)", "İdare sayısal veriyi üçüncü kişilere devredemez; sistemden elde edilen bilgi üçüncü kişilere aktarılamaz.", "Ürün e-PYS verisine erişim iddia etmez; müellifin kendi modelini işler."],
        ["m.5(2)", "Bilgilerin doğruluğundan kaydı yapan müellif sorumludur; dosyalar yönetmeliğe uygunluk açısından incelenir, hata varsa tekrar yükleme istenir.", "Raporlarımız 'ön kontrol'dür; resmî karar e-PYS ve idarenindir."],
        ["m.6(1)-(2)", "Proje müellifleri ve yapı denetim kuruluşları belgeleri 5070 sayılı Elektronik İmza Kanununa uygun güvenli elektronik imza ile imzalar.", "PDF/A ön kontrolünde gömülü dijital imza (/Sig) varlığı bilgi notu olarak raporlanır."],
        ["m.6(4)", "Kâğıda yazdırılıp taranarak oluşturulan PDF'ler kullanılamaz.", "PDF/A ön kontrolünde taranmış sayfa tespiti yapılır."],
        ["m.7(7)", "Bu Yönetmelik kapsamındaki işlemler için e-PYS dışında elektronik ortam kullanılamaz.", "Ürün bir teslim kanalı değildir; teslimden önceki hazırlık katmanıdır."],
      ] },
    ],
  },
  {
    id: "taslak-nihai",
    title: "Taslak ile nihai metin arasındaki farklar",
    blocks: [
      { type: "p", text: "Kasım 2025 taslağı ve ekleri piyasada hâlâ dolaşıyor. Kural verisi yalnızca nihai RG metinleri (#1.pdf, #2.pdf) ve resmî eklere (EKLER.pdf / 20260805-2-1.pdf, 241 sayfa) dayanmalıdır." },
      { type: "table", columns: ["Konu", "Taslak (Kasım 2025)", "Nihai (RG 33331 — #1.pdf, #2.pdf, EKLER.pdf)"], rows: [
        ["Yürürlük", "1 Ekim 2026", "1 Eylül 2027 (e-PYS teslim: 1 Eylül 2028; IFC kademeli: 2029–2033)"],
        ["Proje kodu ve dosya adı", "Yıl, il, ilçe, mahalle, ada, parsel, durum alanları alt tire ile", "EK-1: 6 karakterli proje kodu; EK-2 (m.6): 9 alanlı dosya adı, alt tire ayraçlı (ör. 260001_00_MM_GNEL_PL_MMC_K00_01_000)"],
        ["2B Pafta kuralları", "Genel PDF/A ifadesi", "m.8(1): ISO 216 A4 ve katları pafta boyutu; m.8(2): her pafta ayrı PDF/A dosyası (rapor/hesap/bilgi paftaları hariç)"],
        ["Özel özellik setleri ve 5D Poz", "Tr_Pset_CSB (PozNo zorunlu gibi yorumlanıyordu)", "EK-6 Tablo 6.55: TREpys_ParselOzellikSeti (TAKS, KAKS, CekmeOn, CekmeYan, CekmeArka); Tablo 6.60: TREpys_EmsalOzellikSeti (EmsalDurumu: DAHIL / HARIC / DIGER). ÇŞB PozNo ruhsat eklerinde zorunlu değildir; 5D maliyet köprüsü için TREpys_PozOzellikSeti / Tr_Pset_CSB ile desteklenir"],
        ["Malzeme adlandırma", "Taslak m.12 (15 karakter sınırı)", "Nihai #1.pdf m.13(3): Malzeme İsmi_Dayanım formatı (alt tire ayraçlı); ALLPLAN/CAD şablon uyumu için ayrıca 15 karakter kontrolü"],
        ["Zorunlu sınıflar ve EK-7", "Taslak EK-5 ve Tablo 7.1–7.8", "EK-5 Tablo 5.1: 69 zorunlu sınıf; Tablo 5.2: 67 isteğe bağlı sınıf; EK-6 Tablo 6.1–6.68; EK-7 Tablo 7.1–7.9 (Tablo 7.9 IfcAnnotation SURVEY dahil)"],
        ["EK-9 Kalite Kontrol Formu", "Tek tablo (~23 satır)", "İki ayrı tablo: Tablo 9.1 (Mimari, 21 satır) ve Tablo 9.2 (Diğer Disiplinler: Statik/Mekanik/Elektrik vb., 16 satır)"],
      ] },
      { type: "callout", tone: "ok", title: "Tamamlanan resmî PDF doğrulaması", text: "Bakanlıktan gelen nihai #1.pdf, #2.pdf ve EKLER.pdf (241 sayfa, SHA-256 7dc88971…0ecb3) dosyalarının tamamı incelenmiş; EK-6 Tablo 6.1–6.68, EK-7 Tablo 7.1–7.9 (IfcAnnotation dahil) ve EK-9 Tablo 9.1 (21 satır) ile Tablo 9.2 (16 satır) makine-okunur kural motoruna birebir işlenmiştir." },
    ],
  },
  {
    id: "teknik-talep",
    title: "Yönetmeliğin teknik talepleri (tasarım ofisi açısından)",
    blocks: [
      { type: "table", columns: ["Ek / Madde", "Talep", "Makine ile denetlenebilirlik"], rows: [
        ["EK-1, EK-2 (m.6)", "6 haneli proje kodu (IfcProject.Name = dosya adı öneki) ve 9 alanlı dosya adı; disiplin, alt disiplin, tür, tip ve kat kodları (Tablo 2.1–2.14)", "Tam (şablon ve tüm kod sözlükleri aktif)"],
        ["m.8(1)-(2) & Teslim Yön. m.6", "PDF/A formatı, ISO 216 A4 ve katları sayfa boyutu, çizim paftalarında tek pafta düzeni, taranmış PDF yasağı ve güvenli e-imza (/Sig)", "Tam (PAFTA_BOYUTU_ISO216, COKLU_PAFTA_DUZENI, TARANMIS_SAYFA_OLASI ve eSignature kontrolleri aktif)"],
        ["EK-3 (m.11)", "Mahal numarası (Kat_Fonksiyon_Sıra) ve mahal adı kısaltmaları (Tablo 3.1–3.2)", "Tam (şablon ve ~130 resmî mahal adı/kısaltması sözlüğü aktif)"],
        ["EK-5 (m.12, m.14)", "Eleman adı Disiplin-Kategori-Açıklama (m.12(3)); zorunlu IFC sınıfları; üst sınıf ve IfcBuildingElementProxy yasağı (m.14)", "Tam"],
        ["m.13(3)", "Malzeme adı Malzeme İsmi_Dayanım formatı ve 15 karakter CAD şablon sınırı", "Tam"],
        ["EK-6", "Her zorunlu sınıf için zorunlu öznitelik ve Pset özellikleri (Tablo 6.1–6.68)", "Tam (IDS ile de ifade edilebilir)"],
        ["EK-7 (m.10)", "IfcProject, kişi, kurum, rol, IfcProjectedCRS, IfcMapConversion, IfcGeometricRepresentationContext ve IfcAnnotation SURVEY (Tablo 7.1–7.9)", "Tam"],
        ["EK-8 (m.16)", "Uygulama projesi aşamasında asgari LOD 300", "Makine ile denetlenemez — elle değerlendirme"],
        ["EK-9 (m.17)", "Mimari için Tablo 9.1 (21 satır), diğer disiplinler için Tablo 9.2 (16 satır) Model Kalite Kontrol Formu", "Disipline göre otomatik tablo seçimi; dosya boyutu, LOD ve PDF–IFC tutarlılığı elle"],
        ["Emsal (m.15, EK-6 Tablo 6.60)", "IfcSpatialZone + TREpys_EmsalOzellikSeti.EmsalDurumu (DAHIL / HARIC / DIGER)", "Tam (alan toplamları otomatik; plan notu yorumu elle)"],
      ] },
    ],
  },
  {
    id: "yazilim",
    title: "Yazılım ekosistemi ve ALUPLAN / ALLPLAN 2026 analizi",
    blocks: [
      { type: "table", columns: ["Yazılım / Araç", "e-PYS açısından güçlü yön", "Dikkat edilecek nokta"], rows: [
        ["ALLPLAN 2026 + ALUPLAN Sihirbazları", "IDS desteği tam sürümde; Information Palette içinde canlı IDS doğrulama; 300+ bSDD sözlüğüne erişim; mahal kaplamalarından otonom IfcCovering üretimi; PythonParts (Python 3.13) ve ALUPLAN Sihirbazları ile 15 karakter malzeme + EK-5 isimlendirme otomasyonu; Solibri ve Bimplus ile issue akışı", "Bina modellerinin IFC4X3 (IFC 4.3) dışa aktarımının gerçek bir projede yönetmeliğe karşı test edilmesi gerekir"],
        ["Autodesk Revit", "Pazar payı yüksek; IFC dışa aktarımı ve kullanıcı tanımlı Pset dosyaları", "TREpys setleri için shared parameter ve DefaultUserDefinedParameterSets eşlemesi elle kurulur; otonom IfcCovering üretimi olmadığından kaplama katmanları ek iş yükü doğurur; IfcPlate gibi listede olmayan sınıflar çıkabilir"],
        ["Graphisoft Archicad", "Özellik yöneticisi ve IFC çevirmenleri", "Yerel şablonların ve TREpys eşlemelerinin ofis içinde elle hazırlanması gerekir"],
        ["Solibri / BIMcollab", "IDS ile kural denetimi", "Türkiye'ye özgü kurallar ancak yayımlanan IDS ile çalışır"],
        ["ifc-ruhsat (açık kaynak, MIT)", "Nihai eklerden çıkarılmış kural verisi, CLI/MCP, IDS ve EK-9 üretimi", "BIMMetraj kural motorunu bu projeden atıfla almış ve EK-1 proje kodu, EK-2 Tablo 2.3–2.14, EK-3 Tablo 3.2 (~130 mahal) ve EK-7 Tablo 7.8 sözlükleriyle genişletmiştir"],
      ] },
      { type: "table", columns: ["e-PYS / 5D BIM Kriteri (RG 33331)", "ALLPLAN 2026 + ALUPLAN Çözümü", "Geleneksel BIM Yaklaşımı", "Mühendislik Zaman Etkisi"], rows: [
        ["İnce işler kaplama modellemesi (EK-6 IfcCovering)", "Mahal (IfcSpace) tanımından tavan/zemin/duvar IfcCovering katmanlarını tek tıkla otonom üretir", "Her oda için ayrı döşeme/duvar/tavan katmanı elle modellenir veya metraj dışı kalır", "~%80 modelleme süresi tasarrufu"],
        ["EK-5 varlık adlandırma (Disiplin-Kategori-Açıklama) ve 15 kr. malzeme sınırı", "ALUPLAN Sihirbazı ve nitelik şablonu ile otomatik kodlama ve karakter sınırı denetimi", "Tek tek elle yeniden adlandırma veya harici Dynamo/Grasshopper betikleri", "Yüzlerce saatlik manuel veri girişi hatasını önler"],
        ["TREpys_* özellik setleri ve ÇŞB Poz No (TREpys_PozOzellikSeti)", "Nitelik Yöneticisi + Ön Tanımlı IFC4X3 Pset eşleme tablosuyla doğrudan dışa aktarım", "Shared Parameters + TXT mapping dosyalarının her projede elle eşleştirilmesi", "Sıfır veri kaybı ile doğrudan 5D metraj köprüsü"],
        ["Teslim öncesi öz-denetim (EK-9 Tablo 9.1)", "ALLPLAN Information Palette içinde canlı IDS kontrolü + BIMMetraj web EK-9 ön kontrolü", "IFC dışa aktarım sonrası harici yazılımda kontrol ve tekrar modele dönüp düzeltme", "Denetim döngüsünü günlerden dakikalara indirir"],
      ] },
      { type: "callout", tone: "info", text: "Önerilen yaklaşım yazılımdan bağımsızdır: teslim edilen nesne her durumda IFC'dir. ALLPLAN kullanıcıları için ALUPLAN kiti ve yerinde IDS kontrolü, diğer yazılımlar için şablon dosyaları ve BIMMetraj web ön kontrolü." },
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
        ["5D köprüsü", "BIMMetraj", "TREpys_PozOzellikSeti.PozNo kapsamı, IfcCovering kaplama alanı (m²) ve kanıtlı QTO miktarlarıyla metraj ve teklif"],
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
        ["Faz 0 — Kaynak ve pozisyon", "Ekim–Aralık 2026", "Nihai RG metni ve resmî eklerin edinilmesi; makine-okunur, sürümlü kural kaynağı; mevcut ürün iddialarının düzeltilmesi; Aluplan iş birliği çerçevesi; Bakanlık soru listesi", "Tamamlandı: kural motoru ve veri (ifc-ruhsat + EK-1 + EK-2 Tablo 2.3–2.14 + EK-3 Tablo 3.2 ~130 mahal + EK-7 Tablo 7.8), TREpys_PozOzellikSeti/EmsalOzellikSeti + IfcCovering çıkarımı, ALLPLAN 2026 e-PYS Kiti v1 ve ÇŞB 2026 resmî PDF katalog mühürleme altyapısı devreye alındı"],
        ["Faz 1 — İlk zorunluluğa hazırlık", "1 Eylül 2027'ye kadar", "PDF/A, dosya adı ve proje kodu ön kontrolü; yazılımdan bağımsız IFC ön kontrolü (beta); ALLPLAN e-PYS kiti v1 ve 2–3 pilot ofis", "IFC/EK-9, PDF/A ön kontrolü, TS 500 Yapısal Metraj Sihirbazı, CSB_2026_V1 Minha motoru ve ALLPLAN 2026 e-PYS Kiti v1 canlıda. Gerçek proje uzman kabulü ve 2–3 pilot ofis saha doğrulaması sırada"],
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
    title: "Uygulama durumu (15 Ekim 2026)",
    blocks: [
      { type: "table", columns: ["Yetenek", "Durum", "Not"], rows: [
        ["RG 33331 IFC ön kontrolü (EK-1/2/3/5/6/7/9)", "Hazır (Tam Kapsam)", "EK-1 6 haneli proje kodu–dosya adı eşleşmesi, EK-2 Tablo 2.1–2.14, EK-3 Tablo 3.1–3.2 (~130 mahal), EK-5 (69 zorunlu + 67 isteğe bağlı sınıf), EK-6 (Tablo 6.1–6.68) ve EK-7 Tablo 7.1–7.9 (IfcAnnotation SURVEY dahil) sunucuda çalışır; tarayıcı ön analizinde de IFCMATERIAL (m.13(3)) ve IFCSPACE (EK-3 m.11) doğrudan denetlenir"],
        ["EK-9 Tablo 9.1 (21 satır) & Tablo 9.2 (16 satır) kararları", "Hazır", "Mimari disiplin (MM) için Tablo 9.1 (21 satır), diğer disiplinler (ST, MK, EE vb.) için Tablo 9.2 (16 satır) otomatik seçilir; Evet / Evet (uyarıyla) / Hayır / Elle / Kısmen kararları GlobalId'li bulgu ayrıntısıyla üretilir"],
        ["TREpys_PozOzellikSeti, TREpys_EmsalOzellikSeti ve IfcCovering çıkarımı", "Hazır", "IfcOpenShell çıkarıcısı TREpys_PozOzellikSeti poz kodlarını ve IfcCovering kaplama alanlarını (m²) SmartCheck kanıt satırlarına ve teklif aktarımına taşır; DAHIL/HARIC/DIGER (ve eski YUZDE30) emsal alanlarını toplar"],
        ["IDS dışa aktarımı ve ALLPLAN 2026 e-PYS Kiti v1", "Hazır", "ALLPLAN 2026 için SHA-256 mühürlü TREpys nitelik kataloğu, EK-2/EK-3/EK-5 sözlükleri ve m.13(3) + 15 karakter uyumlu malzeme kütüphanesi (/api/smartcheck/epys-allplan-kit) indirilebilir durumda"],
        ["3×3 kural paketi + IFC özellik girdileri", "Hazır", "LoadBearing, IsExternal/ExposureClass, Cover (paspayı), Disiplin ve ExpectedVolume IFC'den kural motoruna uçtan uca aktarılır"],
        ["TS 500 Yapısal Metraj Sihirbazı (E-7), Kiriş–Döşeme Kesişimi ve CSB_2026_V1 Minha Motoru (E-8)", "Hazır", "Kolon/kiriş/döşeme/temel beton-kalıp-donatı hesabı, kiriş–döşeme kesişim hacmi/yan kalıp düşümü (computeBeamSlabIntersectionDeduction) ve ÇŞB ölçü esaslarına (0,50 / 2,00 / 1,00 m² eşikleri + söve/yan yüzey) göre boşluk düşümü canlıda"],
        ["Reviewer disiplin yetkisi (E-9) ve Runtime DB rol ayrımı (P1-1)", "Hazır", "Sunucu inceleyenin disiplin kapsamını (STR/ARC/MEP/ALL) doğrular; uygulama teklifpro_app (NOBYPASSRLS) rolüyle, migration teklifpro_migrator rolüyle çalışır"],
        ["ÇŞB 2026 Resmî PDF Katalog Mühürleme & Gece Fiyat Takip Mimarisi", "Hazır", "Yüksek Fen Kurulu 2026 PDF/CSV katalogları SHA-256 ile mühürlenerek içe aktarılır; her gece 03:00'te TCMB/TÜİK/resmî sayfa taraması ve fiyat farkı simülasyonu çalışır"],
        ["Paket Kataloğu v6, 4 Dönemli Havale/EFT İskontosu & Abone Göçü", "Hazır", "Sunucu RAM/CPU korumalı v6 kotaları (25–85 MB IFC, 1–2 eşzamanlı işlem), rakip kalibrasyonlu fiyatlar (0 / 1.250 / 2.950 / 5.450 / 8.900 ₺), Aylık %0 / 6 Aylık %10 / 1 Yıllık %20 / 2 Yıllık %30 taahhüt iskontosu ve pasife alınan paketlerdeki aboneleri alternatif pakete atomik taşıma canlıda"],
        ["Kişisel veri maskeleme ve PDF/A + Pafta + e-İmza ön kontrolü", "Kurum içi pilotta canlı", "TC/VKN/e-posta/telefon maskelenir; 2B PDF teslim dosyalarında PDF/A kimliği, şifreleme, taranmış sayfa (m.6(4)), ISO 216 A4 katları pafta boyutu (m.8(1)), çizim paftalarında tek pafta düzeni (m.8(2)), gömülü e-imza (/Sig, m.6(1)-(2)) ve EK-2 dosya adı denetlenir"],
        ["Gerçek proje saha/mühendislik kabulü", "Sıradaki Odak", "Temsilî gerçek IFC/PDF dosyalarıyla bağımsız uzman kabulü ve 2–3 pilot ofis saha doğrulaması sırada"],
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
        "Köprü TREpys_PozOzellikSeti.PozNo ve aynı IFC dosyasıdır: eleman üzerindeki resmî ÇŞB poz numarası SmartCheck kanıt satırlarına (normalizedPositionCode) doğrudan taşınır.",
        "Ön kontrol bulguları hiçbir zaman otomatik fiyat kalemine dönüşmez; aktarım yalnızca kaynağı kanıtlı QTO/Pset miktarlarıyla ve 'inceleme gerekli' durumunda yapılır, birim fiyat onaylı katalog eşleşmesiyle tamamlanır.",
        "Ruhsat modelini mimar, teklifi yüklenici hazırlar; paketler ayrı, ortak hikâye 'aynı model ruhsattan ihaleye' olmalıdır.",
        "ALLPLAN'ın mahal kaplamalarından otonom ürettiği IfcCovering elemanları (Qto_CoveringBaseQuantities.NetArea/GrossArea), m² birimiyle ince işler kanıt satırlarına ve teklif taslağına aktarılır; boşluk düşümleri CSB_2026_V1 Minha motoruyla izlenebilir olarak hesaplanır.",
      ] },
    ],
  },
  {
    id: "adimlar",
    title: "Sıradaki geliştirmeler ve kabul ölçütleri",
    blocks: [
      { type: "p", text: "Aşağıdaki tablo teknik borç ve geliştirme adımlarının güncel durumunu gösterir. Kod ve otomatik testleri tamamlanan maddeler işaretlenmiş olup, saha/uzman kabulü gerektiren maddeler açık tutulmuştur." },
      { type: "table", columns: ["Sıra / İş", "Durum", "Uygulama ve tamamlanma ölçütü"], rows: [
        ["1 — Runtime DB rolü (P1-1)", "Tamamlandı (14 Ekim 2026)", "Uygulama ve worker teklifpro_app (NOBYPASSRLS) rolüyle çalışır; şema değişiklikleri yalnızca teklifpro_migrator rolüyle yürütülür (scripts/db-Separation.sql ve başlangıç doğrulaması aktif)"],
        ["2 — Reviewer disiplin kapsamı (E-9)", "Tamamlandı (14 Ekim 2026)", "Sunucu (src/server/smartcheck/review.ts), inceleyenin tenant ve disiplin yetkisini (STR, ARC, MEP, ALL) her kararda doğrular; yetkisiz/belirsiz disiplin için onay 403 ile reddedilir ve denetim kaydına bağlanır"],
        ["3 — IFC özellik girdileri (3×3)", "Tamamlandı (14 Ekim 2026)", "workers/ifc/ifc_extract.py ve ifc-python-runner.ts; LoadBearing, IsExternal, ExposureClass, Cover (mm), Disiplin ve ExpectedVolume alanlarını Pset/QTO kanıt yoluyla 3×3 kural motoruna taşır"],
        ["4 — Gerçek proje kabulü ve kural kanıtı", "Sırada (Saha Kabulü)", "İzinli temsilî gerçek IFC/PDF, referans miktar/karar, dosya özeti, kural sürümü, beklenen/gerçek sonuç ve uzman değerlendirmesi birlikte kaydedilir"],
        ["5 — Donatı, kalıp ve kiriş–döşeme kesişim motoru (E-7)", "Tamamlandı (15 Ekim 2026)", "TS 500 Yapısal Metraj Sihirbazı ve computeBeamSlabIntersectionDeduction (src/smartcheck/rules/minha.ts) kolon, kiriş, döşeme ve temel için beton, kiriş–döşeme ortak hacim/kalıp düşümü ve donatı/etriye boy-kütle hesabını net miktar ve fire ayrımıyla üretir"],
        ["6 — Ölçü esası / minha (E-8)", "Tamamlandı (14 Ekim 2026)", "Sözleşmesel ölçü esası motoru (src/smartcheck/rules/minha.ts — CSB_2026_V1) duvar (0,50 m²), sıva/boya (2,00 m² + söve/yan yüzey eklemesi) ve kalıp (1,00 m²) boşluk düşümlerini brüt miktarı bozmadan izlenebilir olarak hesaplar"],
        ["7 — ALLPLAN e-PYS kiti v1", "Tamamlandı (14 Ekim 2026)", "SHA-256 mühürlü TREpys nitelik kataloğu, IFC4X3 eşlemesi, 15 kr. malzeme kütüphanesi, EK-2/EK-3/EK-5 sözlükleri (src/smartcheck/epys-allplan-kit.ts ve /api/smartcheck/epys-allplan-kit) üretildi; gerçek ALLPLAN 2026 dışa aktarımıyla saha kabulü yapılacak"],
        ["8 — Paket kataloğu v6, 4 dönemli iskonto ve abone göçü", "Tamamlandı (15 Ekim 2026)", "Tek VPS kapasite korumalı v6 paket kataloğu (bimmetraj-2026-10-15-v6), Aylık %0 / 6 Aylık %10 / 1 Yıllık %20 / 2 Yıllık %30 Havale/EFT dönem iskontosu ve paket pasife alma sırasında aktif aboneleri alternatif pakete atomik aktarma canlıya alındı"],
        ["9 — Faz 2–3 entegrasyonları", "Planlandı", "BCF/Bimplus, revizyon farkı, PythonParts ve diğer yazılım şablonları pilot ihtiyaçlarına göre devreye alınır"],
      ] },
      { type: "callout", tone: "info", title: "Her geliştirmede güncellenecek mühendis inceleme kaydı", text: "Yol haritası durumuyla Hesaplama Yöntemleri birlikte güncellenir: uygulanan yöntem, girdiler/birimler, formül ve kaynak, varsayımlar, geçersiz/eksik girdi davranışı, kapsam dışı durumlar ve referans testler görünür olur. Uzman kabulü ayrı kanıt gerektirir; sayfa güncellemesi veya test başarısı mühendis onayı değildir." },
      { type: "list", items: [
        "Dış girdiler: temsilî müşteri dosyaları ve kullanım izni, yetkili uzman değerlendirmesi, Aluplan iş birliği kapsamı ve Bakanlık görüşmesi bu geliştirmelerle paralel yürütülür.",
        "2–3 pilot ofise genişleme, kurum içi pilot bulguları değerlendirilip tenant başına yetki ve kota doğrulandıktan sonra ele alınır.",
        "ÇŞB/YFK 2026 resmî PDF katalogları (/admin/pricing-sources) SHA-256 mühürlü olarak sisteme dahil edilmiştir; otomatik gece takipçisi resmi duyuru ve makro endeks değişimlerini izler.",
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
