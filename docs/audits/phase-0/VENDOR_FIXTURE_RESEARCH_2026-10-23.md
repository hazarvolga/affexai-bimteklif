# Vendor IFC referans araştırması

**Tarih:** 23 Ekim 2026
**Karar:** Resmî vendor dokümantasyonu bulundu; repoya eklenebilecek, açıkça
yeniden dağıtılabilir ALLPLAN/Revit/Archicad/Tekla IFC dörtlüsü bulunamadı.
Bu nedenle `vendor-*` kapıları açık tutuldu.

## Sonuç matrisi

| Vendor | Resmî kanıt | Dosya durumu | Kullanım/lisans kararı | Faz 0 kararı |
|---|---|---|---|---|
| ALLPLAN | Resmî yardım IFC2x3/IFC4 içe aktarma, exchange profile, log ve GUID davranışını açıklıyor | Açık lisanslı resmî örnek IFC bulunamadı | Dosya ve yeniden dağıtım hakkı yok | `vendor-allplan` blocked |
| Autodesk Revit | Resmî sayfa mimari, statik ve MEP `.rvt` örnekleri sunuyor; resmî IFC dokümanı ihracı açıklıyor | Hazır IFC yerine Revit proje dosyası; kontrollü IFC export için lisanslı Revit ortamı gerekli | Sayfa açık yeniden dağıtım izni vermiyor | `vendor-revit` blocked; lisanslı ortamda export adayı |
| Graphisoft Archicad | Resmî topluluk sayfalarında `.pla/.pln`, BIMx ve bazı sayfalarda MEP/donatı IFC indirmeleri var | Gerçek vendor örneği mevcut | EULA içeriği kendi kullanımına sınırlar; dağıtım, erişim verme ve ticari ürüne katmayı yasaklar. İndirme EULA kabulüdür | Repoya indirilmedi; hukuk/ürün kararı ve kontrollü depolama gerekli |
| Trimble Tekla | Resmî 2026 dokümanı IFC2x3/IFC4/IFC4.3 export ve desteklenen yapısal nesneleri açıklıyor | Açık lisanslı resmî örnek IFC bulunamadı | Dokümantasyon destek beyanıdır, test dosyası kullanım hakkı değildir | `vendor-tekla` blocked |

## Resmî bağlantılar

- ALLPLAN IFC import: <https://help.allplan.com/Allplan/2024-1/1033/Allplan/90874.htm>
- Autodesk Revit sample files: <https://help.autodesk.com/cloudhelp/2027/ENU/Revit-GetStarted/files/GUID-7B9C7A69-1083-406D-A01F-53D405C167F3.htm>
- Autodesk Revit and IFC: <https://help.autodesk.com/cloudhelp/2023/ENU/Revit-DocumentPresent/files/GUID-6708CFD6-0AD7-461F-ADE8-6527423EC895.htm>
- Graphisoft sample projects and EULA notice: <https://community.graphisoft.com/t5/Getting-started/Archicad-Sample-Projects-Designed-by-Students/ta-p/342989>
- Graphisoft IFC download candidates: <https://community.graphisoft.com/t5/Erste-Schritte/Archicad-Beispielprojekte/ta-p/668267>
- Tekla Structures 2026 IFC export: <https://support.tekla.com/doc/tekla-structures/2026/int_ifc_export>

## Uzman işini azaltan hazır edinim protokolü

Her vendor için tek bir koordinatör aşağıdaki formu doldurur; uzman dosya
aramaz veya kullanım hakkını yorumlamak zorunda kalmaz:

1. Vendor, ürün sürümü/build, platform ve exporter sürümü.
2. Kaynak proje kimliği, indirme/üretim URL'si ve edinim tarihi.
3. Kullanım izninin kapsamı: test, işleme, uzmana gösterme, saklama ve yeniden
   dağıtma ayrı ayrı.
4. İzin kanıtı kayıt ID'si ve SHA-256; kabul edilen EULA sürümü veya yazılı
   hak sahibi izni.
5. IFC schema/MVD ve tüm export ayarlarının ekran/dosya kaydı.
6. Ham IFC SHA-256, PII/telif kararı, anonimleştirme işlemi ve anonim çıktı
   SHA-256.
7. Aynı model için vendor içi schedule/QTO ile TeklifPro element sonuçlarının
   eşleme tablosu.

Dosyalar public Git deposuna ancak yeniden dağıtım hakkı açıkça varsa konur.
Diğerleri erişim kontrollü harici kanıt deposunda tutulur; repoda yalnız kayıt
ID'si, hash ve kapsam yer alır.

## Kapanmayan iddialar

Resmî dokümanın “IFC desteklenir” demesi TeklifPro'nun o vendor çıktısını doğru
okuduğunu kanıtlamaz. Aynı şekilde buildingSMART örneklerinin geçmesi ALLPLAN,
Revit, Archicad veya Tekla uyumluluğu değildir. Her vendor kapısı ancak izinli
gerçek export, kayıtlı ayarlar ve bağımsız eleman/QTO karşılaştırmasıyla kapanır.
