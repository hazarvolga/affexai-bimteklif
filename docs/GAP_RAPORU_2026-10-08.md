# TeklifPro / BIMPlan Academy - Güncel Durum ve GAP Raporu

**Tarih:** 8 Ekim 2026

**Dal / commit:** `feat/smartcheck-evaluation-baseline` / `74e52f4`

**Remote farkı:** `origin/feat/smartcheck-evaluation-baseline` dalından 6 commit ileride

**Karar:** Yerel geliştirme sürdürülebilir; müşteri pilotu, production ve Next.js/NestJS strangler cutover için **NO-GO**.

## 1. Kapsam ve yöntem

Bu rapor aşağıdaki kanıtların birlikte incelenmesiyle güncellenmiştir:

- Repo agent memory, ADR ve pilot planı.
- Güncel kod, migration zinciri, API rotaları, ürün ekranları ve son 20 commit.
- Graphify raporu ve kaynak envanteri. Graph `86fb20ee` commitinden üretildiği için güncel HEAD açısından yalnızca navigasyon amacıyla kullanıldı.
- Dört paralel inceleme: mimari, güvenlik/tenant izolasyonu, BIM/IFC/SmartCheck ve ürün/UX/monetizasyon.
- Canlı `lint`, `build`, test, migration metadata, dependency audit ve yerel health kontrolleri.

Durum sınıfları:

- **Uygulandı:** Kodda çalışan ve en az bir doğrulaması bulunan kapsam.
- **Kısmi:** Temel akış var, ancak önemli güvenlik, bütünlük veya ürün davranışı eksik.
- **Sentetik:** Demo/fixture düzeyinde kanıt var; gerçek müşteri ve production kanıtı yok.
- **Harici/kanıtsız:** Kod dışındaki müşteri dosyası, reviewer, S3 veya operasyon kanıtı bekleniyor.
- **Eksik:** Runtime davranışı veya release kapısı bulunmuyor.

## 2. Yönetici özeti

TeklifPro artık basit bir prototip değil. Tenant filtreli teklif akışları, kanıt-önce SmartCheck hattı, IFC QTO/property kabul politikası, insan review süreci, fiyat snapshot/provenance modeli, Academy entitlement ve yeni süper-admin iskeleti bulunuyor. Vite production bundle oluşuyor ve yerel API PostgreSQL'e bağlanarak health yanıtı veriyor.

Buna rağmen güncel dal release edilebilir değil. En kritik nedenler:

1. Typecheck 14 hata ile kırık; test paketi yeşil değil.
2. Vercel API entrypoint production environment kontrolünü atlıyor; sabit JWT fallback ve token içindeki tenant/rol iddialarına güvenilmesi koşullu kritik tenant ele geçirme yolu oluşturuyor.
3. Boş veritabanından tekrarlanabilir migration/bootstrap zinciri yok; son süper-admin şema değişiklikleri migration olarak yakalanmamış.
4. Teklif/revizyon yazımları ve worker enqueue/storage akışları atomik değil.
5. PDF üretimi escape edilmemiş kullanıcı verisini ağ erişimi açık, sandbox kapalı Chromium'a veriyor.
6. Kota sistemi hata halinde fail-open; ödeme/checkout zinciri ve gerçek plan enforcement tamamlanmamış.
7. IFC/SmartCheck güvenli şekilde “bilmediğini biliyor”, fakat production BIM doğruluğu için geometry, 3x3 kuralları, teknik reviewer yetkinliği ve gerçek MEP dosyaları eksik.
8. F10-F12 pilot kabul kanıtları halen yok: 5 müşteri izinli dosya, reviewer kararları, production S3 lifecycle/encryption ve restore.

## 3. Canlı doğrulama sonuçları

