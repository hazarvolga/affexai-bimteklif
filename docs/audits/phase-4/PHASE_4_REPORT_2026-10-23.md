# Faz 4 — Gerçek CDE Onay Akışı Tamamlama Raporu

**Tarih:** 23 Ekim 2026
**Kapsam:** T27–T29
**Belge sürümü:** Rev. 44 / BIM-CALC-2026-10-23.38
**Durum:** Geliştirme ve otomatik kanıt kapıları tamamlandı; bağımsız uzman, güvenli e-imza ve saha kabulü açık.

## Sonuç

Faz 4, tarayıcıya bağlı CDE taslağını tenant/proje/revizyon kapsamlı kalıcı bir onay akışına dönüştürür. Geçiş motoru açık whitelist ile fail-closed çalışır. CDE projesi, üyelik, bilgi konteyneri, immutable revizyon kapsamı ve karar olayları PostgreSQL'de saklanır. Sunucu gerçek oturum kullanıcısını, proje rolünü ve disiplinini kullanır; varsayılan kişi/rol adı karar kanıtı sayılmaz.

Bu teslim **pilot/L2** seviyesindedir. Otomatik testler, migration imzası veya scope hash'i bağımsız mühendis onayı, ISO lisanslı metin incelemesi, güvenli elektronik imza ya da saha kabulü değildir.

## T27 — Geçiş motoru

- `validateCdeStateTransition` bütün durum çiftlerini açık geçiş tablosuyla değerlendirir.
- Kabul edilen ana akış `WIP → SHARED → PUBLISHED → ARCHIVED`; tanımsız atlama, aynı durum ve terminal `ARCHIVED` çıkışı reddedilir.
- `WIP/S0/Pxx.xx`, `SHARED/S1..S7/Pxx.xx`, `PUBLISHED/A1..A7/Cxx veya EK-2 revizyonu`, `ARCHIVED/B/sözleşmesel revizyon` eşleşmeleri zorunludur. `SHARED/S0` reddedilir.
- Eksik aktör ve bozuk geçmiş reddedilir. En yeni kabul edilmiş geçiş `findLatestAcceptedCdeTransition` ile seçilir.

**Kanıt:** `src/smartcheck/rules/iso19650.ts`, `src/smartcheck/rules/iso19650.test.ts` — **13/13 geçti**.

## T28 — Kalıcı, tenant güvenli ve çok kullanıcılı CDE

- `cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions` ve `cde_transition_events` tabloları tenant bağlı birleşik yabancı anahtarlarla oluşturuldu.
- HTTP API proje/üye/konteyner/revizyon oluşturma, `approve`, `reject`, `withdraw` ve history okuma akışlarını sunar. `approve` ile WIP'e dönme reddedilir; geri dönüş yalnız zorunlu gerekçeli `withdraw` olayı olarak kaydedilir.
- Yetki, JWT içindeki gerçek kullanıcı ve tenant ile proje üyeliğindeki `coordinator|approver|contributor|viewer` rolü ve `ARC|STR|MEP|COST|QA|BIM` disiplininden türetilir.
- Başka tenant ve `viewer` kararı reddedilir. Yayımlamada maker-checker uygulanır.
- `expectedVersion` optimistic lock ile eşzamanlı iki karardan yalnız biri kazanır.
- `Idempotency-Key` yalnız aynı yetkili aktör ve aynı gövdede güvenli replay üretir; farklı aktör/gövde reddedilir. Geçmiş DTO'su idempotency ve request hash alanlarını dışarı açmaz.
- Okuma ve karar endpoint'leri tenant+kullanıcı anahtarlı kalıcı rate limit uygular; son `coordinator` kendisini düşüremez.
- UI geçmişi sunucu API'sinden yeniden yükler. CDE kararları localStorage'a yazılmaz; tarayıcı depolaması silinse de sunucu kaydı korunur.

**Kanıt:** `src/server/routes/cde.integration.test.ts` — **1/1 geçti**; `src/hooks/cde-workflow-model.test.ts` — **3/3 geçti**.

## T29 — Revizyon kapsamı ve yeniden onay

