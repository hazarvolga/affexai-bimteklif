# BIMMetraj — tüm GAP'leri kapatma ve iddia kanıtlama yol haritası

**Tarih:** 23 Ekim 2026
**Son durum güncellemesi:** 25 Ekim 2026 · Rev. 72 · `BIM-CALC-2026-10-25.66` · canlı revizyon `f474e99`
**Durum:** KULLANICI ONAYLI / UYGULANIYOR — Faz 0–4 geliştirme ve otomatik kanıt kapıları tamamlandı. Faz 5 kod akışı tamamlandı ancak T32 gerçek veraPDF runtime/lisanslı PDF/A dönüşüm sağlayıcısı nedeniyle açık. Faz 6 kod düzeyinde Pilot/L2 ve varsayılan kapalıdır; izinli resmî dosya, vendor ve uzman kabulü bekler. Faz 7'de T40 yerel rol topolojisi ve T41'in 8C dahil yerel güvenlik dilimleri kanıtlandı; Rev.57 control-plane least-privilege review açıklarını kapattı. Tenant bağlamsız/hassas global app okumaları, production worker canary/drain + ACL revoke, production cutover ve kalan tenant tabloları açıktır. T42'nin manuel ödeme ve worker lease dilimleri kısmen tamamlandı. **25 Ekim 2026:** Hazar'ın kararıyla `main` (`f474e99`, Rev. 72) Faz 0–11 kapanmadan canlıya alındı; rol kurulumu deploy içinde (db-bootstrap → migrate → db-provision) çalıştı ve `/api/health` `ok` / `db: connected` döndü. Bu bir production dağıtımıdır, Faz 7 veya Faz 11 kapanışı değildir; canlı kabul (T52) ve aşağıdaki açık kapılar sürer.
**Plan baseline:** `e748481684b296cc6a1cd5de0365136b47384d2b`
**Kaynak:** [23 Ekim bağımsız kod doğrulama raporu](/Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo/docs/audits/GAP_RAPORU_KOD_DOGRULAMA_2026-10-23.md).
**Kapsam:** 9 KOD başlığı, eski rapordaki 22 BUG/GAP/SEO/GEO maddesi, altı hesap motoru değerlendirmesi, tamamlanmamış doğrulamalar ve rakip/iddia kanıtı. Toplam **56 To-Do**, **12 faz**.

## 1. Onaylanan sonuç

Bütün açıklar için uygulanabilir kapanış programı kullanıcı tarafından 23 Ekim 2026 tarihinde onaylanmıştır. Plan onayı mevcut açıkların kapandığı anlamına gelmez. Kod, test, kaynak, uzman ve canlı kanıtı tamamlandıkça ilgili iş kapanır.

İki ayrı hedef izlenecek:

1. **Hesaplama ve ürün güvenilirliği:** tanımlı mevzuat sürümü, yürürlük tarihi, proje/ihale/vergi rejimi ve girdi koşulları için uygulanabilir kuralların eksiksiz izlenmesi; bağımsız hesap karşılaştırması; uzman onayı; gerçek dosya ve canlı kabul.
2. **Rekabet iddiasının doğrulanması:** Türkiye pazarı, ürün kategorisi, tarih ve özellik bileşimi açıkça tanımlanarak kaynaklı rakip incelemesi. Araştırma eşdeğer bir ürün bulursa “tek” iddiası reddedilecek; bulunmaması evrensel yokluk ispatı sayılmayacak.

**“%100 mevzuata uyumlu” şeklindeki sınırsız bir güvenceyi yalnız yazılım testleriyle kanıtlayamayız.** Hedef, onaylı kapsamda uygulanabilir her gereksinimin kaynak → kod → test → uzman → sürüm zincirini tamamlamaktır. “Tanımlı gereksinimlerin tamamı test edildi” ölçümü, tüm mevzuata genel uygunlukla karıştırılmayacak. Bir yapının resmî uygunluk kararı ile yazılımın hesap doğrulaması ayrı tutulacak.

**“Türkiye'de tek” iddiası peşinen onaylanmayacak.** Son kararı araştırma ve iddianın yayımlanacağı bağlama uygun hukuk/reklam değerlendirmesi belirleyecek. Kanıt yetersizse sonuç “kanıtlanamadı” olarak kalır; açıklanmamış rakip özellikleri “yok” yazılmaz.

Önerilen kanıtlı ifade şablonları, ancak koşulları sağlanınca kullanılacak:

- “BIMMetraj [sürüm], [tarihte yürürlükteki belge/maddeler] için [açık kapsam ve girdi koşulları] dahilinde bağımsız uzman tarafından doğrulanmıştır. Kapsam ve sonuç dosyası: [kanıt bağlantısı].”
- “Türkiye pazarında [tarih] itibarıyla incelenen [tanımlı ürün listesi] arasında [belirli özellik bileşimini] birlikte sunduğu doğrulanan ürün.” Bu ifade de karşılaştırma sonucuna bağlıdır.

### 1.1. 24 Ekim 2026 itibarıyla kaldığımız yer

Bu bölüm, Codex oturumu veya kullanım limiti kesilse bile güvenli devam noktasını gösterir. Aşağıdaki “tamamlandı” ifadeleri yalnız kod ve kayıtlı otomatik kanıt kapsamındadır; production, bağımsız uzman, vendor veya müşteri kabulü anlamına gelmez.

| Alan | Mevcut durum | Kanıt / baseline | Kalan ana kapı |
|---|---|---|---|
| Faz 0 | **Geliştirme kapısı tamamlandı** | `50896d5`; `docs/audits/phase-0/*` | Gerçek izinli vendor/müşteri dosyaları ve isimli uzman imzaları Faz 9'da |
| Faz 1 | **Kod/test tamamlandı** | `0388a2a`; `PHASE_1_REPORT_2026-10-23.md` | Lisanslı katalog/PDF kullanım hakkı ve bağımsız maliyet uzmanı kabulü |
| Faz 2 | **Kod/test tamamlandı** | `a836b6e`; `PHASE_2_REPORT_2026-10-23.md` | İzinli gerçek IFC matrisi ve L3/L4 kabulü |
| Faz 3 | **Kod/test tamamlandı** | `91b0bf6`; `PHASE_3_REPORT_2026-10-23.md` | Yetkili standart metni, vergi/ihale ve mühendis imzaları |
| Faz 4 | **Kod/test tamamlandı** | `157d13c`; `PHASE_4_REPORT_2026-10-23.md` | Gerçek çok-kullanıcılı saha ve production kabulü |
| Faz 5 | **Kısmi** | `601ce90`; Rev. 43 / `885dd9d`; `PHASE_5_REPORT_2026-10-23.md` | T32 gerçek veraPDF runtime, lisanslı dönüşüm sağlayıcısı ve izinli dosya matrisi |
| Faz 6 | **PARTIAL / Pilot L2 / default-off** | `ff057c4`; Rev. 46 / `dc3daea`; `PHASE_6_REPORT_2026-10-24.md` | Resmî Yeşil Defter/ataşman, OSKA/AMP native dosya, ihale uzmanı ve saha kabulü |
| Faz 7 / T40 | **Production rol geçişi canlıda (Rev. 72); kabul kanıtı açık** | `eeeaf75`, `b8733c0`, `b9bf785`; Rev. 47, 51 ve 72; canlı `f474e99` | Secret rotasyonu teyidi, production `role-model-smoke`, canary, restore/parity ve rollback kanıtı |
| Faz 7 / T41 | **PARTIAL — 22 tenant tablosu RLS altında canlıda; Rev. 71 companies/subscriptions/usage_logs tenant context** | Rev. 61: `4afe32b` / `fd73459`; Rev. 71: `1448541`; 0020 entitlement + 0021 company-context capability | Worker canary/drain + authority-table ACL revoke, kalan tenant tabloları ve canlı negatif tenant kanıtı |
| Faz 7 / T42 | **PARTIAL** | Manuel Havale/EFT `30bb9ee`; worker fencing `c185518`; Rev. 49–50 | Academy entitlement (flag kapalı), heartbeat/orphan cleanup, gerçek banka/dekont ve production rollout |
| Faz 7 / T43–T45 | **Uygulanıyor / açık** | T45 sentetik IFC parser ölçümü 3/3 tekrarlandı; T43 coverage/E2E ve T44 restore/recovery yok | Ölçümden önce onaylı p95 bütçeleri, gerçek büyük IFC/Excel/PDF/3D, eşzamanlı tenant, hedef VPS ve kurtarma kanıtı |
| Faz 8 / T47 | **Kod/test tamamlandı (Rev. 73)** | `be0791f`; sitemap lastmod yok, PUBLIC_APP_URL fail-fast ve yerel 404 testli, canonical/404/noindex mevcut testler | Canlıya alındıktan sonra Search Console'da sitemap okuma kanıtı |
| Faz 8 / T49 | **PARTIAL (Rev. 73–75)** | `be0791f`, `b8ea6d2`; BreadcrumbList, WebApplication, DefinedTermSet; AI tarayıcı grupları; **Hazar'ın kararı (25 Ekim 2026): eğitim tarayıcıları açık kalır** (`ROBOTS_AI_TRAINING` tanımsız); Organization `areaServed` TR | Gerçek kurumsal profil bağlantıları (sameAs), Rich Results doğrulaması |
| Faz 8 / T46 | **PARTIAL (Rev. 74–75)** | `bc0ee54`, `b8ea6d2`; llms.txt, /pricing, site JSON-LD (featureList, fiyat aralığı) kayıt/katalogdan; landing iddiaları düzeltildi; genel sayfa iddia kapı testi | Mevzuat sayfaları ve admin açıklamalarının hizalanması |
| Faz 8 / T48 | **Kod/test tamamlandı (Rev. 74)** | `cc51619`; metin #root içinde ön-render, Chromium CLS 0, mount sonrası tek main/h1, noscript'siz metin çıkarımı | Canlıda Readability/Trafilatura ile örnek sayfa çıkarımı ve Lighthouse karşılaştırması |
| Faz 9–11 | **Açık** | Yol haritası tanımlı | Bağımsız kabul, rakip araştırması, release ve nihai kapanış |

