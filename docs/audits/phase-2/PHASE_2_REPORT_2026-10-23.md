# Faz 2 — IFC Kapsamı ve Metraj Bütünlüğü

**Tarih:** 23 Ekim 2026
**Kapsam:** T10–T18
**Teknik kapı:** Geçti
**Bağımsız uzman / gerçek vendor dosyası / üretim kapısı:** Açık; canlı yayın izni vermez

## Sonuç

Faz 2, IFC metrajında yanlış güven üreten ana yolları fail-closed hale getirir. Malzeme ve beton sınıfı bilinmiyorsa poz uydurulmaz; tarayıcı önizlemesi sunucu worker'ı yerine geçmez; dosya, çalıştırma ve STEP kimliği korunur; duplicate ve aggregate bastırma kararları görünürdür; metraj kalite kapısı boyut bazında değerlendirilir; yalnız kaynaklı pozitif donatı kütlesi `kg` satırına dönüşür. Bu teknik sonuç gerçek Allplan/Revit/Archicad/Tekla ihracı veya bağımsız mühendis kabulü değildir.

| İş | Teknik durum | Kod kanıtı | Açık kabul |
|---|---|---|---|
| T10 — Malzeme sınıflandırması | Tamamlandı, fail-closed | Yapısal beton, donatı, gazbeton, XPS ve bitümlü membran ayrımı; sınıfsız/karma/desteklenmeyen malzeme unresolved | Gerçek vendor export alias ve katman matrisi |
| T11 — Beton sınıfı → poz | Tamamlandı, kontrollü kapsam | C25/30 → `15.150.1005`, C30/37 → `15.150.1006`, C35/45 → `15.150.1007`; sınıf yoksa eşleme yok | Hazır beton, pompa, nakliye ve kullanım koşullarının maliyet uzmanı imzası |
| T12 — Örnek projeler | Tamamlandı | Fixture sentetik ve fiyatsız etiketli; `4,80 m³` miktar korunuyor; boş resmî fiyat kaynağı üretilmiyor | Gerçek izinli dosyada roundtrip ve kullanıcı kabulü |
| T13 — Browser/worker parity | Tamamlandı | Browser yalnız önizleme; kapsamlı sonuç için server worker zorunlu; iki yolun capability sözleşmesi testli | Gerçek dosyalarda desteklenen şema/yazar yazılımı matrisi |
| T14 — Kota ve hata akışı | Tamamlandı | 403 kodları kalıcı Türkçe uyarı, e-posta doğrulama veya paket aksiyonu; reddedilen dosya temizlenip tekrar seçilebilir | Üretim e-posta ve billing canary'si sonraki operasyon fazında |
| T15 — Kimlik ve duplicate | Tamamlandı | `fileSha256 + processingRunId + STEP elementKey`; duplicate GlobalId ve aggregate suppression ayrı bulgu | Gerçek proje üzerinde orphan/duplicate karar kabulü |
| T16 — Donatı ve desteklenmeyen miktarlar | Tamamlandı, fail-closed | Yalnız doğrudan `IfcQuantityWeight` veya açık Weight/Mass property kaynaklı pozitif kütle `kg`; nominal, sıfır veya kaynaksız değer matched sayılmaz | BBS/TS 708/vendor çıktısıyla bağımsız kg karşılaştırması |
| T17 — Kontrollü eleman kapsamı | Kontrollü kapı tamamlandı | Mevcut Footing/Roof desteği korunur; bitümlü membran→XPS yanlış eşlemesi kapalı; dayanağı olmayan geniş kapı/pencere/korkuluk/tavan eşlemesi üretilmez | Eleman bazında ölçü esası ve vendor property set kanıtı gelmeden yeni otomatik poz açılmaz |
| T18 — Kayıpsız metraj ve kalite kapısı | Tamamlandı | Volume/area/length/mass/formwork toplamları ayrı; matched/unmatched/suppressed/duplicate bulguları korunuyor | Pilot dosyalarda kaynak model toplamlarıyla toleranslı karşılaştırma |

## Uygulanan mühendislik sınırları

