/** Review snapshot, not an approval registry. Bump the version when methods or evidence change. */
export const CALC_REVIEW_META = {
  version: "BIM-CALC-2026-10-18.29",
  updatedOn: "18 Ekim 2026",
  implementationBaseline: "57d288d5d43e49fc274b78829eaa704b5e5b824d",
  approvalStatus: "33 çok yazılımlı IFC modeli, 4 Allplan Excel raporu çapraz doğrulaması, Yetenek Kaydı & Kanıt Kapısı (BIM-CAP-2026-10-17.4), Kamu İhale Genel Tebliği m.45.1.1 kuruş hassasiyetli Golden Test seti, 6 resmi ÇŞB 2026 kitabında 18.848/18.848 tam satır alımı, 4735 Sayılı Kanun Fiyat Farkı & ÇŞB-TÜİK 21 Alt Endeks motoru, ISO 19650 CDE durum geçiş doğrulayıcısı, şantiye hakediş saha geri bildirimleri, 6 maddelik Süreç Öncesi Revit → IFC Dışa Aktarım Kontrol Listesi, PreBimFeasibilityPanel arayüzüne bağlanmış 27 kalemlik 6-villa piyasa maliyet referansı, Planlı Alanlar İmar Yön. m.5/8 & m.22 istisna açıklaması ve gerçek Chromium (puppeteer + axe-core) Açık/Koyu mod WCAG 2.2 AA 0-ihlal kapısı tamamlandı · bağımsız uzman imzasına hazır",
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
    commit: "HEAD",
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
    testFiles: ["src/lib/calculations.test.ts", "src/lib/price-escalation.test.ts", "src/lib/calculators/calculators-forms.test.ts", "src/pages/admin/roadmap/content.test.ts"],
    pending: "Harcama takvimi, eskale edilen kategoriler ve prim varsayımlarının proje için onayı. 4735 Pn formülünde sabit katsayı (a) desteği eklendi; sözleşme formülüne uygunluğu ve halka açık hesaplayıcı sayfası bağımsız bir uzman tarafından doğrulanmadı.",
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
    scope: "RG 33331 EK-2 (9 alanlı ek2_disiplinler.json sözlük doğrulamalı) ve ISO 19650-2 (7 alanlı) bilgi konteyneri adlandırma, CDE durum geçiş doğrulayıcısı (validateCdeStateTransition: WIP→SHARED→PUBLISHED→ARCHIVED) ve EN 17412-1 4 teslim aşamalı (CONCEPT/DEFINITIVE/IMPLEMENTATION/AS_BUILT) LOIN tamlık motoru (evaluateLoinByMilestone) aktif.",
    testFiles: ["src/smartcheck/rules/iso19650.test.ts", "src/smartcheck/rules/ifc-rule-run.test.ts"],
    pending: "Çok kullanıcılı kurumsal CDE iş akışında rol bazlı e-imza / onay kapılarının saha kabulü.",
  },
  "kik-adt": {
    scope: "4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1.1 yapım işleri Sınır Değer (SD = K × Tort2 / (C × N), %40–%120 YM bandı, Üstyapı N=1,00 / Diğer Yapım N=1,20, %40 YM alt sınır güvencesi, kullanıcı girdili), %80 Pareto açıklama istenecek sıralı iş kalemleri ve yambis-classification.ts müteahhitlik yeterlik/kapasite motoru aktif.",
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
    scope: "Paket kataloğu v6 (sunucu kapasite korumalı IFC/PDF/AI limitleri), 4 dönemli Havale/EFT taahhüt iskontosu (%0/%10/%20/%30), Türkiye Kartları & Taksit (iyzico / PayTR 1–12 taksit) kanal seçicisi ve atomik rezervasyon kontrolü.",
    testFiles: ["src/services/billing/bank-transfer.test.ts", "src/services/billing/catalog-bootstrap.test.ts", "src/services/billing/feature-limits.test.ts", "src/services/billing/feature-quota.integration.test.ts", "src/services/billing/quota.integration.test.ts"],
    pending: "Canlı iyzico/PayTR mağaza anahtarlarının tanımlanması ve paket vaatlerinin gerçek dosya hacmiyle ürün kabulü.",
  },
  "pilot-metrik": {
    scope: "Onay ile gerekçeli istisnayı ayrı sayan pilot ölçüm hesabı.",
    testFiles: ["src/server/smartcheck/pilot/metrics.test.ts"],
    pending: "İzinli gerçek dosyalar ve bağımsız reviewer kararlarıyla pilot hedeflerinin ölçülmesi.",
  },
};