**Son başarılı kod commit'i:** `4afe32b` (kod) + `fd73459` (roadmap/doküman) — T41 8C worker company context capability. `findMembership` ve `findSubscription` aynı checked-out PoolClient üzerinde transaction-local tenant context sonrasında typed Drizzle çalıştırıyor. Auth tenant testleri 8/8, ilgili session/route testleri ve TypeScript geçti; Rev.58 tenant transaction kanıtı korunuyor. Tam `pnpm test`, güvenli test DB URL'si bulunmadığı için tamamlanmadı; worker entitlement, kalan tenant reads, ücretli kayıt + teslimat hatası + resend route-level integration kanıtı ve production cutover açık kapılar olarak duruyor.

**Rev. 57 sonucu ve sıradaki zorunlu T41 işi:** Rev.55'in açtığı yazma uyumsuzluğu ve Rev.56 final inceleme P1'leri yerelde kapandı. Audit app INSERT nedeniyle credential compromise altında forge edilebilir ve authenticity kanıtı değildir. Sıradaki dilim, tenant context kurulmadan yapılan app okumalarını aynı checked-out bağlantı/transaction sınırına almak ve worker'a geniş authority-table grant'i vermeden plan/abonelik entitlement okuması sağlamaktır. Ardından kalan tenant tabloları ve production secret cutover/canary/restore gelir. Bunlar tamamlanmadan production role cutover/deploy NO-GO ve T41 PARTIAL'dır.

**8B/8C hazırlık sonucu:** Worker authority okumalarının production kritik yolları dar capability function'lara ayrıldı; `companies.active_standard`, `companies.smartcheck_max_waste_percent` ve IFC entitlement yolu artık production branch'te worker-only function kullanır. Local/test fallback ve kalan app request yolları bilinçli olarak korunur. Eski worker image'ını kırmamak için ACL revoke yapılmadı. Canary, worker drain, canlı image doğrulaması ve sonra ACL revoke zorunludur. Ayrıntılı sözleşme `docs/audits/phase-7/PHASE_7_T41_WORKER_ENTITLEMENT_2026-10-24.md` içindedir.

**8B yerel kod sonucu / Rev. 60:** `0020_worker_entitlement_capability` migration, role contract ve production IFC quota adapter tamamlandı. Function yalnız `bimmetraj_worker` EXECUTE alıyor; release artifact zinciri 15/15 ve worker capability negatif testi geçti. Canary/drain sonrası doğrudan authority-table ACL revoke, kalan worker reads ve production cutover hâlâ açık.

**Çalışma ağacı koruması:** `graphify-out/*` dosyaları `graphify update .` nedeniyle değişmiş durumdadır ve ürün commit'lerine eklenmemelidir. Kullanıcıya ait `docs/agent-memory/gelecekteki-global-konumlandırma.md` ile kökteki `proje_analiz_gap_bug_seo_geo_rakip_raporu.md` stage edilmemeli/değiştirilmemelidir.

## 2. Çalışma ve onay sınırları

- Plan 23 Ekim 2026 tarihinde kullanıcı tarafından onaylandı. Fazlar sırasıyla uygulanır; her faz doğrulanıp ayrı commit edilir. Tüm 12 faz tamamlanmadan production deployment yapılmaz.
- Onay sonrasında mevcut React/Vite + Express + Drizzle mimarisinde ilerlenir. Next.js/NestJS yeniden yazımı bu açıkları kapatmanın önkoşulu yapılmaz.
- Planın kabulü; uzman adına imza atma, ücretli hizmet/lisans satın alma, üçüncü tarafa dosya gönderme veya canlı deploy izni sayılmaz. Bunlar gerektiğinde somut kapsam/maliyet/sürümle ayrı sunulur.
- Her fazın sonunda kanıtlı kapanış özeti ve kalan bağımlılıklar gösterilir. Zorunlu girdi/uzman onayı yoksa madde tamamlandı sayılmaz; bağımsız işler sürdürülebilir.
- Kapanış durumları: **bekliyor → uygulanıyor → test edildi → uzman/operasyon kabulü bekliyor → kapandı**. Yanlış rapor teşhisleri **kanıtla reddedildi / işlem gerektirmiyor** olarak ayrılır; bunlar ürün yeteneği tamamlanmış gibi sayılmaz.
- Her tamamlanma kaydı: iş ID, kabul kriteri, kod SHA, kaynak sürümü/hash, fixture hash, test komutu/çıktısı, uzman veya operasyon kanıtı, tarih ve kalan sınır.
- Takvim ve maliyet, Faz 0'da dosya/uzman/lisans erişimi netleşince çıkarılır. Özellikle hakediş, yetkili CDE ve PDF/A yeni ürün işidir; “birkaç günlük bug fix” olarak tahminlenmez.

## 3. Fazlar ve bağımlılıklar

