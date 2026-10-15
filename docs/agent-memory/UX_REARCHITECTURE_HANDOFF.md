# TeklifPro UX Rearchitecture & Product Handoff
*Tarih: 08.10.2026*

## 1. Ürün Vizyonu ve Hedef Kitle
- **Kullanıcı Profili:** Excel kullanmaya alışkın, BIM jargonuna (IFC, Pset, GUID vb.) uzak olan Türk müteahhitler ve metrajcılar.
- **Tetikleyici Güç:** Çevre ve Şehircilik Bakanlığı'nın yeni e-Proje (IFC 4x3) zorunluluğu. Kullanıcılar ürüne teknoloji tutkusuyla değil, mevzuat zorunluluğu ile geliyor.
- **Tasarım Felsefesi (Buzdağı Modeli):** Tasarım (UI) Apple/Linear gibi premium, modern ve ferah (SaaS kalitesinde) olacak. İş akışı (UX) Excel basitliğinde ve sihirbaz (wizard) mantığında ilerleyecek. Mevcut güçlü altyapı (SmartCheck, 3D Engine) silinmeyecek, ancak sadece "kullanıcının ihtiyacı olduğu anda" zarifçe (slide-over panel, tooltip vb. yollarla) gösterilecek. BIM Academy modülü şimdilik tamamen arka plana (beklemeye) alınacak, sadece çekirdek ürün (Teklif & Metraj) ön plana çıkarılacak.

## 2. Alınan UX/UI Kararları (Buzdağı Yaklaşımı)
1. **Sihirbaz (Wizard) Akışı:** "Dosya Yükle -> Otomatik Hata Kontrolü -> Fiyatlama -> Çıktı" şeklinde tek yönlü, kaybolması imkansız bir akış.
2. **Uçuş Öncesi Kontrol (SmartCheck Revizyonu):** Karmaşık kural ekranları kalkacak. Sistem arka planda dosyayı inceleyecek ve kullanıcıya sadece anlaşılır sonuçlar sunacak (Örn: "Dikkat: 3 Kolonda Bakanlık Pozu Eksik").
3. **Bağlamsal 3D İzleyici:** 3D model ekranı sürekli açık olup ekranı işgal etmeyecek. Yalnızca metraj listesindeki bir kalemin yanındaki "3D'de Gör" ikonuna basıldığında sağdan kayan bir panel (slide-over) olarak açılacak.
4. **Bakanlık Onayı Hissi (Yeşil Tikler):** Sistemin bakanlık formatını (TREpys) tam desteklediğini ve hatasız okuduğunu belirten güven verici yeşil uyarılar ve rozetler eklenecek.

## 3. Geliştirme Sıralaması (Priority List)
1. **Çekirdek Motor Güncellemesi (Backend):** `src/ifc/parser/tr-pset-csb-extractor.ts` dosyasının güncellenerek yeni mevzuatın zorunlu kıldığı `TREpys_PozOzellikSeti.CSBPozNo` ve `TREpys_ParselOzellikSeti` parametrelerinin de (eski `Tr_Pset_CSB` ile geriye dönük uyumlu olacak şekilde) tanınması.
2. **Yeni UX'in Gerçek Akışa Entegresi (Frontend):** Oluşturulan `DosyadanTeklifDemo` bileşeninin gerçek veri akışına bağlanması ve karmaşık olan `BimIfcParserPage` ile `SmartCheckImportWorkspace` sayfalarının yerini alması.
3. **Slide-over 3D Viewer & Hata Kartları:** Metraj ekranındaki bileşenlere 3D model bağlamının ve SmartCheck "uçuş öncesi kontrol" özet kartlarının eklenmesi.

---

