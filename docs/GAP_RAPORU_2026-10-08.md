# TeklifPro / BIMPlan Academy — Mevcut Durum GAP Raporu

**Tarih:** 8 Ekim 2026
**İncelenen commit:** `9e39e92` (`feat/smartcheck-evaluation-baseline`, tag `restore-point-2026-08-22`)
**Önceki referans:** `4f8dea4` → aradaki **42 commit, 117 dosya**
**Yöntem:** Kod + test + build doğrulaması, `docs/agent-memory/WORKING_STATE.md`, `IFC_GAP_RAPORU.md`, `E-Proje-Teslim/` ekleri (PDF metin çıkarımı) ve **5 Ağustos 2026 tarihli, 33331 sayılı Resmî Gazete'deki nihai yönetmelik metinleri**.
**Kapsam sınırı:** Salt-okunur analiz. Kod, veritabanı ve servisler değiştirilmedi.

---

## 0. Doğrulama sonuçları (bugün çalıştırıldı)

| Kontrol | Sonuç |
|---|---|
| `pnpm run lint` (`tsc --noEmit`) | ✅ 0 hata |
| `pnpm run build` | ✅ başarılı (3,43 sn) |
| `pnpm test` | ✅ 348 test · **336 geçti · 0 başarısız · 12 atlandı** |
| Atlanan 12 test | Hepsi DB'ye bağlı HTTP entegrasyon testleri. Sebep: yerel PostgreSQL bu oturumda çalışmıyordu. **Bugün tekrar doğrulanmadılar.** |

---

## 1. Yönetici özeti

**Teknik temel ciddi biçimde güçlendi.** IFC hattı "STEP ID'den hacim tahmini" yaklaşımından çıktı. Artık kanıt-önce çalışan, insan onaylı bir SmartCheck → teklif zincirine dönüştü. Auth, davet, pilot dönüşümü ve tip güvenliğindeki 5 gerçek hata kapatıldı. Dashboard'daki sahte veriler kaldırıldı.

Buna karşılık **üç kritik açık** var:

1. **Mevzuat tabanı eski.** Repo'daki `E-Proje-Teslim/` belgeleri **taslak**. Nihai yönetmelikler 05.08.2026'da yayımlandı ve taslaktan önemli noktalarda ayrılıyor: yürürlük tarihleri, DXF yerine **PDF/A** zorunluluğu ve **2029–2033 arası kademeli geçiş**. `ozet.md`, `WORKING_STATE.md` ve ürün mesajları hâlâ taslak tarihlerini (01.10.2026) kullanıyor.
2. **Pazarlama iddiaları ürünle çelişiyor.** Landing page "%100 kesin" hacim ve **donatı tonajı** vaat ediyor. Oysa ürün donatıyı bilinçli olarak blokluyor. Örnek dosyada 1.180 elemandan yalnızca 160'ı kanıtla kabul ediliyor.
3. **`Tr_Pset_CSB` okuyucusu resmî ek ile uyuşmuyor.** Özellik adları (`ÇekmeÖn`/`ÇekmeYan`/`ÇekmeArka`) ve kapsam (67 IFC sınıfı) resmî Ek-6'dan farklı uygulanmış. Testler resmî eke göre değil, kodun kendisine göre yazılmış.

> [!IMPORTANT]
> Bu açıkların bir kısmı önceki oturumlarda benim ürettiğim içerikten geliyor. Bunlar: landing page'deki "%100 kesin" metni, `ozet.md` ve Academy alt rehberlerindeki doğrulanmamış rakamlar. `ozet.md` taslak metinlere ve bir **satıcı kılavuzuna** (Allplan) dayanıyordu. Aşağıda bunları ayrıca işaretledim.

---

## 2. Son dönemde kapanan açıklar (42 commit)