| Faz | İşler | Önkoşul | Başlıca sorumluluk | Faz kapanış çıktısı |
|---|---|---|---|---|
| 0 — Kapsam ve kanıt sözleşmesi | T01–T04 | Kullanıcı plan onayı | Ürün sahibi + teknik ekip + ilgili uzmanlar | Gereksinim/iddia matrisi, kaynak ve örnek dosya listesi |
| 1 — Poz, birim ve fiyat kaynağı | T05–T09 | Faz 0 geliştirme kapısı | Backend/BIM + maliyet uzmanı | Kaynaklı ve birim güvenli fiyat çözümleyici |
| 2 — IFC kapsam ve metraj bütünlüğü | T10–T18 | Faz 0; fiyatlı sonuçlar için Faz 1 | BIM/IFC + frontend + mühendis | Browser/worker tutarlılığı ve kayıpsız icmal |
| 3 — Mevzuat ve hesap motorları | T19–T26 | T02–T04; fiyatlı örneklerde Faz 1 | Alan uzmanları + hesap motoru geliştiricisi | Tarihli kural setleri ve bağımsız hesap dosyaları |
| 4 — Gerçek CDE onay akışı | T27–T29 | T02; DB/RBAC tasarımı T40–T42 ile birlikte | Backend/frontend + BIM koordinatörü | Kalıcı, yetkili ve denetlenebilir iş akışı |
| 5 — Güvenli çıktı ve inceleme | T30–T34 | İlgili Faz 1–3 işleri | Full-stack/IFC + güvenlik + belge uzmanı | Güvenli CSV/teklif, PDF/A ve 3B inceleme |
| 6 — Hakediş ve EKAP | T35–T39 | T07, T20, T21, T24, T30, T34 | Teknik ofis/maliyet/ihale uzmanı + full-stack | Çok dönemli hakediş ve savunma dosyası |
| 7 — Güvenlik, performans ve doğrulama | T40–T45 | Faz 0; diğer fazlarla kontrollü paralel | DevOps/güvenlik/test | İzole test, tenant ve kurtarma kanıtları |
| 8 — Ürün anlatımı ve SEO/GEO | T46–T49 | T03; beyan edilen işin kabulü | Frontend/içerik/ürün | Tek kaynakla tutarlı kamu/admin yüzeyleri |
| 9 — Bağımsız kabul ve yayın | T50–T52 | İlgili geliştirmeler + Faz 7 | Bağımsız uzmanlar + ürün sahibi + DevOps | L3/L4 kanıtı ve onaylı canlı sürüm |
| 10 — Rakip ve “tek” iddiası | T53–T55 | T03; araştırma erkenden paralel, karar T50–T52 sonrası | Ürün/pazar araştırması + hukuk/reklam uzmanı | Tarihli karşılaştırma ve kullanılabilir iddia |
| 11 — Nihai kapanış | T56 | T01–T55 karar/kanıtları | Ürün sahibi + bağımsız inceleme | Eksiksiz kapanış matrisi ve onay dosyası |

Tek yazma sahibi/modül ilkesi korunur. Ortak şema değişimleri ve migration'lar sıralı yapılır; bağımsız okuma/test/uzman incelemeleri paralel yürütülebilir.

## 4. Ayrıntılı To-Do listesi

### Faz 0 — Kapsam ve kanıt sözleşmesi

- [x] **T01 — Kapanış envanteri ve baseline.** Her KOD/BUG/GAP/SEO/GEO maddesini gereksinime bağla; eski yanlış teşhisleri ayır; başlangıç Git, CI, test, canlı build ve worker durumu kaydını yenile. **Kabul:** rapordaki hiçbir madde sahipsiz kalmaz; yanlış bulgu için gereksiz değişiklik yapılmaz. **Sorumlu:** teknik ekip.
- [x] **T02 — Resmî kaynak ve yürürlük matrisi.** TS 500/TBDY/TS 708, ilgili imar/yangın hükümleri, ÇŞB ölçü tarifleri, 4734/4735, YAMBİS, KDV ve e-PYS/ISO için madde, belge URL/dosya, hash, yayım/yürürlük, değişiklik/istisna, ülke/proje kapsamı oluştur. Standartlara yetkili erişim ve katalog kullanım hakkını kaydet. **Kabul:** kaynaksız eşik onaylı kurala dönüşmez; hukuk/teknik belirsizlikler açık listelenir. **Sorumlu:** alan uzmanları + ürün sahibi.
- [x] **T03 — İddia ve gereksinim kapsamı.** 19 capability kaydının gerçekten hangi davranışı vaat ettiğini çıkar; formül doğruluğu, mevzuat kapsamı, kurum onayı ve saha kabulünü ayır. “Türkiye'de tek” için kategori/özellik seti/tarih/coğrafya ve inceleme yöntemini önceden tanımla. **Kabul:** başarı kriterleri sonuç görüldükten sonra daraltılmaz; kapsam değişikliği kullanıcı kararına gider. **Sorumlu:** ürün sahibi + uzmanlar.
- [x] **T04 — Referans dosyalar ve uzman atama sözleşmesi.** İzinli ALLPLAN/Revit/ArchiCAD/Tekla IFC, PDF, fiyat, ihale/hakediş/vergi senaryoları için edinim/PII/lisans protokolünü; STR/ARC/MEP/COST ve vergi/ihale kapsamlarını; trust-store ve imza şemasını sabitle. **Faz 0 kabulü:** her motorun normal, sınır, eksik/hatalı senaryo kaydı ve eksik dış girdiler için doğrulanabilir blocker vardır; sentetik/açık kaynak örnek gerçek müşteri kabulü sayılmaz. **Faz 9 kabulü:** gerçek izinli dosyalar, isimli uzmanlar ve bağımsız beklenen sonuçlar T50–T51 kapsamında tamamlanır. **Sorumlu:** ürün sahibi + uzmanlar.

### Faz 1 — Poz, birim ve fiyat kaynağı

- [x] **T05 — 18.848 satırın yapısal ve kaynak denetimi.** Kitap/dönem/birim/poz/rayiç/endeks ayrımını, duplicate ve parse hatalarını, belge hashlerini ve kaynak PDF eşleşmesini kontrol et. Örneklem ile tam tarama kanıtını ayır. **Kabul:** sayım, kaynak ve kullanılabilir kayıt sayısı ayrı raporlanır; listede bulunmayan kod uydurulmaz.
- [x] **T06 — Doğru imalat→poz çözümleyici.** Mevcut 14 sabit eşlemenin tamamını, özellikle gazbeton, XPS/yağmur oluğu, süpürgelik/PVC ve parke eşleşmelerini uzmanla düzelt. Kalınlık, malzeme ve imalat koşullarını kullan. **Kabul:** mevcut dört karşı örnek doğru katalog kaydına veya gerekçeli incelemeye gider; belirsizlik generic fiyata dönüşmez.
- [x] **T07 — Boyut ve birim sözleşmesi.** m³/m²/m/mtül/kg/ton dönüşümlerini açık kanıta bağla; alandan hacme geçişte doğrulanmış kalınlık gibi zorunlu girdileri iste. Net miktar, fire/maliyet miktarı ve hakediş miktarını ayır. **Kabul:** eksik girdiyle sessiz dönüşüm yok; UI, API, CSV, teklif ve toplam aynı birim anlamını korur.
- [x] **T08 — BYOL/ÇŞB seçimini gerçek veriye bağla.** Tenant'a ait lisanslı katalog ve yetkili referans kaynağını ayrı çöz; geçerlilik dönemi, onay durumu, sürüm ve seçilen fiyatı kaydet. **Kabul:** kaynak değiştirmek hesapta beklenen kaydı değiştirir; tenant A kataloğu B'ye sızmaz; süresi geçmiş/kayıtsız fiyat güncel resmî fiyat diye seçilmez.
- [x] **T09 — Sabit/demo fiyatlar ve fiyat geçmişi.** Kaynaksız varsayılanları kaldır veya açık demo olarak ayır; manüel fiyatın sahibini/tarihini kaydet; teklif revizyonunu katalog değişince geriye dönük yeniden fiyatlama. **Kabul:** her fiyatın provenance kaydı ve UI etiketi vardır; tarihli tahmini eskalasyon resmî fiyatla karışmaz; YFK/BYOL izin kanıtı eksikse ilgili ticari kullanım kapısı açık kalır.

### Faz 2 — IFC kapsam ve metraj bütünlüğü

