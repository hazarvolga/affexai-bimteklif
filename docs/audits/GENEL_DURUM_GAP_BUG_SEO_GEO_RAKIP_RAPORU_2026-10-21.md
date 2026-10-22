# BIMMetraj (TeklifPro) — Bütüncül Teknik Analiz, Hesaplama Motoru Doğrulaması, GAP / BUG / SEO / GEO Denetimi ve Rakip Karşılaştırma Raporu

- **Tarih:** 21 Ekim 2026 (`2026-10-21`)
- **İncelenen Sürüm:** `Rev. 39` (`docs/rev39-handoff` @ `fd32f8b`, `main` @ `420008e`)
- **Hesaplama Doğrulama Baseline:** `BIM-CALC-2026-10-19.33`
- **Yetenek Kaydı Sürümü:** `BIM-CAP-2026-10-17.11` (`src/capabilities/registry.ts`)
- **Denetim Kısıtı:** Salt-okunur tam denetim (`0` uygulama kodu değişikliği; paylaşımlı yerel veritabanlarına dokunulmadı)

---

## 1. Yönetici Özeti ve Mevcut Proje Durumu

**BIMMetraj**, Türkiye AEC (Mimarlık, Mühendislik ve İnşaat) pazarında **openBIM (IFC 2x3 / IFC4 / IFC4.3) 3B model tabanlı metraj (QTO)** ile **Türkiye kamu ve özel sektör ihale/vergi/ruhsat mevzuatını (ÇŞB 2026 Poz, 4734 KİK m.38 ADT, 4735 Fiyat Farkı, YAMBİS Yetki Belgesi, 6306 Kat Karşılığı KDV, Planlı Alanlar İmar Yönetmeliği ve 5 Ağustos 2026 RG 33331 e-PYS)** aynı bulut-yerli (cloud-native) çatı altında birleştiren tek platformdur.

### 1.1 Otomatik Doğrulama ve Test Sağlığı (21 Ekim 2026)

| Doğrulama Katmanı | Çalıştırılan Komut / Kapsam | Sonuç | Teknik Notlar |
| :--- | :--- | :--- | :--- |
| **TypeScript Tip Kontrolü** | `./node_modules/.bin/tsc --noEmit` | **BAŞARILI (`0` hata)** | İstemci, sunucu, IFC ve SmartCheck modüllerinin tamamı tip güvenli. |
| **Python IFC & PDF Worker** | `workers/ifc/.venv/bin/python -m pytest workers/ifc -q` | **BAŞARILI (`60/60` geçti)** | `5.95s` içinde tamamlandı (`ifcopenshell` içinde 9 adet `datetime.utcnow()` deprecation uyarısı mevcut). |
| **TS Hesaplama, IFC, SmartCheck & SEO/GEO Testleri** | `./node_modules/.bin/tsx --test` (27 test paketi) | **BAŞARILI (`245/245` geçti)** | KİK ADT, 4735 Fiyat Farkı, Kat Karşılığı, YAMBİS, Pre-BIM Fizibilite, Minha, 3×3, e-PYS, ISO 19650, Sakin İcmal ve SEO/GEO testleri eksiksiz geçti. |
| **Canlı Ortam (Prod) Durumu** | `https://bimmetraj.com` (Coolify) | **KISMİ KAYMA (`Rev. 35` vs `Rev. 39`)** | Yerel repo `Rev. 39` (`fd32f8b`) seviyesindedir; canlı sunucu son olarak `Rev. 35` (`9c59971`) seviyesinde doğrulanmıştır. `Rev. 36–39` Coolify üzerinde manuel deploy beklemektedir. |

### 1.2 Mimari Bileşenlerin Durumu
1. **Veri Giriş Katmanı:** IFC 2x3 / IFC4 / IFC4.3 (tarayıcı önizleme + sunucu IfcOpenShell worker), 2B PDF pafta ve hesap raporu (`pypdf` ön kontrol), Excel/CSV metraj cetveli ve BYOL fiyat kataloğu içe aktarımı.
2. **Kural ve Hesaplama Katmanı:**
   - **IFC Tutarlılık Kapısı (`Rev. 36–37`):** Mükerrer GUID tekilleştirme, yetim boşluk (`IfcOpeningElement`) eleme, sıfır/negatif QTO engeli, kat ataması kontrolü, `IfcTypeObject` özellik kalıtımı, `IfcRelAggregates` montaj alt parçası çift sayım engeli ve `structural-material.ts` malzeme sınıflandırması.
   - **Sakin İcmal (`src/ifc/calm-icmal.ts`):** Doğrudan modelden kanıtlanan kalemleri (betonarme, kâgir duvar, çok katmanlı `IfcCovering` kaplamalar, süpürgelik mtül) fiyatlandırır; kalıp (`m²`) ve donatıyı (`ton`) `model_estimate` olarak ayırır; eşleşmeyen elemanları miktarlarıyla birlikte **"fiyatlandırılmadı / kapsam dışı"** listesinde şeffafça raporlar.
   - **Taşeron Koruma Kalkanı (`src/ifc/apartment-subcontractor-shield.ts`):** `IfcZone` / `IfcSpace` bağımsız bölüm metrajlarından daire bazlı taşeron sözleşme tavanı ve şantiye şap standardı (`SITE_SCREED_BENCHMARK`) kontrolü üretir.

