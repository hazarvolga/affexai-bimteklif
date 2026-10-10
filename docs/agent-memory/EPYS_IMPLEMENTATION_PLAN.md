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