- [x] **T10 — Malzeme sınıflandırması.** Gazbeton/Gaz beton, beton, grobeton, şap, ahşap/kâgir ve karışık katmanları ayrıştır; kelime alt-dizgisiyle yanlış yapısal beton atamasını engelle. **Kabul:** Gazbeton yeniden C30'a düşmez; belirsiz malzeme görünür inceleme gerekçesi üretir.
- [x] **T11 — Beton sınıfından poz seçimi.** C25/30, C30/37, C35/45 ve boşluklu/yazım varyantlarını normalize et; sınıfsız veya farklı amaçlı betonu varsayılan C30'a atama. **Kabul:** doğru sınıf doğru onaylı pozla eşleşir; desteklenmeyen sınıf kullanıcıya gösterilir.
- [x] **T12 — Örnek projeleri ve beklenen sonuçları düzelt.** Statik örneğe gerçekçi materialLayers/predefinedType kanıtı ekle; perde, koruma betonu ve C25 döşeme sonuçlarını kaynakla yeniden belirle. **Kabul:** 4,80 m³ perdenin kaybolması ve kaynaksız 450/980 fiyat varsayımı biter; örnekler demo olarak işaretlidir.
- [x] **T13 — Browser/worker sözleşmesi.** Ortak normalize veri şeması; desteklenen sınıflar, katmanlar, units, type inheritance, aggregates ve QTO önceliği için parity kur. Browser'da desteklenmeyen alanı açıkça server'a yönlendir. **Kabul:** aynı desteklenen dosyada kanıt/miktar/kimlik tutarlı; eksik browser kanıtı sessiz “tam metraj” sayılmaz.
- [x] **T14 — Kota/abonelik/e-posta hata akışı.** `b9153eb` dalındaki işi güncel main'e karşı incele, uygun kısmı birleştir veya yeniden uygula. **Kabul:** 403 nedeni kalıcı ve Türkçe; e-posta/paket aksiyonu doğru; reddedilen dosya yüklenmiş görünmez; tekrar deneme çalışır.
- [x] **T15 — Kimlik, duplicate ve kapsam kayıtları.** Dosya/run/STEP kimliğiyle elemanı izlerken duplicate GlobalId'yi ayrı bulgu olarak koru; aggregates çocuklarını çift sayma. **Kabul:** aynı GUID'li farklı eleman bulguları kaybolmaz; dışlanan/sayılan girdiler denetlenebilir.
- [x] **T16 — Donatı ve desteklenmeyen miktar.** Pozlu donatının matched sayılıp satır üretmeden atlanmasını düzelt; kg/ton dönüşümünü ve kaynaklı gerçek donatı ile tahmini donatıyı ayır. **Kabul:** 100 kg örnek satıra veya açıklamalı kapsamdışına gider; sıfır çıktı ile başarılı eşleşme gösterilmez.
- [x] **T17 — Kontrollü kapsam genişletme.** Isı/su/ses yalıtımı, kapı, pencere, korkuluk, çatı, temel, asma tavan ve ilgili çok katmanlı elemanlar için imalat/poz/birim koşullarını tek tek tanımla. **Kabul:** bitümlü membran XPS olmaz; Footing/Roof mevcut desteği korunur; her yeni eşleme uzman referansı ve negatif test taşır. “40+ poz” sayısı kalite ölçütü yapılmaz.
- [x] **T18 — Metrajın korunumu ve kalite kapısı.** IFC2x3/4/4.3, bağımsız alan/hacim/kütle birimleri, net/brüt çakışması, sıfır/negatif miktar, orphan opening, eksik kat ve geometriden tahmin sınırlarını test et. **Kabul:** her ilgili elemanın ölçülen/ölçülemeyen/dışlanan durumu açıklanır; veri kaybı ve çifte sayım kontrol edilir; boyutlar karıştırılarak tek toplam üretilmez.

### Faz 3 — Mevzuat ve hesap motorları

- [x] **T19 — YAMBİS.** Eksik banka verisini kesin uygunluktan ayır; değerlendirme tarihi ve geçici iş gücü istisnasını modelle; oran sınırları, grup muafiyetleri ve kaynak atıflarını uzmanla doğrula. **Kabul:** eksik veri “uygun” olmaz; geçici hükmün öncesi/içi/sonrası testlidir; yanlış davranışı koruyan test düzeltilir.
- [x] **T20 — KİK ADT ve %80 liste.** İdarenin kalem bazlı yaklaşık maliyetini teklif dağılımından ayır; resmî örnek, sınır teklifleri, yuvarlama ve sıralama açıklamalarını düzelt; parasal metin girişlerini Türkçe ondalıkla test et. **Kabul:** resmî sorgulama listesi teklif fiyatı değişince kendiliğinden değişmez; eksik idare verisiyle resmî liste üretilmez.
- [x] **T21 — 4735 fiyat farkı.** Geçerli sözleşme/tarih rejimi, iş programı ve uygulama ayı, gecikmenin hukuki nedeni, avans/mahsup ve endeks seçimini modele ekle. B katsayısı, ağırlık toleransı, 21 endeks kimliği/kaynağını doğrula. **Kabul:** normal/gecikmeli/avanslı/negatif fark/eksik endeks örnekleri bağımsız hesapla eşleşir; kullanıcı keyfî katsayıyı resmî rejim gibi sunamaz.
- [x] **T22 — Kat karşılığı ve KDV.** Ruhsat/teslim tarihi, konut–işyeri, 6306 statüsü, net alan dilimi ve emsal bedel koşullarını ayrı girdilerle bağla; karma projeyi destekle. **Kabul:** her rejimin madde/dayanak ve yuvarlama izi olur; eksik tarih veya statüye otomatik vergi uygunluğu verilmez; vergi uzmanı onayı alınır.
- [x] **T23 — Pre-BIM ve imar fizibilitesi.** Emsale dahil, sınırlı muaf ve tamamen muaf alanları; TAKS/KAKS, kat ve yerel plan notu bağımlılıklarını ayır. Piyasa maliyet dağılımlarını tarihli referans olarak sun. **Kabul:** muafiyet iki kez kullanılmaz; yerel plan bilgisi yokken resmî imar uygunluğu üretilmez; desteklenen alan hesapları uzman örneğiyle doğrulanır.
- [x] **T24 — Minha ve kalem bağlantısı.** İmalat/poz/sözleşme özelindeki ölçü esaslarını doğrula; CSB/DIN/özel profil ve uzman ekranını hizala; boşlukları doğru duvar/kaplama kalemine bağla, net QTO'dan tekrar düşümü engelle. **Kabul:** profil değişimi ilgili net kalemi doğru etkiler; yalnız özet değişimi “hesap uygulandı” sayılmaz; eşlenemeyen boşluk incelemeye gider.
- [x] **T25 — TS 500/TBDY/TS 708 ve 3×3.** Şirket %3 politikasını normatif hükümlerden ayır; eleman/ortam/temel/paspayı ve donatı kütle/kenetlenme örneklerini erişilebilir yetkili standartla doğrula. EC2/diğer standartlarda açık seçim ve destek sınırı uygula. **Kabul:** her eşik doğru madde ve birimle izlenir; bütün temellere tek 25 mm genellemesi yok; bağımsız hesaplar `eng_calc.py` ve ayrı uzman hesabıyla karşılaştırılır, araç da hatasız oracle varsayılmaz.
- [x] **T26 — e-PYS ve ISO kural kapsamı.** İlgili resmî belge sürümü ve EK-1..EK-9 gereksinimlerini dosya/özellik kanıtına bağla; otomatik, manuel ve uygulanamaz maddeleri ayır. **Kabul:** kanıt yoksa PASS yok; tüm desteklenen disiplinlerin olumlu/olumsuz örneği var; yazılım kontrolü ruhsat/kurum onayı diye sunulmaz.

### Faz 4 — Gerçek CDE onay akışı