---

## 2. Hesaplama Motorlarının Matematiksel ve Mevzuat Doğrulaması

Her bir hesaplama motoru kaynak kodu, altın testleri ve yürürlükteki resmî mevzuat / internet araştırması ile çapraz doğrulanmıştır:

### 2.1 4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1.1 Aşırı Düşük Teklif (ADT) Motoru
- **Modül:** `src/lib/kik-adt.ts` (Satır `1–260`) · **Test:** `src/lib/calculators/kik-adt.test.ts` & `src/lib/kik-adt.golden.test.ts`
- **Doğrulama:**
  1. **İlk Ayıklama Bandı (`[0.40 * YM, 1.20 * YM]`):** Yaklaşık maliyetin `%120`'sinin üzerindeki ve `%40`'ının altındaki teklifler elenir (`src/lib/kik-adt.ts:105-108`).
  2. **Birinci Ortalama ($Tort_1$), Standart Sapma ($\sigma$) ve İkinci Ortalama ($Tort_2$):** Örneklem standart sapması ($\sqrt{\frac{\sum (x_i - Tort_1)^2}{n - 1}}$) kullanılır; Tebliğ m.45.1.1'e uygun olarak $Tort_1$, $\sigma$ ve $Tort_2$ **2 ondalık basamağa (`round2`)**, $C$ ve $K$ **3 ondalık basamağa (`round3`)** yuvarlanır (`src/lib/kik-adt.ts:121-154`).
  3. **Parçalı $K$ Katsayısı ve Sınır Değer ($SD$) Formülü:**
     - $C < 0.60 \implies K = C$
     - $0.60 \le C \le 1.00 \implies K = \frac{3.2C - C^2 - 0.6}{C + 1}$
     - $C > 1.00 \implies K = \frac{C^2 - 0.8C + 1.4}{C + 1}$
     - $SD = \text{round2}\left(\frac{K \times Tort_2}{C \times N}\right)$ ve $SD < 0.40 \times YM$ ise $0.40 \times YM$ tabanı uygulanır (`src/lib/kik-adt.ts:142-162`). Üstyapı işlerinde $N = 1.00$, diğer yapım işlerinde $N = 1.20$ alınır.
  4. **Resmî Tebliğ 45.2 Sayısal Örneği ile Kuruş Doğrulaması:** $YM = 100.000\text{ TL}$, $N = 1,20$, 12 geçerli teklif için motorun ürettiği değerler: $Tort_1 = 66.270,00$, $\sigma = 20.317,05$, $Tort_2 = 63.237,50$, $C = 0,632$, $K = 0,627$ ve **$SD = 52.281,00\text{ TL}$** (Resmî Tebliğ sonucu ile **fark: $0,00\text{ TL}$**).
  5. **Tebliğ m.45.1.2 Pareto (`%80`) Sıralı İş Kalemleri:** Teklif kalemleri tutara göre küçükten büyüğe sıralanıp kümülatif `%80` eşiğine kadar açıklama istenecek sıralı iş kalemleri doğru belirlenmektedir (`src/lib/kik-adt.ts:191-259`).
- **Durum:** **Tam Doğru (%100 Mevzuat Uyumlu).**

### 2.2 4735 Sayılı Kanun m.8 Yapım İşleri Fiyat Farkı Motoru
- **Modül:** `src/lib/price-escalation.ts` (Satır `1–283`) · **Test:** `src/lib/calculators/price-escalation.test.ts`
- **Doğrulama:**
  - 2013/5217 sayılı Bakanlar Kurulu Kararı ve 2025/10132 değişikliklerine uygun olarak $F = A_n \times B \times (P_n - 1)$ formülü, $B = 0,90$ sabit katsayısı ve $\sum w_i = 1,00$ ($\pm 0,001$ tolerans) ağırlık kontrolü doğru uygulanmaktadır (`src/lib/price-escalation.ts:155-215`).
  - ÇŞB 2026 kitabındaki **21 resmî TÜİK alt endeks kodu** (`YI-UFE`, `16`, `19.20`, `22`, `23.1`..`23.6`, `24.1`..`24.4`, `25`, `27`, `28`, `ASGARİ_UCRET` vb.) eksiksiz tanımlanmıştır (`src/lib/price-escalation.ts:31-55`).
- **Tespit Edilen Eksik/Geliştirme Noktası (`GAP-04`):** Fiyat Farkı Esasları m.6 uyarınca **iş programının gerisinde kalınan (cezalı) dönemlerde** uygulama ayı endeksi ile iş programına göre gerçekleştirilmesi gereken ayın endeksinden **düşük olanının** ($\min(G_{\text{program}}, G_{\text{uygulama}})$) alınması kuralı ve **avans mahsubu düşümü** henüz motorda modellenmemiştir.

