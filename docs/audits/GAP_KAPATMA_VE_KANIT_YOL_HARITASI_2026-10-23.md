# BIMMetraj — tüm GAP'leri kapatma ve iddia kanıtlama yol haritası

**Tarih:** 23 Ekim 2026
**Son durum güncellemesi:** 26 Ekim 2026 · Rev. 86 · `BIM-CALC-2026-10-25.80` · canlı revizyon `f474e99`
**Durum:** KULLANICI ONAYLI / UYGULANIYOR — Faz 0–4 geliştirme ve otomatik kanıt kapıları tamamlandı. Faz 5'te T32 için `ifc-worker` imajına sabitlenmiş veraPDF 1.30.3, ham XML rapor artifact'ı ve 7/7 PDF/A-2b fixture matrisi eklendi; izinli gerçek dosya matrisi ve dönüşüm sağlayıcısı kararı nedeniyle açık. Faz 6 kod düzeyinde Pilot/L2 ve varsayılan kapalıdır; izinli resmî dosya, vendor ve uzman kabulü bekler. Faz 7'de T40 yerel rol topolojisi, T41'in **72/72 (%100) `company_id` tablosu** (67 tablo FORCE RLS + 5 tablo Exact-ACL; `database-role-provision.pgtest.ts` 1/1 PASS dahil), T42'nin tüm kod/regresyon kapıları (Academy feature-flag negatifleri, SmartCheck 15 dk lease expiry/orphan reclaim ve §8.4 `CreateQuote` `industryId` katalog savunması dahil) ve T44'ün 5-sütunlu kurtarma tatbikatı (`t44-recovery-drill.pgtest.ts` 1/1 PASS, `postgres:restore-drill:verify` PASS, `backup.py --enable-row-security` + `companies/subscriptions_worker_capability_read` düzeltmeleri dahil) kanıtlandı; T43 için c8 tüm-dosya kapsam kapısı (%46,80 satır), CI sistem Python'u ile `server-path.e2e.test.ts` ve Playwright E2E (6/6) CI hattına bağlandı. Faz 8'de T46, T47 ve T48 kod/test kapıları tamamlandı. **25 Ekim 2026:** Hazar'ın kararıyla `main` (`f474e99`, Rev. 72) Faz 0–11 kapanmadan canlıya alındı; rol kurulumu deploy içinde (db-bootstrap → migrate → db-provision) çalıştı, `hazarvolga@gmail.com` canlı DB'de `is_super_admin = true` olarak yükseltildi (Rev. 77 ile kodda da kalıcı bootstrap korumasına alındı) ve `/api/health` `ok` / `db: connected` döndü. Bu bir production dağıtımıdır, Faz 7 veya Faz 11 kapanışı değildir; canlı kabul (T52) ve aşağıdaki açık kapılar sürer.
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
| Faz 5 | **Kısmi (Rev. 76)** | `601ce90`, `b7f519c`; `PHASE_5_REPORT_2026-10-23.md`, `T32_VERAPDF_RUNTIME_2026-10-25.md` | veraPDF 1.30.3 imajda + 7/7 PDF/A-2b fixture matrisi tamam; izinli gerçek dosya matrisi, dönüşüm kararı ve belge uzmanı kabulü |
| Faz 6 | **PARTIAL / Pilot L2 / default-off** | `ff057c4`; Rev. 46 / `dc3daea`; `PHASE_6_REPORT_2026-10-24.md` | Resmî Yeşil Defter/ataşman, OSKA/AMP native dosya, ihale uzmanı ve saha kabulü |
| Faz 7 / T40 | **Production rol geçişi canlıda (Rev. 72); kabul kanıtı açık** | `eeeaf75`, `b8733c0`, `b9bf785`; Rev. 47, 51 ve 72; canlı `f474e99`; **Hazar 25 Ekim 2026'da DB parolalarını döndürdü** | Production `role-model-smoke`, canary, restore/parity ve rollback kanıtı |
| Faz 7 / T41 | **PARTIAL — 72/72 (%100) `company_id` tablosu tamamlandı (67 FORCE RLS + 5 Exact-ACL, Rev. 85)** | Rev. 61: `4afe32b`; Rev. 71: `1448541`; Rev. 76: `3a3b61a` (`0022`); Rev. 80: `1b7753d` (`0023`); Rev. 81: `6d3d305` (`0024`); Rev. 82: `8263117` (`0025`); Rev. 83: `4a30135` (`0026`); Rev. 84: `0fb6d8b` (`0027`); Rev. 85: `f88ca92` (S5 Exact-ACL 5 tablo + 72/72 envanter kapısı) | Yalnız canlı deploy sonrası worker canary/drain ve canlı `role-model-smoke` |
| Faz 7 / T42 | **PARTIAL — Kod/regresyon kapıları tamamlandı (Rev. 78)** | Manuel Havale/EFT `30bb9ee`; worker fencing `c185518`; Rev. 78: Academy entitlement feature-flag gate (`403 ACADEMY_FEATURE_DISABLED`), SmartCheck 15 dk lease expiry/orphan reclaim, §8.4 `CreateQuote` `industryId` katalog savunması (`t42-regression.test.ts` 4/4); `PHASE_7_T42_REGRESSION_2026-10-25.md` | Gerçek izinli banka ekstresi/dekont mutabakatı (dış girdi) ve canlı rollout |
| Faz 7 / T43–T45 | **PARTIAL (Rev. 76–86)** | T43 (`f84bfcc`): c8 tüm-dosya kapsam kapısı (%46,80 satır, 7 kritik kapsam tabanı), `REQUIRE_TEST_DATABASE=true`, Playwright E2E 6/6; T44 (Rev. 86): 5-sütunlu kurtarma tatbikatı (`t44-recovery-drill.pgtest.ts` 1/1 PASS, `postgres:restore-drill:verify` PASS, `backup.py --enable-row-security` 6/6 PASS); T45 sentetik IFC parser ölçümü 3/3 | T43 %80 kapsam eşiği (ratchet R+1..R+4); T44 canlı imaj digest doğrulaması; T45 onaylı p95 bütçeleri ve gerçek büyük dosya ölçümü |
| Faz 8 / T47 | **Kod/test tamamlandı (Rev. 73)** | `be0791f`; sitemap lastmod yok, PUBLIC_APP_URL fail-fast ve yerel 404 testli, canonical/404/noindex mevcut testler | Canlıya alındıktan sonra Search Console'da sitemap okuma kanıtı |
| Faz 8 / T49 | **PARTIAL (Rev. 73–75)** | `be0791f`, `b8ea6d2`; BreadcrumbList, WebApplication, DefinedTermSet; AI tarayıcı grupları; **Hazar'ın kararı (25 Ekim 2026): eğitim tarayıcıları açık kalır** (`ROBOTS_AI_TRAINING` tanımsız); Organization `areaServed` TR | Gerçek kurumsal profil bağlantıları (sameAs), Rich Results doğrulaması |
| Faz 8 / T46 | **Kod/test tamamlandı (Rev. 77)** | `bc0ee54`, `b8ea6d2`, Rev. 77; llms.txt, /pricing, site JSON-LD, mevzuat rehberi, BIM sözlüğü ve admin yüzeyleri `CAPABILITY_REGISTRY` + katalogla hizalandı; iddia kapı testi 3/3 | İsimli uzman L3 kabulü geldikçe registry düzeyi güncellenir |
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