- [x] **T27 — Geçiş motorunu düzelt.** En yeni kabul edilmiş durumu kullan; açık geçiş tablosu, suitability/revision eşleşmesi ve eksik/bozuk geçmişi kontrol et. **Kabul:** WIP→SHARED→PUBLISHED işler; SHARED/S0 ve yetkisiz atlama reddedilir; tüm izinli/yasak geçişler testlidir.
- [x] **T28 — Kalıcı ve çok kullanıcılı CDE.** Tenant/proje/revizyon bazlı DB/API; gerçek kimlik ve disiplin rolü; onay/ret/geri çekme; eşzamanlı karar, idempotency ve değişiklik geçmişi ekle. **Kabul:** başka kullanıcı aynı durumu görür; tarayıcı depolaması silinince kayıt kaybolmaz; yetkisiz/başka tenant kararı sunucuda reddedilir; varsayılan kişi adı onay sayılmaz.
- [x] **T29 — Revizyon ve uzman onayının geçersizleşmesi.** Dosya, kaynak, kural veya sonuç değişince eski onayın kapsamını koruyup yeni revizyon için yeniden onay iste. **Kabul:** geçmiş değiştirilemez iz taşır; yeni sonuç eski imzayla onaylı görünmez; L3/L4 kayıtları belge/kod/hash ile bağlıdır.

### Faz 5 — Güvenli çıktı ve inceleme

- [x] **T30 — CSV/XLSX güvenliği.** Ortak serializer; ayraç/tırnak/satır sonu, Türkçe sayı ve formül başlangıçlarını güvenli işle. **Kabul:** `=1+1`, `Salon;extra`, CR/LF, tırnak ve Unicode örnekleri sütunları bozmaz; Excel/LibreOffice gerçek açma testiyle metin hücreleri formül yürütmez. **23 Ekim 2026:** Ortak serializer ve fail-closed parser devrede; gerçek LibreOffice açma testi formül yürütülmediğini ve sayısal tiplerin korunduğunu doğruladı.
- [x] **T31 — PDF imza ön kontrolü.** Belirlenmiş kaynak sınırları içinde tüm sayfaları ve nested AcroForm ağacını tara; imza alanı, doldurulmuş imza, kriptografik doğrulama ve güvenilir sertifika durumunu ayrı raporla. **Kabul:** 21. sayfa/nested/boş alan örnekleri doğru ayrılır; tarama kesildiyse tamamlanmış kontrol denmez. Gerçek imza geçerliliği iddia edilecekse güven zinciri/iptal/zaman damgası doğrulaması ve uzman kabulü gerekir. **23 Ekim 2026:** Sınırlı ve döngü korumalı yapısal preflight tüm sayfa/AcroForm zincirini tarar; kriptografi, güven zinciri, zaman damgası ve iptal kontrolü açıkça `not_checked`/`indeterminate` kalır.
- [ ] **T32 — Gerçek PDF/A akışı.** Lisans ve kaynak tüketimi uygun dönüşüm/doğrulama çözümünü seç; asıl belgeyi koru; dönüştürülmüş sürümü ve veraPDF/eşdeğer doğrulama raporunu sakla. **Kabul:** sadece XMP etiketiyle PASS yok; font/renk/ek/çok sayfa örnekleri doğrulanır; imzalı belge dönüştürülünce imzası korunmuş varsayılmaz, gerekiyorsa yeniden imza akışına gider. **23 Ekim 2026 — Kısmi / NO-GO:** veraPDF rapor ayrıştırma, kaynak checksum/lineage ve ayrı validation artifact'ı devrede; gerçek CLI runtime ve lisanslı dönüşüm sağlayıcısı seçilip izinli dosya matrisi çalıştırılmadığından görev kapanmadı. **25 Ekim 2026 — runtime kod kapsamı:** `ifc-worker` imajına veraPDF 1.30.3 (SHA-256 `b512bf24…9a59`, lisans GPLv3+ / MPLv2+ çift lisans, verapdf.org ve veraPDF-apps README'den doğrulandı) eklendi; ham XML rapor ayrı `verapdf_report_xml` artifact'ı olarak saklanıyor; 7 vakalık matris (yalnız XMP etiketi PASS almıyor) imaj içinde geçti — [T32 raporu](phase-5/T32_VERAPDF_RUNTIME_2026-10-25.md). İzinli gerçek dosya matrisi ve dönüşüm kararı açık; görev KISMİ.
- [x] **T33 — 3B IFC inceleme.** GlobalId + kaynak eleman kimliğiyle satır–model seçimi/vurgulama, gizleme ve kapsam dışı öğe incelemesi ekle. **Kabul:** kullanıcının seçtiği satır doğru nesneyi vurgular; duplicate GUID/units/koordinat farkı ele alınır; görüntüleme geometrisi kanıtsız metrajın kaynağı olmaz; büyük model bellek sınırı ölçülür. **23 Ekim 2026:** Kaynak hash + run + STEP kimliğiyle seçim, vurgulama/gizleme/izolasyon ve bellek/üçgen/mesh sınırları pilot olarak tamamlandı; üretim ölçeğinde ana iş parçacığı performans kabulü açıktır.
- [x] **T34 — İcmal→kalıcı teklif köprüsü.** Mevcut iki çağırandaki callback/CSV ayrımını çöz; doğrulanmış miktar/fiyat/provenance ve inceleme statüsünü API üzerinden revizyonlu teklife taşı. **Kabul:** yeniden yükleme sonrası kalemler korunur; miktar/birim/fiyat değişmez; onaysız aktarım sahte verified olmaz; mükerrer gönderim çift teklif üretmez. **23 Ekim 2026:** Sunucuda yeniden kurulan Calm projeksiyonu, kanonik satır seçimi ve kaynaklı fiyat yetkisiyle immutable ardıl teklif üretir; actor+tenant idempotency, semantik tekrar koruması ve satır lineage'ı kalıcıdır.

### Faz 6 — Hakediş ve EKAP

- [ ] **T35 — Çok dönemli hakediş modeli.** Kod/test çekirdeği tamamlandı; feature varsayılan kapalıdır. **Kabul:** geçmiş hakediş sonraki düzenlemeyle sessiz değişmez; iptal/düzeltme/revizyon ve eşzamanlı işlem testlidir. **Kalan:** izinli gerçek proje ve saha kabulü.
- [ ] **T36 — Yeşil Defter, ataşman ve metraj icmali.** Kaynak bağlı ölçüm/review çekirdeği tamamlandı. **Kabul:** satırdan ölçü ve kaynağa geri gidilir; onaylı dönem toplamı icmal/raporla uyuşur; basit örnek mahal tablosu resmî Yeşil Defter diye sunulmaz. **Kalan:** izinli resmî Yeşil Defter/ataşman/icmal ve teknik ofis kabulü.
- [ ] **T37 — Mukayeseli keşif ve kesin hesap.** Deterministik/fail-closed çekirdek tamamlandı. **Kabul:** dönemler arası korunacak tutarlar ve kapanış toplamları bağımsız teknik ofis örneğiyle tutar; sözleşme kapsamı dışı karar uzman incelemesine gider. **Kalan:** bağımsız golden fixture ve uzman imzası.
- [ ] **T38 — OSKA/AMP aktarım kabulü.** Yalnız `candidate` / `internal_roundtrip` düzeyinde kod vardır. **Kabul:** hedef yazılımda gerçek import başarıyla denenir; yalnız dosya oluşturmak “uyumlu entegrasyon” sayılmaz. **Kalan:** lisanslı native vendor dosyası ve yetkili kullanıcı/vendor kabulü.
- [ ] **T39 — EKAP tutanak ve savunma paketi.** Provenance/manifest yardımcısı tamamlandı; resmî gönderim kapsam dışıdır. **Kabul:** bozuk/eksik/tekrarlı tutanak ve OCR hatası sessiz kabul edilmez; yetkili ihale uzmanı örnek paketi inceler; otomatik resmî başvuru yapılmaz. **Kalan:** isimli ihale uzmanı ve izinli gerçek paket kabulü.