| Alan | Kapanan açık | Kanıt |
|---|---|---|
| IFC doğruluğu | STEP-ID modulo hacim tahmini kaldırıldı. Kaynak önceliği artık QTO → onaylı Pset/Allplan property → blok. | `src/ifc/parser/*`, `evidence-policy.ts`, `IFC_GAP_RAPORU.md` |
| IFC → SmartCheck | Sunucu tarafında IFC yükleme (100 MB, STEP imza kontrolü), worker, `pending_review` satırları, kat ilişkisi | `smartcheck-processing.ts`, integration test |
| Güvenlik kapıları | Geometri, donatı ve kalıp tahminleri kanıt satırına giremiyor. Demo verisi gerçek dosyada fallback olarak kullanılmıyor. | `parser-gates.test.ts` |
| Fiyat kanıtı | Manuel snapshot, CSV katalog içe aktarma, deterministik eşleştirme önerisi, toplu güvenli uygulama | `pricing.ts`, `matching.ts` |
| İnsan onayı | Satır içi inceleme, bulgusuz satırlarda toplu onay, yeni veya mevcut taslak teklife aktarım | `SmartCheckImportWorkspace.tsx` |
| e-PYS | `Tr_Pset_CSB` (PozNo/TAKS/KAKS/Çekme) okuma, ilk adım | `tr-pset-csb-extractor.ts` (bkz. §3-B) |
| Auth/CRM/Academy hataları | Davet kabulünde üyelik oluşmaması ve `= NULL` hatası, aynı saniyede oturum düşmesi, sertifika ve profil sayfası çökmeleri, CRM fırsat oluşturma, `@types/react` ile 10 gizli hata | `aad9ab0`…`29291b1` |
| UX | Sahte dashboard verisi kaldırıldı, demo login fallback'i kaldırıldı, 404 + ErrorBoundary eklendi, nav sadeleştirildi, a11y (skip link, kontrast) | `fdd1a43`, `a18cefa`, `342a70a` |

---

## 3. GAP tablosu

Öncelikler: **P0** = gerçek kullanıcıya/pilota açmadan önce · **P1** = sonraki sprint · **P2** = planlı iyileştirme

### A. Mevzuat uyumu

| ID | Öncelik | Açık | Kanıt | Önerilen aksiyon |
|---|---|---|---|---|
| **MEV-01** | ✅ Kapandı (08.10) | Repo taslağı baz alıyordu. Nihai yürürlük: Dijital Hazırlama **01.09.2027**, Elektronik Teslim **01.09.2028**. | RG 05.08.2026 / 33331 | Nihai metinler ve EKLER (241 sayfa, OCR metniyle birlikte) `E-Proje-Teslim/nihai-RG-2026-08-05/`'e kondu. Taslaklar `taslak-2026-oncesi/`'ne taşındı. `ozet.md` yeniden yazıldı. Kalan iş: `WORKING_STATE.md`. |
| **MEV-02** | P0 | **Kademeli geçiş** (Geçici Md.1) hiçbir yerde modellenmemiş. PDF/A 2B teslim, nüfusu 2M+ illerin 600k+ belediyelerinde 5.000 m² üstü binalar dışında **01.03.2029**'a kadar uygulanmıyor. IFC teslimi en erken **01.09.2029** (aynı metropoller, 10.000 m² üstü), diğer tüm binalar için **01.09.2032**. Konut ve ticaret+konut dışındaki binalar **01.09.2033**'e kadar kapsam dışı. | Nihai metin Geçici Md.1–2 | Ürün mesajında "aciliyet" söylemini düzelt. "Hazırlık / ön-kontrol" konumlandırmasına geç. Bir **kapsam/tarih hesaplayıcı** ekle (il, belediye nüfusu, m², kullanım). |
| **MEV-03** | ✅ `ozet.md` düzeltildi | **2B format değişti:** taslakta DXF + PDF vardı, nihaide **PDF/A** var. CAD çizimleri **BIM modelinden üretilmek zorunda** ve PDF/A nüshası modelle uyumlu olmalı (Md.9). | Nihai Md.4(2), Md.9 | `ozet.md` ve Academy'deki DXF referanslarını düzelt. Model ↔ PDF/A tutarlılığı bir ürün fırsatı. |
| **MEV-04** | P1 | **Kapsam ve istisnalar** eksik: bodrum hariç en çok 2 katlı ve 200 m²'yi geçmeyen müstakil yapılar, tarım/hayvancılık yapıları ve İmar K. 4/26/27 kapsamındakiler hariç. Yalnızca uygulama imar planlı alanlarda **yeni** binalar kapsamda. | Nihai Md.1(2) | Kapsam hesaplayıcıya ekle. |
| **MEV-05** | ✅ `ozet.md` düzeltildi | **Nihai EK-1:** proje kodu idarenin ürettiği **6 haneli sayı** (yıl + sıra no); il, ilçe, ada ve parsel meta-veri. **Nihai EK-2:** alanlar **`_`** ile ayrılıyor, sonda Revizyon No (3) alanı var. Taslaktaki `YIL_IL_…` biçimi ve Y0/P0 kodları **yok**. | Nihai EKLER s.1–3 | Academy ve ileride yazılacak isimlendirme denetleyicisi nihai EK-1/EK-2'ye göre yazılmalı. |
| **MEV-06** | P1 | **IDS formatı yanlış aktarılmış.** buildingSMART IDS 1.0 bir **XML** (`.ids`) standardı. `ozet.md` ve Allplan kılavuzu ".json" diyor. | buildingSMART IDS 1.0 | Ürün/Academy'de IDS'i XML olarak ele al. Satıcı kılavuzunu resmî kaynak gibi kullanma. |