| Kontrol | Güncel sonuç | Karar |
|---|---|---|
| `git status --short --branch` | Worktree temiz; dal remote'dan 6 commit ileride | Bilgi |
| `git diff --check` | Geçti | Yeşil |
| `pnpm run lint` | Başarısız, 14 TypeScript hatası | P0 blokaj |
| `pnpm run build` | Başarılı, Vite 3114 modül, 6.72 sn | Kısmi; build typecheck içermiyor |
| `pnpm test` | 349 test: 344 geçti, 4 başarısız, 1 iptal | P0 blokaj |
| Odak testleri | Registration DTO testi ve pilot conversion testi tekrar üretilebilir biçimde başarısız | P0/P1 |
| SmartCheck HTTP testi | `graphile_worker.jobs already exists`; 2 fail + kapanmayan süreç | P0 test izolasyonu/migration |
| `drizzle-kit check` | Migration metadata kontrolü geçti | Baseline bootstrap kanıtı değildir |
| `pnpm audit --prod` | 65 bulgu: 1 kritik, 32 yüksek, 27 orta, 5 düşük | P0 güvenlik |
| `GET /api/health` | HTTP 200, DB bağlı | Yerel runtime yeşil |
| Health readiness | E-posta yok, public URL yok, SmartCheck storage kanıtı yok, revision null | Production NO-GO |

Lint kırıkları dört kümeye ayrılıyor:

- `seed-superadmin.ts`, `usage.ts`, `admin.ts`: `db.execute()` dönüş tipi yanlış kullanılıyor.
- `navigation.tsx`: `Sistem Yönetimi`, `NavGroup` union tipinde yok.
- `PilotApplications.tsx`: UI, `PilotMetrics` sözleşmesinde olmayan alanları kullanıyor.
- Build komutu `tsc --noEmit` çalıştırmadığı için kırık tipler production bundle'ı durdurmuyor.

Test kırıkları:

- `publicRegisteredUser()` artık `isSuperAdmin` döndürüyor; test sözleşmesi güncellenmemiş.
- Pilot conversion artık super-admin gerektiriyor; test normal owner token ile `201` bekliyor ve `403` alıyor.
- SmartCheck integration testi mevcut yerel Graphile Worker şemasında migration çakışmasına giriyor ve süreç temiz kapanmıyor.

## 4. Kanıtlanmış güçlü alanlar

| Alan | Kanıtlanmış mevcut durum |
|---|---|
| Teklif çekirdeği | Listeleme, oluşturma, revizyon, durum, PDF ve server-side finansal yeniden hesaplama var. |
| Tenant güvenliği | SmartCheck ve birçok çekirdek rotada `companyId` filtreleri, RBAC ve composite tenant FK'leri var. |
| SmartCheck | Upload, checksum, normalization, artifact, review, audit ve teklife transfer iskeleti mevcut. |
| IFC güvenlik politikası | QTO/property kanıtı kabul ediliyor; geometry, rebar, formwork ve demo tahminleri bilinçli olarak bloke ediliyor. |
| Fiyat kanıtı | Immutable snapshot, source hash, review ve quotation lock modeli bulunuyor. |
| Auth temeli | Password hashing, hashed reset/verification tokenları, persistent rate-limit bucket ve password-change invalidation var. |
| Academy | Entitlement, progress, checkpoint, sınav, certificate ve webhook sınırları için testli çekirdekler var. |
| Süper admin | DB flag, server-side guard, dashboard/tenant/plan ekranları ve temel endpointler eklendi. |
| Strangler hazırlığı | Versioned SmartCheck contractları, Prisma shadow şeması ve schema-only parity/restore araçları var. |

## 5. P0 GAP'ler - pilot/production öncesi zorunlu