### Faz 7 — Güvenlik, performans ve test

- [ ] **T40 — DB rol ayrımı.** Yerel app/worker/migrator/backup credential topolojisi, fail-closed inspector/provisioner ve A→B→A rotation/rollback disposable PostgreSQL 16 üzerinde kanıtlandı (`eeeaf75`, `b8733c0`). Rev. 72 (`b9bf785`) rol kurulumunu Coolify deploy'una taşıdı; production 25 Ekim 2026'dan beri `f474e99` ile ayrık rollerle çalışıyor. **Kabul:** runtime superuser/BYPASSRLS değil; yetkisiz DDL reddedilir; app ve Graphile Worker gerekli işlemleri sürdürebilir; rol geçişinin geri dönüş planı testlidir. **Kalan:** secret rotasyonu teyidi, production `role-model-smoke`, canary, restore/parity ve rollback kanıtı.
- [ ] **T41 — DB seviyesinde tenant savunması.** CDE'de 5, hakedişte 10, SmartCheck pilot evidence'da 2, şirket sektör ayarında 1 ve CRM/kota diliminde 4 olmak üzere 22 tenant tablosu; ayrıca pilot audit/global katalog yüzeyleri FORCE RLS/transaction-local context ile korunuyor. Rev.56 ayrı `bimmetraj_control` rolü/pool'u ve exact ACL/RLS ile meşru authority-table mutasyonlarını app kimliğinden ayırdı; Rev.57 authority/support ACL, bağlantı URL'si, startup preflight ve append-only audit sınırını least-privilege inceleme bulgularına göre sertleştirdi (`58cf320`, `cd4b640`, `5e11135`, `63c5c60`, `82207c2`, `1dcc0bc`, `a55841e`). **Kabul:** havuz bağlantısı yeniden kullanımı ve eşzamanlı A/B isteklerinde veri sızmaz; uygulama filtre hatasına karşı negatif DB testi geçer; uygulama RBAC kaldırılmaz. **Kalan:** worker canary/drain sonrası authority-table ACL revoke, diğer tenant tabloları ve canlı negatif kanıt; Rev. 71 (`1448541`) ile companies/subscriptions/usage_logs request-path okumaları tenant context'e alındı. Görev PARTIAL.
- [ ] **T42 — Yetki ve kaynak sınırı regresyonu.** Manuel Havale/EFT transaction/idempotency dilimi (`30bb9ee`) ve SmartCheck worker claim/lease fencing (`c185518`) tamamlandı. **Kabul:** ücretli işlem atlatma, çift kota tüketimi, yetkisiz export/onay ve tenant geçişi negatif senaryoları geçer; hassas veri loga çıkmaz. **Kalan:** Academy entitlement (özellik kapalı), uzun iş heartbeat/orphan cleanup, gerçek banka/dekont ve production rollout; görev PARTIAL.
- [ ] **T43 — Tam doğrulama hattı.** Yeni davranışta önce anlamlı failing test; unit+izole PostgreSQL integration+gerçek browser E2E; lint/build/Python/dependency audit, kod ve güvenlik incelemesi. **Kabul:** yalnız seçili 181 testle kapanış yok; test kapsam raporu ölçülür, proje %80 eşiği sağlanır ve kritik dallar ayrıca izlenir; atlanan testler açık gerekçelendirilir, zorunlu senaryo atlanmaz.
- [ ] **T44 — Worker, runtime ve kurtarma.** App/generic worker/IFC worker imaj SHA/digest/runtime'ını ayrı doğrula; queue retry/idempotency, process kill/restart, S3 hata/yarım yükleme ve kaynak limitlerini dene; DB+object storage yedek/restore tatbikatı yap. **Kabul:** yanlış başarı/çift işlem yok; migration ve veri uyumluluğunu koruyan rollback/forward recovery ölçülür; yalnız health 200 kanıt sayılmaz.
- [ ] **T45 — Performans ve işletim bütçesi.** ExcelJS büyük chunk'ı, parse/3D/PDF worker RAM-CPU, büyük IFC/Excel, eşzamanlı tenant ve kuyruk gecikmesini hedef VPS sınırında ölç; Sentry/log/alert teslimi ve AI sağlayıcı varsa maliyet/fallback davranışını doğrula. **Kabul:** kabul edilen p95/süre/RAM/kota bütçeleri ölçümden önce kayıtlı; optimize edilen akış gerçek UI'da tekrar testli; limit aşımında anlaşılır hata ve geri kazanım var.

### Faz 8 — Ürün metinleri ve SEO/GEO