### 2.3 Kat Karşılığı Arsa Payı, Müteahhit Kârı ve 6306 KDV Motoru
- **Modül:** `src/lib/kat-karsiligi.ts` (Satır `1–240`) · **Test:** `src/lib/kat-karsiligi.test.ts`
- **Doğrulama:**
  - **5359 ve 7346 sayılı Cumhurbaşkanı Kararları (01.04.2022 sonrası ruhsatlar):** Konut teslimlerinde kademeli (dilimli/marginal) KDV uygulanmaktadır. `konutKdv` (`src/lib/kat-karsiligi.ts:76-86`) fonksiyonu net alanı $150\text{ m}^2$ üzerindeki konutlarda ilk $150\text{ m}^2$'lik dilimi `%1` (6306 kentsel dönüşüm) veya `%10` (genel), aşan kısmı ($\text{netArea} - 150$) ise `%20` üzerinden dilimli olarak doğru hesaplamaktadır. Ticari bağımsız bölümler doğrudan `%20` KDV'ye tabidir.
  - **VUK m.267 (İkinci Sıra — Maliyet Bedeli Esası) & KDV Genel Uygulama Tebliği (I/B-8.2):** Arsa sahibine bırakılan bağımsız bölümler için birim inşaat maliyeti üzerine toptan satışta `+%5`, perakende satışta `+%10` emsal kâr marjı (`emsalRate`) eklenerek KDV matrahı doğru oluşturulmaktadır (`src/lib/kat-karsiligi.ts:140-157`).
- **Durum:** **Tam Doğru (%100 Mevzuat Uyumlu).**

### 2.4 YAMBİS Yetki Belgesi Sınıflandırma Motoru (RG 30702 / 31301 / 32330)
- **Modül:** `src/lib/yambis-classification.ts` (Satır `1–290`) · **Test:** `src/lib/yambis-classification.test.ts`
- **Doğrulama:**
  - 2 Ekim 2020 tarihli (RG 31301) değişiklikle genişletilen **14 yetki belgesi grubu** (`A, B, B1, C, C1, D, D1, E, E1, F, F1, G, G1, H`) ve 2026 yılı III. ve IV. Sınıf yapı yaklaşık birim maliyetlerinin ortalaması ($27.516,67\text{ TL/m}^2 \times 45.000\text{ m}^2 = 1.238.250.000\text{ TL}$ Yapı Sınır Bedeli) doğru kodlanmıştır (`src/lib/yambis-classification.ts:28-82`).
  - Ekonomik ve mali yeterlik oranları (Cari Oran $\ge 0,75$, Öz Sermaye Oranı $\ge 0,15$, Kısa Vadeli Banka Borçları / Öz Sermaye $< 0,75$, Banka Referans Mektubu $\ge \%5$, Ciro şartı `E/E1` için `%10`, `D1..A` için `%15`) ve `G/G1/H` gruplarının mali yeterlik muafiyeti Yönetmelik m.12–16 ile birebir örtüşmektedir.
- **Durum:** **Tam Doğru (%100 Mevzuat Uyumlu).**

### 2.5 Pre-BIM İmar Fizibilite & 2026 Villa Maliyet Dağılım Motoru
- **Modül:** `src/lib/pre-bim-feasibility.ts` (Satır `1–260`) · **Test:** `src/lib/pre-bim-feasibility.test.ts`
- **Doğrulama:**
  - Planlı Alanlar İmar Yönetmeliği m.5/8 ve m.22 uyarınca emsal harici alanların toplam emsal alanının `%30`'unu aşamaması (`MAX_EMSAL_EXEMPT_RATIO = 0.30`), TAKS, KAKS ve kat adedi kontrolleri doğru çalışmaktadır (`src/lib/pre-bim-feasibility.ts:168-235`).
  - 27 imalat kalemli 2026 piyasa referans dağılımı (`VILLA_MARKET_COST_BENCHMARK_2026`, toplam `4.135.752,77 TL`, toplam pay `%100,00`) tutarlıdır.

### 2.6 SmartCheck Minha, TS 500 Kesişim, 3×3 Tolerans ve RG 33331 e-PYS Motorları
- **Modüller:** `src/smartcheck/rules/minha.ts`, `src/smartcheck/rules/three-by-three.ts`, `src/smartcheck/rules/epys.ts`, `src/smartcheck/rules/iso19650.ts`
- **Doğrulama:**
  - **Minha Kuralları:** `CSB_2026` ($0,50\text{ m}^2$ boşluk eşiği + denizlik/lento/söve geri dönüş eklemesi), `DIN_18350` ($2,50\text{ m}^2$ eşiği) ve `CUSTOM_CONTRACT` profilleri ile TS 500 döşeme–kiriş–kolon düğüm noktası mükerrer hacim düşümü matematiksel olarak doğrudur.
  - **3×3 Kuralları:** Şirket kalite politikası olan $\le \%3,00$ QTO sapma toleransı ve TS 500 Çizelge 9.3 paspayı eşikleri (döşeme $15\text{ mm}$, iç kolon/kiriş $20\text{ mm}$, dış cephe/temel $25\text{ mm}$, Eurocode 2 XC3 $35\text{ mm}$) doğru çalışmaktadır. *(Not: `ACI_318` seçildiğinde kural bilerek pas geçilmektedir).*
  - **RG 33331 e-PYS & ISO 19650-2:** EK-1..EK-7 ve EK-9 Tablo 9.1 (Mimari 21 satır) / Tablo 9.2 (Diğer Disiplinler 16 satır) kontrolleri gerçek IFC/PDF çıkarım bayraklarına bağlanmıştır; kanıt bulunmayan maddeler sahte `PASS` üretmek yerine dürüstçe `MANUAL_REVIEW` olarak işaretlenmektedir.