- [ ] **T40 — DB rol ayrımı.** Yerel app/worker/migrator/backup credential topolojisi, fail-closed inspector/provisioner ve A→B→A rotation/rollback disposable PostgreSQL 16 üzerinde kanıtlandı (`eeeaf75`, `b8733c0`). Rev. 72 (`b9bf785`) rol kurulumunu Coolify deploy'una taşıdı; production 25 Ekim 2026'dan beri `f474e99` ile ayrık rollerle çalışıyor ve Hazar 25 Ekim 2026'da DB parolalarını döndürdü. **Kabul:** runtime superuser/BYPASSRLS değil; yetkisiz DDL reddedilir; app ve Graphile Worker gerekli işlemleri sürdürebilir; rol geçişinin geri dönüş planı testlidir. **Kalan:** production `role-model-smoke`, canary, restore/parity ve rollback kanıtı.
- [ ] **T41 — DB seviyesinde tenant savunması.** CDE'de 5, hakedişte 10, SmartCheck pilot evidence'da 2 (+ `smartcheck_audit_logs`: 1), şirket sektör ayarında 1, CRM/kota diliminde 3 (`leads`, `subscriptions`, `usage_logs`; + `companies` `id` ile), Rev. 76 (`3a3b61a`, `0022_tenant_business_rls`) ile CRM/faturalama/tedarik iş tablolarında 14, Rev. 80 (`1b7753d`, `0023_quotation_core_rls` — S1 teklif çekirdeği: 6 tablo), Rev. 81 (`6d3d305`, `0024_pricing_regulations_rls` — S2 fiyat/kaynak/mevzuat: 8 tablo), Rev. 82 (`8263117`, `0025_allplan_learner_rls` — S4a Allplan öğrenci verisi: 7 tablo), Rev. 83 (`4a30135`, `0026_academy_control_rls` — S4b Academy control-plane ve sertifika doğrulama: 6 tablo) ve Rev. 84 (`0fb6d8b`, `0027_smartcheck_pipeline_rls` — S3 SmartCheck belge ve worker işlem hattı: `documents`, `document_processing_runs`, `document_processing_artifacts`, `normalized_quantity_rows`: 4 tablo) ile olmak üzere **67 `company_id` tablosu FORCE RLS altında**, kalan **5 S5 yetki/denetim/kota tablosu** (`memberships`, `invitations`, `pilot_applications`, `admin_audit_logs`, `usage_records`) ise Rev. 85 ile `DATABASE_AUTHORITY_AUDIT_COMPANY_TABLES` ve `DATABASE_PUBLIC_RESTRICTED_TABLE_ACL` exact least-privilege ACL kontratı altında kilitlenerek **72/72 (%100) `company_id` tablosunun tamamı** sınıflandırıldı ve PG16 üzerinde doğrulandı (`docs/audits/phase-7/PHASE_7_T41_REMAINING_TABLES_2026-10-25.md`). Rev.56 ayrı `bimmetraj_control` rolü/pool'u ve exact ACL/RLS ile meşru authority-table mutasyonlarını app kimliğinden ayırdı; Rev.57 authority/support ACL, bağlantı URL'si, startup preflight ve append-only audit sınırını least-privilege inceleme bulgularına göre sertleştirdi (`58cf320`, `cd4b640`, `5e11135`, `63c5c60`, `82207c2`, `1dcc0bc`, `a55841e`, `3a3b61a`, `1b7753d`, `6d3d305`, `8263117`, `4a30135`, `0fb6d8b`). Rev. 80 `database-role-provision.pgtest.ts` pre-schema modunu `1/1 PASS` durumuna getirdi; Rev. 84–85 ile `tenant-business-rls.pgtest.ts` 45 FORCE RLS tablosu + 72/72 `information_schema.columns` mutabakatı + S5 negatif ACL/drift kontrolleri için `1/1 PASS`, `artifacts.test.ts` `17/17 PASS` ve `verify.integration.test.ts` `14/14 PASS` olarak doğrulandı. **Kabul:** havuz bağlantısı yeniden kullanımı ve eşzamanlı A/B isteklerinde veri sızmaz; uygulama filtre hatasına karşı negatif DB testi geçer; uygulama RBAC kaldırılmaz. **Kalan:** yalnız canlı deploy sonrası worker canary/drain ve canlı `role-model-smoke` negatif kanıtı (`T47`/`T52` operasyon penceresi); kod ve yerel PG16 kapsamı **72/72 TAMAM**. Görev canlı kanıt öncesi PARTIAL.
- [ ] **T42 — Yetki ve kaynak sınırı regresyonu.** Manuel Havale/EFT transaction/idempotency dilimi (`30bb9ee`), SmartCheck worker claim/lease fencing (`c185518`) ve Rev. 78 ile Academy feature-flag (`ACADEMY_ENABLED=false` → `403 ACADEMY_FEATURE_DISABLED`) negatif kapısı, SmartCheck 15 dk lease expiry/orphan reclaim (`DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS`, yeni `workerLeaseToken` rotasyonu, çift işlem yok) ve §8.4 `CreateQuote` `industryId` katalog savunması (`resolveQuotationIndustryId`, `t42-regression.test.ts` 4/4 — `docs/audits/phase-7/PHASE_7_T42_REGRESSION_2026-10-25.md`) tamamlandı. **Kabul:** ücretli işlem atlatma, çift kota tüketimi, yetkisiz export/onay ve tenant geçişi negatif senaryoları geçer; hassas veri loga çıkmaz. **Kalan:** gerçek izinli banka ekstresi/dekont mutabakatı (dış girdi) ve production rollout; görev PARTIAL.
- [ ] **T43 — Tam doğrulama hattı.** *(25–26 Ekim 2026, PR #18 + Rev. 79 + Rev. 87, PARTIAL: c8 tüm-dosya kapsam raporu CI'da; Rev. 87 R+1 ratchet dilimiyle (`t43-route-ratchet.integration.test.ts` 971 satır + `catalog-and-templates-integrity.test.ts` + `tenant-context.test.ts` / `control-plane.test.ts`) proje satır kapsamı **%46,80 → %53,04** (floor %46 → %52), HTTP API route satır kapsamı **%54,26 → %81,31** (+27,05 puan, floor %54 → %80, dal %63,66, fonksiyon %95,54) ve 1416 testte **1409 PASS / 0 FAIL / 7 SKIP** sağlandı; 3-rol PG16 route testleri sırasında yakalanan 3 canlı üretim hatası (`auth.ts` `login`/`me` şirketsiz Academy öğrenci profili FORCE RLS hatası, `admin.ts` `sync-catalog` control-plane `admin_audit_logs` `42501` yazma hatası ve `admin.ts` `reports/usage` `topConsumers` `companies` FORCE RLS boş liste hatası) kapatıldı; Playwright E2E giriş/teklif+PDF/SmartCheck IFC/admin roadmap 6/6 ve ayrı CI işi; `REQUIRE_TEST_DATABASE` ile DB senaryoları CI'da atlanamaz; `docs/audits/phase-7/PHASE_7_T43_COVERAGE_E2E_2026-10-25.md`. Kalan: %80 proje eşiği — R+2..R+4 UI kapsam birleştirme dilimleriyle 26,96 puan açık.)* Yeni davranışta önce anlamlı failing test; unit+izole PostgreSQL integration+gerçek browser E2E; lint/build/Python/dependency audit, kod ve güvenlik incelemesi. **Kabul:** yalnız seçili 181 testle kapanış yok; test kapsam raporu ölçülür, proje %80 eşiği sağlanır ve kritik dallar ayrıca izlenir; atlanan testler açık gerekçelendirilir, zorunlu senaryo atlanmaz.
- [ ] **T44 — Worker, runtime ve kurtarma.** *(Rev. 86, PARTIAL: 5-sütunlu kurtarma tatbikatı `src/contracts/t44-recovery-drill.pgtest.ts` (`1/1 PASS`: worker crash/reclaim, bozuk mesaj DLQ karantinası, `bimmetraj_backup` ile `pg_dump --enable-row-security` + `pg_restore` `dumpDurationMs: 136 ms` / `restoreDurationMs: 351 ms`, bozuk migration atomik rollback + katalog imzası doğrulaması ve `/api/health/ready` `503 SERVICE_DEGRADED` → `200 OK` kurtarma), `postgres:restore-drill:verify` (`28` migration, `85` tablo, `20` enum PASS) ve `deploy/backup/test_backup.py` (`6/6 PASS`) tamamlandı; gerçek PG16 üzerinde yakalanan `companies/subscriptions_worker_capability_read` FORCE RLS engeli ve `backup.py --enable-row-security` eksiği kapatıldı — `docs/audits/phase-7/PHASE_7_T44_RECOVERY_DRILL_2026-10-26.md`. Kalan: canlı deploy penceresinde (`T52`) app/worker/ifc-worker container digest eşleşmesi.)* App/generic worker/IFC worker imaj SHA/digest/runtime'ını ayrı doğrula; queue retry/idempotency, process kill/restart, S3 hata/yarım yükleme ve kaynak limitlerini dene; DB+object storage yedek/restore tatbikatı yap. **Kabul:** yanlış başarı/çift işlem yok; migration ve veri uyumluluğunu koruyan rollback/forward recovery ölçülür; yalnız health 200 kanıt sayılmaz.
- [ ] **T45 — Performans ve işletim bütçesi.** ExcelJS büyük chunk'ı, parse/3D/PDF worker RAM-CPU, büyük IFC/Excel, eşzamanlı tenant ve kuyruk gecikmesini hedef VPS sınırında ölç; Sentry/log/alert teslimi ve AI sağlayıcı varsa maliyet/fallback davranışını doğrula. **Kabul:** kabul edilen p95/süre/RAM/kota bütçeleri ölçümden önce kayıtlı; optimize edilen akış gerçek UI'da tekrar testli; limit aşımında anlaşılır hata ve geri kazanım var.

### Faz 8 — Ürün metinleri ve SEO/GEO

- [x] **T46 — Tek kaynaklı ürün doğruluğu.** *(Rev. 74 `bc0ee54`, Rev. 75 `b8ea6d2`, Rev. 77: llms.txt, /pricing, site JSON-LD, landing, mevzuat rehberi, BIM sözlüğü ve admin açıklamaları `CAPABILITY_REGISTRY` + 18.848 katalog sınırlarıyla hizalandı; kamu/admin iddia kapı testi 3/3 — `docs/audits/phase-8/PHASE_8_T46_SINGLE_SOURCE_COPY_2026-10-25.md`.)* Capability registry, landing, JSON-LD, llms, sözlük, mevzuat sayfaları ve admin açıklamalarını fiilî kanıt seviyesinden üret/hizala. Eski “103 poz”, “CDE yok”, “Rev35 canlı” teşhislerini güncel denetim ekiyle düzelt; tarihî kayıtları sessizce yeniden yazma. **Kabul:** doğru 18.848 kaydı küçültülmez; lisans/güncellik/onay ayrı; fake expert ve kapsam dışı iddia yok.
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

## 8. Son durum — 25 Ekim 2026 (öğleden sonra)

Bu bölüm, 25 Ekim 2026 paralel oturumlarının sonucunu tek yerde toplar. "Kapandı" yalnız §2'deki kapanış durumlarıyla kullanılır; kod kapısının geçmesi, uzman/operasyon/canlı kabul yerine geçmez.

### 8.1 Canlı ve `main`

- **Canlı (kayıtlı):** `f474e99` / Rev. 72, ayrık DB rolleriyle (db-bootstrap → migrate → db-provision). `/api/health` `ok`, `db: connected`.
- **`main`'e bu gün merge edilenler:** #13 Faz 8 SEO/GEO (Rev. 73, T47/T49), #14 salt-okur release preflight, #15 T46 llms/pricing tek kaynak, #16 T48 semantik prerender (Rev. 74), #20 T41 `0022_tenant_business_rls` (`931136d`), #17 T32 veraPDF 1.30.3 runtime (`e36a8bd`), #19 T46/GEO-03 site JSON-LD + landing metni (`3d9ebbe`, Rev. 75), #18 T43 c8 kapsam kapısı + Playwright E2E (Rev. 76). **Merge ≠ canlı:** Coolify'da elle Deploy ve `/api/health` revision kontrolü yapılmadıkça Rev. 73–76 canlı sayılmaz.

### 8.2 Birleştirilen paralel PR'lar ve merge sonrası kalanlar

| PR | İş | Durum | Merge sonrası kalan |
|---|---|---|---|
| #17 | T32 — veraPDF 1.30.3 runtime `ifc-worker` imajında, ham XML rapor artifact'ı, 7/7 PDF/A fixture matrisi | **`main`'de birleştirildi** (`e36a8bd`) | İzinli gerçek PDF matrisi, dönüşüm kararı (Ghostscript AGPL / ticari SDK / dönüşüm yok), deploy sonrası `verapdf --version` smoke, belge uzmanı kabulü |
| #18 | T43 — c8 kapsam kapısı + kritik kapsamlar + Playwright E2E + `REQUIRE_TEST_DATABASE` + Rev. 87 R+1 ratchet (`proje %46,80 → %53,04 ≥ %52`, `HTTP API routes %54,26 → %81,31 ≥ %80`, 1409/1416 PASS) | **`main`'de birleştirildi** (Rev. 76 + Rev. 79 + Rev. 87) | %80 proje eşiği (bugün %53,04); ratchet planı R+2…R+4 (UI kapsam birleştirme) |
| #19 | T46 2. dilim + GEO-03 — site JSON-LD kayıt/katalogdan, landing iddiaları, `areaServed` TR, kamu metni iddia kapı testi; eğitim tarayıcıları açık (Hazar kararı) | **`main`'de birleştirildi** (`3d9ebbe`, Rev. 75); T46 mevzuat/sözlük/admin hizası Rev. 77 ile tamamlandı | T49 için `sameAs` gerçek profiller ve Rich Results doğrulaması |
| #20 | T41 — `0022_tenant_business_rls`: 14 tablo + Rev. 80 `0023_quotation_core_rls` (S1 6 teklif çekirdeği tablosu) + Rev. 81 `0024_pricing_regulations_rls` (S2 8 fiyat/kaynak/mevzuat tablosu) + Rev. 82 `0025_allplan_learner_rls` (S4a 7 Allplan öğrenci tablosu) + Rev. 83 `0026_academy_control_rls` (S4b 6 Academy/sertifika tablosu) + Rev. 84 `0027_smartcheck_pipeline_rls` (S3 4 SmartCheck pipeline tablosu) + Rev. 85 S5 Exact-ACL (5 yetki/denetim/kota tablosu: toplam **72/72 `company_id` tablosu tamamlandı**) | **`main`'de birleştirildi** (`931136d` + Rev. 80–85) | Yalnız canlı deploy sonrası worker canary/drain + canlı `role-model-smoke` |

**Birleştirme kaydı:** Önerilen `#20 → #17 → #19 → #18` sırasıyla dört PR'ın tamamı `main` dalına birleştirildi; `.github/workflows/verify.yml` ve `package.json` adımları kayıpsız birleştirildi.

### 8.3 56 maddenin durumu

| Durum | Maddeler | Adet |
|---|---|---:|
| Kod/test kapısı tamam (`[x]`) — uzman/vendor/canlı kabul ayrıca Faz 9'da | T01–T31, T33, T34, T46, T47, T48 | 36 |
| PARTIAL — kod dilimi var, kabul kriteri karşılanmadı | T32 (#17), T35–T39 (Pilot/L2, default-off), T40, T41 (#20, 72/72 tablo tamam), T42, T43 (#18, R+1 tamam: proje %53,04 / route %81,31), T44 (Rev. 86 5-sütunlu PG16 kurtarma tatbikatı tamam), T45 (sentetik ön ölçüm), T49 (#19) | 13 |
| Açık — başlanmadı veya dış girdiye bağlı | T50, T51, T52, T53, T54, T55, T56 | 7 |

Not: T45 ve T35–T39 satırları §4'te kendi kalan maddeleriyle açık tutulur; sentetik ölçüm veya varsayılan-kapalı kod kabul sayılmaz. Faz 7 ve Faz 11 kapanmadı; "tam kapanış" beyanı yapılmaz.

### 8.4 Bu oturumda bulunan kusur ve kapanış kaydı

- **Teklif editörü sektör varsayılanı (Rev. 78 ile düzeltildi):** `CreateQuote` `industryId: 'residential'` gönderdiğinde `industries` kataloğu boşsa kayıt `500` (FK `quotations_industry_id_industries_id_fk`) dönüyordu. Rev. 78 ile `resolveQuotationIndustryId` (`src/services/quotations/integrity.ts` + `edit.ts`) ve `CreateQuote.tsx` katalog senkronizasyonu devreye alındı: boş katalogda `industryId` güvenli biçimde `null`'a düşer, dolu katalogda geçersiz/devre dışı sektör kodu `400 QuotationIntegrityError` ve anlaşılır Türkçe hata döner (`src/server/routes/t42-regression.test.ts` 4/4 PASS).

## 9. Kalan maddeleri kapatma promptu

Aşağıdaki metin, yeni bir Claude Code / Codex oturumuna olduğu gibi verilecek şekilde yazılmıştır. Her oturum tek bir iş dilimini alır; birden fazla oturum paralel çalışacaksa aynı dosyaya iki yazar atanmaz.

````text
BAĞLAM
Sen TeklifPro / BIMMetraj deposunda çalışıyorsun: Vite + React + Express + Drizzle,
PostgreSQL 16, Graphile Worker, Python IfcOpenShell IFC worker; production Coolify'da
(compose.coolify.yaml), deploy ELLE yapılır ve merge canlıya alma değildir.
Kapatılacak işlerin tek doğruluk kaynağı:
docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md (§4 To-Do, §8 son durum).
Önce CLAUDE.md, AGENTS.md, CODEX.md ve bu dosyanın §2 (onay sınırları), §6 (zorunlu
kayıtlar) ve §8 bölümlerini oku. Sana atanan iş ID'sini (ör. T41-S1) yalnız o kapsamda yap.

DEĞİŞMEZ KURALLAR
1. Kanıt olmadan "kapandı" yazma. Durumlar: bekliyor → uygulanıyor → test edildi →
   uzman/operasyon kabulü bekliyor → kapandı. Kod kapısı ≠ kabul. Sentetik/açık kaynak
   örnek ≠ müşteri (L4) kabulü. Yerel test ≠ production kanıtı.
2. Eşik/oran/sayı uydurma. Ölçemediğin şeyi bugünkü ölçülen değerle kapıla, açığı yaz,
   ratchet planı ekle (T43 örneği: %46,80 ölçüldü, %80 sahte karşılanmadı).
3. Mühendislik ve maliyet sayıları `yuksek-muhendis-mimar` skill'i ile doğrulanır.
   3x3 şirket politikasıdır, normatif kural değildir: (a) metraj sapması ≤ %3,
   (b) paspayı standart minimum mm'nin altında değil (TS 500: iç 20 / dış 25 /
   döşeme 15 mm; EC2 XC3 cnom 35 mm yalnız activeStandard = EUROCODE_2),
   (c) taşıyıcı elemanlar STR disiplininde. Paspayını asla yüzde olarak yazma.
4. Yeni davranışta önce anlamlı failing test (RED), sonra uygulama (GREEN). DB testleri
   izole PostgreSQL 16 ile (.github/workflows/verify.yml'deki rol bootstrap + release
   migration zinciri); paylaşılan/canlı veritabanına dokunma. CI'da
   REQUIRE_TEST_DATABASE=true: DB senaryosu atlanamaz.
5. Dev Demo / Guest Login bypass yalnız import.meta.env.DEV iken; production'da asla.
6. Production deploy, secret değişimi, ücretli lisans/araç satın alma, dış kuruma dosya
   gönderme, uzman adına imza ve kamuya açık iddia değişikliği Hazar'ın açık onayı
   olmadan yapılmaz. Bunlar gerektiğinde somut kapsam/maliyet/sürümle sor ve bekle.
7. Marka yazımı: BIMMetraj. Conventional commits. Kullanıcıya ait
   docs/agent-memory/gelecekteki-global-konumlandırma.md, kökteki
   proje_analiz_gap_bug_seo_geo_rakip_raporu.md ve graphify-out/* commit'e girmez.
8. Roadmap Rev kaydını (roadmap-content.ts / calculation-review.ts) entegre eden oturum
   yazar; paralel dilim oturumları PR açıklamasına "kaydedilecekler" listesi koyar.
9. Her iş bitiminde: kapsam raporu kapısı (`pnpm run test:coverage`) düşmemeli; kritik
   kapsam floor'u düşerse test ekle, floor'u düşürme. Kapsam yükseldiyse
   coverage-thresholds.json floor'unu yeni ölçülen değere (aşağı yuvarlanmış) çek.

ÇIKTI SÖZLEŞMESİ (her dilim)
- main'e karşı PR, yeşil CI (verify + e2e), PR gövdesinde: kabul kriteri → kanıt
  eşlemesi, test komutları ve çıktıları, atlanan testler ve gerekçesi, kalan sınır.
- docs/audits/phase-N/PHASE_N_<ID>_<konu>_<tarih>.md kanıt dosyası (iş ID, kabul
  kriteri, kod SHA, kaynak/fixture hash, test komutu/çıktısı, kalan sınır).
- Bu GAP dosyasında yalnız kendi maddenin §4 satırına kısa durum notu; §8.3 sayımını
  güncelle. Başka maddenin satırını değiştirme.

İŞ DİLİMLERİ VE BİTİŞ TANIMI (bağımlılık sırasıyla)

[Önce: açık PR'ları merge et] #20 → #17 → #19 → #18. verify.yml adım çakışmalarını
birleştir (adımlar bağımsız); her merge sonrası CI yeşil olmalı. Sonra Coolify'da elle
Deploy, /api/health revision = main SHA, canlı smoke. Deploy Hazar onayıyla.

T41 — Tenant RLS (kalan 36 tablo + worker ACL)
- Envanter: docs/audits/phase-7/PHASE_7_T41_REMAINING_TABLES_2026-10-25.md.
- S1 teklif çekirdeği (quotations, quotation_items, quotation_financials, clients…):
  0022 deseniyle ENABLE+FORCE RLS, app tenant ALL policy, backup SELECT, worker/control
  default-deny; tüm request path'leri withTenantDrizzleTransaction'a; PG16 negatif
  sözleşme testi (tenantless deny, filtre hatası, cross-tenant 42501, havuz yeniden
  kullanımı, 25 eşzamanlı A/B). S2 fiyat/kaynak zekâsı (nullable regulation_alerts için
  global okuma policy'si), S3 SmartCheck doküman hattı (worker policy + canlı canary
  gerektirir), S4 Academy/Allplan (control-plane yazar), S5 authority/audit.
- Worker canary/drain → canlı image SHA doğrulaması → authority-table ACL revoke.
- Bitiş: 72/72 tablo sınıflandırılmış (RLS veya gerekçeli global), canlıda
  role-model-smoke negatifleri geçer. Canary/revoke Hazar onaylı deploy penceresinde.

T40 — DB rol ayrımı canlı kabul
- Secret rotasyonu teyidini (Hazar 25 Ekim'de döndürdüğünü bildirdi) kanıt dosyasına
  bağla; production role-model-smoke; canary; restore/parity (T44 ile); rollback
  provasının disposable PG16 + canlı-benzeri ortamda kaydı.

T42 — Yetki ve kaynak sınırı regresyonu
- Academy entitlement (flag kapalı) negatifleri; uzun iş heartbeat/orphan cleanup
  (lease süresi dolan run'ın güvenli yeniden kuyruğa alınması, çift işlem yok);
  ücretli işlem atlatma, çift kota tüketimi, yetkisiz export/onay negatifleri; loglarda
  hassas veri yok taraması; §8.4 sektör varsayılanı kusurunu düzelt (RED test önce).
- Gerçek banka/dekont mutabakatı dış girdi: Hazar'dan izinli örnek gelmeden kapanmaz.

T43 — %80 kapsam (ratchet)
- R+1: route integration testleri (admin, pricing, smartcheck yazma uçları) → route
  ≥ %70, proje ≥ %52. R+2: Playwright koşusunda V8 coverage toplayıp (page.coverage →
  istanbul/c8 merge) UI kapsamını rapora kat; proje ≥ %60. R+3: büyük UI dosyalarına
  jsdom bileşen testleri, kritik kapsamlarda dal ≥ %85; proje ≥ %70. R+4: ≥ %80.
- CI'da atlanan server-path.e2e venv testlerini sistem Python'uyla koştur
  (resolvePythonBin kullan); LibreOffice'i CI'ya ekle veya gerekçeli ayrı iş yap.
- Bitiş: proje satır ≥ %80, kritik floor'lar korunur, zorunlu senaryo atlanmaz.

T44 — Worker, runtime ve kurtarma
- App / generic worker / IFC worker imaj digest ve runtime sürümlerini ayrı doğrula
  (release preflight script'i kullan). Kuyruk retry/idempotency, süreç kill/restart,
  S3 hata ve yarım yükleme, kaynak limitleri için tekrarlanabilir tatbikat script'i.
- DB + object storage yedek/restore tatbikatı (postgres:restore-drill script'leri,
  deploy/backup) disposable ortamda; RPO/RTO ölç; migration ileri/geri uyumluluğu.
- Bitiş: yanlış başarı/çift işlem yok; ölçülmüş recovery; "health 200" tek kanıt değil.

T45 — Performans bütçesi
- ÖNCE Hazar'dan p95 süre/RAM/kota bütçelerini yazılı al ve kaydet; ölçümden sonra
  bütçe yazılmaz. Hedef VPS sınırında büyük IFC/Excel/PDF/3B, eşzamanlı tenant, kuyruk
  gecikmesi; ExcelJS chunk'ı; Sentry/log/alert teslimi; limit aşımında anlaşılır hata.

T32 — PDF/A (PR #17 merge sonrası)
- Hazar'ın dönüşüm kararı (A: dönüşüm yok / B: Ghostscript AGPL veya ticari / D: SDK)
  olmadan dönüşüm kodu yazma. İzinli gerçek PDF matrisi (CMYK/ICC, ek, nitelikli
  e-imza) gelince aynı matris runner'ıyla koştur; deploy sonrası
  `docker exec <ifc-worker> /opt/verapdf/verapdf --version` = 1.30.3 ve bir yüklemede
  üç artifact. Belge/arşiv uzmanı kabulü ayrı.

T46 / T49 — Ürün metni ve yapısal veri (PR #19 merge sonrası)
- Mevzuat sayfaları ve admin açıklamalarını capability registry'den üret; kamu metni
  iddia kapı testine yeni sayfaları ekle. Gerçek kurumsal profil bağlantıları yoksa
  sameAs ekleme. Deploy sonrası Rich Results ve Search Console (T47) ile canlı
  Readability/Lighthouse (T48) kanıtlarını kaydet.

T35–T39 — Hakediş/EKAP (Pilot/L2, varsayılan kapalı)
- Kod çekirdeği hazır; kapanış dış girdiye bağlı: izinli resmî Yeşil Defter/ataşman/
  icmal, bağımsız teknik ofis golden fixture'ı, lisanslı OSKA/AMP native dosyası ve
  hedef yazılımda gerçek import, isimli ihale uzmanı. Girdi gelmeden yalnız fixture
  runner'ını ve kabul şablonunu hazırla; feature flag'i açma.

T50–T52 — Bağımsız uzman, gerçek dosya, yayın adayı
- T50: /admin/roadmap/expert-review akışıyla modül bazlı uzman dosyası (kişi/unvan/
  sicil/tarih + kapsam + kod/kaynak/fixture hash). Uzman adına imza atma.
- T51: en az beş izinli temsilî pilot dosya; model → çıktı → teklif → hakediş
  karşılaştırması; sapma gerekçeleri ve kullanıcı kabulü.
- T52: tam CI + uzman kapsamı + migration/restore/rollback planı + sürüm notuyla
  release adayı; Hazar onayıyla deploy; app/worker SHA, DB ledger, gerçek login/IFC/
  PDF/teklif/hakediş, alarm ve geri dönüş doğrulaması.

T53–T55 — "Türkiye'de tek" iddiası
- Önceden tanımlı kategori/özellik seti/tarih ile kaynaklı pazar envanteri (OSKA/
  OSKABULUT, AMP, İhale Pro, BEXEL, CostX, Autodesk, Kreo ve aramada çıkan diğerleri);
  var/yok/doğrulanamadı ayrımı; BIMMetraj aynı kanıt eşiğinde. Sonuç olumsuz veya
  belirsizse "tek" yayımlanmaz; karar hukuk/reklam incelemesiyle ve geçerlilik
  tarihiyle Hazar'a sunulur.

T56 — Nihai kanıt dosyası
- Yalnız T01–T55 kapandığında veya gerekçeli kapsam kararı alındığında: kaynak
  rapordaki 9 KOD + 22 BUG/GAP/SEO/GEO ID'si ve altı motor ↔ iş ↔ kanıt bağlantı
  matrisi. Açık madde varken "tam kapanış" yazma.

DURMA KOŞULLARI
- Kabul kriteri dış girdi (uzman, lisans, izinli dosya, Hazar kararı, canlı pencere)
  gerektiriyorsa: kod tarafını bitir, blocker'ı kanıt dosyasına ve PR'a yaz, tek ve net
  bir soru sor, kapanmış gibi işaretleme.
````
