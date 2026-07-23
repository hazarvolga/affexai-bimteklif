# TeklifPro SmartCheck BIM Pilot GAP Raporu

**Tarih:** 23 Temmuz 2026  
**Kapsam:** MEP taşeronları için Excel/CSV-first, evidence-first SmartCheck pilotu  
**Değerlendirme yaklaşımı:** BIM bilgi yönetişimi + SaaS mimarisi + yapım/teklif operasyonları  
**Karar:** **Gerçek pilot kapısı henüz geçilemez. Kontrollü pilot hazırlığı yapılabilir.**

## 1. Yönetici özeti

TeklifPro, mevcut teklif ve PDF çekirdeğini bozmadan metraj dosyasını güvenli yükleme, normalize etme, deterministik kontrol, insan onayı ve taslak teklife kaynak iziyle aktarma yönünde güçlü bir teknik temel oluşturmuş durumda. Tenant filtreleri, rol kontrolü, feature flag, dosya bütünlüğü, XLSX zip-bomb sınırları, CSV formula neutralization, idempotent processing ve aktarım idempotency mekanizmaları kodda bulunuyor.

Ancak ürünün bugün gerçek müşteri pilotuna alınması üç dış girdiden önce dahi riskli:

1. Bulgulu satırları düzeltme, yeniden doğrulama veya kontrollü istisna kabulü akışı yok. Bulgusu olan satır onaylanamadığı için kullanıcı çıkmazda kalıyor.
2. Teknik reviewer metadata alanları şemada mevcut; reviewer atama, yetkinlik kaydı, kural onayı ve kanıt paketi operasyonu mevcut değil.
3. Pilot KPI ve izin kayıtları sistematik olarak tutulmuyor. Beş dosyanın “müşteri izinli” ve “başarılı pilot örneği” olduğunu ispatlayan kapı bulunmuyor.

Gerçek pilot için ayrıca müşteri tarafından sağlanan beş MEP dosyası, gerçek reviewer kimlikleri/onayları ve production S3 erişimi gerekir. Bunlar üretilemez veya örnek veriyle “tamamlandı” sayılamaz.

## 2. Kanıt temelli mevcut durum

| Alan | Mevcut kanıt | Durum | Güven |
|---|---|---:|---:|
| XLSX/CSV yükleme | 25 MB limit, uzantı + MIME + signature, SHA-256 | Hazır | Yüksek |
| Dosya güvenliği | Şifreli/bozuk XLSX, zip-bomb, traversal-safe storage key, CSV formula neutralization | Pilot temeli hazır | Yüksek |
| Tenant/rol sınırı | `companyId` filtreleri, owner/admin/manager mutation sınırı, verified email | Kodda mevcut | Yüksek |
| İşleme hattı | Graphile Worker, idempotency, parsing → normalizing → validating → awaiting_review | Mevcut | Yüksek |
| Kaynak izi | sheet, row/cell, document/run, raw/normalized değerler | Mevcut | Yüksek |
| İnsan onayı | Bulgusuz satır approve; satır reject | Kısmi | Yüksek |
| Teklife aktarım | Yalnız approved satır, draft quote, duplicate transfer koruması | Mevcut | Yüksek |
| Kural yönetişimi | Resmî kaynak/reviewer metadata şeması ve validator | Kısmi; operasyonel değil | Yüksek |
| Vergi danışmanlığı | KDV/tevkifat ayrıştırma yardımcı modeli | Ürün akışına tam bağlı değil | Orta |
| Production storage | S3 adapter ve presigned PUT | Kod hazır; canlı kanıt yok | Yüksek |
| Entegrasyon güvenliği testleri | Unit testler var | Uçtan uca ve cross-tenant kapsam eksik | Yüksek |
| Pilot kanıtı | Örnek CSV mevcut | Gerçek müşteri kanıtı yok | Yüksek |

## 3. Uzman analizi

### BIM ve bilgi yönetişimi

SmartCheck’in doğru ürün sınırı “otomatik mühendislik onayı” değil, **kaynaklı metraj ve teklif doğrulama** olmalıdır. Kaynak hücre ve reviewer kararı saklanması BIM bilgi yönetişimi açısından doğru yöndedir. Buna karşılık bir kuralın resmî kaynak, sürüm, yürürlük, uygulanabilirlik, istisna ve teknik reviewer kaydı olmadan canonical/approved seviyesine yükselmesi engellenmelidir.