- Gazbeton, adında “beton” geçtiği için betonarme sınıfına alınmaz.
- Grobeton, şap, sınıfsız beton, ahşap-kâgir ve karma katmanlar kanıt olmadan beton pozuna düşmez.
- C40/50 dahil ALLPLAN/e-PYS beton poz dizisi güncel katalog sırasına çekildi; Faz 2 otomatik icmal eşlemesi testli C25/30–C35/45 aralığıyla sınırlıdır.
- `IfcReinforcingBar` için icmal ağırlığı ancak doğrudan `IfcQuantityWeight` veya açık Weight/Mass property değerinden kabul edilir. Çap, boy, adet ve varsayımsal yoğunlukla hesaplanan nominal sonuç açık `estimate/DerivedNominalMass` olarak yalnız incelemede kalır; icmale girmez.
- Aggregate alt parçaları çift sayımı önlemek için bastırılabilir; karar ve STEP kimliği kalite çıktısında kaybolmaz.
- Aynı GlobalId'ye sahip farklı STEP satırları tek eleman gibi birleştirilmez.
- Sentetik örnekler ürün gösterimidir; fiyat, saha kabulü veya vendor doğrulaması sayılmaz.

## Normatif ve teknik dayanak

- [buildingSMART IFC4.3 geliştirme/specification deposu](https://github.com/buildingSMART/IFC4.x-development)
- [IfcReinforcingBar](https://github.com/buildingSMART/IFC4.x-development/blob/ifc4.3-main/docs/schemas/domain/IfcStructuralElementsDomain/Entities/IfcReinforcingBar.md)
- [IfcReinforcingBarType](https://github.com/buildingSMART/IFC4.x-development/blob/ifc4.3-main/docs/schemas/domain/IfcStructuralElementsDomain/Entities/IfcReinforcingBarType.md)
- [Qto_ReinforcingElementBaseQuantities — Count, Length, Weight](https://github.com/buildingSMART/IFC4.x-development/blob/ifc4.3-main/reference_schemas/psd/Qto_ReinforcingElementBaseQuantities.xml)
- [IfcRelAggregates](https://github.com/buildingSMART/IFC4.x-development/blob/ifc4.3-main/docs/schemas/core/IfcKernel/Entities/IfcRelAggregates.md)
- [IfcMaterialLayerSetUsage](https://github.com/buildingSMART/IFC4.x-development/blob/ifc4.3-main/docs/schemas/resource/IfcMaterialResource/Entities/IfcMaterialLayerSetUsage.md)

Bu kaynaklar veri modelini ve property/quantity adlarını doğrular. Türkiye'ye özgü poz kapsamını, ticari fiyat kullanım iznini veya mühendislik kabulünü tek başına sağlamaz.

## Doğrulama

- Faz 2 odaklı TypeScript testleri: **70/70 geçti**.
- Python IFC/PDF worker testleri: **66/66 geçti**.
- Roadmap/calculation içerik testleri: **4/4 geçti**.
- Disposable `postgres:16-alpine` veritabanında tam `pnpm test`: **1.149 geçti, 0 başarısız, 5 bilinçli skip**.
- `pnpm lint`: geçti.
- `pnpm build`: geçti.
- `git diff --check`: geçti.

## Bağımsız uzmana kalan dar kapsam

1. Kullanım izni bulunan gerçek Allplan, Revit, Archicad ve Tekla IFC dosyalarıyla IFC2X3, IFC4 ve IFC4X3 kapsam matrisi; export ayarları ve dosya hashleriyle birlikte.
2. Gerçek ihraclardan malzeme adı, layer ve property alias matrisi; sınıfsız/karma örneklerde fail-closed kararının imzalı kabulü.
3. C25/30–C40/50 pozlarının hazır beton, pompa, nakliye, mahal ve özel şartname koşullarıyla lisanslı maliyet/İnşaat mühendisi doğrulaması.
4. Donatı `kg` sonucunun BBS, TS 708 ve vendor metrajıyla bağımsız karşılaştırması; bindirme, büküm, fire ve tolerans kararı.
5. Gerçek projelerde aggregate suppression, duplicate GlobalId, orphan ve boyut toplamlarının kaynak modelle toleranslı kabulü.
6. Üretim worker, e-posta/billing aksiyonu, migration/restore/rollback ve runtime canary kanıtı; bunlar sonraki fazların ve T50–T52 yayın kapısının konusudur.

Bu altı kabul tamamlanmadan “vendor doğrulamalı IFC”, “uzman onaylı metraj”, “tam eleman kapsamı” veya üretime hazır BIM/QTO iddiası yapılmaz.
