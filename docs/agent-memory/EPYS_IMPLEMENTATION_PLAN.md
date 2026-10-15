# e-PYS Entegrasyonu - 3 Yönlü Uygulama Planı

Bu belge, e-PYS (Elektronik Proje Teslim Sistemi) kurallarının sisteme entegrasyonu için üç farklı uzmanlık rolü üzerinden yürütülecek adımları listeler.

## 1. BIM Knowledge Engineer (BIM Bilgi Mühendisi)
**Sorumluluk:** Yönetmelik ve standartları makine diline (Data Dictionary) çevirmek.
**Uygulama Adımı:** 
- Ek-6 PDF'inden analiz ettiğimiz "Zorunlu IFC Sınıfları ve Özellikleri" (Örn: IfcWall -> FireRating, IfcDoor -> IsExternal) kurallarını TypeScript sözlüğü (Dictionary) olarak kodlamak.
- `src/smartcheck/rules/ek6-dictionary.ts` dosyasını oluşturarak sistemin hangi sınıfta hangi parametreyi zorunlu arayacağını haritalamak.

## 2. AI BIM Director (Stratejik BIM Yöneticisi)
**Sorumluluk:** Kural motorunu işletmek, kalite kontrol (QA) süreçlerini yönetmek ve e-PYS uyumluluk skorunu belirlemek.
**Uygulama Adımı:**
- `src/smartcheck/rules/epys.ts` motorunu Knowledge Engineer'ın ürettiği sözlükle birleştirmek.
- Gelen modeli "Otonom Denetimden" geçirerek; (1) Ek-6 parametre doluluğu, (2) Madde 12 (15 Karakter Sınırı), (3) Ek-3 Mahal isimlendirme formatı üzerinden kesin bir "e-PYS Uyum Skoru (0-100)" hesaplamak.
- Kesin reddedilecek modellerin kurallarını (Tolerans dışı hatalar) belirlemek.

## 3. BIM Software Architect (Yazılım Mimarı)
**Sorumluluk:** Geliştirilen motorun Full-Stack (Backend+Frontend) entegrasyonunu sağlamak ve kullanıcı arayüzünü inşa etmek.
**Uygulama Adımı:**
- `src/ifc/parser/tr-pset-csb-extractor.ts` dosyasını, model yüklenir yüklenmez e-PYS kurallarını otomatik tetikleyecek şekilde güncellemek.
- `src/components/bimplan/BimIfcParser.tsx` arayüzünü güncelleyerek, "e-PYS Uyum Özeti" panelini statik bir tasarım olmaktan çıkarıp, arka plandan gelen gerçek skoru ve "Hatalı Elemanlar" listesini yeşil/kırmızı rozetlerle gösteren dinamik bir dashboard'a dönüştürmek.

---

## 4. Uygulama Durumu (14 Ekim 2026 — Tamamlandı & Canlıda)
- **EK-1 / EK-2 / EK-3 / EK-5 / EK-6 / EK-7 / EK-9 Tam Sözlük ve Kural Motoru (`workers/ifc/vendor/ifc_ruhsat/`):**
  - EK-1 6 haneli alfanümerik proje kodu ve dosya adı `ProjeKodu` öneki eşleşmesi (`isim.py`),
  - EK-2 `Tablo 2.2–2.14` disiplin, alt disiplin, dosya türü, dosya tipi ve kat kodları (`ek2_disiplinler.json`, `isim.py`, `yapi.py`),
  - EK-3 `Tablo 3.1–3.2` (~130 resmî mahal adı ve kısaltması, `ek3_mahaller.json`, `mahal.py`),
  - EK-5 (69 zorunlu + 67 isteğe bağlı IFC sınıfı) ve EK-6 (`Tablo 6.1–6.68`, `ek6_ozellikler.json`),
  - EK-7 `Tablo 7.1–7.8` (`IfcProject`, kişi/kurum/rol, `IfcProjectedCRS`, `IfcMapConversion`, `IfcGeometricRepresentationContext` 3B koordinat kontrolü),
  - EK-9 `Tablo 9.1` (21 satır Model Kalite Kontrol Formu) ve KVKK TC Kimlik / VKN / e-posta / telefon maskeleme canlıda aktif.
- **5D Metraj/Teklif Köprüsü & ALLPLAN 2026 e-PYS Kiti v1 (`ifc_extract.py`, `smartcheck-evidence.ts`, `quotation-transfer.ts`, `epys-allplan-kit.ts`):**
  - `TREpys_PozOzellikSeti.PozNo` önceliği, `TREpys_EmsalOzellikSeti` (`DAHIL`/`HARIC`/`DIGER` ve geriye dönük `YUZDE30`) alan toplamları ve `IfcCovering` (`m²`) kaplama metrajı SmartCheck kanıt satırlarına ve taslak teklife bağlandı.
  - SHA-256 mühürlü **ALLPLAN 2026 e-PYS Kiti v1** (`GET /api/smartcheck/epys-allplan-kit`) `/admin/roadmap` ve `/app/smartcheck` üzerinden indirilebilir durumda.

---

## 5. 15 Ekim 2026 — Bakanlık Nihai PDF Paketi (`#1.pdf`, `#2.pdf`, `EKLER.pdf`) Tam Senkronizasyonu
- **EK-9 Tablo 9.1 (Mimari — 21 satır) & Tablo 9.2 (Diğer Disiplinler — 16 satır):** `ek9_form.json`, `ek9.py`, `kontrol.py` ve `epys_preflight.py` içinde disiplin koduna (`MM` vs. `ST`/`MK`/`EE` vb.) göre otomatik tablo seçimi ve `EpysPreflightPanel.tsx` rozeti devreye alındı.
- **EK-7 Tablo 7.9 (`IfcAnnotation`):** `ek7_proje.json` ve `ozellik.py` içine `IfcAnnotation` (`Name: Metin`, `Description: Metin`, `PredefinedType: SURVEY`) kontrolü eklendi.
- **EK-6 Alt Tür Sözlüğü (`ek6-dictionary.ts`):** `Tablo 6.3, 6.16, 6.20, 6.25, 6.56, 6.58, 6.66, 6.68` alt türleri `EKLER.pdf` ile birebir eşitlendi.
- **Malzeme Adı (`#1.pdf` m.13(3)) & 5D Poz Kodu Ayrımı (`epys.ts`):** `IFCMATERIAL` üzerinde `Malzeme İsmi_Dayanım` (`Beton_C30/37`, `Çelik_B420C`) resmi kural olarak tanımlandı; `Pset_Yapim_Maliyet.CSBPozNo` 5D maliyet uyarısı seviyesine çekildi.
- **2B PDF/A Pafta Boyutu, Tek Pafta & e-İmza (`pdf_preflight.py`, `PdfPreflightPanel.tsx`):** `#1.pdf` **m.8(1)** ISO 216 A4 katları pafta boyutu (`PAFTA_BOYUTU_ISO216`), **m.8(2)** çizim paftalarında tek pafta düzeni (`COKLU_PAFTA_DUZENI`) ve `#2.pdf` **m.6(1)-(2)** 5070 sayılı Kanun gömülü e-imza (`/Sig` — `eSignature`) kontrolleri eklendi.

