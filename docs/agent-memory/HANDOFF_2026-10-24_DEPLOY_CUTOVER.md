# Handoff: CI düzeltmesi ve üretim rol cutover provası (2026-10-24)

## Bu noktadaki durum

- Üretim uygulaması `https://bimmetraj.com/api/health` hâlâ `d9d80df12d9b4a00d36e89b12f68a9982b21ba8e` revision'ını bildiriyor. Coolify deploy yapılmadı.
- En son push `cd819811683f1fff46225dae07b994d7087722b5` (`fix: unblock legacy database role cutover`). GitHub Verify `40089915624` bu SHA için yeşil tamamlandı (17m18s): RLS, rol/migrasyon, full verify, Prisma, browser smoke, dependency audit, image build ve network-isolated artifact smoke geçti. Önceki `495644599c5bbdb4ab02d9f72a5b0b12fee9bf2f` runı `body-parser@1.20.8` (`GHSA-27r3-jxmh-p828`) nedeniyle audit aşamasında başarısız olmuştu.
- `pnpm-workspace.yaml` ve `pnpm-lock.yaml` override'ları Express 4 hattını `body-parser@1.20.9`, Express 5 hattını `2.4.0` sürümüne sabitliyor. `node scripts/dependency-audit-policy.mjs` sonucu `{"blocked":[]}`. Bunlar `cd81981` CI runında doğrulandı. Daha sonra bulunan operator-image/Compose wiring değişiklikleri henüz commit/push edilmedi; yeni SHA için CI yeniden çalışmalı.
- Kullanıcının beyanı: canlıda gerçek müşteri verisi yok. Yine de üretim DB'sinde incelenen yedekte 68 public tablo, 5 user ve 5 company vardı; bunları cutover sırasında silme/yeniden oluşturma varsayımı yapılmamalı. Yedek geri yükleme provası bu verileri korudu.

## Cutover kök nedeni ve kapatılan kanıt

Canlı DB release ledger'ı `0008_pilot_exception_rows` seviyesinde ve `bimmetraj_*` kanonik rolleri henüz yok. Yeni release runner migrasyonları `bimmetraj_migrator` oturumunda `SET LOCAL ROLE bimmetraj_owner` ile bekliyor; tam rol provisioning ise ancak `0021` ile eklenen şema/queue dahil olduktan sonra çalışıyor. Bu nedenle doğrudan migrasyon ve doğrudan tam provisioning sıraları birbirini bloke ediyordu.

Yerel kodda `bootstrap-legacy` adıyla dar bir ilk aşama eklendi. Yalnızca tam doğrulanmış eski idx8 ledger/katalog imzasında, beklenen PostgreSQL 16 cluster/database fingerprint'inde, rol provenance/membership/ACL kontrolleri geçerse kanonik roller ile migrator→owner `SET` üyeliğini ve yönetilen nesne sahipliğini kuruyor. Sonrasında release runner migrasyonları, ardından mevcut tam `provision` ve `inspect` çalışıyor. Aşama 1 ve migrasyonlar ayrı transaction/commit'tir; sonraki aşama hata verirse geri sarma yerine belgelenmiş ileri kurtarma veya yedekten restore uygulanmalıdır.

Üretim DB'sinin en yeni S3 checksum doğrulamalı yedeği, canlı DB'ye yazmadan izole PostgreSQL 16 kopyasına restore edildi. Aynı kopyada:

1. `bootstrapLegacyDatabaseRoles` idx8 koşulunu geçerek tamamlandı.
2. Release runner `0009`–`0021` dahil 13 migrasyonu uyguladı.
3. Tam `provisionDatabaseRoles` ve `inspectRoleBoundaries`/`assertRoleBoundaries` geçti.
4. Kopyada kontrol edilen tablo/user/company adetleri restore edilen yedekle eşleşti (`68/5/5`). Geçici container kaldırıldı.

Bu, eski şema → iki aşamalı rol cutover → güncel şema/ACL inspector zinciri için yerel üretim-yedeği provasıdır; canlı cutover veya deploy kanıtı değildir.

## Kod, test ve çalışma ağacı

- Pending intended changes: `Dockerfile`, `compose.coolify.yaml`, `compose.example.yaml`, `scripts/database-roles/runtime-compose-contract.test.ts` plus this handoff and `WORKING_STATE.md`. Dependency/bootstrap implementation itself was committed and pushed in `cd81981`.
- `bootstrap-legacy` olumsuz sınır testleri: 4/4 geçti (ledger drift, kısmi rol seti, cluster fingerprint farkı, provenance drift). Role-admin runtime Compose sözleşmesi lokal testleri 4/4 geçti; role CLI bundle local `dist/database-roles-cli.mjs` olarak üretildi. Yeni değişikliklerden sonra çalıştırılan yerel `pnpm run verify`, TypeScript aşamasını geçti ancak DB entegrasyon testlerinde gerekli `DATABASE_URL`/izole PostgreSQL bulunmadığı ve `127.0.0.1:5432` bağlantısı reddedildiği için durdu. Bu, Compose/Dockerfile değişikliği için yeşil doğrulama sayılmaz; yeni commit'in GitHub Verify'ı beklenmeli.
- Body-parser dependency audit policy: `blocked: []`.
- Son `pnpm run verify`: başarılı (1355 test; 1349 geçti, 6 skip, 0 fail) ve production build başarılı. Bu yerel kanıttır; yeni commit için GitHub Verify henüz çalıştırılmadı.
- Önceki reviewer durumu: security review GO; code review bootstrap için izole gerçek PostgreSQL başarı zincirinin kanıtlanmasını ve aşama 1 sonrası hata kurtarma yolunun belgelenmesini istedi. Bu handoff'taki PG16 prova ilk açığı kapatır; cutover runbook'taki ileri kurtarma/restore adımı ikinci riski yönetir.
- `graphify-out/` değişiklikleri üretilmiş ve çalışma ağacında dirty. GAP raporu, kullanıcının analiz notu ve global konumlandırma dosyaları kullanıcıya ait untracked dosyalardır. Bunları stage etme veya geri alma.