### B. IFC / e-PYS teknik

| ID | Öncelik | Açık | Kanıt | Önerilen aksiyon |
|---|---|---|---|---|
| **IFC-01** | P0 | **Nihai EK-6 Türkiye Pset adlarını değiştirdi.** `Tr_Pset_CSB.PozNo` artık **`TREpys_PozOzellikSeti.CSBPozNo`**. TAKS, KAKS, `CekmeOn`, `CekmeYan`, **`CekmeArka`** artık **`TREpys_ParselOzellikSeti`** altında ve **IfcSite** üzerinde (Tablo 6.55). Yeni bir set var: `TREpys_EmsalOzellikSeti.EmsalDurumu` (DAHIL/HARIC/DIGER). Kod hâlâ taslak adları arıyor, bu yüzden nihai yönetmeliğe uygun bir dosyada **hiçbir şey okumaz**. | Nihai EKLER (OCR), `tr-pset-csb-extractor.ts:3,28,40-41` | Nihai adları oku, taslak adları "eski ad" uyarısıyla kabul et. `CekmeArka` ve `EmsalDurumu`'nu ekle. STEP string decode (`\X2\`) yine gerekli. Testleri nihai eke göre yeniden yaz. |
| **IFC-02** | P1 | `CSBPozNo` nihai EK-6'da çok sayıda sınıfta zorunlu (OCR'da 51 tablo; EK-6 artık Tablo 6.1–**6.135**). Okuyucu yalnızca 6 tipe bakıyor. Regex yalnızca `IFCTEXT` kabul ediyor. | Nihai EK-6 | Sınıf listesini EK-5 Tablo 5.1/5.2'den türet. `IfcLabel`/`IfcIdentifier` desteği ekle. |
| **IFC-03** | P2 | Parsel değerleri nihai metinde **IfcSite**'ta. Okuyucunun IfcSite önceliği bu yüzden **doğru**, taslağa göre yaptığım IfcBuilding önerisini geri alıyorum. EK-7'nin proje alanları nihai Tablo 7.1–7.12'ye göre yeniden eşlenmeli. | Nihai EK-6 Tablo 6.55, EK-7 | EK-7 alanlarını PDF'ten teyit ederek ekle. |
| **IFC-04** | P1 | `TREpys_*` setlerini içeren gerçek bir örnek dosya yok. `e-proje_4x3.ifc` içinde 0 eşleşme var. | `grep` | Allplan, Revit ve Archicad'den nihai Pset'lerle dışa aktarılmış birer örnek dosya edin. |
| **IFC-05** | P1 (fırsat) | Nihai **EK-9 formundaki 21 kontrolün çoğu otomatikleştirilebilir.** Örnekler: Proje/Saha/Bina/Kat hiyerarşisi, **IfcProxy + IfcBuildingElementProxy yasağı** (6.1.3), alt sınıf varken üst sınıf yasağı (6.1.2), zorunlu özellikler, IFC versiyonu, yinelenen varlıklar, isimlendirme, IfcSpace varlığı. Ruhsat için **LOD 300** (EK-8). | Nihai EK-6, EK-8, EK-9 | Bir "e-PYS ön-kontrol" özelliği kur (bkz. UI/UX raporu: tek akışa entegre). |
| **IFC-06** | P1 | Parser hâlâ **satır bazlı regex** kullanıyor (`IFC_GAP_RAPORU` GAP-IFC-01). Örnek dosyada QTO yok. Geometri fallback'i ve donatı tasarım gereği bloklu. | `legacy-parser.ts` | web-ifc veya IfcOpenShell tabanlı gerçek tokenizer/graph'a geçişi planla. |