---

## 3. Kod Tabanında Tespit Edilen Somut BUG Raporu (6 Adet)

### `BUG-01` [YÜKSEK ÖNCELİK] — `"Gazbeton"` / `"Gaz beton"` Malzemesinin `"beton"` Alt-Dizgisi Nedeniyle C30/37 Betonarme Olarak Yanlış Sınıflandırılması
- **Konum:** `src/ifc/structural-material.ts:21-58`
- **Kök Neden:**
  ```ts
  const CONCRETE_PATTERN = /beton|concrete/i;
  const MASONRY_PATTERN = /tuğla|tugla|briket|ytong|bims|gazbeton|gaz beton|masonry|brick|block/i;
  ```
  `classifyStructuralMaterial()` fonksiyonunda `allConcrete` kontrolü `allMasonry` kontrolünden **önce** (satır 54 vs satır 57) çalışmaktadır. `"Gazbeton"` ve `"Gaz beton"` kelimeleri içinde `"beton"` alt-dizgisi geçtiği için `CONCRETE_PATTERN.test("Gazbeton")` **`true`** döndürmektedir!
- **Etki:**
  1. Malzemesi `"Gazbeton"` veya `"Gaz beton"` olan tüm `IfcWall` elemanları kâgir duvar (`kind: "masonry"`, Poz `15.225.1004` — $2.950\text{ TL/m}^3$) yerine **C30/37 Betonarme (`kind: "concrete"`, Poz `15.150.1006` — $3.450\text{ TL/m}^3$)** olarak sınıflandırılmakta ve birim fiyatı `%16,9` fazla hesaplanmaktadır.
  2. `parseConcreteClass("Gazbeton")` `null` döndürdüğü ve `concreteClassDiffers(null)` `false` döndürdüğü için kullanıcıya hiçbir beton sınıfı uyarısı da gösterilmemektedir.
  3. Bir döşeme veya kirişe yanlışlıkla `"Gazbeton"` malzemesi atanmışsa, `unplaced` (kapsam dışı) olması gerekirken betonarme icmaline dahil edilmektedir.
- **Önerilen Çözüm:** `CONCRETE_PATTERN` içinde `gaz\s*beton` dışlanmalı (`/^(?!.*gaz\s*beton).*(?:beton|concrete)/i`) veya `hasMasonry` kontrolü `allConcrete` kontrolünden önce değerlendirilmelidir.

### `BUG-02` [ORTA-YÜKSEK ÖNCELİK] — Statik Örnek Projesinde (`st-statik-tablo-9-2`) Taşıyıcı Perde ve Koruma Betonunun İcmal Dışı / Yanlış Fiyatlı Kalması
- **Konum:** `src/ifc/calm-icmal.ts:512-556` ve `src/smartcheck/sample-projects.ts:1098-1146`
- **Kök Neden:**
  1. `st-statik-tablo-9-2` örnek projesinin 2. satırında `rawDescription: "IfcWall · ST-DVR-perde_20cm (Dış Cephe Taşıyıcı Perde — Paspayı Kontrolü)"` ve `rawPositionCode: "15.150.1005"` yer almaktadır; `formulaJson` içinde `materialLayers` dizisi yoktur.
  2. `parseSmartCheckRowToPseudoElement()` (`src/ifc/calm-icmal.ts:535`) `materialLayers` bulunmadığında `[desc]` dizisini malzeme katmanı olarak atar. Ancak açıklama metninde `"beton"` kelimesi geçmediği (`"Taşıyıcı Perde"` yazdığı) için `classifyStructuralMaterial("IfcWall", [desc])` bunu `kind: "unplaced"` olarak reddeder!
  3. Aynı örnek projenin 3. satırındaki `IfcCovering · ST-KPL-koruma_betonu` (`rawPositionCode: "15.390.1002"`) için `coveringPredefinedType` atanmadığından `findCoveringRule()` (`src/ifc/calm-icmal.ts:451-465`) eşleşmez ve `cleanExplicitPoz` geri dönüşü (fallback) ile $980\text{ TL/m}^2$ yerine jenerik $450\text{ TL/m}^2$ birim fiyatla fiyatlandırılır.
- **Etki:** Kullanıcı arayüzünde resmi Statik örnek projesi (`st-statik-tablo-9-2`) açıldığında dış cephe betonarme perde duvar icmale girmeyip "Eşleştirilemeyen / Kapsam Dışı Eleman" olarak düşmektedir.

### `BUG-03` [ORTA ÖNCELİK] — Dayanım Sınıfı Belirtilmemiş Betonların ve Grobeton / Şap Betonunun Uyarı Üretmeden C30/37 Betonarmeye (`15.150.1006`) Atanması
- **Konum:** `src/ifc/structural-material.ts:23-42, 61-65` ve `src/ifc/calm-icmal.ts:784-799`
- **Kök Neden:** `concreteClassDiffers(concreteClass)` fonksiyonu `if (!concreteClass) return false;` satırı nedeniyle, malzemesi sadece `"Beton"`, `"Grobeton"`, `"Eğim Betonu"` veya `"C 25/30"` (`C` harfinden sonra boşluk bırakılmış) olan elemanlarda `concreteClass = null` döndüğünde **fiyat farkı uyarısı (`CONCRETE_CLASS_DIFFERS`) üretmemektedir**.
- **Etki:** Dayanım sınıfı yazılmamış betonlar veya C16/20 grobeton katmanları sessizce C30/37 yapısal betonarme ($3.450\text{ TL/m}^3$) olarak fiyatlandırılmaktadır.

