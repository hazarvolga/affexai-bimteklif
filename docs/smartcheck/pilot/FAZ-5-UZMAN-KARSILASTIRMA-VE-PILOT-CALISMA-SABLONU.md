# Faz 5 — Uzman karşılaştırma cetveli ve kontrollü pilot çalışma şablonu

**Durum: BOŞ ŞABLON / KANIT VE KARAR BEKLİYOR.** Bu belge bir pilotun yapıldığını, mevzuatın güncelliğini, hesapların doğruluğunu veya uzman/hukuk onayı verildiğini göstermez. Her pilot ve her karşılaştırma için güvenli çalışma alanında ayrı kopya oluşturun. Bu belgeye gerçek kişi bilgisi, müşteri adı, dosya, ekran görüntüsü, kimlik, erişim anahtarı, token, gizli URL veya sözleşme içeriği yazmayın. Güvenli alandaki kanıta yalnız erişimi kontrol edilen, içeriği ifşa etmeyen referans verin; hassas referansları da repoya işlemeyin.

**Kaynak belgeler:** [Pilot kabul sırası](README.md), [Faz 10 admission runbook](phase10-admission.md), [fixture acceptance](fixture-acceptance.md), [saklama ve admission](phase8-storage-admission.md), [pilot evidence control](phase7-pilot-evidence-control.md), [operasyon](phase12-operations.md). Bu belge bu kuralları veya fiilen uygulanan erişim/silme mekanizmalarını değiştirmez. Çelişki varsa pilot kapısı açık kalır, sorumlu kişi farkı inceler.

## 1. Kapsam ve başlangıç kaydı

| Alan | Doldurulacak değer |
|---|---|
| Pilot/çalışma kodu; şablon sürümü | [kod] / [sürüm] |
| Test ortamı ve erişim sınırı | [yerel sentetik / izinli pilot / diğer; ortam sorumlusu] |
| Uygulama build/commit, DB migration ve worker sürümü | [kanıt referansları; ayrı ayrı] |
| Kapsanan iş akışları ve hariç tutulan alanlar | [liste] |
| Teknik uzman rolü/yetkinlik ve inceleme kapsamı | [güvenli alandaki yetkinlik/atama referansı] |
| Firma veri sorumlusu, uygulayıcı ve karar sahibi | [rol ve güvenli referans; ad yazmayın] |
| Başlangıç/bitiş tarihleri ve zaman dilimi | [tarih] / [tarih] / [saat dilimi] |
| Mevzuat, katalog ve müşteri yetki kontrolü | BEKLEMEDE / [tarih, kaynak sürümü, sorumlu ve kanıt referansı] |
| Veri işleme koşulları ve hukuk incelemesi | BEKLEMEDE / [hukuk onayı referansı, kapsamı ve tarihi] |

Build kaydı üretimde çalışan imajın kanıtı değildir. Üretim söz konusuysa yetkili operasyon sorumlusu dağıtım kaynağı, çalışan imaj ve servis sağlığını ayrı kaydeder. Gerçek müşteri pilotu için mevcut `phase10-admission.md` kapıları, izin ve beş dosya sözleşmesi ayrıca uygulanır; bu şablonu doldurmak o kapıları açmaz.

## 2. Test malzemesi ve izin matrisi

| Kod | Tür / sürüm | Kaynak ve lisans/izin kanıtı | Beklenen kapsama uygunluk | Veri sınıfı | Kullanım durumu |
|---|---|---|---|---|---|
| S-01 | Sentetik temiz CSV: `fixtures/smartcheck/pilot-v1/mep-01-clean.csv` | Depodaki fixture ve `fixture-acceptance.md`; dağıtım/kullanım şartı ayrıca kontrol | Eşleme, normalize, inceleme | Sentetik | Hazır örnek; sonuç henüz kaydedilmedi |
| S-02 | Sentetik bulgulu CSV: `fixtures/smartcheck/pilot-v1/mep-03-findings.csv` | Aynı kaynak ve şart kontrolü | Hata/bulgu ve review | Sentetik | Hazır örnek; sonuç henüz kaydedilmedi |
| O-01 | Açık IFC adayı: `fixtures/phase-0/open-source/buildingsmart/ifc4-wall-opening-window.ifc` | Kaynağın lisansı, türev/dağıtım ve kullanım koşulları [referans] | Duvar/açıklık kanıtı; modelin kapsamı uzman tarafından teyit | Açık örnek adayı | İzin ve kapsam doğrulaması bekliyor |
| P-01 … P-05 | İzinli gerçek proje; kodla ifade edin | Her dosya için izin, amaç, tarih, checksum ve saklama süresi [güvenli referans] | [disiplin, model/format/sürüm, beklenen kullanım] | Müşteri verisi | BEKLEMEDE |