Mevcut deterministik kontroller düşük hukuki riskli pilot kapsamına uygundur. TS 500, TS 708, ÇŞİDB/YFK, vergi ve tevkifat mantığı gerçek resmî kaynak ve yetkin uzman onayı olmadan advisory kalmalıdır.

### Yazılım mimarisi

Mevcut Express/Vite/Drizzle/PostgreSQL/Graphile Worker yapısının korunması doğru karardır. Additive migration ve feature flag yaklaşımı rollback riskini düşürüyor. En büyük teknik boşluk yeni bir servis ihtiyacı değil; eksik state transition ve kanıt operasyonudur.

İşleme kuyruğuna ekleme başarısız olduğunda run/document kaydı queued durumda kalabilir. Worker health, retry ve operatör görünürlüğü pilotta izlenmelidir. Production completion endpoint’i objeyi web process belleğine tamamen alıyor; 25 MB pilot sınırında yönetilebilir fakat yatay ölçek ve eşzamanlı yük altında bellek riski taşır.

### Teklif ve saha operasyonu

MEP teklif mühendisi için esas değer, metraj satırlarını yeniden yazmadan güvenilir teklife çevirmektir. Mevcut akış kolon adlarını dosyayı önizlemeden kullanıcıdan ister; farklı müşteri Excel şablonlarında hata ve yeniden işleme oranı yükselir. Sheet/header preview ve mapping confirmation pilot başarısını doğrudan etkiler.

Tek bir global maliyet/zayiat/KDV override’ının tüm onaylı satırlara uygulanması gerçek teklif operasyonu için zayıftır. Satır bazlı ticari kontrol ve değişiklik audit’i gereklidir.

## 4. Öncelikli GAP listesi

### P0 — Pilot başlamadan kapanmalı

| GAP | Etki | Kabul kriteri |
|---|---|---|
| Bulgulu satır düzeltme/yeniden doğrulama/istisna akışı yok | Satır onaylanamaz; kullanıcı kilitlenir | Düzeltme sonrası kurallar tekrar çalışır; açık bulgu yoksa approve, yetkili reviewer gerekçesiyle accepted exception mümkün |
| Teknik reviewer operasyonu yok | Kural ve kararların teknik sahipliği kanıtlanamaz | Reviewer adı, rolü/yetkinliği, şirket üyeliği, tarih, karar ve scope kayıt altına alınır |
| Müşteri izin kaydı yok | Veri sahipliği ve kullanım amacı ispatlanamaz | Her dosya için müşteri, izin referansı, kapsam, saklama süresi ve iptal koşulu kaydı |
| Gerçek 5 MEP dosyası yok | Parse oranı ve ürün değeri ölçülemez | Beş farklı, izinli dosya; checksum ile kayıtlı ve gerçek pilot sonucuna bağlı |
| Production S3 kanıtı yok | Canlı veri saklama güvenliği doğrulanamaz | Ayrı pilot bucket/prefix, least privilege, encryption, retention, lifecycle ve upload/download smoke kanıtı |
| Uçtan uca tenant/security testi eksik | Müşteri verisi sızıntısı riski | Cross-tenant read/mutate/transfer negatif testleri ve sıfır sızıntı |

### P1 — İlk müşteri dosyaları işlenirken kapanmalı

- Sheet/header preview ve gerçek kolonlardan mapping seçimi.
- Satır bazlı satış fiyatı, gerçek maliyet, zayiat ve KDV incelemesi.
- Her finding için kaynak hücre, rule version, karar, gerekçe ve çözüm audit’i.
- Transferde tek hard-coded `pilot-integrity-v1` yerine kullanılan kural sürümlerinin doğru provenance kaydı.
- Queue retry/failed run görünürlüğü ve operatör runbook’u.
- Gerçek XLSX, S3-compatible storage ve upload → parse → review → transfer integration testleri.
- Pilot KPI kaydı: satır sayısı, otomatik parse oranı, manuel düzeltme, bulgu türü, hazırlama süresi, aktarım sonucu.

### P2 — Pilot kanıtından sonra

