# Handoff: Üretim Rol Cutover, Otonom GAP Kapanışı ve Rev. 90 Deploy Rehberi (Güncelleme: 2026-10-26)

## 2026-10-26 Güncel Durum Özeti (`Rev. 90` — `BIM-CALC-2026-10-25.84`)

- **Canlı (`https://bimmetraj.com`) Durumu:** 2026-10-25 tarihinde `Rev. 72` (`f474e99`) deploy edilerek kanonik 6 PostgreSQL rolü (`bimmetraj_owner`, `bimmetraj_migrator`, `bimmetraj_app`, `bimmetraj_control`, `bimmetraj_worker`, `bimmetraj_backup`) ve `compose.coolify.yaml` içindeki otomatik `db-bootstrap → migrate → db-provision` zinciri canlıya alındı; ayrıca `hazarvolga@gmail.com` hesabına canlı veritabanında `is_super_admin = true` yetkisi verildi.
- **`origin/main` Dalı (`Rev. 90`):** `Rev. 76` (`405d2bc`) ile `Rev. 90` (`103defc`) arasındaki **15 ardışık revizyonun tamamı** (`T32, T41, T42, T43, T44, T45, T46, T53, T54, T56`) yerel izole 3-rollü PostgreSQL 16 + Python `ifcopenshell` + JSDOM ortamında doğrulandı, commit'lendi ve `origin/main` dalına push'landı.
- **GAP ve Kanıt Raporu Dosya Yolları:**
  - **Ana GAP Kapatma ve Kanıt Yol Haritası:** `docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md` *(proje kök dizinindeki `GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md` ve `.claude/worktrees/festive-bhaskara-08cc71/docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md` kopyalarıyla birebir senkron)*
  - **Faz 11 (`T56`) Nihai İzlenebilirlik ve Kanıt Matrisi:** `docs/audits/phase-11/PHASE_11_T56_FINAL_EVIDENCE_MATRIX_2026-10-26.md` ve `docs/audits/phase-11/final-evidence-matrix.json`
  - **Faz 10 (`T53–T54`) Pazar Envanteri ve Karşılaştırma Matrisi:** `docs/audits/phase-10/PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md` ve `docs/audits/phase-10/market-inventory-register.json`
  - **Faz 7 (`T43`) Kapsam Raporu (`%82.58`):** `docs/audits/phase-7/PHASE_7_T43_COVERAGE_E2E_2026-10-25.md` ve `coverage-thresholds.json`
- **Otonom Mühendislik Kapanış Metrikleri:**
  - **To-Do İlerlemesi (`56` madde):** **`39` `[x]` Tam Kapalı** + **`13` `PARTIAL` (tüm kod/test kapıları `[x]`, yalnızca dış girdi/canlı deploy bekliyor)** + **`4` `[ ]` (`T50, T51, T52, T55` — tamamen dış uzman/pilot/hukuk imzası)**. Dış girdi gerektirmeyen **sıfır** açık iş kalmıştır.
  - **Test ve Kapsam (`T43`):** `1,434` test (`1,427 PASS`, `0 FAIL`, `7 SKIP`); proje satır kapsamı **`%82.58` (`76,835 / 93,041` satır — `%80` hedefini `+2.58` puan aştı)**.
  - **Çok-Kiracılı Tablo İzolasyonu (`T41`):** `72 / 72` `company_id` tablosu (`0022..0027` migrasyonlarıyla `67` tablo `FORCE ROW LEVEL SECURITY` + `5` tablo `S5 Exact-ACL`).
  - **Yakalanıp Kapatılan Canlı Üretim Hataları (`D01–D11`):** `auth.ts` (`D07, D08`), `admin.ts` (`D01, D02, D09, D10`), `Dashboard.tsx` (`D11` React Rules-of-Hooks), `worker.ts` (`D03, D04` `companies`/`subscriptions` worker FORCE RLS SELECT), `backup.py` (`D05` `--enable-row-security`), `database-roles.ts` (`D06` S5 Exact-ACL) dahil **11 gerçek üretim kusuru** regresyon testleriyle kapatıldı.

## `Rev. 90` Coolify Canlıya Alma (Deploy) Rehberi — Bu Haliyle Deploy Edilebilir mi?

**Evet, doğrudan deploy edilebilir.** `compose.coolify.yaml` içinde `db-bootstrap → migrate → db-provision → app / worker / ifc-worker` zinciri tam otomatiktir.