## 4. 14.10.2026 Handoff Güncellemesi (Canlıya Alınan Tamamlamalar)
- **Navigasyon & Keşfedilebilirlik (`Navbar.tsx`, `Dashboard.tsx`, `SmartCheckLab.tsx`):**
  - Ana navigasyona **SmartCheck**, **Piyasa İstihbaratı** ve **Kârlılık** doğrudan erişim bağlantıları eklendi (`BUG-08`).
  - IFC yükleme CTA'ları birleştirilerek birincil akış `/app/smartcheck` (Kanıt-Öncelikli SmartCheck & RG 33331 e-PYS Ön Denetimi) ve ikincil akış `/app/ifc-parser` (Tarayıcı Hızlı Ön Analiz) olarak netleştirildi (`BUG-04`).
- **e-PYS EK-9 Panel Görünürlüğü (`SmartCheckImportWorkspace.tsx`, `smartcheck.ts`, `processor.ts`):**
  - Kuyruktan açılan veya QTO satırı içermeyen mimari IFC dosyalarında dahi RG 33331 e-PYS ön kontrol (`epys_preflight`) artefaktının korunması ve EK-9 panelinin her zaman görüntülenmesi sağlandı (`BUG-02`, `BUG-03`).
- **Teklif Oluşturma & Metraj Aktarımı (`QuoteCreate.tsx`, `derived-cost-items.ts`, `minha-engine.ts`):**
  - Betonarme kalemlerden türetilen kalıp (`m²`) ve donatı (`Ton`) metrajlarının `needs_review` şeffaflığıyla teklife aktarımı (`GAP-05`), satır bazlı maliyet kategorisi / iskonto / KDV kontrolleri (`BUG-06`, `BUG-07`) ve sözleşme bazlı (`CSB_2026` / `DIN_18350`) minha motoru (`GAP-06`) canlıya alındı.
- **Hukuki & Ticari Şeffaflık (`Landing.tsx`, `LegalPage.tsx`):**
  - Doğrulanmamış poz adedi iddiaları gerçek katalog/kanıt ifadeleriyle güncellendi (`GAP-01`) ve `/terms` ile `/privacy` (KVKK Aydınlatma Metni) sayfaları tam metin olarak yayına alındı (`GAP-04`).
- **ÇŞB 2026 Resmî PDF Katalog Mühürleme & 4 Katmanlı Gece Fiyat Takip Otomasyonu (`PricingSources.tsx`, `csb-pdf-parser.ts`, `price-watcher.ts`):**
  - `docs/fiyatlandirma-kaynaklari/` altındaki 15 resmî ÇŞB Yüksek Fen Kurulu 2026 PDF dosyası (İnşaat/Mekanik/Elektrik Birim Fiyat & Rayiç, Mimarlık-Mühendislik Hizmet Sınıfları, TÜİK Endeks Eşleştirme) ayrıştırılarak SHA-256 mühürlü katalog olarak (`/admin/pricing-sources`) canlı veritabanına (`active`, `570` onaylı satır) işlendi.
  - Her gece `03:00`'te çalışan 4 katmanlı otonom fiyat takip mimarisi (TCMB EVDS + TÜİK Yİ-ÜFE/İME + ÇŞB resmî sayfa parmak izi + açık teklifler üzerinde otomatik fiyat farkı/etki simülasyonu) devreye alındı.
- **RG 33331 Tam Kapsamlı e-PYS Sözlüğü (`EK-1`, `EK-2`, `EK-3`, `EK-7`) & 5D Köprüsü (`ifc_ruhsat`, `ifc_extract.py`, `smartcheck-evidence.ts`, `quotation-transfer.ts`):**
  - `EK-1` 6 haneli alfanümerik proje kodu ve dosya adı öneki (`ProjeKodu`) çapraz kontrolü, `EK-2` `Tablo 2.3–2.14` (alt disiplin, dosya türü/tipi, kat kodları), `EK-3` `Tablo 3.2` (~130 resmî mahal adı/kısaltması) ve `EK-7` `Tablo 7.8` (`IfcGeometricRepresentationContext` 3B koordinat uzayı) kuralları eklendi.
  - `TREpys_PozOzellikSeti.PozNo` önceliği, `TREpys_EmsalOzellikSeti` (`DAHIL`/`HARIC`/`YUZDE30`) alan toplamları ve ALLPLAN'ın otonom ürettiği `IfcCovering` kaplama alanlarının (`m²`) SmartCheck kanıt satırlarına ve taslak teklife aktarımı tamamlandı.
