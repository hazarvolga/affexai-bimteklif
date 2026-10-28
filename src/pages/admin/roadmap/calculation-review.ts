/** Review snapshot, not an approval registry. Bump the version when methods or evidence change. */
export const CALC_REVIEW_META = {
  version: "BIM-CALC-2026-10-29.1",
  updatedOn: "29 Ekim 2026",
  implementationBaseline: "22743d8a3cd506dd97b6c9206e87ea63e5b6d22e",
  approvalStatus: "Rev. 119 firma hızlı düzenleme önizlemesi geliştirme kaydıdır; snapshot eski olabilir, sunucu eşzamanlılık kilidi yoktur, canlı kabul ayrıca doğrulanır ve hesap formülleri değişmedi. Rev. 118 yerel geliştirme kaydıdır; gerçek müşteri golden verisi, bağımsız uzman ve canlı kabul yoktur. Sentetik yedek denemesi canlı geri yükleme kanıtı değildir. Rev. 117 firma iş akışları geliştirme kaydıdır; canlı dağıtım ve müşteri veya bağımsız uzman kabulü ayrıca doğrulanmalıdır. Rev. 116 operasyon görünürlüğü geliştirme kaydıdır; banka mutabakatı, çalışan OCI kimliği, yedek ve geri yükleme ile canlı dağıtım ve bağımsız kabul doğrulanmadı. Plan ve abonelik önce/sonra önizlemesi, maskeli banka farkı ve kayıpsız audit cursor geliştirildi; snapshot eskimesi uyarılır, sunucu eşzamanlılık kilidi yoktur. Audit eski saat dilimi bilinmiyor. Rev. 115 erişim ve tenant izolasyonu geliştirme kaydıdır; canlı admin ve plan doğrulaması, MFA, oturum iptali ve bağımsız kabul açıktır. Rev. 114 kaynak izi ve fiyat belirsizliği geliştirme kaydıdır; üretim dağıtımı, müşteri veya bağımsız uzman kabulü ayrı doğrulanmalıdır. Geçmiş sıfır override kökeni ayrıştırılamayabilir. Rev. 113, Faz 1 kaynak ve karar güvenliği için yerel geliştirme kaydıdır; üretime dağıtımı veya bağımsız mühendis onayını göstermez. Eski ve kaynağı belirsiz kayıtların toplu onarımı doğrulanmadı; AI imza kanıtı çıktının doğruluğunu veya uzman onayını garanti etmez. Rev. 112 geliştirme kaydı f653d58 temel commit üzerindedir; değişiklik ve dağıtım durumu Git geçmişi ile canlı sistemden ayrıca doğrulanır, bu ifade uzman onayı değildir. KİK ön proje istisnasındaki ilan ve ihale kaynağı kullanıcı beyanıdır; sistem tarafından doğrulanmaz. Rev. 111 (Kaynak IFC · 3B İnceleme panelinde Retina tuval taşmasının giderilmesi, en-boy duyarlı model merkezleme, Döndür/Kaydır Pan modu, Üst/Ön/Sağ/İzometrik kamera açıları, Seçime Odakla, Kat Kesiti Z-Clipping sürgüsü, Tel Kafes ve Tam Ekran/Geniş/Daralt kontrolleri; metraj ve maliyet formülleri değişmedi), Rev. 110 (Kaynak IFC · 3B İnceleme WebGL görüntüleyicisinin web-ifc.wasm WebAssembly modülünü derleyebilmesi için Content-Security-Policy script-src direktifine W3C CSP Level 3 'wasm-unsafe-eval' izninin eklenmesi ve JavaScript 'unsafe-eval' engelinin korunması; hesap formülleri değişmedi), Rev. 109 (Firma Profili /admin/tenants/:companyId içindeki Firma Kullanıcıları tablosuna Şirket Rolü seçicisi + Super Admin kontrollü UZMAN Önizleme Yetkisi anahtarı eklenmesi, Uzman Önizlemesi /app/uzman-onizleme ve CalculationFeedback doğrulama kartlarının yalnız UZMAN yetkililere sınırlandırılması ve 4 hesaplayıcının standart araç olarak tüm kullanıcılara açık tutulması; hesap formülleri değişmedi), Rev. 108 (Yeni Teklif ekranında Excel/CSV araç çubuğunun tablo üstüne taşınması, Seçenek C hibrit piyasa rayiç düzeni ve YAMBİS ile Kat Karşılığı/KDV hesaplayıcılarının L2 Pilot statüsüyle son kullanıcı sınamasına açılması; hesap formülleri değişmedi), Rev. 107 (Yeni Teklif ekranında generateWithAi !res.ok koruması, Excel/Demo kalemlerinin ezilmemesi, sunucu AI yapılandırma şeffaflığı, satır içi + Hızlı Müşteri Ekleme ve 3 adımlı QuoteNextStepsBanner rehberi; hesap formülleri değişmedi), Rev. 106 (Müşteriler /app/clients, Müşteriler & Fırsatlar /app/crm, 6 aşamalı müşteri görüşme zaman tüneli /app/clients/:id, /api/crm/leads Zod v4 integerQuery düzeltmesi ve 3 katmanlı Akıllı Müşteri Excel/CSV Adaptörü; hesap formülleri değişmedi), Rev. 105 (CalmIfcWorkspace 2.004 satırdan 795 satıra modüler bölünmesi PR #31 ve T43 CI kapsam ratchet güçlendirmesi; hesap formülleri değişmedi), Rev. 104 (6 aşamalı güvenlik denetimi bulguları ve derinlemesine savunma sertleştirmesi: hakediş/fiyat istihbaratı/CDE maker-checker ve rol sınırları, Academy super-admin kapısı, IFC/PDF ayrıştırıcı bellek/döngü sınırları, alt süreç env izolasyonu ve DB rol ACL daraltması; hesap formülleri değişmedi), Rev. 103 (/admin/pricing-sources otomatik katalog tohumlama, yetki kanıtı zinciri, canlı crawler iyileştirmesi ve TÜİK Veri Portalı SDMX 2.1 entegrasyonu; hesap yöntemi değişmedi), Rev. 102 (4 katmanlı Akıllı Müteahhit Excel Adaptörü: düz icmal, katlara göre pivot, TOKİ tekrarlayan poz blokları, hibrit sayfa ve otomatik korpus tarayıcı; birim fiyat/tutar aritmetiği değişmedi), Rev. 101 (canlı üretim dağıtımı 0022..0029 + worker control-plane izolasyonu D12 ve canlı ifc-worker consumeIfcUsage kota tamamlama düzeltmesi D13; hesap yöntemi değişmedi), Rev. 100 (elle teklif satırı firma kataloğundaki onaylı fiyat kaydına bağlanabilir; tutar hesabı değişmedi), Rev. 99 (kamuya açık SmartCheck demosu yeniden sıralandı; hesap yöntemi değişmedi), Rev. 98 (arsa fizibilitesi ayrı ekranda, boş formda hata yok; hesap yöntemi değişmedi), Rev. 97 (teklif tablosu görünümü ve dosya bölünmesi; hesap yöntemi değişmedi), Rev. 96 (araç ve görünüm düzeni; hesap yöntemi değişmedi) ve Rev. 95; marka.md incelemesinden çıkan Faz 0 güven düzeltmelerini ve Faz 1 Excel önce / fiyat eksikliği / dışa aktarım dilimlerini kapsar. Hesap yöntemi değişiklikleri: teklif toplamlarına teklif düzeyinde müteahhitlik kârı ve genel gider payı (release 0029; satır neti üzerinden, KDV pay dahil matrah üzerinden), kârlılık hesabında bu payın gelir sayılması, IFC maliyet sekmesinde fiyatı eksik kalemin 0 TL yerine 'fiyat bekliyor' olarak toplam dışında tutulması ve icmal dışa aktarımında satır tutarının tam lira yerine kuruşa yuvarlanması. Doğrulama: 1515 testte 1500 PASS / 0 FAIL / 15 SKIP, kapsam kapısı geçti; gerçek tarayıcı smoke'ları scripts/faz0-trust-ui-smoke.ts, faz1-excel-flow-smoke.ts ve faz1-price-gap-smoke.ts. ÇŞB birim fiyatlarına %25 yüklenici kârı ve genel giderin dahil olduğu ÇŞB analizlerinden doğrulandı. Bu kayıt bağımsız uzman onayı veya L3 değildir; Faz 9 T50–T52 dış kabulleri açıktır.",
};

export interface ModuleRevisionNote {
  before: string;
  after: string;
  basis: string;
}

export interface CalcReviewRevisionEntry {
  revision: string;
  version: string;
  date: string;
  commit: string;
  trigger: string;
  beforeSummary: string;
  afterSummary: string;
  affectedModules: string[];
  moduleDetails?: Record<string, ModuleRevisionNote>;
}

/**
 * Strictly chronological revision log (Rev. 1 -> current revision) so expert engineers can follow
 * the exact evolution of calculation and rule methods from initial release to current state.
 */
export const CALC_REVIEW_CHANGELOG: CalcReviewRevisionEntry[] = [
  {
    revision: "Rev. 1",
    version: "BIM-CALC-2026-10-13.1",
    date: "13 Ekim 2026",
    commit: "e006d108b8618898dd0f9a2fcdd9afa9d44f749b",
    trigger: "İlk RG 33331 e-PYS Ön Kontrol Hattı, PDF/A Kuyruğu & Çekirdek Finansal Hesaplama Tabanı",
    beforeSummary:
      "IFC ve PDF kontrolleri yalnızca tarayıcı tarafında kısmi önizleme olarak çalışıyordu; sunucu tarafında izole Python (IfcOpenShell / pypdf) kuyruğu, KVKK maskelemesi ve bağımsız uzman doğrulama dokümanı bulunmuyordu.",
    afterSummary:
      "Sunucu tarafında izole ifc-worker (IfcOpenShell + ifc-ruhsat@cd6d3ce + pypdf) kuyruğu, IDS dışa aktarımı, TC/VKN/telefon/e-posta KVKK maskelemesi, PDF/A üstveri ve şifreleme kontrolü ile teklif/KDV/marj/eskalasyon hesaplama doğrulama sayfası devreye alındı.",
    affectedModules: ["teklif-satir", "kdv-tevkifat", "maliyet-marj", "eskalasyon", "ifc-metraj", "epys-on-kontrol", "pdfa"],
    moduleDetails: {
      "teklif-satir": {
        before: "İstemci ve PDF çıktılarında ayrı yuvarlama adımları vardı.",
        after: "10² ölçekli kuruş yuvarlaması (roundMoney) ile ekran, sunucu ve PDF çıktıları tek fonksiyonda birleştirildi.",
        basis: "3065 sayılı KDV Kanunu & VUK kuruş hassasiyeti",
      },
      "epys-on-kontrol": {
        before: "Sunucu tarafında otomatik RG 33331 IFC ön kontrolü ve EK-9 raporu yoktu.",
        after: "ifc-ruhsat çekirdeğiyle ilk 21 satırlık EK-9 ön kontrolü, GlobalId bulgu listesi ve KVKK maskelemesi devreye alındı.",
        basis: "RG 5.8.2026/33331 ilk entegrasyonu",
      },
      pdfa: {
        before: "2B PDF teslim dosyaları için sunucu tarafında PDF/A ve taranmış sayfa kontrolü yoktu.",
        after: "25 MiB sınırı, XMP pdfaid:part kimliği, şifreli PDF reddi, taranmış sayfa (m.6(4)) ve EK-2 dosya adı kontrolü eklendi.",
        basis: "Dijital Hazırlama Yön. m.6–7 & Teslim Yön. m.6(4)",
      },
    },
  },
  {
    revision: "Rev. 2",
    version: "BIM-CALC-2026-10-14.1",
    date: "14 Ekim 2026",
    commit: "9ab9ae5b07f2d3caeb81ea8c185794fc3595ed5e",
    trigger: "3×3 IFC Özellik Aktarımı, Reviewer Disiplin Yetkisi, IfcCovering 5D Köprüsü & İlk Minha Motoru",
    beforeSummary:
      "3×3 kural motoruna IFC Pset/QTO özellik aktarımı ve reviewer disiplin (STR/ARC/MEP/ALL) doğrulaması sunucu tarafında bağlı değildi; IfcCovering kaplama alanı ve TREpys_PozOzellikSeti.PozNo kanıt satırlarına taşınmıyordu.",
    afterSummary:
      "LoadBearing, IsExternal, ExposureClass, Cover (paspayı mm), Disiplin ve ExpectedVolume IFC'den 3×3 motoruna bağlandı; sunucu tarafında reviewer disiplin yetki kontrolü açıldı; IfcCovering (m²) ve TREpys_PozOzellikSeti.PozNo çıkarımı ile CSB_2026_V1 Minha motoru devreye alındı.",
    affectedModules: ["uc-x-uc", "satir-dogrulama", "ifc-metraj", "ifc-teklif-aktarim", "minha", "epys-on-kontrol"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Yalnızca kiriş, kolon, döşeme ve duvar beton hacimleri (m³) okunuyordu.",
        after: "IfcCovering kaplama alanları (NetArea/GrossArea m²) ve TREpys_PozOzellikSeti.PozNo öncelikli poz okuma eklendi.",
        basis: "RG 33331 EK-4 / EK-6 & ISO 16739-1 Qto_CoveringBaseQuantities",
      },
      "uc-x-uc": {
        before: "Kural motoru çalışıyor ancak IFC dosyasından paspayı (Cover), maruziyet sınıfı ve taşıyıcı (LoadBearing) özellikleri aktarılmadığı için girdi eksik dönüyordu.",
        after: "Pset_ConcreteElementGeneral ve Pset_*Common üzerinden LoadBearing, ExposureClass, Cover (mm) ve ExpectedVolume uçtan uca bağlandı.",
        basis: "TS 500:2000 m.7.3, 7.4, 11.2.2 & Şirket 3×3 Politikası",
      },
      "satir-dogrulama": {
        before: "Metraj satırı onaylarında inceleyenin mühendislik disiplini kontrol edilmiyordu.",
        after: "Sunucu tarafında teknik reviewer disiplin yetkisi (STR, ARC, MEP, ALL) doğrulaması zorunlu kılındı.",
        basis: "Şirket kalite kontrol ve iç denetim politikası (E-9)",
      },
      minha: {
        before: "Kapı/pencere boşlukları için sözleşmesel düşüm eşiği ve söve yan yüzey eklemesi yoktu.",
        after: "CSB_2026_V1 ölçü esası motoru (duvar 0,50 m², sıva/boya 2,00 m² + söve eklemesi, kalıp 1,00 m²) brüt miktarı ezmeden devreye alındı.",
        basis: "ÇŞB YFK 2026 İnşaat Birim Fiyat Tarifleri ve Ölçü Esasları",
      },
    },
  },
  {
    revision: "Rev. 3",
    version: "BIM-CALC-2026-10-15.1",
    date: "15 Ekim 2026 (Faz 1)",
    commit: "70cb4dd9e03ca0ab153d879fd94cf848b836108b",
    trigger: "TS 500 Yapısal Kesişim Motoru, ALLPLAN 2026 e-PYS Kiti v1, ÇŞB 2026 PDF Mühürleme & Kota v6",
    beforeSummary:
      "Yapısal sihirbazda kiriş–döşeme ortak hacim/kalıp düşümü ayrı modül olarak belgelenmemişti; paket kotaları tek VPS RAM korumasını ve 4 dönemli Havale/EFT taahhüt iskontosunu içermiyordu.",
    afterSummary:
      "TS 500 Yapısal Metraj Sihirbazı + kiriş–döşeme kesişim düşümü (computeBeamSlabIntersectionDeduction), SHA-256 mühürlü ALLPLAN 2026 e-PYS Kiti v1, ÇŞB 2026 resmi PDF katalog mühürleme (570 poz) ve Kota v6 (%0/%10/%20/%30 dönem iskontosu) doğrulama kapsamına alındı.",
    affectedModules: ["yapisal-sihirbaz", "minha", "epys-on-kontrol", "kota"],
    moduleDetails: {
      "yapisal-sihirbaz": {
        before: "Kiriş betonu ve yan kalıbı tam kiriş yüksekliği (h_kiriş) üzerinden brüt hesaplanıyordu.",
        after: "computeBeamSlabIntersectionDeduction ile döşeme kalınlığı kadar ortak hacim (b × h_kesişim × L) ve yan kalıp (2 × h_kesişim × L) düşülerek sarkık kiriş yüksekliği (h_sarkık) esas alındı.",
        basis: "TS 500:2000 & ÇŞB 2026 Poz 15.150.1005 / 15.180.1002 ölçü esasları",
      },
      kota: {
        before: "Yalnızca aylık sabit paket fiyatları vardı; sunucu RAM/CPU güvenliği için eşzamanlı IFC sınırı ve dönem iskontosu tanımlı değildi.",
        after: "Paket kataloğu v6 (25–85 MB IFC, 1–2 eşzamanlı işlem) ve 4 dönemli Havale/EFT taahhüt iskontosu (Aylık %0, 6 Aylık %10, 1 Yıllık %20, 2 Yıllık %30) eklendi.",
        basis: "Paket Kataloğu v6 (bimmetraj-2026-10-15-v6)",
      },
    },
  },
  {
    revision: "Rev. 4",
    version: "BIM-CALC-2026-10-15.2",
    date: "15 Ekim 2026 (Faz 2)",
    commit: "efcfecca08bdbcb11fcbb2dd8aea0ceb0c1eed30",
    trigger: "Bakanlık Nihai PDF Paketi (#1.pdf, #2.pdf, EKLER.pdf) 5 Fazlı Tam Senkronizasyonu",
    beforeSummary:
      "EK-9 yalnızca 21 satırlık tek tablo olarak çalışıyordu; EK-7'de Tablo 7.9 (IfcAnnotation) yoktu; hızlı e-PYS kontrolünde CSBPozNo zorunlu tutuluyordu; PDF ön kontrolünde ISO 216 pafta boyutu, tek pafta ve e-imza kontrolü bulunmuyordu.",
    afterSummary:
      "EK-9 Tablo 9.1 (Mimari 21 satır) ve Tablo 9.2 (Diğer Disiplinler 16 satır) ayrımı kuruldu; EK-7 Tablo 7.9 (IfcAnnotation SURVEY) eklendi; #1.pdf m.13(3) Malzeme İsmi_Dayanım zorunluluğu ve 5D CSBPozNo uyarısı ayrıştırıldı; PDF/A'ya m.8(1) ISO 216 pafta boyutu, m.8(2) tek pafta kuralı ve m.6(1)-(2) gömülü e-imza (/Sig) tespiti eklendi.",
    affectedModules: ["epys-on-kontrol", "epys-hizli", "pdfa", "ifc-metraj"],
    moduleDetails: {
      "epys-on-kontrol": {
        before: "Tüm disiplinler 21 satırlık tek EK-9 tablosuyla denetleniyordu; EK-7 Tablo 7.9 (IfcAnnotation) ve EmsalDurumu='DIGER' tanımlı değildi.",
        after: "Disiplin koduna göre MM için Tablo 9.1 (21 satır), ST/MK/EE vb. için Tablo 9.2 (16 satır — mahal ve emsal hariç) otomatik seçimi, Tablo 7.9 IfcAnnotation (SURVEY) ve Tablo 7.4 EmsalDurumu ('DAHIL'/'HARIC'/'DIGER') eklendi.",
        basis: "EKLER.pdf s.31 (Tablo 7.4), s.34 (Tablo 7.9), s.36–37 (Tablo 9.1 & Tablo 9.2)",
      },
      "epys-hizli": {
        before: "Pset_Yapim_Maliyet.CSBPozNo eksikliği ruhsat hatası gibi 30 puan kırıyordu; malzeme adında yalnızca ≤15 karakter kontrolü vardı.",
        after: "#1.pdf m.13(3) Malzeme İsmi_Dayanım format kontrolü resmi kural yapıldı; CSBPozNo ise ruhsat hatası yerine 5D metraj köprüsü uyarısına çekildi.",
        basis: "Dijital Hazırlama Yön. (#1.pdf) m.13(3) & EKLER.pdf Tablo 7.x",
      },
      pdfa: {
        before: "Yalnızca PDF/A üstveri kimliği, şifreleme, taranmış sayfa ve EK-2 dosya adı kontrol ediliyordu.",
        after: "#1.pdf m.8(1) ISO 216 A4 ve katları pafta boyutu (PAFTA_BOYUTU_ISO216), m.8(2) çizim paftalarında tek pafta düzeni (COKLU_PAFTA_DUZENI) ve #2.pdf m.6(1)-(2) gömülü e-imza (/Sig) tespiti eklendi.",
        basis: "Dijital Hazırlama Yön. (#1.pdf) m.8(1)-(2) & Teslim Yön. (#2.pdf) m.6(1)-(2)",
      },
    },
  },
  {
    revision: "Rev. 5",
    version: "BIM-CALC-2026-10-15.3",
    date: "15 Ekim 2026 (Faz 3)",
    commit: "f0413f8fefef5752608339e3e9c4a1ea47b03484",
    trigger: "Resmi Mühendislik Kabul Kanıt Paketi (MM, ST, PDF/A-2B) & Kotadan Düşmeyen Canlı Örnek Projeler",
    beforeSummary:
      "MM (Tablo 9.1), ST (Tablo 9.2 + 3×3) ve PDF/A-2B (ISO 216 A3 + e-imza) için SHA-256 mühürlü canlı Python motoru referans koşu raporu ve /app/smartcheck üzerinde kotadan düşmeyen tek tıkla örnek proje deneme akışı yoktu; ifc_extract.py içinde üst-alt sınıf (IfcWall/IfcWallStandardCase) sorgularında STEP ID tekilleştirme koruması eksikti.",
    afterSummary:
      "IfcOpenShell 0.8.5 + pypdf 6.10.2 canlı motorlarıyla üretilen 3 referans koşu (d2195a87…, 99e8ba20…, 2f0a4ab7…) docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md altında mühürlendi; seen_elem_ids tekilleştirmesi ve 7 öznitelikli IFC4 IfcAnnotation (ObjectType='SURVEY') koruması eklendi; /app/smartcheck içine kotadan düşmeyen 3 canlı örnek proje butonu (/api/smartcheck/sample-projects/:sampleId) devreye alındı.",
    affectedModules: ["epys-on-kontrol", "ifc-metraj", "uc-x-uc", "pdfa", "fiyat-eslestirme"],
    moduleDetails: {
      "ifc-metraj": {
        before: "model.by_type('IfcWall') ve model.by_type('IfcWallStandardCase') ardışık çağrıldığında alt sınıf elemanları iki kez sayılabiliyordu.",
        after: "seen_elem_ids STEP ID tekilleştirme kümesi eklendi; her IFC elemanı üst/alt sınıf hiyerarşisinden bağımsız olarak yalnızca bir kez okunur.",
        basis: "Canlı IfcOpenShell 0.8.5 doğrulaması & MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md",
      },
      "epys-on-kontrol": {
        before: "7 öznitelikli IFC4 IfcAnnotation şemasında PredefinedType doğrudan sorgulandığında RuntimeError oluşabiliyordu.",
        after: "ortak.py ve ozellik.py içinde şema koruması ve PredefinedType (None/USERDEFINED) -> ObjectType ('SURVEY') yedeklemesi eklendi; MM (21 satır) ve ST (16 satır) referans modelleri 0 hata ile mühürlendi.",
        basis: "EK-7 Tablo 7.9 & MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md (d2195a87…, 99e8ba20…)",
      },
      "uc-x-uc": {
        before: "ST disiplini için canlı IfcOpenShell referans modelinde 3×3 paspayı ve metraj toleransı kanıt koşusu belgelenmemişti.",
        after: "123456_00_ST_BETO_MD_BIM_000_01_000.ifc (99e8ba20…) üzerinde COVER_BELOW_STANDARD_MIN (15 mm < 25 mm) ve QUANTITY_TOLERANCE_EXCEEDED (%5,71 > %3,00) bulguları kanıt paketiyle mühürlendi.",
        basis: "TS 500:2000 & MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md Bölüm 3",
      },
      pdfa: {
        before: "ISO 216 A3 pafta boyutu ve /Sig gömülü e-imza için mühürlü referans PDF/A-2B kabul koşusu yoktu.",
        after: "123456_00_MM_GNEL_PL_MMC_K00_01_000.pdf (2f0a4ab7…) ile PDF/A-2B, ISO 216 A3 (420×297 mm) ve /Sig e-imza kabul kanıtı mühürlendi ve canlı örnek proje olarak açıldı.",
        basis: "MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md Bölüm 4",
      },
      "fiyat-eslestirme": {
        before: "Yeni çalışma alanlarında örnek projeler denendiğinde eşleşecek referans ÇŞB 2026 pozu bulunmayabiliyordu.",
        after: "Örnek proje yüklendiğinde ÇŞB 2026 15.150.1005 (C30/37 beton) ve 15.390.1002 (alçı sıva) pozları price_snapshots tablosuna otomatik tanımlanarak uçtan uca fiyat eşleştirme testi sağlandı.",
        basis: "ÇŞB 2026 Birim Fiyat Kataloğu & src/smartcheck/sample-projects.ts",
      },
    },
  },
  {
    revision: "Rev. 6",
    version: "BIM-CALC-2026-10-16.1",
    date: "16 Ekim 2026",
    commit: "410576cd286cf148b140b7a55197384eacfe1cfd",
    trigger: "33 Çok Yazılımlı IFC Saha Doğrulaması (ALLPLAN 2026.1 31,4 MB Uzman Modeli + Revit/Archicad/Tekla/BIMcollab/IFC4X2)",
    beforeSummary:
      "ALLPLAN 2026.1 çok katmanlı duvarlarında IfcComplexProperty ('Object Layer Attributes #1..#4') içindeki hacim/alan nicelikleri ve QTO bulunmayan 730 elemanın 3B Brep/ExtrudedAreaSolid geometrisi okunamıyordu (1.731 elemandan yalnız 160'ı kabul ediliyordu); Revit IFC dışa aktarımlarındaki ölçeklenmemiş mm³/ft²·mm QTO hataları milyarlarca m³ sapmaya yol açıyordu; IfcSpace üzerinden bağlı IfcCovering elemanları 'Bilinmeyen Kat' görünüyordu.",
    afterSummary:
      "IfcComplexProperty özyinelemeli okuma, çok iş parçacıklı IfcOpenShell C++ 3B geometri motoru + IfcSectionedSolidHorizontal analitik integrasyonu + IsDecomposedBy alt parça toplamı + 2B süpürgelik eğri boyu × yükseklik hesabı, IfcSpace → IfcBuildingStorey kat çözümlemesi ve Revit QTO birim hatası (mm³/ft²·mm) normalizasyonu devreye alındı; 31,4 MB ALLPLAN 2026.1 modelindeki 1.731 elemanın tamamı (1.559,21 m³ hacim, 7.861,01 m² kalıp, 6.268,95 m² kaplama) ve 32 uluslararası IFC modelinin tamamı doğrulandı.",
    affectedModules: ["ifc-metraj", "kalip", "donati-kutle", "epys-on-kontrol", "kota"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Yalnızca düz IfcPropertySingleValue ve QTO nicelikleri okunuyordu; IfcComplexProperty katmanları, QTO'suz 3B katı elemanlar ve Revit mm³/ft²·mm QTO ölçek hataları çözümlenmiyordu.",
        after: "iter_pset_single_values ile IfcComplexProperty katman hacimleri toplanır; QTO/Pset yoksa IfcOpenShell C++ 3B geometri motoru (ve IFC4X2 IfcSectionedSolidHorizontal analitik integrasyonu) devreye girer; normalize_qto_set_quantities ile Revit 1000×/10⁹× birim hataları düzeltilir; _find_parent_storey ile IfcSpace → IfcBuildingStorey kat ilişkisi kurulur.",
        basis: "ISO 16739-1 (IFC2X3 / IFC4 / IFC4X2 / IFC4X3_ADD2) & 33 Gerçek IFC Modeli Saha Doğrulaması",
      },
      kalip: {
        before: "Yalnızca açık QTO NetArea/NetSideArea/OuterSurfaceArea varsa kalıp alanı türetiliyordu; çok katmanlı duvarlarda katman alanlarının tamamı toplanarak kalıp şişebiliyor veya QTO yoksa 0 m² dönüyordu.",
        after: "Çok katmanlı duvarlarda yalnızca en dış katmanın yan alanı (2 × dış yüz) esas alınır; QTO bulunmadığında 3B geometri motorunun get_side_area / get_footprint_area / get_outer_surface_area çıktılarından kalıp alanı türetilir.",
        basis: "buildingSMART Qto_*BaseQuantities & ALLPLAN 2026.1 (7.861,01 m² kalıp doğrulaması)",
      },
      "donati-kutle": {
        before: "Donatı çubuklarında BarLength özniteliği boş olduğunda Pset_ReinforcingBarCommon.BarLength veya 3B geometri hacmi yedek olarak kullanılmıyordu.",
        after: "BarLength özniteliği yoksa Pset_ReinforcingBarCommon / QuantityTakeOff uzunluğu veya C++ 3B geometri hacmi × 7.850 kg/m³ yedeklemesiyle donatı kütlesi hesaplanır (Ifc4_Revit_STR: 3.680 donatı = 4.272,6 kg; 04_Elevatorshaft: 136 donatı = 397,5 kg).",
        basis: "TS 708 & ISO 16739-1 IfcReinforcingBar",
      },
      "epys-on-kontrol": {
        before: "epys_preflight.py içinde geçici dosya adı (/tmp/.../model.ifc) denetleniyor ve standart dışı dosya adlarında disiplin her zaman MM varsayılıyordu.",
        after: "Gerçek yüklenen dosya adı (dosya_adi=effective_name) kontrol_et fonksiyonuna geçirilir; dosya adındaki ST/STR/MK/MEP/EL/MM ipuçlarından doğru disiplin ve EK-9 tablosu (Tablo 9.1 / 9.2) seçilir; ortak.ozellik_setleri içinde IfcComplexProperty açılımı yapılır.",
        basis: "RG 33331 EK-2 (m.6) & EK-9 Tablo 9.1 / Tablo 9.2",
      },
      kota: {
        before: "Tarayıcı IFC önizleme sınırı 25 MiB idi; sunucu tarafında paket dosya boyutu aşıldığında 'Geçersiz dosya bilgisi.' şeklinde belirsiz bir hata dönüyordu.",
        after: "Tarayıcı önizleme üst sınırı 50 MiB'ye çıkarıldı; sunucu tarafında paket boyut sınırı aşıldığında açık hata mesajı ve FILE_SIZE_LIMIT_EXCEEDED kodu döndürülür.",
        basis: "Paket Kataloğu v6 (25–85 MB IFC sınırı) & 31,4 MB ALLPLAN 2026.1 saha testi",
      },
    },
  },
  {
    revision: "Rev. 7",
    version: "BIM-CALC-2026-10-17.1",
    date: "17 Ekim 2026",
    commit: "410576cd286cf148b140b7a55197384eacfe1cfd",
    trigger: "Allplan 4 Excel Raporu Çapraz Doğrulaması, Çok Katmanlı İcmal Motoru, Süpürgelik (mtül), 16 Daire Cetveli & 3 Adımlı Calm UI",
    beforeSummary:
      "Çok katmanlı IfcCovering elemanları (Şap + Parke veya Kaba Sıva + Saten Alçı + Boya) tek kalem olarak toplandığından taşeron bazlı ayrı icmal üretilemiyordu; süpürgelikler m² birimiyle listeleniyordu; 16 dairenin (D01..D16) bağımsız bölüm net/brüt m² cetveli ve sade 'Kağıt İcmal + Sağ Detay Kartı' arayüzü bulunmuyordu.",
    afterSummary:
      "Object Layer Attributes #1..#4 Malzeme ve IfcRelAssociatesMaterial katmanları ayrıştırılarak Şap (1.761,33 m²), Laminat Parke (921,11 m²), Duvar Fayans (1.175,15 m²), Kaba Sıva (4.775,62 m²), Saten Alçı (4.775,62 m²) ve Boya (4.775,62 m²) ayrı ihale kalemlerine dönüştürüldü; SKIRTINGBOARD süpürgelikler mtül birimine (893,54 mtül Parke + 753,92 mtül Seramik/Granit) çevrildi; IfcZone/IfcSpace üzerinden D01..D16 daire cetveli ve 3 adımlı 'Kağıt İcmal + Sağ Detay Kartı' (CalmIfcWorkspace) devreye alındı.",
    affectedModules: ["ifc-metraj", "minha", "ifc-teklif-aktarim"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Çok katmanlı IfcCovering elemanları tek bir yüzey kalemi olarak okunuyor, süpürgelikler m² olarak kalıyor ve IfcZone/IfcSpace daire m² cetveli çıkarılmıyordu.",
        after: "materialLayers (Şap, Parke, Seramik, XPS, Kaba Sıva, Saten Alçı, Boya, Fayans) katman ayrıştırması, SKIRTINGBOARD lengthM (mtül) hesabı ve 16 daire (D01..D16) bağımsız bölüm oda oda net/brüt m² cetveli eklendi.",
        basis: "Allplan 2026.1 4 Excel Raporu Çapraz Doğrulaması & ISO 16739-1 IfcCovering / IfcZone / IfcSpace",
      },
      minha: {
        before: "Kapı/pencere boşluk düşümü (Minha) kural motorunda hesaplanıyor ancak kullanıcı arayüzünde her imalat kalemi için 'Brüt − Boşluk = Net' denklemiyle sağ detay kartında gösterilmiyordu.",
        after: "Sağ detay kartında (CalmIfcWorkspace) her kalem için 'Brüt Yüzey − Kapı/Pencere Boşluğu (Minha) = Net Ödenecek Miktar' denklemi, kat dağılımı ve oda oda Yeşil Defter kırılımı görünür kılındı.",
        basis: "ÇŞB YFK 2026 Ölçü Esasları (CSB_2026_V1) & Calm UI Master–Detail Mimarisi",
      },
      "ifc-teklif-aktarim": {
        before: "Metrajdan teklife geçiş çok adımlı teknik tablo üzerinden yapılıyordu.",
        after: "3. Adım (Maliyet & Teklif) sekmesinde çok katmanlı net miktarların yanına doğrudan birim fiyat (₺) girilerek anında grup ara toplamları, müteahhitlik kârı, daire başı ortalama maliyet ve teklif çıktısı üretilir.",
        basis: "3 Adımlı Kağıt İcmal + Sağ Detay Kartı (CalmIfcWorkspace.tsx)",
      },
    },
  },
  {
    revision: "Rev. 8",
    version: "BIM-CALC-2026-10-17.2",
    date: "17 Ekim 2026",
    commit: "a78e6f9edb20945eeaf1b3f30b2269fb76435774",
    trigger: "Merkezi Pafta Design System (Açık Pafta #f3f1e9 & Koyu Antrasit #141517), Yüksek Kontrast, Erken Erişim Ön Kayıt (/admin/leads) & GAP_RAPORU_2026-10-17 Düzeltmeleri (Y-1, Y-2, Y-4, Y-5)",
    beforeSummary:
      "/app/smartcheck üzerinde dosya adında '2026_45' geçen müşteri dosyaları kalibre edilmiş referans veri setine düşebiliyor (Y-1) ve 1.000 satır sınırı nedeniyle büyük IFC modellerinde IfcSpace oda verileri kesilebiliyordu; ayrıca farklı sayfalarda sabit renkler (bg-zinc-950, text-white, pastel metinler), ana sayfada ön kayıt toplama eksikliği ve mükerrer ön kayıtta PII sızıntısı riski (Y-2) bulunuyordu.",
    afterSummary:
      "calm-icmal.ts içindeki /2026_45/i dosya adı kısa devresi kaldırılarak tüm gerçek müşteri IFC dosyalarının yalnızca kendi elemanlarından hesaplanması garanti altına alındı (Y-1); DESIGN.md ve src/index.css üzerinde Açık Pafta (#f3f1e9) ve Koyu Antrasit Gece Paftası (#141517) yüksek kontrastlı token mimarisi kuruldu; ana sayfaya Ön Kayıt formu ve /admin/leads potansiyel müşteri yönetimi (KVKK/PII korumalı, Y-2) eklendi; /app/smartcheck API satır limiti 5.000'e çıkarıldı ve dinamik daire cetveli üretildi.",
    affectedModules: ["ifc-metraj", "ifc-teklif-aktarim"],
    moduleDetails: {
      "ifc-metraj": {
        before: "GET /api/smartcheck/documents/:id/rows 1.000 satırla sınırlıydı ve calm-icmal.ts içinde dosya adında '2026_45' geçen yüklemeler kalibre edilmiş referans veri setine yönlendirilebiliyordu (Y-1).",
        after: "API satır limiti 5.000'e (maks 10.000) çıkarıldı; /2026_45/i dosya adı kontrolü kaldırılarak her IFC dosyasının yalnızca kendi gerçek elemanlarından ve IfcSpace satırlarından dinamik daire/oda m² cetveli üretmesi sağlandı.",
        basis: "src/ifc/calm-icmal.ts, src/ifc/calm-icmal.test.ts & GAP_RAPORU_2026-10-17 (Y-1)",
      },
      "ifc-teklif-aktarim": {
        before: "Farklı ekranlarda sabit renk kodları (bg-zinc-950, text-white, pastel -300 metinler) kullanıldığı için açık/koyu mod kontrastı bozulabiliyordu.",
        after: "Merkezi Pafta Design System (DESIGN.md, src/index.css, ThemeToggle, PaftaDrawing) ile tüm ekranlar Sıcak Pafta Kâğıdı (#f3f1e9) ve Koyu Antrasit Gece Paftası (#141517) yüksek kontrastlı tokenlarına bağlandı; ana sayfa ön kayıt formu (/admin/leads, Y-2 PII korumalı) ve PageSpeed/CSP iyileştirmeleri devreye alındı.",
        basis: "DESIGN.md, src/index.css & GAP_RAPORU_2026-10-17 (Y-2, Y-4)",
      },
    },
  },
  {
    revision: "Rev. 9",
    version: "BIM-CALC-2026-10-17.3",
    date: "17 Ekim 2026",
    commit: "142aa71",
    trigger: "TS EN ISO 19650-1/2 & EN 17412-1 (LOIN) Kural Motoru, 4734 KİK m.38 Aşırı Düşük Teklif (Sınır Değer & %80 Pareto) Motoru & 4,00 m² Minha Profili (GEO-2 / UX-1)",
    beforeSummary:
      "Vitrinde ve meta verilerde geçen TS EN ISO 19650 uyumu, 4734 KİK aşırı düşük teklif analizi ve 4,00 m² minha eşiği için çalışma zamanında (runtime) bağımsız kural motorları bulunmuyordu.",
    afterSummary:
      "Vitrindeki vaatleri çıkarmak yerine doğrudan çalışma zamanı motorları kuruldu: (1) TS EN ISO 19650-1/2 bilgi konteyneri adlandırma, CDE (WIP/SHARED/PUBLISHED/ARCHIVED), revizyon (Pxx.xx/Cxx) ve EN 17412-1 LOIN tamlık motoru (src/smartcheck/rules/iso19650.ts) sunucu IFC hattına bağlandı; (2) 4734 KİK m.38 & Genel Tebliğ m.45.1 yapım işleri Sınır Değer (SD) ve %80 Pareto sıralı iş kalemleri motoru (src/lib/kik-adt.ts) kurularak CalmIfcWorkspace Maliyet sekmesine entegre edildi; (3) Minha motoruna CSB_FORMWORK_4M2 (4,00 m²) profili eklendi.",
    affectedModules: ["iso19650", "kik-adt", "minha"],
    moduleDetails: {
      iso19650: {
        before: "ISO 19650 yalnızca sözlük ve eğitim içeriğinde yer alıyor, IFC çalışma zamanında denetlenmiyordu.",
        after: "evaluateIso19650Compliance ile konteyner kimliği (ISO 19650-2 & RG 33331 EK-2), CDE durumu (S0..A7), revizyon kodu (P01.01 / C01) ve LOIN geometrik/alfa-sayısal/GlobalId tamlığı denetlenir.",
        basis: "TS EN ISO 19650-1/2:2018 & TS EN 17412-1:2020 (src/smartcheck/rules/iso19650.ts)",
      },
      "kik-adt": {
        before: "Kamu ihaleleri için 4734 KİK m.38 aşırı düşük teklif sınır değer ve sıralı iş kalemleri hesabı kodda yoktu.",
        after: "evaluateKikAbnormallyLowBid ile YM üstü tekliflerin elenmesi, 1-sigma standart sapma bandı, R katsayısı (Üstyapı N=1,00 / Altyapı N=0,80), Sınır Değer (SD = R × YM) ve Tebliğ m.45.1.2 %80 Pareto sıralı iş kalemleri hesabı devreye alındı.",
        basis: "4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1 (src/lib/kik-adt.ts)",
      },
      minha: {
        before: "evaluatePlasterPaintMinha yalnız CSB_2026 (0,50 m²) ve DIN_18350 (2,50 m²) standartlarını destekliyordu.",
        after: "Kullanıcı tanımlı özel şartname eşiği profili eklendi.",
        basis: "src/smartcheck/rules/minha.ts & src/smartcheck/rules/minha.test.ts",
      },
    },
  },
  {
    revision: "Rev. 10",
    version: "BIM-CALC-2026-10-17.4",
    date: "17 Ekim 2026",
    commit: "116c7de",
    trigger: "YOL_HARITASI_2026-10-17 Faz 0 Doğrulaması: KİK Tebliğ m.45.1.1 Resmi Formülü (K-1 / K-1b), ISO 19650 Sabit Girdi Temizliği & EK-2 Sözlük Eşleşmesi (K-2), CUSTOM_CONTRACT Minha (K-3) ve ÇŞB Dönem Geçerliliği (0.6)",
    beforeSummary:
      "İlk KİK motorunda (c78683e) %40–%120 YM bandı yerine yalnız <= YM filtresi, parçalı K polinomu yerine doğrusal R ve Altyapı için N=0,80 kullanılmış; CalmIfcWorkspace içinde uydurma YM (directTotal × 1,25) ve sahte rakip teklifler gösterilmiş (K-1/K-1b); ifc-rule-run.ts içinde sabit 'SHARED/S3/P01.01' ve yedek 'Zemin Kat/row-N' ile LOIN şişirilmiş (K-2); ayrıca Mart 2026 aylık ÇŞB kataloglarının bitiş tarihi 2026-12-31 olarak yazılmıştı (0.6).",
    afterSummary:
      "Kamu İhale Genel Tebliği m.45.1.1, m.45.1.1.1 ve m.45.1.1.4 tam formülü ([0,40×YM, 1,20×YM] bandı, Tort1, σ, Tort2, C = Tort2/YM, parçalı K katsayısı, Üstyapı N=1,00 / Diğer Yapım N=1,20, SD = max(0,40×YM; K×Tort2/(C×N))) devreye alındı ve CalmIfcWorkspace'teki tüm uydurma YM/rakip teklif girdileri kaldırılarak açık kullanıcı girişine bağlandı (K-1/K-1b). ISO 19650 motorunda sabit CDE/LOIN yedekleri kaldırılıp üstveri yoksa cdeEvaluationStatus = 'not_evaluated' döndürüldü ve 9 alanlı dosya adı ek2_disiplinler.json sözlüğüne bağlandı (K-2). Kaynaksız 4,00 m² minha profili CUSTOM_CONTRACT (zorunlu customThresholdM2) ile değiştirildi (K-3) ve Mart 2026 ÇŞB listelerinin geçerlilik aralığı 2026-03-01..2026-03-31 olarak düzeltildi (0.6).",
    affectedModules: ["kik-adt", "iso19650", "minha", "fiyat-eslestirme"],
    moduleDetails: {
      "kik-adt": {
        before: "Yalnız <= YM filtresi, doğrusal R katsayısı, N=0,80 altyapı katsayısı ve CalmIfcWorkspace içinde uydurma YM/rakip teklif dizisi vardı.",
        after: "Tebliğ m.45.1.1 (%40–%120 YM bandı, K = (3,2C − C² − 0,6)/(C+1) veya (C² − 0,8C + 1,4)/(C+1), N=1,00 Üstyapı / N=1,20 Diğer Yapım, SD = K×Tort2/(C×N), %40 YM alt sınır güvencesi) ve sıfır uydurma girdi (hasTenderSessionInputs = false) uygulandı.",
        basis: "Kamu İhale Genel Tebliği m.45.1.1, m.45.1.1.1, m.45.1.1.4 & m.45.1.2 (src/lib/kik-adt.ts)",
      },
      iso19650: {
        before: "ifc-rule-run.ts içinde sabit 'SHARED / S3 / P01.01' ve yedek 'Zemin Kat / row-N' geçildiği için CDE her zaman yeşil, LOIN ise şişirilmiş çıkıyordu.",
        after: "Sabit CDE ve LOIN yedekleri kaldırıldı; CDE üstverisi yoksa cdeEvaluationStatus = 'not_evaluated' döner, 9 alanlı RG 33331 EK-2 dosya adı resmi ek2_disiplinler.json tablolarından doğrulanır.",
        basis: "TS EN ISO 19650-1/2, EN 17412-1 & RG 33331 EK-2 (src/smartcheck/rules/iso19650.ts, ifc-rule-run.ts)",
      },
      minha: {
        before: "Kaynaksız CSB_FORMWORK_4M2 (4,00 m²) hazır profili bulunuyordu.",
        after: "Kaynaksız sabit eşik kaldırılarak çağırandan açık customThresholdM2 bekleyen CUSTOM_CONTRACT moduna dönüştürüldü.",
        basis: "src/smartcheck/rules/minha.ts & YOL_HARITASI_2026-10-17 (K-3)",
      },
      "fiyat-eslestirme": {
        before: "Mart 2026 aylık ÇŞB birim fiyat ve rayiç kataloglarında validityEnd = 2026-12-31 tanımlıydı.",
        after: "Aylık Mart 2026 kataloglarının geçerlilik dönemi 2026-03-01 – 2026-03-31 olarak düzeltildi (yıllık Yapı Yaklaşık Maliyet Tebliği 2026-01-01 – 2026-12-31 korundu).",
        basis: "ÇŞB YFK Aylık Yayın Kuralı & src/server/crawler/data/csb-2026-official-catalogs.json (0.6)",
      },
    },
  },
  {
    revision: "Rev. 11",
    version: "BIM-CALC-2026-10-17.5",
    date: "17 Ekim 2026",
    commit: "2973095",
    trigger: "YOL_HARITASI_2026-10-17 Faz 1.5 / 1.6 / 1.7 & Faz 2.1 / 2.4: Yetenek Kaydı ve Kanıt Kapısı (BIM-CAP-2026-10-17.2), KİK Kuruş Hassasiyetli Golden Test Seti, 6 Resmi ÇŞB 2026 Kitabında 18.848 Satır Tam Alım ve İnteraktif ISO 19650 CDE / LOIN Denetim Kartı",
    beforeSummary:
      "Yeteneklerin L0–L4 doğrulama seviyelerini ve sabit girdi yasağını CI'da denetleyen merkezi bir Yetenek Kaydı yoktu; KİK Sınır Değer hesabında K katsayısı çarpım öncesinde 6 haneye yuvarlandığı için 100 milyon TL ölçeğinde kuruş farkı oluşabiliyordu; ayrıca 6 resmi ÇŞB 2026 kataloğunda PDF'lerdeki 18.848 satırın yalnız 689'u gömülüydü.",
    afterSummary:
      "Merkezi Yetenek Kaydı (src/capabilities/registry.ts — BIM-CAP-2026-10-17.2) ve Kanıt Kapısı CI testi (registry.test.ts) kurularak llms.txt doğrudan bu kayda bağlandı (Faz 1.5). KİK motorunda (src/lib/kik-adt.ts) computeKikKFactorExact ile ara çarpım tam IEEE-754 hassasiyetine alınarak 5 senaryolu kuruş hassasiyetli Golden Test seti (src/lib/kik-adt.golden.test.ts) eklendi (Faz 1.6). 6 resmi 2026 ÇŞB PDF kitabındaki toplam 18.848 poz ve rayicin tamamı (İnşaat BF: 1.861, İnşaat Rayiç: 5.360, Mekanik BF: 5.678, Elektrik BF: 5.910, Yapı Yaklaşık Maliyet: 18, TÜİK Endeks: 21 — 18.848 / 18.848 tam kapsam) csb-2026-official-catalogs.json içine aktarıldı ve getOfficialCatalogCoverageReport() kapsam raporu eklendi (Faz 1.7 & Faz 2.4). CalmIfcWorkspace 3. sekmesine sıfır varsayılanlı kullanıcı kontrollü ISO 19650 CDE & LOIN denetim kartı entegre edildi (Faz 2.1).",
    affectedModules: ["kik-adt", "iso19650", "fiyat-eslestirme"],
    moduleDetails: {
      "kik-adt": {
        before: "computeKikKFactor ara değerde 6 ondalık basamağa yuvarlandığı için 100.000.000 TL YM ölçeğinde 33,33 TL yuvarlama farkı oluşuyordu.",
        after: "computeKikKFactorExact ile SD = (K × Tort2) / (C × N) çarpımı tam hassasiyetle yapılıp yalnız nihai TL tutarı kuruşa (round2) yuvarlandı; 5 resmi Tebliğ senaryolu kik-adt.golden.test.ts eklendi.",
        basis: "Kamu İhale Genel Tebliği m.45.1.1 & src/lib/kik-adt.golden.test.ts (Faz 1.6)",
      },
      iso19650: {
        before: "CalmIfcWorkspace üzerinde yalnızca dosya adı şablonu rozeti gösteriliyor, kullanıcı CDE durumunu ve teslim aşamasını seçerek etkileşimli denetim yapamıyordu.",
        after: "CalmIfcWorkspace 3. sekmesine CDE Durumu (WIP/SHARED/PUBLISHED/ARCHIVED), Uygunluk Kodu (S0..B), Revizyon Kodu (Pxx.xx/Cxx) ve Teslim Aşaması seçicileri ile gerçek LOIN tamlık yüzdesi kartı eklendi (seçilmediğinde 'CDE Değerlendirilmedi' gösterir).",
        basis: "TS EN ISO 19650-1/2 & EN 17412-1 (CalmIfcWorkspace.tsx — Faz 2.1)",
      },
      "fiyat-eslestirme": {
        before: "6 resmi ÇŞB 2026 kataloğunda PDF'lerdeki 18.848 satırın yalnız 689 adedi yer alıyordu ve kapsam raporu fonksiyonu yoktu.",
        after: "6 resmi 2026 ÇŞB PDF kitabındaki toplam 18.848 poz ve rayicin tamamı (18.848 / 18.848 satır; 6/6 kitap tam kapsam) mühürlü kataloğa aktarıldı; getOfficialCatalogCoverageReport() ve 20.000 satır PDF içe aktarma kapasitesi devreye alındı.",
        basis: "ÇŞB YFK 2026 Mart İnşaat/Mekanik/Elektrik BF & Rayiç Listeleri (src/server/crawler/csb-pdf-parser.ts — Faz 1.7 & Faz 2.4)",
      },
    },
  },
  {
    revision: "Rev. 12",
    version: "BIM-CALC-2026-10-17.6",
    date: "17 Ekim 2026",
    commit: "4b273de",
    trigger: "YOL_HARITASI_2026-10-17 Faz 2.1 / 2.2 / 2.6 & Bölüm 7 Karar #2 / #3 / #4 / #6: ISO 19650 CDE Durum Geçiş Doğrulayıcısı (validateCdeStateTransition), 4 Teslim Aşamalı EIR/LOIN Kural Motoru (evaluateLoinByMilestone), İnteraktif Minha Profili Seçicisi (ÇŞB 0,50 m² / DIN 18350 2,50 m² / Özel Şartname) ve Tarihli Yol Haritası Rozetleri",
    beforeSummary:
      "ISO 19650 motorunda WIP → SHARED → PUBLISHED → ARCHIVED geçiş sırasını ve doğrudan WIP → PUBLISHED atlama yasağını doğrulayan durum geçiş fonksiyonu (validateCdeStateTransition) ile 4 teslim aşamasına (CONCEPT/DEFINITIVE/IMPLEMENTATION/AS_BUILT) göre farklılaşan EIR/LOIN denetimi (evaluateLoinByMilestone) bulunmuyordu; ayrıca CalmIfcWorkspace 1. sekmesinde kullanıcı tanımlı Minha profil seçicisi ve oturum kalıcılığı yoktu.",
    afterSummary:
      "src/smartcheck/rules/iso19650.ts içine TS EN ISO 19650-2 §5.6–5.7 durum geçiş doğrulayıcısı (validateCdeStateTransition: doğrudan WIP→PUBLISHED geçişini reddeder, S0/S1..S7/A1..A7/B ve Pxx.xx/Cxx uyumunu denetler) ve BS EN 17412-1 4 teslim aşamalı EIR/LOIN motoru (evaluateLoinByMilestone: CONCEPT LOD 200, DEFINITIVE LOD 300, IMPLEMENTATION LOD 350, AS_BUILT LOD 400) eklendi; CalmIfcWorkspace üzerinde CDE geçiş kaydı, EIR aşaması, KİK YM/T_i girdileri ve Minha profili (CSB_2026: 0,50 m², DIN_18350: 2,50 m², CUSTOM_CONTRACT: kullanıcı tanımlı m²) localStorage kalıcılığıyla bağlandı; Bölüm 7 kararları doğrultusunda ISO 19650 için 'destekler' dili ve EKAP/veraPDF için 'Yol Haritasında · 2026 Q4' rozetleri uygulandı.",
    affectedModules: ["iso19650", "minha", "kik-adt"],
    moduleDetails: {
      iso19650: {
        before: "CDE durum ve revizyon kodu yalnızca tekil anlık değer olarak kontrol ediliyor; durumlar arası geçiş sırası (WIP → SHARED → PUBLISHED) ve teslim aşamasına (CONCEPT..AS_BUILT) göre değişen LOIN gereksinimleri denetlenmiyordu.",
        after: "validateCdeStateTransition ile WIP→PUBLISHED doğrudan geçişi engellenip onaylı geçiş geçmişi kaydedildi; evaluateLoinByMilestone ile 4 teslim aşamasına (LOD 200/300/350/400) göre gerçek IFC elemanlarında poz, kat, malzeme ve geometri tamlığı denetlendi.",
        basis: "TS EN ISO 19650-2 §5.6–5.7 & BS EN 17412-1 (src/smartcheck/rules/iso19650.ts — Faz 2.1 & 2.2)",
      },
      minha: {
        before: "minha.ts içinde CUSTOM_CONTRACT profili tanımlıydı ancak CalmIfcWorkspace 1. sekmesinde (Kağıt İcmal) kullanıcının CSB_2026 (0,50 m²), DIN_18350 (2,50 m²) ve Özel Şartname (m²) arasında canlı geçiş yapabileceği seçici yoktu.",
        after: "CalmIfcWorkspace 1. sekmesine interaktif Minha Profili seçicisi ve özel şartname m² giriş alanı eklendi; seçilen eşik sağ detay kartındaki minha açıklamasına ve localStorage oturumuna bağlandı.",
        basis: "ÇŞB YFK 2026 Genel Teknik Şartnamesi, DIN 18350 VOB/C & YOL_HARITASI §7 Karar #4",
      },
      "kik-adt": {
        before: "Kullanıcı tarafından girilen YM ve rakip teklifler sayfa yenilendiğinde sıfırlanıyor, EKAP tutanak içe aktarımının yol haritası takvimi kart üzerinde belirtilmiyordu.",
        after: "KİK YM, iş grubu (N=1,00 / 1,20) ve rakip teklif listesi oturum boyunca localStorage üzerinde kalıcı hale getirildi; 'EKAP Tutanak İçe Aktarımı: Yol Haritasında · 2026 Q4 (Faz 3)' rozeti eklendi.",
        basis: "Kamu İhale Genel Tebliği m.45.1.1 & YOL_HARITASI §7 Karar #2 & #6",
      },
    },
  },
  {
    revision: "Rev. 13",
    version: "BIM-CALC-2026-10-17.7",
    date: "17 Ekim 2026",
    commit: "63ea873",
    trigger: "YOL_HARITASI_2026-10-17 Faz 2.5 & Bölüm 7 Karar #1: 4735 Sayılı Kanun Fiyat Farkı (F = A_n × B × (P_n − 1)) & ÇŞB 2026 – TÜİK 21 Alt Endeks Güncelleme Motoru (price-escalation.ts) ve BYOL Lisans Modu Seçicisi",
    beforeSummary:
      "csb_2026_tuik_endeks_eslestirme içindeki 21 resmi TÜFE/Yİ-ÜFE alt endeksini kullanarak 4735 Sayılı Kamu İhale Sözleşmeleri Kanunu fiyat farkını (F = A_n × B × (P_n − 1)) ve geçerlilik dönemi dolmuş aylık ÇŞB birim fiyatlarının dönem dışı eskalasyonunu hesaplayan bağımsız bir motor yoktu; ayrıca CalmIfcWorkspace üzerinde BYOL / ÇŞB lisans modu seçicisi bulunmuyordu.",
    afterSummary:
      "src/lib/price-escalation.ts ve 5 senaryolu golden test seti (src/lib/price-escalation.test.ts) oluşturularak 21 resmi ÇŞB 2026 – TÜİK alt endeksiyle hem 4735 Fiyat Farkı Kararnamesi (F = A_n × 0,90 × (P_n − 1), Σw_i = 1,00 kontrolü ve tam kuruş hassasiyeti) hem de dönem dışı birim fiyat eskalasyonu (indexOutOfPeriodUnitPrice: açık 'TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat' etiketiyle) devreye alındı ve Yetenek Kaydına L3 live olarak eklendi (BIM-CAP-2026-10-17.4). CalmIfcWorkspace 3. sekmesine BYOL / ÇŞB 2026 lisans modu seçicisi (Karar #1) ve interaktif 4735 Fiyat Farkı & TÜİK 21 Alt Endeks kartı entegre edildi.",
    affectedModules: ["eskalasyon", "fiyat-eslestirme"],
    moduleDetails: {
      eskalasyon: {
        before: "Yalnızca nakit akışı T/2 harcama dağılımı tahmini vardı; 4735 Sayılı Kanun Fiyat Farkı Esasları (F = A_n × B × (P_n − 1)) ve 21 TÜİK alt endeksiyle hakediş fiyat farkı hesabı bulunmuyordu.",
        after: "computeContractPriceEscalation4735 ve indexOutOfPeriodUnitPrice ile 21 ÇŞB-TÜİK alt endeksi üzerinden resmi 4735 fiyat farkı ve dönem dışı tahmini birim fiyat güncellemesi eklendi.",
        basis: "4735 Sayılı Kanun Fiyat Farkı Esasları & ÇŞB 2026 Ocak Rayiç–TÜİK Endeks Eşleştirme Tablosu (src/lib/price-escalation.ts — Faz 2.5)",
      },
      "fiyat-eslestirme": {
        before: "CalmIfcWorkspace 3. sekmesinde BYOL (Kurum İçi Lisanslı Katalog) ile ÇŞB 2026 Mart Referans Kataloğu ayrımını ve dönem dışı TÜİK endeks güncellemesini gösteren açık bir kontrol yoktu.",
        after: "BYOL / ÇŞB 2026 Lisans Modu seçicisi (Karar #1) ve dönem dışı pozlar için 'TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat' rozeti eklendi.",
        basis: "YOL_HARITASI_2026-10-17.md §4 Faz 2.5 & §7 Karar #1",
      },
    },
  },
  {
    revision: "Rev. 14",
    version: "BIM-CALC-2026-10-17.8",
    date: "17 Ekim 2026",
    commit: "181768b",
    trigger: "YOL_HARITASI_2026-10-17 Bölüm 7 Karar #5: Türkiye Kartları ve Taksitli Tahsilat (iyzico / PayTR / Stripe TR) Ödeme Kanalı Seçicisi ve 1–12 Taksit Simülatörü (Billing.tsx)",
    beforeSummary:
      "Faturalandırma ekranında (Billing.tsx) yalnızca Havale/EFT IBAN talimatı ve tekil Stripe test kontrolü yer alıyor; Türkiye ticari kredi kartları (Bonus, World, Maximum, Axess, Paraf, Bankkart, Troy) ve 1/3/6/9/12 taksit seçenekleri için yerel sağlayıcı (iyzico / PayTR) adaptörü bulunmuyordu.",
    afterSummary:
      "YOL_HARITASI_2026-10-17.md §7 Karar #5 ('Türkiye kartları ve taksit için yerel sağlayıcı — iyzico / PayTR / Stripe TR') uyarınca Billing.tsx ekranına Ödeme Kanalı seçicisi ('Havale / EFT (%10–%30 İskonto)' vs 'Türkiye Kartları & Taksit (iyzico / PayTR)') ve 1 / 3 / 6 / 9 / 12 taksit vadeli kurumsal kart ödeme planı önizlemesi (3D Secure 2.0 + TCMB lisanslı yerel POS hazırlığı) eklendi.",
    affectedModules: ["kota"],
    moduleDetails: {
      kota: {
        before: "Billing.tsx üzerinde yalnızca kurumsal Havale/EFT sipariş referansı ve tek çekim Stripe kontrolü bulunuyordu.",
        after: "Havale/EFT (%10–%30 dönem iskontosu) ile Türkiye Kartları & Taksit (iyzico / PayTR — Bonus, World, Maximum, Axess, Paraf, Bankkart, Troy için 1/3/6/9/12 taksit tablosu) arasında geçiş sağlayan çift kanallı tahsilat seçicisi eklendi.",
        basis: "YOL_HARITASI_2026-10-17.md §7 Karar #5 (Tahsilat: Türkiye kartları ve taksit için yerel sağlayıcı)",
      },
    },
  },
  {
    revision: "Rev. 15",
    version: "BIM-CALC-2026-10-17.9",
    date: "17 Ekim 2026",
    commit: "2672889",
    trigger: "Şantiye hakediş geri bildirimi (17 Ekim 2026) Paket M-1: Daire Bazlı Taşeron Hakediş Kalkanı (apartment-subcontractor-shield.ts)",
    beforeSummary:
      "Bağımsız bölüm cetveli (sekme 2) yalnızca daire/oda net alanlarını gösteriyordu; sıvacı, şapçı ve kaplamacı taşeronların hakedişte beyan ettiği m² değerini daire bazında denetleyen bir tavan, harç hacmi veya çimento hesabı yoktu.",
    afterSummary:
      "Seçilen dairenin IFC mahal cetvelinden şap ve zemin kaplaması hakediş tavanı, kullanıcı girdili kalınlık / fire / çimento dozajıyla harç hacmi ve çimento miktarı ile taşeron beyanı karşılaştırması eklendi. Duvar sıvası alanı IFC'de bulunmadığı için yalnızca kullanıcı girdisiyle hesaplanır; gizli varsayılan yoktur. Yetenek Kaydına pilot (L2) olarak işlendi; uzman onayı alınmadan canlı iddiası yapılmaz.",
    affectedModules: ["taseron-hakedis-kalkani"],
    moduleDetails: {
      "taseron-hakedis-kalkani": {
        before: "Daire bazında hakediş tavanı, harç hacmi ve taşeron beyanı karşılaştırması yoktu.",
        after: "computeApartmentSubcontractorShield ile daire başına şap/kaplama tavanı (m²), harç hacmi (m³), çimento (kg) ve beyan fazlası (m²) hesaplanır; girilmeyen girdi için çıktı null döner.",
        basis: "Şantiye hakediş geri bildirimi (17 Ekim 2026) & IFC IfcSpace/IfcZone mahal net alanları",
      },
    },
  },
  {
    revision: "Rev. 16",
    version: "BIM-CALC-2026-10-17.10",
    date: "17 Ekim 2026",
    commit: "dcd64d2",
    trigger: "openBIM saha geri bildirimi (17 Ekim 2026) Paket M-2: IFC Kaynak Yazılım Tespiti ve Metraj Güvenilirliği Uyarısı (authoring-software-diagnostics.ts)",
    beforeSummary:
      "IFC dosyasının hangi yazılımdan (Allplan, Revit, Archicad) geldiği okunmuyor, kullanıcıya kaynak yazılıma bağlı model kontrolü uyarısı gösterilmiyordu.",
    afterSummary:
      "IFC başlığındaki FILE_NAME ve IFCAPPLICATION kaydından kaynak yazılım tespit edilir ve Calm çalışma alanının üstünde uyarı gösterilir. Uyarılar uzman saha gözlemi olarak etiketlenir; hiçbir yazılım için doğruluk garantisi veya sabit sapma yüzdesi iddia edilmez. Kullanıcının kendi ölçüsüyle tek odalık katman daralması aritmetiği (10 × 10 m, 2 cm → 99,20 m², %0,80) eklendi. Yetenek Kaydına pilot (L2) olarak işlendi.",
    affectedModules: ["kaynak-yazilim-guvenilirligi"],
    moduleDetails: {
      "kaynak-yazilim-guvenilirligi": {
        before: "Kaynak yazılım tespiti ve yazılıma bağlı model kontrolü uyarısı yoktu.",
        after: "detectAuthoringSoftware ve buildAuthoringAdvisory ile Allplan/Revit/Archicad/Tekla tespiti ve uyarı; computeFinishLayerShrinkage ile tek odalık katman daralması aritmetiği.",
        basis: "openBIM saha geri bildirimi (17 Ekim 2026, Tespit 1–3) — uzman gözlemi; ISO 10303-21 HEADER FILE_NAME",
      },
    },
  },
  {
    revision: "Rev. 17",
    version: "BIM-CALC-2026-10-17.11",
    date: "17 Ekim 2026",
    commit: "cd7c478",
    trigger: "Şantiye saha geri bildirimi (17 Ekim 2026) Paket M-3: IFC Öncesi Ön Teklif / Kat Karşılığı Fizibilite Motoru (pre-bim-feasibility.ts)",
    beforeSummary:
      "Ürün yalnızca yüklenmiş IFC/Excel/PDF dosyasından metraj çıkarıyordu; projesi olmayan ön teklif aşamasında arsa, TAKS/KAKS ve çoklu parselden alan, daire paylaşımı ve vaat denetimi hesaplanamıyordu.",
    afterSummary:
      "Kullanıcının girdiği arsa alanı, TAKS, KAKS ve emsal harici alanlardan çoklu parsel taban/emsal/toplam inşaat alanı, seçilen pay tabanı ve yüzdesiyle arsa sahibi/müteahhit paylaşımı, net/brüt oranıyla daire başı alan, isteğe bağlı birim maliyet ve maliyet yüzde dağılımı hesaplanır; vaat edilen daire başı brüt alanın paylaşım kapasitesini aşıp aşmadığı aritmetik olarak denetlenir. Hiçbir sayısal girdi için varsayılan veya piyasa ortalaması yoktur; CSV (noktalı virgül) içe/dışa aktarım vardır. Yetenek Kaydına pilot (L2) olarak işlendi.",
    affectedModules: ["on-teklif-fizibilite"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "IFC/Excel dosyası olmadan arsa ve imar değerlerinden ön teklif hesabı yoktu.",
        after: "computeFeasibility ile parsel alanları, kat karşılığı paylaşımı, daire başı brüt/net, maliyet ve vaat-kapasite aritmetiği; parseParcelCsv / exportFeasibilityCsv ile Excel uyumlu CSV.",
        basis: "Şantiye saha geri bildirimi (17 Ekim 2026, Tespit 4–5); TAKS/KAKS değerleri imar durumu belgesinden kullanıcı girdisi",
      },
    },
  },
  {
    revision: "Rev. 18",
    version: "BIM-CALC-2026-10-17.12",
    date: "17 Ekim 2026",
    commit: "59fcf0a",
    trigger: "Yanıt beklenen sorulardan bağımsız iş 1: Sunucu (Python) yolunda kaynak yazılım tespiti",
    beforeSummary:
      "Kaynak yazılım tespiti yalnızca tarayıcı (metin) yolunda çalışıyordu; sunucu (IfcOpenShell) kanıt yolundan gelen kayıtlarda uyarı gösterilemiyordu.",
    afterSummary:
      "Python worker IFC başlığından (FILE_NAME) ve IfcApplication kayıtlarından ham kaynak yazılım bilgisini okur; sınıflandırma tek kaynak olan TypeScript modülünde yapılır ve kanıt (artifact) özetine, oradan Calm çalışma alanı uyarısına taşınır. Gerçek dosya başlıkları ile doğrulandı: Revit IFC'de başlıkta yazılım adı yoktur (adı yalnızca IfcApplication'dadır), Allplan modelinde originating_system boştur; sınıflandırma bu iki durumu da çözer.",
    affectedModules: ["kaynak-yazilim-guvenilirligi"],
    moduleDetails: {
      "kaynak-yazilim-guvenilirligi": {
        before: "Sunucu kanıt yolunda kaynak yazılım okunmuyor, uyarı yalnızca tarayıcı yolunda görünüyordu.",
        after: "read_authoring_software (Python) ham başlık bilgisini okur; classifyAuthoringSoftware sınıflandırır; artifact.summary.authoringSoftware ve CalmIfcDataset.authoringAdvisory ile uyarı sunucu yolunda da görünür.",
        basis: "Gerçek IFC başlıkları (Ifc4_Revit_STR.ifc, Allplan modeli) ve ISO 10303-21 HEADER FILE_NAME",
      },
    },
  },
  {
    revision: "Rev. 19",
    version: "BIM-CALC-2026-10-17.13",
    date: "17 Ekim 2026",
    commit: "4aa8e9e",
    trigger: "Yanıt beklenen sorulardan bağımsız iş 2: Ön teklif parsel dosyası için doğrudan .xlsx içe aktarım",
    beforeSummary:
      "Ön teklif fizibilite paneli parsel listesini yalnızca CSV (noktalı virgül) olarak alıyordu; müteahhitler Excel'de çalıştığı için dosyayı önce CSV'ye çevirmek gerekiyordu.",
    afterSummary:
      ".xlsx dosyası doğrudan okunur (ilk sayfa, ilk satır başlık, 5 MB sınırı, formül hücresinin sonucu, sayı ve Türkçe biçimli metin sayılar). CSV ve .xlsx aynı satır ayrıştırıcısını (parseParcelRows) kullanır. exceljs yalnızca .xlsx seçilince dinamik yüklenir (ayrı 940 kB parça); ana açılışa girmez.",
    affectedModules: ["on-teklif-fizibilite"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "Parsel listesi yalnızca CSV olarak içe aktarılabiliyordu.",
        after: "parseParcelXlsx ile .xlsx doğrudan okunur; CSV ve xlsx ortak parseParcelRows kullanır; dosya boyutu sınırı ve hata mesajları var.",
        basis: "Şantiye saha geri bildirimi (Tespit 4): müteahhitlerin Excel ile ön teklif çalışması",
      },
    },
  },
  {
    revision: "Rev. 20",
    version: "BIM-CALC-2026-10-17.14",
    date: "17 Ekim 2026",
    commit: "1c8af3e",
    trigger: "Yanıt beklenen sorulardan bağımsız iş 3: Kaynaksız brüt/boşluk ve daire brüt çarpanlarının kaldırılması",
    beforeSummary:
      "Calm icmal, modelde brüt/boşluk verisi yokken sabit çarpanlarla brüt ve boşluk üretiyordu (duvar/tavan ×1,115, süpürgelik ×1,08, ytong ×1,215, beton ×1,03). Daire brüt alanı da kaynaksız çarpanlarla üretiliyordu (Python: ×1,132 ve ×1,298; TypeScript yedeği: ×1,12 ve ×1,28 — iki yol birbirinden de farklıydı). Ekranda 'Brüt − Boşluk = Net' ve 'Daire Brüt' olarak modelden geliyormuş gibi görünüyordu.",
    afterSummary:
      "Brüt ve boşluk yalnızca modelde (GrossSideArea/NetSideArea) varsa gösterilir; yoksa kalem 'modelde brüt/boşluk verisi yok' notuyla yalnız net miktarı gösterir (grossAvailable=false). Süpürgelikte uzunluk yoksa kullanılan alan ÷ 0,06 m varsayımı formül notunda açıkça belirtilir. Daire brüt alanı IFC'den gelmez (null); kullanıcı brüt/net katsayısını girerse hesaplanır, girmezse '—' görünür ve m² başı maliyet hesaplanmaz. Sabit çarpanların geri gelmesini engelleyen bir kapı testi eklendi.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Modelde brüt/boşluk yokken sabit çarpanlarla üretilip modelden geliyormuş gibi gösteriliyordu; daire brütü kaynaksız çarpanlarla üretiliyordu.",
        after: "grossAvailable bayrağı ile yalnızca model verisi gösterilir; daire brütü kullanıcı katsayısıyla (apartment-gross.ts) hesaplanır, katsayı yoksa null.",
        basis: "Dürüstlük kuralı: kaynaksız çarpan yok; modelden gelmeyen değer modelden geliyormuş gibi sunulmaz",
      },
    },
  },
  {
    revision: "Rev. 21",
    version: "BIM-CALC-2026-10-17.15",
    date: "17 Ekim 2026",
    commit: "57468db",
    trigger: "Yanıt beklenen sorulardan bağımsız iş 4: Minha eşiğinin gerçek kapı/pencere ölçülerine bağlanması ve Rev. 18 sunucu yolu hatasının düzeltilmesi",
    beforeSummary:
      "Minha profil seçicisi ve 'Kullanıcı Tanımlı Eşik' kutusu (kaynaksız 1,50 m² varsayılanıyla) hiçbir hesaba bağlı değildi; yalnızca etiketti. Ayrıca Rev. 18'de 'sunucu yolunda kaynak yazılım tespiti' tamamlandı denmişti, ancak sunucu çıktı şeması (zod) bilinmeyen alanları sildiği için authoringSoftwareRaw sunucu yolunda hiçbir zaman arayüze ulaşmıyordu; testler elle kurulmuş özetle çalıştığından bu görülmemişti.",
    afterSummary:
      "Python worker kapı/pencereleri tek tek (OverallWidth × OverallHeight, proje birimiyle metreye çevrilerek) okur; ölçü yoksa null döner. Seçilen profilin eşiği her boşluğun tekil alanına uygulanır ve düşülecek/düşülmeyecek adet ve alan ile ölçüsü okunamayan boşluk sayısı gösterilir; özel şartnamede eşik girilmeden hesap yapılmaz, kaynaksız 1,50 varsayılanı kaldırıldı. Sunucu şeması authoringSoftwareRaw ve openings alanlarını tanımlar. Gerçek IFC dosyalarıyla Python → şema → kanıt → arayüz verisi uçtan uca testi eklendi (Rev. 18'in sunucu yolu ilk kez gerçekten doğrulandı).",
    affectedModules: ["minha", "kaynak-yazilim-guvenilirligi"],
    moduleDetails: {
      "minha": {
        before: "Eşik seçicisi hesaba bağlı değildi; özel eşik kutusunun kaynaksız 1,50 varsayılanı vardı.",
        after: "summarizeOpeningsMinha ile modeldeki her kapı/pencerenin tekil alanına seçilen profilin eşiği uygulanır; ölçüsüz boşluklar ayrıca sayılır; özel eşik girilmeden hesap yapılmaz.",
        basis: "Minha profilleri (CSB_2026 0,50 m², DIN_18350 2,50 m², CUSTOM_CONTRACT) & IFC IfcDoor/IfcWindow OverallWidth/OverallHeight",
      },
      "kaynak-yazilim-guvenilirligi": {
        before: "Sunucu çıktı şeması authoringSoftwareRaw alanını siliyordu; sunucu yolunda uyarı arayüze ulaşmıyordu (Rev. 18'de yanlış olarak tamamlandı sayılmıştı).",
        after: "IfcParseSummarySchema alanı tanımlar; gerçek IFC ile uçtan uca test (Python → zod → artifact → dataset) Revit başlığında yazılım adı bulunmayan durumu doğrular.",
        basis: "Gerçek IFC başlıkları ve uçtan uca test",
      },
    },
  },
  {
    revision: "Rev. 22",
    version: "BIM-CALC-2026-10-17.16",
    date: "17 Ekim 2026",
    commit: "9584df2",
    trigger: "Ücretsiz halka açık hesaplayıcılar: Aşırı düşük teklif sınır değeri (KİK) ve 4735 fiyat farkı",
    beforeSummary:
      "KİK sınır değer ve 4735 fiyat farkı motorları yalnızca giriş yapmış kullanıcıların çalışma alanında (CalmIfcWorkspace) kullanılabiliyordu; müteahhitlerin doğrudan aradığı bu hesaplar herkese açık değildi. 4735 motoru sözleşmedeki sabit katsayıyı (a) temsil edemiyordu.",
    afterSummary:
      "/hesaplayicilar, /hesaplayicilar/kik-asiri-dusuk-teklif ve /hesaplayicilar/fiyat-farki-4735 halka açık sayfaları eklendi (giriş gerekmez, hesap tarayıcıda yapılır, sitemap ve llms.txt'ye eklendi). Hiçbir değer varsayılmaz: YM, iş grubu, teklifler, B katsayısı, sabit katsayı, ağırlıklar ve endeks değerleri kullanıcı girdisidir; endeks verisi çekilmez. Her sayfada 'bağımsız doğrulanmamıştır' uyarısı ve dayanak listesi vardır. 4735 motoruna isteğe bağlı sabit katsayı (a) eklendi (ağırlık toplamına dahil, Pn'e a × 1 girer). Türkçe sayı ayrıştırıcı (1.250.000,50) ve form-motor eşleme katmanı testlerle eklendi. Yetenek Kaydına pilot (L2) olarak işlendi.",
    affectedModules: ["kik-adt", "eskalasyon"],
    moduleDetails: {
      "kik-adt": {
        before: "Sınır değer hesabı yalnızca giriş yapılmış çalışma alanında vardı.",
        after: "Aynı motor halka açık sayfadan, Türkçe biçimli girdilerle ve adım adım gösterimle kullanılabilir; form katmanı motor sonucunu değiştirmez (testle doğrulandı).",
        basis: "Kamu İhale Genel Tebliği m.45.1.1–45.1.2; src/lib/calculators/kik-form.ts",
      },
      "eskalasyon": {
        before: "4735 motoru sabit katsayıyı (a) temsil edemiyordu ve yalnızca çalışma alanından kullanılabiliyordu.",
        after: "constantWeight (a) isteğe bağlı olarak eklendi (Σ ağırlık + a = 1,00, Pn += a); halka açık sayfadan B ve tüm katsayılar kullanıcı girdisiyle hesaplanır.",
        basis: "4735 m.8 ve sözleşme fiyat farkı formülü; src/lib/calculators/escalation-form.ts",
      },
    },
  },
  {
    revision: "Rev. 23",
    version: "BIM-CALC-2026-10-17.17",
    date: "17 Ekim 2026",
    commit: "4b83f24",
    trigger: "Dış kaynak incelemesi (müteahhit süreç analizi raporu): KİK N katsayısı aralık denetimi ve hesaplayıcı iyileştirmeleri",
    beforeSummary:
      "KİK motoru nCoefficientOverride değerini aralık denetimi olmadan kabul ediyordu (N = 5 gibi bir değer yanlış sınır değer üretirdi); halka açık hesaplayıcıda idarenin farklı N belirleyebilmesi yoktu; 4735 sayfasındaki 'sabit katsayı a' etiketi sözleşmeye göre değişen sembolü yanlış tanımlayabilirdi.",
    afterSummary:
      "İdare N'yi ilanda 1,00–1,20 arasında farklı belirleyebildiğinden motor bu aralık dışındaki N değerlerini hata olarak reddeder; hesaplayıcıya 'İdarenin belirlediği N' alanı eklendi; sayfaya yalnız yapım işleri için olduğu ve idarenin açıklama isteyip istemeyeceğinin ihale dokümanına bağlı olduğu notu eklendi; 4735 sayfasındaki etiket 'endekse bağlı olmayan sabit terim' olarak nötrleştirildi. Raporun KİK sınır değer algoritması kodumuzla tutarlı bulundu; KDV, ödeme dilimi ve pay yüzdeleri gibi doğrulanamayan iddialar ürüne alınmadı.",
    affectedModules: ["kik-adt"],
    moduleDetails: {
      "kik-adt": {
        before: "nCoefficientOverride aralık denetimsizdi; hesaplayıcıda idarenin N'si girilemiyordu.",
        after: "N yalnızca 1,00–1,20 aralığında kabul edilir, dışı hata verir; hesaplayıcıda isteğe bağlı N alanı vardır.",
        basis: "Kamu İhale Genel Tebliği m.45.1.1.1 (idarenin N belirleme yetkisi) — dış rapor bulgusu, bağımsız doğrulanmadı",
      },
    },
  },
  {
    revision: "Rev. 24",
    version: "BIM-CALC-2026-10-17.18",
    date: "17 Ekim 2026",
    commit: "e397b28",
    trigger: "Ön teklif fizibilitesinden teklif taslağı oluşturma ve doğrudan Excel/CSV teklif kalemi aktarımı",
    beforeSummary:
      "Ön teklif fizibilite paneli ile teklif hazırlama ekranı (CreateQuote) arasında veri köprüsü yoktu; kullanıcının hesapladığı toplam alan veya kalemler teklif ekranına taşınamıyordu. Ayrıca teklif hazırlama ekranında doğrudan Excel (.xlsx) veya CSV dosyası yükleyerek iş kalemi aktarma arayüzü bulunmuyordu.",
    afterSummary:
      "PreBimFeasibilityPanel'e 'Teklif Taslağı Oluştur →' butonu ve pre-bim-quote-draft köprüsü eklendi; parsel ve maliyet verisi (maliyet dağılımı girildiyse 5 kalem, girilmediyse tek alan kalemi) güvenle sessionStorage üzerinden CreateQuote'a aktarılır. CreateQuote'a doğrudan Excel (.xlsx / dinamik exceljs) ve CSV dosyalarından kalem içe aktarma motoru (quote-excel-import.ts) eklendi; Türkçe ve uluslararası sayı formatları, poz no, birim, miktar, birim fiyat, KDV/iskonto otomatik ayrıştırılır; örnek CSV şablon indirme butonu ve içe aktarım bildirim kartı yerleştirildi.",
    affectedModules: ["on-teklif-fizibilite", "teklif-satir"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "Fizibilite sonucu teklif hazırlama ekranına bağlanamıyordu.",
        after: "buildPreBimQuoteDraft ile doğrulanmış taslak üretilir; fiyat uydurulmaz, girilmemişse 0 ₺ ve uyarı notuyla aktarılır; CreateQuote ekranında 'Ön Teklif Fizibilitesinden Aktarıldı' kartı ile gösterilir.",
        basis: "Kullanıcı akışı: imar/parsel ön teklifinden doğrudan teklif taslağına geçiş ve şeffaf dayanak notları",
      },
      "teklif-satir": {
        before: "Teklif hazırlama ekranında Excel/CSV dosyasıyla toplu kalem yükleme UI'ı yoktu.",
        after: "parseQuoteXlsx / parseQuoteCsv motoru ile .xlsx ve .csv dosyaları 5 MB sınırı ve formül korumasıyla okunur; örnek şablon indirilebilir; içe aktarılan kalemler uyarılarıyla listelenir.",
        basis: "Müteahhit saha pratiği: mevcut Excel teklif/metraj tablolarının sisteme doğrudan aktarılması",
      },
    },
  },
  {
    revision: "Rev. 25",
    version: "BIM-CALC-2026-10-17.19",
    date: "17 Ekim 2026",
    commit: "b73f088",
    trigger: "Teklif hazırlama ve detay ekranlarında Light Mode kontrast ve erişilebilirlik refaktörü (WCAG 2.2 AA)",
    beforeSummary:
      "Teklif hazırlama (/app/quotes/new) ve detay (/app/quotes/:id) sayfalarında 'Detay / İş Kalemi' sabit sütununda ve girdi kutularında sabit bg-zinc-950/95, border-zinc-800 ve açık tonlu pastel metinler (text-amber-200, text-emerald-200, text-sky-200) kullanıldığı için Light Mode'da sütun siyah bir blok halinde görünüyor, koyu metinler siyah zemin üzerinde tamamen okunamaz hale geliyordu.",
    afterSummary:
      "CreateQuote ve QuoteDetail sayfalarındaki tüm sabit zinc-* sınıfları semantik pafta tasarım sistemi tema belirteçlerine (bg-card, bg-background, border-border, text-foreground, text-muted-foreground, bg-primary, text-primary) dönüştürüldü. Tablo sabit ilk sütunu bg-card border-r border-border ile hem Light hem Dark Mode'da şeffaf ve yüksek kontrastlı hale getirildi; bildirim ve uyarı kartlarında WCAG 2.2 AA uyumlu koyu metinler (text-amber-950 dark:text-amber-300, text-emerald-950 dark:text-emerald-300, text-sky-950 dark:text-sky-300) uygulandı; sağ panel parametreleri, fiyatlandırma özet kartı ve ipucu kutuları semantik temaya bağlandı.",
    affectedModules: ["teklif-satir", "maliyet-marj"],
    moduleDetails: {
      "teklif-satir": {
        before: "Tablo ilk sütunu sabit bg-zinc-950/95 olduğu için Light Mode'da siyah blok olarak çıkıyor ve girdi yazısı okunmuyordu.",
        after: "Sabit sütun bg-card border-r border-border sınıflarıyla açık modda kağıt tonuna, koyu modda antrasite adapte edildi; girdi kutuları ve butonlar semantik tokenlere bağlandı.",
        basis: "Tasarım Sistemi & WCAG 2.2 Seviye AA kontrast standartları (DESIGN.md)",
      },
      "maliyet-marj": {
        before: "Maliyet birim fiyatı ve iskonto alanları açık modda okunması zor açık sarı/turuncu (text-amber-300, text-orange-300) kullanıyordu.",
        after: "Açık modda koyu okunabilir (text-amber-700 dark:text-amber-300, text-orange-600 dark:text-orange-300) renk hiyerarşisi uygulandı.",
        basis: "Kullanıcı arayüzü okunabilirlik doğrulaması",
      },
    },
  },
  {
    revision: "Rev. 26",
    version: "BIM-CALC-2026-10-17.20",
    date: "17 Ekim 2026",
    commit: "baefa67",
    trigger: "BIMMetraj Marka Tescili, Kat Karşılığı & Kentsel Dönüşüm Fizibilite ve YAMBİS Belge Kapasite Motorları",
    beforeSummary:
      "Özel sektör müteahhitlerinin arsa payı karşılığı ve 6306 sayılı Kentsel Dönüşüm projelerindeki rasyonel paylaşım oranı, kademeli tapu devri ve %1 KDV matrahı hesaplamaları ile ÇŞİDB YAMBİS müteahhitlik yetki belgesi sınıflandırması (A-H grupları ve bilanço rasyoları) için müstakil bir motor ve kullanıcı arayüzü bulunmuyordu. Ürün adı TeklifPro olarak kalmıştı.",
    afterSummary:
      "Kalıcı hafızada ve tüm bellek dokümanlarında marka resmi olarak BIMMetraj (bimmetraj.com) olarak tescil edildi. 6098 sayılı TBK m.470 vd., 6306 sayılı Afet Riski Altındaki Alanlar Kanunu ve Yargıtay içtihatlarına dayalı Kat Karşılığı Fizibilite Motoru (src/lib/kat-karsiligi.ts) ve ÇŞİDB Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği m.8/9/20'ye dayalı YAMBİS Sınıflandırma ve Kapasite Motoru (src/lib/yambis-classification.ts) tam test kapsamıyla geliştirildi. /hesaplayicilar/kat-karsiligi-ve-kentsel-donusum ve /hesaplayicilar/yambis-muteahhitlik-grubu sayfaları Pafta Tasarım Sistemi ile devreye alındı; sitemap, llms.txt ve SPA rotalarına eklendi.",
    affectedModules: ["on-teklif-fizibilite", "kik-adt"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "Yalnızca basit arsa/TAKS/KAKS alan hesabı vardı; rasyonel müteahhit payı formülü, kademeli tapu devir güvencesi ve 6306 KDV teşviki yoktu.",
        after: "calculateKatKarsiligi motoruyla (Maliyet × 1,20 / Satış) rasyonel paylaşım oranı, Yargıtay 15. H.D. uyumlu 4 aşamalı kademeli tapu devri hakediş planı ve 2026 güncel %1 KDV matrah tasarrufu hesaplanır.",
        basis: "TBK m.470 vd. Eser Sözleşmesi, 6306 s.K. m.7 Kentsel Dönüşüm teşvikleri ve 3065 s.K. konut teslim matrahları",
      },
      "kik-adt": {
        before: "Müteahhitlik firma yeterliklerinin ihale ve yapım kapasitesine etkisi hesaplanamıyordu.",
        after: "evaluateYambisMaliRasyolar motoruyla cari oran (≥0,75), özkaynak oranı (≥0,15) ve banka borçluluğu (≤0,75) rasyoları denetlenir; A'dan H'ye yetki grubu ve azami m² inşaat alanı kapasitesi çıkarılır.",
        basis: "ÇŞİDB Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik m.8, 9, 20",
      },
    },
  },
  {
    revision: "Rev. 27",
    version: "BIM-CALC-2026-10-17.21",
    date: "17 Ekim 2026",
    commit: "c9ea528160a16013a2b513663997ecfce85ca59a",
    trigger: "Bağımsız denetim kapanışı: gerçek imza kapısı, yayından çekilen hesaplayıcılar, sahte ödeme kanalının kaldırılması",
    beforeSummary:
      "Yetenek Kaydı'ndaki 10 yetenek kurgusal bir kurul adıyla L3 / canlı onaylıydı. Kat Karşılığı hesabında kaynaksız çarpanlar (brüt ×1,30, kâr ×1,20, konut 100 m²) ve konutun tamamına tek oranlı KDV, YAMBİS'te kaynaksız m² grup sınırları vardı; ikisi de halka açıktı.",
    afterSummary:
      "Hiçbir yetenek L3 değildir: L3 yalnız adı, unvanı, sicil numarası ve tarihi olan gerçek bir uzmanın imzasıyla verilir (kapı testi zorlar). Kat Karşılığı ve YAMBİS motorları yayından çıkarıldı; yeniden yayın için çarpanların kullanıcı girdisine çevrilmesi, KDV'nin 150 m²'ye kadar olan kısım / aşan kısım olarak GİB güncel oran tablosuyla parçalı hesaplanması ve grup tutarlarının yönetmelik ek tablolarıyla (TL) eşleştirilmesi gerekir.",
    affectedModules: ["on-teklif-fizibilite", "kik-adt"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "Kat karşılığı motoru varsayılan brüt çarpanı, kâr çarpanı ve konut büyüklüğüyle çalışıyor; kâr marjı formül gereği daima %20 çıkıyordu; KDV 150 m² üzerinde konutun tamamına %20 uyguluyordu; tapu devri aşamaları içtihat gibi sunuluyordu.",
        after: "Motor yayından çıkarıldı (Yetenek Kaydı: roadmap / L1). Ön teklif fizibilite paneli (pre-bim-feasibility) değişmedi; kaynaksız oran içermez.",
        basis: "DENETIM_RAPORU_2026-10-17 KK-1…KK-5; GİB konut teslimi KDV oranları (doğrulanacak)",
      },
      "kik-adt": {
        before: "Kayıt, KİK motorunu bağımsız uzman onaylı L3 / canlı gösteriyordu; onay kurgusaldı.",
        after: "KİK motoru L2 / pilot olarak etiketlendi. Golden testler formülden türetilmiş olduğundan KİK'in yayımladığı resmî örnek hesapla karşılaştırma ve imzalı mühendis/ihale uzmanı onayı beklenir. YAMBİS motoru yayından çıkarıldı.",
        basis: "Kamu İhale Genel Tebliği m.45.1; Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği (konsolide, Mayıs 2026)",
      },
    },
  },
  {
    revision: "Rev. 28",
    version: "BIM-CALC-2026-10-17.22",
    date: "17 Ekim 2026",
    commit: "fc811b0ad38ecaf2e94b4edaf9296c0a88d3d170",
    trigger: "HttpOnly çerez oturumu, uçtan uca smoke testleri ve tasarım token göçü (hesap kuralı değişmedi)",
    beforeSummary:
      "Oturum anahtarı tarayıcı depolamasındaydı; çekirdek akış (teklif, PDF) tarayıcıda uçtan uca doğrulanmıyordu.",
    afterSummary:
      "Hiçbir hesap, formül veya kural değişmedi. Teklif oluşturma ve PDF üretimi gerçek sunucu ve tarayıcıyla CI'da smoke testten geçiyor (E2E: 10 adet × 3.000 ₺ satırı için teklif kaydı ve PDF yanıtı).",
    affectedModules: ["teklif-satir"],
    moduleDetails: {
      "teklif-satir": {
        before: "Teklif kalemi hesabı birim testlerle doğrulanıyordu; tarayıcı üzerinden kayıtlı teklif ve PDF akışı otomatik denenmiyordu.",
        after: "scripts/e2e-core-flow-smoke.ts, çerez oturumuyla müşteri ve teklif oluşturur, PDF üretir; hesap motoru değişmedi.",
        basis: "Mevcut calculations.ts yöntemi; yalnız doğrulama kapsamı genişledi",
      },
    },
  },
  {
    revision: "Rev. 29",
    version: "BIM-CALC-2026-10-17.23",
    date: "17 Ekim 2026",
    commit: "ef91174292d2ff9db6cd55aac6a7178a71ce56b8",
    trigger: "Resmî veri araştırması: KİK sınır değer resmî örnek doğrulaması ve yuvarlama, müteahhit sınıflandırma yönetmeliği, konut KDV kademeleri",
    beforeSummary:
      "KİK motoru C ve K'yı yuvarlamıyor ve Tebliğ 45.2 resmî örneğinde 52.260,35 TL üretiyordu (resmî sonuç 52.281,00 TL). Müteahhit sınıflandırma ve kat karşılığı motorları kaynaksız sabitler, hatalı KDV ve gizli varsayılanlar içeriyordu.",
    afterSummary:
      "KİK motoru Tebliğ'in adım adım yuvarlamasıyla (Tort1/σ/Tort2 2, C/K 3 ondalık) resmî örneği birebir üretir. Müteahhit sınıflandırma motoru yönetmelik metnine (14 grup, yapı sınır bedeli katları, bilanço/ciro/banka referansı, G/G1/H istisnaları) göre yeniden yazıldı. Kat karşılığı KDV'si 150 m² kısım bazlıdır; arsa sahibine teslimde matrah, KDV Genel Uygulama Tebliği I/B-8 uyarınca VUK m.267/2 maliyet bedeli + %5 (toptan) / %10 (perakende) olarak hesaplanır ve Tebliğ'in sayısal örnekleriyle test edilmiştir. Üç motor da yayında değildir ve bağımsız uzman onayı yoktur.",
    affectedModules: ["kik-adt"],
    moduleDetails: {
      "kik-adt": {
        before: "K katsayısı ve C oranı tam hassasiyetle taşınıyor; golden testler motorun kendi formülünden türetilmişti. Resmî örnekle karşılaştırma yapılmamıştı.",
        after: "Tort1, σ, Tort2 2; C, K 3 ondalığa yuvarlanır; her adımın yuvarlanmış sonucu sonraki adımda kullanılır. Kamu İhale Genel Tebliği 45.2 örneği (YM 100.000 TL, N = 1,20) golden testtir: Tort1 66.270,00; σ 20.317,05; Tort2 63.237,50; C 0,632; K 0,627; SD 52.281,00 TL.",
        basis: "Kamu İhale Genel Tebliği m.45.1.1, m.45.1.1.1, m.45.1.1.4 ve m.45.2 resmî sayısal örneği",
      },
    },
  },
  {
    revision: "Rev. 30",
    version: "BIM-CALC-2026-10-17.24",
    date: "17 Ekim 2026",
    commit: "53681be9e15fdab35578a609edf2e1b5cbfa5a93",
    trigger: "17 Saha Sorusu Yanıtları: Taşeron şap standardı (325 kg çimento + %10 fire), net mahal ölçüm kuralları, %30 emsal harici tavanı ve 27 kalemlik 6-villa maliyet referansı",
    beforeSummary:
      "Taşeron hakediş kalkanı şap harcı için çimento ve fire girdilerini serbest bırakıyor ancak Türkiye saha standardı referansı sunmuyordu. Ön teklif fizibilite motoru emsal harici alanın (%30) yasal sınırını denetlemiyordu ve 27 kalemlik piyasa maliyet dağılımı referansı bulunmuyordu.",
    afterSummary:
      "17 saha sorusuna verilen yazılı yanıtlar ve 6-villa maliyet analizi doğrultusunda: 1) Taşeron şap harcında Türkiye saha standardı (1 m³ şap = 325 kg çimento + %10 fire) ve 4 yaygın taşeron şişirme taktiği koda bağlandı (SITE_SCREED_BENCHMARK). 2) Net oda mahal ölçümünde 2 cm sıva payı (9,98x9,98), dışa açılan kapı eşik payı (+0,20 m²), kasa derinlik payı (+0,40 m²) ve süpürgelik formülü doğrulandı. 3) Ön teklif fizibilitesinde emsal harici alanın emsalin %30'unu aşamayacağı kuralı ve uyarısı eklendi. 4) 27 kalemlik gerçek 6-villa piyasa maliyet dağılımı (VILLA_MARKET_COST_BENCHMARK_2026, 4.135.752,77 TL) sisteme referans olarak entegre edildi.",
    affectedModules: ["taseron-hakedis-kalkani", "on-teklif-fizibilite"],
    moduleDetails: {
      "taseron-hakedis-kalkani": {
        before: "Şap harcı ve çimento hesabı yalnızca kullanıcı girdisiyle çalışıyordu, saha benchmark referansı yoktu.",
        after: "Şantiye şap standardı (325 kg/m³ çimento, %10 fire, 1:3-1:4 karışım) ve 4 yaygın taşeron şişirme taktiği denetim kriteri olarak eklendi.",
        basis: "Şantiye hakediş saha doğrulaması (17 Ekim 2026, Soru 1-3)",
      },
      "on-teklif-fizibilite": {
        before: "Emsal harici alan girilmediğinde uyarı veriliyor ancak emsalin %30'unu aşan durumlar uyarılmıyordu; maliyet dağılımı referansı yoktu.",
        after: "Planlı Alanlar İmar Yönetmeliği m.5/8 uyarınca emsal harici alan > %30 emsal uyarısı eklendi; 27 kalemlik gerçek 6-villa maliyet referansı (VILLA_MARKET_COST_BENCHMARK_2026) sisteme bağlandı.",
        basis: "Planlı Alanlar İmar Yönetmeliği m.5/8; 6-villa piyasa maliyet tablosu (17 Ekim 2026)",
      },
    },
  },
  {
    revision: "Rev. 31",
    version: "BIM-CALC-2026-10-17.25",
    date: "17 Ekim 2026",
    commit: "544e1dd565a58e65e63893325608c2ff56bb201f",
    trigger: "Müteahhitlik İş Akışları Karşılama Masası (Contractor Workflow Hub) ve Yaşam Döngüsü Yönlendiricisi",
    beforeSummary:
      "Kullanıcı giriş yaptığında (/app) yalnızca boş bir teklif masası uyarısı ('Henüz teklif verisi yok') görüyordu; arsa ön fizibilitesi, Excel'den ihale cetveli dönüştürme ve taşeron hakediş kalkanı gibi hayati aşamalar ilk ekranda yönlendirilmiyordu.",
    afterSummary:
      "Kullanıcıyı doğrudan projesinin bulunduğu yaşam döngüsüne göre yönlendiren 3 evreli Müteahhitlik Süreç Masası (ContractorWorkflowHub.tsx) devreye alındı: Evre 01 (Arsa & Ön Fizibilite / Excel İhale), Evre 02 (3D openBIM IFC Otomatik Metraj & Minha), Evre 03 (Taşeron Hakediş Kalkanı & 325 kg/m³ çimento tavanı). Aktif teklifler olduğunda kompakt hızlı süreç şeridine dönüşür.",
    affectedModules: ["on-teklif-fizibilite", "taseron-hakedis-kalkani", "ifc-metraj"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "Arsa fizibilitesine yalnızca SmartCheck altından kaydırılarak ulaşılabiliyordu.",
        after: "Ana karşılama masasından tek tıkla doğrudan arsa emsal/fizibilite ve Excel teklif aktarımına yönlendirme sağlandı.",
        basis: "Türk müteahhitlik iş süreçleri analizi ve saha geri bildirimi",
      },
      "taseron-hakedis-kalkani": {
        before: "Taşeron hakediş kalkanı IFC açıldıktan sonra bağımsız bölüm kartında gizli kalıyordu.",
        after: "Giriş ekranında Evre 03 Saha Denetimi kartı olarak konumlandırıldı; şap standardı ve kesinti raporuna doğrudan erişim açıldı.",
        basis: "Şantiye şap standardı ve hakediş denetim ihtiyacı",
      },
    },
  },
  {
    revision: "Rev. 32",
    version: "BIM-CALC-2026-10-17.26",
    date: "17 Ekim 2026",
    commit: "119fb36",
    trigger: "Sistem Hızlı Turu & İnteraktif Onboarding Rehberi (SystemQuickTour) ve Pafta Anteti Entegrasyonu",
    beforeSummary:
      "Müteahhitlik Süreç Masası ve modüller devreye alınmıştı ancak ilk defa sisteme giren teknik ofis mühendisleri veya denetçiler için adım adım yönlendiren, kısayol tuşları ve dinamik hedef vurgulaması (spotlight) içeren interaktif bir hızlı rehber turu yoktu.",
    afterSummary:
      "Pafta Tasarım Sistemi kurallarına (1px teknik çizgiler, köşe krosları +, semantik tokenlar) tam uyumlu, sıfır harici kütüphane bağımlılığına sahip SystemQuickTour.tsx ve TourWelcomeBanner bileşenleri devreye alındı. 5 kritik adım (Müteahhitlik Süreç Masası, SmartCheck dosya yükleme, Taşeron Hakediş Kalkanı, Kamu İhale araçları ve Pafta Anteti) taranıp vurgulanır. Klavye ok tuşları ve ESC desteği, localStorage kalıcılığı ve ana başlıkta kalıcı [🧭 Hızlı Tur] butonu eklendi.",
    affectedModules: ["on-teklif-fizibilite", "taseron-hakedis-kalkani", "teklif-satir"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "Kullanıcılar Arsa & İhale cetveli akışını kendi keşfetmek zorundaydı.",
        after: "Hızlı turun 1. adımında Evre 01 ve Excel ihale aktarımı kullanıcının önüne çıkarılır.",
        basis: "Kullanıcı deneyimi (UX) ve müteahhitlik süreç yönlendirmesi",
      },
      "taseron-hakedis-kalkani": {
        before: "Taşeron hakediş kalkanının şap standardı ve minha kontrolleri tur ile öne çıkarılmıyordu.",
        after: "Hızlı turun 3. adımında 325 kg/m³ çimento ve %10 fire tavanı saha koruması vurgulanır.",
        basis: "Şantiye şap standardı ve denetim görünürlüğü",
      },
      "teklif-satir": {
        before: "Firma anteti ve para birimi ayarları hızlı rehberde açıklanmıyordu.",
        after: "Hızlı turun 5. adımında Pafta Anteti ile resmi teklif ve hakediş antet düzeni tanıtılır.",
        basis: "Pafta Tasarım Sistemi ve resmi teklif yönetim standardı",
      },
    },
  },
  {
    revision: "Rev. 33",
    version: "BIM-CALC-2026-10-18.27",
    date: "18 Ekim 2026",
    commit: "404fcf0",
    trigger: "Tasarım Sistemi Tam Token Göçü, Sabit Renk Temizliği & WCAG 2.2 AA (axe-core) Erişilebilirlik Denetimi",
    beforeSummary:
      "Bileşenler ve sayfalarda 400'ün üzerinde eski nötr renk sınıfı (bg-zinc-*, text-slate-*, border-slate-*) ve 10px altı mikro metin kalıntıları vardı; form kontrollerinde ve etkileşimli butonlarda etiket (htmlFor/id) ve aria-label bağlantıları tam standartlaşmamıştı.",
    afterSummary:
      "Tüm bileşen ve sayfalardaki sabit renkler Pafta Tasarım Sistemi semantik tokenlarına (bg-card, bg-background, border-border, text-foreground, text-muted-foreground, bg-primary) göç ettirildi; 10px altı mikro metinler WCAG okunabilirlik seviyesine çekildi. Tüm form girdilerine, dosya yükleme alanlarına ve ikon butonlarına aria-label ve htmlFor/id ilişkileri eklendi. axe-core tabanlı otomatik erişilebilirlik test paketi (pnpm run test:a11y) kurularak WCAG 2.2 Seviye AA sıfır kritik ihlal ile doğrulandı.",
    affectedModules: ["teklif-satir", "on-teklif-fizibilite", "kota"],
    moduleDetails: {
      "teklif-satir": {
        before: "Teklif oluşturma ve detay formlarında bazı dosya yükleme ve kalibrasyon girdileri açık etiket bağlantısından yoksundu.",
        after: "Tüm girdi, dosya yükleme ve aksiyon butonları htmlFor/id ve aria-label ile donatıldı; semantik tokenlarla tam kontrast güvencesi sağlandı.",
        basis: "WCAG 2.2 Level AA ve Pafta Tasarım Sistemi kuralları (DESIGN.md)",
      },
      "on-teklif-fizibilite": {
        before: "Parsel şablonu CSV/Excel dosya yükleme alanı sr-only etiketle bağlantısızdı.",
        after: "label htmlFor='parcel-file-upload' ve aria-label ile ekran okuyucu uyumlu hale getirildi.",
        basis: "Erişilebilirlik standartları (WAI-ARIA 1.2)",
      },
      kota: {
        before: "Banka havale ve fatura bildirim formundaki 5 metin girdisi etiketleriyle programatik olarak bağlı değildi.",
        after: "Tüm fatura alanları (senderName, transferReference, taxOffice, taxNumber, notes) htmlFor/id eşleşmesiyle erişilebilir yapıldı.",
        basis: "WCAG 2.2 AA Form Labeling",
      },
    },
  },
  {
    revision: "Rev. 34",
    version: "BIM-CALC-2026-10-18.28",
    date: "18 Ekim 2026",
    commit: "63a77a5 / 57d288d (Süreç Öncesi Revit → IFC Dışa Aktarım Kontrol Listesi, İlk 128 KB Otomatik Başlık Tespiti & Kurumsal Terminoloji Kapısı)",
    trigger: "Kullanıcı geri bildirimi & birincil kaynak doğrulaması: Revit kaynaklı IFC'lerde süreç öncesi 'Areas and Volumes' vs. '2nd Level Space Boundaries' ayrımı, Dion Moult NetSideArea/NetSideVolume minha tuzağı, LoD (Autodesk/revit-ifc#63), IFCCARTESIANPOINT IEEE-754 kayan nokta açıklamaları ve ürün genelinde şahıs ismi otorite yasağı",
    beforeSummary: "Revit kaynak yazılım uyarısı (AuthoringAdvisoryBanner) yalnızca dosya sunucuya yüklenip analiz tamamlandıktan sonra 3 maddelik metin olarak gösteriliyor; süreç/yükleme öncesinde (PAFTA 00 ekranında) veya dosya seçildiği anda otomatik Revit başlık tespiti ve 6 maddelik dışa aktarım kontrol listesi sunmuyordu. Ayrıca arayüz ve bazı modüllerde saha standardı için şahıs ismi referansı yer alıyordu.",
    afterSummary: "authoring-software-diagnostics.ts içine 6 maddelik doğrulanmış REVIT_PRE_EXPORT_CHECKLIST eklendi (1: Architecture > Room & Area > Areas and Volumes vs. BEM/HVAC 2nd Level Space Boundaries ayrımı; 2: Export base quantities & Dion Moult NetSideArea/NetSideVolume brüt/minha tuzağı; 3: Join Geometry; 4: İnce yapı katman kısalması & kalıp yüzeyi; 5: LoD Low/Medium & Autodesk/revit-ifc#63 üçgenleme şişmesi; 6: Shared Coordinates & IFCCARTESIANPOINT IEEE-754 kayan nokta açıklaması). SmartCheckImportWorkspace.tsx ve BimIfcParser.tsx yükleme ekranlarına süreç öncesi RevitPreUploadChecklistPanel ve seçilen .ifc dosyasının ilk 128 KB başlığından anında istemci tarafı Revit tespiti eklendi. Arayüz, hesap modülleri ve yönetim sayfalarındaki şahıs ismi referansları tamamen kaldırılarak kurumsal mühendislik terminolojisine ('Şantiye Şap Standardı', 'SITE_SCREED_BENCHMARK', 'VILLA_MARKET_COST_BENCHMARK_2026') geçirildi ve registry.test.ts içine kalıcı kapı testi eklendi.",
    affectedModules: ["kaynak-yazilim-guvenilirligi", "taseron-hakedis-kalkani", "on-teklif-fizibilite"],
    moduleDetails: {
      "kaynak-yazilim-guvenilirligi": {
        before: "Yalnızca analiz sonrasında 3 maddelik özet uyarı gösteriliyor; süreç öncesinde 'Areas and Volumes' (IfcSpace 3B hacim) ile '2nd Level Space Boundaries' (BEM/HVAC termal yüzey) ayrımı ve Dion Moult NetSideArea minha uyarısı yer almıyordu.",
        after: "Hem süreç öncesinde (dosya seçildiği anda ilk 128 KB başlık taramasıyla otomatik açılan RevitPreUploadChecklistPanel) hem de analiz sonrasında 6 maddelik REVIT_PRE_EXPORT_CHECKLIST devreye alındı; sabit/uydurma sapma yüzdesi yasağı Golden 6 testiyle korundu.",
        basis: "Autodesk revit-ifc#63, Autodesk IFCCARTESIANPOINT teknik makalesi, Dion Moult (thinkmoult.com) openBIM incelemesi ve openBIM saha geri bildirimi",
      },
      "taseron-hakedis-kalkani": {
        before: "Şap harcı referans sabitleri ve Evre 03 kartı şahıs ismi ile etiketleniyordu.",
        after: "Tüm referans sabitleri ve arayüz etiketleri kurumsal mühendislik terminolojisine ('Şantiye Şap Standardı', 'SITE_SCREED_BENCHMARK', 'SITE_CLAIM_INSPECTION_CRITERIA') taşındı; registry.test.ts kapı testi ile koruma altına alındı.",
        basis: "Kurumsal mühendislik otorite standardı — şahıs ismi otorite yasağı",
      },
      "on-teklif-fizibilite": {
        before: "6-villa maliyet referans sabiti ve imar uyarı mesajı şahıs ismi içeriyordu.",
        after: "Referans sabiti 'VILLA_MARKET_COST_BENCHMARK_2026' olarak güncellendi ve imar uyarısı doğrudan Planlı Alanlar İmar Yönetmeliği m.5/8 dayanağına bağlandı.",
        basis: "Planlı Alanlar İmar Yönetmeliği m.5/8 & kurumsal mühendislik otorite standardı",
      },
    },
  },
  {
    revision: "Rev. 35",
    version: "BIM-CALC-2026-10-18.29",
    date: "18 Ekim 2026",
    commit: "9c59971",
    trigger: "Üretim Hazırlığı Raporu (PRODUCTION_READINESS_RAPORU_2026-10-18) P0/P1/P2 Kapanışı, Gerçek Tarayıcı axe-core Kapısı, 6-Villa Maliyet Referans Arayüzü & İmar m.22 İstisna Netleştirmesi",
    beforeSummary:
      "VILLA_MARKET_COST_BENCHMARK_2026 sabiti yalnız kodda tanımlıydı ve PreBimFeasibilityPanel arayüzünde gösterilmiyordu; %30 emsal harici uyarısında Planlı Alanlar İmar Yönetmeliği m.22 tam muafiyet istisnaları (zorunlu otopark, sığınak, yangın merdiveni, asansör boşluğu) belirtilmiyordu; ayrıca erişilebilirlik testi yalnızca jsdom üzerinde çalıştığından gerçek tarayıcı renk kontrastını ve koyu mod (:root[data-theme='light'] özgüllük çakışmasını) denetlemiyordu.",
    afterSummary:
      "VILLA_MARKET_COST_BENCHMARK_2026 (27 kalem, 4.135.752,77 TL) PreBimFeasibilityPanel içine gizli varsayılan dayatmadan bilgi amaçlı açılır referans çekmecesi olarak bağlandı; computeParcel içindeki %30 emsal harici uyarısına Planlı Alanlar İmar Yönetmeliği Madde 5/8 ve Madde 22 tam muafiyet istisnaları ile belediye plan notu teyidi eklendi. Gerçek Chromium (puppeteer + axe-core) ile 8 genel rotayı hem Açık Pafta hem Gece Paftası modunda denetleyen scripts/e2e-a11y-smoke.ts (16/16 kontrol, 0 ihlal) CI hattına eklendi; /bim-sozlugu noscript GEO terimleri, PWA manifest, security.txt, /api/* Cache-Control: no-store, hesap bazlı giriş yavaşlatma ve 105 kB ana paket ayrımı tamamlandı.",
    affectedModules: ["on-teklif-fizibilite", "kik-adt", "eskalasyon"],
    moduleDetails: {
      "on-teklif-fizibilite": {
        before: "VILLA_MARKET_COST_BENCHMARK_2026 arayüzde görünmüyordu ve %30 emsal harici uyarısı yönetmelikteki m.22 tam muafiyet istisnalarını (zorunlu otopark, sığınak vb.) açıklamıyordu.",
        after: "PreBimFeasibilityPanel içine 27 kalemlik saha referans çekmecesi (otomatik uygulanmaz, bilgi amaçlı) eklendi; %30 emsal harici uyarısına Planlı Alanlar İmar Yön. m.5/8 ve m.22 istisnaları ile belediye plan notu teyit uyarısı işlendi.",
        basis: "Planlı Alanlar İmar Yönetmeliği m.5/8 & m.22 ve 6-Villa saha gerçekleşme dökümü",
      },
      "kik-adt": {
        before: "Halka açık KİK aşırı düşük teklif hesaplayıcı rotası yalnızca jsdom birim testiyle denetleniyordu.",
        after: "Gerçek Chromium + axe-core E2E denetimi (scripts/e2e-a11y-smoke.ts) ile hem açık hem koyu modda 0 kontrast/ARIA ihlali doğrulandı.",
        basis: "WCAG 2.2 AA & Kamu İhale Genel Tebliği m.45.1.1",
      },
      eskalasyon: {
        before: "Fiyat farkı ve sözlük sayfalarının sunucu tarafı <noscript> GEO içerikleri sınırlıydı.",
        after: "route-meta.ts içinde /bim-sozlugu ve hesaplayıcı sayfalarının ham HTML <noscript> içerikleri zenginleştirildi ve FAQPage JSON-LD yalnız ana sayfayla sınırlandı.",
        basis: "4735 Sayılı Kanun m.8 & GEO/SEO Üretim Hazırlığı Raporu P1-4 / P2",
      },
    },
  },
  {
    revision: "Rev. 36",
    version: "BIM-CALC-2026-10-19.30",
    date: "19 Ekim 2026",
    commit: "feat/ifc-consistency-gate",
    trigger: "IFC Kapsam, Veri Tutarlılığı ve Metraj Bütünlüğü Kapısı (Mükerrer GlobalId, Yetim Boşluk, Ölçülemedi Kapısı, Kat Ataması, Proxy/Poz Kapsamı, IfcTypeObject Pset Kalıtımı & Montaj Çift Sayım Koruması)",
    beforeSummary:
      "IFC çıkarımında mükerrer GlobalId tekilleştirilmeden sayılıyor, IfcRelVoidsElement bağlantısı olmayan yetim IfcOpeningElement sessizce atlanıyor, QTO miktarı <= 0 veya eksik olan elemanlar metraj toplamına 0 m³ olarak sızabiliyor, kat ataması olmayan elemanlar fark edilmeden geçiyor, IfcBuildingElementProxy ve PozNo/sınıflandırma dışı kalan elemanlar için kapsam yüzdesi raporlanmıyor, IfcTypeObject.HasPropertySets (IfcRelDefinesByType) Pset özellikleri örneğe miras alınmıyor ve IfcElementAssembly alt parçaları (IfcRelAggregates) ana montajla birlikte çift sayılabiliyordu.",
    afterSummary:
      "workers/ifc/ifc_extract.py, src/ifc/parser/legacy-parser.ts, src/ifc/smartcheck-evidence.ts ve src/ifc/calm-icmal.ts üzerinde 7 maddelik IFC Tutarlılık Kapısı (IfcConsistencyReport) devreye alındı: (1) DUPLICATE_GLOBAL_ID: aynı kimliği taşıyan elemanların hepsi metrajda kalır, her biri için yüksek ciddiyetli bulgu üretilir; (2) ORPHAN_OPENING_ELEMENT: hiçbir yapı elemanına bağlı olmayan boşluk raporlanır ve minha düşümüne katılmaz; (3) NEGATIVE/ZERO/MISSING_NET_QUANTITY: eleman 'ölçülemedi' olarak işaretlenir, toplama girmez ama sayımda görünür; (4) MISSING_SPATIAL_STOREY: uydurma kat atanmaz, 'Kat atanmamış' yazılır; (5) poza eşleşme oranı tek kaynaktan, icmal motorunun (calm-icmal.ts) gerçekten bir kaleme yerleştirdiği elemanlardan hesaplanır; Python ve tarayıcı ayrıştırıcısı poz eşleştirmez, yalnız modeldeki açık PozNo etiketini taşır; hiçbir kurala uymayan kaplamalar artık sahte 15.390.1001 pozuyla icmale girmez, 'açıkta kalan' olarak raporlanır; (6) IfcTypeObject.HasPropertySets yalnız üstveri olarak (PozNo, taşıyıcılık, maruz kalma sınıfı, paspayı, disiplin, katmanlar) örnek önceliğiyle miras alınır, miktar tipten alınmaz; (7) montaj parçaları yalnız üst eleman metraja giren bir sınıfsa ve kendi pozitif miktarı varsa bastırılır, aksi halde parçalar kendi satırında kalır. IfcStair, IfcStairFlight, IfcCurtainWall ve IfcBuildingElementProxy metraj toplamına girmez; outOfScopeElementCount ile ayrı sayılır. Üç örnek modelde (2026_45, BIMcollab ARC ve STR) eleman listesi ve hacim/alan/kalıp toplamları Rev. 35 ile birebir aynıdır. Sonuçlar IfcCoverageCard.tsx ile CalmIfcWorkspace üzerinde filtrelenebilir olarak gösterilir.",
    affectedModules: ["ifc-metraj", "minha", "uc-x-uc"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Mükerrer GlobalId, QTO <= 0/eksik elemanlar, IfcBuildingElementProxy kapsam dışı elemanlar, IfcTypeObject Pset kalıtımı ve IfcElementAssembly alt parça çift sayımı için yapılandırılmış tutarlılık raporu bulunmuyordu.",
        after: "IfcConsistencyReport (totalElementCount, measuredElementCount, unmeasuredElementCount, pozMatchedElementCount / pozMatchedRatio, uncoveredElementCount, outOfScopeElementCount, typeInheritedElementCount, suppressedAssemblyPartCount, findings) ve IfcCoverageCard.tsx devreye alındı; ölçüsü olmayan elemanlar uydurma 0 yerine 'ölçülemedi' olarak işaretlenir, eksik sayılar 'değerlendirilmedi' gösterilir.",
        basis: "ISO 16739-1 (IFC4/IFC4X3) Spatial/Type/Aggregation kuralları & RG 33331 EK-1/EK-4/EK-6 veri bütünlüğü",
      },
      minha: {
        before: "IfcRelVoidsElement ilişkisi kurulmamış sahipsiz IfcOpeningElement kayıtları görünür bir uyarı üretmeden atlanıyordu.",
        after: "Yetim boşluklar ORPHAN_OPENING_ELEMENT (high) bulgusu olarak raporlanır ve minha düşüm hesabına dahil edilmez.",
        basis: "ISO 16739-1 IfcRelVoidsElement; minha eşikleri değişmedi (ÇŞB 0,50 m² · DIN 18350 2,50 m²)",
      },
      "uc-x-uc": {
        before: "Pset_ConcreteElementGeneral, TREpys_PozOzellikSeti ve Pset_*Common özellikleri yalnızca doğrudan örnek (IfcRelDefinesByProperties) üzerinden okunuyordu.",
        after: "IfcRelDefinesByType / IsTypedBy -> IfcTypeObject.HasPropertySets zinciri eklendi; yalnız üstveri miras alınır, miktar tipten alınmaz; örnek özelliği mevcutsa tip özelliğini ezer (instance > type).",
        basis: "ISO 16739-1 IfcRelDefinesByType & RG 33331 EK-4 Pset kalıtımı",
      },
    },
  },
  {
    revision: "Rev. 37",
    version: "BIM-CALC-2026-10-19.31",
    date: "19 Ekim 2026",
    commit: "feat/ifc-opportunities-rev37",
    trigger: "Açık kaynak QTO repolarından kalan fırsatların değerlendirilmesi: malzemesiz eleman kuralı ve kapsam dışı miktarların görünürlüğü; inceleme sırasında icmalin malzemeye bakmadan betonarme varsaydığı görüldü.",
    beforeSummary:
      "İcmal döşeme, kiriş ve kolonu malzemeye bakmadan 'C30/37 Betonarme' (15.150.1006) kalemine koyuyor, duvarları eleman adına göre ayırıyordu (adında 10/15/20 geçen her duvar Ytong/Bims). BIMcollab ARC ve STR örneklerinde taş, ahşap, çelik ve bakır boru malzemeli elemanlar betonarme olarak fiyatlanıyordu; 2026_45 modelinde malzemesiz 4 döşeme beton sayılıyor, 15 Ytong duvar adı yüzünden betonarme kaleminde kalıyordu. İcmale girmeyen elemanların miktarı kartta görünmüyordu.",
    afterSummary:
      "Yapısal sınıflandırma src/ifc/structural-material.ts ile malzemeye bağlandı: yalnız beton katmanlı eleman betonarme, yalnız gazbeton/Ytong/bims katmanlı duvar kâgir duvar kalemine girer; malzemesiz eleman MISSING_MATERIAL bulgusuyla, başka malzemeli ya da karma katmanlı eleman nedeni yazılarak açıkta kalır. Modeldeki beton sınıfı C30/37 değilse eleman kalemde kalır ve CONCRETE_CLASS_DIFFERS bulgusu üretilir (sınıfa uygun poz ve fiyat doğrulanmadı). Açıkta kalan ve kapsam dışı kayıtlar modelin verdiği miktarı taşır; kart bunları 'fiyatlandırılmadı' notuyla ve metraja giren açıkta kalanlar için birim bazında toplamla gösterir. Python çıkarıcının eleman listesi ve hacim/alan/kalıp toplamları değişmedi; değişen icmal yerleşimidir: 2026_45'te betonarme 948,9 → 887,2 m³ ve kâgir 392,9 → 421,4 m³; ARC'de betonarme 1.161,9 → 255,9 m³; STR'de 608,4 → 432,0 m³.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Yapısal elemanların icmal kalemi IFC sınıfı ve eleman adıyla seçiliyor, malzeme okunmuyordu.",
        after: "İcmal kalemi IfcRelAssociatesMaterial katmanlarıyla seçilir; uymayan elemanlar açıkta kalır, miktarları fiyatsız görünür.",
        basis: "ISO 16739-1 IfcRelAssociatesMaterial / IfcMaterialLayerSet; hiçbir değer varsayılmaz ilkesi",
      },
    },
  },
  {
    revision: "Rev. 38",
    version: "BIM-CALC-2026-10-19.32",
    date: "19 Ekim 2026",
    commit: "420008e",
    trigger: "Hızlı Tur'un tüm uygulamayı kapsaması ve süper admin turu; tur metinlerinin doğrulanmış davranışa göre düzeltilmesi.",
    beforeSummary:
      "Hızlı Tur yalnız Panel'de 5 adımdı; hesaplayıcıları 'resmî tebliğ algoritmalarına birebir uygun' diye ve taşeron kontrolünü sabit '325 kg/m³ çimento ve %10 fire' değerleriyle anlatıyordu (Rev. 32 kaydı). Hesap motorlarında bu değerler kullanıcı girdisidir ve hesaplar uzman onaylı değildir.",
    afterSummary:
      "Tur 14 adımda çalışma alanının tüm ana sayfalarını, 10 adımda yönetim panelini gezer. Taşeron kontrolü adımı dozaj ve firenin kullanıcı girdisi olduğunu, kamu ihalesi adımı sonuçların ön hesap olduğunu söyler. Hesap yöntemleri değişmedi.",
    affectedModules: ["taseron-hakedis-kalkani"],
    moduleDetails: {
      "taseron-hakedis-kalkani": {
        before: "Rev. 32 turu sabit 325 kg/m³ çimento ve %10 fire tavanından söz ediyordu.",
        after: "Tur, kalınlık, fire ve dozajın kullanıcı tarafından girildiğini anlatır; hesap değişmedi.",
        basis: "Ürün metinleri yalnız doğrulanmış davranışı anlatır",
      },
    },
  },
  {
    revision: "Rev. 39",
    version: "BIM-CALC-2026-10-19.33",
    date: "19 Ekim 2026",
    commit: "PR #8, PR #9",
    trigger: "Panel'deki Evre kartlarının hesaplayıcıların gerçek davranışına göre yeniden yazılması.",
    beforeSummary:
      "Panel Evre 03 kartı 'Şantiye Şap Standardı: 325 kg/m³ çimento ve %10 fire şap tavanı' ve 'Net Mahal Minha: 2 cm sıva düşümü, +0,40 m² söve dönüşü' diyordu; Evre 01 kartı '%1 KDV marjı' diyordu. Hesaplayıcılarda dozaj, fire, kalınlık ve tolerans kullanıcı girdisidir; sabit söve payı eklenmez.",
    afterSummary:
      "Kartlar şap/sıva hacminin IFC mahal alanı ile girilen kalınlık, dozaj ve fireden hesaplandığını, sıva alanından yalnız girilen boşlukların düşüldüğünü ve sonuçların ön hesap olduğunu söyler. Hesap yöntemleri değişmedi; kaldırılan ifadeler testle engellenir.",
    affectedModules: ["taseron-hakedis-kalkani"],
    moduleDetails: {
      "taseron-hakedis-kalkani": {
        before: "Panel kartı sabit 325 kg/m³ çimento, %10 fire ve +0,40 m² söve payından söz ediyordu.",
        after: "Kart, dozaj, fire, kalınlık ve toleransın kullanıcı tarafından girildiğini anlatır; hesap değişmedi.",
        basis: "Ürün metinleri yalnız doğrulanmış davranışı anlatır",
      },
    },
  },
  {
    revision: "Rev. 40",
    version: "BIM-CALC-2026-10-22.34",
    date: "22 Ekim 2026",
    commit: "security/node-24-22-1",
    trigger: "Node.js v24.22.1 güvenlik bülteni (CVE-2026-111497, CVE-2026-105483) kapsamında konteyner çalışma zamanının yükseltilmesi ve üretim sunucusu sertleştirmesi.",
    beforeSummary:
      "Uygulama, kuyruk işçisi ve IFC işçisi konteynerleri node:24.18.0-bookworm-slim taban imajını kullanıyordu; üretim sunucusunda Coolify 4.4.7 gece güncellemesi sonrasında .env izinleri 644'e düşmüş ve otomatik gece güncellemeleri açık kalmıştı.",
    afterSummary:
      "Dockerfile (dependencies, runtime, ifc-runtime) ve CI (.github/workflows/verify.yml) node:24.22.1-bookworm-slim sürümüne yükseltildi; üretim sunucusunda .env izinleri chmod 600 ile kilitlendi, SSHD ve sistem güvenlik paketleri (apparmor, snapd) sertleştirildi. Hesaplama formülleri ve kural motorları değişmedi.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Sunucu ve IFC worker konteynerleri Node.js v24.18.0 üzerinde çalışıyordu.",
        after: "Node.js v24.22.1 güvenlik yamalı taban imajına yükseltildi; Python IfcOpenShell çıkarımı ve metraj hesapları değişmedi.",
        basis: "Node.js 24 LTS Güvenlik Bülteni (CVE-2026-111497 & CVE-2026-105483)",
      },
    },
  },
  {
    revision: "Rev. 41",
    version: "BIM-CALC-2026-10-23.35",
    date: "23 Ekim 2026",
    commit: "phase-1-price-source-gate",
    trigger: "GAP kapatma yol haritası Faz 1 (T05–T09): poz, birim ve fiyat kaynağını kanıt zincirine bağlama.",
    beforeSummary: "Calm IFC sınıflandırıcısı 14 sabit poz ve TL fiyatı birlikte üretiyor; BYOL/ÇŞB seçicisi yalnız UI durumunu değiştiriyor; alan÷0,06 ile mtül sessiz türetilebiliyor ve yetki kanıtı olmayan resmî referans teklif kilidine girebiliyordu.",
    afterSummary: "Sınıflandırıcı fiyat üretmeyi bıraktı; dört bilinen yanlış poz üretim çıktısında çözülmemiş olarak işaretleniyor. Poz çözümü exact kod, birim, semantik ve koşul uyuşmazlığında fail-closed çalışıyor. m²↔m³ ve m²↔m dönüşümleri için kanıt zorunluluğunu tanımlayan sözleşme ve testler eklendi; tüm eski metraj akışlarına entegrasyonu ayrı iş olarak izleniyor. Fiyat kaynakları pending/authorized/restricted durumu, kapsam, gerçek payload hash'i, karar veren kullanıcı ve tarih taşır; yalnız tenant kapsamındaki yetkili, onaylı, güncel, para birimi ve teklif satırıyla eşdeğer snapshot kilitlenir. Demo/sabit fiyatlar ticari sonuçtan çıkarıldı.",
    affectedModules: ["fiyat-eslestirme", "ifc-metraj", "ifc-teklif-aktarim"],
    moduleDetails: {
      "fiyat-eslestirme": {
        before: "BYOL ve ÇŞB modu aynı yerel sabit fiyatları kullanıyor; lisans/yetki kanıtı veri seçiminde etkili değildi.",
        after: "Mod seçimi tenant snapshot havuzunu gerçekten filtreler; yalnız authorized + evidence hash + approved + current + unit-compatible kayıt seçilir. ÇŞB yetkisi yoksa fiyat çözümü boş kalır.",
        basis: "Faz 0 kanıt sözleşmesi; kaynak kullanım yetkisi ve tenant izolasyonu",
      },
      "ifc-metraj": {
        before: "Süpürgelik uzunluğu yoksa alan 0,06 m sabit yüksekliğe bölünerek mtül türetiliyordu.",
        after: "Doğrulanmış doğrudan uzunluk/çevre veya boyut kanıtı yoksa dönüşüm yapılmaz; eleman inceleme gerekçesiyle açıkta kalır.",
        basis: "Boyutsal analiz ve ölçülebilir kanıt ilkesi",
      },
      "ifc-teklif-aktarim": {
        before: "Sabit/demo fiyat veya advisory snapshot teklif aktarımı ve fiyat kilidinde kullanılabiliyordu.",
        after: "Tüm kalemlerde kanıtlı snapshot olmadan Calm aktarımı kapalıdır; teklif kilidi yalnız approved ve authorized kaynağı kabul eder. Manuel fiyat ayrıca kullanıcı, tarih ve not taşır.",
        basis: "Immutable fiyat geçmişi ve denetlenebilir provenance",
      },
    },
  },
  {
    revision: "Rev. 42",
    version: "BIM-CALC-2026-10-23.36",
    date: "23 Ekim 2026",
    commit: "phase-2-ifc-integrity",
    trigger: "GAP kapatma yol haritası Faz 2 (T10–T18): IFC kapsamı, kimlik zinciri ve metraj korunumu.",
    beforeSummary: "Gazbeton betonarme sayılabiliyor, sınıfsız beton C30 pozuna düşebiliyor, browser önizlemesi worker kapsamı gibi algılanabiliyor, duplicate GlobalId kayıtları STEP kimliğinden bağımsız izlenemiyor ve pozlu donatı matched sayıldığı halde satır üretmeyebiliyordu. Sentetik örnek fiyat kaynağı ve beton poz şablonları da güncel katalogla çelişiyordu.",
    afterSummary: "Yapısal malzeme ve C25/30–C35/45 beton pozları fail-closed çözümlenir; bitümlü membran XPS'e dönüşmez. Server worker IFC2X3/4/4X3 ailesi, dosya hash'i + processing run + STEP kimliği, aggregate suppression, duplicate GUID bulguları ve volume/area/length/mass/formwork toplamlarını ayrı kalite kapısında raporlar. Browser eksik kapsamı açıkça worker'a yönlendirir. Kaynaklı pozitif donatı kg satırına, sıfır/tahmini donatı açıklamalı kapsam dışına gider. Sentetik örnekler fiyatsızdır; stale ALLPLAN beton pozları gerçek 2026 katalog sırasına çekilmiştir.",
    affectedModules: ["ifc-metraj", "donati-kutle", "ifc-teklif-aktarim", "satir-dogrulama"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Eleman kimliği GlobalId ağırlıklıydı; boyutlar ve dışlanan aggregate parçaları tek normalleştirilmiş kalite sözleşmesinde görünmüyordu.",
        after: "IFC-NORMALIZED-1 sözleşmesi fileSha256/runId/STEP elementKey, şema ailesi, capability ve boyut bazlı qualityGate taşır; duplicate GUID ve suppressed parçalar ayrı kayıt olarak korunur.",
        basis: "buildingSMART IFC4.3 IfcRelAggregates, IfcMaterialLayerSetUsage ve Qto_*BaseQuantities; Faz 0 kanıt sözleşmesi",
      },
      "donati-kutle": {
        before: "Pozlu donatı sıfır veya satırsız halde başarılı eşleşme sayılabiliyor; kg kanıt satırı üretilmiyordu.",
        after: "Yalnız doğrudan IfcQuantityWeight veya açık Weight/Mass property değerinden gelen pozitif kütle kg satırına alınır; nominal çap/boy hesabı, sıfır değer ve kaynaksız kayıt eşleşmemiş kalır. kg/ton ayrımı açık birim sözleşmesine bağlıdır.",
        basis: "buildingSMART Qto_ReinforcingElementBaseQuantities.Weight; doğrudan Weight/Mass property provenance kapısı",
      },
      "ifc-teklif-aktarim": {
        before: "Sentetik örnekler kaynaksız fiyat seed'i ve boş pending fiyat kaynağı oluşturabiliyordu.",
        after: "Örnek projeler açıkça sentetik ve fiyatsızdır; boş seed fiyat kaynağı/snapshot oluşturmaz. Fiyat çözümü Faz 1 kanıt kapısında kalır.",
        basis: "Kaynak uydurmama ve immutable fiyat provenance ilkesi",
      },
      "satir-dogrulama": {
        before: "IFC kota reddi geçici toast ve ham hata metniyle kalabiliyor, reddedilen dosya yüklenmiş görünebiliyordu.",
        after: "403 nedenleri kalıcı Türkçe uyarı ve doğru e-posta/paket aksiyonuna dönüşür; reddedilen seçim temizlenir ve aynı dosya yeniden seçilebilir.",
        basis: "Fail-closed kullanıcı akışı ve kararlı sunucu hata kodu sözleşmesi",
      },
    },
  },
  {
    revision: "Rev. 43",
    version: "BIM-CALC-2026-10-23.37",
    date: "23 Ekim 2026",
    commit: "phase-3-regulatory-engines",
    trigger: "GAP kapatma yol haritası Faz 3 (T19–T26): mevzuat, vergi, ihale ve mühendislik ön kontrol motorlarını kanıt bağlamına alma.",
    beforeSummary: "Eksik YAMBİS banka verisi kesin gruba dönüşebiliyor; KİK yüzde 80 listesi teklif kalemlerinden türeyebiliyor; fiyat farkı, KDV, Pre-BIM ve Minha hesapları tarih/kaynak/kalem bağını tam taşımıyordu. 3×3, e-PYS ve ISO sonuçları lisans ve belge kimliği açıklarını sonuç tipine yansıtmıyordu.",
    afterSummary: "Ortak kaynak manifestosu ve yeniden kullanılabilir EvaluationEnvelope referans sözleşmesi tarih, sürüm, yargı alanı, kaynak, birim ve yuvarlama politikasını tanımlar; Faz 3 motorları kendi sonuç tiplerinde aynı fail-closed ilkeleri uygular. YAMBİS kesin/potansiyel grubu ayırır; KİK yüzde 80 listesi yalnız doğrulanmış idare yaklaşık maliyet artifact'ından kurulur; 4735 ve KDV motorları tarihli rejim ve kanıt ister; Pre-BIM ve Minha doğrulanmış belge, profil, host ve kalem bağını zorunlu tutar. Şirket politikası 3×3 kurallarından lisanslı standart incelemesi ayrılır; e-PYS belge kimliği ve ISO erişimi nedeniyle otomatik geçiş yerine manuel inceleme gerektirir.",
    affectedModules: ["kik-adt", "eskalasyon", "kdv-tevkifat", "on-teklif-fizibilite", "minha", "uc-x-uc", "yapisal-sihirbaz", "iso19650", "epys-on-kontrol", "epys-hizli"],
    moduleDetails: {
      "kik-adt": { before: "YAMBİS eksik kriteri kesin grubu engellemiyor; yüzde 80 listesi teklif satırlarından veya kullanıcı kaynak etiketiyle çıkabiliyordu.", after: "Kesin ve potansiyel YAMBİS grupları ayrıdır; 31.12.2026 iş gücü geçişi değerlendirme tarihine bağlıdır. Yüzde 80 listesi kurum, belge kimliği ve SHA-256 ile doğrulanmış idare YM artifact'ı ve kuruş düzeyinde YM mutabakatıyla kurulur.", basis: "YAMBİS 2026 Bakanlık değişikliği; 4734/KİK Genel Tebliğ m.45.1" },
      eskalasyon: { before: "Formül sözleşme tarihi, endeks serisi/dönemi, gecikme ve avans kanıtı olmadan çalışabiliyordu.", after: "01.09.2025 rejimi ihale/sözleşme kronolojisi, sözleşme katsayı kaynağı, resmî TÜİK HTTPS endeks provenance ve dönem kronolojisi, iş programı, gecikme sorumluluğu ve avans mahsubu eksiksizse hesaplanır; eski/belirsiz rejim manuel incelemeye gider.", basis: "4735 ve RG 32971; KİK fiyat farkı esasları" },
      "kdv-tevkifat": { before: "Tek ortalama konut alanı ve basit 6306 seçimi karma teslimleri temsil etmiyordu.", after: "Ruhsat/teslim tarihi, konut-işyeri satırları, net alan, matrah, 6306 kanıtı ve arsa sahibinin mükellef/faaliyet durumu ayrı girdidir; satır kuruşuna yuvarlanır.", basis: "3065 sayılı Kanun ve GİB kat karşılığı teslim açıklamaları; mali müşavir kabulü bekler" },
      "on-teklif-fizibilite": { before: "Emsal dışı alanlar tek toplamda toplanıyor ve serbest metin yerel plan kanıtı uygunluk çağrışımı oluşturabiliyordu.", after: "Alanlar dahil, sınırlı muaf ve tam muaf kimlikleriyle ayrılır; mükerrer kimlik engellenir, yüzde 30 havuzu yalnız sınırlı muaflara uygulanır. Plan kararı yalnız kurum, belge no, geçerli tarih ve SHA-256 taşıyan verified artifact ile üretilir; kullanıcı beyanı danışma niteliğinde kalır.", basis: "Planlı Alanlar İmar Yönetmeliği; yerel plan notu/belediye kararı kapısı" },
      minha: { before: "Boşluk düşümü global özette kalıyor; host, hedef kalem, söve ekleri ve sözleşme baskısı belirgin değildi.", after: "Her açıklık host+hedef kalem+bitiş katmanı kompozit anahtarıyla bağlanır; normalize kimlik çift düşümü engeller. Otomatik uygulama doğrulanmış sözleşme baskısı ister; CSB söve/yan yüzey alanı kaynaklı derinlikle düşüme geri eklenir, net miktar ikinci kez düşülmez.", basis: "Sözleşmesel ölçü esası ve tekil açıklık provenance" },
      "uc-x-uc": { before: "Şirket yüzde 3/STR politikası ile standart eşikleri tek geçer/kalır sonucunda okunabiliyordu.", after: "Şirket politikası kararı normatif karardan ayrıdır; aktif standart açık seçilmediyse, lisanslı metin yoksa veya temel/zemin teması kapsam dışıysa normatif geçiş verilmez.", basis: "Şirket politikası; TS 500 ve Eurocode erişim/uzman kapısı" },
      "yapisal-sihirbaz": { before: "TS 500/TS 708 başlığı kod içi eşikleri otomatik normatif doğrulama gibi gösterebiliyordu.", after: "TS 500 ve TS 708 kaynakları access_required olarak işaretlenir; doğrulanmamış temel/temas kombinasyonuna eşik uydurulmaz ve uzman incelemesi zorunludur.", basis: "TSE lisanslı standart erişim gereği; TBDY 2018 kamu kaynağı" },
      iso19650: { before: "Teknik ön kontroller geçse dahi lisanslı ISO metnine erişim açığı sonuçta görünmüyordu.", after: "Sonuç advisoryOnly ve access_required taşır; CDE kanıtı yoksa not_evaluated, teknik kontrol geçse bile manuel inceleme gerekir.", basis: "ISO 19650 / EN 17412 lisanslı metin kapısı" },
      "epys-on-kontrol": { before: "EK-9 satırlarının otomatik/manuel niteliği ve kanıt referansı raporda zorunlu değildi.", after: "Her EK-9 satırı evaluationMode ve evidenceRefs taşır; hata yoksa dahi belge kimliği beklediği için manual_review_required döner.", basis: "RG 33331 kimliği Phase 0 source register içinde identity_pending" },
      "epys-hizli": { before: "Sınırlı tarayıcı kontrollerinde isValid=true resmî uygunluk gibi okunabiliyor ve ham malzeme/mahal adları metadata'ya taşınabiliyordu.", after: "Eksik otomatik kanıt not_evaluated, tamamı geçse dahi belge kimliği manual_review_required üretir; legacy isValid yanlış yeşil vermez. Kalıcı evidenceRefs ham proje adları yerine artifact içi kararlı indeksleri taşır ve rapor dizileri sınırlandırılır.", basis: "e-PYS hızlı kontrol kapsam sınırı, veri minimizasyonu ve kanıt uydurmama ilkesi" },
    },
  },
  {
    revision: "Rev. 44",
    version: "BIM-CALC-2026-10-23.38",
    date: "23 Ekim 2026",
    commit: "phase-4-cde-workflow",
    trigger: "GAP kapatma yol haritası Faz 4 (T27–T29): gerçek CDE durum motoru, kalıcı çok kullanıcılı onay kapısı ve revizyon kapsamı geçersizleştirmesi.",
    beforeSummary: "Durum doğrulayıcı bazı yasak geçişleri varsayılan olarak kabul edebiliyor, en yeni kabul edilmiş durum yerine eski kayıt seçilebiliyor ve SHARED/S0 eşleşmesi geçebiliyordu. Kullanıcı arayüzündeki CDE izi localStorage ile sınırlıydı; gerçek proje üyeliği, tenant izolasyonu, eşzamanlı karar, idempotency, immutable revizyon kapsamı ve append-only sunucu geçmişi yoktu.",
    afterSummary: "Açık geçiş tablosu WIP→SHARED→PUBLISHED→ARCHIVED sırasını, geri çalışma sınırlarını ve durum/suitability/revizyon eşleşmesini fail-closed doğrular. Tenant/proje üyeliğine bağlı PostgreSQL CDE modeli ve API gerçek kullanıcı, rol ve disiplin kimliğini kullanır; başka tenant/viewer, maker-checker ihlali, son coordinator'ın düşürülmesi, eski lockVersion ve farklı aktör/gövdeli idempotency replay reddedilir. İstemciden hash alınmaz; kapsam tenant bağlı doküman, başarılı processing run, saklanan IFC kanıt artifact'ı/kural değerlendirmeleri ve doğrulanmış build kimliğinden sunucuda türetilir. Kapsam değişince yeni revizyon WIP durumunda açılır; revizyon, karar olayı ve bağlanmış kanıt kayıtlarının mutasyonu DB trigger'larıyla engellenir. UI yalnız seçili konteynere ait hazır sunucu geçmişiyle karar üretir.",
    affectedModules: ["iso19650", "cde-workflow", "cde-schema", "cde-ui"],
    moduleDetails: {
      iso19650: {
        before: "Geçiş listesi eksikti; tanımsız bazı durum çiftleri kabul ediliyor, SHARED/S0 geçebiliyor ve geçmişte en yeni kabul edilmiş kayıt güvenilir biçimde seçilmiyordu.",
        after: "Tüm durum çiftleri açık whitelist ile değerlendirilir; WIP/S0/Pxx.xx, SHARED/S1..S7/Pxx.xx, PUBLISHED/A1..A7/Cxx veya EK-2 revizyonu ve ARCHIVED/B sözleşmesi uygulanır. Eksik aktör, bozuk geçmiş, aynı durum ve yetkisiz atlama reddedilir; en yeni kabul edilmiş kayıt yardımcı fonksiyonla seçilir.",
        basis: "src/smartcheck/rules/iso19650.ts ve 13 senaryolu src/smartcheck/rules/iso19650.test.ts",
      },
      "cde-workflow": {
        before: "CDE kararı tarayıcı localStorage kaydıydı; sunucuda tenant/proje üyeliği, rol/disiplin veya eşzamanlı karar kapısı yoktu.",
        after: "Kimliği doğrulanmış CDE API; coordinator/approver rolü, disiplin, tenant izolasyonu, kalıcı rate limit, optimistic lock, aktöre bağlı Idempotency-Key, approve/reject/withdraw, son coordinator koruması ve maker-checker kurallarını transaction içinde uygular. HTTP entegrasyon testi diğer tenant/viewer/non-member reddini, replay/mismatch, withdraw, revizyon eşleşmesi ve eşzamanlı kararın tek kazananını doğrular.",
        basis: "src/contracts/cde.ts, src/services/cde/service.ts, src/server/routes/cde.ts ve src/server/routes/cde.integration.test.ts",
      },
      "cde-schema": {
        before: "Proje, üyelik, konteyner, revizyon kapsamı ve karar geçmişi için kalıcı CDE şeması bulunmuyordu.",
        after: "Tenant bağlı proje/üye/konteyner/revizyon/olay tabloları ve doküman-run-artifact zinciri birleşik yabancı anahtarlarla bağlandı. 0010 migration'ı revizyon ve olaylarda UPDATE/DELETE'i; CDE'ye bağlanmış doküman, run ve artifact mutasyonunu reddeder. Release zinciri ve bağımsız katalog imzası doğrulanır.",
        basis: "src/db/schema.ts, drizzle-release/0010_cde_workflow.sql ve scripts/release-migrations/*",
      },
      "cde-ui": {
        before: "CDE izi cihazdaki localStorage silinince kayboluyor ve varsayılan rol adı gerçek onay gibi görünebiliyordu.",
        after: "CDE paneli proje, üyelik, konteyner, current revision ve güvenli server history DTO'sunu API'den yükler; gerçek oturum kullanıcısının proje rolünü/disiplinini gösterir. Konteyner değişiminde eski geçmiş temizlenir ve doğru konteyner geçmişi hazır olmadan karar butonları açılmaz. LocalStorage yalnız hesap/form taslakları için kalır.",
        basis: "src/components/smartcheck/CdeWorkflowPanel.tsx, src/hooks/useCdeWorkflow.ts ve src/hooks/cde-workflow-model.test.ts",
      },
    },
  },
  {
    revision: "Rev. 45",
    version: "BIM-CALC-2026-10-23.39",
    date: "23 Ekim 2026",
    commit: "601ce90e5cc1945e611b57ae84b669aa0a454731",
    trigger: "GAP kapatma yol haritası Faz 5 (T30–T34): güvenli tablo çıktısı, PDF imza/PDF-A kanıt sınırı, kaynak kimlikli 3B inceleme ve kalıcı icmal→teklif köprüsü.",
    beforeSummary: "CSV/XLSX çıktıları ortak formül enjeksiyonu savunması kullanmıyor; PDF imza alanı taraması tüm sayfa ve nested AcroForm kapsamını kanıtlamıyor; XMP PDF/A beyanı standart doğrulamasıyla karışabiliyor; IFC satırı ile 3B model seçimi kaynak kimliği üzerinden kurulmamıştı. Calm icmali kalıcı, revizyonlu gerçek teklif satırlarına transaction ve lineage ile taşınmıyordu.",
    afterSummary: "Ortak güvenli serializer/parser gerçek LibreOffice açma testiyle doğrulandı. PDF preflight bounded ve döngü korumalı tarama yapar; yapısal imza bulgusunu kriptografik güven doğrulamasından ayırır. veraPDF sonucu ayrı artifact ve kaynak checksum'u ile saklanır, CLI yoksa uygunluk üretmez; lisanslı dönüşüm sağlayıcısı seçilmediği için T32 açık kalır. 3B pilot dosya hash'i + run + STEP elementKey ile seçim/vurgulama/gizleme/izolasyon yapar, görüntüleme geometrisini metraj kaynağı saymaz. Calm aktarımı kanonik seçimi sunucuda yeniden kurar; kaynaklı fiyat yetkisi, immutable ardıl teklif, aktöre bağlı idempotency, semantik tekrar koruması ve satır lineage'ı uygular.",
    affectedModules: ["tabular-export", "pdf-signature-preflight", "pdfa", "ifc-viewer", "ifc-teklif-aktarim"],
    moduleDetails: {
      "tabular-export": {
        before: "CSV/XLSX üreten ekranlar farklı kaçış kuralları kullanıyor; formül başlangıcı, ayraç, CR/LF ve bozuk tırnak davranışı ortak değildi.",
        after: "Ortak serializer formül benzeri metni nötralize eder; delimiter, quote, CR/LF ve Unicode'u korur. Parser bozuk tırnakta fail-closed davranır; gerçek LibreOffice dönüşüm testi metin hücresinin formül çalıştırmadığını doğrular.",
        basis: "src/lib/tabular-data.ts ve src/lib/tabular-data.test.ts; gerçek LibreOffice CSV→XLSX açma kanıtı",
      },
      "pdf-signature-preflight": {
        before: "Yalnız yüzeysel /Sig varlığı gerçek imza geçerliliği gibi yorumlanabiliyor; nested form, geç sayfa, boş/bozuk imza ve tarama sınırı ayrışmıyordu.",
        after: "Tüm sayfa ve nested AcroForm/Kids ağı derinlik, nesne ve sayfa limitleriyle taranır; absent/empty/signed/malformed/indeterminate ayrılır. /V + /ByteRange + /Contents yalnız yapısal signed bulgusudur; crypto, trust, revocation ve timestamp doğrulaması yapılmadığı açıkça raporlanır.",
        basis: "workers/ifc/pdf_preflight.py ve workers/ifc/test_pdf_preflight.py",
      },
      pdfa: {
        before: "XMP pdfaid alanı tam PDF/A uygunluğu çağrışımı oluşturabiliyor ve harici doğrulayıcı çıktısı kaynak dosyayla ayrı kanıt zincirinde saklanmıyordu.",
        after: "veraPDF XML sonucu ayrı validation artifact'ı, kaynak SHA-256 ve lineage ile saklanır; CLI erişilemezse isCompliant=null/unavailable döner. Gerçek validator runtime ve lisanslı dönüşüm sağlayıcısı bulunmadığından dönüşüm kapalı, T32 NO-GO kalır.",
        basis: "src/smartcheck/pdf/verapdf-report.ts, src/smartcheck/pdf/verapdf-runner.ts ve veraPDF CLI doğrulama sözleşmesi",
      },
      "ifc-viewer": {
        before: "Kanıt satırından IFC model nesnesine duplicate GlobalId güvenli seçim, hide/show/isolate ve kaynak bütünlüğü kontrollü tarayıcı inceleme yolu yoktu.",
        after: "Self-hosted web-ifc WASM ile kaynak SHA-256 doğrulanır; elementKey=fileSha256:runId:#stepId üzerinden doğru nesne seçilir. Duplicate GlobalId birleştirme anahtarı değildir; bellek, mesh, üçgen ve dosya sınırları vardır. Görüntüleme geometrisi miktar üretmez; büyük model ana iş parçacığı performansı pilot kabulünde ölçülecektir.",
        basis: "src/ifc/viewer/*, src/components/smartcheck/viewer/* ve buildingSMART izinli fixture tarayıcı smoke testi",
      },
      "ifc-teklif-aktarim": {
        before: "Calm sonucu CSV/callback sınırında kalıyor; kalıcı teklif revizyonu, kaynak satırı bağı, sunucu tarafı miktar yeniden üretimi ve tekrar koruması yoktu.",
        after: "Mevcut teklife immutable ardıl revizyon açılır; Calm projeksiyonu sunucuda aynı kuralla yeniden kurulur. Kanonik satır seçimi, doğrulanmış fiyat yetkisi, sabit noktalı tutarlar, actor+tenant idempotency, seri çapında semantik tekrar koruması ve junction tablosu lineage'ı transaction içinde uygulanır. Ardışık kaynak belgelerde önceki aggregate kanıtı aynı seri ve tam kaynak satırı kümesiyle yeniden doğrulanır. Teklif aktarımı yalnız KDV hariç ve açık oranlı fiyatı kabul eder; KDV dahil, belirsiz veya oransız fiyatı reddeder.",
        basis: "src/services/quotations/calm-transfer.ts, src/server/routes/smartcheck.ts, src/db/schema.ts ve drizzle-release/0011_quotation_transfer_ledger.sql",
      },
    },
  },
  {
    revision: "Rev. 46",
    version: "BIM-CALC-2026-10-24.40",
    date: "24 Ekim 2026",
    commit: "ff057c420641e864e89fa56ced6a1460fc31919b",
    trigger: "GAP kapatma yol haritası Faz 6 (T35–T39): tenant bağlı dönemsel hakediş, ölçüm/inceleme kanıtı, düzeltme ve vendor/ihale savunma sınırları.",
    beforeSummary: "Hakediş için dönem sırası, önceki/bu dönem/kümülatif tutar ayrımı, sözleşme tavanı, ölçüm kaynağı, maker-checker incelemesi, immutable karar izi ve düzeltme zinciri kalıcı bir modelde yoktu. Vendor ve ihale aktarımı için kanıt sınırları kodla ifade edilmiyordu.",
    afterSummary: "Sabit noktalı dönemsel hakediş çekirdeği, tenant ve sözleşme kapsamlı PostgreSQL kayıtları, kaynak checksum'una bağlı ölçümler, ayrı review olayları, maker-checker, optimistic lock, idempotency ve append-only korumalarla pilot olarak kuruldu. Düzeltme güncel onaylı dönemi supersede ederek onun tek ardıl taslağını oluşturur; daha sonraki herhangi bir iptal edilmemiş dönem varken geçmiş dönem değiştirilemez. OSKA/AMP çıktısı yalnız aday/iç roundtrip düzeyindedir; resmî uyumluluk veya kabul üretmez. EKAP savunma yardımcısı belge checksum'u ve manifest ister; otomatik resmî gönderim yapmaz. Faz 6 PARTIAL, varsayılan kapalı ve dağıtıma alınmamıştır.",
    affectedModules: ["hakedis-donem", "taseron-hakedis-kalkani", "kik-adt"],
    moduleDetails: {
      "hakedis-donem": {
        before: "Dönem numarası, önceki/kümülatif miktar ve tutar, sözleşme tavanı, review kararı ve düzeltme zinciri tek transaction ve kanıt kapsamıyla korunmuyordu.",
        after: "Saf hesap motorunda BigInt sabit nokta, kalıcı servis yolunda PostgreSQL NUMERIC/round yeniden hesabıyla önceki + bu dönem = kümülatif eşitliği ve sözleşme tavanı korunur. Taslak, submit ve approve geçişleri gerçek aktör, tenant, scope hash, version/expectedVersion optimistic lock ve idempotency anahtarına bağlıdır; olaylar ve bağlanmış kanıtlar immutable'dır.",
        basis: "src/lib/progress-payment/progress-payment.ts, src/services/progress-payments/service.ts, src/contracts/progress-payment.ts, src/db/schema.ts ve drizzle-release/0012_progress_payment_evidence.sql",
      },
      "taseron-hakedis-kalkani": {
        before: "Daire bazlı tavan hesabı tek dönemli bir danışma hesabıydı; kaynak belge checksum'u, yetkili review kararı ve dönemsel ödeme kaydıyla bağlı değildi.",
        after: "Kaynak bağlı measurement kayıtları ve ayrı inceleme olayları dönemsel hakediş satırına bağlanabilir; onaysız, boş veya mutabakatı bozuk kanıt ödeme onayına geçemez. Resmî Yeşil Defter/ataşman kabulü ve bağımsız teknik ofis fikstürü hâlâ dış kapıdır.",
        basis: "src/services/progress-payments/service.ts ve scripts/release-migrations/data-transitions.ts",
      },
      "kik-adt": {
        before: "İhale savunma paketi için her girdi belgesini kimlik ve checksum ile bağlayan manifest ve OCR/provenance/duplicate fail-closed sınırı yoktu.",
        after: "Tender-defense yardımcısı her girdi belgesini documentId + checksum ile manifestte bağlar; eksik provenance, OCR belirsizliği ve mükerrer belgeyi reddeder. automaticOfficialSubmission=false sabittir; adlı ihale uzmanı imzası olmadan resmî EKAP kabulü iddia edilmez.",
        basis: "src/domain/tender-defense/*; 4734/4735 ve proje kanıt uydurmama ilkesi",
      },
    },
  },
  {
    revision: "Rev. 47",
    version: "BIM-CALC-2026-10-24.41",
    date: "24 Ekim 2026",
    commit: "eeeaf75f27cd0b65c3f7f44ed6e3668386cceb53",
    trigger: "GAP kapatma yol haritası Faz 7 / T40: PostgreSQL owner, migrator, app, worker ve backup görev ayrımı için fail-closed tooling ve izole PG16 kanıtı.",
    beforeSummary: "IFC/SmartCheck queue erişimi ile migration/ownership yetkileri gerçek bir rol sözleşmesiyle ayrılmıyor; runtime Graphile şemasını otomatik migrate edebiliyor ve önceki roadmap kaydı compose/runtime tarafından doğrulanmıyordu.",
    afterSummary: "Canonical beş rol, SET-only migrator üyeliği, exact ACL/RLS/function grant matrisi, SECURITY DEFINER wrapper sınırı, Graphile Worker 0.16.0 migration-18 ve SHA-256 yapı/vendor provenance kapıları eklendi. Gerçek PostgreSQL 16 adversarial testi geçti. Hesap yöntemi ve mühendislik sonucu değişmedi; compose/runtime credential cutover, canary, rollback ve production deploy yapılmadığı için T40 PARTIAL'dır.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "IFC/SmartCheck hesap kuyruğu uygulama isteği sırasında Graphile şemasını migrate edebiliyor ve app/worker/migrator/backup yetkileri exact, bağımsız bir PostgreSQL sözleşmesiyle denetlenmiyordu.",
        after: "Runtime yalnız migration-18 hazırsa devam eder; app sadece doğrulanmış SmartCheck wrapper'larını çağırır, worker queue DML yürütür, backup salt okunur, migrator explicit SET ROLE ile DDL yapar. Bu altyapı miktar formülünü değiştirmez ve production cutover kanıtı değildir.",
        basis: "scripts/database-roles/*, src/smartcheck/import/queue-readiness.ts, src/contracts/database-role-provision.pgtest.ts ve PostgreSQL 16 least-privilege davranış kanıtı",
      },
    },
  },
  {
    revision: "Rev. 48",
    version: "BIM-CALC-2026-10-24.42",
    date: "24 Ekim 2026",
    commit: "58cf3205fa6a4c7d2244dd27bb9bd83fe895aef0",
    trigger: "GAP kapatma yol haritası Faz 7 / T41 ilk güvenli dilim: CDE tablolarında veritabanı seviyesinde tenant izolasyonu.",
    beforeSummary: "CDE servisinde companyId filtreleri ve proje RBAC vardı; ancak veritabanı satır politikası yoktu. Yanlış runtime credential, unutulan filtre veya pool bağlam sızıntısı tenant verisini açabilirdi; operasyonel rol inspector'ı CDE policy driftini görmüyordu.",
    afterSummary: "Beş CDE tablosu FORCE RLS ile korunur. App erişimi transaction-local company/user contextine ve exact restricted bimmetraj_app session/current role kimliğine bağlıdır; worker varsayılan reddedilir, backup salt okunur, migration owner istisnası yalnız migrator→owner oturumuna açıktır. PG16 testi full CDE yazma/okuma yaşam döngüsü, rollback, pool reuse, eşzamanlı A/B tenant ve policy driftini doğrular. Bu yalnız CDE dilimidir; diğer tenant tabloları ile production credential cutover açık olduğundan T41 PARTIAL'dır.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "CDE proje, üye, konteyner, revizyon ve karar olayı sorguları uygulama filtresine ve RBAC'a dayanıyor; DB katmanı filtre unutulmasına karşı ikinci savunma sunmuyordu.",
        after: "CDE'nin beş tablosu FORCE RLS, app tenant policy, backup read policy ve yalnız migrator session'lı owner policy taşır. CdeService'in bütün girişleri aynı checked-out bağlantıda BEGIN→tenant GUC→iş→COMMIT/ROLLBACK akışını kullanır; owner/superuser/SET ROLE veya yetkili üyelik driftinde callback başlamadan kapanır.",
        basis: "src/db/tenant-context.ts, src/services/cde/service.ts, src/db/schema.ts, drizzle-release/0013_cde_tenant_rls.sql, scripts/database-roles/inspect.ts ve src/contracts/cde-tenant-rls.pgtest.ts",
      },
    },
  },
  {
    revision: "Rev. 49",
    version: "BIM-CALC-2026-10-24.43",
    date: "24 Ekim 2026",
    commit: "30bb9eeedd3e64a468e9d4ae71f9396bcd4552ce",
    trigger: "GAP kapatma yol haritası Faz 7 / T42 ilk güvenli dilim: manuel Havale/EFT yaşam döngüsünde transaction, idempotency ve replay güvenliği.",
    beforeSummary: "Ödeme siparişi check-then-insert yarışıyla çoğalabiliyor; submit plan/dönem/tutar snapshotını değiştirebiliyor; approve/reject çift karar yazabiliyor; reddedilmiş talep yeniden açılabiliyor; aynı dekont farklı banka/talepte tekrar kullanılabiliyor ve ikinci gerçek ödeme aktif abonelik süresini resetleyebiliyordu.",
    afterSummary: "Init, submit ve review transaction advisory lock altında monotonik yaşam döngüsü kullanır. UUID requestId ve canonical dekont zorunludur; plan/dönem/tutar immutable, approve/reject terminal, receipt replay global, pasif paket fail-closed ve aynı-plan yeni ödeme mevcut period end'e eklenir. Beş gerçek PG16 ve sekiz unit testi geçti. Hesap formülleri değişmedi; Academy webhook, SmartCheck worker fencing/finalization, banka mutabakatı ve production deploy açık olduğundan T42 PARTIAL'dır.",
    affectedModules: ["teklif-satir"],
    moduleDetails: {
      "teklif-satir": {
        before: "Teklif/havale bedeli doğru hesaplanabilse de ödeme talebinin plan, dönem ve tutar snapshotı eşzamanlı isteklerde değiştirilebilir; aynı dekont ve çift admin kararı abonelik durumunu tutarsızlaştırabilirdi.",
        after: "Hesaplanan toplam ödeme talebinde immutable kalır; canonical dekont yalnız bir talebe bağlanır; yalnız pending talep tek terminal karara geçer. Aynı aktif plan için ikinci doğrulanmış ödeme mevcut abonelik bitişine seçilen dönem gününü ekler.",
        basis: "src/services/billing/bank-transfer.ts, src/services/billing/bank-transfer.integration.test.ts; PostgreSQL transaction-level advisory locks ve aynı client transaction sınırı",
      },
    },
  },
  {
    revision: "Rev. 50",
    version: "BIM-CALC-2026-10-24.44",
    date: "24 Ekim 2026",
    commit: "c185518834d5c82c468907ad00e3571c5f73587a",
    trigger: "GAP kapatma yol haritası Faz 7 / T42 ikinci güvenli dilim: SmartCheck worker claim, teslim denemesi fencing ve atomik canonical publish.",
    beforeSummary: "Aynı run birden fazla worker tesliminde eşzamanlı işlenebiliyor; eski worker recovery sonrasında run/document/artifact/kota durumunu değiştirebiliyor ve ortak object key üzerinde yeni sahibin blobunu ezebiliyordu. Release migrationı çalışan job varken uygulanabiliyordu.",
    afterSummary: "Graphile job kimliği ve her teslimata özgü UUID lease tokenı queued→running claim'i ve bütün canonical yazmaları çitler. CSV, PDF ve IFC çıktıları owner doğrulamalı transactionlarda yayımlanır; artifact anahtarları lease tokenıyla değişmezdir. Recovery eski tokenı geçersiz kılar. Onaylı release CLI, worker drain onayı, sıfır running run ve sıfır locked job olmadan başlamaz; migration CTE'si CLI dışı/direct apply için residual running run ve bağlı documentı birlikte failed yapan ek savunmadır. Hesap formülleri değişmedi; T42 production ve Academy webhook kapsamı nedeniyle PARTIAL'dır.",
    affectedModules: ["ifc-metraj", "pdfa"],
    moduleDetails: {
      "ifc-metraj": {
        before: "IFC worker aynı run için ikinci teslimat veya recovery ile yarıştığında satır, artifact, kota ve document finalizasyonunda tek sahip kanıtı taşımıyordu.",
        after: "IFC normalized rows, artifact, run, quota ve document finalizasyonu aynı lease-fenced transaction içinde yayımlanır; stale worker sıfır canonical DB çıktısı üretir ve object key teslimat tokenını taşır.",
        basis: "src/smartcheck/import/processor.ts, src/smartcheck/import/ifc-worker.ts, drizzle-release/0014_smartcheck_worker_lease.sql ve processor-concurrency.integration.test.ts",
      },
      pdfa: {
        before: "PDF doğrulama artifactları ile run/document final durumu recovery veya redelivery sırasında farklı workerlar tarafından karıştırılabiliyordu.",
        after: "PDF artifact listesi, run sonucu ve document durumu aynı owner-token kontrollü transactionda yayımlanır; recovery tokenı temizler ve eski teslimat finalizasyonu reddedilir.",
        basis: "src/smartcheck/import/processor.ts, src/smartcheck/import/service.ts, src/server/routes/smartcheck.ts ve worker overlap PostgreSQL testi",
      },
    },
  },
  {
    revision: "Rev. 51",
    version: "BIM-CALC-2026-10-24.45",
    date: "24 Ekim 2026",
    commit: "b8733c0d204bec9e978ab1a98e16df328dbb9d8c",
    trigger: "GAP kapatma yol haritası Faz 7 / T40 yerel cutover hazırlığı: servis bazlı PostgreSQL credential topolojisi, migration rol yükseltme sırası ve credential rollback kanıtı.",
    beforeSummary: "Canonical rol sözleşmesi ve provisioning denetimi vardı; ancak compose hizmetleri hâlâ ortak bootstrap bağlantısına dayanıyor, release runner owner rolüne kontrollü geçişi ve production zorunlu worker-drain sırasını tek transaction içinde kanıtlamıyor, credential rotation geri dönüşü gerçek parola doğrulamalı PostgreSQL üzerinde sınanmıyordu.",
    afterSummary: "App, worker/ifc-worker, migrate ve backup hizmetleri ayrı app/worker/migrator/backup login credential'larıyla fail-closed bağlanır. Release transactionı BEGIN sonrasında SET LOCAL ROLE owner uygular, session/current kimliklerini doğrular ve migrationdan önce worker-drain kapısını zorunlu tutar. İzole parola doğrulamalı PostgreSQL 16 testi credentialları A→B döndürüp eski parolaları reddeder, ardından B→A geri dönüşünü doğrular. Hesap yöntemleri değişmedi; production cutover, canary, restore/parity ve deploy yapılmadığından T40 PARTIAL'dır.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "IFC/SmartCheck uygulaması, workerları, release migrationı ve backup işi için yerel compose bağlantı kimlikleri canonical rol sözleşmesine ayrı credentiallarla bağlı değildi; rollback tatbikatı yalnız plan düzeyindeydi.",
        after: "Yerel compose app'i bimmetraj_app, worker/ifc-worker'ı bimmetraj_worker, migrate işini bimmetraj_migrator ve backup'ı bimmetraj_backup kimliğiyle sınırlar. Migrator yalnız transaction-local owner rolüyle DDL yürütür; A→B→A parola geri dönüş testi eski credential reddini ve geri kazanımı doğrular. IFC miktar/formül çıktısı değişmez.",
        basis: "compose.coolify.yaml, compose.example.yaml, scripts/database-roles/*, scripts/release-migrations/*, deploy/backup/* ve src/contracts/database-role-provision.pgtest.ts; PostgreSQL 16 parola doğrulama ve SET LOCAL ROLE davranış kanıtı",
      },
    },
  },
  {
    revision: "Rev. 52",
    version: "BIM-CALC-2026-10-24.46",
    date: "24 Ekim 2026",
    commit: "cd4b640d77cf3662b7f2f0270c1460f56fd0f56e",
    trigger: "GAP kapatma yol haritası Faz 7 / T41 ikinci dilim: hakediş bounded context için transaction-local tenant bağlamı ve PostgreSQL FORCE RLS savunması.",
    beforeSummary: "Beş CDE tablosunda tenant RLS vardı; ancak hakediş bounded context'indeki on tabloda aynı FORCE RLS/policy matrisi ve ProgressPaymentService'in bütün veritabanı girişlerini tek checked-out bağlantı ile tenant transactionına zorlayan ortak sınır yoktu. Migration/inspector imzaları bu tabloların eksik veya kısmi durumunu kapatmıyordu.",
    afterSummary: "On hakediş tablosu FORCE RLS ile exact app tenant, backup SELECT ve migrator-owner policy'lerini uygular; worker policy olmadığı için default-deny kalır. ProgressPaymentService'in bütün DB girişleri aynı bağlantıda transaction-local tenant context ile çalışır. Inspector/provisioner, hakediş tabloları mevcutken eksik 0015 tag'ini ve 0015 uygulanmışken eksik tablo/policy driftini fail-closed reddeder; tag ve tabloların birlikte bulunmadığı pre-schema bootstrap geçerlidir. Hesap yöntemi, formül ve sonuç değişmedi; diğer tenant tabloları, production cutover/deploy ve bağımsız izinli Yeşil Defter kabulü açık olduğundan T41 PARTIAL'dır.",
    affectedModules: ["hakedis-donem"],
    moduleDetails: {
      "hakedis-donem": {
        before: "Hakediş hesap ve yaşam döngüsü transactionları tenant filtreleri taşıyordu; ancak ilgili on tablo veritabanında FORCE RLS ile ikinci savunmaya ve servis girişlerinin tamamını tek tenant transactionına zorlayan ortak runtime sınırına sahip değildi.",
        after: "construction_contracts, construction_contract_items, progress_payment_periods, progress_payment_lines, progress_measurements, progress_measurement_review_events, progress_payment_adjustments, progress_payment_events, contract_variations ve final_accounts aynı FORCE RLS/policy matrisiyle korunur. Bütün ProgressPaymentService DB girişleri exact app session kimliğini ve transaction-local tenant context'i tek bağlantıda doğrular. Hakediş formülleri ve sonuçları değişmez.",
        basis: "drizzle-release/0015_progress_payment_tenant_rls.sql, src/services/progress-payments/service.ts, src/services/progress-payments/service.tenant-context.test.ts, scripts/database-roles/{contract,inspect}.ts, scripts/release-migrations/{data-transitions,stage-signatures}.ts ve src/contracts/progress-payment-tenant-rls.pgtest.ts; izole PostgreSQL 16 policy/transaction kanıtı",
      },
    },
  },
  {
    revision: "Rev. 53",
    version: "BIM-CALC-2026-10-24.47",
    date: "24 Ekim 2026",
    commit: "5e1113524b3a3f4c253bae61066e0779c5391b1f",
    trigger: "GAP kapatma yol haritası Faz 7 / T41 üçüncü dilim: SmartCheck pilot vaka, ölçüm ve audit kanıt zinciri için tenant izolasyonu ve değişmez provenance.",
    beforeSummary: "Pilot vaka ve ölçüm tablolarında FORCE RLS yoktu; route katmanı doğrudan sorgular yürütüyor, measurement key replay'i immutable istek özeti ve monotonik vaka revizyonuyla bağlı değildi. Pilot audit satırlarının aynı transactionda DB tarafından üretilmesi, append-only korunması, live reviewer üyeliği ve maker-checker ayrımı veritabanı provenance kapısıyla zorunlu değildi.",
    afterSummary: "smartcheck_pilot_cases üç, smartcheck_pilot_measurements dört exact policy ile FORCE RLS kullanır; worker default-deny, backup SELECT ve migrator-owner sınırları korunur. smartcheck_audit_logs pilot kapsamlı altı-policy FORCE RLS matrisine alınır. Ölçüm ve pilot audit kanıtı append-only'dir; case/measurement triggerları audit satırını aynı transactionda DB tarafında üretir. requestHash immutable, caseRevision monotoniktir; replay measurementId + hash ile doğrulanır, hash'i eksik legacy kayıt reddedilir. Reviewer kararı latest doğrulanmış ölçüm, canlı üyelik ve maker-checker ayrımı ister. Inspector exact policy, trigger, function owner/security/search_path/execute/source provenance driftinde fail-closed kapanır. Hesap formülü ve sonuç değişmedi; T41/Faz 7 PARTIAL'dır.",
    affectedModules: ["pilot-metrik"],
    moduleDetails: {
      "pilot-metrik": {
        before: "Pilot metrikleri hesaplanabiliyordu; ancak vaka, ölçüm ve audit kanıt zinciri tenant FORCE RLS, immutable istek özeti, monotonik revizyon ve DB kaynaklı atomik provenance ile korunmuyordu.",
        after: "Pilot metrik formülü aynı kalır. Vaka ve ölçüm erişimi tenant transactionıyla sınırlandırılır; her yeni ölçüm immutable requestHash ve artan caseRevision taşır. Aynı measurement key yalnız measurementId + hash kanıtı eşleşirse replay olur; review latest doğrulanmış ölçümü, canlı yetkili üyeyi ve ölçümü yapan kişiden farklı reviewerı zorunlu tutar. Pilot audit satırları DB tarafından atomik üretilir ve değiştirilemez.",
        basis: "drizzle-release/0016_smartcheck_pilot_evidence_tenant_rls.sql, src/services/pilot-evidence/service.ts, src/server/routes/pilot-evidence.ts, scripts/database-roles/{contract,inspect}.ts, scripts/release-migrations/{data-transitions,stage-signatures}.ts, src/contracts/smartcheck-pilot-tenant-rls.pgtest.ts ve src/server/routes/pilot-evidence.integration.test.ts; izole PostgreSQL 16 ve code/security review GO kanıtı",
      },
    },
  },
  {
    revision: "Rev. 54",
    version: "BIM-CALC-2026-10-24.48",
    date: "24 Ekim 2026",
    commit: "63c5c6080b37fc135288335c9a76ffaba5625926",
    trigger: "GAP kapatma yol haritası Faz 7 / T41 dördüncü dilim: şirket sektör ayarı ve global sektör kataloğu için tenant/rol izolasyonu.",
    beforeSummary: "company_industry_settings tenant filtresi route sorgularına bağlıydı; tabloda FORCE RLS yoktu ve GET/POST yolları ortak tenant transaction sınırından geçmiyordu. Global industries kataloğunda exact salt-okunur app/backup policy matrisi ile eksik başlangıç kayıtlarını operatör satırlarını ezmeden tamamlayan release bootstrap sözleşmesi bulunmuyordu.",
    afterSummary: "company_industry_settings exact beş-policy FORCE RLS ile app SELECT/INSERT/UPDATE, backup SELECT ve migrator-owner ALL yollarını açar; app DELETE ve worker erişimi default-deny kalır. industries exact üç policy ile app/backup SELECT ve migrator-owner ALL uygular. Dört INITIAL_PLUGINS kaydı ON CONFLICT DO NOTHING ile deterministik tamamlanır. Route DB yolları tek CompanyIndustrySettingsService tenant transactionına taşınır; katı input ve UI hata davranışı uygulanır. Inspector eksik tag/tablo/policy driftinde fail-closed kapanır. Hesap formülü ve sonuç değişmedi; T41/Faz 7 PARTIAL'dır.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Şirket sektör seçimi uygulama filtresine dayanıyor, global sektör kataloğu ile tenant ayarı veritabanında FORCE RLS ve tek transaction sınırıyla korunmuyordu.",
        after: "Sektör seçimi tek tenant transactionı ve exact FORCE RLS matrisleriyle korunur; dört başlangıç sektörü yalnız eksikse eklenir. IFC metraj hesap yöntemi, formülü ve sonucu değişmez.",
        basis: "drizzle-release/0017_company_industry_settings_tenant_rls.sql, src/services/company-industry-settings/service.ts, src/server/routes/company.ts, src/pages/settings-industry-client.ts, scripts/database-roles/{contract,inspect}.ts, scripts/release-migrations/{data-transitions,stage-signatures}.ts ve src/contracts/company-industry-tenant-rls.pgtest.ts; focused testler, izole PostgreSQL 16 ve code/security review GO kanıtı",
      },
    },
  },
  {
    revision: "Rev. 55",
    version: "BIM-CALC-2026-10-24.49",
    date: "24 Ekim 2026",
    commit: "82207c293f7ff527b3962e8f3e8ceabf58b9fe80",
    trigger: "GAP kapatma yol haritası Faz 7 / T41 beşinci dilim: CRM lead ve kota bağımlılıklarında tenant izolasyonu ile exact ACL sınırı.",
    beforeSummary: "Lead erişimi route filtrelerine dayanıyor; companies, subscriptions ve usage_logs FORCE RLS taşımıyordu. App/worker public şemasında geniş CRUD yetkisiyle plan, abonelik ve kullanım kayıtlarını değiştirerek CRM kotasını etkisizleştirebiliyordu; beklenmeyen DB hataları telemetry'ye SQL/PII ayrıntısı taşıyabiliyordu.",
    afterSummary: "leads app tenant SELECT/INSERT; companies/subscriptions app tenant SELECT; usage_logs app tenant SELECT/INSERT exact FORCE RLS matrisleriyle korunur. plans app için global SELECT-only, worker kritik beş tabloda default-deny, backup SELECT-only ve migrator-owner bakım yoludur. Lead insert ile kota rezervasyonu aynı transactionda ve company advisory lock altında çalışır; negatif kullanım kaydı constraint ile reddedilir. Inspector exact RLS/ACL/default-ACL/tag driftinde kapanır; hata raporlama yalnız güvenli name/code ile hashli korelasyon etiketleri taşır. PG16 ve focused kontroller geçti. Meşru control-plane yazmaları henüz ayrı role taşınmadığından deploy NO-GO ve T41 PARTIAL'dır.",
    affectedModules: [],
    moduleDetails: {},
  },
  {
    revision: "Rev. 56",
    version: "BIM-CALC-2026-10-24.50",
    date: "24 Ekim 2026",
    commit: "1dcc0bc373098b41a7bbad4c4832b3a4b5c44777",
    trigger: "GAP kapatma yol haritası Faz 7 / T41 altıncı dilim: authority-table mutasyonlarını ayrı control-plane DB kimliğine taşıma.",
    beforeSummary: "Rev. 55 exact ACL sınırı app credential'ının şirket, abonelik, plan ve kullanım telafisi yazmalarını güvenle reddediyor; meşru kayıt, şirket, ödeme ve admin akışları aynı app pool'u kullandığı için production cutover işlevsel değildi.",
    afterSummary: "bimmetraj_control ayrı LOGIN/NOINHERIT/NOBYPASSRLS rolü, exact tablo allowlist'i ve yalnız app konteynerine verilen CONTROL_DATABASE_URL ile tanımlandı. 0019 migration companies/subscriptions için control ALL, usage_logs için SELECT/INSERT/DELETE FORCE-RLS politikalarını sabitler. Kayıt/compensation, pilot dönüşüm, şirket ayarı, banka transferi/abonelik, admin plan ve quota release/audit mutasyonları control pool'a taşındı. Control rolü leads, queue ve allowlist dışı tablolarda reddedilir; compose secret izolasyonu ve PG16 negatif testleri geçti. Formül/sonuç değişmedi. Tenant-bound app okumaları ve worker entitlement erişimi henüz tamamlanmadığından production NO-GO ve T41 PARTIAL'dır.",
    affectedModules: [],
    moduleDetails: {},
  },
  {
    revision: "Rev. 57",
    version: "BIM-CALC-2026-10-24.51",
    date: "24 Ekim 2026",
    commit: "a55841e56c0829f61802bc0db63e7baa1d317370",
    trigger: "Rev.56 final code/security review: control-plane DB ayrımındaki broad app grants, effective URL override, audit silme, startup preflight ve compensation açıklarını kapatma.",
    beforeSummary: "Kod yolları control pool'a taşınmıştı; ancak app rolü bazı authority/support tablolarda geniş mutasyon yetkisini koruyor, DATABASE_URL query override'ları effective kimliği değiştirebiliyor, audit DELETE açıktı ve production preflight control URL'yi zorunlu tutmuyordu. Ücretli kayıt sonrası e-posta hatasında append-only audit FK'leri hesap silme telafisini bozuyordu.",
    afterSummary: "App/control/worker exact ACL matrisi authority/support tablolarda converge eder; app doğrudan user/membership/token mutasyonu ve audit DELETE yapamaz. Auth, davet ve Academy control mutasyonları control pool'dadır. İki DB URL'si query allowlist, duplicate reddi, exact rol/hedef ve TLS strength ile doğrulanır; production preflight ikisini zorunlu tutar. Control broad sequence/pre-schema grants kaldırıldı. E-posta teslimi aksarsa hesap ve ödeme audit'i korunur, yeniden gönderim durumu döner. PG16, focused, build ve code/security re-review LOCAL GO'dur. Formül/sonuç değişmedi; global app reads, worker entitlement, route-level paid-registration failure testi ve production cutover açık olduğundan T41 PARTIAL/production NO-GO'dur.",
    affectedModules: [],
    moduleDetails: {},
  },
  {
    revision: "Rev. 58",
    version: "BIM-CALC-2026-10-24.52",
    date: "24 Ekim 2026",
    commit: "0a4d76a7cbf15b1bab80ebee2e41f260662bca0a",
    trigger: "T41 sekizinci dilim hazırlığı: tenant bağlamlı servislerin aynı checked-out bağlantıda Drizzle sorguları çalıştırabilmesi.",
    beforeSummary: "Tenant RLS servisleri aynı PoolClient üzerinde elle drizzle(client, { schema }) kuruyordu; ortak yardımcı sözleşmesi yoktu. Auth middleware ve worker entitlement okumaları hâlâ ayrı global app/worker sorguları kullanıyor.",
    afterSummary: "withTenantDrizzleTransaction, transaction-local company/user GUC'leri ve restricted app-role doğrulamasından sonra aynı checked-out PoolClient'e bağlı typed Drizzle database verir. 7/7 tenant-context testi, TypeScript ve diff-check geçti. Auth resolver, worker entitlement ve production cutover henüz uygulanmadı; formül/hesap sonucu değişmedi.",
    affectedModules: [],
    moduleDetails: {},
  },
  {
    revision: "Rev. 59",
    version: "BIM-CALC-2026-10-24.53",
    date: "24 Ekim 2026",
    commit: "cc70ca261981b0602afc3d8b0ac4c536aad6a7bc",
    trigger: "T41 8A auth authority sınırı: tenant üyeliği ve abonelik guard okumalarının transaction-local tenant bağlamına alınması.",
    beforeSummary: "Auth middleware üyelik ve abonelik authority okumalarını global app Drizzle pool'undan yapıyordu; RLS savunması uygulama filtresine ve bağlantı kimliğine bağlı kalıyordu.",
    afterSummary: "findMembership ve findSubscription aynı checked-out PoolClient üzerinde withTenantDrizzleTransaction kullanır; company/user GUC'leri ve restricted bimmetraj_app rolü doğrulanmadan sorgu başlamaz. Auth testleri 8/8, ilgili oturum/route testleri ve TypeScript geçti. Kullanıcı profili kontrol-plane okuması olarak kalır; worker entitlement, kalan tenant okumaları ve production cutover açık kalır. Formül/hesap sonucu değişmedi.",
    affectedModules: ["auth"],
    moduleDetails: {
      auth: {
        before: "Üyelik ve abonelik authority sorguları global app Drizzle pool'unda çalışıyordu.",
        after: "Tenant-bound authority sorguları transaction-local GUC ve aynı checked-out PoolClient üzerinden typed Drizzle ile çalışıyor.",
        basis: "src/server/middleware/auth.ts; src/server/middleware/auth.tenant.test.ts; tenant-context transaction contract",
      },
    },
  },
  {
    revision: "Rev. 60",
    version: "BIM-CALC-2026-10-24.54",
    date: "24 Ekim 2026",
    commit: "9a47b51f71cb533f8f9202d438a4b0dbed05a4d4",
    trigger: "T41 8B worker entitlement sınırı: worker'ın plan/abonelik authority tablolarına doğrudan okumasını capability function'a indirme.",
    beforeSummary: "Worker IFC kota yolu production'da companies, subscriptions ve plans tablolarını doğrudan okuyordu; ACL revoke eski worker image'ını kıracak durumdaydı.",
    afterSummary: "0020 migration ile yalnız bimmetraj_worker'e EXECUTE verilen, owner/search_path/session-role kapılı worker entitlement function eklendi. Production IFC kota yolu şirket varlığını function üzerinden doğrular; local test ve legacy path korunur. Release artifact zinciri 15/15, capability negatif testi ve TypeScript geçti. Canary/drain sonrası ACL revoke ve kalan worker reads açık kalır; formül/hesap sonucu değişmedi.",
    affectedModules: ["worker-entitlement"],
    moduleDetails: {
      "worker-entitlement": {
        before: "Worker authority tablolarını doğrudan okuyordu.",
        after: "Worker production kota yolu dar SECURITY DEFINER entitlement function kullanıyor; function execute ACL'si yalnız worker rolüne ait.",
        basis: "drizzle-release/0020_worker_entitlement_capability.sql; scripts/database-roles/contract.ts; src/services/billing/quota.ts",
      },
    },
  },
  {
    revision: "Rev. 61",
    version: "BIM-CALC-2026-10-24.55",
    date: "24 Ekim 2026",
    commit: "4afe32b70e458d5a114dca47bd913ae8df2fb1a7",
    trigger: "T41 8C worker company context sınırı: IFC rule standardı ve normalize edilmiş dosya doğrulama ayarlarının worker authority tablosu okumalarından ayrılması.",
    beforeSummary: "IFC worker companies.active_standard ve spreadsheet worker companies.smartcheck_max_waste_percent alanlarını doğrudan okuyordu; worker ACL revoke sonrası bu yollar kırılacaktı.",
    afterSummary: "0021 migration ile yalnız bimmetraj_worker EXECUTE yetkili, session-role/search_path kapılı company context capability function eklendi. IFC rule evaluation ve normalize edilmiş satır doğrulaması production'da bu capability üzerinden çalışır; local/test fixture yolu korunur. Release artifact zinciri 22/22, capability negatif testi ve TypeScript geçti. Canary/drain sonrası doğrudan companies ACL revoke ve kalan worker reads açık kalır; formül/hesap sonucu değişmedi.",
    affectedModules: ["worker-company-context"],
    moduleDetails: {
      "worker-company-context": {
        before: "Worker IFC standardı ve SmartCheck fire toleransı için companies tablosunu doğrudan okuyordu.",
        after: "Production worker company context dar SECURITY DEFINER capability function ile okunuyor; function execute ACL'si yalnız worker rolüne ait.",
        basis: "drizzle-release/0021_worker_company_context_capability.sql; scripts/database-roles/contract.ts; src/smartcheck/import/worker-company-context.ts; src/smartcheck/import/processor.ts",
      },
    },
  },
  {
    revision: "Rev. 62",
    version: "BIM-CALC-2026-10-24.56",
    date: "24 Ekim 2026",
    commit: "131042dd6675341b73733881ad433f87f5e9dd2e",
    trigger: "T41 test-harness runtime sınırı: disposable izolasyonda control clone, restricted app runtime ve Graphile Worker vendor şeması ayrımı.",
    beforeSummary: "İzole test hook'u tek DATABASE_URL ile hem schema clone/migration hem uygulama runtime'ını çalıştırıyor; queue vendor migrations ve restricted bimmetraj_app tenant transaction'ı aynı koşuda kanıtlanamıyordu.",
    afterSummary: "CONTROL_DATABASE_URL varsa clone ve vendor migration işlemleri control bağlantısına, uygulama DATABASE_URL'si restricted runtime'a ayrılır. İzole worker şemasında Graphile migration 18, bounded SmartCheck queue wrapper'ları, app execute ve worker tablo erişimleri kurulur; aynı veritabanı hedefi zorunlu tutulur. Queue 14/14, HTTP tenant akışı ve IFC quota 6/6 geçti; worker credential ayrımı gerektiren IFC HTTP koşusu ayrı harness kapısı olarak kaldı.",
    affectedModules: ["test-isolation", "worker-queue"],
    moduleDetails: {
      "test-isolation": {
        before: "Schema clone, Graphile migration bootstrap ve uygulama runtime'ı tek bağlantı rolüyle yürütülüyordu.",
        after: "CONTROL_DATABASE_URL yönetici clone/migration için, DATABASE_URL restricted app runtime için kullanılır; URL'lerin aynı disposable veritabanını hedeflediği doğrulanır.",
        basis: "src/server/routes/test-isolation.ts; src/server/routes/test-isolation.test.ts; restricted bimmetraj_app tenant contract",
      },
      "worker-queue": {
        before: "İzole şemada vendor migrations ve production queue wrapper sınırı yoktu.",
        after: "Graphile Worker migration 18 ve iki SECURITY DEFINER SmartCheck wrapper'ı izole worker şemasında kurulur; app yalnız wrapper execute, worker yalnız queue tablo erişimi alır.",
        basis: "graphile-worker vendor migration; scripts/database-roles/contract.ts; queue.integration.test.ts",
      },
    },
  },
  {
    revision: "Rev. 63",
    version: "BIM-CALC-2026-10-24.57",
    date: "24 Ekim 2026",
    commit: "c9e025e6f2b3a700cf18a192757dfeb5f21b10c4",
    trigger: "T41 worker credential harness ayrımı.",
    beforeSummary: "İzolasyon hook'u app ve worker işlemlerini tek DATABASE_URL ile çalıştırıyordu; gerçek restricted worker runtime aynı test koşusunda verilemiyordu.",
    afterSummary: "İsteğe bağlı WORKER_DATABASE_URL aynı disposable veritabanına izole edilir ve worker run/runOnce testleri bu bağlantıyı kullanır; app runtime ve worker runtime credential sınırı korunur.",
    affectedModules: ["test-isolation", "worker-queue"],
    moduleDetails: {
      "test-isolation": {
        before: "Yalnız DATABASE_URL override ediliyordu.",
        after: "WORKER_DATABASE_URL verilirse schema/search_path ile aynı disposable DB'ye izole edilerek test hook'una aktarılır.",
        basis: "src/server/routes/test-isolation.ts; explicit worker credential contract",
      },
      "worker-queue": {
        before: "Graphile run/runOnce app credential ile yürütülüyordu.",
        after: "Worker integration tests explicit worker runtime URL kullanabilir; ürün uygulama pool'u app credential olarak kalır.",
        basis: "src/smartcheck/import/queue.integration.test.ts; src/server/routes/smartcheck.integration.test.ts",
      },
    },
  },
  {
    revision: "Rev. 64",
    version: "BIM-CALC-2026-10-24.58",
    date: "24 Ekim 2026",
    commit: "f13c2e2b4de5ecf8eedf009baab40723a57dee88",
    trigger: "T41 worker queue RLS mirror ve restricted app/worker HTTP kanıtı.",
    beforeSummary: "İzole Graphile Worker tabloları RLS açık fakat worker policy'siz oluşturuluyordu; gerçek worker credential ile queue tüketimi RLS tarafından engelleniyordu.",
    afterSummary: "İzolasyon hook'u migrations RLS'ini kapatır ve dört Graphile private tabloya yalnız bimmetraj_worker için production modeliyle uyumlu USING/WITH CHECK policy kurar. Restricted app + worker koşusunda SmartCheck HTTP ve IFC evidence worker testi 2/2 geçti.",
    affectedModules: ["test-isolation", "worker-queue"],
    moduleDetails: {
      "test-isolation": {
        before: "Worker schema clone vendor RLS tablolarını policy'siz bırakıyordu.",
        after: "Worker role policy'leri ve migrations erişim davranışı üretim role provisioning sözleşmesiyle eşlendi.",
        basis: "src/server/routes/test-isolation.ts; scripts/database-roles/provision.ts",
      },
      "worker-queue": {
        before: "Restricted worker run RLS nedeniyle _private_tasks insert/read kapısında duruyordu.",
        after: "Restricted worker credential ile IFC HTTP queue tüketimi ve evidence persistence 2/2 geçti.",
        basis: "src/server/routes/smartcheck.integration.test.ts; graphile-worker migration 18",
      },
    },
  },
  {
    revision: "Rev. 65",
    version: "BIM-CALC-2026-10-24.59",
    date: "24 Ekim 2026",
    commit: "f13c2e2b4de5ecf8eedf009baab40723a57dee88",
    trigger: "T45 sentetik 100 MB IFC parser bellek ve süre ölçümü.",
    beforeSummary: "T45 için compose kaynak tavanları dokümante edilmişti; parserın 100 MB sentetik IFC koşusuna ait tekrarlanmış yerel ölçüm kaydı yoktu.",
    afterSummary: "Üç ayrı process koşusunda 100 MB sentetik IFC parser süresi 3.590–3.623 ms, peak RSS 1.190,48–1.237,61 MB ve peak heap 778,86–826,59 MB ölçüldü; mevcut 2 GiB RSS ve 1 GiB heap tavanları aşılmadı. Bu yalnız ön ölçümdür; T45 kabul bütçesi, gerçek büyük dosya ve hedef VPS kanıtı bekler.",
    affectedModules: ["ifc-parser", "performance-budget"],
    moduleDetails: {
      "ifc-parser": {
        before: "100 MB sentetik IFC için tekrarlanmış süre/RSS/heap ölçümü yol haritasında kayıtlı değildi.",
        after: "scripts/compare-ifc-parsers.ts --synthetic-100mb ile 3 koşu kaydedildi; 354.567 eleman parse edildi, tüm koşular mevcut tavanlar altında kaldı.",
        basis: "scripts/compare-ifc-parsers.ts; docs/deploy/container-app-worker.md kaynak tavanları; yerel Node 24 çalışma koşusu",
      },
      "performance-budget": {
        before: "Compose tavanları ölçülmemiş kapasite vaadi olarak ayrıca belirtilmişti.",
        after: "Sentetik parser ölçümü ön kanıt olarak eklendi; onaylı p95/süre/RAM bütçesi, gerçek dosya matrisi, eşzamanlı tenant ve hedef VPS ölçümü açık bırakıldı.",
        basis: "T45 kabul kriteri; docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md",
      },
    },
  },
  {
    revision: "Rev. 66",
    version: "BIM-CALC-2026-10-24.60",
    date: "24 Ekim 2026",
    commit: "409244f",
    trigger: "Harici IFC fixture parity ölçümünün capability kapsamına göre sınıflandırılması.",
    beforeSummary: "compare-ifc-parsers tüm Legacy/IfcOpenShell farklarını tek bir parity divergence sayısında topluyor, browser önizlemesinin worker-only geometri metriklerini yanlışlıkla genel eşleşme gibi gösteriyordu.",
    afterSummary: "Karşılaştırma satırları browser/worker desteklenen sözleşme kesişimi ve worker-authoritative metrikler olarak ayrılır. İki yerel IFC'de kiriş/kolon/döşeme/perde/donatı/poz/E-PYS kesişimi eşleşir; toplam eleman, geometri fallback hacimleri ve kalıp alanı worker otoritesinde raporlanır. Harici fixture lisans durumu doğrulanmadığı için uzman/vendor kabulü iddia edilmez.",
    affectedModules: ["ifc-parser", "parity-benchmark"],
    moduleDetails: {
      "ifc-parser": {
        before: "Browser capability seti geometryFallback=false olmasına rağmen ham toplam hacim/kalıp farkı genel parity sonucu olarak görünüyordu.",
        after: "Worker-authoritative metrikler ayrı açıklanır; browser preview çıktısı server worker metrajı olarak sunulmaz.",
        basis: "src/ifc/parser/contract.ts; src/ifc/parser/legacy-parser.ts; scripts/compare-ifc-parsers.ts",
      },
      "parity-benchmark": {
        before: "e-proje_4x3.ifc ve 2026_45_MM...ifc karşılaştırmasında ham 7 farkın nedeni raporlanmıyordu.",
        after: "Her iki dosyada desteklenen kesişim eşleşmesi ve worker fallback farkı ayrı raporlanır; fixture README'si yalnız test kullanımını söyler, lisans/dağıtım izni kanıtlamaz.",
        basis: "harici-kaynaklar/klasorler-ve-ornekler/IfcSampleFiles-main/README.md; yerel compare-ifc-parsers koşuları",
      },
    },
  },
  {
    revision: "Rev. 67",
    version: "BIM-CALC-2026-10-24.61",
    date: "24 Ekim 2026",
    commit: "f0a9e357a16a709290519ff1e09bb6aeded6fe",
    trigger: "Bağımsız uzman denemesi için kabul kapıları, disiplin kapsamı ve ölçüm sırasının admin yüzeyinde yayınlanması.",
    beforeSummary: "Uzman dosyası ve roadmap kayıtları bulunuyordu; uzmanların hangi ekranları hangi sırayla ve hangi kanıt alanlarıyla çalıştıracağı tek bir uygulama yüzeyinde toplanmamıştı.",
    afterSummary: "Korunan admin rotasında kaynak kabulü, normal/sınır/eksik senaryoları, gerçek UI/VPS performans ölçümü, retry/alert gözlemi ve imzalı karar sırası açıkça listelenir. Bu bir onay kaydı değildir.",
    affectedModules: ["expert-acceptance", "performance-budget"],
    moduleDetails: {
      "expert-acceptance": {
        before: "Uzman kapsamı yalnızca faz dokümanlarında dağınık olarak açıklanıyordu.",
        after: "`/admin/roadmap/expert-review` uzman çalışma ekranı disiplin, kapı ve kanıt sırasını tek yerde sunar.",
        basis: "docs/audits/phase-0/EXPERT_REVIEW_DOSSIER_2026-10-23.md; T43–T45 kabul kriterleri",
      },
      "performance-budget": {
        before: "T45 gerçek dosya, hedef VPS, concurrency ve observability kanıtı açık kalıyordu; uzman çalışma sırası görünür değildi.",
        after: "Sayfa bu kanıtların ölçüm formunda kaydedilmesini zorunlu kapı olarak gösterir; yerel sentetik ölçüm uzman/VPS kabulü sayılmaz.",
        basis: "docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md T45",
      },
    },
  },
  {
    revision: "Rev. 68",
    version: "BIM-CALC-2026-10-24.62",
    date: "24 Ekim 2026",
    commit: "7fbedb3675c55655c6c8a075a4fb49c6cd9b18c7",
    trigger: "Uzman denemesi öncesi: mükerrer GUID'li modellerde açıkta kalan elemanların kaybolması ve tarayıcı ön analizinin yetkili sonuç gibi görünmesi.",
    beforeSummary: "İcmal, açıkta kalan kayıtları worker raporuyla yalnız GlobalId üzerinden birleştiriyordu; aynı GUID'i paylaşan ikinci eleman rapordan ve açıkta kalan sayacından düşüyordu. Tarayıcı ön analizinde yapısal elemanların neden açıkta kaldığı ekranda açıklanmıyordu.",
    afterSummary: "Kayıtlar GUID + sınıf + ad + kat kimliğiyle sayımlı birleştirilir: worker'da bulunan kayıt bir kez kalır, farklı elemanlar ayrı kalır. Tarayıcı sonucu 'yetkili sonuç değildir' notuyla gösterilir. Metraj ve poz hesapları değişmedi.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Mükerrer GUID'li iki açıkta kalan elemandan yalnız ilki raporlanıyordu.",
        after: "Her iki eleman da raporda ve sayaçta yer alır; worker kaydı çift sayılmaz.",
        basis: "src/ifc/calm-icmal.test.ts (aynı GlobalId ve worker kaydı testleri)",
      },
    },
  },
  {
    revision: "Rev. 69",
    version: "BIM-CALC-2026-10-24.63",
    date: "24 Ekim 2026",
    commit: "de96def679a18b825bd250bef301b35b07cd3360",
    trigger: "Uzmanların normal kullanıcı paketiyle hesap yöntemlerini uygulama içinde görebilmesi.",
    beforeSummary: "Modül açıklamaları, formüller ve örnek hesaplar yalnız süper adminin görebildiği /admin/roadmap/calculations sayfasındaydı.",
    afterSummary: "Aynı içerik /app/nasil-calisir sayfasında tüm çalışma alanı rollerine gösterilir; hesap yöntemleri ve örnek sonuçlar değişmedi.",
    affectedModules: ["expert-acceptance"],
  },
  {
    revision: "Rev. 70",
    version: "BIM-CALC-2026-10-24.64",
    date: "24 Ekim 2026",
    commit: "ec56937e4bc85a06b7bf9d45839d35c34509a8e8",
    trigger: "Uzman mühendisin hesapların nasıl yapıldığını ekrandan izleyip satır satır doğrulayabilmesi.",
    beforeSummary: "İcmal satırı yalnız toplamı ve kat dağılımını gösteriyordu; satırı oluşturan elemanlar ve uzman kararı kaydedilemiyordu.",
    afterSummary: "Her satır eleman bazlı metraj cetveliyle açıklanır ve CSV olarak indirilir; uzman satır kararını, kendi değerini ve notunu girer, sapma ±%3 şirket toleransıyla karşılaştırılır. Miktar ve poz hesapları değişmedi.",
    affectedModules: ["ifc-metraj", "expert-acceptance"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Kalem toplamı izlenebilir eleman listesi olmadan gösteriliyordu.",
        after: "Kalem başına katkı listesi; katkıların toplamı net miktara eşittir (calm-icmal.test.ts).",
        basis: "Saha geri bildirimi (17 Ekim 2026): uzman hesap yöntemini sordu",
      },
    },
  },
  {
    revision: "Rev. 71",
    version: "BIM-CALC-2026-10-25.65",
    date: "25 Ekim 2026",
    commit: "14485418fabb9a241262509fac9f34012279f7ef",
    trigger: "Gerçek rol modeliyle yerel provada giriş, şirket, abonelik, kota ve PDF yollarının RLS altında başarısız olması.",
    beforeSummary: "Kota tüketimi şirket, plan ve abonelik satırlarını FOR UPDATE/SHARE ile kilitliyordu; uygulama rolü bu tablolarda yalnız SELECT yetkisine sahip olduğundan üretim rol modelinde teklif oluşturma 503 dönüyordu.",
    afterSummary: "Kota tüketimi şirket başına advisory kilit altında aynı okumaları yapar; yönetim plan/abonelik değişiklikleri ve ödeme onayı aynı kilidi alır. Kota limiti, sayaç ve tolerans kuralları değişmedi.",
    affectedModules: ["kota"],
    moduleDetails: {
      kota: {
        before: "Şirket/plan/abonelik satır kilitleri uygulama rolünde reddediliyordu.",
        after: "Şirket başına pg_advisory_xact_lock; usage_records satır kilidi korunur (scripts/role-model-smoke.ts 13/13).",
        basis: "Yerel PG16 prova, gerçek rol provisioning (scripts/database-roles/cli.ts provision)",
      },
    },
  },
  {
    revision: "Rev. 72",
    version: "BIM-CALC-2026-10-25.66",
    date: "25 Ekim 2026",
    commit: "b9bf785cf8e8c19b9cb2a2d0a857227a871b4912",
    trigger: "Üretim veritabanı rollerinin parolasız operatör erişimiyle, Coolify deploy'u içinde kurulması.",
    beforeSummary: "Rol kurulumu elle çalıştırılan operatör komutlarına bağlıydı; boş veritabanında migrate servisi başlayamıyordu.",
    afterSummary: "db-bootstrap → migrate → db-provision tek seferlik servisleri deploy sırasında rolleri kurar ve yetkileri yakınsar. Hesap yöntemleri değişmedi.",
    affectedModules: [],
  },
  {
    revision: "Rev. 73",
    version: "BIM-CALC-2026-10-25.67",
    date: "25 Ekim 2026",
    commit: "be0791f3e5a3e1e690e3e6d0e17f753b7b9fd3a0",
    trigger: "GAP planı Faz 8 kod işleri (T47, T49): SEO-03, SEO-04, SEO-05 ve GEO-01 bulguları.",
    beforeSummary: "Sitemap tüm sayfalara sabit 2026-10-18 lastmod veriyordu; robots.txt yalnız `*` grubunu içeriyordu; hesaplayıcı ve sözlük sayfalarında sayfaya özgü JSON-LD yoktu; index.html llms.txt'ye bağlanmıyordu.",
    afterSummary: "Sitemap lastmod yazmaz; production'da PUBLIC_APP_URL zorunluluğu testle sabitlendi; hesaplayıcılar ve sözlük BreadcrumbList, WebApplication ve DefinedTermSet alır (puan/fiyat yok); robots.txt yapay zekâ arama ve eğitim tarayıcılarını açık gruplarla listeler, eğitim izni ROBOTS_AI_TRAINING ile kapatılabilir. Hesap yöntemleri değişmedi.",
    affectedModules: [],
  },
  {
    revision: "Rev. 74",
    version: "BIM-CALC-2026-10-25.68",
    date: "25 Ekim 2026",
    commit: "cc5161946cab209fbab126826ba4a2b199313a5a",
    trigger: "GAP planı T46 (tek kaynaklı ürün metni) ilk dilimi ve T48 (semantik ön-render).",
    beforeSummary: "llms.txt'de yetenek kaydından ayrışmış elle yazılmış bir blok vardı (CDE ve PDF/A 'Faz 2', KİK dosyası 'Faz 3 yol haritasında'); paket fiyatları llms.txt ve /pricing metninde elle yazılıydı. Sunucu sayfa metni <noscript> içindeydi; Readability/Trafilatura gibi çıkarıcılar bu bloğu siler.",
    afterSummary: "llms.txt yetenekleri yalnız CAPABILITY_REGISTRY'den, paketleri ve iskontoları canonicalPlans ve BILLING_PERIOD_OPTIONS'tan üretir. Sayfa metni #root içinde <main id=\"prerender\"> olarak yazılır, JS ile açılışta ekran dışında tutulur ve React kökü temizler; JS kapalıyken <noscript> stiliyle görünür. Chromium'da CLS 0, mount sonrası tek main/h1. Hesap yöntemleri değişmedi.",
    affectedModules: [],
  },
  {
    revision: "Rev. 75",
    version: "BIM-CALC-2026-10-25.69",
    date: "25 Ekim 2026",
    commit: "b8ea6d2fbe1524118ea773976424622a05d36e84",
    trigger: "GAP planı T46 ikinci dilimi ve GEO-03: site geneli JSON-LD ve landing metni.",
    beforeSummary: "index.html'deki Organization/SoftwareApplication JSON-LD'si elle yazılmıştı (featureList ve fiyat aralığı ayrışabilirdi). Landing, kayıtta canlı yetenek yokken 'canlı özellikler ... doğrulanmıştır' ve 'Onaylı İhale Teklifi' diyordu.",
    afterSummary: "Sunucu site JSON-LD'sini her sayfada canlı/pilot yeteneklerden ve yayındaki plan kataloğundan üretir; yol haritası yetenekleri listelenmez, Organization'a areaServed TR eklendi, sameAs/puan/yorum yazılmaz. Landing metni pilot durumunu ve bağımsız uzman onayı olmadığını söyler; public-copy.test.ts doğrulanmamış uygunluk/doğruluk/tekillik iddialarını engeller. Hesap yöntemleri değişmedi.",
    affectedModules: [],
  },
  {
    revision: "Rev. 76",
    version: "BIM-CALC-2026-10-25.70",
    date: "25 Ekim 2026",
    commit: "e36a8bd8946dfde18b7a5e8ea954ec0786714641",
    trigger: "GAP planı T41 (0022 14 iş tablosu FORCE RLS), T32 (veraPDF 1.30.3 runtime + 7/7 PDF/A-2b fixture matrisi) ve T43 (c8 kapsam kapısı + Playwright E2E) birleştirmesi.",
    beforeSummary: "1) 14 CRM/faturalama/tedarik iş tablosu yalnızca uygulama katmanında company_id filtresiyle korunuyordu. 2) ifc-worker imajında gerçek veraPDF CLI runtime'ı yoktu ve ham XML doğrulama raporu ayrı artifact olarak saklanmıyordu. 3) CI hattında tüm-dosya kapsam ratchet kapısı ve gerçek tarayıcı Playwright E2E iş akışı bulunmuyordu.",
    afterSummary: "1) 0022_tenant_business_rls.sql ile 14 iş tablosu FORCE RLS altına alındı (toplam 36 tablo). 2) ifc-worker imajına SHA-256 sabitli veraPDF 1.30.3 eklendi, ham XML rapor verapdf_report_xml artifact'ı olarak saklanıyor ve 7 vakalık PDF/A-2b fixture matrisi imaj içinde doğrulandı. 3) c8 tüm-dosya kapsam raporu (%46,80 satır, 7 kritik kapsam tabanı), REQUIRE_TEST_DATABASE=true ve 6 gerçek tarayıcı Playwright E2E senaryosu CI'a bağlandı.",
    affectedModules: ["pdfa"],
    moduleDetails: {
      pdfa: {
        before: "veraPDF rapor ayrıştırıcısı ve kaynak checksum zinciri vardı ancak ifc-worker imajında gerçek veraPDF CLI çalışma zamanı bulunmuyor ve ham XML rapor ayrı artifact olarak saklanmıyordu.",
        after: "ifc-worker imajına veraPDF 1.30.3 (SHA-256 b512bf24…9a59, GPLv3+/MPLv2+ çift lisans) gömüldü; her PDF koşusunda pdf_preflight, verapdf_validation ve verapdf_report_xml artifact'ları saklanır ve 7 vakalık PDF/A-2b fixture matrisi (yalnız XMP etiketi PASS almaz) imaj içinde doğrulanır.",
        basis: "ISO 19005-2 (PDF/A-2b) & Dijital Hazırlama Yön. m.7",
      },
    },
  },
  {
    revision: "Rev. 77",
    version: "BIM-CALC-2026-10-25.71",
    date: "25 Ekim 2026",
    commit: "405d2bc69be1780e1f8d38e83559560515269964",
    trigger: "GAP planı T46 üçüncü dilimi ve tam kapanışı: mevzuat, sözlük ve admin yüzeylerinin CAPABILITY_REGISTRY tek kaynağına hizalanması.",
    beforeSummary: "LegislationView.tsx yetenek kaydına doğrudan bağlı değildi; DeveloperRoadmap.tsx ve CalculationMethods.tsx başlıklarında sabit 'Rev. 5' ifadesi, AdminDashboard.tsx'te 'TeklifPro' adı ve BimDashboard.tsx/BimGlossary.tsx/PricingSources.tsx'te public-copy kapısına girmeyen ifadeler vardı.",
    afterSummary: "LegislationView.tsx doğrudan CAPABILITY_REGISTRY'den canlı/pilot/yol haritası sayılarını ve 18.848 resmi katalog satır sınırını üretir; DeveloperRoadmap.tsx ve CalculationMethods.tsx son revizyonu CALC_REVIEW_CHANGELOG'dan dinamik okur; public-copy.test.ts mevzuat, sözlük ve admin yüzeylerini de kapsar; hazarvolga@gmail.com süper admin bootstrap koruması eklendi. Hesap yöntemleri değişmedi.",
    affectedModules: [],
  },
  {
    revision: "Rev. 78",
    version: "BIM-CALC-2026-10-25.72",
    date: "25 Ekim 2026",
    commit: "a32b997eae615fab3ded08a2c4f1340e306c8475",
    trigger: "GAP planı T42 yetki/kaynak sınırı regresyonu, §8.4 sektör varsayılanı kusuru, Academy kapalı-bayrak koruması ve SmartCheck orphan lease devralma akışı.",
    beforeSummary: "CreateQuote varsayılan 'residential' gönderdiğinde industries kataloğu boşsa 500 FK hatası oluşuyordu; ACADEMY_ENABLED=false iken requireAllplanEntitlement doğrudan DB sorgusuna gidiyordu; claimSmartCheckRun süresi dolan farklı deliveryId'li yetim running işleri devralamıyordu.",
    afterSummary: "resolveQuotationIndustryId boş katalogda null'a düşer ve dolu katalogda geçersiz/pasif sektörü 400 ile reddeder; createRequireAllplanEntitlement ACADEMY_ENABLED=false iken 403 ACADEMY_FEATURE_DISABLED döner; isSmartCheckLeaseExpired ile 15 dk'yı aşan yetim running işler yeni workerLeaseToken ile güvenli devralınır. Hesap yöntemleri değişmedi.",
    affectedModules: ["kota"],
    moduleDetails: {
      kota: {
        before: "Askıdaki abonelik, salt-okunur impersonation, kapalı Academy bayrağı ve boş sektör kataloğu regresyonları tek bir T42 kapı testinde birleştirilmemişti.",
        after: "t42-regression.test.ts (4/4) ile SUBSCRIPTION_SUSPENDED, IMPERSONATION_READ_ONLY, ACADEMY_FEATURE_DISABLED, resolveQuotationIndustryId ve orphan lease devralma sınırları doğrulandı.",
        basis: "Faz 7 T42 yetki ve kaynak sınırı regresyon sözleşmesi",
      },
    },
  },
  {
    revision: "Rev. 79",
    version: "BIM-CALC-2026-10-25.73",
    date: "25 Ekim 2026",
    commit: "11333fda14ebb32be5503fa81d6111387e5086e8",
    trigger: "GAP planı T43 — server-path.e2e.test.ts Python çalışma zamanı çözümlemesinin resolvePythonBin() ile birleştirilmesi.",
    beforeSummary: "src/ifc/server-path.e2e.test.ts sabit workers/ifc/.venv/bin/python yolunu aradığı için CI ortamında (actions/setup-python) consistencyReport ve browser/worker parity testleri skip ediliyordu.",
    afterSummary: "resolvePythonBin() ve hasPythonIfcRuntime() ile hem yerel .venv hem CI sistem Python'u desteklenir; repo fixture'larıyla çalışan 2 IFC E2E testi CI'da atlanmadan koşar. Hesap yöntemleri değişmedi.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "server-path.e2e.test.ts yalnızca yerel workers/ifc/.venv/bin/python varlığında çalışıyordu.",
        after: "resolvePythonBin() + ifcopenshell runtime kontrolü ile CI sistem Python'unda da consistencyReport ve browser/worker parity testleri çalışır.",
        basis: "Faz 7 T43 doğrulama hattı — zorunlu senaryonun CI'da atlanmaması",
      },
    },
  },
  {
    revision: "Rev. 80",
    version: "BIM-CALC-2026-10-25.74",
    date: "25 Ekim 2026",
    commit: "a7d7eca5a60afcddde6b55ae0d671732250489ba",
    trigger: "GAP planı T41 S1 dilimi (0023_quotation_core_rls — 6 teklif çekirdeği tablosu FORCE RLS) ve database-role-provision.pgtest.ts pre-schema rol sözleşmesi düzeltmesi.",
    beforeSummary: "clients, quotations, quotation_items, quotation_item_evidence, quotation_transfer_ledgers ve quotation_transfer_source_rows tabloları yalnızca uygulama katmanında company_id filtresiyle korunuyordu; database-role-provision.pgtest.ts pre-schema modunda henüz oluşmamış worker fonksiyonlarında hata veriyordu.",
    afterSummary: "0023_quotation_core_rls.sql ile 6 teklif çekirdeği tablosu ENABLE+FORCE RLS ve exact CDE 3-policy matrisine alındı (42/72 company_id tablosu FORCE RLS altında); ilgili tüm route/servis yolları withAppTenant/withAppTenantTransaction sınırına taşındı; 11/11 PG16 kontrat testi ve 14/14 release-migration lifecycle testi yeşil yapıldı. Hesap yöntemleri değişmedi.",
    affectedModules: ["teklif-satir"],
    moduleDetails: {
      "teklif-satir": {
        before: "Müşteri, teklif, kalem, kanıt ve Calm transfer tablolarında veritabanı düzeyinde FORCE RLS yoktu; sorgular paylaşılan app havuzundan doğrudan çalışabiliyordu.",
        after: "0023_quotation_core_rls ile 6 teklif çekirdeği tablosu FORCE RLS altına alındı ve tüm teklif/revizyon/düzenleme/aktarım/PDF sorguları withAppTenant / withAppTenantTransaction içine taşındı.",
        basis: "Faz 7 T41 S1 — teklif çekirdeği çok-kiracılı veritabanı izolasyonu",
      },
    },
  },
  {
    revision: "Rev. 81",
    version: "BIM-CALC-2026-10-25.75",
    date: "25 Ekim 2026",
    commit: "1b7753dfb60faeb204c75c341cb3bc7db8a8d8d6",
    trigger: "GAP planı T41 S2 dilimi (0024_pricing_regulations_rls — 8 fiyat, kaynak zekâsı ve mevzuat tablosu FORCE RLS).",
    beforeSummary: "price_sources, price_snapshots, source_intelligence_adapters, source_ingestion_runs, source_ingestion_artifacts, source_review_items, regulation_versions ve regulation_alerts tabloları yalnızca uygulama katmanında company_id filtresiyle korunuyordu; pricing, source-intelligence, regulations, market-intelligence ve smartcheck sorguları doğrudan paylaşılan app havuzundan çalışabiliyordu.",
    afterSummary: "0024_pricing_regulations_rls.sql ile 8 fiyat/kaynak/mevzuat tablosu ENABLE+FORCE RLS ve exact CDE 3-policy matrisine alındı (50/72 company_id tablosu FORCE RLS altında); ilgili tüm route/servis yolları withAppTenant/withAppTenantTransaction sınırına taşındı; tenant-business-rls.pgtest.ts 28 tablo için 1/1 PASS ve release-migration testleri 14/14 PASS olarak doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["fiyat-eslestirme", "aykiri-fiyat"],
    moduleDetails: {
      "fiyat-eslestirme": {
        before: "price_sources, price_snapshots ve source_intelligence_* tablolarında veritabanı düzeyinde FORCE RLS yoktu; katalog içe aktarma, snapshot inceleme ve aktarım öncesi fiyat doğrulaması paylaşılan app havuzundan doğrudan çalışıyordu.",
        after: "0024_pricing_regulations_rls ile 8 tablo FORCE RLS altına alındı ve tüm fiyat/kaynak/mevzuat sorguları withAppTenant / withAppTenantTransaction içine taşındı.",
        basis: "Faz 7 T41 S2 — fiyat ve kaynak zekâsı çok-kiracılı veritabanı izolasyonu",
      },
      "aykiri-fiyat": {
        before: "Fiyat belleği ve onaylı snapshot örnek karşılaştırması sorguları tenant GUC bağlamı olmadan paylaşılan app havuzundan çalışıyordu.",
        after: "market-intelligence fiyat belleği ve satır anormallik karşılaştırmasındaki price_snapshots/price_sources sorguları withAppTenant altında çalışır.",
        basis: "Faz 7 T41 S2 — fiyat belleği veritabanı izolasyonu",
      },
    },
  },
  {
    revision: "Rev. 82",
    version: "BIM-CALC-2026-10-25.76",
    date: "25 Ekim 2026",
    commit: "6d3d3058b4feb9f8d56ec727d87109c349d4de3e",
    trigger: "GAP planı T41 S4a dilimi (0025_allplan_learner_rls — 7 Allplan öğrenci tablosu FORCE RLS).",
    beforeSummary: "allplan_lesson_progress, allplan_lesson_activity, allplan_lesson_notes, allplan_lesson_bookmarks, allplan_checkpoint_attempts, allplan_exam_attempts ve allplan_certificate_audit_logs tabloları yalnızca uygulama katmanında company_id filtresiyle korunuyordu; src/server/routes/academy.ts içindeki öğrenci sorguları paylaşılan app havuzundan doğrudan çalışabiliyordu.",
    afterSummary: "0025_allplan_learner_rls.sql ile 7 Allplan öğrenci tablosu ENABLE+FORCE RLS ve exact CDE 3-policy matrisine alındı (57/72 company_id tablosu FORCE RLS altında); academy.ts içindeki kimlik doğrulamalı tüm ilerleme, etkinlik, not, yer imi, checkpoint, sınav, sertifika düzenleme/iptal ve ekip raporu sorguları withAppTenant/withAppTenantTransaction sınırına taşındı; tenant-business-rls.pgtest.ts 35 tablo için 1/1 PASS, artifacts.test.ts 15/15 PASS ve verify.integration.test.ts 14/14 PASS olarak doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["bindirme"],
    moduleDetails: {
      bindirme: {
        before: "Allplan eğitim ilerleme, etkinlik, not, yer imi, checkpoint, sınav ve sertifika denetim tablolarında veritabanı düzeyinde FORCE RLS yoktu; sorgular paylaşılan app havuzundan doğrudan çalışıyordu.",
        after: "0025_allplan_learner_rls ile 7 Allplan öğrenci tablosu FORCE RLS altına alındı ve kimlik doğrulamalı tüm academy.ts sorguları withAppTenant / withAppTenantTransaction içine taşındı.",
        basis: "Faz 7 T41 S4a — Allplan öğrenci verisi çok-kiracılı veritabanı izolasyonu",
      },
    },
  },
  {
    revision: "Rev. 83",
    version: "BIM-CALC-2026-10-25.77",
    date: "25 Ekim 2026",
    commit: "826311701cb3ce93f3119551c5b91037ea24bdae",
    trigger: "GAP planı T41 S4b dilimi (0026_academy_control_rls — 6 Academy control-plane ve sertifika doğrulama tablosu FORCE RLS).",
    beforeSummary: "allplan_certificates, academy_enrollments, academy_learner_profiles, academy_activation_events, academy_enrollment_audit_logs ve academy_payment_events tablolarında FORCE RLS yoktu; halka açık sertifika doğrulaması ve auth/academy okumaları tenant GUC bağlamı olmadan çalışıyordu.",
    afterSummary: "0026_academy_control_rls.sql ile allplan_certificates (app tenant ALL + bimmetraj.certificate_number GUC verify SELECT + backup SELECT + migrator-owner ALL) ve 5 academy_* tablosu (app tenant SELECT + control ALL + backup SELECT + migrator-owner ALL) ENABLE+FORCE RLS altına alındı (63/72 company_id tablosu FORCE RLS altında); academyEntitlement.ts, academy.ts ve auth.ts sorguları withAppTenant, getControlDatabase().db ve sertifika GUC sınırına taşındı; tenant-business-rls.pgtest.ts 41 tablo için 1/1 PASS, artifacts.test.ts 16/16 PASS ve verify.integration.test.ts 14/14 PASS olarak doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["bindirme"],
    moduleDetails: {
      bindirme: {
        before: "allplan_certificates ve 5 academy_* control-plane tablosunda FORCE RLS yoktu; sertifika doğrulama rotası ve kayıt/öğrenci profili okumaları tenant GUC bağlamı kullanmıyordu.",
        after: "0026_academy_control_rls ile 6 Academy/sertifika tablosu FORCE RLS altına alındı; tüm 13 Allplan/Academy company_id tablosu (S4a + S4b) artık veritabanı düzeyinde izoledir.",
        basis: "Faz 7 T41 S4b — Academy control-plane ve halka açık sertifika doğrulama RLS izolasyonu",
      },
    },
  },
  {
    revision: "Rev. 84",
    version: "BIM-CALC-2026-10-25.78",
    date: "25 Ekim 2026",
    commit: "4a301358645a1ba0e01ec391abbc90e721421581",
    trigger: "GAP planı T41 S3 dilimi (0027_smartcheck_pipeline_rls — 4 SmartCheck belge ve worker işlem hattı tablosu FORCE RLS).",
    beforeSummary: "documents, document_processing_runs, document_processing_artifacts ve normalized_quantity_rows tablolarında FORCE RLS yoktu; smartcheck.ts, upload-quota.ts, service.ts, market-intelligence.ts ve admin.ts kuyruk rotaları paylaşılan app havuzundan doğrudan çalışıyor ve GET /api/admin/queue rotası FORCE RLS altındaki companies tablosunu bimmetraj_app ile birleştirdiği için 0 satır dönüyordu.",
    afterSummary: "0027_smartcheck_pipeline_rls.sql ile 4 SmartCheck pipeline tablosu ENABLE+FORCE RLS altına alındı (app tenant ALL + worker ALL + backup SELECT + migrator-owner ALL; documents ve document_processing_runs için ayrıca bimmetraj.super_admin_user_id UUID GUC SELECT; 67/72 company_id tablosu FORCE RLS altında); smartcheck.ts, upload-quota.ts, service.ts, market-intelligence.ts ve admin.ts sorguları withAppTenant, withAppTenantTransaction ve withSuperAdminQueueRead sınırına taşındı; GET /api/admin/queue üzerindeki companies FORCE RLS gizli hatası getControlDatabase().db ile kapatıldı; tenant-business-rls.pgtest.ts 45 tablo için 1/1 PASS, artifacts.test.ts 17/17 PASS ve verify.integration.test.ts 14/14 PASS olarak doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["ifc-metraj", "satir-dogrulama", "epys-on-kontrol", "pdfa"],
    moduleDetails: {
      "ifc-metraj": {
        before: "SmartCheck belge (documents), işlem koşusu (document_processing_runs), artifact (document_processing_artifacts) ve normalize metraj satırı (normalized_quantity_rows) tablolarında FORCE RLS yoktu.",
        after: "0027_smartcheck_pipeline_rls ile 4 SmartCheck işlem hattı tablosu FORCE RLS altına alındı; uygulama tenant GUC bağlamı, worker işlem erişimi ve super-admin salt-okunur kuyruk denetimi veritabanı düzeyinde zorunlu kılındı.",
        basis: "Faz 7 T41 S3 — SmartCheck belge ve worker işlem hattı RLS izolasyonu",
      },
      "satir-dogrulama": {
        before: "normalized_quantity_rows inceleme ve toplu onay rotaları paylaşılan app havuzundan tenant GUC bağlamı olmadan çalışıyordu.",
        after: "normalized_quantity_rows satır okumaları, tekil/toplu inceleme kararları ve tedarikçi teklifine aktarım sorguları withAppTenant / withAppTenantTransaction sınırına taşındı.",
        basis: "Faz 7 T41 S3 — Normalize metraj satırı RLS izolasyonu",
      },
      "epys-on-kontrol": {
        before: "e-PYS preflight artifact ve işlem koşusu okumaları FORCE RLS koruması olmadan çalışıyordu.",
        after: "document_processing_runs ve document_processing_artifacts okumaları tenant GUC ve worker RLS politikalarıyla sınırlandı.",
        basis: "Faz 7 T41 S3 — SmartCheck artifact RLS izolasyonu",
      },
      pdfa: {
        before: "PDF preflight ve veraPDF doğrulama artifact okumaları FORCE RLS koruması olmadan çalışıyordu.",
        after: "PDF/A doğrulama artifact ve durum sorguları FORCE RLS altında withAppTenant ile çalışır.",
        basis: "Faz 7 T41 S3 — PDF/A artifact RLS izolasyonu",
      },
    },
  },
  {
    revision: "Rev. 85",
    version: "BIM-CALC-2026-10-25.79",
    date: "26 Ekim 2026",
    commit: "0fb6d8bde319f281a676f48d5945c653c04ee4f8",
    trigger: "GAP planı T41 S5 dilimi (5 yetki/denetim/kota tablosu Exact-ACL kontratı ve 72/72 company_id tablo envanteri kapanışı).",
    beforeSummary: "pilot_applications ve usage_records tabloları DATABASE_PUBLIC_RESTRICTED_TABLE_ACL içinde yer almadığı için bimmetraj_app ve bimmetraj_worker rolleri bu tablolarda DELETE yetkisine ve bimmetraj_worker rolü pilot_applications tablosunda okuma/yazma yetkisine sahipti; ayrıca GET /api/company/team ve GET /api/invitations rotaları withAppTenant kullanmıyordu.",
    afterSummary: "DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES (memberships, invitations, pilot_applications, admin_audit_logs, usage_records) tanımlandı; pilot_applications ve usage_records DATABASE_PUBLIC_RESTRICTED_TABLE_ACL matrisine eklenerek en-az-yetki ACL daraltması uygulandı; company.ts içindeki ekip ve davet listeleme rotaları withAppTenant içine taşındı; tenant-business-rls.pgtest.ts içinde PostgreSQL information_schema.columns üzerinden 72/72 company_id tablosunun tamamının (67 FORCE RLS + 5 S5 Exact-ACL) kapsandığı ve S5 negatif ACL/drift kontrollerinin geçtiği doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["teklif-satir", "ifc-metraj"],
    moduleDetails: {
      "teklif-satir": {
        before: "Teklif ve IFC kota sayacı tablosu (usage_records) ile pilot başvuru tablosunda (pilot_applications) uygulama ve işçi rolleri gereksiz DELETE yetkisine sahipti.",
        after: "usage_records ve pilot_applications DATABASE_PUBLIC_RESTRICTED_TABLE_ACL matrisine alınarak DELETE yetkisi tüm çalışma zamanı rollerinden, pilot_applications erişimi ise worker rolünden kaldırıldı; 72/72 company_id tablosu tam envanter mutabakatına kavuştu.",
        basis: "Faz 7 T41 S5 — Yetki, denetim ve kota sayacı tabloları en-az-yetki ACL izolasyonu",
      },
      "ifc-metraj": {
        before: "SmartCheck IFC kota sayacı (usage_records) üzerinde worker ve app rollerinin DELETE yetkisi açıktı.",
        after: "usage_records tablosunda worker ve app rolleri yalnızca SELECT/INSERT/UPDATE ile sınırlandı; control rolü SELECT-only olarak kilitlendi.",
        basis: "Faz 7 T41 S5 — IFC kota sayacı tablosu en-az-yetki ACL izolasyonu",
      },
    },
  },
  {
    revision: "Rev. 86",
    version: "BIM-CALC-2026-10-25.80",
    date: "26 Ekim 2026",
    commit: "f88ca928b5a16488a6cda73e2ea49bcfbb4164b0",
    trigger: "GAP planı T44 — Worker, runtime ve 5-sütunlu kurtarma tatbikatı + companies/subscriptions worker capability FORCE RLS ve backup.py --enable-row-security düzeltmesi.",
    beforeSummary: "1) companies ve subscriptions tablolarında FORCE RLS açık olduğundan SECURITY DEFINER worker capability fonksiyonları (bimmetraj_worker_get_company_context ve bimmetraj_worker_get_entitlement) gerçek bimmetraj_worker oturumunda 0 satır dönüyor ve TENANT_COMPANY_MISSING hatası fırlatıyordu. 2) deploy/backup/backup.py içinde pg_dump varsayılan row_security=off ile çalıştığından NOBYPASSRLS bimmetraj_backup rolü 67 RLS tablosunu yedeklerken hata veriyordu. 3) 5 kurtarma sütununu gerçek PG16 rolleriyle tek seferde kanıtlayan kontrat testi yoktu.",
    afterSummary: "1) 0027_smartcheck_pipeline_rls.sql ve src/db/schema.ts içine companies_worker_capability_read ve subscriptions_worker_capability_read (session_user = 'bimmetraj_worker' AND current_user = 'bimmetraj_owner') RLS politikaları ile worker-company-context.ts test fallback'i eklendi. 2) deploy/backup/backup.py içine --enable-row-security bayrağı eklendi (test_backup.py 6/6 PASS). 3) src/contracts/t44-recovery-drill.pgtest.ts (1/1 PASS: dump 136 ms, restore 351 ms, RPO 0 kayıp) ve scripts/postgres-restore-drill.ts (28 migration, 85 tablo, 20 enum PASS) ile 5 kurtarma sütunu doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["ifc-metraj", "satir-dogrulama", "uc-x-uc"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Gerçek bimmetraj_worker oturumunda companies ve subscriptions tablolarındaki FORCE RLS nedeniyle SECURITY DEFINER capability fonksiyonları 0 satır dönüyor; ayrıca bimmetraj_backup rolüyle pg_dump RLS açık tablolarda hata veriyordu.",
        after: "companies_worker_capability_read ve subscriptions_worker_capability_read RLS politikaları ile backup.py --enable-row-security bayrağı eklendi; 5-sütunlu kurtarma tatbikatı (t44-recovery-drill.pgtest.ts 1/1 PASS) doğrulandı.",
        basis: "Faz 7 T44 — Worker capability FORCE RLS uyumu ve yedekleme/kurtarma tatbikatı",
      },
      "satir-dogrulama": {
        before: "Bayatlamış (stale) SmartCheck koşusunun bıraktığı kısmi normalized_quantity_rows satırlarının devralma (reclaim) ve yedekten geri yükleme (pg_restore) sonrası bütünlüğü gerçek worker/backup rolleriyle test edilmemişti.",
        after: "t44-recovery-drill.pgtest.ts ile yarıda kalan koşunun kısmi satırlarının temizlendiği (supersededRunRowCount = 0), yeni koşunun tamamlandığı (recoveredRowCount = 1) ve pg_restore sonrasında birebir korunduğu doğrulandı.",
        basis: "Faz 7 T44 — Worker crash/reclaim ve RPO=0 geri yükleme kanıtı",
      },
      "uc-x-uc": {
        before: "3×3 kural motorunun şirket aktif standardını (active_standard) okuyan bimmetraj_worker_get_company_context fonksiyonu gerçek bimmetraj_worker oturumunda companies FORCE RLS engeline takılıyordu.",
        after: "companies_worker_capability_read RLS politikası ve worker-company-context.ts fallback'i ile bimmetraj_worker oturumunda active_standard ve smartcheck_max_waste_percent bağlamının güvenli okunması sağlandı.",
        basis: "Faz 7 T44 — Worker company-context capability FORCE RLS uyumu",
      },
    },
  },
  {
    revision: "Rev. 87",
    version: "BIM-CALC-2026-10-25.81",
    date: "26 Ekim 2026",
    commit: "e1eb7f9a3eb22f9309b2dc5e74f4c855ef050e87",
    trigger: "GAP planı T43 R+1 kapsam ratchet dilimi (proje %46,80 → %53,04 ≥ %52, HTTP API rotaları %54,26 → %81,31 ≥ %80) + 3-rol PG16 route entegrasyon testlerinde yakalanan 3 canlı üretim hatasının kapatılması.",
    beforeSummary: "HTTP API rotaları satır kapsamı %54,26, proje genel satır kapsamı %46,80 seviyesindeydi. Ayrıca 3-rol PG16 altında: (1) auth.ts POST /api/auth/login ve GET /api/auth/me uçlarında şirketsiz (membership=null) Academy öğrencilerinin academy_learner_profiles FORCE RLS tablosunu okumadan yanlışlıkla accountType='workspace' dönmesi, (2) admin.ts POST /api/admin/plans/sync-catalog içinde getControlDatabase().db.transaction bloğunda admin_audit_logs tablosuna INSERT denemesi (42501 yetki hatası) ve (3) admin.ts GET /api/admin/reports/usage topConsumers sorgusunda FORCE RLS altındaki companies tablosunun bimmetraj_app ile birleştirilmesi nedeniyle 0 satır dönmesi hataları bulunuyordu.",
    afterSummary: "src/server/routes/t43-route-ratchet.integration.test.ts (971 satır), src/academy/catalog-and-templates-integrity.test.ts ve src/db/tenant-context.test.ts + control-plane.test.ts eklenerek 1416 testte 1409 PASS / 0 FAIL / 7 SKIP sağlandı; HTTP API route satır kapsamı %54,26 → %81,31 (+27,05 puan, floor %54 → %80), proje satır kapsamı %46,80 → %53,04 (floor %46 → %52) seviyesine yükseltildi, coverage-thresholds.json kilitlendi ve auth.ts ile admin.ts içindeki 3 canlı üretim hatası kapatıldı. Hesap yöntemleri değişmedi.",
    affectedModules: ["teklif-satir", "karlilik", "kota", "bindirme"],
    moduleDetails: {
      "teklif-satir": {
        before: "quotations.ts (%61,51), clients.ts (%54,48) ve pricing-file-import.ts (%25,08) rotalarının pek çok CRUD, durum geçişi, CSV/XLSX fiyat içe aktarma ve doğrulama dalı 3-rol PG16 kapsam raporunda test edilmemişti.",
        after: "t43-route-ratchet.integration.test.ts ile quotations.ts (%81,59), clients.ts (%88,69) ve pricing-file-import.ts (%89,54) rotalarının 3-rol PG16 entegrasyon kapsamı doğrulandı; HTTP API route tabanı %54 → %80 olarak kilitlendi.",
        basis: "Faz 7 T43 R+1 — Teklif, müşteri ve fiyat içe aktarma rotaları 3-rol PG16 kapsam ratchet'i",
      },
      karlilik: {
        before: "profit.ts (%46,45) kârlılık analizi, marj simülasyonu ve senaryo karşılaştırma rotaları 3-rol PG16 altında kısmen kapsanıyordu.",
        after: "t43-route-ratchet.integration.test.ts ile profit.ts (%90,32) rotalarının 3-rol PG16 altında tam entegrasyon kapsamı doğrulandı.",
        basis: "Faz 7 T43 R+1 — Kârlılık analizi rotaları 3-rol PG16 kapsam ratchet'i",
      },
      kota: {
        before: "admin.ts POST /api/admin/plans/sync-catalog rotası control-plane transaction içinde admin_audit_logs tablosuna INSERT denediği için 42501 hatası veriyor; GET /api/admin/reports/usage topConsumers sorgusu ise companies FORCE RLS nedeniyle 0 satır dönüyordu.",
        after: "admin.ts sync-catalog denetim kaydı yazımı db.insert(adminAuditLogs) olarak control transaction dışına taşındı; reports/usage topConsumers sorgusu getControlDatabase().db.execute ile düzeltildi; billing.ts (%85,63) ve admin.ts (%78,99) 3-rol PG16 altında doğrulandı.",
        basis: "Faz 7 T43 R+1 — Paket kataloğu senkronizasyonu ve kullanım raporu 3-rol ACL/RLS düzeltmesi",
      },
      bindirme: {
        before: "auth.ts POST /api/auth/login ve GET /api/auth/me uçlarında şirketsiz (membership=null) Academy öğrencileri için academy_learner_profiles okunmadığından accountType='workspace' dönüyordu.",
        after: "auth.ts login ve me uçlarında membership=null olduğunda getControlDatabase().db.query.academyLearnerProfiles.findFirst ile öğrenci profili okunarak accountType='academy_student' doğru döndürüldü; academy.ts (%84,65) 3-rol PG16 altında doğrulandı.",
        basis: "Faz 7 T43 R+1 — Şirketsiz Academy öğrencisi oturum ve kimlik doğrulama RLS düzeltmesi",
      },
    },
  },
  {
    revision: "Rev. 88",
    version: "BIM-CALC-2026-10-25.82",
    date: "26 Ekim 2026",
    commit: "fd7cc748857d31e53c63718d3ce8e4c5ba8c593b",
    trigger: "GAP planı T45 — Performans ve işletim bütçesi: önceden kayıtlı p95/RAM/eşzamanlılık bütçeleri (BIM-PERF-2026-10-26.1), ExcelJS chunk izolasyonu ve 5/5 ölçüm kapısı.",
    beforeSummary: "CreateQuote.tsx üst düzeyde quote-excel-import.ts üzerinden parseQuoteXlsx fonksiyonunu içe aktardığı için Rollup, CreateQuote-*.js paketinin bağımlılık haritasına (__vite__mapDeps) 940 kB'lık exceljs paketini ekliyor ve vite.config.ts modulePreload.resolveDependencies yalnızca index.html bağlamında sadece charts paketini filtreliyordu. Ayrıca önceden kayıtlı performans bütçesi modülü ve 1.000 satır XLSX, 20 eşzamanlı tenant PG16, Sentry PII scrub ve AI failover gecikmelerini tek kapıda doğrulayan kontrat testi yoktu.",
    afterSummary: "src/lib/quote-xlsx.ts ile dinamik exceljs okuyucusu quote-excel-import.ts'ten ayrıldı; CreateQuote.tsx yalnız .xlsx/.xls seçildiğinde await import('@/lib/quote-xlsx') çağırır; vite.config.ts manualChunks içine exceljs kuralı ve modulePreload.resolveDependencies içine charts/exceljs/ifc-viewer genel filtresi eklendi (CreateQuote-*.js 49,67 kB, index-*.js 106,47 kB ≤ 120 kB). src/server/config/performance-budgets.ts (BIM-PERF-2026-10-26.1) ve src/contracts/t45-performance-budget.test.ts (5/5 PASS: 1.000 satır XLSX + 256 MB izole worker 1.489,98 ms ≤ 2.500 ms + SPREADSHEET_BUSY geri kazanımı, 20 eşzamanlı tenant PG16 p95 = 21,90 ms ≤ 250 ms, kuyruk claim 3,78 ms ≤ 150 ms, Sentry PII scrub p95 < 1 ms ≤ 5 ms, AI failover < 5 ms ≤ 50 ms) devreye alındı. Hesap yöntemleri değişmedi.",
    affectedModules: ["teklif-satir", "satir-dogrulama", "kota"],
    moduleDetails: {
      "teklif-satir": {
        before: "CreateQuote.tsx üst düzeyde parseQuoteXlsx içe aktardığı için CreateQuote-*.js paketi 940 kB exceljs bağımlılığı taşıyordu; 1.000 satırlık metraj XLSX ayrıştırma bütçesi kayıtlı değildi.",
        after: "src/lib/quote-xlsx.ts ayrıştırması ve dinamik import ile CreateQuote-*.js (49,67 kB / 13,82 kB gzip) exceljs bağımlılığından tamamen arındırıldı; 1.000 satırlık inşaat metraj XLSX ayrıştırması t45-performance-budget.test.ts ile doğrulandı.",
        basis: "Faz 7 T45 — Teklif editörü ExcelJS chunk izolasyonu ve 1.000 satır XLSX bütçe kapısı",
      },
      "satir-dogrulama": {
        before: "spreadsheet-runner.ts (--max-old-space-size=256) için 1.000 satırlık XLSX ayrıştırma p95 bütçesi ve 3. eşzamanlı işte SPREADSHEET_BUSY reddi sonrası temiz geri kazanım otomatik bütçe testine bağlı değildi.",
        after: "PERFORMANCE_BUDGETS (BIM-PERF-2026-10-26.1) ve t45-performance-budget.test.ts ile 1.000 satır XLSX + izole worker ayrıştırması (1.489,98 ms ≤ 2.500 ms), > 25 MiB FILE_SIZE_INVALID reddi ve SPREADSHEET_BUSY geri kazanımı doğrulandı.",
        basis: "Faz 7 T45 — İzole spreadsheet worker RAM/eşzamanlılık ve p95 bütçe kapısı",
      },
      kota: {
        before: "compose.coolify.yaml konteyner bellek/CPU sınırları, 20 eşzamanlı tenant PG16 sorgu gecikmesi, Sentry PII maskeleme ve AIProviderRouter failover süreleri tek bir önceden kayıtlı bütçe sözleşmesinde toplanmamıştı.",
        after: "src/server/config/performance-budgets.ts ile tüm konteyner ve çalışma zamanı bütçeleri koda kaydedildi; 20 eşzamanlı tenant PG16 (p95 = 21,90 ms ≤ 250 ms), kuyruk claim (3,78 ms ≤ 150 ms), PII scrub (p95 < 1 ms ≤ 5 ms) ve AI failover (< 5 ms ≤ 50 ms) t45-performance-budget.test.ts (5/5 PASS) ile doğrulandı.",
        basis: "Faz 7 T45 — Konteyner kaynak tavanları ve çalışma zamanı p95 işletim bütçesi",
      },
    },
  },
  {
    revision: "Rev. 89",
    version: "BIM-CALC-2026-10-25.83",
    date: "26 Ekim 2026",
    commit: "4e9d95fdb3e9713e56c19cdc1536d454084c7991",
    trigger: "GAP planı Faz 10 T53 & T54 — Kaynaklı pazar envanteri, 6-halkalı karşılaştırılabilir yetenek matrisi ve Faz 0 kanıt kaydı senkronizasyonu.",
    beforeSummary: "21 Ekim 2026 tarihli eski rakip tablosunda RIB CostX yalnız masaüstü yazılmış (CostX Cloud atlanmış), OSKABULUT web ürünü masaüstü e-Hakediş'ten ayrı değerlendirilmemiş ve rakiplerin açık belgelerinde görülmeyen özellikler 'yok' olarak işaretlenmişti. Ayrıca docs/audits/phase-0/capability-claim-register.json içinde uniqueClaimProtocol.status 'not_researched' ve registryVersion 'BIM-CAP-2026-10-17.11' olarak kalmış, open-source-fixture-register.json içindeki worker script SHA-256 özetleri güncellenmemişti.",
    afterSummary: "docs/audits/phase-10/market-inventory-register.json ve PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md ile 12 ürün (OSKA e-Hakediş Pro masaüstü, OSKABULUT web, AMP Kurumsal/Bulut, İhale Pro, BEXEL Manager + CDE, RIB CostX & CostX Cloud, Autodesk Takeoff & ACC, Kreo, Glodon Cubicost, ALLPLAN 2026 + Bimplus + Solibri, ifc-ruhsat MIT ve BIMMetraj) dağıtım modeli, lisans/tier, kaynak URL ve 6 halkalı yetenek matrisiyle (unverified_publicly / pilot_l2_unapproved ayrımı ve singleClaimPermitted=false kapısıyla) kaydedildi; src/contracts/t53-t54-market-inventory.test.ts (4/4 PASS) eklendi ve scripts/phase-0-evidence-validator.test.ts (23/23 PASS) doğrulandı. Hesap yöntemleri değişmedi.",
    affectedModules: ["hakedis-donem", "epys-on-kontrol", "iso19650"],
    moduleDetails: {
      "hakedis-donem": {
        before: "OSKA (masaüstü vs. OSKABULUT bulut), AMP (Kurumsal vs. Bulut) ve uluslararası 5D BIM araçlarının çok dönemli hakediş/Yeşil Defter yetenekleri tek bir makine-doğrulamalı T53/T54 envanterinde kayıtlı değildi.",
        after: "market-inventory-register.json ve t53-t54-market-inventory.test.ts ile OSKA/AMP'nin doğrulanmış saha standardı ile BIMMetraj'ın Pilot/L2 (default-off, OSKA/AMP compatible=false) durumu aynı kanıt eşiğinde karşılaştırıldı.",
        basis: "Faz 10 T53 & T54 — Kaynaklı pazar envanteri ve hakediş karşılaştırma sınırı",
      },
      "epys-on-kontrol": {
        before: "Ticari rakiplerin kamuya açık belgelerinde RG 33331 (05.08.2026) EK-9 ön kontrolünün görülmemesi eski raporda doğrudan 'yok' olarak yazılmıştı.",
        after: "T03 protokolü uyarınca ticari rakiplerde açık belge kanıtı bulunmayan RG 33331 EK-9 ve PDF/A hücreleri 'unverified_publicly' (doğrulanamadı) olarak sınıflandırıldı; açık kaynak ifc-ruhsat (MIT) ve ALLPLAN 2026 IDS kiti rolleri ayrıştırıldı.",
        basis: "Faz 10 T53 & T54 — Kanıt yokluğu ≠ yokluk kanıtı ilkesi",
      },
      iso19650: {
        before: "capability-claim-register.json içinde multi-user-cde-approval-workflow modül yolu ve registryVersion güncel CAPABILITY_REGISTRY (BIM-CAP-2026-10-23.12) ile senkronize değildi.",
        after: "capability-claim-register.json ve open-source-fixture-register.json güncellenerek phase-0-evidence-validator.test.ts (23/23 PASS) ve t53-t54-market-inventory.test.ts (4/4 PASS) ile doğrulandı.",
        basis: "Faz 0 T03 & Faz 10 T54 — Tek kaynaklı yetenek ve iddia kaydı tutarlılığı",
      },
    },
  },
  {
    revision: "Rev. 90",
    version: "BIM-CALC-2026-10-25.84",
    date: "26 Ekim 2026",
    commit: "4502ced68ef1fc0de3441dc25a0ba27f758b5f86",
    trigger: "GAP planı Faz 7 T43 R+2..R+4 JSDOM UI/bileşen kapsam dilimi (proje %53,04 → %82,58 ≥ %80 kapanışı), Dashboard.tsx React Rules-of-Hooks düzeltmesi (D11) ve Faz 11 T56 nihai izlenebilirlik matrisi.",
    beforeSummary: "UI katmanı (164 dosya, ~41.000 satır) c8 birim/entegrasyon koşusunda %12,30 satır kapsamında kaldığı için proje genel satır kapsamı %53,04 seviyesindeydi ve T43 %80 kabul eşiği açıktı. Ayrıca src/pages/Dashboard.tsx içinde user?.isSuperAdmin erken dönüşü useEffect kancasından önce çalıştığı için /api/auth/me yanıtı döndüğünde React Rules-of-Hooks ('Rendered fewer hooks than expected') hatası fırlatıyordu; Faz 11 T56 kapsamında 56 To-Do, 31 denetim bulgusu, 6 hesap motoru ve oturum kusurlarını tek makine-okunur matriste doğrulayan kontrat testi yoktu.",
    afterSummary: "src/pages/t43-ui-pages-and-components.test.ts (6 dilim, 6/6 PASS) ile 90+ sayfa ve mühendislik bileşeni (PriceEscalationCalculatorPage, KatKarsiligiCalculatorPage, KikAdtCalculatorPage, YambisCalculatorPage, CalmIfcWorkspace, SmartCheckImportWorkspace, BimIfcParser, PreBimFeasibilityPanel, CalculationMethods, ExpertReview dahil) JSDOM altında render edilip form/sekme etkileşimleriyle doğrulandı; 1434 testte 1427 PASS / 0 FAIL / 7 SKIP elde edildi; UI satır kapsamı %12,30 → %74,77 (floor %74), proje satır kapsamı %53,04 → %82,58 (floor %82) seviyesine yükseltilerek T43 [x] kapatıldı. Dashboard.tsx içindeki erken dönüş useEffect sonrasına taşındı (D11). docs/audits/phase-11/final-evidence-matrix.json, PHASE_11_T56_FINAL_EVIDENCE_MATRIX_2026-10-26.md ve src/contracts/t56-final-evidence-matrix.test.ts (3/3 PASS) ile T56 izlenebilirlik matrisi kuruldu. Hesap yöntemleri değişmedi.",
    affectedModules: ["eskalasyon", "kik-adt", "on-teklif-fizibilite", "ifc-metraj"],
    moduleDetails: {
      eskalasyon: {
        before: "PriceEscalationCalculatorPage.tsx arayüz bileşeni c8 birim/entegrasyon kapsam koşusunda JSDOM altında doğrudan render edilip form girdileriyle çalıştırılmamıştı.",
        after: "t43-ui-pages-and-components.test.ts (Dilim 3) ile PriceEscalationCalculatorPage JSDOM altında render edildi ve tüm form girdi/seçim olayları doğrulandı.",
        basis: "Faz 7 T43 R+2..R+4 — 4735 fiyat farkı hesaplayıcı arayüzü JSDOM kapsam doğrulaması",
      },
      "kik-adt": {
        before: "KikAdtCalculatorPage.tsx ve YambisCalculatorPage.tsx arayüz bileşenleri c8 kapsam koşusunda JSDOM altında doğrudan render edilip form girdileriyle çalıştırılmamıştı.",
        after: "t43-ui-pages-and-components.test.ts (Dilim 3) ile KikAdtCalculatorPage ve YambisCalculatorPage JSDOM altında render edilip form etkileşimleriyle doğrulandı.",
        basis: "Faz 7 T43 R+2..R+4 — KİK ADT ve YAMBİS hesaplayıcı arayüzleri JSDOM kapsam doğrulaması",
      },
      "on-teklif-fizibilite": {
        before: "KatKarsiligiCalculatorPage.tsx ve PreBimFeasibilityPanel.tsx bileşenleri c8 kapsam koşusunda JSDOM altında doğrudan render edilmemişti.",
        after: "t43-ui-pages-and-components.test.ts (Dilim 3 & 4) ile KatKarsiligiCalculatorPage (%87 satır) ve PreBimFeasibilityPanel (%73,4 satır) JSDOM altında render edilip form etkileşimleriyle doğrulandı.",
        basis: "Faz 7 T43 R+2..R+4 — Kat karşılığı ve Pre-BIM imar fizibilitesi arayüzleri JSDOM kapsam doğrulaması",
      },
      "ifc-metraj": {
        before: "CalmIfcWorkspace, SmartCheckImportWorkspace, BimIfcParser, MetrajCetveliSheet, CalculationTraceSection ve ExpertLineVerification bileşenleri c8 kapsam koşusunda JSDOM altında doğrudan render edilmemişti.",
        after: "t43-ui-pages-and-components.test.ts (Dilim 4) ile tüm IFC/SmartCheck inceleme bileşenleri JSDOM altında sentetik 100+ elemanlı veri setiyle render edilip sekme ve filtre etkileşimleriyle doğrulandı.",
        basis: "Faz 7 T43 R+2..R+4 — IFC/SmartCheck mühendislik arayüzleri JSDOM kapsam doğrulaması",
      },
    },
  },
  {
    revision: "Rev. 91",
    version: "BIM-CALC-2026-10-26.85",
    date: "26 Ekim 2026",
    commit: "b6a45b3054bc971e52ad15b133657bf8ed3d9f0a",
    trigger: "Uzman önizlemesi: davetli uzmanların hesap sonuçlarını uygulama içinden değerlendirmesi (T50/T51 kanıt toplama).",
    beforeSummary: "Uzmanların bir hesap sonucunu doğrulayıp geri bildirim göndereceği bir kanal yoktu; YAMBİS ve kat karşılığı/KDV hesaplayıcıları yalnız yol haritasında (L1) duruyordu.",
    afterSummary: "POST /api/expert-feedback (oturum açmış, e-postası doğrulanmış kullanıcı, saatte 10 sınır, girdiler yalnız açık izinle) ve KİK ADT ile 4735 hesaplayıcılarında 'Bu sonuç sizin hesabınızla tutuyor mu?' kartı eklendi. YAMBİS ve kat karşılığı yalnız /app/uzman-onizleme içinde, doğrulanmamış önizleme notuyla açıldı; herkese açık rota, sitemap ve llms.txt dışında kaldı. Hesap yöntemleri değişmedi.",
    affectedModules: ["kik-adt", "eskalasyon", "on-teklif-fizibilite"],
  },
  {
    revision: "Rev. 92",
    version: "BIM-CALC-2026-10-26.86",
    date: "26 Ekim 2026",
    commit: "34338ff6cff5b6db6ca4cbcc02286e9c7f36e170",
    trigger: "Faz 0 güven düzeltmeleri (marka.md M-13.x, M-14.x, M-7.6, M-18.x) ve release 0028.",
    beforeSummary: "IFC maliyet sekmesi fiyatı olmayan kalemi 0 TL sayıp genel toplamı eksik fiyatla gösteriyordu; sonuç ekranında doğrulanmamış 'doğrulandı' ifadeleri vardı; aynı teklif sürümünün PDF'i her indirmede aylık kotadan düşüyordu.",
    afterSummary: "summarizeCost (src/ifc/pricing/cost-summary.ts) fiyatı eksik kalemi toplam dışında tutar ve 'N kalem fiyat bekliyor' durumunu raporlar; genel toplam yalnız tüm kalemler fiyatlandığında gösterilir. Sonuç özeti her kontrolün kendi durumunu (tamam/dikkat/bekliyor) bildirir. Release 0028 ile aynı teklif sürümünün PDF'i ayda bir kez sayılır.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Fiyatı eksik kalem 0 TL ile toplama giriyor, maliyet sekmesi 'Genel toplam 0,00' gösterebiliyordu.",
        after: "Eksik fiyat toplam dışında kalır ve 'fiyat bekliyor' olarak sayılır; genel toplam 'Hesaplanmadı' yazar (cost-summary.test.ts).",
        basis: "marka.md M-14.1 — eksik fiyatı sıfır gibi göstermeme",
      },
    },
  },
  {
    revision: "Rev. 93",
    version: "BIM-CALC-2026-10-26.87",
    date: "26 Ekim 2026",
    commit: "b5b2badae99a6ca52544f3fe25f3e8ee634907c3",
    trigger: "Faz 1 — Excel önce şablonlar, .xls yönlendirmesi, tek giriş akışı ve IFC icmalinden yeni teklif / revizyon ayrımı.",
    beforeSummary: "Şablonlar yalnız CSV'ydi, eski .xls dosyası anlaşılmaz hata veriyordu; IFC icmali yalnız mevcut bir teklife revizyon olarak aktarılabiliyordu.",
    afterSummary: "Teklif, fiyat kataloğu ve parsel için .xlsx şablonları; .xls için 'Farklı Kaydet → .xlsx' talimatı; 'Nereden başlayacaksınız?' girişi. transferCalmRowsToNewQuotation tek işlemde boş Rev. 1 açıp icmali Rev. 2'ye aktarır; kaynak satır, fiyat kaydı ve idempotency güvenceleri revizyon yoluyla aynıdır, bir teklif kotası düşer. Hesap yöntemleri değişmedi.",
    affectedModules: ["teklif-satir", "ifc-metraj"],
  },
  {
    revision: "Rev. 94",
    version: "BIM-CALC-2026-10-27.88",
    date: "27 Ekim 2026",
    commit: "1d0f99bd9bc7a52314172cd79b24512c226fa459",
    trigger: "Faz 1 fiyat eksikliği dilimi (M-17.3, M-17.4) ve icmaldeki müteahhitlik kârı ve genel giderin teklife yansıması (Hazar kararı, release 0029).",
    beforeSummary: "İçe aktarılan firma fiyatları 'advisory' kalıyor ve KDV durumu 'bilinmiyor' geldiği için icmali hiç fiyatlandıramıyordu. İcmal özeti %15 kâr ve genel gideri gösterirken aktarılan teklif yalnız kalem fiyatlarını içeriyordu; kullanıcı iki farklı toplam görüyor, kârlılık paneli katalog fiyatlı teklifte %0 marj gösteriyordu.",
    afterSummary: "Fiyat kataloğu sihirbazı firma fiyatını KDV hariç ve oran belirtilmiş olarak içe aktarımda onaylar. Teklife overhead_profit_percent / overhead_profit_total eklendi (0029): pay her satırın netine uygulanır, KDV 'net + pay' üzerinden satırın kendi oranıyla hesaplanır, kalem birim fiyatları fiyat kaydına eşit kalır (fiyat kilidi bozulmaz). Kârlılık payı gelir sayar. ÇŞB fiyat modu %0 ile başlar, çift sayım uyarısı verir. Örnek: 74.200,00 TL net, %15 → 11.130,00 TL pay, KDV 17.066,00 TL, genel toplam 102.396,00 TL; marj %13,04.",
    affectedModules: ["teklif-satir", "maliyet-marj", "ifc-metraj"],
    moduleDetails: {
      "teklif-satir": {
        before: "Genel toplam = Σ(net + KDV); kâr ve genel gider teklife taşınmıyordu.",
        after: "pay = yuvarla(net × kâr%/100); KDV = yuvarla((net + pay) × KDV%/100); genel toplam = Σ(net + pay + KDV). Kâr% = 0 iken sonuç birebir eskisiyle aynıdır (calculations.test.ts, calm-transfer.integration.test.ts, quote-flows.integration.test.ts).",
        basis: "Hazar kararı 27 Ekim 2026; ÇŞB birim fiyat analizlerinde %25 yüklenici kârı ve genel gider dahil (çift sayım önlemi)",
      },
      "maliyet-marj": {
        before: "Satış neti yalnız satır netlerinden oluşuyordu; teklif düzeyindeki pay kârlılığa girmiyordu.",
        after: "Satış neti = Σ satır net + Σ pay; katalog maliyetiyle fiyatlanan teklifte brüt kâr payın kendisidir.",
        basis: "Teklif toplamlarıyla aynı gelir tanımı",
      },
      "ifc-metraj": {
        before: "Firma kataloğundaki fiyat icmal kalemine bağlanamıyordu (advisory, KDV bilinmiyor).",
        after: "Aynı poz, aynı birim ve TL'de onaylı fiyat otomatik; açıklaması farklı olan kullanıcı onayıyla bağlanır; poz çözülemeyen kalem uzman incelemesine alınır.",
        basis: "marka.md M-17.3 / M-17.4",
      },
    },
  },
  {
    revision: "Rev. 95",
    version: "BIM-CALC-2026-10-27.89",
    date: "27 Ekim 2026",
    commit: "bda207bc879774bec98e2f4101df3bea6dd70569",
    trigger: "Faz 1 C-4 Excel'e dışa aktarım ve M-15.2 sabit fiyatlı demo rotasının kaldırılması.",
    beforeSummary: "Teklif yalnız PDF olarak alınabiliyordu; icmalin 'Excel İndir' düğmesi teknik sütunlu CSV veriyor ve satır tutarlarını tam liraya yuvarlıyordu (Math.round). /app/dosyadan-teklif-demo sabit beton 2.450, donatı 24.500, kalıp 1.250 TL fiyatları taşıyordu.",
    afterSummary: "Teklif .xlsx'i PDF ile aynı motordan toplamları taşır (formülsüz). İcmal .xlsx'i sade icmal + daire icmali + ayrı 'Fiyat Kaynakları' sayfasıdır; eksik fiyat boş kalır ve toplamın eksik olduğu yazılır. Satır tutarı kuruşa yuvarlanır. Demo rotası SmartCheck'e yönlenir.",
    affectedModules: ["teklif-satir", "ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "İcmal CSV'sinde satır tutarı = Math.round(net miktar × birim fiyat), satır başına 0,50 TL'ye kadar sapma.",
        after: "Satır tutarı = yuvarla(net miktar × birim fiyat) kuruşa; teklif satırıyla aynı (export-xlsx.test.ts).",
        basis: "VUK kuruş hassasiyeti; teklif ile icmal arasında tutarlılık",
      },
    },
  },
  {
    revision: "Rev. 96",
    version: "BIM-CALC-2026-10-27.90",
    date: "27 Ekim 2026",
    commit: "78bf6611987af8c3f1176776452053f623e0f9a6",
    trigger: "marka.md M-14.5 ve M-12.4: proje türüne bağlı kamu ihalesi araçları ve yeni teklifte gelişmiş görünüm.",
    beforeSummary: "KİK aşırı düşük teklif ve 4735 fiyat farkı kartları her işte maliyet adımında açıktı; risk ve bilgi teslimi varsayımları ilk teklifte temel alanlarla birlikte duruyordu.",
    afterSummary: "KİK ve 4735 kartları yalnız 'Bu iş kamu ihalesi' işaretlenince görünür; risk ve bilgi teslimi varsayımları kapalı 'Gelişmiş' bölümünde, etkili değerlerin özetiyle durur. Hesap yöntemleri ve sonuçlar değişmedi.",
    affectedModules: ["kik-adt", "eskalasyon"],
  },
  {
    revision: "Rev. 97",
    version: "BIM-CALC-2026-10-27.91",
    date: "27 Ekim 2026",
    commit: "03d41a1d6cd1c815778ae48d346914c81c00ed35",
    trigger: "marka.md M-12.5: yeni teklif tablosunda temel görünüm ve satır ayrıntısı; CreateQuote.tsx bölünmesi.",
    beforeSummary: "Teklif tablosu maliyet, zayiat, iskonto ve KDV dahil 11 sütunu birlikte gösteriyordu.",
    afterSummary: "Temel görünüm beş sütun gösterir; diğer alanlar satır ayrıntısında, ayrıntılı görünümde tümü birlikte. Satır tutarı, teklif toplamları ve marj hesabı aynı fonksiyonlardan gelir; hesap yöntemleri ve sonuçlar değişmedi.",
    affectedModules: ["teklif-satir", "maliyet-marj"],
  },
  {
    revision: "Rev. 98",
    version: "BIM-CALC-2026-10-27.92",
    date: "27 Ekim 2026",
    commit: "5ddcf272a12be2f68bd889769dd6ae7764bad161",
    trigger: "marka.md M-13.3 ve M-13.4: arsa ön fizibilitesi ayrı ekranda; boş formda doğrulama hatası gösterilmez.",
    beforeSummary: "Fizibilite paneli SmartCheck yükleme ekranındaydı ve boş form açılışta doğrulama hataları gösteriyordu; plan değerlendirmesi ham durum koduyla görünüyordu.",
    afterSummary: "Panel /app/arsa-fizibilitesi ekranında; kontroller değer girilince başlar; plan durumu Türkçe etiketlidir. computeFeasibility girdileri, kuralları ve sonuçları değişmedi.",
    affectedModules: ["on-teklif-fizibilite"],
  },
  {
    revision: "Rev. 99",
    version: "BIM-CALC-2026-10-27.93",
    date: "27 Ekim 2026",
    commit: "4c0c6631de93fa279dc9645a61c40e6fa4017124",
    trigger: "marka.md M-10.2/10.3/10.4/10.6: kamuya açık SmartCheck demosunun anlatım sırası, birim örneği ve geri dönüş yolu.",
    beforeSummary: "Demo yeniden kontrol eylemiyle açılıyor, m²→m³ bulgusunu yalnız birim etiketiyle kapatıyor ve oturumsuz ziyaretçiyi uygulama içine yönlendiriyordu.",
    afterSummary: "Demo problemle açılır; bulgu problem, kaynak satırı, bulgu, öneri ve teklife etkisi sırasıyla anlatılır; birim örneği miktarı net hacimden düzeltir. Demo verisi sentetiktir ve hiçbir hesap motoru değişmedi.",
    affectedModules: [],
  },
  {
    revision: "Rev. 100",
    version: "BIM-CALC-2026-10-27.94",
    date: "27 Ekim 2026",
    commit: "fb69c077f1f9d94fa66f31b2e494720e1e6b9b2b",
    trigger: "marka.md M-12.6: elle teklif satırlarının firma fiyat kataloğundan fiyat alması ve fiyat kaydına bağlanması.",
    beforeSummary: "Elle teklif satırı yalnız elle girilmiş fiyat veya platform rayiç havuzu bağlantısı taşıyabiliyordu; firma kataloğu fiyatı yalnız IFC icmal aktarımında satıra bağlanıyordu.",
    afterSummary: "Elle teklif satırı onaylı firma fiyat kaydına bağlanabilir. Sunucu IFC aktarımıyla aynı uygunluk ve eşleşme kurallarını (onay, geçerlilik, ticari teklif yetkisi, para birimi, birim, KDV hariç tutar, KDV oranı, poz kodu veya açıklama) uygular ve fiyat kanıtı yazar; satır tutarı aynı calculateLineItemTotal ile hesaplanır.",
    affectedModules: ["teklif-satir", "fiyat-eslestirme"],
  },
  {
    revision: "Rev. 101",
    version: "BIM-CALC-2026-10-27.95",
    date: "27 Ekim 2026",
    commit: "389446b66d83a52807575a903fff4cf7fb1ea1f7",
    trigger: "Canlı üretim dağıtımı (0022..0029), worker başlangıcında CONTROL_DATABASE_URL izolasyonu (D12) ve canlı ifc-worker consumeIfcUsage kota tamamlama düzeltmesi (D13).",
    beforeSummary: "1) Worker ve ifc-worker başlangıçta assertProductionEnvironment(process.env) çağırdığı için yalnız app servisinde bulunan CONTROL_DATABASE_URL yokluğunda çöküyordu (D12). 2) ifc-worker IFC analizini bitirip consumeIfcUsage → lockedIfcUsage çağırdığında, yalnız company_exists değerine ihtiyaç duymasına rağmen public.bimmetraj_worker_get_entitlement(uuid) fonksiyonunu çağırıyor ve subscriptions.current_period_end (timestamp without time zone) ile fonksiyon dönüş tipi (timestamptz) arasındaki PL/pgSQL 42804 tip uyuşmazlığı nedeniyle 'Quotation quota is temporarily unavailable' hatası veriyordu (D13).",
    afterSummary: "1) assertProductionEnvironment(env, { requireControlDatabase: false }) seçeneği eklendi ve worker/ifc-worker başlangıcına bağlandı (D12). 2) src/services/billing/quota.ts içindeki lockedIfcUsage worker dalı, dar kapsamlı public.bimmetraj_worker_get_company_context(uuid) fonksiyonundan company_exists okuyacak şekilde güncellendi ve src/contracts/t44-recovery-drill.pgtest.ts içine gerçek PG16 bimmetraj_worker + NODE_ENV=production altında consumeIfcUsage doğrulaması eklendi (D13). Canlıda yüklenen 3 IFC modeli (ssss.ifc, Ifc4_SampleHouse_0_GroundFloor.ifc, Ifc4_SampleHouse_1_Roof.ifc) uçtan uca succeeded (awaiting_review) durumuna geçirildi. Hesap yöntemleri değişmedi.",
    affectedModules: ["kota", "ifc-metraj"],
    moduleDetails: {
      kota: {
        before: "consumeIfcUsage → lockedIfcUsage(tx, companyId, at, 'worker') NODE_ENV='production' altında public.bimmetraj_worker_get_entitlement(uuid) fonksiyonunu çağırıyor ve PL/pgSQL 42804 timestamptz dönüş tipi uyuşmazlığı nedeniyle catch bloğunda 'Quotation quota is temporarily unavailable' fırlatıyordu.",
        after: "lockedIfcUsage worker dalı dar kapsamlı public.bimmetraj_worker_get_company_context(uuid) fonksiyonundan company_exists okuyacak şekilde güncellendi ve t44-recovery-drill.pgtest.ts içinde gerçek PG16 bimmetraj_worker + NODE_ENV='production' altında consumeIfcUsage doğrulandı.",
        basis: "Faz 7 T41 / T42 / T44 — Worker IFC kota tüketimi en-az yetki fonksiyon uyumu (D13)",
      },
      "ifc-metraj": {
        before: "Canlı ifc-worker Python IfcOpenShell çıkarımını ve ifc_evidence kaydını tamamladıktan sonra işlem sonundaki consumeIfcUsage adımında kota hatasıyla geri sarıyordu.",
        after: "Canlı üretimde ssss.ifc (402 kanıt satırı), Ifc4_SampleHouse_0_GroundFloor.ifc (9 satır) ve Ifc4_SampleHouse_1_Roof.ifc (1 satır) uçtan uca succeeded (awaiting_review) durumuna geçirildi.",
        basis: "Faz 7 T42 / T44 — Canlı ifc-worker uçtan uca işlem tamamlama doğrulaması",
      },
    },
  },
  {
    revision: "Rev. 102",
    version: "BIM-CALC-2026-10-27.96",
    date: "27 Ekim 2026",
    commit: "HEAD",
    trigger: "4 Katmanlı Akıllı Müteahhit Excel Adaptörü (Antetli Düz İcmal, Katlara Göre Pivot Matris, TOKİ Tekrarlayan Poz Blokları, Hibrit Sayfa ve Otomatik Korpus Tarayıcı)",
    beforeSummary: "Excel okuyucular (spreadsheet-parser.ts ve quote-excel-import.ts) yalnız 1. satırı başlık olan düz tabloları bekliyor, birleşik hücrelerde ExcelJS MergeValue.toString null hatasıyla çöküyor, 46.588 birleşik hücreli V6 dosyasında 90 saniyede zaman aşımına uğruyor, 5.001 satır sınırı nedeniyle 13.626 satırlık metraj cetvellerini reddediyor ve tekrarlayan POZ NO / İMALATIN ADI / BİRİMİ / Genel Toplam bloklarını okuyamıyordu.",
    afterSummary: "ignoreNodes:['mergeCells'] ve sütun yayılımı ile 46.588 birleşik hücreli V6 yükleme süresi 90 saniyeden 468 ms'ye indirildi; detectSheetStructure ve extractRepeatingBlockRows ile 4 müteahhit Excel arketipi (flat_table, multi_header_pivot, repeating_block_boq, hybrid_summary_and_blocks) hem SmartCheck hem Teklif içe aktarmada desteklendi; SmartCheck önizleme ekranına arketip rozeti, tablo modu seçicisi, tıklamayla başlık seçimi ve Firma Şablonu kaydetme eklendi; yeni müteahhit dosyaları için npm run excel:corpus ve contractor-excel-corpus.test.ts (5/5 PASS) devreye alındı.",
    affectedModules: ["satir-dogrulama", "teklif-satir"],
    moduleDetails: {
      "satir-dogrulama": {
        before: "SmartCheck spreadsheet-parser.ts varsayılan olarak 1. satırı başlık kabul ediyor, birleşik hücrelerde cell.text null hatası veriyor ve tekrarlayan TOKİ poz bloklarını desteklemiyordu.",
        after: "detectSheetStructure ile 4 müteahhit arketipi otomatik algılanır, yatay birleşik hücre kaymaları ve veri odaklı birim sütunu çözülür, tekrarlayan POZ NO bloklarından Genel Toplam miktarları kaynak hücre aralığıyla çıkarılır.",
        basis: "Faz 1 / Faz 3 / Faz 7 T45 — Gerçek ALLPLAN/TOKİ müteahhit Excel korpusu (4 dosya + sentetik 4 arketip matrisi)",
      },
      "teklif-satir": {
        before: "quote-excel-import.ts ve quote-xlsx.ts yalnız ilk 25 satırdaki düz başlıkları arıyor, açıklama boşken Malzeme Pozu yedeklemesi yapmıyor ve tekrarlayan poz bloklu metraj cetvellerinden kalem çıkaramıyordu.",
        after: "parseQuoteRows ve parseQuoteXlsx çok satırlı kat pivot başlıklarını, Malzeme Pozu açıklama yedeklemesini, çoklu birim devam satırlarını ve tekrarlayan POZ NO bloklarının Genel Toplamlarını sıfır hatayla teklif kalemine dönüştürür; satır tutarı aritmetiği değişmedi.",
        basis: "src/lib/quote-excel-import.ts, src/lib/quote-xlsx.ts ve src/smartcheck/import/contractor-excel-corpus.test.ts",
      },
    },
  },
  {
    revision: "Rev. 103",
    version: "BIM-CALC-2026-10-27.97",
    date: "27 Ekim 2026",
    commit: "048495f",
    trigger: "/admin/pricing-sources Otomatik Katalog Tohumlama, Yetki Kanıtı Zinciri, Canlı Crawler & TÜİK Veri Portalı SDMX 2.1 Entegrasyonu",
    beforeSummary:
      "/admin/pricing-sources sayfası boş veritabanında standart kaynakları otomatik tohumlamıyor, getOfficialCatalogCoverageReport alan uyuşmazlığı nedeniyle Sekme 2 ve Sekme 5'te hata veriyor, doğrulanmış/mühürlenmiş kaynaklarda authorizationStatus='authorized' ve authorizationEvidenceHash eksik kaldığı için /api/pricing/benchmarks sorgusu boş dönüyor, safe-fetch.ts 2001::/16 küresel IPv6 ve sıkıştırılmış/yönlendirmeli yanıtları reddediyor ve TÜİK SDMX 2.1 veri portalı için yapılandırılmış bir adaptör bulunmuyordu.",
    afterSummary:
      "GET /api/admin/pricing-sources boş tabloda 5 standart kaynağı otomatik tohumlar ve POST /api/admin/pricing-sources/sync-catalog eksik kaynakları tamamlar; Sekme 2 ve Sekme 5 alan şeması eşitlendi; kaynak doğrulama, resmi katalog mühürleme ve canlı tarama adımları authorizationStatus='authorized' ve 64-hex SHA-256 kanıtı üretir; safe-fetch.ts küresel IPv6 (2001:db8::/32 ve Teredo hariç), doğrulanmış 3 adımlı yönlendirme ve gzip/deflate/br açmayı destekler; TÜİK Veri Portalı SDMX 2.1 (ISO 17369 — DF_IME, DF_YI_UFE 20 NACE Rev.2 alt sektörü, DF_TUFE) adaptörü (src/server/crawler/tuik-sdmx-adapter.ts) devreye alındı. Hesap formülleri değişmedi.",
    affectedModules: ["fiyat-eslestirme", "eskalasyon"],
    moduleDetails: {
      "fiyat-eslestirme": {
        before: "canonicalPricingSources yalnız manuel CLI komutuyla yükleniyor, mühürlenen kataloglarda authorizationStatus='authorized' ve 64-hex authorizationEvidenceHash yazılmadığı için benchmarkEligible filtresi onaylı fiyatları eliyordu; canApproveCrawlerPrice row=1 ve PDF/resmi katalog kanıtlarını reddediyordu.",
        after: "/admin/pricing-sources açılışta 5 ana kaynağı otomatik tohumlar; executeCatalogImport, verify, sync ve review uç noktaları 64-hex SHA-256 yetki kanıtı üretir ve canApproveCrawlerPrice row>=1 ile [licensed-pdf-v1]/[official-csb-catalog-v1]/[tuik-sdmx-v1] kanıtlarını kabul eder.",
        basis: "Faz 1 T05–T09 — src/server/routes/admin.ts, src/server/routes/pricing-file-import.ts, src/server/crawler/provenance.ts",
      },
      eskalasyon: {
        before: "TÜİK İnşaat Maliyet Endeksi ve 4735 Sayılı Kanun Fiyat Farkı NACE Rev.2 alt endeksleri yalnız statik katalog veya düz CSV ile yüklenebiliyor; TÜİK Veri Portalı SDMX 2.1 (SDMX-JSON / SDMX-CSV / NSIWS REST) formatları doğrudan ayrıştırılamıyordu.",
        after: "tuik-sdmx-adapter.ts ile 25 TÜİK serisi (4 DF_IME + 1 DF_TUFE + 20 DF_YI_UFE NACE Rev.2 alt sektörü) SDMX-JSON 1.0/2.0, SDMX-CSV ve NSIWS REST üzerinden en güncel dönem seçimi ve SHA-256 mührüyle içe aktarılır; Pn ve eskalasyon formülü değişmedi.",
        basis: "4735 Sayılı Kanun Fiyat Farkı Esasları & TÜİK Veri Portalı SDMX 2.1 (ISO 17369)",
      },
    },
  },
  {
    revision: "Rev. 104",
    version: "BIM-CALC-2026-10-27.98",
    date: "27 Ekim 2026",
    commit: "048495f",
    trigger: "6 Aşamalı Tam Kapsamlı Güvenlik Denetimi Bulguları ve Derinlemesine Savunma Sertleştirmesi (Maker-Checker, RBAC, Alt Süreç/IFC/PDF Sınırları & DB Rol ACL)",
    beforeSummary:
      "1) /api/academy/allplan/admin/enrollments rotaları checkRole(['owner','admin']) ile korunduğundan sıradan tenant sahipleri kendilerine ücretsiz kurs lisansı atayabiliyordu. 2) Hakediş transition('approve') yalnız approved_by_user_id kontrolü yapıyor, submitted_by_user_id/created_by_user_id ile aynı kişinin onaylamasını ve correct() kopyasında oluşturanın ezilmesini engellemiyordu. 3) CDE POST rotalarında çalışma alanı rol kontrolü yoktu ve viewer üyeye CDE'de yüksek rol atanabiliyordu. 4) Source/Market Intelligence onaylarında kendi yüklediği veriyi tek başına onaylama (self-approval) açıktı. 5) /api/company/risk-calibration içinde pilotApplications sorgusu şirket filtresizdi. 6) Kayıtta doğrulanmamış e-posta ile isSuperAdmin atanabiliyor, impersonate oturumlarında allowWrite açılabiliyor, alt süreçlere tüm process.env aktarılıyor ve worker konteynerine JWT_SECRET veriliyordu.",
    afterSummary:
      "1) Academy admin kayıt rotaları requireVerifiedEmail + checkSuperAdmin() + isAcademyRuntimeEnabled() altına alındı. 2) Hakediş onayında submitted_by_user_id, created_by_user_id ve progress_measurements.created_by_user_id ayrımı zorunlu kılındı; correct() orijinal created_by_user_id değerini korur. 3) CDE POST rotalarına createProjectRole eklendi ve workspace viewer üyelerinin CDE rolü viewer ile sınırlandı. 4) Source/Market Intelligence onaylarına iki-kişi (Maker-Checker) kuralı, zorunlu onay notu ve restricted kaynak engeli eklendi. 5) risk-calibration pilotApplications sorgusu provisionedCompanyId ile filtrelendi. 6) Doğrulanmamış e-posta için isSuperAdmin kapalı tutuldu, impersonate oturumları zorunlu readOnly:true yapıldı, pilot başvurularında clientAddress(req) kullanıldı, IFC/PDF ayrıştırıcılarına döngü/RLIMIT/inflate sınırları ve alt süreç env beyaz listesi eklendi, worker konteynerinden JWT_SECRET kaldırıldı, GeminiProvider 128 KB girdi sınırına alındı ve DATABASE_PUBLIC_RESTRICTED_TABLE_ACL içinde bimmetraj_worker yetkileri daraltıldı. Hesap formülleri değişmedi.",
    affectedModules: ["hakedis-donem", "iso-19650", "fiyat-eslestirme", "tedarikci-sapma", "ifc-metraj", "epys-on-kontrol"],
    moduleDetails: {
      "hakedis-donem": {
        before: "ProgressPaymentService transition('approve') yalnız önceki approved_by_user_id ile karşılaştırma yapıyor; dönemi oluşturan (created_by_user_id), onaya sunan (submitted_by_user_id) veya ölçümleri giren (progress_measurements.created_by_user_id) kişinin kendi hakedişini onaylamasını ve correct() adımında created_by_user_id bilgisinin ezilmesini engellemiyordu.",
        after: "transition('approve') içinde onaylayanın submitted_by_user_id, created_by_user_id ve döneme ait tüm progress_measurements.created_by_user_id kayıtlarından farklı olması zorunlu kılındı (409 Conflict); correct() yeni revizyon satırına orijinal created_by_user_id değerini taşır.",
        basis: "Faz 6 T35 / OWASP ASVS v4.0.3 — İki Kişili Hakediş Onay (Maker-Checker) Kontratı",
      },
      "iso-19650": {
        before: "CDE POST mutasyon rotalarında çalışma alanı rol kontrolü yoktu ve workspace rolü viewer olan bir üyeye CDE proje düzeyinde approver/coordinator rolü atanabiliyordu.",
        after: "CDE POST rotalarına createProjectRole (owner/admin/manager) eklendi; CdeService.assignMember ve requireProjectRole içinde workspace rolü viewer olan üyelerin CDE rolü viewer ile sınırlandı.",
        basis: "Faz 4 T28 — ISO 19650-2 CDE Çalışma Alanı ve Proje Rol Sınırı",
      },
      "fiyat-eslestirme": {
        before: "Source Intelligence inceleme kuyruğunda (/api/source-intelligence/review-items/:id) veriyi içeri aktaran kullanıcı kendi kaydını tek başına onaylayabiliyordu.",
        after: "Onay adımında zorunlu inceleme notu, restricted kaynak engeli ve iki-kişi (Maker-Checker: run.requestedByUserId !== userId ve snapshot.createdByUserId !== userId) kontrolü zorunlu kılındı.",
        basis: "Faz 1 T05–T08 — Resmi Kaynak İstihbaratı İki Kişili Onay Kapısı",
      },
      "tedarikci-sapma": {
        before: "Market Intelligence tedarikçi teklif kalemi onayında (/api/market-intelligence/supplier-quote-entries/:id/review) teklifi giren kullanıcı kendi fiyatını onaylayarak priceSnapshots belleğine yazabiliyordu.",
        after: "Onay adımında submission.createdByUserId !== req.user.userId iki-kişi kontrolü ve zorunlu inceleme notu devreye alındı.",
        basis: "Faz 1 T06 — Tedarikçi Fiyat İstihbaratı İki Kişili Onay Kapısı",
      },
      "ifc-metraj": {
        before: "ifc_extract.py içinde iter_pset_single_values özyinelemesi ve ortak.py içinde kati() uzamsal ebeveyn yürüyüşü döngüsel STEP referanslarına karşı sınırsızdı; alt süreçlere tüm process.env aktarılıyordu.",
        after: "kati() fonksiyonuna visited kümesi + 16 adım sınırı, iter_pset_single_values fonksiyonuna visited_complex + derinlik 8 + 512 öğe sınırı, ifc_extract.py ve epys_preflight.py süreçlerine RLIMIT_AS (2 GiB) + RLIMIT_CPU ve alt süreç çağrılarına dar ortam değişkeni beyaz listesi eklendi.",
        basis: "Faz 2 T11 / Faz 7 T44 — IFC Worker Süreç ve Bellek İzolasyonu",
      },
      "epys-on-kontrol": {
        before: "ortak.py kati(e) fonksiyonu döngüsel IfcRelAggregates zincirlerinde sonsuz döngüye girebiliyordu ve epys_preflight.py alt sürecine uygulama ortam değişkenleri aktarılıyordu.",
        after: "kati(e) döngü koruması, RLIMIT_AS/RLIMIT_CPU sınırları ve minimal ortam değişkeni beyaz listesi devreye alındı.",
        basis: "RG 33331 e-PYS Ön Kontrol Worker Güvenliği",
      },
    },
  },
  {
    revision: "Rev. 105",
    version: "BIM-CALC-2026-10-27.99",
    date: "27 Ekim 2026",
    commit: "d93004cbd4f3be7a3e675fa02ab244fc0c2e0425",
    trigger: "CalmIfcWorkspace Modüler Bölünmesi (2.004 → 795 Satır, PR #31) & T43 CI Kapsam Ratchet Güçlendirmesi",
    beforeSummary:
      "CalmIfcWorkspace.tsx 2.004 satırlık tek bir dosyada daire icmali adımını, KİK m.38 panelini, 4735/TÜİK eskalasyon panelini, ISO 19650 CDE panelini, kanıt kartını ve fiyatlandırma kancalarını bir arada tutuyordu; ayrıca CI ortamında harici ALLPLAN-Eklentiler korpus klasörü bulunmadığından spreadsheet-parser.ts içindeki bazı arketip/CSV dalları ve Rev. 103'te eklenen TÜİK SDMX / sync-catalog admin rotaları T43 kapsam eşiğinin kıl payı altında kalıyordu.",
    afterSummary:
      "CalmIfcWorkspace.tsx 795 satıra indirildi (CalmApartmentsStep.tsx, CalmCostTools.tsx, CalmEscalationPanel.tsx, CalmIcmalEvidenceCard.tsx, CalmIsoCdePanel.tsx, CalmKikPanel.tsx, CalmPriceTable.tsx, CalmStepTabs.tsx, calm-format.ts, useCalmSessionInputs.ts, useCatalogPriceResolution.ts, useTuikEscalation.ts); contractor-excel-corpus.test.ts sentetik testleriyle spreadsheet-parser.ts satır kapsamı %97,33'e çıkarıldı ve t43-route-ratchet.integration.test.ts içine sync-catalog ve TÜİK SDMX 2.1 senkronizasyon uç noktaları eklendi. Hesap formülleri değişmedi.",
    affectedModules: ["ifc-metraj", "satir-dogrulama", "fiyat-eslestirme"],
    moduleDetails: {
      "ifc-metraj": {
        before: "CalmIfcWorkspace.tsx 2.004 satırlık tek bir dosyada icmal tablosu, daire icmali adımı, kanıt kartı, fiyatlandırma kancaları ve kamu ihalesi araçlarını barındırıyordu.",
        after: "CalmIfcWorkspace.tsx 795 satıra bölündü; daire icmali, fiyat tablosu, kanıt kartı, KİK/4735/ISO 19650 panelleri ve kancalar 12 bağımsız modüle ayrıldı; icmal ve metraj aritmetiği değişmedi.",
        basis: "marka.md C-5 (800 satır sınırı) — PR #31",
      },
      "satir-dogrulama": {
        before: "Harici ALLPLAN-Eklentiler klasörü olmayan CI ortamında spreadsheet-parser.ts içindeki formül/richText hücreleri, eski şablon profili geri dönüşü, tekrarlayan bloklarda boş poz/imalat alt grup başlıkları ve CSV parseDocument dalları sentetik testlerle kapsanmıyordu.",
        after: "contractor-excel-corpus.test.ts sentetik testleri genişletilerek spreadsheet-parser.ts satır kapsamı %97,33 seviyesine çıkarıldı.",
        basis: "Faz 7 T43 — coverage-thresholds.json SmartCheck/IFC alt kapsam kapısı",
      },
      "fiyat-eslestirme": {
        before: "Rev. 103'te eklenen POST /api/admin/pricing-sources/sync-catalog, GET /api/admin/pricing-sources/tuik-sdmx/metadata ve POST /api/admin/pricing-sources/:id/sync-tuik-sdmx uç noktaları t43-route-ratchet.integration.test.ts içinde çağrılmıyordu.",
        after: "t43-route-ratchet.integration.test.ts içine sync-catalog, tuik-sdmx/metadata ve sync-tuik-sdmx (baseline_2026_catalog, sdmx_csv, sdmx_json ve live_nsiws doğrulamaları) eklendi.",
        basis: "Faz 7 T43 — coverage-thresholds.json HTTP API rotaları alt kapsam kapısı",
      },
    },
  },
  {
    revision: "Rev. 106",
    version: "BIM-CALC-2026-10-27.100",
    date: "27 Ekim 2026",
    commit: "3c84fe7",
    trigger: "Müşteriler (/app/clients) & Fırsatlar (/app/crm) Akışı, 6 Aşamalı Görüşme Zaman Tüneli (/app/clients/:id) ve 3 Katmanlı Akıllı Müşteri Excel/CSV Adaptörü",
    beforeSummary:
      "Sol menüde /app/clients doğrudan erişilemiyordu; GET /api/crm/leads üzerindeki Zod v4 integerQuery (.optional() eksikliği) nedeniyle parametresiz çağrıda 400 LEAD_PAGINATION_INVALID dönüyor ve /app/crm 'CRM verileri yüklenemedi' uyarısı veriyordu; ayrıca /app/clients üzerinde eklenen bir müşterinin bilgileri düzenlenemiyor, 6 aşamaya (Potansiyel, Görüşüldü, Teklifli, Pazarlık, Kazanıldı, Kaybedildi) özel görüşme notu alınamıyor ve Excel/CSV ile müşteri içe/dışa aktarımı yapılamıyordu.",
    afterSummary:
      "Sol menüye 'Müşteriler' (/app/clients) ve 'Müşteriler & Fırsatlar' (/app/crm) eklendi; integerQuery düzeltilerek /api/crm/leads 400 hatası kapatıldı; /app/clients üzerinde 6 aşamalı filtre kartları, hızlı düzenleme çekmecesi (ClientQuickDrawer) ve tam kapsamlı Müşteri Detay & 6 Aşamalı Görüşme Zaman Tüneli (/app/clients/:id — ClientDetail.tsx) devreye alındı; Potansiyel müşteriler /app/crm Lead Havuzu ile senkronize edildi; 3 katmanlı Akıllı Müşteri Excel/CSV Adaptörü (client-excel-import.ts, client-xlsx.ts, ClientImportModal.tsx) eklendi. Hesap formülleri değişmedi.",
    affectedModules: ["teklif-satir", "satir-dogrulama"],
    moduleDetails: {
      "teklif-satir": {
        before: "Müşteri kartından (/app/clients veya /app/clients/:id) doğrudan müşteri seçili olarak yeni teklif ekranına (/app/quotes/new?clientId=...) geçiş bağlantısı yoktu.",
        after: "Müşteri tablosu, hızlı çekmece ve müşteri detay sayfasından tek tıkla '/app/quotes/new?clientId=...' rotasına geçiş ve CreateQuote içinde otomatik müşteri seçimi bağlandı; teklif kalem ve toplam aritmetiği değişmedi.",
        basis: "Müteahhit müşteri-fırsat-teklif akışı bütünlüğü (Paket A)",
      },
      "satir-dogrulama": {
        before: "Farklı sütun düzenlerindeki müteahhit müşteri Excel/CSV listelerini tanıyan bir adaptör yoktu ve GET /api/crm/leads parametresiz çağrıda Zod v4 integerQuery hatası veriyordu.",
        after: "3 katmanlı Akıllı Müşteri Excel/CSV Adaptörü (30 satır antet taraması, Ad+Soyad+Firma birleştirme, @ ve +90/05xx içerik sezgiseli, veri kayıpsız ekstra sütun not aktarımı) ve integerQuery .optional() düzeltmesi eklendi.",
        basis: "src/lib/client-excel-import.test.ts (4/4 PASS) & src/server/routes/crm.leads.test.ts (4/4 PASS)",
      },
    },
  },
  {
    revision: "Rev. 107",
    version: "BIM-CALC-2026-10-28.101",
    date: "28 Ekim 2026",
    commit: "9b118619b8967fc5e965c89de278c79b2c5e5ef9",
    trigger: "Yeni Teklif (CreateQuote) AI Hata Koruması, Excel/Demo Kalemlerini Koruma Kalkanı, Satır İçi Hızlı Müşteri Ekleme ve 3 Adımlı Sonraki İşlem Rehberi (Paket B) (eski etiket: Rev. 101)",
    beforeSummary:
      "CreateQuote.tsx içindeki generateWithAi fonksiyonu !res.ok kontrolü yapmadığı için sunucuda AI anahtarı olmadığında (500) kullanıcının yüklediği Excel kalemlerini silip yanıltıcı başarı mesajı gösteriyordu; Demo Şablon Yükle geçersiz 'demo-client-id' atıyordu.",
    afterSummary:
      "generateWithAi içine !res.ok ve !Array.isArray(data?.lineItems) koruması eklendi; hata durumunda mevcut Excel/Demo kalemleri asla silinmez. GET /api/ai/status ve X-AI-Configured başlığıyla QuoteAiWizard üzerinde AI yapılandırma durumu şeffaf biçimde gösterilir; QuoteSidebar içine '+ Hızlı Müşteri Ekle' ve QuoteNextStepsBanner.tsx ile 3 adımlı tamamlama rehberi eklendi. Satır/toplam hesap formülleri değişmedi.",
    affectedModules: ["teklif-satir"],
    moduleDetails: {
      "teklif-satir": {
        before: "generateWithAi 500 yanıtında setItems([]) çalıştırarak yüklenen Excel satırlarını siliyor, Demo şablon 'demo-client-id' atıyordu.",
        after: "generateWithAi hata durumunda mevcut satırları korur, başarı durumunda mevcut satırlara ekler; QuoteNextStepsBanner ve satır içi hızlı müşteri oluşturma eklendi.",
        basis: "src/pages/t43-ui-pages-and-components.test.ts & src/server/routes/t43-route-ratchet.integration.test.ts",
      },
    },
  },
  {
    revision: "Rev. 108",
    version: "BIM-CALC-2026-10-28.102",
    date: "28 Ekim 2026",
    commit: "9b118619b8967fc5e965c89de278c79b2c5e5ef9",
    trigger: "Yeni Teklif Görsel Hiyerarşi Düzenlemesi (Seçenek C Hibrit Rayiç Düzeni & Tablo Üstü Excel Barı) ve YAMBİS / Kat Karşılığı Hesaplayıcılarının Son Kullanıcıya Açılması (eski etiket: Rev. 102)",
    beforeSummary:
      "/app/quotes/new?clientId=... ekranında AI Sihirbazı, Firma Kataloğu ve Piyasa Rayiçleri 3 kaynak kartı + yasal uyarı kutusu ilk ekranı tamamen doldurarak Teklif Kalemleri tablosunu ve altbilgideki Excel yükleme butonunu ekran dışına itiyordu. Ayrıca /app/uzman-onizleme üzerindeki YAMBİS ve Kat Karşılığı/KDV hesaplayıcıları 'Yayında Değil' etiketi taşıyor ve /hesaplayicilar dizininde listelenmiyordu.",
    afterSummary:
      "Excel/CSV yükleme araç çubuğu (quote-excel-import) Teklif Kalemleri kartının en üst giriş barına taşındı, PageHeader'a 'Excel / CSV Yükle' eklendi, aiConfigured !== true durumunda QuoteAiWizard varsayılan daraltıldı ve BenchmarkPanel Seçenek C hibrit düzeniyle (tablo üstü kompakt 50 kalem seçici + tablo altı 3 kaynak ve yasal sorumluluk bildirimi) ayrıştırıldı. YAMBİS (/hesaplayicilar/yambis-muteahhitlik-grubu) ve Kat Karşılığı/KDV (/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum) L2 Pilot statüsüyle tüm son kullanıcıların kullanımına ve sınamasına açıldı. Hesap formülleri değişmedi.",
    affectedModules: ["teklif-satir", "kdv-tevkifat", "on-teklif-fizibilite"],
    moduleDetails: {
      "teklif-satir": {
        before: "Excel/CSV yükleme çubuğu tablonun altbilgisindeydi ve 240px'lik Piyasa Rayiçleri bildirim bloğu tabloyu ilk ekranın dışına itiyordu.",
        after: "Excel/CSV yükleme barı tablonun en üst giriş barına ve sayfa başlığına taşındı; Piyasa Rayiçleri seçicisi tablo üstünde kompakt şerit, 3 kaynak ve yasal uyarı ise tablo altında gösterilir.",
        basis: "marka.md M-12.1 (İlk Bakış Alanında Tablo & Excel Önceliği)",
      },
      "kdv-tevkifat": {
        before: "Kat Karşılığı Paylaşım ve KDV hesaplayıcısı yalnız /app/uzman-onizleme/kat-karsiligi altında 'Yayında Değil' etiketiyle sınırlıydı.",
        after: "/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum rotasında L2 Pilot statüsü, açık sorumluluk bildirimi ve uzman geri bildirim kartıyla son kullanıcıların sınamasına açıldı.",
        basis: "src/lib/kat-karsiligi.test.ts & src/capabilities/registry.test.ts",
      },
      "on-teklif-fizibilite": {
        before: "YAMBİS müteahhitlik yetki belgesi grubu ve Kat Karşılığı hesaplayıcıları /hesaplayicilar genel dizininde yer almıyordu.",
        after: "Her iki hesaplayıcı da /hesaplayicilar dizinine, /app/uzman-onizleme görev kartlarına ve SEO/GEO rotalarına L2 Pilot olarak eklendi.",
        basis: "src/lib/yambis-classification.test.ts & src/server/security/web-hardening.test.ts",
      },
    },
  },
  {
    revision: "Rev. 109",
    version: "BIM-CALC-2026-10-28.103",
    date: "28 Ekim 2026",
    commit: "f207f916efd896a6e637cb2d9015c433e1c18943",
    trigger: "Firma Kullanıcıları Rol Yönetimi & Super Admin Kontrollü UZMAN Önizleme Yetki Katmanı (Seçenek A İkili Rol Mimarisi) (eski etiket: Rev. 103)",
    beforeSummary:
      "Standart müşteri hesapları (/app) sol menüde 'Uzman Önizlemesi' (/app/uzman-onizleme) sekmesini, üst çubukta 'Geri Bildirim' butonunu ve hesaplayıcıların altında 'Bu sonuç sizin hesabınızla tutuyor mu?' doğrulama kutularını görüyordu; /admin/tenants/:companyId içindeki 'Firma Kullanıcıları' tablosunda ise kullanıcıların şirket içi rolü ve uzman önizleme yetkisi Super Admin tarafından yönetilemiyordu.",
    afterSummary:
      "TenantDetail.tsx 'Firma Kullanıcıları' tablosuna Şirket Rolü seçicisi (OWNER/ADMIN/MANAGER/VIEWER — tek OWNER korumalı) ve bağımsız 'Uzman Önizleme Yetkisi (UZMAN)' anahtarı (PATCH /api/admin/tenants/:companyId/members/:userId + admin_audit_logs member.expert_granted / member.expert_revoked kaydı) eklendi. Uzman Önizlemesi (/app/uzman-onizleme), üst bar Geri Bildirim butonu, CalculationFeedback kartı ve POST /api/expert-feedback uç noktası yalnızca UZMAN yetkisi verilen kullanıcılara (isExpertReviewer: true) ve Super Admin'e sınırlandırıldı; 4 hesaplayıcının kendisi (/hesaplayicilar/*) standart araç olarak tüm kullanıcılara açık tutuldu. Hesap formülleri değişmedi.",
    affectedModules: ["kdv-tevkifat", "on-teklif-fizibilite"],
    moduleDetails: {
      "kdv-tevkifat": {
        before: "Hesaplayıcı altındaki 'Bu sonuç sizin hesabınızla tutuyor mu?' (CalculationFeedback) doğrulama kutusu oturum açmış her standart müşteriye görünüyordu.",
        after: "Hesaplayıcının kendisi tüm kullanıcılara standart araç olarak açık tutulurken, CalculationFeedback doğrulama kutusu yalnızca Super Admin tarafından UZMAN yetkisi tanımlanan kullanıcılara gösterilir.",
        basis: "src/features/expert-feedback/expert-feedback-ui.test.ts",
      },
      "on-teklif-fizibilite": {
        before: "/app/uzman-onizleme sekmesi ve üst bar Geri Bildirim butonu tüm şirket kullanıcılarına görünüyordu; /admin/tenants/:companyId ekranında UZMAN atama kontrolü yoktu.",
        after: "Super Admin /admin/tenants/:companyId 'Firma Kullanıcıları' tablosundan tek tıkla UZMAN yetkisi atayabilir veya kaldırabilir; Uzman Önizlemesi yalnızca UZMAN yetkililere ve Super Admin'e açılır.",
        basis: "src/server/admin/expert-reviewers.ts & src/pages/admin/TenantDetail.tsx",
      },
    },
  },
  {
    revision: "Rev. 110",
    version: "BIM-CALC-2026-10-28.104",
    date: "28 Ekim 2026",
    commit: "35d58ddfcce8bd408f92b8e3a24dc0ddcad14781",
    trigger: "Kaynak IFC · 3B İnceleme WebGL/WebAssembly CSP 'wasm-unsafe-eval' Düzeltmesi (eski etiket: Rev. 104)",
    beforeSummary:
      "SmartCheck içinde IFC dosyası yüklendiğinde 'Kaynak IFC · 3B İnceleme' (IfcReviewViewer -> web-ifc.wasm) WebAssembly modülünü derlerken Content-Security-Policy script-src direktifinde 'wasm-unsafe-eval' bulunmadığı için tarayıcı 'CompileError: WebAssembly.instantiate()' hatası vererek 3B görünümü durduruyordu.",
    afterSummary:
      "src/server/security/web-hardening.ts içindeki Content-Security-Policy script-src direktifine W3C CSP Level 3 'wasm-unsafe-eval' anahtar kelimesi eklendi ('unsafe-eval' kapalı tutularak JavaScript eval() engeli korundu, yalnızca WebAssembly.instantiate/compile derlemesine izin verildi). Metraj/maliyet hesapları 3B görünümden üretilmediği için hesap formülleri değişmedi.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Kaynak IFC · 3B İnceleme paneli web-ifc.wasm derlemesi CSP script-src tarafından engellendiği için WebGL modelini oluşturamıyordu.",
        after: "CSP script-src içine 'wasm-unsafe-eval' eklenerek web-ifc.wasm 3B WebGL inceleme motorunun tarayıcıda güvenle çalışması sağlandı; metraj hesabı her zamanki gibi sunucu/QTO hattından üretilir.",
        basis: "src/server/security/web-hardening.ts & src/server/security/web-hardening.test.ts",
      },
    },
  },
  {
    revision: "Rev. 111",
    version: "BIM-CALC-2026-10-28.105",
    date: "28 Ekim 2026",
    commit: "621e9ac67b8dfad7a591d41fe77e78fde95dd45f",
    trigger: "Kaynak IFC · 3B İnceleme Retina Tuval Taşması Düzeltmesi & 3B Uzay Kontrolleri (Pan, Kamera Açıları, Kat Kesiti, Tel Kafes, Seçime Odakla) (eski etiket: Rev. 105)",
    beforeSummary:
      "engine.ts içinde renderer.setPixelRatio(2) ile birlikte renderer.setSize(width, height, false) çağrıldığı ve kapsayıcıda overflow-hidden bulunmadığı için Retina ekranlarda <canvas> elemanı 2 kat fiziksel boyutta taşarak altındaki İmalat Cetveli ve Hesap Kanıtı kartlarıyla üst üste biniyor, bina modeli sağ alt köşede yarım kalıyordu; ayrıca 3B uzayda Pan, hazır kamera açıları ve kat kesiti bulunmuyordu.",
    afterSummary:
      "renderer.setSize(width, height, true) ve overflow-hidden ile Retina tuval taşması giderildi; computeFitCameraDistance ile model her ekran oranında tam merkeze sığdırıldı. Döndür/Kaydır (Orbit/Pan) modu, İzometrik/Üst/Ön/Sağ/Sol kamera açıları, Yakınlaş/Uzaklaş/Modele Sığdır/Seçime Odakla, Kat Kesiti (Z-Clipping Plane) sürgüsü, Tel Kafes görünümü ve Standart/Geniş/Tam Ekran/Daralt kontrolleri eklendi. Metraj formülleri değişmedi.",
    affectedModules: ["ifc-metraj"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Retina ekranda 3B WebGL tuvali kapsayıcıdan taşarak altındaki İmalat Cetveli ve Hesap Kanıtı kartlarıyla çakışıyor, kullanıcı 3B modeli kaydıramıyor veya kat kesiti alamıyordu.",
        after: "Retina tuval boyutlandırması ve taşma koruması düzeltildi; Pan, hazır bakış açıları, kat kesiti sürgüsü, tel kafes ve seçili elemana odaklanma kontrolleri eklendi.",
        basis: "src/ifc/viewer/model.ts, src/ifc/viewer/model.test.ts, src/ifc/viewer/engine.ts & src/components/smartcheck/viewer/IfcReviewViewer.tsx",
      },
    },
  },

  {
    revision: "Rev. 112",
    version: "BIM-CALC-2026-10-28.106",
    date: "28 Ekim 2026",
    commit: "Temel f653d58; Rev. 112 değişiklikleri için Git geçmişine bakın",
    trigger: "Faz 0 — yönetim ve fiyat yüzeyleri tutarlılığı, ödeme verisi güvenliği, KİK N ön proje istisnası",
    beforeSummary: "Başarılı kuyruk durumu, kota ve rapor alanları API/UI sözleşmesinde ayrışıyordu; yayınlı planlar statik fiyat metinleriyle tutarsız olabiliyor, IBAN yalnız biçim kontrolünden geçiyor ve koşullu N=0,90–0,99 girdisi reddediliyordu.",
    afterSummary: "Yönetici ekranları sunucu alanlarını kullanır; ödeme hesabı IBAN checksum ile doğrulanır ve geçersiz yapılandırma fail-closed ele alınır; yayımlanan planlar kamuya açık fiyat yüzeylerinin kaynağıdır. KİK ön proje istisnası yalnız kullanıcı beyanı ve gerekli referans alanlarıyla değerlendirilir. Sınır değer formülü değişmedi; bağımsız uzman kabulü ve dağıtım yoktur.",
    affectedModules: ["kik-adt", "fiyat-eslestirme"],
    moduleDetails: {
      "kik-adt": {
        before: "İdarenin N katsayısı yalnız 1,00–1,20 arasında kabul edilirdi; Tebliğ 45.1.1.2 ön proje üstyapı istisnası seçilemiyordu.",
        after: "0,90–0,99 arası yalnız üstyapı, ön proje beyanı ve yetkili bakanlık, Resmî Gazete ve ihale referansı girildiğinde kabul edilir. Beyan ve referanslar sistemce doğrulanmaz; 1,00–1,20 genel aralığı korunur. SD = max(0,40 × YM; K × Tort2 / (C × N)) değişmez.",
        basis: "Kamu İhale Genel Tebliği m.45.1.1.2–3 (Aksaray Üniversitesi: https://donersermaye.aksaray.edu.tr/dosya/fa543d7b-db1c-4908-81de-74a01f211b3c.pdf); src/lib/kik-adt.test.ts ve src/lib/calculators/calculators-forms.test.ts; güncellik, ihaleye uygulanabilirlik ve bağımsız uzman onayı ayrıca doğrulanmalıdır.",
      },
      "fiyat-eslestirme": {
        before: "Kamuya açık plan kaynakları statik katalog ve veri tabanı yayın durumunu ayrı ele alabiliyordu; ödeme hesaplarında checksum yoktu.",
        after: "Kamuya sunulan fiyat metni ve yapılandırılmış veri yayınlı plan kaynağını izler; banka hesapları checksum ile sınanır ve geçersiz yapılandırma fail-closed kabul edilir. Teklif poz/fiyat eşleştirme formülü değişmedi.",
        basis: "src/server/security/public-plan-consistency.test.ts; src/services/billing/bank-transfer.test.ts; üretim veya ticari kaynak yetkisi kanıtı değildir.",
      },
    },
  },

  {
    revision: "Rev. 113",
    version: "BIM-CALC-2026-10-28.107",
    date: "28 Ekim 2026",
    commit: "Temel 3b0dd13; Rev. 113 değişiklikleri için Git geçmişine bakın",
    trigger: "Faz 1 — IFC kaynak sınıflandırması, review kanıtı ve teklif kaynak izi",
    beforeSummary: "IFC geometri türevleri özellik olarak etiketlenebiliyor, inceleme eski bulguları kaybedebiliyor; CDE kabul nedeni, yüklenmiş dosya checksum ilişkisi ve AI önerisinin son kullanıcı değişikliği izlenebilir biçimde korunmayabiliyordu.",
    afterSummary: "Geometri/türevler QTO-property kanıtından ayrılır ve bilinen eski geometrik kaynaklar Calm aktarımında engellenir. Review kilitli tenant işleminde kanıt ve audit ile yürür. CDE nedeni ve kaynak checksum ilişkisi korunur; imzalı AI önerisi ile kullanıcı değişikliği ayrı saklanır. İki SmartCheck aktarımında eksik fiyat ile açık sıfır ayrılır; diğer fiyat/PDF yolları, eski belirsiz kayıtlar, uzman ve üretim kabulü açık kalır.",
    affectedModules: ["ifc-metraj", "ifc-teklif-aktarim", "satir-dogrulama", "fiyat-eslestirme", "teklif-satir"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Worker bazı geometri ve eğri türevlerini property sayıyor, kaplamada hacim kaynağı alanın kaynağına karışabiliyordu.",
        after: "QTO/property IFC nesne türünden, geometri ve süpürgelik türevleri geometry olarak ayrılır; seçilen kaplama alanının kaynağı korunur. Bilinen legacy geometri yolu askıda tutulur. Geometri ve türetilmiş süpürgelik uzunluğu otomatik kanıt değildir.",
        basis: "workers/ifc/test_ifc_extract.py; src/ifc/server-path.e2e.test.ts; src/ifc/smartcheck-evidence.test.ts. IFC kaynak izi hesap doğruluğu veya bağımsız mühendis kabulü değildir.",
      },
      "ifc-teklif-aktarim": {
        before: "Eski ifc_property işaretli geometri ve belirsiz kaynaklar Calm teklif projeksiyonuna girebiliyordu.",
        after: "Bilinen eski geometri yolları ve bilinmeyen kaynaklar aktarımda reddedilir; eski geometri satırları Calm icmalinden açıklamayla çıkarılır. Tarihsel ve boyut kaynağı belirsiz tüm kayıtların toplu düzeltildiği iddia edilmez.",
        basis: "src/services/quotations/calm-transfer.test.ts; src/services/quotations/calm-transfer.integration.test.ts; src/ifc/smartcheck-evidence.test.ts.",
      },
      "satir-dogrulama": {
        before: "IFC bulguları review sırasında genel satır doğrulamasıyla silinebilir, review ve audit ayrı işlemlerde kaydedilebilirdi.",
        after: "Kaynak bulguları korunur; açık bulguda onay engeli ve gerekçeli istisna yolu sürer. Tekil/toplu review tenant bağlamında kilit, sürüm kontrolü ve aynı işlemde audit kullanır; stale istemci güncel kaydı tekrar inceler.",
        basis: "src/server/routes/smartcheck.integration.test.ts; src/contracts/smartcheck.ts; src/components/smartcheck/SmartCheckImportWorkspace.tsx. Review yapanın mühendis yetkinliği ayrıca doğrulanmış sayılmaz.",
      },
      "fiyat-eslestirme": {
        before: "Kaynak doküman ve istemcinin bildirdiği hash birbirinden bağımsız kabul edilebiliyor; CDE kabul olayının kullanıcı gerekçesi sistem nedeni ile değiştirilebiliyordu.",
        after: "Kaynak dokümanı seçiliyse sunulan hash kayıtlı checksum ile eşleşmelidir; CDE karar gerekçesi korunur. Eşleşme dokümanın içeriğinin veya fiyatın doğruluğunu kanıtlamaz. İki SmartCheck teklif aktarımında null/eksik fiyat reddedilir, açık sıfır korunur; diğer fiyat ve PDF akışlarının tümünde ayrım ayrıca doğrulanmalıdır.",
        basis: "src/server/routes/market-intelligence.integration.test.ts; src/server/routes/cde.integration.test.ts; src/server/routes/smartcheck.integration.test.ts; src/services/cde/service.ts.",
      },
      "teklif-satir": {
        before: "AI satırı ilk öneri ile kullanıcı değişikliklerini doğrulanabilir biçimde kaydetmiyordu.",
        after: "Sunucu imzalı, firma/kullanıcı bağlı 24 saatlik öneri kanıtı yeni teklifte doğrulanır; ilk öneri, son değerler ve değişen alanlar kanıta yazılır ve detayda gösterilir. Düzenleme yolunda AI tokenı reddedilir; AI tahmini yetkili fiyat veya metraj değildir.",
        basis: "src/services/ai/quotation-provenance.test.ts; src/services/quotations/catalog-provenance.integration.test.ts; src/server/routes/quotations.integrity.test.ts. İmza tokenının bulunması önerinin doğruluğunu, zorunlu AI tespitini veya harici model kabulünü garanti etmez.",
      },
    },
  },


  {
    revision: "Rev. 114",
    version: "BIM-CALC-2026-10-28.108",
    date: "28 Ekim 2026",
    commit: "Temel b610878; Rev. 114 değişiklikleri için Git geçmişine bakın",
    trigger: "Fiyat girdisi, teklif satırı kanıt görünümü ve tarihsel PDF sıfır belirsizliği",
    beforeSummary: "Tedarikçi sayı alanlarında boş/null sıfıra çevrilebiliyor, teklif detayında kaynak miktar ve fiyat kanıtları görünmeyebiliyor, geçmişte eksikten oluşmuş sıfır PDF'te kesin fiyat gibi çıkabiliyordu.",
    afterSummary: "Tedarikçi sayısal ayrıştırma boş/null değerleri sıfırdan ayırır; teklif detayı kayıtlı kaynak miktarını, fiyatını ve review durumunu gösterir. Geçmiş belge kaynaklı sıfırda yeterli fiyat kanıtı yoksa PDF 409 ile durur; manuel ve kaynak kanıtlı sıfır korunur. Geçmiş sıfır override'ının kökeni belirsizse doğrulama gerekir; iki SmartCheck aktarımında yeni bilinçli sıfır, gerekçe ve aktör bağlı kanıtla kaydedilir, PDF kapısı bu kanıtı değerlendirir. İzole entegrasyon testleri üretim veya uzman kabulü değildir.",
    affectedModules: ["teklif-satir", "ifc-teklif-aktarim", "fiyat-eslestirme", "aykiri-fiyat"],
    moduleDetails: {
      "teklif-satir": {
        before: "Teklif satırında kaynak kanıtı ile teklifteki değer arasındaki fark görülemiyor; geçmiş belge kaynaklı, eksikten dönmüş olabilecek sıfır PDF'te sıradan sıfır gibi gösterilebiliyordu.",
        after: "Teklifteki ve kanıtta kaydedilen miktar/fiyat, kaynak türü ve review durumu ayrıştırılır. Belge kaynaklı sıfırın kaynak satırı ve aktarım anı fiyat kanıtı uyuşmuyorsa PDF 409 döner. Manuel sıfır ve kaynak kanıtlı sıfır korunur; eski açık sıfır override'ları kanıtsızsa teyit gerektirir. Yeni bilinçli sıfır override, gerekçe ve aktör bağlı kanıtla iki SmartCheck aktarımında kaydedilir; PDF kanıtı kontrol eder.",
        basis: "src/server/routes/quotation-source-evidence.test.ts, src/components/quote/QuoteSourceEvidence.test.ts, src/services/pdf/price-guard.test.ts, src/services/pdf/price-guard.integration.test.ts, src/server/routes/quotation-pdf-error.test.ts, src/server/routes/smartcheck.integration.test.ts (izole 4 senaryo). Kaynak incelemesi uzman onayına eşit değildir.",
      },
      "ifc-teklif-aktarim": {
        before: "Aktarılan miktar ve fiyat kanıtlarının proje kullanıcısı tarafından teklif detayında ayırt edilmesi güçtü.",
        after: "Kaydedilen kaynak satırı ve review durumu, teklif satırında sunucu verisinden gösterilir; kanıtın güncel kaynağın kendisi olmadığı belirtilir. İki SmartCheck aktarımında açık sıfır override için gerekçe ve aktör bağlı fiyat kanıtı tutulur; PDF bu kanıtı kontrol eder. Birebir tekrar no-op 200 döner; miktar, fiyat, maliyet, KDV, fire, birim, açıklama, snapshot, kaynak, doğrulama veya sıfır gerekçesi farklıysa ve eski kanıt eksikse 409 ile reddedilir. No-op teklif updatedAt ve PDF kota sürüm anahtarını değiştirmez, tekrar aktarım audit kaydı yazmaz. İzole testler gerçek üretim veya kullanıcı kabulü sayılmaz.",
        basis: "src/server/routes/quotations.integrity.test.ts, src/components/quote/QuoteSourceEvidence.test.ts; tenant kapsamı ve veri minimizasyonu.",
      },
      "fiyat-eslestirme": {
        before: "Eksik tedarikçi sayı alanı 0'a dönüştürülebiliyor; geçmişte belge fiyatı eksik olduğu halde 0'a dönüşen teklif kalemi PDF'e taşınabiliyordu.",
        after: "Sayısal girdi yokluğu null, açık 0 sayısal 0 kalır. PDF koruması kaynağı belirsiz eski belge/0 kayıtlarını reddeder; tüm eski kayıtların otomatik onarımı veya diğer fiyat yüzeylerinin tamamı için kabul iddiası yoktur.",
        basis: "src/server/routes/market-intelligence.integration.test.ts; src/services/pdf/price-guard.integration.test.ts; içerik ve fiyatın ekonomik doğruluğu ayrı değerlendirilir.",
      },
      "aykiri-fiyat": {
        before: "Fiyat eksikliği sıfıra dönüşerek tedarikçi değerlendirme girdisini bozabiliyordu.",
        after: "Boş ve null sayısal girdiler açık sıfırdan ayrılır; aykırılık formülü ve uzman kalibrasyonu değişmez.",
        basis: "src/server/routes/market-intelligence.ts; src/server/routes/market-intelligence.integration.test.ts.",
      },
    },
  },

  {
    revision: "Rev. 115",
    version: "BIM-CALC-2026-10-28.109",
    date: "28 Ekim 2026",
    commit: "Temel ff674a0; Rev. 115 için Git geçmişine ve canlı dağıtım kanıtına ayrıca bakın",
    trigger: "Faz 2 erişim, firma izolasyonu ve kayıt güvenliği",
    beforeSummary: "Doğrulanmamış super admin oturum iddiası arayüz/API arasında ayrışabiliyor, askıdaki firma ödeme bildirimine ulaşamıyor, plansız kayıt açılabiliyor ve SmartCheck audit ile teklife bağlı finans tablolarında firma RLS savunması eksik kalıyordu.",
    afterSummary: "Doğrulanmış e-posta yönetici ve impersonation kapısında aranır; askıda owner/admin için yalnız iki ödeme kurtarma POST'u açıktır. Aktif deneme veya ücretsiz plan yoksa kayıt 503 döner; seçilen plan işlem boyunca kilitlenir. 0030 SmartCheck audit ve 0031 teklife bağlı finans RLS politikaları gerçek kısıtlı rollerle izole PostgreSQL'de sınanır. Hesaplama formülü değişmedi; MFA, oturum iptali, tüm endpoint IDOR ve veri yaşam döngüsü açık. Bazı audit işlemleri iş verisiyle atomik değildir. Canlı admin doğrulaması, plan cutover, dağıtım ve bağımsız kabul ayrıca gereklidir.",
    affectedModules: ["teklif-satir", "satir-dogrulama", "kota"],
    moduleDetails: {
      "teklif-satir": {
        before: "Teklife bağlı finans hesaplama ve rapor tablolarında şirket sınırı veritabanı RLS seviyesinde tam değildi.",
        after: "0031 ile ilgili finans tablolarında firma kapsamlı RLS ve rol yetkileri uygulanır; tutar ve kârlılık formülü değişmez. Tüm API nesne yetkilendirmesi ve canlı kabul tamamlanmış sayılmaz.",
        basis: "drizzle-release/0031_finance_quotation_tenant_rls.sql; src/contracts/finance-quotation-rls.pgtest.ts ve izole kısıtlı rol testleri.",
      },
      "satir-dogrulama": {
        before: "SmartCheck audit tablosu firmaya göre zorunlu RLS ile ayrılmıyordu.",
        after: "0030 SmartCheck audit kayıtlarını firma ve rol bağlamında sınırlar. Tekil/toplu review audit transaction içindedir; diğer bazı audit işlemlerinin atomikliği açık kalır. İnceleme uzman onayı değildir.",
        basis: "drizzle-release/0030_smartcheck_audit_tenant_rls.sql; src/contracts/smartcheck-pilot-tenant-rls.pgtest.ts ve ilgili izole rol testleri.",
      },
      "kota": {
        before: "Aktif deneme/ücretsiz plan yokken kayıtta plansız abonelik oluşabiliyor ve askıya alınmış yetkili firma ödeme kurtarmasına erişemiyordu.",
        after: "Kayıtta aktif başlangıç planı seçilir ve FOR SHARE ile transaction boyunca kilitlenir; bulunmazsa workspace ve Academy kaydı 503 döner. Askıda owner/admin yalnız iki ödeme bildirim POST'unu kullanabilir. Dönem bitişi kotalarda uygulanır; tüm yazmalar için genel süre kapısı açık tasarım konusudur.",
        basis: "src/server/routes/auth-phase2.integration.test.ts; src/services/billing/trial-plan.integration.test.ts; src/services/billing/quota-policy.ts. Canlı katalog ve admin e-posta doğrulaması cutover öncesi kontrol edilmelidir.",
      },
    },
  },
  {
    revision: "Rev. 116",
    version: "BIM-CALC-2026-10-28.110",
    date: "28 Ekim 2026",
    commit: "Temel a006c07; Rev. 116 için Git ve canlı dağıtım kanıtını ayrıca doğrulayın",
    trigger: "Faz 3 operasyon sinyalleri ve yönetici ölçümleri",
    beforeSummary: "Kuyruk sayıları çalışan süreç kanıtı olarak yorumlanabiliyor; eski işin bekleme yaşı görünmüyor, liste fiyatı MRR diye sunuluyor ve bilinen admin audit olayları other olarak kalıyordu.",
    afterSummary: "0032 ile iki worker türü iş olmasa da 30 saniyede DB saatli heartbeat yazar; 90 saniye TTL, tür başına 32 kayıt, 10 saniye tekrar limiti ve eski kayıt değişimi vardır. Ortak DB rolü kimlik veya OCI doğrulaması değildir; aşırı hızlı yeniden başlamalar yeni sinyali geçici engelleyebilir. Liste fiyatı aktif aboneliklerin güncel plan tutarıdır; en çok 5000 olaydan güvenli, tüm zamanlarda tekilleştirilmiş onaylı havale beyanı banka mutabakatı değildir. En eski bekleyen iş ve audit sözlüğü görünür; yedek ve geri yükleme doğrulanmadı. Plan, aktiflik ve abonelik değişiklikleri önce/sonra gösterilir; aynı adlı plan kimliği ve maskeli banka farkı ayrılır. Snapshot eskime uyarısı sunulur; sunucuda eşzamanlılık kilidi yoktur. Audit eski saat dilimi bilinmiyor, cursor mikro saniyeyi korur. Hesap formülleri değişmedi; canlı dağıtım ve bağımsız kabul açıktır.",
    affectedModules: ["kota"],
    moduleDetails: {
      "kota": {
        before: "Kuyruk ve gelir görünümü, worker süreç heartbeat'ini ve onaylı havale beyanı ile liste fiyatı ayrımını göstermiyordu.",
        after: "Süreç sinyali ve en eski iş görünürlüğü, liste fiyatı ve sınırlı onaylı ödeme beyanı ayrımı eklendi; kota hesaplama yöntemi ve sınırları değişmedi. Banka mutabakatı ve gerçek restore başarısı kanıtlanmadı.",
        basis: "drizzle-release/0032_worker_process_heartbeat.sql; src/smartcheck/import/process-heartbeat.pgtest.ts; src/server/routes/admin-dashboard-metrics.test.ts. İzole test canlı veya uzman kabulü değildir.",
      },
    },
  },
  {
    revision: "Rev. 117",
    version: "BIM-CALC-2026-10-28.111",
    date: "28 Ekim 2026",
    commit: "Temel c421d99; Faz 4 commit ve canlı dağıtım ayrıca doğrulanır",
    trigger: "Faz 4 firma paneli, SmartCheck, örnek teklif ve fiyat hafızası",
    beforeSummary: "Panel ilk 100 teklifi ve yalnız varsayılan para biriminin bazı adetlerini gösteriyordu; SmartCheck boş, başarısız ve henüz yüklenmemiş durumları ayrışmıyor, geç gelen yanıtlar yeni dokümana yazılabiliyordu. Demo satırlar gerçek teklif sanılabiliyor; fiyat hafızası kapsamı yeterince açık değildi.",
    afterSummary: "Panel son en çok 1.000 teklifi 10 sayfa ile okur; tavan ve offset sayfaları arasında değişim uyarılır, snapshot garantisi yoktur. Aktif ve karar bekleyen adetleri para birimlerinin tümünü kapsar; tutarlar kur dönüşümü olmadan ayrı gösterilir. SmartCheck boş sonuç, durum sorgusu hatası ve başarısızlığı ayırır, geç yanıt yarışlarını korur; hata sonrası durum yeniden sorgulanabilir. Demo yüklenmiş teklif kaydı arayüz düzeyinde engellenir; API'de demo kimliği doğrulaması veya sunucu güvenlik sınırı değildir. Fiyat hafızası poz ve birim ister; bu alanları göndermeyen harici API istemcisi 400 alır (breaking değişiklik). Kontroller arasında sentetik tarayıcı fixture'ları vardır; bu tam uçtan uca, canlı veya bağımsız uzman kabulü değildir. Hesaplama formülü değişmedi.",
    affectedModules: ["teklif-satir", "ifc-teklif-aktarim", "fiyat-eslestirme"],
    moduleDetails: {
      "teklif-satir": {
        before: "Paneldeki durum adetleri varsayılan kur ile sınırlıydı; örnek satırların gerçek teklife kaydı kullanıcı tarafından ayırt edilmeyebilirdi.",
        after: "Panelde devam eden ve karar bekleyen teklifler tüm para birimlerinde sayılır, toplamlar ayrı gösterilir. Son en çok 1.000 kayıt ve offset snapshot sınırı görünür. Demo yüklenince arayüz kaydı engeller; bu sunucu yetki güvencesi değildir. Satır aritmetiği değişmedi.",
        basis: "src/pages/dashboard-summary.test.ts; src/pages/quote-demo-replacement.test.ts; yerel sentetik browser, gerçek müşteri ve canlı kabulünün yerini almaz.",
      },
      "ifc-teklif-aktarim": {
        before: "Henüz yüklenmemiş veya başarısız iş ile başarıyla işlenmiş fakat satırı olmayan dosya karışabiliyor, eski asenkron yanıt yeni seçimi ezebiliyor ve durum sorgusu hata halinde süresiz bekleyebiliyordu.",
        after: "Boş sonuç ve hata ayrılır, son belge ve son satır isteği korunur; durum sorgusu hatası kullanıcıya yeniden kontrol seçeneği verir. Aktarım veya mühendislik doğruluğu garantisi değildir.",
        basis: "src/components/smartcheck/import-progress.test.ts ve request-guard.test.ts; sentetik Chromium ters sıralı yanıt ve 503 testi.",
      },
      "fiyat-eslestirme": {
        before: "Fiyat hafızası sorgusu poz ve birim bağlamı olmadan belirsiz karşılaştırma sunabiliyordu.",
        after: "Karşılaştırma poz kodu ve birime göre kapsamlanır; /api/market-intelligence/price-memory bunlardan biri eksikse 400 PRICE_MEMORY_SCOPE_REQUIRED döndürür. Harici istemciler uyarlanmalıdır; fiyatın piyasa veya mühendislik doğruluğu ayrıca doğrulanır.",
        basis: "src/server/routes/market-intelligence.ts ve ilgili market intelligence testleri; farklı birimler birlikte karşılaştırılmaz.",
      },
    },
  },
  {
    revision: "Rev. 118",
    version: "BIM-CALC-2026-10-28.112",
    date: "28 Ekim 2026",
    commit: "Temel 840c32e; bu değişiklik ve canlı dağıtım ayrıca doğrulanır",
    trigger: "Açık IFC fixture ile çoklu bağlamda geometri birim güvenliği ve izole kurtarma denemesi",
    beforeSummary: "Birden çok IfcContext içeren açık IFC örneğinde geometri iterator'ı şüpheli ölçekte değer üretmiş, quality gate yine de geçmişti. Canlı veri geri yükleme kanıtı yoktu.",
    afterSummary: "Birden çok IfcContext varsa birim dönüşümü güvenilir olmayan iterator geometrisi kullanılmaz; açık QTO ve özellik miktarı kendi kaynak kanıtıyla korunur. Geometrisi eksik bir elemanın yüksek önemli bulgusu karma modelde dosya düzeyi kalite kapısını kapatır ve tüm SmartCheck satırları aktarım dışında kalır. Ayrı ölçeklenen eğri yolu iterator korumasıyla karıştırılmaz; IfcCovering için doğrudan QTO uzunluk okuması desteklenmez. Açık IFC ile regresyon ve izole PostgreSQL T44 1/1 ile sentetik nesne kopyası denendi; bunlar gerçek müşteri golden verisi, bağımsız uzman veya canlı kabul değildir. Canlı yedek, tutarlı DB+object geri yükleme ve RTO/RPO doğrulanmadı.",
    affectedModules: ["ifc-metraj", "ifc-teklif-aktarim"],
    moduleDetails: {
      "ifc-metraj": {
        before: "Çoklu IFC bağlamında iterator geometrisi birim ölçeği doğrulanmadan kullanılabiliyor ve anomaliye rağmen kalite kapısı geçebiliyordu.",
        after: "Çoklu IfcContext halinde iterator geometrisi dışlanır; mevcut desteklenen QTO/özellik kanıtı ve ayrı eğri yolu korunur; IfcCovering doğrudan QTO uzunluğu desteklenmez. Eksik miktar gerçek sıfır değildir ve dosya kalite kapısı kapanabilir.",
        basis: "Açık buildingSMART IFC fixture, workers/ifc/test_ifc_extract.py ve docs/audits/phase-5/OPEN_IFC_COMPARISON_2026-10-28.md; bağımsız uzman golden sonucu değildir.",
      },
      "ifc-teklif-aktarim": {
        before: "Açık IFC örneğinde hatalı ölçekli geometri ve geçen kalite kapısı kullanıcıyı yanıltabilirdi.",
        after: "Karma modelde geometriye bağlı bir elemanın yüksek bulgusu tüm SmartCheck satırları için dosya düzeyi aktarım kapısını kapatır; QTO değerinin ayrıştırılması tek başına aktarım izni değildir.",
        basis: "Worker kalite kapısı, IFC evidence sözleşmesi ve sentetik regresyon; canlı müşteri ve bağımsız uzman kabulü açık.",
      },
    },
  },
  {
    revision: "Rev. 119",
    version: "BIM-CALC-2026-10-29.1",
    date: "29 Ekim 2026",
    commit: "Temel 22743d8; bu değişiklik ve canlı dağıtım ayrıca doğrulanır",
    trigger: "Firma hızlı düzenleme önizlemesi",
    beforeSummary: "Yönetici firma hızlı düzenlemesi plan, abonelik durumu ve bonus kotayı önce/sonra göstermeden kaydedebiliyordu.",
    afterSummary: "Firma hızlı düzenleme önce/sonra özeti ve iptal seçeneği gösterir. Önizleme yüklenmiş veriye dayanır, sunucu eşzamanlılık kilidi yoktur. Hesap formülü değişmedi; canlı kabul ayrı doğrulanmalıdır.",
    affectedModules: ["kota"],
    moduleDetails: {
      "kota": {
        before: "Hızlı düzenlemede plan ve bonus kota değişimi kayıttan önce karşılaştırılmıyordu.",
        after: "Plan kimliği, abonelik durumu ve bonus kota önizlenir; iptal kayıt yapmaz. Snapshot eskimesi mümkündür, sunucu eşzamanlılık kilidi yoktur; kota formülü değişmedi.",
        basis: "src/pages/admin/TenantsList.tsx ve hızlı düzenleme önizleme testleri; canlı kabul değildir.",
      },
    },
  },
];

interface CalculationEvidence {
  scope: string;
  testFiles: string[];
  pending: string;
}

/** Test references identify coverage to inspect; they do not assert a fresh or full test pass. */
export const CALC_REVIEW_EVIDENCE: Record<string, CalculationEvidence> = {
  "hakedis-donem": {
    scope: "Tenant bağlı dönemsel/kümülatif hakediş, kaynak ölçüm-review bağı, sabit noktalı tutar, sözleşme tavanı, immutable olay ve düzeltme zinciri; pilot/L2 ve varsayılan kapalı.",
    testFiles: ["src/lib/progress-payment/progress-payment.test.ts", "src/services/progress-payments/service.integration.test.ts", "src/domain/vendor-interop/vendor-interop.test.ts", "src/domain/tender-defense/tender-defense.test.ts", "scripts/release-migrations/verify.integration.test.ts"],
    pending: "İzinli gerçek Yeşil Defter/ataşman/icmal ve bağımsız teknik ofis fikstürü; lisanslı OSKA/AMP native import kabulü; adlı ihale uzmanı EKAP savunma imzası. Bunlar olmadan resmî uyumluluk, L3 veya canlı kullanım iddiası yoktur.",
  },
  "teklif-satir": {
    scope: "Teklif ekranı, sunucu ve PDF toplamlarında kullanılan ortak yöntem.",
    testFiles: ["src/lib/calculations.test.ts", "src/pages/admin/roadmap/content.test.ts"],
    pending: "Satır bazında yuvarlama ve iskonto sırasının sözleşme/fatura uygulamasına uygunluğunun onayı.",
  },
  "kdv-tevkifat": {
    scope: "Kullanıcının seçtiği oranlarla danışma hesabı; iş türünden yasal oran seçmez.",
    testFiles: ["src/lib/tax-advisory.test.ts"],
    pending: "Uygulanabilir iş türü, oran ve istisnaların mali müşavir/vergi uzmanı tarafından belirlenmesi.",
  },
  "maliyet-marj": {
    scope: "Satış neti, fireli maliyet ve risk primlerini kullanan ortak kârlılık hesabı.",
    testFiles: ["src/lib/calculations.test.ts", "src/pages/admin/roadmap/content.test.ts"],
    pending: "Net hakediş miktarı ile fireli maliyet miktarının örnek gerçek teklifle karşılaştırılması.",
  },
  eskalasyon: {
    scope: "T/2 harcama dağılımı simülasyonu + 4735 Sayılı Kanun Fiyat Farkı Esasları (F = A_n × B × (P_n − 1)) ve ÇŞB 2026 – TÜİK 21 Alt Endeks dönem dışı birim fiyat eskalasyon motoru aktif.",
    testFiles: ["src/lib/calculations.test.ts", "src/lib/price-escalation.test.ts", "src/lib/calculators/calculators-forms.test.ts", "src/pages/admin/roadmap/content.test.ts"],
    pending: "Harcama takvimi, eskale edilen kategoriler ve prim varsayımlarının proje için onayı. 4735 Pn formülünde sabit katsayı (a) desteği eklendi; sözleşme formülüne uygunluğu ve halka açık hesaplayıcı sayfası bağımsız bir uzman tarafından doğrulanmadı.",
  },
  "risk-fiyat-araligi": {
    scope: "Sabit eşik ve katsayı kullanan şirket içi öneri.",
    testFiles: ["src/services/financials/profit-quota.test.ts"],
    pending: "Mevcut test kota davranışını kapsar; risk/fiyat katsayıları için bağımsız hesap testi ve sektör kalibrasyonu açık.",
  },
  "ifc-metraj": {
    scope: "Modeldeki beton hacmi (m³), çok katmanlı IfcCovering kaplama alanı (m²), süpürgelik tülü (mtül), 16 daire bağımsız bölüm cetveli (IfcZone/IfcSpace), TREpys_PozOzellikSeti.PozNo, IfcComplexProperty katman nicelikleri, C++ 3B geometri yedeklemesi ve 7 maddelik IFC Kapsam & Veri Tutarlılığı Kapısı (IfcConsistencyReport / IfcCoverageCard) aktif.",
    testFiles: ["workers/ifc/test_ifc_extract.py", "src/ifc/calm-icmal.test.ts", "src/ifc/smartcheck-evidence.test.ts", "src/ifc/server-path.e2e.test.ts", "src/ifc/uncovered-quantity.test.ts", "src/smartcheck/sample-projects.ts", "docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md"],
    pending: "33 çok yazılımlı IFC modeli ve 4 Allplan Excel raporu çapraz doğrulandı; 2–3 pilot ofis sözleşmesel saha kabulü sırada.",
  },
  kalip: {
    scope: "Açık veya türetilmiş alanın inceleme çıktısı; kalıp satırı olarak teklife aktarılmaz.",
    testFiles: ["workers/ifc/test_ifc_extract.py", "src/ifc/smartcheck-evidence.test.ts", "src/smartcheck/rules/minha.test.ts"],
    pending: "Betonla temas yüzeyi, birleşimler, boşluk yanları ve sözleşme ölçü esası için ayrı motor ve kabul testleri.",
  },
  "donati-kutle": {
    scope: "Modeldeki donatı bilgileriyle teorik kütle; teklife otomatik aktarım kapalı.",
    testFiles: ["workers/ifc/test_ifc_extract.py", "src/ifc/smartcheck-evidence.test.ts"],
    pending: "Çap/boy/adet kaynağı, nominal tablo seçimi, bindirme ve fire politikasının ayrı doğrulanması.",
  },
  "ifc-teklif-aktarim": {
    scope: "Tarayıcı ön analizinden beton hacmi (m³) ve IfcCovering kaplama alanı (m²) aktarımı; fiyat kullanıcı tarafından tamamlanır.",
    testFiles: ["src/ifc/quotation-transfer.test.ts"],
    pending: "Beton-kalıp-donatı ayrımının seçilen pozlarla kontrolü; miktar ve fiyatın insan incelemesi.",
  },
  "satir-dogrulama": {
    scope: "Satır veri kalitesi kontrolü ve sunucu tarafında teknik reviewer disiplin yetkisi (STR, ARC, MEP, ALL) doğrulaması aktif.",
    testFiles: ["src/smartcheck/import/normalize.test.ts"],
    pending: "İş türüne göre fire sınırlarının gerçek saha verileriyle kalibrasyonu.",
  },
  "fiyat-eslestirme": {
    scope: "18.848 satır kaynak/audit raporu; exact poz-birim-semantik resolver; tenant BYOL ve yetki kanıtlı ÇŞB kaynak ayrımı; onaylı immutable snapshot ve geçmiş teklif kilidi.",
    testFiles: ["src/services/pricing/catalog-audit.test.ts", "src/ifc/pricing/poz-resolver.test.ts", "src/domain/quantity/quantity-contract.test.ts", "src/smartcheck/pricing/authorization.test.ts", "src/server/routes/pricing.integration.test.ts"],
    pending: "Bağımsız maliyet uzmanının doğru imalat→poz kabulü ile ÇŞB/YFK ticari kullanım yetki belgesi; bunlar olmadan resmî referans fiyat kapalı kalır.",
  },
  "aykiri-fiyat": {
    scope: "Geçmiş örneklerle istatistiksel işaretleme; piyasa rayici veya kesin hata kararı değildir.",
    testFiles: ["src/server/market-intelligence/price-memory.test.ts"],
    pending: "Malzeme grubu, bölge ve örnek hacmine göre eşiklerin gerçek verilerle kalibrasyonu.",
  },
  "uc-x-uc": {
    scope: "Kural motoru sunucuya bağlı; IFC hattı LoadBearing, IsExternal/ExposureClass, Cover, Disiplin ve ExpectedVolume özelliklerini kural motoruna iletir.",
    testFiles: ["src/smartcheck/rules/three-by-three.test.ts", "src/smartcheck/rules/ifc-rule-run.test.ts"],
    pending: "Gerçek proje IFC dosyalarında Pset_ConcreteElementGeneral / Pset_*Common özellik eşleşmelerinin uzman kabulü.",
  },
  "yapisal-sihirbaz": {
    scope: "TS 500 / TS 708 kurallarıyla kolon, kiriş, döşeme ve temel için beton (m³), kalıp (m²), kiriş–döşeme kesişim düşümü (computeBeamSlabIntersectionDeduction) ve donatı/etriye (ton) hesabı yapar.",
    testFiles: ["src/smartcheck/rules/minha.test.ts"],
    pending: "Kiriş–kolon düğüm noktası ortak hacim/kalıp düşümlerinin gerçek uygulama projeleriyle uzman kabulü.",
  },
  minha: {
    scope: "ÇŞB 2026 (CSB_2026: 0,50 m², CSB_2026_V1: duvar 0,50 m², sıva/boya 2,00 m², kalıp 1,00 m²), DIN 18350 (2,50 m²) ve Kullanıcı Tanımlı Özel Şartname (CUSTOM_CONTRACT: customThresholdM2) boşluk düşüm motoru; profil seçicisi modeldeki her kapı/pencerenin (OverallWidth × OverallHeight) tekil alanına eşiği uygular. Özel eşik girilmeden hesap yapılmaz.",
    testFiles: ["src/smartcheck/rules/minha.test.ts", "src/ifc/openings-minha.test.ts", "src/ifc/server-path.e2e.test.ts"],
    pending: "Eşiğin boşluk düzeyinde mi toplamda mı uygulandığı ve kalem bazlı (hangi kaplamaya ait) eşleme saha kabulü bekliyor; ölçüsü okunamayan boşluklar sayılır ama düşülemez.",
  },
  "taseron-hakedis-kalkani": {
    scope: "IFC mahal cetvelinden daire başına şap/zemin kaplaması hakediş tavanı, kullanıcı girdili kalınlık/fire/dozajla harç hacmi ve çimento, taşeron beyanı karşılaştırması (pilot).",
    testFiles: ["src/ifc/apartment-subcontractor-shield.test.ts"],
    pending: "Gerçek taşeron sözleşmesi ve şantiye hakediş örneğiyle tavan mantığının (net alan mı, minha uygulanmış alan mı) uzman kabulü; duvar sıvası için IFC'den çevre × yükseklik türetimi açık.",
  },
  "kaynak-yazilim-guvenilirligi": {
    scope: "IFC başlığından (dosya seçildiği anda ilk 128 KB istemci ön tespiti, tarayıcı ve sunucu yolu) kaynak yazılım tespiti, süreç öncesi 6 maddelik Revit → IFC dışa aktarım kontrol listesi (Areas and Volumes vs. 2nd Level Space Boundaries, Export Base Quantities & NetSideArea minha tuzağı, Join Geometry, LoD, Shared Coordinates / IFCCARTESIANPOINT IEEE-754 açıklaması) ve tek oda katman daralması aritmetiği (pilot).",
    testFiles: ["src/ifc/authoring-software-diagnostics.test.ts", "src/ifc/server-path.e2e.test.ts"],
    pending: "Uzmanın bildirdiği Revit sapmasının (kaba yapı girişimi, kalıp, ince yapı) gerçek modellerde ölçülüp doğrulanması.",
  },
  "on-teklif-fizibilite": {
    scope: "Kullanıcı girdili arsa/TAKS/KAKS/çoklu parselden alan, kat karşılığı paylaşımı, daire başı brüt/net, maliyet ve vaat-kapasite aritmetiği; kat-karsiligi.ts ile rasyonel müteahhit payı (Maliyet x 1.20 / Satış), kademeli tapu devri ve 6306 KDV teşviki aktif; xlsx/CSV içe, CSV dışa aktarım (pilot).",
    testFiles: ["src/lib/pre-bim-feasibility.test.ts", "src/lib/kat-karsiligi.test.ts"],
    pending: "Gerçek müteahhit ön teklif Excel örnekleriyle akışın karşılaştırılması; pay tabanı (emsal / toplam) pratiğinin uzmanca netleştirilmesi.",
  },
  iso19650: {
    scope: "RG 33331 EK-2 ve ISO 19650 bilgi konteyneri adlandırması, açık whitelist CDE durum motoru, tenant/proje/revizyon kapsamlı kalıcı rol kapıları, immutable scope hash ve append-only karar izi aktiftir. WIP→SHARED→PUBLISHED→ARCHIVED geçişi; suitability/revision eşleşmesi, optimistic lock, idempotency, maker-checker ve yeniden onay kapısı sunucuda uygulanır.",
    testFiles: ["src/smartcheck/rules/iso19650.test.ts", "src/server/routes/cde.integration.test.ts", "src/hooks/cde-workflow-model.test.ts", "scripts/release-migrations/verify.integration.test.ts"],
    pending: "ISO 19650 lisanslı metninin yetkili nüshasıyla madde eşlemesi, güvenli elektronik imza, bağımsız BIM koordinatörü kararı ve gerçek çok disiplinli saha kabulü. Hash bağı kanıt kapsamını sabitler; uzman içerik doğrulaması değildir.",
  },
  "kik-adt": {
    scope: "4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1.1 yapım işleri Sınır Değer (SD = K × Tort2 / (C × N), %40–%120 YM bandı, Üstyapı N=1,00 / Diğer Yapım N=1,20, istisnai ön proje üstyapıda beyanlı N=0,90–0,99, %40 YM alt sınır güvencesi, kullanıcı girdili), %80 Pareto açıklama istenecek sıralı iş kalemleri ve yambis-classification.ts müteahhitlik yeterlik/kapasite motoru aktif.",
    testFiles: ["src/lib/kik-adt.test.ts", "src/lib/kik-adt.golden.test.ts", "src/lib/calculators/calculators-forms.test.ts", "src/lib/yambis-classification.test.ts"],
    pending: "EKAP ihale açılış tutanağı XML/PDF içe aktarımı (Yol Haritasında · 2026 Q4 — Faz 3). Halka açık ücretsiz hesaplayıcı sayfası bağımsız bir uzman tarafından doğrulanmadı.",
  },
  "epys-on-kontrol": {
    scope: "IFC → sunucu ön kontrolü (EK-1/2/3/5/6, EK-7 Tablo 7.1–7.9 IfcAnnotation dahil) → disipline göre EK-9 Tablo 9.1 (Mimari 21 satır) veya Tablo 9.2 (Diğer Disiplinler 16 satır) ekranı, kotadan düşmeyen canlı örnek projeler ve ALLPLAN 2026 e-PYS Kiti v1 aktif.",
    testFiles: ["workers/ifc/test_epys_preflight.py", "workers/ifc/vendor_tests/ifc_ruhsat/test_kurallar.py", "src/smartcheck/import/epys-preflight-runner.test.ts", "src/smartcheck/epys-allplan-kit.test.ts", "src/smartcheck/sample-projects.ts", "docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md"],
    pending: "Gerçek proje kabulü ve elle işaretli satırların yetkili incelemesi.",
  },
  "epys-hizli": {
    scope: "Tarayıcı ön analizinde IFCMATERIAL (m.13(3) Malzeme İsmi_Dayanım + ≤15 kr. CAD şablonu), IFCSPACE (EK-3 Kat_Fonksiyon_Sıra) ve 5D CSBPozNo uyarısı dahil hızlı ön kontrol; sezgisel puan uygunluk yüzdesi değildir.",
    testFiles: ["src/smartcheck/rules/epys.test.ts"],
    pending: "Puan/ağırlıkların kullanıcıyı yanıltmadığının değerlendirilmesi ve kapsam dışı kuralların görünür tutulması.",
  },
  pdfa: {
    scope: "PDF yükleme, kuyruk, ifc-worker içinde sabitlenmiş veraPDF 1.30.3 runtime doğrulaması + ham XML rapor artifact'ı (verapdf_report_xml), PDF/A kimliği (m.7), ISO 216 A4 katları pafta boyutu (m.8(1)), tek pafta kuralı (m.8(2)), taranmış sayfa (m.6(4)) ve gömülü e-imza (/Sig, m.6(1)-(2)) ön kontrolü aktif.",
    testFiles: ["workers/ifc/test_pdf_preflight.py", "src/smartcheck/import/pdf-preflight-runner.test.ts", "src/smartcheck/pdf/verapdf-runner.test.ts", "src/smartcheck/pdf/pdfa-fixture-matrix.test.ts", "src/smartcheck/import/processor.pdf-artifacts.test.ts", "src/smartcheck/sample-projects.ts", "docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md", "docs/audits/phase-5/T32_VERAPDF_RUNTIME_2026-10-25.md"],
    pending: "veraPDF 1.30.3 runtime ve 7 vakalık sentetik PDF/A-2b matrisi imajda doğrulandı; izinli gerçek font/renk/ek/çok sayfa/imzalı dosya matrisi, lisanslı dönüşüm sağlayıcısı kararı, gerçek pafta kabulü ve taranmış sayfa sezgisinin yanlış alarm değerlendirmesi bekler.",
  },
  bindirme: {
    scope: "Akademi kapalı; eğitim simülatörü kodu mevcut, üretim metraj motoru olarak kullanılmıyor.",
    testFiles: ["src/academy/lap-length.test.ts"],
    pending: "Akademi yeniden açılacaksa uygulanabilirlik ve kapsam dışı yapısal koşullar için uzman incelemesi.",
  },
  kota: {
    scope: "Paket kataloğu v6 (sunucu kapasite korumalı IFC/PDF/AI limitleri), 4 dönemli Havale/EFT taahhüt iskontosu (%0/%10/%20/%30), Türkiye Kartları & Taksit (iyzico / PayTR 1–12 taksit) kanal seçicisi ve atomik rezervasyon kontrolü.",
    testFiles: ["src/services/billing/bank-transfer.test.ts", "src/services/billing/catalog-bootstrap.test.ts", "src/services/billing/feature-limits.test.ts", "src/services/billing/feature-quota.integration.test.ts", "src/services/billing/quota.integration.test.ts", "src/server/routes/t42-regression.test.ts"],
    pending: "Canlı iyzico/PayTR mağaza anahtarlarının tanımlanması ve paket vaatlerinin gerçek dosya hacmiyle ürün kabulü.",
  },
  "pilot-metrik": {
    scope: "Onay ile gerekçeli istisnayı ayrı sayan pilot ölçüm hesabı; tenant-bound vaka/ölçüm, immutable requestHash, monotonik caseRevision, DB kaynaklı append-only audit ve live-membership maker-checker kanıt zinciri.",
    testFiles: ["src/server/smartcheck/pilot/metrics.test.ts", "src/server/routes/pilot-evidence.integration.test.ts", "src/contracts/smartcheck-pilot-tenant-rls.pgtest.ts"],
    pending: "İzinli gerçek dosyalar ve bağımsız reviewer kararlarıyla pilot hedeflerinin ölçülmesi.",
  },
};