`Rev. 72`'den `Rev. 90`'a geçişte **6 yeni veritabanı migrasyonu (`0022_tenant_business_rls` .. `0027_smartcheck_pipeline_rls`)** ve **`db-provision` S5 Exact-ACL yakınsaması** çalışacağı için, `migrate` servisinin güvenlik kilidi (`RELEASE_WORKERS_DRAINED=true`) gereği aşağıdaki **3 adımlı güvenli deploy sırası** izlenmelidir:

1. **Adım 1 — Worker'ları Durdur ve `RELEASE_WORKERS_DRAINED=true` Ayarla:**
   - Coolify veya sunucu terminalinde çalışan `worker` ve `ifc-worker` konteynerlerini durdurun (veya kuyrukta çalışan aktif iş olmadığından emin olun).
   - Coolify **Environment Variables** ekranında geçici olarak `RELEASE_WORKERS_DRAINED=true` değişkenini etkinleştirin (*Developer View'i açmadan*).
2. **Adım 2 — Coolify'da `Deploy` Butonuna Basın:**
   - Coolify yeni imajları (`app`, `worker`, `ifc-worker` — içinde `veraPDF 1.30.3` dahil, `migrate`, `backup`) derler.
   - `db-bootstrap` mevcut kurulumu görerek no-op geçer.
   - `migrate` servisi `bimmetraj_migrator` rolüyle `0022..0027` FORCE RLS migrasyonlarını uygular.
   - `db-provision` servisi `deploy-provision` komutuyla `67` FORCE RLS + `5` S5 Exact-ACL tablo yetkilerini yakınsar ve `inspectRoleBoundaries` kontrolünü otomatik çalıştırır.
   - `app`, `worker` ve `ifc-worker` otomatik olarak ayağa kalkar.
3. **Adım 3 — `RELEASE_WORKERS_DRAINED` Değişkenini Kaldır ve Canlıyı Doğrula:**
   - Deploy yeşil tamamlandıktan sonra Coolify'da `RELEASE_WORKERS_DRAINED` değişkenini silin veya boş bırakın.
   - `https://bimmetraj.com/api/health` adresinden `status: "ok"`, `db: "connected"` ve yeni commit SHA'sını doğrulayın.
   - İsteğe bağlı olarak Faz 7 canlı kapanış kanıtlarını (`T32, T40, T41, T42, T44, T45`) tamamlamak için sunucuda `scripts/role-model-smoke.ts` ve `ifc-worker` içinde `verapdf --version` çıktısını kaydedin.

---

# Tarihsel Kayıt: CI düzeltmesi ve üretim rol cutover provası (2026-10-24)

## Bu noktadaki durum

- Üretim uygulaması `https://bimmetraj.com/api/health` hâlâ `d9d80df12d9b4a00d36e89b12f68a9982b21ba8e` revision'ını bildiriyor. Coolify deploy yapılmadı.
- Son deploy-path kod push'u `cdcc7dcaa18618bc77f38c2ea7064c1aeb2c9df3` (`fix: add guarded production role operator`). GitHub Verify `40091648042` yaklaşık 10 dakika içinde yeşil tamamlandı ve `scripts/require-green-ci.sh cdcc7dcaa18618bc77f38c2ea7064c1aeb2c9df3` deploy gate'ini geçti. Beş RLS contract, role bootstrap, runtime Compose contract, tam `pnpm run verify`, Prisma shadow, browser smoke, dependency audit, app/IFC Docker image build ve network-isolated artifact smoke geçti. Önceki `cd819811683f1fff46225dae07b994d7087722b5` için Verify `40089915624` de yeşildi. Daha eski `495644599c5bbdb4ab02d9f72a5b0b12fee9bf2f` runı `body-parser@1.20.8` (`GHSA-27r3-jxmh-p828`) nedeniyle audit aşamasında başarısız olmuştu.
- `pnpm-workspace.yaml` ve `pnpm-lock.yaml` override'ları Express 4 hattını `body-parser@1.20.9`, Express 5 hattını `2.4.0` sürümüne sabitliyor. `node scripts/dependency-audit-policy.mjs` sonucu `{"blocked":[]}`. Dependency düzeltmesi `cd81981`, role-admin operator image/Compose wiring ise `cdcc7dc` ile push edildi ve son deploy-path SHA için GitHub Verify geçti.
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

- Role-admin deploy-path kodu `cdcc7dc` ile commit/push edildi. Yeni `40091648042` Verify ve `require-green-ci` kapısı yeşil; production cutover hazırlığı ve deploy henüz yapılmadı.
- `bootstrap-legacy` olumsuz sınır testleri: 4/4; role-admin runtime Compose sözleşmesi 4/4 geçti. Lokal lint/build, 8 odaklı role/Compose testi, dependency audit ve `git diff --check` başarılı. Lokal tam `pnpm run verify`, TypeScript sonrasında DB integration testlerinde `DATABASE_URL`/izole PostgreSQL bulunmadığından ve `127.0.0.1:5432` bağlantısı reddedildiğinden tamamlanamadı. Bu makineye DB başlatılmadı; aynı tam doğrulama GitHub Verify `40091648042` içindeki izole PostgreSQL ortamında başarıyla geçti.
- Body-parser dependency audit policy: `blocked: []`.
- Yerel tam `pnpm run verify`, entegrasyon aşamasında `DATABASE_URL`/PostgreSQL yokluğu nedeniyle tamamlanamadı. Tam test/build/Prisma/browser/dependency/Docker kapsamı `40091648042` runında GitHub izole ortamında geçti. Son docs-only commit `6db4a69` için Verify `40092401044` ve `scripts/require-green-ci.sh` de geçti.
- Önceki reviewer durumu: security review GO; code review bootstrap için izole gerçek PostgreSQL başarı zincirinin kanıtlanmasını ve aşama 1 sonrası hata kurtarma yolunun belgelenmesini istedi. Bu handoff'taki PG16 prova ilk açığı kapatır; cutover runbook'taki ileri kurtarma/restore adımı ikinci riski yönetir.
- `graphify-out/` değişiklikleri üretilmiş ve çalışma ağacında dirty. GAP raporu, kullanıcının analiz notu ve global konumlandırma dosyaları kullanıcıya ait untracked dosyalardır. Bunları stage etme veya geri alma.

## Kalan sıra

1. `graphify update .` çalıştırıldı. Graphify, bazı JSON/SQL dosyalarında parser desteği olmadığını raporladı; AST güncellemesi tamamlandı. Üretilen `graphify-out/` değişiklikleri çalışma ağacında dirty, commit'e alınmadı.
2. Role-admin servisi normal Compose startup dışında, yalnızca `operator` profile'ında kalmalı; `.env.app` veya `.env.postgres` dosyalarını almamalı. Testler bu sözleşmeyi doğruluyor. `inspect` şimdilik admin URL'si kullanır; operator container'ı kısa ömürlü olmalı ve açık bırakılmamalı. Salt-okunur ayrı inspect kimliği sonraki iyileştirmedir.
3. `cdcc7dc` kod değişikliği ve `6db4a69` handoff güncellemesi push edildi; iki SHA için ilgili GitHub Verify ve `require-green-ci` kapıları geçti. Yerel lint/build, odaklı testler, dependency audit ve diff-check başarılı. Yerel tam `pnpm run verify`, DB entegrasyon aşamasında yerel PostgreSQL bulunmadığı için tamamlanamadı; GitHub tam doğrulaması başarılıdır.
4. PostgreSQL system identifier'ını üretim DB'sinde salt-okunur `select system_identifier::text from pg_control_system();` ile al ve deployment kaydıyla eşleştir. Değeri `DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER` olarak Coolify değişkenlerine yaz; parola/URL değerlerini loglama. Boş fingerprint ile `bootstrap-legacy` ve `provision` hata vererek durur.
5. `cdcc7dc` code SHA'sı ve son `6db4a69` handoff SHA'sı push edildi; her iki ilgili SHA için GitHub Verify ve `scripts/require-green-ci.sh` yeşil. Yeni kod değişikliği yapılırsa deploy öncesi aynı gate'i yeni SHA için tekrar çalıştır.
6. Coolify'da beş ayrı rol parolasının (`BIMMETRAJ_APP_DB_PASSWORD`, `BIMMETRAJ_CONTROL_DB_PASSWORD`, `BIMMETRAJ_WORKER_DB_PASSWORD`, `BIMMETRAJ_MIGRATOR_DB_PASSWORD`, `BIMMETRAJ_BACKUP_DB_PASSWORD`) ve `DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER` değişkeninin hazır olduğunu doğrula. Admin URL, Compose tarafından mevcut `SERVICE_PASSWORD_64_POSTGRES` değerinden operator service'e türetilir; marker/database hedefleri sabittir.
7. Pencere öncesi yeni checksum doğrulamalı backup al. App/worker/IFC worker trafiğini durdur ve Graphile kilitli/çalışan iş sayısının sıfır olduğunu doğrula. Coolify Compose checkout/SSH operatör terminalinde sırayla çalıştır: `docker compose --profile operator run --rm role-admin node dist/database-roles-cli.mjs bootstrap-legacy`; sonra `docker compose run --rm migrate`; sonra `docker compose --profile operator run --rm role-admin node dist/database-roles-cli.mjs provision`; son olarak `docker compose --profile operator run --rm role-admin node dist/database-roles-cli.mjs inspect`. Operator çağrılarında `node ...` argümanı zorunludur: Docker image `tini` entrypoint kullanır, dolayısıyla yalnızca `bootstrap-legacy` argümanı verilirse executable bulunamaz. Her adım başarılı olmadan sonrakine geçme. Aşama sonrası hata olursa bootstrap'i körlemesine tekrar etme; ledger/owner/rol durumunu inceleyip ileri kurtarma veya doğrulanmış restore uygula.
8. Yalnızca migration + inspector yeşil olduktan sonra Coolify deploy et. `/api/health` revision'ını beklenen SHA ile ve login/tenant akışını doğrula; worker queue, Sentry/log ve rollback kanıtını kaydet. Deploy/doğrulama başarısızsa rollback planını uygula.

## Açık kapılar

- `cdcc7dc` deploy-path kodu ve `6db4a69` handoff docs commit'i için Verify/deploy gate yeşil. Handoff komutlarındaki `tini` kaynaklı çalıştırma hatası açık `node dist/database-roles-cli.mjs ...` kullanılarak düzeltildi.
- Coolify secret/env hazırlığı ve üretim drain/cutover/deploy.
- Canlı health revision, login/tenant smoke, worker queue ve log/alert kanıtı.
- T41/Phase 7'nin diğer tenant tabloları ve bağımsız uzman kabulü. Bu deploy handoff'u uzman onayı yerine geçmez.

## 2026-10-24 canlıya alma denemesi — kesin durma noktası

- Kullanıcı Coolify uygulama sayfasını ve Docker Desktop'ı açtı; doğru Coolify kaynağı `Bimmetraj / production / Bimmetraj`, app id `ibjv2zbpecdcbd71lxo1vqd7` olarak doğrulandı. Başka bir FPVLovers Coolify sekmesi yalnızca görüntülendi; o kaynağa işlem uygulanmadı.
- Canlı `https://bimmetraj.com/api/health` HTTP isteği `status=ok`, `db=connected` döndürüyor; fakat çalışan revision hâlâ `d9d80df12d9b4a00d36e89b12f68a9982b21ba8e`. Hostta app, worker, IFC worker, backup ve PostgreSQL 16.15 container'ları çalışıyor; app/DB uptime yaklaşık 47 saat. Yeni kod canlıya alınmış değil.
- Doğru PostgreSQL container'ında salt-okunur sorgu `teklifpro_release.migrations` için `8 | 0008_pilot_exception_rows` gösterdi; `bimmetraj_owner`, `bimmetraj_migrator`, `bimmetraj_app`, `bimmetraj_control`, `bimmetraj_worker`, `bimmetraj_backup` rollerinden hiçbiri bulunmadı. Cluster system identifier: `7695295353002782758`.
- Coolify Environment Variables sayfasında ayrı ayrı yapılan aramalarda beş rol parolası bulunmadı: `BIMMETRAJ_APP_DB_PASSWORD`, `BIMMETRAJ_CONTROL_DB_PASSWORD`, `BIMMETRAJ_WORKER_DB_PASSWORD`, `BIMMETRAJ_MIGRATOR_DB_PASSWORD`, `BIMMETRAJ_BACKUP_DB_PASSWORD`. `DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER` artık Coolify Add Variable işlemiyle doğrulanmış `7695295353002782758` değeri olarak kaydedildi; UI'da Production ve Preview deployments satırlarında görünüyor. Bu fingerprint hassas parola değildir. Preview kopyasını silme modalı işlemin kalıcı/geri alınamaz olduğunu belirtti; onay verilmedi, hiçbir kayıt silinmedi. İki kapsam kaydı da mevcut.
- Son push edilmiş HEAD `a9b5295fce714a01cd26a43e59738b0a4e319912`; docs-only GitHub Verify run `40093055252` başarıyla tamamlandı ve `scripts/require-green-ci.sh a9b5295fce714a01cd26a43e59738b0a4e319912` deploy gate'ini geçti. Kod/deploy-path SHA `cdcc7dcaa18618bc77f38c2ea7064c1aeb2c9df3` için de önceki Verify ve gate yeşildi. Bu handoff'a canlıya alma girişimi sonrasında eklenen yeni yerel not commit edilmemiştir; bu dokümantasyon farkı `git diff --check` ile temizdir.
- **Güvenli devam:** Coolify'da beş ayrı rol parolasını kullanıcı kendi parola kasasından/güvenli parola üreticisinden girip kaydetmeli. Parolalar sohbet/çıktı/log içine kopyalanmamalı. Kaydedildikten sonra beş değişkenin varlığını (değerleri göstermeden) yeniden kontrol et; ardından yeni checksum doğrulamalı backup, worker drain/queue-zero, `bootstrap-legacy` → `migrate` → `provision` → `inspect` adımlarını tek tek ve her başarıyı doğrulayarak uygula; ancak bundan sonra deploy et.
- Coolify General sayfası yeni sekmede tekrar açıldığında da “You have changes that haven't been saved yet” uyarısı vardı. Formda Compose yolu `/compose.coolify.yaml`, custom build/start komutları `docker compose build` / `docker compose up -d`; pre-deployment ve post-deployment alanları `php artisan migrate` görünüyordu. Bunlar dirty form state olduğundan kaydedilmiş konfigürasyon kanıtı değildir. Bu formu **Save** veya **Reset** etme; özellikle PHP migration hook'larını Node/Compose deploy ayarına körlemesine kaydetme. Kullanıcı pending form değişikliklerinin sahibini/niyetini netleştirip persisted değerler salt-okunur doğrulanmadan deploy tetiklenmemeli.
- Environment Variables sayfasında sadece yukarıdaki non-secret fingerprint kaydedildi; parolalar eklenmedi ve General formu kaydedilmedi. Mevcut çalışan app/DB container'larına deploy, migration veya restart uygulanmadı. Yeni deploy için Coolify üzerinde kullanıcı parola handoff'u ve persisted General ayarlarının doğrulanması gerekir.

## 2026-10-24 güvenlik duraklaması — Coolify Developer View

- Coolify ortam değişkenleri incelenirken Developer View ham secret değerlerini gösterdi ve bu görünümün araç çıktısı secrets içerdi. Hiçbir değer bu handoff'a kopyalanmadı; değerleri tekrar kullanma veya gösterme.
- Yeni beş DB rol parolasını beş farklı güçlü değerle yenile. Aynı Developer View çıktısında görünmüş olabilecek mevcut S3/backup S3 erişim anahtarları, SMTP parolası, PostgreSQL servis parolası ve JWT secret'ını da ilgili sağlayıcılarda yenile; gerekli uygulama/Coolify değişkenlerini kaydet ve servis etkisini kontrollü değerlendir. Bu dönüşüm kanıtlanmadan rol cutover/deploy yapma.
- Kullanıcı yeni rol parolalarını Coolify UI'a girdiğini bildirdi; bu oturumdaki tarayıcı otomasyon envanteri tarayıcı kullanımının Work ayarlarında devre dışı olduğunu bildirdi. Değişkenlerin kaydedildiği veya Production-only kapsamda bulunduğu doğrulanamadı; “girdi” kaydetme kanıtı değildir.
- Root'taki `COOLIFY_DB_ROLE_SECRETS_TEMP.txt` parola aktarımı için oluşturulmuş geçici dosyadır. İçeriği açmadan kullanıcı talimatı uyarınca bu oturumda silinmiştir. Yeniden oluşturma veya secret değerlerini repoya/loglara alma.
- Son güvenli durum: prod migration/bootstrap/provision/inspect, restart veya deploy bu güvenlik duraklaması sırasında çalıştırılmadı. Kullanıcı ilgili değerleri Coolify/secret sağlayıcılarında yeniledikten sonra yalnızca değişken adları ve Production kapsamını normal/redacted UI ile doğrula; Developer View'i açma. Ardından handoff'taki backup → queue drain → bootstrap → migration → provision → inspect sırasını kanıtla ve ancak başarılı sonuçlardan sonra deploy et. Dirty Coolify General formu salt-okunur doğrulanmadan kaydedilmemeli.

## 2026-10-24 kullanıcının parola yenileme sonrası deploy talebi — cutover hâlâ bekliyor

- Kullanıcı parolaları değiştirdiğini ve deploy istediğini bildirdi. SSH ile doğru production hostuna salt-okunur erişildi; `/api/health` hâlâ revision `d9d80df12d9b4a00d36e89b12f68a9982b21ba8e`, DB connected.
- Coolify DB metadata'sında hedef uygulama `ibjv2zbpecdcbd71lxo1vqd7` için beş rol parolası Production kapsamına kaydedilmiş, beşi de farklı değer; bu isimlerin Preview kopyası yok. Parolaların kendileri sorgulanmadı/yazdırılmadı. `DATABASE_ROLE_EXPECTED_SYSTEM_IDENTIFIER` Production ve Preview'de bulunuyor.
- Coolify'a kaydedilmiş Compose yolu `/compose.coolify.yaml`; kaydedilmiş build/start ve pre/post-deploy komut alanları boş. Önceki PHP `artisan migrate` metni kaydedilmiş konfigürasyonda yok.
- Canlı PostgreSQL 16'da system identifier `7695295353002782758`; `teklifpro_release.migrations` `8 | 0008_pilot_exception_rows`; altı canonical rolün sayısı `0`. Bu nedenle yeni app/worker imajını doğrudan çalıştırma.
- Salt-okunur iş durumu: Graphile queue `2` kayıt, `0` locked; `document_processing_runs`: `queued=1`, `succeeded=15`, `failed=3`, running satırı yok. Worker/app durdurulmadı.
- Canlı pre-cutover dump `/data/coolify/backups/bimmetraj-production-pre-role-cutover-20261024.dump` oluşturuldu; 1,697,019 byte, mode `0600`, `pg_restore --list` başarılı. SHA-256 `7634f43bc15919259f654251b22a15a72c6fc4638ede82c071cc12e0c519ad4c`.
- SSH ile Coolify uygulama UUID'si doğrulandı. Eski app container'ının Compose working-dir'i `/artifacts/cf8e469a-7201-479a-b889-e1dbb021fb8c` artık mevcut değil; sunucuda yeni `bimmetraj-migrate`/`role-admin` imajı yok. Bu oturumda CUA `Browsers: Local browser use is disabled in Work settings` döndürdü ve Coolify deploy token/CLI mevcut değil. Deploy trigger veya migration çalıştırılmadı.
- Güvenli devam: Work ayarlarında local browser use etkinleşince Coolify uygulamasında Deployments/CLI erişimini kullan; önce yeni checkout/imajları al, worker-drain (kilitli job ve running document run sıfır; bekleyen queued işi güvenle ele al), operator `bootstrap-legacy`, `migrate`, `provision`, `inspect` sırasını uygula. `RELEASE_WORKERS_DRAINED=true` yalnız app ve iki worker durmuş, running/locked sayaçlar sıfır ve tek seferlik migration çalışırken verilsin; sonrasında kaldır. Her başarıyı doğrulamadan sıradakine geçme. En son deploy et; `/api/health`, login/tenant, worker, backup ve observability smoke kanıtlarını kaydet.

## 2026-10-24 yetki verildi, ancak deploy tetikleme erişimi yok

- Kullanıcı tam yetki verdi. Bu yetkiyle production DB ve Coolify metadata kontrolleri salt-okunur yapıldı; pre-cutover backup alındı. DB cutover veya app deploy henüz yapılmadı.
- `mcp__cua_repl` yeniden denendi; yine `Local browser use is disabled in Work settings` ve browser inventory boş döndü. Hostta `coolify` CLI yok. Authenticated Coolify deploy API tokenı bu oturumda mevcut değil; deployment endpoint'ini yetkisiz/uydurma tokenla çağırma.
- Production env metadata'da beş rol parolası farklı ve yalnız Production kapsamlı; bu yalnız Coolify kayıt kanıtıdır, provider tarafı tüm rotasyonları doğrulamaz.
- Güvenli devam için Work Settings'te local browser use etkinleşmeli veya kullanıcı Coolify Deployments/Console erişimini sağlamalı. Bundan sonra tek seferlik yeni source checkout/imajdan operator sırasını yürüt, job drain/queue şartını ve backup'ı tekrar doğrula, role inspector PASS'ten sonra Coolify deploy tetikle. Kullanıcıdan parola/token isteme.