### `BUG-04` [ORTA ÖNCELİK] — Tarayıcı İçi IFC Ayrıştırıcısı (`legacy-parser.ts`) ile Sunucu Python Ayrıştırıcısı (`ifc_extract.py`) Arasında Büyük Kapsam Farkı
- **Konum:** `src/ifc/parser/legacy-parser.ts:108-215` vs `workers/ifc/ifc_extract.py:46-120`
- **Kök Neden:**
  - `legacy-parser.ts` (satır 108) yalnızca `IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCWALLELEMENTEDCASE|IFCREINFORCINGBAR` varlıklarını yakalar; `IfcCovering`, `IfcStair`, `IfcStairFlight`, `IfcCurtainWall` varlıklarını görmezden gelir, `IfcRelAggregates` alt parçalarını bastırmaz ve üretilen `ParsedIfcElement` nesnelerine `materialLayers` dizisini bağlamaz.
  - Ayrıca yerel git deposunda henüz uzak sunucuya (origin) itilmemiş `fix/ifc-browser-quota-alert` (`b9153eb`) dalında tespit edildiği üzere, e-postası doğrulanmamış veya aboneliği olmayan kullanıcıların tarayıcı analizleri `/api/ifc/browser-analyses` uç noktasından `403` aldığında sessizce kaybolabilmektedir.
- **Etki:** Sunucu worker'ı yerine tarayıcı önizlemesi üzerinden `CalmIfcWorkspace` çalıştırıldığında elemanlarda `materialLayers` bulunmadığı için tamamı `MISSING_MATERIAL` gerekçesiyle icmal dışına düşmektedir.

### `BUG-05` [DÜŞÜK-ORTA ÖNCELİK] — Mükerrer (Duplicate) `GlobalId` Bulunan IFC Modellerinde Kapsam Dışı Elemanların Tekilleştirme (`Set`) Sırasında Yutulması
- **Konum:** `src/ifc/calm-icmal.ts:838-845`
- **Kök Neden:** Python worker (`ifc_extract.py`) mükerrer GUID'li elemanları bilerek korurken, `calm-icmal.ts` içinde `seenUncoveredGuids = new Set(baseReport.uncoveredElements.map((u) => u.globalId))` yalnızca `globalId` anahtarıyla tekilleştirme yaptığı için aynı GUID'e sahip ikinci kapsam dışı elemanı (`mergedUncovered`) düşürmektedir.

### `BUG-06` [DÜŞÜK ÖNCELİK] — PDF e-İmza (`/Sig`) Sayfa Anotasyon Taramasının İlk 20 Sayfa ile Sınırlandırılması
- **Konum:** `workers/ifc/pdf_preflight.py:112`
- **Kök Neden:** `_has_esignature()` fonksiyonu kök `/AcroForm/Fields` ağacını tam taramakta, ancak sayfa bazlı `/Annots` içindeki `/Sig` kontrollerinde `for page in reader.pages[:20]:` dilimlemesi yapmaktadır. 20 sayfayı aşan statik/mekanik hesap raporlarında son sayfada yer alan sayfa-bazlı imza anotasyonları kaçırılabilir.

---

## 4. Fonksiyonel ve Operasyonel GAP (Eksiklik) Raporu (8 Adet)