- Revizyon API'si istemci hash'i kabul etmez. Kapsam kimliği tenant bağlı doküman checksum'ı, başarılı processing run provenance'ı, saklanan `ifc_evidence` artifact checksum'ı ve kural değerlendirmeleri ile doğrulanmış 40 karakterlik build kimliğinden sunucuda deterministik SHA-256 olarak türetilir.
- Aynı kapsam tekrar kullanılır; herhangi bir kapsam bileşeni değiştiğinde yeni immutable revizyon açılır, önceki revizyona `supersedesRevisionId` ile bağlanır ve güncel konteyner `WIP` durumunda yeniden onay ister.
- Önceki karar eski revizyon ve scope hash üzerinde korunur; yeni sonuç eski onayla yayımlanmış görünmez.
- Karar olayları gerçek aktör, rol, disiplin, revizyon, scope hash, önceki/sonraki durum ve lock sürümüyle bağlanır.
- Release migration, revizyon ve karar olaylarında `UPDATE`/`DELETE` işlemlerini; CDE revizyonuna bağlandıktan sonra doküman, processing run ve sonuç artifact'ı mutasyonunu reddeden trigger'lar içerir. Birleşik FK'ler tenant, proje dokümanı, konteyner, revizyon, run ve artifact zincirini aynı kanıt hattına bağlar; aynı tenant içindeki başka bir dokümanın run/artifact'ı projeye bağlanamaz ve revizyon sonrası proje dokümanı değiştirilemez.

**Kanıt:** release migration lifecycle — **14 geçti, 1 `pg_dump` tooling koşullu skip**. Katalog parity, stage signature, upgrade/rollback, idempotency ve append-only trigger kontrol edildi.

## Kanıt özeti

| Kapı | Sonuç | Dosya |
|---|---:|---|
| ISO/CDE durum motoru | 13/13 geçti | `src/smartcheck/rules/iso19650.test.ts` |
| CDE HTTP ve gerçek PostgreSQL entegrasyonu | 1/1 geçti | `src/server/routes/cde.integration.test.ts` |
| UI CDE model davranışı | 3/3 geçti | `src/hooks/cde-workflow-model.test.ts` |
| Release migration lifecycle | 14 geçti, 1 tooling skip | `scripts/release-migrations/verify.integration.test.ts` |
| Append-only release artifact zinciri | geçti | `scripts/release-migrations/artifacts.test.ts` |
| Tam ürün test paketi | 1212 geçti, 0 hata, 5 koşullu skip | `pnpm test` |
| TypeScript + production build | geçti | `pnpm run build` |
| Yerel gerçek render | SmartCheck yükleme sayfası görüntülendi; korumalı admin rotası giriş kapısına yönlendi | in-app browser, `http://127.0.0.1:4317` |
| Final bağımsız kod yeniden incelemesi | APPROVE — kritik/yüksek/orta bulgu yok | ECC `code-reviewer` |
| Final bağımsız güvenlik yeniden incelemesi | APPROVE — kritik/yüksek bulgu yok | ECC `security-reviewer` |

Tarayıcı kontrolünde SmartCheck gerçek uygulama kabuğu ve yükleme alanıyla hatasız render edildi. CDE karar panelinin yapılandırılmış durumu dosya, başarılı worker run'ı, saklanan artifact ve yetkili proje üyeliği gerektirdiği için bu turda tarayıcı üzerinden sahte fixture enjekte edilmedi; aynı durum gerçek HTTP/PostgreSQL entegrasyon testinde API sınırından doğrulandı.

## Bağımsız uzmana ve sahaya kalan işler

1. Lisanslı TS EN ISO 19650-1/2 nüshası üzerinden transition, suitability ve revision eşleşmelerinin madde bazlı doğrulanması.
2. En az iki disiplin ve maker-checker ayrımı olan gerçek bir proje ekibiyle WIP→SHARED→PUBLISHED→ARCHIVED saha senaryosu.
3. Gerçek IFC revizyonunda dosya, kural ve sonuç değişikliklerinin uzman tarafından beklenen yeniden onay kapsamını üretip üretmediğinin imzalı kabulü.
4. 5070 uyumlu güvenli elektronik imza, sertifika zinciri, zaman damgası ve iptal kontrolünün ayrı ürün fazında eklenmesi; mevcut kimlik ve hash kaydı e-imza değildir.
5. Yedekleme/geri yükleme, uzun süreli denetim izi saklama, operasyonel izleme ve üretim rollback tatbikatı.
6. Bağımsız BIM koordinatörü adı, unvanı, sicil/oda numarası, tarih ve imzalı karar kaydı olmadan capability L3'e; gerçek pilot saha kabulü olmadan L4'e yükseltilmemelidir.

## İddia sınırı

Faz 4 kanıtı, çok kullanıcılı ve kalıcı CDE onay akışının kod ve kontrollü entegrasyon ortamındaki davranışını doğrular. Resmî e-PYS onayı, ISO uygunluk sertifikası, elektronik imza geçerliliği veya bağımsız mühendis kabulü anlamına gelmez. Sunucunun tenant bağlı run/artifact/build kayıtlarından türettiği kapsam kimliği kanıt zincirini sabitler; bu girdilerin mesleki doğruluğunu kendiliğinden kanıtlamaz.
