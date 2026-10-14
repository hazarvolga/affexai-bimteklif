/** Review snapshot, not an approval registry. Bump the version when methods or evidence change. */
export const CALC_REVIEW_META = {
  version: "BIM-CALC-2026-10-14.1",
  updatedOn: "14 Ekim 2026",
  implementationBaseline: "ec9cd4e9bffabc06680a11004eefbed2c9a048b7",
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
    scope: "Modeldeki hacim niceliklerini okur; model geometrisinin doğruluğunu veya kesişimleri çözmez.",
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
    scope: "Tarayıcı ön analizinden hacim aktarımı; fiyat kullanıcı tarafından tamamlanır.",
    testFiles: ["src/ifc/quotation-transfer.test.ts"],
    pending: "Beton-kalıp-donatı ayrımının seçilen pozlarla kontrolü; miktar ve fiyatın insan incelemesi.",
  },
  "satir-dogrulama": {
    scope: "Satır veri kalitesi kontrolü; teknik reviewer disiplin yetkisi henüz uygulanmıyor.",
    testFiles: ["src/smartcheck/import/normalize.test.ts"],
    pending: "İş türüne göre fire sınırı ve reviewer disiplin kapsamının tanımlanması.",
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
  "epys-on-kontrol": {
    scope: "İç pilot tenant'ta IFC → sunucu ön kontrolü → EK-9 ekranı; sentetik akış denendi.",
    testFiles: ["workers/ifc/test_epys_preflight.py", "src/smartcheck/import/epys-preflight-runner.test.ts"],
    pending: "Kalan resmî eklerin bağımsız kaynak kontrolü, gerçek proje kabulü ve elle işaretli satırların yetkili incelemesi.",
  },
  "epys-hizli": {
    scope: "Sınırlı hızlı ön kontrol; sezgisel puan uygunluk yüzdesi değildir.",
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
    scope: "Paket kataloğuna bağlı kullanım ve rezervasyon kontrolü.",
    testFiles: ["src/services/billing/feature-quota.integration.test.ts", "src/services/billing/quota.integration.test.ts"],
    pending: "Paket vaatlerinin gerçek dosya hacmi ve eşzamanlı kullanım senaryolarıyla ürün kabulü.",
  },
  "pilot-metrik": {
    scope: "Onay ile gerekçeli istisnayı ayrı sayan pilot ölçüm hesabı.",
    testFiles: ["src/server/smartcheck/pilot/metrics.test.ts"],
    pending: "İzinli gerçek dosyalar ve bağımsız reviewer kararlarıyla pilot hedeflerinin ölçülmesi.",
  },
};