- PDF’ye isteğe bağlı, hassas veri içermeyen doğrulama özeti.
- Reviewer dashboard ve kural promotion workflow.
- Veri saklama/silme otomasyonu ve müşteri export paketi.
- Kurum şablonu bazlı mapping profilleri.
- PDF CV, IFC metraj, canlı fiyat, e-imza ve proposal builder; yalnız pilot verisi ürün ihtiyacını doğrularsa.

## 5. Pilot kapısı

| Kapı | Bugünkü sonuç | Geçiş kanıtı |
|---|---:|---|
| G1 — Ürün güvenliği | Koşullu | P0 düzeltme + tenant testleri |
| G2 — Veri izni | Geçmedi | 5/5 müşteri izin kaydı |
| G3 — Teknik sorumluluk | Geçmedi | Atanmış reviewer ve imzalı/onaylı kayıtlar |
| G4 — Production storage | Geçmedi | S3 preflight + gerçek object smoke + retention kanıtı |
| G5 — Ürün performansı | Geçmedi | 5 dosyada ≥%90 manuel yeniden girişsiz parse |
| G6 — Kaynak izi | Koşullu | Aktarılan her satırda doğru rule/version ve kaynak izi |
| G7 — İş faydası | Geçmedi | Önce/sonra süre ve hata/bulgu ölçümü |

**Go kararı:** G1–G7 kanıtları tamamlanmadan production pilot “başarılı” ilan edilmemeli. İlk müşteri dosyaları yalnız kontrollü pilot ortamında, izin ve saklama kuralları kaydedildikten sonra işlenmeli.

## 6. İş etkisi

- **Gelir etkisi:** Pilotun ücretsiz veya düşük ücretli olması kabul edilebilir; asıl amaç doğrulanmış vaka, hazırlama süresi azalması ve kaynaklı teklif kanıtı üretmektir.
- **Risk azaltımı:** Permission, reviewer ve provenance kapıları satış iddiasını savunulabilir hale getirir.
- **Maliyet:** Yeni mikroservis gerekmez. En yüksek kaldıraç state transition, audit, test ve pilot operasyon şablonlarındadır.
- **Konumlandırma:** “Daha fazla AI” yerine “göndermeden önce kanıtlı kontrol” mesajı korunmalıdır.

## 7. Uygulama yol haritası

1. **Pilot admission:** izinli dosya kaydı, reviewer kaydı, S3 preflight ve KPI baseline.
2. **P0 ürün kapanışı:** satır düzeltme/istisna/revalidate, doğru rule provenance, cross-tenant integration test.
3. **Controlled dry run:** sentetik CSV/XLSX ile web + worker + DB + PDF regresyonu.
4. **Gerçek dosya dalgaları:** dosyaları tek tek kabul et; her dosyada izin, checksum, parse KPI, reviewer ve silme/retention kaydı.
5. **Pilot review:** beş dosya sonunda go/no-go; kapsam genişletme yalnız ölçülmüş sonuçla.

## 8. Riskler

- Müşteri dosyalarında kişisel/ticari hassas veri bulunması.
- Aynı poz kodunun gerçek kapsam ayrımını temsil etmesi; otomatik duplicate kararının yanlış pozitif üretmesi.
- Birim sözlüğünün MEP’e özgü `kW`, `kVA`, `lt/s`, `mSS`, `set`, `takım` gibi birimleri eksik bırakması.
- Formula cached result bulunmayan XLSX hücrelerinin boş miktar/fiyat üretmesi.
- Reviewer rolünün yalnız uygulama rolüyle karıştırılması; teknik yetkinlik ayrı kanıtlanmalı.
- S3-compatible sağlayıcının encryption, object lock veya lifecycle davranışlarının AWS S3 ile aynı varsayılması.

## 9. Karar ve dış girdiler

Pilot hazırlık sistemi kurulabilir; ancak aşağıdakiler gerçek sahipleri tarafından sağlanmalıdır:

1. Beş müşteri izinli MEP metraj dosyası ve izin referansları.
2. Teknik reviewer isimleri, uzmanlık/rol bilgileri, şirket üyelikleri ve onay scope’u.
3. Production S3 endpoint/bucket/region ve least-privilege kimlik bilgileri; secret değerleri repoya yazılmamalıdır.

Bu girdiler gelmeden ilgili kapılar **pending_external_evidence** kalmalıdır.