- **ALLPLAN 2026 e-PYS Kiti v1 & Yol Haritası / Hesaplama Yöntemleri Hizalaması (`epys-allplan-kit.ts`, `DeveloperRoadmap.tsx`, `roadmap-content.ts`, `calculation-content.ts`, `calculation-review.ts`):**
  - `/admin/roadmap` sayfasına tek tıkla indirilebilir SHA-256 mühürlü **ALLPLAN 2026 e-PYS Kiti v1** (`GET /api/smartcheck/epys-allplan-kit`) eklendi.
  - `/admin/roadmap` ve `/admin/roadmap/calculations` (`BIM-CALC-2026-10-14.2`) sayfalarındaki tüm çelişkiler giderildi; `TS 500 Yapısal Metraj Sihirbazı (E-7)`, `CSB_2026_V1 Minha Motoru (E-8)`, `IfcCovering` ince işler köprüsü ve `ALLPLAN 2026 vs Geleneksel BIM` karşılaştırma matrisi eklendi.

---

## 5. 15.10.2026 Handoff Güncellemesi (Paket Kataloğu v6, İşlemsel E-Posta & Bakanlık Nihai PDF Senkronizasyonu)
- **Paket Seçimli Kayıt, Havale/EFT 4 Dönemli İskonto & Paket Kataloğu v6 (`Register.tsx`, `Billing.tsx`, `PlansList.tsx`, `PlanEditor.tsx`, `bank-transfer.ts`, `plan-catalog.ts`):**
  - Sunucu RAM/CPU korumalı v6 paket kataloğu (`0 / 1.250 / 2.950 / 5.450 / 8.900 ₺`), `Aylık %0 / 6 Aylık %10 / 1 Yıllık %20 / 2 Yıllık %30` Havale/EFT taahhüt iskontosu, tam sayfa `PlanEditor` (`/admin/plans/:planId`) ve pasife alınan paketteki aboneleri alternatif pakete atomik taşıma canlıya alındı.
- **Kurumsal İşlemsel E-Posta Sistemi (`email-templates.ts`, `EmailTemplatesAdmin.tsx`):**
  - 8 kurumsal HTML/Text e-posta şablonu ve Süper Admin `/admin/email-templates` canlı önizleme & gerçek SMTP test gönderim ekranı devreye alındı.
- **RG 33331 Nihai Bakanlık PDF'leri (`#1.pdf`, `#2.pdf`, `EKLER.pdf`) Uçtan Uca Senkronizasyonu & Revizyon Günlüğü (`roadmap-content.ts`, `calculation-content.ts`, `calculation-review.ts`, `LandingPage.tsx`):**
  - `EK-9 Tablo 9.1 (Mimari — 21 satır)` & `Tablo 9.2 (Diğer Disiplinler — 16 satır)`, `EK-7 Tablo 7.9 (IfcAnnotation)`, `#1.pdf m.13(3) Malzeme İsmi_Dayanım`, `PDF/A ISO 216 pafta boyutu + tek pafta + /Sig e-imza` ve `2026–2033` geçiş takvimi hem arka uç motorlara hem ön yüze (`LandingPage.tsx`, `LegislationView.tsx`, `BimGlossary.tsx`, `EpysPreflightPanel.tsx`, `PdfPreflightPanel.tsx`) işlendi.
  - `/admin/roadmap#revizyon-gunlugu` ve `/admin/roadmap/calculations` (`BIM-CALC-2026-10-15.2`) sayfalarına uzman mühendisler için **Önceki Durum → Yeni Durum** karşılaştırmalı revizyon tarihçesi tabloları eklendi.