| Kod | Alan | Mevcut Durum | Eksiklik (GAP) | Öncelik |
| :--- | :--- | :--- | :--- | :--- |
| **`GAP-01`** | **ÇŞB 2026 Poz Kataloğu & Poz Kapsamı** | Yerleşik tohum katalog (`csb-2026-seed.json`) yalnızca **103 örnek poz** içeriyor; tam katalog BYOL (kullanıcı XLSX yüklemesi) bekliyor. Sakin İcmal (`calm-icmal.ts`) ise yalnızca **7 çekirdek poza** (`15.150.1006`, `15.225.1004`, `15.390.1002`, `15.415.1201`, `15.275.1101`, `15.540.1201`, `15.390.1101`) otomatik yerleştiriyor. | Mimari/İnşaat projelerinde sık kullanılan kapı (`IfcDoor`), pencere (`IfcWindow`), korkuluk (`IfcRailing`), çatı (`IfcRoof`), temel (`IfcFooting`), su/ısı yalıtımı ve asma tavan kalemleri için otomatik poz eşleme kuralları henüz yok (`out_of_scope` olarak ayrılıyor). | **P0** |
| **`GAP-02`** | **Beton Dayanım Sınıfına Göre Dinamik Poz Seçimi** | `structural-material.ts` içindeki `parseConcreteClass()` `C25/30`, `C35/45` vb. sınıfları başarıyla ayrıştırıyor ancak `calm-icmal.ts` tamamını tek bir poza (`15.150.1006` — C30/37) yerleştirip sadece uyarı üretiyor. | Tohum katalogda zaten mevcut olan `15.150.1005` (C25/30) veya C35/45 pozlarına dinamik yönlendirme yapılmalı; uyarı yalnızca katalogda karşılığı olmayan sınıflar için üretilmeli. | **P0** |
| **`GAP-03`** | **Gerçek Hakediş (Ara Hakediş / Yeşil Defter / Ataşman) Döngüsü** | Platformda ihale öncesi keşif, teklif ve tek dönemlik 4735 fiyat farkı hesabı mevcut. | Türkiye pazarındaki OSKA/AMP standardı olan **Kümülatif Ara Hakediş (Hakediş No 1..N), Yeşil Defter, Metraj İcmali, Mukayeseli Keşif (İş Artışı/Eksilişi) ve Kesin Hesap** tabloları henüz mevcut değil. | **P1** |
| **`GAP-04`** | **4735 Fiyat Farkı Cezalı Çalışma & Avans Mahsubu** | `price-escalation.ts` temel $F = A_n \times B \times (P_n - 1)$ formülünü hesaplıyor. | İş programına göre gecikilen (cezalı) aylarda $\min(\text{Endeks}_{\text{program}}, \text{Endeks}_{\text{uygulama}})$ karşılaştırması ve avans mahsubu düşümü eksik. | **P1** |
| **`GAP-05`** | **Uzman Doğrulaması (`L2 -> L3` Kanıt Kapısı)** | `src/capabilities/registry.ts:50-71` içindeki tüm canlı ve pilot yetenekler `L1` veya `L2` seviyesinde (`reviewer: null`). | İnşaat mühendisi / mimar / YMM imzalı altın örnek doğrulaması (`L3`) henüz hiçbir modüle eklenmediği için kurumsal ihale şartnamelerinde "bağımsız doğrulanmamıştır" şerhi zorunlu kalıyor. | **P1** |
| **`GAP-06`** | **EKAP Açılış Tutanağı & KİK Savunma Dosyası** | `kik-adt.ts` sınır değeri ve `%80` Pareto iş kalemlerini hesaplıyor. | EKAP ihale açılış tutanağı (PDF/XLSX) otomatik ayrıştırma ve proforma fatura / analiz formatında resmi KİK aşırı düşük savunma paketi çıktısı henüz yok (`roadmap`). | **P2** |
| **`GAP-07`** | **Sunucu Tarafı PDF/A-2b Dönüştürme & 3B Görsel Önizleme** | `pdf_preflight.py` yalnızca üstveri ve `/Sig` ön kontrolü yapıyor; IFC tarafında ise metin/tablo tabanlı Sakin İcmal sunuluyor. | Ghostscript/veraPDF ile gerçek PDF/A-2b dönüştürme ve tarayıcıda seçilen kapsam dışı elemanı (`globalId`) 3B model üzerinde vurgulayan hafif bir WebGL/IFC görüntüleyici eksik. | **P2** |
| **`GAP-08`** | **Canlı Ortam (Coolify) Dağıtım ve Otomasyon Kayması** | Git deposu `Rev. 39` seviyesinde; `fix/ifc-browser-quota-alert` yerel dalda bekliyor. | Canlı ortam (`bimmetraj.com`) `Rev. 35`'te kalmış durumda; Coolify GitHub App/SSH anahtarı ve otomatik healthcheck rollback hattı henüz tamamlanmamış. | **P0** |

---

## 5. SEO ve GEO (Generative Engine Optimization) Denetim Raporu

