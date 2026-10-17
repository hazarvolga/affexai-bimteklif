# Uzman Mühendis Melih Dinekli Saha Geri Bildirimi ve Stratejik/Teknik Uygulama Planı (17 Ekim 2026)

- **Tarih:** 17 Ekim 2026 (`2026-10-17T16:18+03:00`)
- **Katılımcılar:** Hazar Volga Ekiz & Melih Dinekli (ALLPLAN / BIM & Saha Uygulama Uzmanı, Teknik Komisyon Üyesi)
- **Kapsam:** İlk gönderilen PDF/IFC doğrulama paketi ve Allplan Excel tabloları üzerinden gerçek şantiye, ihale, kat karşılığı ön teklif ve taşeron hakediş süreçlerinin değerlendirilmesi.
- **Sözlük / Transkript Notu:** Ses kaydı dökümünde geçen *"Open"* ve *"tren"* ifadeleri **Allplan**, *"Aşın"* ifadesi **Archicad**, *"ikinci TAKS 2.0"* ifadesi ise **KAKS / Emsal 2,0** anlamındadır.

---

## 1. Ses Kaydından Çıkarılan 6 Temel Saha Tespiti (Kayıp Olmaması İçin Tam Kayıt)

### Tespit 1 — "IFC Dosyasında Hangi Veri Varsa Onu Okuyor": Allplan (TÜRKSERT) vs. Revit / Archicad Farkı
1. **Allplan'ın TÜRKSERT / TÜV SÜD Kanıtı:**
   - Allplan, kesin doğru metraj alan bir yazılım olarak **TÜRKSERT / TÜV sertifikasını 13 kez üst üste** almış tek BIM yazılımıdır.
   - Nedeni: Allplan **obje bazlı (object-based)** ve **eleman/oda hakimiyeti (priority-based automatic deduction / otomatik minha)** mantığıyla çalışır.
2. **Revit'te %90 Kullanıcının Düştüğü Kaba Yapı Hatası (Kolon–Kiriş 5 cm İç İçe Çizim):**
   - Revit'te doğru metraj çıkması için çizen kişinin Revit'i çok üst düzeyde bilmesi ve tüm birleşimleri (*Join Geometry*) eksiksiz tanımlaması gerekir; sahada kullanıcıların **%90'ı buna dikkat etmez**.
   - **Somut Örnek:** Çizim yapan kişi hızlı çizmek için kirişi kolonun içine **5 cm fazla** uzattığında, Allplan bunu hakimiyet kuralıyla otomatik düşerken Revit otomatik minhayı yapmaz. Sonuçta kirişin kolon içine giren 5 cm'lik kısmı mükerrer sayılarak IFC'deki beton metrajı **yanlış (fazla)** çıkar.

---

### Tespit 2 — Kalıp Metrajında "İnsan Gözünün Gördüğü Yüzey" (Net Görünür Yüzey) Sorunu
1. **Mühendislik Kuralı:**
   - Kolon, kiriş ve döşeme kalıp metrajında tüm geometrik yüzeyler değil, **beton dökülürken kalıp tahtasının/panelinin değdiği, insan gözünün gördüğü açık yüzey** (ör. oda içindeki kirişin alt tabanı + döşeme altında kalan sarkık yan kenarları) hesaplanır.
2. **Allplan vs. Revit (Family) Davranışı:**
   - Allplan obje bazlı çalıştığı ve yerleşik kalıp raporlarına sahip olduğu için kirişin döşeme ile birleşen üst kısmını ve kolon birleşim kesitlerini otomatik düşerek net kalıp yüzeyini verir.
   - Revit ise **Family (aile)** mantığıyla çalıştığı için kalıp metrajını doğru almak adına kullanıcının **her bir kirişin alt ve yan yüzeyine tek tek tıklaması (*Paint / Face* seçimi)** veya özel bir Dynamo/Python scripti çalıştırması gerekir.
   - Yüzlerce/binlerce eleman olan bir projede hiçbir kullanıcı hangi yüzeye tıkladığını takip edemez, unutur ve Revit kaynaklı IFC'den doğrudan okunan yüzey alanı **hatalı kalıp metrajı** üretir.