## Kalan sıra

1. `graphify update .` çalıştır ve sonuçları kontrol et.
2. Role-admin servisi normal Compose startup dışında, yalnızca `operator` profile'ında kalmalı; `.env.app` veya `.env.postgres` dosyalarını almamalı. Mevcut testler bu sözleşmeyi doğruluyor. `inspect` şimdilik admin URL'si kullanır; operator container'ı kısa ömürlü olmalı ve açık bırakılmamalı. Salt-okunur ayrı inspect kimliği sonraki iyileştirmedir.
3. Yeni `cd81981` üstü Dockerfile/Compose/test/doc değişikliklerini incele. Yalnızca intended dosyaları stage et; `graphify-out/` ve kullanıcıya ait raporları dışarıda bırak. Yerelde lint/build, odaklı role testleri, dependency audit ve diff-check'i çalıştır; tam `pnpm run verify` DB erişimi olmadığı için entegrasyon aşamasında durdu. Tam kapsam için commit sonrası GitHub Verify'ı bekle.
4. PostgreSQL system identifier'ını üretim DB'sinde salt-okunur `select system_identifier::text from pg_control_system();` ile al ve deployment kaydıyla eşleştir. Değeri `DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER` olarak Coolify değişkenlerine yaz; parola/URL değerlerini loglama. Boş fingerprint ile `bootstrap-legacy` ve `provision` hata vererek durur.
5. Conventional commit ve push yap; bu yeni SHA için GitHub Verify tamamlanıp `scripts/require-green-ci.sh <SHA>` yeşil dönmeden deploy etme.
6. Coolify'da beş ayrı rol parolasının (`BIMMETRAJ_APP_DB_PASSWORD`, `BIMMETRAJ_CONTROL_DB_PASSWORD`, `BIMMETRAJ_WORKER_DB_PASSWORD`, `BIMMETRAJ_MIGRATOR_DB_PASSWORD`, `BIMMETRAJ_BACKUP_DB_PASSWORD`) ve `DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER` değişkeninin hazır olduğunu doğrula. Admin URL, Compose tarafından mevcut `SERVICE_PASSWORD_64_POSTGRES` değerinden operator service'e türetilir; marker/database hedefleri sabittir.
7. Pencere öncesi yeni checksum doğrulamalı backup al. App/worker/IFC worker trafiğini durdur ve Graphile kilitli/çalışan iş sayısının sıfır olduğunu doğrula. Coolify Compose checkout/SSH operatör terminalinde sırayla çalıştır: `docker compose --profile operator run --rm role-admin node dist/database-roles-cli.mjs bootstrap-legacy`; sonra `docker compose run --rm migrate`; sonra `docker compose --profile operator run --rm role-admin node dist/database-roles-cli.mjs provision`; son olarak `docker compose --profile operator run --rm role-admin node dist/database-roles-cli.mjs inspect`. Operator çağrılarında `node ...` argümanı zorunludur: Docker image `tini` entrypoint kullanır, dolayısıyla yalnızca `bootstrap-legacy` argümanı verilirse executable bulunamaz. Her adım başarılı olmadan sonrakine geçme. Aşama sonrası hata olursa bootstrap'i körlemesine tekrar etme; ledger/owner/rol durumunu inceleyip ileri kurtarma veya doğrulanmış restore uygula.
8. Yalnızca migration + inspector yeşil olduktan sonra Coolify deploy et. `/api/health` revision'ını beklenen SHA ile ve login/tenant akışını doğrula; worker queue, Sentry/log ve rollback kanıtını kaydet. Deploy/doğrulama başarısızsa rollback planını uygula.

## Açık kapılar

- Son yeşil CI yalnızca `cd81981` için geçerli; sonraki Compose/Dockerfile operator-path değişikliği yeni SHA ve yeni yeşil CI gerektiriyor. Yerel lint, 8 odaklı role/Compose testi, dependency audit ve build geçti; tam yerel `verify` DB bağlantısı olmadığı için entegrasyon testlerinde durdu. Güvenlik reviewer handoff komutundaki `tini` kaynaklı hatayı yakaladı; komutlar yukarıda açık `node dist/database-roles-cli.mjs ...` biçiminde düzeltildi.
- Coolify secret/env hazırlığı ve üretim drain/cutover/deploy.
- Canlı health revision, login/tenant smoke, worker queue ve log/alert kanıtı.
- T41/Phase 7'nin diğer tenant tabloları ve bağımsız uzman kabulü. Bu deploy handoff'u uzman onayı yerine geçmez.