| Kod | Kategori | Konum | Bulgu ve Etki | Çözüm Önerisi |
| :--- | :--- | :--- | :--- | :--- |
| **`SEO-01`** | **JSON-LD vs. Gerçeklik Kapısı Kayması (Kritik)** | `index.html:63, 90` vs `src/capabilities/registry.ts:154-166` | `index.html` satır 63 ve 90'daki JSON-LD içinde *"WIP/SHARED/PUBLISHED/ARCHIVED CDE durum geçiş doğrulaması ... destekler"* denmektedir. Oysa `registry.ts` ve `llms.txt` içinde tam CDE durum geçişinin **henüz uygulanmadığı (Faz 2 yol haritasında olduğu)** açıkça yazılıdır. Arama motorları ve AI ajanları çelişkili yapısal veri okumaktadır. | `index.html` satır 63 ve 90'daki JSON-LD metinlerini `route-meta.ts` ve `registry.ts` ile birebir hizalayın. |
| **`SEO-02`** | **JSON-LD Katalog Büyüklüğü İddiası Kayması** | `index.html:66` vs `src/capabilities/registry.ts:193-198` | `index.html` satır 66'da `SoftwareApplication.featureList` içinde *"ÇŞB 2026 18.848 Satır (6 Resmi Kitap) Birim Fiyat/Rayiç Kataloğu"* yazmaktadır; yerleşik tohumun 103 poz olduğu ve tam kataloğun BYOL ile yüklendiği belirtilmemiştir. | İfadeyi *"ÇŞB 2026 103 Poz Örnek Tohum + Kendi Lisansını Getir (BYOL) XLSX Katalog İçe Aktarımı"* olarak güncelleyin. |
| **`SEO-03`** | **Sabit (`Hardcoded`) Sitemap `lastmod` Tarihi** | `src/server/security/web-hardening.ts:112` | `sitemapXml()` tüm sayfalar için sabit `const lastmod = '2026-10-18';` döndürmektedir. | `lastmod` değerini `CALC_REVIEW_META` / `CAPABILITY_REGISTRY_VERSION` tarihinden veya sunucu derleme zamanından dinamik üretin. |
| **`SEO-04`** | **`PUBLIC_APP_URL` Eksikliğinde SEO/GEO Kapanması** | `src/server/app.ts:245-275` | Ortam değişkenlerinde `PUBLIC_APP_URL` unutulursa `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt` `404` dönmekte ve `injectRouteMeta()` devre dışı kalmaktadır. | `PUBLIC_APP_URL` tanımlı olmadığında varsayılan olarak `https://bimmetraj.com` geri dönüşü (fallback) kullanın. |
| **`SEO-05`** | **Hesaplayıcı ve Sözlük Rotalarında Özel JSON-LD Eksikliği** | `src/server/security/route-meta.ts:201-246` | En yüksek organik arama hacmine sahip `/hesaplayicilar/kik-asiri-dusuk-teklif`, `/hesaplayicilar/fiyat-farki-4735` ve `/bim-sozlugu` sayfalarında sayfaya özel `BreadcrumbList`, `DefinedTermSet` veya `HowTo` JSON-LD şeması bulunmamaktadır. | `injectRouteMeta` içine `/bim-sozlugu` için `DefinedTermSet` (12 terim) ve hesaplayıcılar için `BreadcrumbList` + `SoftwareApplication` alt şeması ekleyin. |
| **`GEO-01`** | **AI Bot Yönergeleri ve `llms.txt` Keşfedilebilirliği** | `src/server/security/web-hardening.ts:117-120`, `index.html:16-20` | `robots.txt` içinde `OAI-SearchBot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` için açık izin blokları yok; `index.html` içinde `<link rel="alternate" type="text/plain" href="/llms.txt" />` etiketi bulunmuyor. | `robots.txt` ve `index.html` `<head>` içine `llms.txt` / `llms-full.txt` referanslarını ve AI arama botu kurallarını ekleyin. |
| **`GEO-02`** | **`<noscript>` Gövdesi vs. Readability/RAG Kazıyıcıları** | `src/server/security/route-meta.ts:159-170` | Sunucu metni `<noscript><main>...</main></noscript>` içine gömülmektedir. Birçok RAG/AI içerik çıkarıcısı (Trafilatura, Readability.js) HTML ayrıştırırken `<noscript>` etiketlerini tamamen siler. | `<noscript>` yerine, `<div id="root">...</div>` içine sunucu tarafında semantik ön-render HTML basıp React yüklenince üzerine bindirmek AI alıntılanma oranını ciddi artıracaktır. |
| **`GEO-03`** | **Bölgesel (Local/GEO) ve Çok Dilli (`hreflang`) Sinyaller** | `index.html:27-51` | `Organization` şemasında yalnızca `"addressLocality": "İstanbul", "addressCountry": "TR"` mevcuttur; `"areaServed": "TR"` ve `"knowsAbout"` dizisi ile global hedef pazarlar (DACH / DIN 18350, UK / RICS) için İngilizce özet sayfası henüz yoktur. | `Organization` ve `SoftwareApplication` şemalarına `"areaServed": "TR"` ve `"knowsAbout"` teknik terim dizisini ekleyin. |

---

## 6. Türkiye ve Global Piyasa Rakip Karşılaştırma Analizi

| Kriter / Yetenek | **BIMMetraj (TeklifPro)** | **OSKA (OSKABULUT / HakedişPlus)** | **AMP Yazılım (Kurumsal)** | **BEXEL Manager** | **RIB CostX** | **Autodesk Takeoff / Kreo** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mimari & Kurulum** | **%100 Web / Bulut-Yerli (SaaS)** | Masaüstü + Bulut (Hibrit) | Ağırlıklı Masaüstü + Web araçları | Masaüstü ağırlıklı (Enterprise) | Masaüstü / Sunucu | %100 Bulut (SaaS) |
| **Doğrudan IFC (2x3 / 4 / 4.3) QTO** | **Yerleşik (IfcOpenShell + Katmanlı `IfcCovering`)** | Harici CAD/Allplan eklentisiyle | Zayıf / Harici aktarımla | **Çok Güçlü (3D/4D/5D/6D)** | **Çok Güçlü (2D + 3D BIM)** | **Güçlü (3D + AI 2D)** |
| **5 Ağustos 2026 RG 33331 e-PYS & EK-9 Ön Kontrolü** | **Var (Tablo 9.1 / 9.2 + PDF/A + `/Sig`)** | Yok | Yok | Yok (Genel IDS/bSDD var) | Yok | Yok |
| **ÇŞB 2026 & Kamu Birim Fiyatları** | **103 Tohum + BYOL XLSX (SHA-256)** | **Tam Resmi Katalog (18.800+ Poz, Tüm Kurumlar)** | **Tam Resmi Katalog (Tüm İdareler)** | Yok (Manuel yüklenir) | Yok (Manuel yüklenir) | Yok |
| **4734 KİK ADT & 4735 Fiyat Farkı** | **Var (Tebliğ 45.1.1 + %80 Pareto + 4735)** | **Çok Güçlü (Tam EKAP + Savunma + Cezalı FF)** | **Çok Güçlü (Tam EKAP + Savunma + Cezalı FF)** | Yok | Yok | Yok |
| **Taşeron Koruma Kalkanı & Kat Karşılığı (6306 KDV)** | **Var (`IfcZone` Daire Cetveli + 6306 Dilimli KDV)** | Kısmi (Geleneksel metrajla) | Kısmi | Yok | Yok | Yok |
| **Ara Hakediş, Yeşil Defter & Kesin Hesap** | **Eksik (`GAP-03`)** | **Sektör Standardı (Tam)** | **Sektör Standardı (Tam)** | İlerleme bazlı (Uluslararası) | Workbook bazlı | Yok / ACC Cost ile |
| **Kanıt Disiplini (Açık Formül + Kapsam Dışı Raporu)** | **Çok Yüksek (Sakin İcmal + L1..L4 Kanıt Kapısı)** | Orta (Kara kutu raporlar) | Orta | Yüksek | Yüksek (Canlı Workbook) | Orta |

