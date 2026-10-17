/** Review snapshot, not an approval registry. Bump the version when methods or evidence change. */
export const CALC_REVIEW_META = {
  version: "BIM-CALC-2026-10-17.7",
  updatedOn: "17 Ekim 2026",
  implementationBaseline: "63ea8731144df836ef92e54a1bf38a27138b4d7c",
  approvalStatus: "33 çok yazılımlı IFC modeli, 4 Allplan Excel raporu çapraz doğrulaması, Yetenek Kaydı & Kanıt Kapısı (BIM-CAP-2026-10-17.4), Kamu İhale Genel Tebliği m.45.1.1 kuruş hassasiyetli Golden Test seti, 6 resmi ÇŞB 2026 kitabında 18.848/18.848 tam satır alımı, 4735 Sayılı Kanun Fiyat Farkı & ÇŞB-TÜİK 21 Alt Endeks motoru (price-escalation.ts) ve ISO 19650 CDE durum geçiş doğrulayıcısı mühürlendi · bağımsız uzman imzasına hazır",
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
 * Strictly chronological revision log (Rev. 1 -> Rev. 6) so expert engineers can follow
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
];

interface CalculationEvidence {
  scope: string;
  testFiles: string[];
  pending: string;
}

/** Test references identify coverage to inspect; they do not assert a fresh or full test pass. */
export const CALC_REVIEW_EVIDENCE: Record<string, CalculationEvidence> = {
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
    testFiles: ["src/lib/calculations.test.ts", "src/lib/price-escalation.test.ts", "src/pages/admin/roadmap/content.test.ts"],
    pending: "Harcama takvimi, eskale edilen kategoriler ve prim varsayımlarının proje için onayı.",
  },
  "risk-fiyat-araligi": {
    scope: "Sabit eşik ve katsayı kullanan şirket içi öneri.",
    testFiles: ["src/services/financials/profit-quota.test.ts"],
    pending: "Mevcut test kota davranışını kapsar; risk/fiyat katsayıları için bağımsız hesap testi ve sektör kalibrasyonu açık.",
  },
  "ifc-metraj": {
    scope: "Modeldeki beton hacmi (m³), çok katmanlı IfcCovering kaplama alanı (m²), süpürgelik tülü (mtül), 16 daire bağımsız bölüm cetveli (IfcZone/IfcSpace), TREpys_PozOzellikSeti.PozNo, IfcComplexProperty katman nicelikleri ve C++ 3B geometri yedeklemesini okur.",
    testFiles: ["workers/ifc/test_ifc_extract.py", "src/ifc/calm-icmal.test.ts", "src/ifc/smartcheck-evidence.test.ts", "src/smartcheck/sample-projects.ts", "docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md"],
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
    scope: "6 resmi ÇŞB 2026 kitabında 18.848 satır tam kapsam, BYOL kurum içi lisanslı katalog modu ve TÜİK 21 alt endeksiyle dönem dışı güncelleme önerisi aktif.",
    testFiles: ["src/smartcheck/pricing/snapshots.test.ts", "src/server/crawler/csb-pdf-parser.test.ts", "src/lib/price-escalation.test.ts"],
    pending: "Gerçek katalogda poz/birim eşleşmesi, lisans, tarih ve öneri kalitesinin doğrulanması.",
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
    scope: "ÇŞB 2026 (CSB_2026: 0,50 m², CSB_2026_V1: duvar 0,50 m², sıva/boya 2,00 m², kalıp 1,00 m²), DIN 18350 (2,50 m²) ve Kullanıcı Tanımlı Özel Şartname (CUSTOM_CONTRACT: customThresholdM2) boşluk düşüm motoru ve CalmIfcWorkspace profil seçicisi aktif.",
    testFiles: ["src/smartcheck/rules/minha.test.ts"],
    pending: "Özel idare şartnameleri ve alternatif ölçü esası profillerinin saha kabulü.",
  },
  iso19650: {
    scope: "RG 33331 EK-2 (9 alanlı ek2_disiplinler.json sözlük doğrulamalı) ve ISO 19650-2 (7 alanlı) bilgi konteyneri adlandırma, CDE durum geçiş doğrulayıcısı (validateCdeStateTransition: WIP→SHARED→PUBLISHED→ARCHIVED) ve EN 17412-1 4 teslim aşamalı (CONCEPT/DEFINITIVE/IMPLEMENTATION/AS_BUILT) LOIN tamlık motoru (evaluateLoinByMilestone) aktif.",
    testFiles: ["src/smartcheck/rules/iso19650.test.ts", "src/smartcheck/rules/ifc-rule-run.test.ts"],
    pending: "Çok kullanıcılı kurumsal CDE iş akışında rol bazlı e-imza / onay kapılarının saha kabulü.",
  },
  "kik-adt": {
    scope: "4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1.1 yapım işleri Sınır Değer (SD = K × Tort2 / (C × N), %40–%120 YM bandı, Üstyapı N=1,00 / Diğer Yapım N=1,20, %40 YM alt sınır güvencesi, kullanıcı girdili) ve %80 Pareto açıklama istenecek sıralı iş kalemleri motoru aktif.",
    testFiles: ["src/lib/kik-adt.test.ts", "src/lib/kik-adt.golden.test.ts"],
    pending: "EKAP ihale açılış tutanağı XML/PDF içe aktarımı (Yol Haritasında · 2026 Q4 — Faz 3).",
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
    scope: "PDF yükleme, kuyruk, PDF/A kimliği (m.7), ISO 216 A4 katları pafta boyutu (m.8(1)), tek pafta kuralı (m.8(2)), taranmış sayfa (m.6(4)) ve gömülü e-imza (/Sig, m.6(1)-(2)) ön kontrolü aktif.",
    testFiles: ["workers/ifc/test_pdf_preflight.py", "src/smartcheck/import/pdf-preflight-runner.test.ts", "src/smartcheck/sample-projects.ts", "docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md"],
    pending: "Tam PDF/A doğrulayıcısı (veraPDF) entegrasyonu, gerçek pafta kabulü ve taranmış sayfa sezgisinin yanlış alarm değerlendirmesi.",
  },
  bindirme: {
    scope: "Akademi kapalı; eğitim simülatörü kodu mevcut, üretim metraj motoru olarak kullanılmıyor.",
    testFiles: ["src/academy/lap-length.test.ts"],
    pending: "Akademi yeniden açılacaksa uygulanabilirlik ve kapsam dışı yapısal koşullar için uzman incelemesi.",
  },
  kota: {
    scope: "Paket kataloğu v6 (sunucu kapasite korumalı IFC/PDF/AI limitleri), 4 dönemli Havale/EFT taahhüt iskontosu (%0/%10/%20/%30) ve atomik rezervasyon kontrolü.",
    testFiles: ["src/services/billing/bank-transfer.test.ts", "src/services/billing/catalog-bootstrap.test.ts", "src/services/billing/feature-limits.test.ts", "src/services/billing/feature-quota.integration.test.ts", "src/services/billing/quota.integration.test.ts"],
    pending: "Paket vaatlerinin gerçek dosya hacmi ve eşzamanlı kullanım senaryolarıyla ürün kabulü.",
  },
  "pilot-metrik": {
    scope: "Onay ile gerekçeli istisnayı ayrı sayan pilot ölçüm hesabı.",
    testFiles: ["src/server/smartcheck/pilot/metrics.test.ts"],
    pending: "İzinli gerçek dosyalar ve bağımsız reviewer kararlarıyla pilot hedeflerinin ölçülmesi.",
  },
};
