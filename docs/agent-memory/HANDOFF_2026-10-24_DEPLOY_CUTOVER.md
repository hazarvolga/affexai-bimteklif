# Handoff: CI düzeltmesi ve üretim rol cutover provası (2026-10-24)

## Bu noktadaki durum

- Üretim uygulaması `https://bimmetraj.com/api/health` hâlâ `d9d80df12d9b4a00d36e89b12f68a9982b21ba8e` revision'ını bildiriyor. Coolify deploy yapılmadı.
- `main` üzerinde son push `495644599c5bbdb4ab02d9f72a5b0b12fee9bf2f` (`fix: restore restricted database CI verification`). GitHub Verify `40088426684`, RLS/rol/full verify/Prisma/browser aşamalarını geçip production dependency audit aşamasında `body-parser@1.20.8` nedeniyle `GHSA-27r3-jxmh-p828` bulgusuyla başarısız oldu.
- Yerel, henüz commit/push edilmemiş `pnpm-workspace.yaml` ve `pnpm-lock.yaml` override'ları Express 4 hattını `body-parser@1.20.9`, Express 5 hattını `2.4.0` sürümüne sabitliyor. `node scripts/dependency-audit-policy.mjs` sonucu `{"blocked":[]}`. Bu yamadan sonraki yerel `pnpm run verify` tamamlandı; Vite/server/spreadsheet-worker build başarılı. Büyük IFC viewer chunk uyarısı mevcut, build hatası değil.
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

- Pending intended changes: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `scripts/database-roles/cli.ts`, `scripts/database-roles/provision.ts`, `scripts/database-roles/bootstrap-legacy.test.ts`, `docs/agent-memory/WORKING_STATE.md` and this handoff.
- `bootstrap-legacy` olumsuz sınır testleri: 4/4 geçti (ledger drift, kısmi rol seti, cluster fingerprint farkı, provenance drift).
- Body-parser dependency audit policy: `blocked: []`.
- Son `pnpm run verify`: başarılı (1355 test; 1349 geçti, 6 skip, 0 fail) ve production build başarılı. Bu yerel kanıttır; yeni commit için GitHub Verify henüz çalıştırılmadı.
- Önceki reviewer durumu: security review GO; code review bootstrap için izole gerçek PostgreSQL başarı zincirinin kanıtlanmasını ve aşama 1 sonrası hata kurtarma yolunun belgelenmesini istedi. Bu handoff'taki PG16 prova ilk açığı kapatır; cutover runbook'taki ileri kurtarma/restore adımı ikinci riski yönetir.
- `graphify-out/` değişiklikleri üretilmiş ve çalışma ağacında dirty. GAP raporu, kullanıcının analiz notu ve global konumlandırma dosyaları kullanıcıya ait untracked dosyalardır. Bunları stage etme veya geri alma.

## Kalan sıra

1. `graphify update .` çalıştır ve sonuçları kontrol et.
2. İlgili diff'i gözden geçir; yalnızca intended code/dependency/docs değişikliklerini stage et. `git status --short` ile user-owned untracked ve graphify dosyalarını dışarıda bırak.
3. `pnpm run verify`, `pnpm exec tsx --test scripts/database-roles/bootstrap-legacy.test.ts`, `node scripts/dependency-audit-policy.mjs`, `pnpm why body-parser` ve diff-check'i son kez çalıştır.
4. Conventional commit oluşturup `main`'e push et. Yeni GitHub Verify run ID'sini al; `scripts/require-green-ci.sh <SHA>` başarılı olana kadar Coolify deploy etme.
5. Deploy öncesi Coolify env'lerinde app/control/worker URL ayrımı ile migrator/admin ve beş rol parolasının hazır olduğunu doğrula; değerleri loga veya bu belgeye yazma. Üretim DB bağlantı bilgilerini ve beklenen cluster/database marker'larını ikinci kez doğrula.
6. Pencere öncesi taze backup al ve checksum/restore kanıtını kaydet. App/worker trafiğini drain et; eski idx8 `bootstrap-legacy` işlemini bir kez çalıştır; release migration runner'ı çalıştır; tam `provision`, ardından `inspect`/`assert` çalıştır. Aşama sonrası hata olursa rol bootstrap'ini tekrar körlemesine çalıştırma; ledger/owner/rol durumunu inceleyip ileri kurtarma veya doğrulanmış restore uygula.
7. Yalnızca migration + inspector yeşil olduktan sonra Coolify deploy et. `/api/health` revision'ını beklenen SHA ile ve login/tenant akışını doğrula; worker queue, Sentry/log ve rollback kanıtını kaydet. Deploy/doğrulama başarısızsa rollback planını uygula.

## Açık kapılar

- Yeni GitHub Verify ve zorunlu yeşil CI kapısı.
- Coolify secret/env hazırlığı ve üretim drain/cutover/deploy.
- Canlı health revision, login/tenant smoke, worker queue ve log/alert kanıtı.
- T41/Phase 7'nin diğer tenant tabloları ve bağımsız uzman kabulü. Bu deploy handoff'u uzman onayı yerine geçmez.
