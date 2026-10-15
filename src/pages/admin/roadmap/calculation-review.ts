/** Review snapshot, not an approval registry. Bump the version when methods or evidence change. */
export const CALC_REVIEW_META = {
  version: "BIM-CALC-2026-10-15.1",
  updatedOn: "15 Ekim 2026",
  implementationBaseline: "2031902c3d7836e5d8190838811c0d187b16875b",
  approvalStatus: "Bağımsız uzman onayı bekliyor",
};

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
    scope: "Modeldeki beton hacmi (m³), IfcCovering kaplama alanı (m²) ve TREpys_PozOzellikSeti.PozNo niceliklerini okur; kesişim geometrisini çözmez.",
    testFiles: ["workers/ifc/test_ifc_extract.py", "src/ifc/smartcheck-evidence.test.ts"],
    pending: "Gerçek ALLPLAN/Revit/Archicad dışa aktarımlarında birim, net/brüt ve kaynak eşleşmesinin uzman kabulü.",
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
    scope: "İç pilot tenant'ta IFC → sunucu ön kontrolü (EK-1/2/3/5/6/7/9 tam sözlük) → EK-9 ekranı ve ALLPLAN 2026 e-PYS Kiti v1 aktif.",
    testFiles: ["workers/ifc/test_epys_preflight.py", "workers/ifc/vendor_tests/ifc_ruhsat/test_kurallar.py", "src/smartcheck/import/epys-preflight-runner.test.ts", "src/smartcheck/epys-allplan-kit.test.ts"],
    pending: "Gerçek proje kabulü ve elle işaretli satırların yetkili incelemesi.",
  },
  "epys-hizli": {
    scope: "Tarayıcı ön analizinde IFCMATERIAL (m.12 ≤15 kr.) ve IFCSPACE (EK-3 Kat_Fonksiyon_Sıra) dahil hızlı ön kontrol; sezgisel puan uygunluk yüzdesi değildir.",
    testFiles: ["src/smartcheck/rules/epys.test.ts"],
    pending: "Puan/ağırlıkların kullanıcıyı yanıltmadığının değerlendirilmesi ve kapsam dışı kuralların görünür tutulması.",
  },
  pdfa: {
    scope: "İç pilot tenant'ta PDF yükleme, kuyruk, ön kontrol ve sonuç paneli bağlı; sentetik akış denendi.",
    testFiles: ["workers/ifc/test_pdf_preflight.py", "src/smartcheck/import/pdf-preflight-runner.test.ts"],
    pending: "Tam PDF/A doğrulayıcısı entegrasyonu, gerçek pafta kabulü ve taranmış sayfa sezgisinin yanlış alarm değerlendirmesi.",
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