- [ ] **T46 — Tek kaynaklı ürün doğruluğu.** *(Rev. 74, `bc0ee54`, PARTIAL: llms.txt ve /pricing metni kayıt/katalogdan üretiliyor. Rev. 75, `b8ea6d2`: site JSON-LD kayıt/katalogdan, landing iddiaları düzeltildi, genel sayfa iddia kapısı. Kalan: mevzuat sayfaları ve admin metinleri.)* Capability registry, landing, JSON-LD, llms, sözlük, mevzuat sayfaları ve admin açıklamalarını fiilî kanıt seviyesinden üret/hizala. Eski “103 poz”, “CDE yok”, “Rev35 canlı” teşhislerini güncel denetim ekiyle düzelt; tarihî kayıtları sessizce yeniden yazma. **Kabul:** doğru 18.848 kaydı küçültülmez; lisans/güncellik/onay ayrı; fake expert ve kapsam dışı iddia yok.
- [x] **T47 — Sitemap ve ortam davranışı.** *(Rev. 73, `be0791f`: sitemap lastmod yazmaz; production'da PUBLIC_APP_URL yoksa sunucu açılmaz, yerelde SEO dosyaları 404 döner; ikisi de testli. Canlı Search Console kanıtı deploy sonrası eklenir.)* URL bazlı anlamlı lastmod veya tarihsiz sitemap; canonical/redirect/404/noindex ve production PUBLIC_APP_URL zorunluluğunu doğrula. **Kabul:** build zamanı tüm sayfaların güncellemesi sayılmaz; fail-fast korunur; indexlenebilir ve özel rotalar doğru ayrılır.
- [x] **T48 — Semantik prerender.** *(Rev. 74, `cc51619`: sayfa metni `<noscript>` yerine `#root` içinde; React açılışta temizler, JS açılışında görsel kayma yok (Chromium CLS 0), JS kapalıyken görünür. Canlı çıkarım ve Lighthouse karşılaştırması deploy sonrası eklenir.)* Kamu sayfalarının ana içeriğini JS çalıştırmayan okuyuculara erişilebilir üret; React açılışında tekrar/çelişki oluşmasını önle. **Kabul:** browser ve Readability benzeri metin çıkarımında aynı doğru içerik; erişilebilirlik ve performans regresyonu yok; AI alıntı artışı test olmadan vaat edilmez.
- [ ] **T49 — Yapısal veri, bot ve dil politikası.** *(Rev. 73, `be0791f`, PARTIAL: Breadcrumb/WebApplication/DefinedTermSet ve açık AI tarayıcı grupları eklendi; eğitim izni varsayılan açık ve `ROBOTS_AI_TRAINING=disallow` ile kapanır. Hazar 25 Ekim 2026'da eğitim tarayıcılarının açık kalmasını seçti. Rev. 75: Organization `areaServed` TR. Kalan: gerçek kurumsal profil bağlantıları (sameAs) ve Rich Results doğrulaması.)* Sayfaya uygun Breadcrumb/DefinedTerm/SoftwareApplication alanlarını gerçek veriyle kur; bot arama/eğitim izinlerini kullanıcı tercihine bağla; gerçek kurumsal profil/areaServed ekle. İngilizce sayfa onaylanıp gerçekten üretilirse reciprocal hreflang ekle. **Kabul:** mevcut tek dil için sahte hreflang yok; rating/fiyat uydurulmaz; llms/FAQ/HowTo varlığı ranking veya rich result garantisi yapılmaz; SEO iddiaları güncel resmî belge ve ölçümle değerlendirilir.

### Faz 9 — Bağımsız uzman ve saha kabulü

- [ ] **T50 — Modül bazlı L3 uzman dosyası.** Onay kapsamındaki her hesap/kural için bağımsız sonuç, kaynak, girdi, birim, yuvarlama/tolerans ve başarısız örnekleri sun; STR/ARC/MEP/COST ve vergi/ihale yetkinliklerine göre gerçek onay al. **Kabul:** kişi/unvan/sicil/tarih + kapsam + kod/source/fixture hash kaydı var; uzman kendi incelemediği modülü imzalamaz; belge yoksa L3 açılmaz.
- [ ] **T51 — Gerçek dosya ve müşteri L4 kabulü.** En az beş izinli temsilî pilot dosya ve kapsam matrisi; modelden çıktı/teklif/hakedişe uçtan uca karşılaştırma; hata/failure recovery ve kullanıcı kabulü. Beş sayısı kapsamı karşılamıyorsa örnek setini genişlet. **Kabul:** gerçek tenant'ta kaynak–sonuç bağı kanıtlanır; kullanıcı kabulü ve sapma gerekçeleri kayıtlı; sentetik smoke L4 değildir.
- [ ] **T52 — Yayın adayı ve canlı kabul.** Tam CI, uzman kapsamı, migration/restore/rollback planı ve sürüm notuyla somut release adayı sun. Kullanıcı deploy onayından sonra app/worker SHA, DB ledger, gerçek login/IFC/PDF/teklif/hakediş, alarm ve geri dönüş doğrula. **Kabul:** canlı kanıt test edilen sürümle eşleşir; başarısız smoke'ta uygun rollback/forward recovery uygulanır; dış yayın kullanıcı onaylıdır.

### Faz 10 — “Türkiye'de tek” iddiasının araştırılması

- [ ] **T53 — Kaynaklı pazar envanteri.** OSKA/OSKABULUT, AMP, İhale Pro, yerel alternatifler ve Türkiye'ye sunulan BEXEL/CostX/Autodesk/Kreo vb. ürünleri aynı tanımlı kategoriyle tara; arama yöntemi/tarih/sürüm ve kaynaklarını kaydet, yalnız önceden seçilmiş isimlerle sınırlama. **Kabul:** desktop/cloud ayrımı, lisans/tier, Türk mevzuat paketi/eklenti ve entegrasyon yetenekleri yanlış eşitlenmez.
- [ ] **T54 — Karşılaştırılabilir yetenek kanıtı.** Tanımlı IFC→metraj→kaynaklı fiyat→e-PYS→hesap→hakediş/CDE bileşimini aynı senaryoyla incele; ürün dokümanı, erişilebilir demo ve gerekirse kullanıcı onaylı yazılı üretici teyidi topla. **Kabul:** var/yok/doğrulanamadı ayrı; rakipte görülmeyen özellik otomatik yok sayılmaz; BIMMetraj satırı da aynı kanıt eşiğine tabidir.
- [ ] **T55 — İddia kararı ve geçerlilik süresi.** Teknik/uzman ve pazar dosyasını hukuk/reklam incelemesiyle değerlendir; “tek” desteklenmiyorsa kanıtlanan farklılaşmayı yaz. İddia sahibini, yeniden inceleme tarihini, kaynak/kural/rakip değişince kaldırma mekanizmasını belirle. **Kabul:** araştırma olumsuzsa “tek” yayımlanmaz; onaylı ifade tarih/kapsam/karşılaştırma sınırını taşır; belirsizlik kapatıldı diye işaretlenmez.

### Faz 11 — Nihai kapanış

- [ ] **T56 — Tüm açıklar için son kanıt dosyası.** T01–T55 çıktıları, kaynak rapordaki 9+22 ID ve altı motorun gereksinimleri arasında eksiksiz bağlantı kur; yeni bulunan kusurları da kayıt altına al. **Kabul:** her satır uygulanmış ve gereken kabulü almış, kanıtla yanlış teşhis olduğu gösterilmiş veya kullanıcıca gerekçeli kapsam kararı verilmiş olmalı. Ertelenen madde açık kalır; kapsam dışı bırakmak uygulama başarısı diye sayılmaz. Tüm açıklar kapanmadan “tam kapanış” ve genel uygunluk beyanı yapılmaz.

## 5. Bulgu → To-Do izlenebilirlik matrisi

| Denetim ID | İşler | Kapanış türü |
|---|---|---|
| KOD-01 | T05–T07, T50 | Kod + katalog/PDF/birim + uzman |
| KOD-02 | T08–T09, T34 | Veri kaynağı + UI/API/E2E |
| KOD-03 | T02, T19, T50 | Tarihli kural + eksik girdi + uzman |
| KOD-04 | T20, T39, T50 | Doğru idare verisi + ihale uzmanı |
| KOD-05 | T27–T29, T46, T51 | Motor + server workflow + saha |
| KOD-06 | T16–T18, T31 | Kayıpsız icmal + PDF kapsam |
| KOD-07 | T02, T24, T46, T50 | Ölçü esası + kalem hesabı + doküman |
| KOD-08 | T30, T42 | Güvenli serializer + gerçek dosya açma |
| KOD-09 | T40–T44, T52 | Sınırlı rol + tenant + canlı kanıt |
| BUG-01 | T10, T06–T07 | Sınıflandırma ve fiyat/birim |
| BUG-02 | T12, T06, T11 | Gerçekçi örnek ve doğru eşleme |
| BUG-03 | T10–T11 | Belirsiz sınıf/grobeton |
| BUG-04 | T13–T14, T43 | Parser parity + hata UI |
| BUG-05 | T15, T18 | Kimlik/bulgu korunumu |
| BUG-06 | T31–T32 | PDF tarama + ayrı doğrulama |
| GAP-01 | T05–T07, T17, T46 | Yanlış sayı teşhisini reddet + gerçek kapsam |
| GAP-02 | T11 | Dinamik beton sınıfı |
| GAP-03 | T35–T38 | Çok dönemli hakediş |
| GAP-04 | T21, T37 | Sözleşmesel fiyat farkı/mahsup |
| GAP-05 | T29, T50–T51 | Gerçek uzman ve saha kanıtı |
| GAP-06 | T20, T39 | EKAP ve savunma paketi |
| GAP-07 | T31–T33 | PDF/A ve 3B |
| GAP-08 | T01, T14, T44, T52 | Eski deploy teşhisini düzelt + kalan operasyon |
| SEO-01 | T27–T29, T46 | Var olan validatoru koru + iddia hizası |
| SEO-02 | T05, T08–T09, T46 | Sayıyı koru + kaynak/lisans sınırı |
| SEO-03 | T47 | Doğru lastmod |
| SEO-04 | T47 | Fail-fast'i koru; domain fallback ekleme |
| SEO-05 | T49 | Doğru şema ve kanıt sınırı |
| GEO-01 | T49 | Bot tercihi; varsayılan engel olmadığını kaydet |
| GEO-02 | T48 | Metin çıkarılabilirliği |
| GEO-03 | T49 | Gerçek kurum/dil kapsamı; opsiyon kararını kaydet |

**ID dışındaki açıklar:** hesap motoru tablosu → T19–T26/T50; 19 capability'nin kanıtı → T03/T29/T46/T50; eksik DB/E2E/coverage → T40–T43; gerçek müşteri dosyası → T04/T51; canlı tenant/worker/runtime → T40–T44/T52; lisans/approved fiyat → T02/T05/T08–T09; backup/restore/rollback → T44/T52; büyük chunk/RAM → T45; rakip/fiyat/trafik iddiaları → T49/T53–T55; eski skill/doküman uyuşmazlığı → T02/T46.

Global DIN/NRM kural paketleri ve İngilizce ürün genişlemesi, henüz onaylanmış yeni pazar kapsamı değildir. Mevcut seçilebilir DIN/EC2 kuralları T24–T25'te doğrulanır; yeni ülke paketi için T03'te kapsam kararı gerekir. Tek dil sayfasına hreflang eklememek kanıtlanmış eksik yetenek gibi sunulmaz.

## 6. Her geliştirmede zorunlu proje kayıtları

Onaydan sonra her ürün/hesap/kural değişiminde aynı iş diliminde:

- `src/pages/admin/roadmap/roadmap-content.ts`: durum/adımlar ve iki kronolojik tablo; önce/sonra, dayanak, modül ve gerçek sürüm.
- `calculation-review.ts`: gerçek sıradaki CALC sürümü/baseline; kronolojik changelog ve etkilenen moduleDetails.
- `calculation-content.ts`: formül/birim/varsayım/kapsam ve kabul kanıtı.
- Registry ve ilgili public/guide yüzeyleri; kaynak mevcut olsa da uzman kabulü gelmeden L3/live yok.
- `pnpm exec tsx --test src/pages/admin/roadmap/content.test.ts`; ilgili unit/integration/browser testleri; kod/güvenlik incelemesi.
- Kaynak kod değişince `graphify update .`; mevcut kullanıcı değişikliklerini koruyacak çalışma kopyası/izolasyon ile. Dokümantasyon planı için şimdi graph yeniden üretilmez.

Uzman onayları alınmadan roadmap “onaylandı” yazmaz. Revizyon numarası şimdiden rezerve edilmez; uygulama anındaki gerçek son revizyona göre belirlenir.

## 7. Onay ve yürütme kaydı

**Önerilen onay kapsamı:** Bu 12 faz / 56 maddelik yol haritası, faz bağımlılıkları ve kanıtla kapanış ölçütleri. İlk uygulama Faz 0'dan başlar; kaynak ve kapsam tanımlanmadan normatif hesap eşikleri değiştirilmez.

Kullanıcı planın tamamını veya belirli fazlarını onaylayabilir. Kısmi onay verildiğinde kalan fazlar açık/bekliyor kalır; tüm açıkların kapandığı söylenmez. Dış uzman, lisans, ücretli araç ve canlı yayın gerektiren adımlar kendi somut kabul/izin koşullarına bağlıdır.

**Şu an:** plan 23 Ekim 2026 tarihinde kullanıcı tarafından onaylandı. 24 Ekim 2026 / Rev. 67 itibarıyla Faz 0–4 geliştirme ve otomatik kanıt kapıları tamamlandı; Faz 5, T32 dış runtime/vendor bağımlılığı nedeniyle kısmi; Faz 6 Pilot/L2 ve varsayılan kapalı; Faz 7 uygulanıyor. T40 yerel credential/rotation kanıtına, T41 capability ve test-isolation dilimlerine, T42 ise manuel ödeme ve worker lease/fencing dilimlerine ulaştı. Son hesap kaydı `BIM-CALC-2026-10-24.61` ve yol haritası Rev. 67'dir. Uzman denemesi için `/admin/roadmap/expert-review` rotası; kaynak kabulü, üçlü senaryo, gerçek UI/VPS performans ölçümü, retry/alert gözlemi ve imzalı karar sırasını tek yerde sunar. Bu sayfa kabul vermez. T45 sentetik 100 MB IFC parser ön ölçümü korunur; harici fixture'lar README lisansı doğrulanmadığından vendor kabulü sayılmaz. T43/T44/T45, vendor/izinli gerçek dosyalar, uzman imzaları, production cutover/deploy/canary/restore ve PDF kabul paketi açık kalır. Hiçbir yerel test veya doküman kaydı canlı/production kanıtı sayılmaz; tüm açık kapılar kapanmadan deploy yapılmaz.

### Rev. 64 / T41 worker queue RLS mirror (24 Ekim 2026)

İzole Graphile Worker şemasında migrations RLS'i kapatıldı; `_private_job_queues`, `_private_jobs`, `_private_known_crontabs` ve `_private_tasks` tablolarına yalnız `bimmetraj_worker` için production provisioning sözleşmesiyle uyumlu `USING (true)` / `WITH CHECK (true)` policy'leri kuruldu. Üç bağlantılı disposable koşuda restricted app SmartCheck HTTP ve restricted worker IFC HTTP evidence testi 2/2 geçti.

### Rev. 63 / T41 explicit worker credential harness (24 Ekim 2026)

`WORKER_DATABASE_URL` verildiğinde test izolasyonu app ve worker bağlantılarını aynı disposable veritabanına ayrı schema/search_path URL'leriyle taşır. Graphile `run`/`runOnce` worker testleri worker URL'sini kullanabilir; HTTP uygulama pool'u restricted `bimmetraj_app` olarak kalır. Worker credential'ı olmayan ortamda mevcut tek URL davranışı korunur.

### Rev. 62 / T41 test izolasyonu (24 Ekim 2026)

`src/server/routes/test-isolation.ts` artık control ve runtime bağlantılarını ayırır: `CONTROL_DATABASE_URL` aynı disposable veritabanında schema clone ile Graphile Worker migration 18 bootstrap'ını yapar; `DATABASE_URL` restricted `bimmetraj_app` runtime olarak kalır. İzole worker şemasında bounded SmartCheck enqueue/remove wrapper'ları kurulur ve yalnız ilgili execute/table grant'leri verilir. Aynı database hedefi zorunludur; farklı control/runtime veritabanına sessizce clone yapılmaz.

Yerel kanıt: `queue.integration.test.ts` admin disposable runtime ile 14/14 geçti; restricted app runtime ile SmartCheck HTTP tenant akışı ve `ifc-quota.integration.test.ts` 6/6 geçti. IFC HTTP worker testi, uygulama ve worker kimliklerinin aynı test sürecinde ayrıştırılması gerektiği için hâlâ harness kapısıdır; bu sonuç ürün fonksiyonunun production kabulü değildir.

### Rev. 61 / 8C — Worker company context capability (24 Ekim 2026)

`0021_worker_company_context_capability` ve `fetchWorkerCompanyContext` ile production IFC rule standardı ve spreadsheet normalize fire toleransı okumaları dar worker-only capability function'a taşındı. `companies` doğrudan worker okuması bu iki iş akışında kaldırıldı; local/test fallback yalnız canary öncesi fixture uyumluluğu için kaldı. Release zinciri `22/22`, worker capability negatifleri `2/2`, targeted doğrulama `32/32`, TypeScript ve diff-check geçti. Worker drain/canary, canlı image SHA doğrulaması ve ACL revoke hâlâ yapılmadı; diğer worker/table inventory, production cutover ve canlı negatif kanıt açık olduğundan T41/Faz 7 PARTIAL, production NO-GO'dur.

### Yerel doğrulama notu — 24 Ekim 2026

`pnpm run build` Rev. 61 sonrası geçti. Focused release/role/roadmap/auth/tenant set `32/32`, artifact/role/roadmap subset `17/17`, `tsc --noEmit` ve `git diff --check` geçti. Tam `pnpm test`, disposable PostgreSQL ile gerçek izolasyon denemesine rağmen tam yeşil değil: test tabanında Graphile Worker `migrations` bootstrap'ı ve restricted `bimmetraj_app` runtime kimliği yoktu; paralel schema clone PostgreSQL `max_locks_per_transaction` sınırına çarptı. Bu test-environment kapısı ayrıca kapanmadan full-suite green veya production readiness iddiası yapılmayacaktır. Disposable DB/container kaldırılmıştır; canlı/veri sahibi veritabanına dokunulmamıştır.