### C. Ürün iddiaları / pazarlama

| ID | Öncelik | Açık | Kanıt | Önerilen aksiyon |
|---|---|---|---|---|
| **CLM-01** | ✅ Düzeltildi (08.10) | Landing page "**%100 Kesin** 5D BIM Metraj Motoru" diyor ve "IfcBeam/Column/Slab hacimlerini ve **donatı tonajlarını %100 kesinlikle**" hesapladığını söylüyor. Ürün donatıyı blokluyor, örnek dosyada 1.180 elemandan 160'ı kabul ediliyor. Ayrıca `$m^3$` ve `$Ton$` JSX içinde ham metin olarak görünüyor. *(Bu metni ben yazmıştım.)* | `LandingPage.tsx:38-53,134,152` | Metni "kanıt-önce, insan onaylı IFC metrajı" olarak değiştir. Donatı vaadini kaldır. LaTeX'i düz metne çevir. |
| **CLM-02** | P1 | Kaynaksız karşılaştırmalar var: "Allplan 0 sapma / Revit ±%10-15", "2D ±%8-12 toleranslı". Bunlar tarafsızlık ilkesiyle de çelişiyor. | `PublicAcademy.tsx:67`, `Academy.tsx:151-158`, `LandingPage.tsx:54` | Ölçülmüş benchmark gelene kadar kaldır ya da "örnek/varsayım" olarak etiketle. |

### D. Academy içerik doğruluğu

| ID | Öncelik | Açık | Kanıt | Önerilen aksiyon |
|---|---|---|---|---|
| **ACD-01** | P1 | Hedef 36+ rehberdi, mevcut **24**. Checkpoint quiz yalnızca **3 rehberde** var. Önceki özetimde "ÇŞB poz kodları ve IFC 4.3 alt rehberlere eklendi" demiştim. Bu bilgiler `subGuidesData.ts`'te yok, yalnızca sözlükte var. *(Önceki özetim fazla iddialıydı.)* | `subGuidesData.ts` (24 anahtar, 3 `checkpointQuestions`) | Eksik 12+ rehberi ve rehber başına quiz'i planla. |
| **ACD-02** | P1 | Doğrulanmamış teknik içerik var. "BVBS Code 15/21/31/51" BVBS'in şekil kodlama yöntemi değil (BVBS geometri dizisi formatıdır). TBDY sarılma aralığı formülü yönetmelikle birebir değil. `Pset_ElementCost.CostCode` standart bir IFC Pset'i değil. 25 "pratik vaka" kaynaksız ve somut yüzdeler içeriyor. | `subGuidesData.ts:684-697`, `BimGlossary.tsx:96` | Uzman incelemesi yap (TBDY 2018 Böl. 7, BVBS 2.0, IFC 4.3 Pset listesi). Vakaları "örnek senaryo" olarak etiketle. |
| **ACD-03** | P1 | Nihai e-PYS yönetmelikleri için Academy modülü yok. | — | "Dijital Ruhsat 2027–2033 Geçiş Takvimi" modülü ekle: kapsam, PDF/A, IFC, Ek-5/6/7, IDS. |

### E. Uygulama / operasyon