---

### Tespit 3 — En Pahalı Kısım Olan İnce Yapıda %10–15 Metraj Hatası ($10\text{ m} \rightarrow 9{,}96\text{ m}$ Sıva–Parke Çakışması)
1. **Çok Katmanlı İnce Yapı Modelleme Zorluğu:**
   - Bir odada döşeme kaplaması (ör. **şap + yalıtım + parke**), duvar kaplaması (**kaba sıva + alçı + boya/fayans**) ve tavan kaplaması bulunur.
   - **Allplan'da:** Tek bir **Oda (`IfcSpace` / Room)** komutundan katman isimleri ve kalınlıkları girilir; oda içi **hakimiyet (priority)** özelliği sayesinde (Allplan 2026 sürümünde daha da geliştirildi) tüm katmanlar birbirinin alanını bozmadan **kesin doğru** hesaplanır.
   - **Revit'te:** Her katmanı ayrı ayrı çizmek/modellemek gerekir. Çizilse bile ölümcül bir geometrik yan etki oluşur:
     - **Somut Matematiksel Örnek:** $10\text{ m} \times 10\text{ m}$ ($100{,}00\text{ m}^2$) net ölçülerinde bir odada Revit kullanıcısı sağ ve sol duvarlara $2\text{ cm}$ ($0{,}02\text{ m}$) sıva katmanı modellediğinde, döşeme kaplaması (parke/şap) sıva katmanının iç yüzünden sınırlandığı için $10{,}00\text{ m}$ yerine **$9{,}96\text{ m}$** ($9{,}96 \times 9{,}96 = 99{,}20\text{ m}^2$) olarak hesaplanır; ya da tersine döşeme kaplaması kalınlığı duvar metrajını daraltır.
     - Bir konut projesinde yüzlerce oda olduğunda kümülatif ince yapı metrajı **%10 ile %15 arasında yanlış** çıkar.
2. **Melih Bey'in Önerdiği Hibrit Köprü İş Akışı ve Zorunlu Uyarı:**
   - **Zorunlu Uyarı:** BIMMetraj ekranında ve web sitesinde *"IFC'de ne verirse onu hesaplar; ancak Revit'ten doğrudan gelen IFC dosyalarında kaba yapı birleşim, kalıp ve ince yapı katman kalınlığı nedeniyle %10–15 sapma oluşabileceği, Allplan'da ise obje/oda hakimiyetiyle doğru çıktığı"* açıkça yazılmalıdır.
   - **Köprü Çözüm:** Model Revit'te çizilmiş olsa bile **Revit $\rightarrow$ IFC Export $\rightarrow$ Allplan'a Import** edilip ince yapı/oda tanımları Allplan'da tamamlandıktan sonra Allplan'dan alınan IFC **BIMMetraj'a** yüklenirse metraj yeniden %100 doğru hale gelir.

---

### Tespit 4 — İşi Almadan Önce "Ön Teklif" Aşaması: Ortada BIM / IFC Yok, Arsa + TAKS/KAKS + Excel Var!
1. **Pazar ve İhale Gerçeği:**
   - Bir müteahhit yılda **100 ihaleye / kat karşılığı işe** teklif verir, bunların ancak **2–3 tanesini** alabilir.
   - Henüz almadığı iş için müteahhit **proje / IFC çizdirmez**. İşi aldıktan sonra mal sahibi kontrol için veya müteahhit uygulama metrajı için BIM/IFC ister.