Açık örnek bulunması lisans ve kullanım uygunluğunun tamamlandığı anlamına gelmez. Kaynağı, ilgili lisans metnini ve değişiklikleri her kullanımdan önce doğrulayın. Gerçek dosya, checksum ile izin ve reviewer bilgileri yalnız erişimi sınırlandırılmış manifestte tutulur; [Faz 10](phase10-admission.md) doğrulamasını geçmeden gerçek pilot açılmaz. Bu listedeki sentetik ve açık örnekler gerçek müşteri başarı oranının payına/paydasına katılmaz.

## 3. Bağımsız uzman karşılaştırma cetveli

Önce uzman referans hesabını uygulama sonucundan bağımsız hazırlasın; sonra aynı kaynak, kapsam, birim ve hesap tarihindeki sonuçlar karşılaştırılsın. Testin kabul toleransı **deney öncesinde** yetkili uzman ve ürün sahibi tarafından yazılı belirlenir; tolerans burada varsayılmaz. Model geometri tahmini, QTO/property ve manuel giriş ayrı sınıflandırılır. Kaynak izi bulunması miktarın doğru olduğu veya mühendis tarafından onaylandığı anlamına gelmez.

| Vaka / satır kodu | Kaynak kanıtı ve sürüm | Eleman / poz ve birim | Uzman bağımsız sonuç | Uygulama sonucu | Mutlak fark | Göreli fark | Önceden belirlenen tolerans | Karar | Farkın nedeni / güvenli kanıt ref. |
|---|---|---|---:|---:|---:|---:|---|---|---|
| [ör. O-01-01] | [QTO/property/manuel/geometri; kaynak yolu] | [kod, birim] | [bekliyor] | [bekliyor] | [bekliyor] | [bekliyor] | [belirlenmedi] | BEKLEMEDE | [referans] |
| [P-01-01] | [kanal ve kaynak] | [kod, birim] | [bekliyor] | [bekliyor] | [bekliyor] | [bekliyor] | [belirlenmedi] | BEKLEMEDE | [referans] |

- `Mutlak fark = |uygulama − uzman|`, aynı birim ve karşılaştırılabilir yuvarlama aşamasıyla hesaplanır. Göreli fark = `mutlak fark / |uzman|`; uzman değeri sıfır veya yoksa oran **hesaplanamaz**, mutlak fark ve karar gerekçesi ayrıca verilir. İlgili durumda farklı birimler/hesap kapsamları önce eşleştirilir; varsayımsal dönüşüm yapılmaz.
- Her vaka için kapsam, girdiler, boşluk/minha eşiği, sayı/birim, yuvarlama sırası, fiyatın kaynağı ve geçerlilik tarihi, kullanılan yazılım ve yöntem sürümü, review durumu, belirsizlik ve kapsam dışı alanlar güvenli kayıtta belirtilir.
- Kararlar: **BEKLEMEDE**, **UYGUN**, **FARK İNCELENİYOR**, **UYGUN DEĞİL**, **KAPSAM DIŞI**. Kapsam dışı ve karşılaştırılamayan kayıtlar başarısızlık olarak gizlenmez; ayrı sayılır. Gerekçeli istisna sonuç doğruluğuna ilişkin uzman onayı yerine geçmez.
- IFC için doğrudan QTO/property miktarı ile türetilmiş geometriyi ayrı kaydedin; kaynak yolu, sınıf, IFC sürümü, birim, GlobalId/uygun güvenli kimlik ve eksik/kopya eleman riskini inceleyin. Fiyat yoksa **bilinmiyor** yazın; sıfır veya resmî fiyat uydurmayın.
- Teklif zinciri için kaynak → normalize → review → fiyat snapshot → teklif → PDF adımlarını, aktarma anı kanıtını ve güncel kaynak değişmişse farkını bağımsız inceleyin. Şüpheli fiyat ve tutarları banka tahsilatı veya piyasa doğruluğu olarak adlandırmayın.

### 3.1 KİK ve YAMBİS özel karşılaştırma