| ID | GAP | Risk | Çıkış kriteri |
|---|---|---|---|
| P0-01 | Release kapıları kırık: lint ve test yeşil değil | Regresyonlu sürüm yayınlama | Lint, unit/integration, build ve kritik E2E tek komutta yeşil; build typecheck'e bağlı |
| P0-02 | Vercel entrypoint `assertProductionEnvironment()` çağırmıyor; JWT sabit fallback içeriyor | Sahte token ile tenant/rol iddiası | Tüm entrypointler ortak bootstrap kullanmalı; fallback kaldırılmalı; eksik secret startup'ı durdurmalı |
| P0-03 | Auth middleware token içindeki `companyId` ve `role` değerini güncel membership ile doğrulamıyor | Üyeliği kaldırılmış/düşürülmüş kullanıcının 7 gün yetkili kalması | Her istekte `(userId, companyId)` membership doğrulaması; session version/short TTL; tenant switch modeli |
| P0-04 | `/api/company` anonim olarak ilk şirket kaydını döndürüyor | Vergi, adres, iletişim ve imza/stamp verisi sızıntısı | Endpoint auth + tenant scope; gerekiyorsa ayrı minimal public branding DTO |
| P0-05 | Migration zinciri boş DB'den kurulabilir değil; admin/billing şema deltaları migration değil ad-hoc script | Yeni ortam ve rollback başarısızlığı | Boş DB bootstrap + mevcut DB upgrade + rollback kanıtı; `db_update.*` emekli edilmeli |
| P0-06 | Teklif ve revizyon aggregate yazımları transaction değil | Boş teklif veya `isLatest` kaybı | Quote + items ve revision + items tek transaction; failure-injection rollback testleri |
| P0-07 | PDF HTML escape yok; Puppeteer ağ erişimi açık ve `--no-sandbox` kullanıyor | HTML injection, SSRF, içeriden veri erişimi | Escape/sanitize, embedded font, request interception, container sandbox ve kötü niyetli fixture testleri |
| P0-08 | Kota kontrolü hata halinde `next()` ile fail-open; sayaç response sonrasında asenkron ve company/period unique değil | Ücretsiz sınırsız kullanım ve yarış koşulu | Atomic reservation/upsert, unique `(company_id, period)`, fail-closed `503`, AI/PDF için concurrency/rate limit |
| P0-09 | Davet tokenı plaintext saklanıyor, listeleniyor/loglanıyor; invite edilen kullanıcıya parola oluşturma akışı yok | Hesap ele geçirme ve tamamlanamayan onboarding | Hash token, redacted DTO, gerçek e-posta, set-password akışı, rate limit ve tek kullanımlık transaction |
| P0-10 | Production deployment topolojisi yok: app/worker/migration/S3/rollback birlikte tanımlı değil | Worker olmadan release, yanlış lockfile, şemasız deploy | `pnpm` pinli Docker app+worker, migration job, health/readiness, immutable image ve rollback runbook |
| P0-11 | Dependency audit kritik/yüksek açıklar içeriyor; `proxy-addr` kritik bulgu trust proxy/rate limit ile ilişkili | IP spoofing ve DoS | Kritik/yüksek bulgular upgrade/override ile kapalı veya yazılı risk kabulü; spoof testleri |
| P0-12 | F10-F12 harici pilot kanıtı tamamlanmamış | Sentetik başarıyı gerçek müşteri başarısı sanma | 5 izinli MEP dosyası, reviewer kayıtları, production S3 encryption/lifecycle/restore ve KPI eşiği |

Başlıca kod kanıtları:

- `src/services/auth/authService.ts:4`, `src/server/middleware/auth.ts:25`, `api/index.ts:1`
- `src/server/routes/company.ts:131`, `src/server/routes/company.ts:149`
- `drizzle/0000_fair_thing.sql:1`, `drizzle/0036_married_the_professor.sql:1`
- `src/server/routes/quotations.ts:79`, `src/server/routes/quotations.ts:134`
- `src/services/pdf/templates.ts:104`, `src/services/pdf/generate.ts:81`
- `src/server/middleware/usage.ts:5`, `src/db/schema.ts:1784`

## 6. P1 GAP'ler - pilot kalitesi ve ticari kullanılabilirlik

### Mimari ve operasyon

1. Contract inventory 104 API rotasının yalnızca küçük bir bölümünü kapsıyor ve parity kontrolü tek yönlü. Fazladan/şemasız route drift'i testi bozmuyor.
2. Route modülleri bounded context değil; 15 route modülü doğrudan Drizzle'a bağlı, `schema.ts` 66 tabloyu tek dosyada topluyor.
3. SmartCheck processing run DB'ye yazıldıktan sonra job enqueue ediliyor. Storage ve DB yazımları arasında outbox/reconciliation yok.
4. Worker liveness health endpointinde yok; Sentry/structured logging/tracing uygulanmamış.
5. CI workflow, PostgreSQL + worker + S3 emulator E2E ve yüzde 80 coverage gate bulunmuyor.
6. Graphify raporu ve `WORKING_STATE.md` güncel commit/path ile senkron değil.

### Süper admin ve billing