2. **Müteahhitlerin Ön Teklifte Çalışma Yöntemi (Excel + İmar Plan Notları):**
   - Müteahhit ön teklifi **Arsa $\text{m}^2$, TAKS, KAKS (Emsal), İmar Yönetmeliği Plan Notları ve Çoklu Parsel Excel tabloları** üzerinden hazırlar.
   - **Somut Örnek:**
     - Arsa alanı $= 1.000\text{ m}^2$
     - Belediye TAKS $= 0{,}40 \implies \text{Taban Oturumu} = 400\text{ m}^2$
     - KAKS / Emsal $= 2{,}0 \implies \text{Emsal İnşaat Alanı} = 2.000\text{ m}^2$ (veya kat adedine göre $800\text{ m}^2$ + bodrum hariç + emsal harici alanlar).
   - Çoklu parsel projelerde (Melih Beylerin kendi sitesi gibi) her parsel ayrı ayrı hesaplanır.
   - **En Çok Aranan Çıktı:** Bu imar ve Excel verisinden hareketle hem müteahhit kendisi için maliyeti hesaplayabilmeli hem de **kat maliklerine hangi dairenin kaç $\text{m}^2$ Brüt ve kaç $\text{m}^2$ Net düşeceğini** şeffafça çıkarabilmelidir.

---

### Tespit 5 — İstanbul $50.000\text{ TL/m}^2$ Birim Maliyetin Gizlenen % Kırılımı ve "+10 $\text{m}^2$ Fazla Vaat / Kaliteden Çalma" Riski
1. **Birim Maliyetin Yüzdesel Dağılımı (% Kaba, % İnce, % Mekanik, % Elektrik, % Peyzaj, % Altyapı):**
   - Müteahhitler bugün İstanbul için örneğin **"$1\text{ m}^2$ inşaat maliyeti $50.000\text{ TL}$"** diyor.
   - Ancak teknik komisyon veya arsa sahibi *"Bu $50.000\text{ TL}$'nin ne kadarı Kaba Yapı, ne kadarı İnce Yapı, ne kadarı Mekanik–Elektrik, ne kadarı Peyzaj ve Altyapı?"* diye sorduğunda müteahhitler kâr marjlarını gizlemek için cevap vermiyor (veya 15–20 yıllık tecrübesi olmayan yeni müteahhit bu yüzdesel dağılımı bilmediği için yanlış teklif veriyor).
   - Sistemde hem **merkezi referans fiyat/yüzde dağılımı** hem de **müteahhidin kendi fiyatlarını/oranlarını girebileceği alan** bulunmalıdır.
2. **Kat Malikini Yanıltan "+10 $\text{m}^2$ Fazla Daire Vaadi" ve Kaliteden/Demirden Çalma Mekanizması:**
   - Bazı müteahhitler işi kapmak için kat maliklerine daire başına gerçekte çıkabilecek alandan **$+10\text{ m}^2$ fazla** vaat ediyor.
   - İşi aldıktan sonra bu $+10\text{ m}^2$'nin maliyetini çıkarmak için **kaliteyi düşürüyor, malzemeden çalıyor, demiri/donatıyı eksik kullanıyor**. Kat maliki bunun farkına varmıyor ama uzman mühendis/komisyon bunu biliyor.
   - Melih Beylerin teknik komisyonu hukuk şartnamesiyle **20 firmadan ön teklif** toplamış ve bu kriterlerle eleme yapıyor.

---

### Tespit 6 — Şantiyede Müteahhiti Koruyan "Daire Bazlı Taşeron Hakediş Kalkanı" ("Daire 3 Sıva / Şap $3\text{ cm}$ – $5\text{ cm}$")
1. **Saha Problemi:**
   - Şantiyede sıvacı, şapçı, boyacı, fayansçı işçiler/taşeronlar fazla hakediş (para) alabilmek için yaptıkları metrajı şişirerek söylerler.