---

## 7. Önerilen 4 Aşamalı Uygulama Planı (Ara Sonrası Başlangıç Sırası)

### Aşama 1: Acil Kod ve Canlı Ortam Düzeltmeleri (`Rev. 40` — 1–3 Gün)
1. **`BUG-01` ve `BUG-03` Çözümü (`src/ifc/structural-material.ts`):** `"Gazbeton"` / `"Gaz beton"` alt-dizgi çakışmasını düzeltin; dayanım sınıfı belirtilmemiş betonlarda (`concreteClass === null`) veya `"Grobeton"` ifadelerinde sessizce C30/37 atamak yerine uyarı (`CONCRETE_CLASS_DIFFERS` / grobeton ayrımı) üretin.
2. **`BUG-02` ve `GAP-02` Çözümü (`src/ifc/calm-icmal.ts` & `src/smartcheck/sample-projects.ts`):** `st-statik-tablo-9-2` örnek projesindeki perde duvar ve koruma betonu satırlarına açık `materialLayers` ve `coveringPredefinedType` ekleyin; `calm-icmal.ts` içinde tohum katalogda yer alan C25/30 (`15.150.1005`) pozunu dinamik olarak destekleyin.
3. **`SEO-01` ve `SEO-02` Çözümü (`index.html`):** Statik JSON-LD içindeki CDE durum geçişi ve 18.848 satır katalog iddiasını `src/capabilities/registry.ts` ile %100 uyumlu hale getirin.
4. **Coolify Canlı Dağıtımı (`GAP-08`):** `Rev. 36–39` değişikliklerini ve `fix/ifc-browser-quota-alert` dalını birleştirip `bimmetraj.com` canlı ortamını güncelleyin.

### Aşama 2: Çekirdek Ürün Derinleştirme (2–4 Hafta)
1. **7 Pozdan 40+ Çekirdek Poza Geçiş (`GAP-01`):** `calm-icmal.ts` deterministik poz eşleştiricisine `IfcDoor`, `IfcWindow`, `IfcRailing`, `IfcRoof`, `IfcFooting`, ısı/su yalıtımı, asma tavan ve grobeton kurallarını ekleyin.
2. **Tarayıcı ve Sunucu IFC Ayrıştırıcı Birleşimi (`BUG-04`):** `legacy-parser.ts` ile `ifc_extract.py` arasındaki şema farkını kapatın; tarayıcı önizlemesinde de `IfcCovering` ve `materialLayers` desteğini sağlayın.
3. **4735 Cezalı Çalışma & Avans Mahsubu (`GAP-04`):** Fiyat farkı motoruna iş programı gecikme endeks karşılaştırmasını ($\min(E_{\text{program}}, E_{\text{uygulama}})$) ekleyin.

### Aşama 3: Kurumsal Güven & SEO/GEO Büyüme Kaldıraçları (1–2 Ay)
1. **İlk `L3` Uzman Onayları (`GAP-05`):** En az 3 çekirdek modül (KİK m.38 ADT, 4735 Fiyat Farkı, Minha/Sakin İcmal) için oda sicil numaralı bir inşaat mühendisi / teknik müşavir imzasıyla altın örnek doğrulaması alıp `registry.ts` içinde ilk `L3` rozetlerini açın.
2. **Ücretsiz Hesaplayıcı Kümesini Genişletme:** Halihazırda kod tabanında çalışan **YAMBİS Yetki Belgesi (`yambis-classification.ts`)**, **6306 Kat Karşılığı KDV (`kat-karsiligi.ts`)** ve **İmar / TAKS-KAKS Fizibilite (`pre-bim-feasibility.ts`)** modüllerini de ücretsiz halka açık SEO sayfaları olarak devreye alın.

### Aşama 4: OSKA/AMP Bariyerini Aşan Hakediş & Global Kural Paketleri (2026 Q4 – 2027)
1. **Yeşil Defter & Ara Hakediş İhracı (`GAP-03`):** IFC metraj cetvelini tek tıkla standart "Yeşil Defter + Metraj İcmali + Mukayeseli Keşif" Excel şablonuna (OSKA/AMP içe aktarım formatlarıyla uyumlu) dönüştürün.
2. **Global Modüler Kural Paketleri (`Rule-Pack`):** `CSB_2026` yanındaki `DIN_18350` (DACH/Almanya VOB/C) ve `NRM2` (İngiltere RICS) paketlerini bağımsız dil/mevzuat profilleri haline getirerek global openBIM pazarına açılın.