Her senaryo için ihale/ilan tarihi, iş türü, yetkili uzman, kullanılacak resmi metin ve yürürlük tarihi ile varsayımları önce belirleyin. [Kamu İhale Kurumu mevzuat arama sayfası](https://www.ihale.gov.tr/Mevzuat.aspx?AnaSayfa=true&keyword=kamu+ihale+genel+tebli%C4%9Fi) ve [Yüksek Fen Kurulu duyuruları](https://yfk.csb.gov.tr/duyurular) resmi başlangıç noktalarıdır; bu sayfalardaki bir kaydın ilgili ihaleye uygulanması otomatik kabul edilmez. **Mevzuat güncelliği, ilgili ilan/sözleşme ve uzman kontrolü BEKLEMEDE.** Sayfanın erişim tarihi, metin adı, yayımlanma/yürürlük ve varsa değişiklik bilgileri aşağıda tutulur; sonuç için hukuk veya meslek görüşü bu belgeden çıkarılmaz.

| Vaka | Senaryo ve belge tarihleri | Resmî kaynak / sürüm / erişim tarihi | Girdiler ve varsayımlar | Uzman referansı | Uygulama | Fark ve tolerans | Yetkili uzman kararı |
|---|---|---|---|---|---|---|---|
| KİK-01 | [ihale türü ve ilan tarihi] | [resmî kaynak referansı; güncellik bekliyor] | [değerler güvenli cetvelde] | [bekliyor] | [bekliyor] | [bekliyor] | BEKLEMEDE |
| YAMBİS-01 | [yapı sınıfı ve tarih] | [tebliğ referansı; güncellik bekliyor] | [alan ve sınıfın dayanağı] | [bekliyor] | [bekliyor] | [bekliyor] | BEKLEMEDE |

## 4. Pilot ölçüm planı ve olay kayıt cetveli

Veriler yalnız yetkilendirilmiş pilot kapsamında, hangi olayın ne zaman başladığı/bittiği önceden belirlenerek ölçülür. Bir dosyanın birden fazla çalıştırılması bağımsız müşteri başarısı sayılmaz. Aynı işin mevcut yöntemle karşılaştırması yapılacaksa veri, hazırlık, ekip yetkinliği ve kapsam eşitliği kaydedilir. Hedefler deney başlamadan belirlenir; aşağıdaki alanlar sonuç veya verilen söz değildir.

| Ölçüm | Tanım ve pay/payda | Sorumlu / kaynak | Hedef | Sonuç / kapsam / istisna |
|---|---|---|---|---|
| İzinli dosya sayısı | Kabul edilmiş benzersiz izinli dosya / planlanan izinli dosya; sentetik hariç | [rol / admission] | [önceden belirlenir; admission için mevcut beş dosya kuralına bakın] | BEKLEMEDE |
| Parse | Manuel yeniden giriş olmadan anlamlı biçimde parse edilen uygun satır / uzman tarafından sayılan uygun kaynak satırı | [rol / karşılaştırma] | [admission kuralına bakın] | BEKLEMEDE |
| Kaynak izi | Teklife aktarılan ve gerekli kaynak bağlantısı doğrulanan satır / aktarılan satır | [rol / kaynak zinciri] | [admission kuralına bakın] | BEKLEMEDE |
| İnceleme | Onaylı, reddedilen ve gerekçeli istisna sayıları / incelenebilir satır; karar sınıfları ayrı | [reviewer / audit] | [belirlenmedi] | BEKLEMEDE |
| Süre | Aynı kapsamda yükleme başlangıcı → review/teklif bitişi; insan bekleme süresi ayrıca | [saat / güvenli olay kaydı] | [belirlenmedi] | BEKLEMEDE |
| Düzeltme ve yeniden iş | Manuel değiştirilen satır / incelenen satır; türleri ve tekrarlar ayrı | [rol] | [belirlenmedi] | BEKLEMEDE |
| Sorun | Başarısız işlem ve kullanıcı engeli sayısı; etki süresi ve yeniden deneme | [olay kaydı] | [belirlenmedi] | BEKLEMEDE |
| Sıfır payda / bilinmeyen | Oran hesaplanmaz; `N/A`, gerekçe ve eksik veriler kaydedilir | [rol] | — | BEKLEMEDE |

| Pilot kodu / dosya kodu | İzin ref. | Deneme no ve build | Uygun satır / parse | Bulgular / kararlar | Aktarım / doğrulanan iz | Süre ve bekleme | Hata / takip ref. | Uzman kararı |
|---|---|---|---|---|---|---|---|---|
| [P-01] | [güvenli ref.] | [ ] | [ ] / [ ] | [ ] | [ ] / [ ] | [ ] | [ ] | BEKLEMEDE |

Mevcut runbook'un parse ve kaynak izi eşikleri, ancak aynı kapsam ve tanımla gerçek beş dosya ile ölçüldüğünde ilgili admission kontrolü için değerlendirilebilir. Kayıp veri veya eksik uzman/storage kapısı varsa durum **insufficient_evidence**; sadece sentetik başarı pilot GO değildir.

## 5. Saklama, erişim, silme ve çıkış çalışma planı

Bu liste bir hukuk kararı veya mevcut sistemde bu mekanizmaların çalıştığına dair kanıt değildir. Canlı sistemde işlem, yalnız yetkili sorumlu tarafından ve gerekli açık yetkiyle yürütülür. Gerçek silme, export, backup restore veya feature flag işlemi bu şablonun hazırlanmasıyla yapılmaz.

| Veri / kopya | Amaç ve izin dayanağı referansı | Konum / sahip rol | Erişim ve şifreleme kanıtı | Başlangıç / bitiş veya yasal saklama kararı | Silme / dışa aktarma / doğrulama planı | Durum |
|---|---|---|---|---|---|---|
| Kaynak dosya ve önizleme | [ ] | [bucket/prefix güvenli ref.] | [ ] | [hukuk/sözleşme kararı bekliyor] | [ ] | BEKLEMEDE |
| Normalize satır, bulgu, karar ve audit | [ ] | [DB / rol] | [ ] | [ ] | [erişim ve uygulanabilir silme sınırı] | BEKLEMEDE |
| Teklif, revizyon, fiyat kanıtı, PDF | [ ] | [DB/object / rol] | [ ] | [ ] | [ ] | BEKLEMEDE |
| Log, telemetry, ekran kaydı, geçici dosya | [ ] | [ ] | [ ] | [ ] | [secret/kişisel veri minimizasyonu; silme] | BEKLEMEDE |
| Yedek, replika, kuyruk ve harici işleyici | [ ] | [ ] | [ ] | [ ] | [ayrı yaşam döngüsü ve silmenin sınırları] | BEKLEMEDE |
| Uzman cetveli ve izin/karar kanıtı | [ ] | [güvenli alan] | [ ] | [ ] | [kanıtın saklanması/silinmesi kararı] | BEKLEMEDE |

### Çıkış kontrolü

1. [ ] Pilot sahibinin kapanış talebi, uygulanabilir sözleşme ve hukuk değerlendirmesi güvenli referansla kaydedildi; süre ve yasal tutma/istisna kararı netleştirildi.
2. [ ] İzinli dışa aktarımın formatı, alıcı yetkisi ve kapsamı kontrol edildi; eksik veriler ve kanıt sınırlamaları alıcıya açıklandı.
3. [ ] Erişim/feature flag ve kuyruk işlerinin sonlandırılması için uygulanabilir plan ve yetki doğrulandı; bekleyen işlemler ile geri dönüş riski kaydedildi.
4. [ ] Her veri katmanı için teknik olarak yapılabilen silme/anonimleştirme ayrı doğrulandı; silinemeyen audit, yedek ve üçüncü taraf kopyaları saklama süresi ve sınırlama gerekçesiyle kaydedildi. Kapsanmayan sistemlere silindi denmedi.
5. [ ] İlgili storage/DB ve yedek yaşam döngüsüne ait uygulama kanıtı, erişim kontrollü alanda tutuldu; bağımsız kontrol ve gerektiğinde tekrar kontrol tarihi kaydedildi.
6. [ ] İlgili kişiye/sorumlu firmaya yalnız yetkili kanal ve izinle bildirim planı belirlendi; herhangi bir mesaj otomatik gönderilmiş sayılmadı.

## 6. Karar kaydı ve açık kapılar

| Kapı | Karar | Kanıt / atanmış rol / tarih | Sonraki adım |
|---|---|---|---|
| İzin, beş dosya ve veri işleme | BEKLEMEDE | [ ] | [ ] |
| Teknik uzman değerlendirmesi ve imza | BEKLEMEDE | [ ] | [ ] |
| Gerçek ortam, storage ve tenant izolasyonu | BEKLEMEDE | [ ] | [ ] |
| Pilot ölçüm ve karşılaştırma toleransları | BEKLEMEDE | [ ] | [ ] |
| KİK/YAMBİS yürürlük ve ilgili uzman kontrolü | BEKLEMEDE | [ ] | [ ] |
| Hukuk, ürün iddiası ve ticari kullanım | BEKLEMEDE | [ ] | [ ] |
| Nihai GO / NO-GO | **INSUFFICIENT_EVIDENCE** | [karar sahibi ve tarih atanmadı] | [eksik kanıtları tamamla] |

Karar sahibi yalnız gerçek kayıtlara dayanarak sonucu günceller. Yayın, müşteri erişimi, veri yükleme veya canlıya dağıtım bu şablonla yetkilendirilmez.