2. **Çözüm ("Daire 3 Sıva Şu Kadar, Daire 3 Şap Şu Kadar"):**
   - Sistemde genel bina toplamının yanında **daire bazında (ör. Daire 3 için) $3\text{ cm}$ ya da $5\text{ cm}$ kalınlığına göre** ne kadar sıva ($\text{m}^2$ ve $\text{m}^3$ harç), ne kadar şap ($\text{m}^2$ ve $\text{m}^3$ harç), ne kadar parke/seramik/boya/süpürgelik çıkacağı tek tek verilmeli ve taşeronun talep ettiği metrajla karşılaştırarak **müteahhiti fazla ödemeye karşı korumalıdır**.

---

## 2. Eksiksiz Uygulama Yol Haritası (Tüm Önerilerin Kodlanması)

| Paket Kodu | Modül & Kapsam | Etkilenen Dosyalar |
|---|---|---|
| **Paket M-1** | **Daire Bazlı Taşeron Hakediş Kalkanı & $2/3/5\text{ cm}$ Sıva–Şap Kalınlık / Harç ($\text{m}^3$) Motoru:** `D01..D16` her daire için Şap, Kaba Sıva, Alçı, Boya, Parke, Seramik, Fayans, Süpürgelik tavan metrajı; $2\text{ cm} / 3\text{ cm} / 5\text{ cm}$ kalınlığa göre harç ($\text{m}^3$) & $50\text{ kg}$ çimento torba hesabı; ustanın/taşeronun beyan ettiği metrajı denetleyen **"Fazla Metraj / Şişirme Alarmı"**. | `src/ifc/apartment-subcontractor-shield.ts`, `src/ifc/apartment-subcontractor-shield.test.ts`, `src/components/smartcheck/CalmIfcWorkspace.tsx`, `src/capabilities/registry.ts` |
| **Paket M-2** | **BIM Yazılımı Kaynak Güvenilirlik & Geometrik Sapma Motoru (`Allplan` TÜRKSERT vs `Revit` Family / Katman Daralması vs `Archicad`):** IFC üstverisinden kaynak yazılım tespiti; Revit modellerinde (1) kolon–kiriş $5\text{ cm}$ girişim hacmi, (2) kalıp 6-yüzey brüt vs görünür net yüzey farkı, (3) ince yapıda $2\text{ cm}$ sıva yüzünden $10\text{ m} \rightarrow 9{,}96\text{ m}$ parke/şap kaybı (%10–15 sapma) analizi ve **Revit $\rightarrow$ IFC $\rightarrow$ Allplan $\rightarrow$ BIMMetraj** doğrulama köprüsü. | `src/ifc/authoring-software-diagnostics.ts`, `src/ifc/authoring-software-diagnostics.test.ts`, `src/components/smartcheck/CalmIfcWorkspace.tsx`, `src/pages/LandingPage.tsx`, `src/capabilities/registry.ts` |
| **Paket M-3** | **IFC Öncesi "Arsa / TAKS–KAKS / Çoklu Parsel / Kat Karşılığı Ön Teklif, $\text{m}^2$ Maliyet % Kırılımı ve $+10\text{ m}^2$ Kaliteden Çalma Riski Motoru" (Excel İçe/Dışa Aktarımlı):** Ortada IFC yokken çoklu parsel Arsa $\text{m}^2$, TAKS, KAKS/Emsal, Plan Notları, Kat Maliki / Müteahhit Daire Brüt–Net $\text{m}^2$ paylaşımı, $50.000\text{ TL/m}^2$ birim maliyetin **% Kaba / % İnce / % Mekanik / % Elektrik / % Peyzaj & Altyapı** kırılımı, $+10\text{ m}^2$ şişirilmiş daire vaadi / kaliteden çalma risk dedektörü ve 20 firma teknik komisyon karşılaştırma Excel şablonu. | `src/lib/pre-bim-feasibility.ts`, `src/lib/pre-bim-feasibility.test.ts`, `src/components/smartcheck/PreBimFeasibilityPanel.tsx`, `src/components/smartcheck/CalmIfcWorkspace.tsx`, `src/pages/SmartCheckImportWorkspace.tsx`, `src/capabilities/registry.ts` |
