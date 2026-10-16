/** Review snapshot, not an approval registry. Bump the version when methods or evidence change. */
export const CALC_REVIEW_META = {
  version: "BIM-CALC-2026-10-16.1",
  updatedOn: "16 Ekim 2026",
  implementationBaseline: "410576cd286cf148b140b7a55197384eacfe1cfd",
  approvalStatus: "33 çok yazılımlı IFC modeli (ALLPLAN 2026.1 31,4 MB uzman modeli + Revit/Archicad/Tekla/BIMcollab/IFC4X2) ve PDF/A-2B kabul koşuları mühürlendi · bağımsız uzman imzasına hazır",
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
    scope: "Harcama dağılımı için T/2 varsayımı; sözleşmeye bağlı fiyat farkı hesabı değildir.",
    testFiles: ["src/lib/calculations.test.ts", "src/pages/admin/roadmap/content.test.ts"],
    pending: "Harcama takvimi, eskale edilen kategoriler ve prim varsayımlarının proje için onayı.",
  },
  "risk-fiyat-araligi": {
    scope: "Sabit eşik ve katsayı kullanan şirket içi öneri.",
    testFiles: ["src/services/financials/profit-quota.test.ts"],
    pending: "Mevcut test kota davranışını kapsar; risk/fiyat katsayıları için bağımsız hesap testi ve sektör kalibrasyonu açık.",
  },
  "ifc-metraj": {
    scope: "Modeldeki beton hacmi (m³), IfcCovering kaplama alanı (m²), TREpys_PozOzellikSeti.PozNo, IfcComplexProperty katman nicelikleri ve C++ 3B geometri yedeklemesini okur; Revit QTO birim hatalarını normalize eder ve STEP ID tekilleştirmesi (seen_elem_ids) uygular.",
    testFiles: ["workers/ifc/test_ifc_extract.py", "src/ifc/smartcheck-evidence.test.ts", "src/smartcheck/sample-projects.ts", "docs/audits/MUHENDISLIK_KABUL_KANIT_PAKETI_2026-10-15.md"],
    pending: "33 çok yazılımlı IFC modeli (ALLPLAN 2026.1 31,4 MB + Revit/Archicad/Tekla/BIMcollab/IFC4X2) doğrulandı; 2–3 pilot ofis sözleşmesel saha kabulü sırada.",
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
    scope: "Kanıtlı fiyat kayıtlarını sıralayan öneri; kendi başına fiyat onayı vermez.",
    testFiles: ["src/smartcheck/pricing/snapshots.test.ts"],
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
    scope: "ÇŞB 2026 (CSB_2026_V1) ölçü esaslarına göre duvar (0,50 m²), sıva/boya (2,00 m² + söve) ve kalıp (1,00 m²) boşluk düşüm motoru aktif.",
    testFiles: ["src/smartcheck/rules/minha.test.ts"],
    pending: "Özel idare şartnameleri ve DIN 18350 / NRM2 alternatif ölçü esası profillerinin saha kabulü.",
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