| ID | Öncelik | Açık | Kanıt | Önerilen aksiyon |
|---|---|---|---|---|
| **OPS-01** | P0 | Pilot üretim kapıları açık. Eksikler: prod S3 kimlik bilgileri, saklama ve şifreleme politikası, restore drill, 5 müşteri izinli MEP dosyası, reviewer kayıtları. | `WORKING_STATE.md` §2026-07-24 | F10 pilot kabul kapısını tamamla. |
| **OPS-02** | P1 | Drizzle baseline bir migration olarak yakalanmamış. Boş bir DB'de migration `memberships does not exist` hatasıyla düşüyor. | `WORKING_STATE.md` yerel ortam notları | Baseline migration oluştur veya kurulum betiği yaz. |
| **OPS-03** | P2 | CRM'de 3 buton işlevsiz: "FIRSATA DÖNÜŞTÜR", "KART EKLE", "Yeni Lead Ekle". `CADDiagramViewer` `res.ok` kontrolü yapmadan `res.json()` çağırıyor. | `CRM.tsx:205,248,256`, `CADDiagramViewer.tsx:47-58` | Butonları bağla veya gizle. `res.ok` kontrolü ekle. |
| **OPS-04** | P2 | 12 DB entegrasyon testi bugün atlandı. | test çıktısı | Docker PG'yi başlatıp tam paketi yeniden koş. |
| **OPS-05** | Kısmen (kökteki IFC kopyası silindi) | Repo düzeni: 39 MB `e-proje_4x3.ifc` kökte ve `ifc-document-sample/` altında **iki kez** var. `.pnpm-store/`, `graphify-out/2026-08-02/` ve `E-Proje-Teslim/` izlenmiyor ve `.gitignore`'da değil. | `git status` | Kökteki kopyayı sil. `.pnpm-store`, `*.ifc` ve tarihli graphify yedeklerini `.gitignore`'a ekle. `E-Proje-Teslim/`'in commit'lenip commit'lenmeyeceğine karar ver. |
| **OPS-06** | P2 | Agent memory güncel değil: başlık "Last updated: 2026-08-02", workspace yolu eski kullanıcı (`/Users/hazarekiz/...`), mevzuat tarihleri taslaktan. | `WORKING_STATE.md:3,9,982` | Güncelle. |

---

## 4. Stratejik çıkarım

Nihai takvim şunu gösteriyor: **IFC teslimi hiçbir bina için 01.09.2029'dan önce zorunlu değil.** 2B PDF/A teslimi ise büyük metropollerde 5.000 m² üstü binalar için 01.09.2027'de başlıyor. Bu durum:

- "1 Ekim 2026'dan itibaren zorunlu" söylemini **geçersiz** kılıyor. Bu söylem ürün ve Academy mesajlarından çıkarılmalı.
- Yaklaşık **2–3 yıllık bir hazırlık penceresi** açıyor. TeklifPro için doğru konum "e-PYS **ön-kontrol ve hazırlık**" aracı olmak. Kademeli takvime göre kimin ne zaman etkileneceğini gösteren bir hesaplayıcı güçlü bir giriş noktası olur.
- Model ↔ PDF/A tutarlılığı (Md.9) ve Ek-6 zorunlu özellik denetimi, IFC metrajından **daha erken** ihtiyaç duyulacak özellikler.

---

## 5. Önerilen sıralama

| Sprint | İşler |
|---|---|
| **1 (P0)** | MEV-01/02/03 nihai metin ve ekleri temin et, `ozet.md`'yi yeniden yaz · CLM-01 landing metnini düzelt · IFC-01 `Ç…` adları ve STEP decode · OPS-05 repo düzeni |
| **2 (P1)** | IFC-02/03/04 PozNo kapsamı, IfcBuilding/IfcProject alanları, gerçek örnek dosyalar · MEV-04/05/06 · CLM-02 · ACD-02 uzman incelemesi · OPS-02 |
| **3 (P1/P2)** | IFC-05 e-PYS ön-kontrol kural seti + kapsam/tarih hesaplayıcı · ACD-01/03 Academy genişletme · IFC-06 parser stratejisi · OPS-03/04/06 |

**Blokaj:** OPS-01 (pilot üretim kapıları) sprintlerden bağımsız. Pilotu gerçek müşteriye açmanın ön koşulu.

---

## 6. Kaynaklar

- Resmî Gazete 05.08.2026 / 33331: [fihrist](https://www.resmigazete.gov.tr/eskiler/2026/08/20260805.htm) · [Dijital Hazırlama](https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-2.htm) · [Elektronik Teslim](https://www.resmigazete.gov.tr/eskiler/2026/08/20260805-3.htm)
- `E-Proje-Teslim/nihai-RG-2026-08-05/`: nihai metinler, EKLER PDF'i ve OCR metni. **OCR uyarısı:** ekler taranmış görüntü. Tablo içindeki adlar (ör. `CSBPozNo`, `TREpys_*`) OCR'dan okundu ve kod yazmadan önce PDF'te gözle teyit edilmeli.
- `IFC_GAP_RAPORU.md`, `docs/agent-memory/WORKING_STATE.md`