1. UI `suspended` ve `trial` gönderiyor; subscription enum bu değerleri kabul etmiyor.
2. Askıya alınmış tenant auth katmanında engellenmiyor.
3. `admin_audit_logs` tablosu var, fakat plan/tenant mutasyonları audit yazmıyor.
4. `/admin/logs` menüsü var, route yok. Tenant detail, impersonation ve CSV raporu PRD'de var, uygulanmamış.
5. Plan CRUD inputları schema ile doğrulanmıyor; negatif fiyat/kota ve geçersiz status sınırları yok.
6. Gerçek checkout, tahsilat, subscription lifecycle, idempotent ödeme zinciri ve upgrade endpointi yok.

### Ürün akışları

1. Teklif create/list/detail/revision/status/PDF var; genel edit, gerçek e-posta ile gönderim, teslimat kaydı ve takip scheduler'ı eksik.
2. CRM ana ekranı kısmi; deal detail auth header kullanmıyor, görünen birçok aksiyonun handler'ı yok.
3. Kârlılık motoru deterministik, fakat üst seviye rapor ciroyu kâr gibi özetleyebiliyor ve kaynaksız benchmark metinleri var.
4. Onboarding registration ve pilot conversion düzeyinde var; ekip daveti ve ilk değer akışı tamamlanmamış.
5. Mobil/a11y temeli iyileşti; CRM geniş board ve hover-only kontroller için 375 px E2E/axe kanıtı yok.

## 7. BIM / IFC / SmartCheck GAP matrisi

| Alan | Durum | GAP |
|---|---|---|
| IFC STEP parser | Kısmi | Regex tabanlı; gerçek STEP graph, units, placement ve representation çözümü yok |
| IFC QTO | Kısmi | `IfcQuantityVolume` ve sınırlı volume adları var; area/length/weight ve geniş QTO setleri yok |
| Property evidence | Kısmi/gerçek fixture | 1.180 elemanlı örnekte 160 property volume eşleşmesi var; QTO ve rebar kanıtı yok |
| Geometry QTO | Eksik ve bloklu | Opening, net/gross, unit, tolerance ve reviewer politikası uygulanmadığı için doğru biçimde kabul edilmiyor |
| SmartCheck evidence | Uygulandı/kısmi | Fail-closed pipeline var; production worker/storage bütünlüğü ve gerçek dosya KPI kanıtı yok |
| 3x3 kuralları | Eksik | `%3` metraj/birim/paspayı hedefleri runtime versioned rule ve boundary test olarak yok |
| ÇŞB/e-PYS Pset | Kısmi | Yeni/eski set adlarının bir bölümü var; `CekmeArka`, emsal seti, escaped STEP ve geniş sınıf desteği eksik |
| ÇŞB/YFK fiyat | Kısmi/harici | Provenance modeli var; gerçek crawler, lisans ve credential kanıtı yok |
| Donatı/kalıp | Sentetik ve bloklu | Sabit oranlı demo tahmini var; BVBS, çap/mass, lap/anchorage ve yüzey motoru yok |
| Reviewer governance | Kısmi | Review/audit var; teknik yetkinlik ve disiplin scope authorization yok |
| ISO 19650 | İçerik düzeyi | EIR/BEP, suitability/status, container-state ve CDE workflow runtime'da yok |
| Pilot admission | Harici/kanıtsız | 5 dosya, bağımsız reviewer ve production S3 operasyon kanıtı yok |

Özel risk: `accepted_exception` durumundaki satırın quotation transferinde `verified` sayılması, istisna ile doğrulanmış kanıtı birbirine karıştırıyor. Review kararı, reviewer scope'u ve gerçek rule-version seti quotation evidence'a taşınmalı.

## 8. Mevzuat ve bilgi kalitesi GAP'leri

Repoda 5 Ağustos 2026 tarihli nihai yönetmelik ve ekleri ayrıştırılmış; eski taslaklar ayrı klasöre alınmış. Bu iyi bir kaynak hijyeni adımıdır. Ancak runtime ve Academy eşlemesi tamamlanmış değildir.

Öncelikli kalan işler:

1. Kademeli e-PYS geçiş takvimini il, belediye nüfusu, yapı alanı ve kullanım türüne göre hesaplayan kapsam/tarih motoru.
2. Nihai `TREpys_*` Pset/property setlerinin resmi eklerden versioned kural paketine dönüştürülmesi.
3. EK-9 kontrol listesinin otomatik/manuel ayrımı ve reviewer kanıtı.
4. Academy'deki Eurocode, TBDY, BVBS, IFC Pset ve piyasa sapma iddiaları için madde/kaynak bazlı teknik review.
5. Mevzuat içeriğinin hukuki uygunluk kararı değil, teknik ön-kontrol/advisory olarak etiketlenmesi.

## 9. Önerilen yürütme sırası

### Faz 0 - 48/72 saat: release tabanını geri getir

- 14 TypeScript hatasını düzelt.
- Registration ve pilot conversion test sözleşmelerini güvenlik kararıyla hizala.
- Graphile Worker migration/test izolasyonunu düzelt; full test süreci temiz kapansın.
- Build komutunu typecheck kapısına bağla.
- Kritik `proxy-addr` ve yüksek dependency bulgularını triage et.

### Faz 1 - Güvenlik ve veri bütünlüğü

- Ortak production bootstrap, JWT fallback kaldırma ve DB membership authorization.
- Anonim company endpointini kapat.
- PDF escape/network isolation/sandbox.
- Invitation token ve set-password akışını düzelt.
- Quote/revision transactionları ve client tenant ownership doğrulaması.
- Atomic quota reservation ve unique usage period.

### Faz 2 - Deploy edilebilir pilot

- Tek migration zinciri ve boş DB bootstrap.
- Coolify için app + worker + migration Docker topolojisi.
- Sentry, structured log, request ID, worker metrics ve alerts.
- Super-admin audit, geçerli status modeli, tenant detail ve suspension enforcement.
- CRM, teklif gönderim/takip ve ödeme sandbox akışlarını tamamla.

### Faz 3 - BIM pilot kabulü

- 3x3 versioned rule seti.
- Reviewer competency/scope modeli.
- Final e-PYS Pset + EK-9 kural paketi.
- 5 izinli dosyada parse, correction, provenance ve süre KPI ölçümü.
- Production S3 encryption/lifecycle/restore drill.

### Faz 4 - Strangler kararı

Yalnızca Faz 0-3 çıkış kriterleri geçince Next.js facade ve NestJS bounded context migration başlatılmalı. Express/Drizzle tek write owner olarak kalmalı; dual-write yapılmamalı.

## 10. Pilot kabul kriterleri

Pilot için minimum kapı:

1. Lint, build, unit, DB integration, worker integration ve E2E tamamen yeşil.
2. Kritik domainlerde ölçülmüş coverage en az `%80`.
3. Boş DB kurulumu ve production-like upgrade/rollback tekrarlanabilir.
4. Cross-tenant CRUD matrisi, auth demotion ve super-admin testleri sıfır sızıntı gösteriyor.
5. 20 teklif senaryosunda create/edit/revise/PDF/send akışı veri kaybı olmadan tamamlanıyor.
6. PDF kötü niyetli içerik testinde dış ağ isteği üretmiyor.
7. Kota, plan yenileme, bonus, suspension ve ödeme webhook testleri deterministik.
8. 5 müşteri izinli MEP dosyasında manuel yeniden giriş olmadan parse oranı hedefi karşılanıyor.
9. Her kabul edilen metraj satırında source hash/path, rule version ve reviewer kararı var.
10. Production S3 restore drill ve worker recovery kanıtı var.
11. Sentry/alerting ve rollback runbook operasyon ekibi tarafından denenmiş.
12. Graphify ve agent memory güncel HEAD ile yenilenmiş.

## 11. Son karar

**Bugünkü doğru yatırım sırası framework migration değil, release tabanı + güvenlik + gerçek pilot kanıtıdır.** Ürün, özellikle SmartCheck kanıt mimarisi açısından güçlü bir farklılaşma potansiyeline sahip. Ancak mevcut dalın yeşil olmayan doğrulama durumu, auth/tenant sınırı, migration zinciri, PDF renderer ve operasyon kanıtları çözülmeden gerçek müşteri verisiyle açılması kabul edilebilir değildir.

Next.js/NestJS hedefi korunmalı; fakat ADR-007'deki gibi pilot parity ve rollback kanıtından sonra strangler yöntemiyle uygulanmalıdır.
