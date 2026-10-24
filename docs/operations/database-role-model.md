# BIMMetraj PostgreSQL görev ayrımı modeli

**Sürüm:** Rev. 57 / `BIM-CALC-2026-10-24.51`
**Kod baseline:** `a55841e56c0829f61802bc0db63e7baa1d317370`
**Durum:** **PARTIAL — altı canonical rol, izole PostgreSQL 16 ve yerel runtime credential sözleşmesi hazır; production cutover yapılmadı**

## Rol sözleşmesi

| Rol | Login | Amaç | Yasak sınır |
|---|---:|---|---|
| `bimmetraj_owner` | Hayır | Veritabanı, şema ve managed object sahibi | Uygulama bağlantısı değildir |
| `bimmetraj_migrator` | Evet | Yalnız açık `SET ROLE bimmetraj_owner` ile DDL | `NOINHERIT`, app verisi okuma/yazma yok |
| `bimmetraj_app` | Evet | Public uygulama DML ve doğrulanmış SmartCheck wrapper çağrıları | Queue private tablo/vendor fonksiyon erişimi ve DDL yok |
| `bimmetraj_control` | Evet | Kayıt, şirket, ödeme/abonelik, admin plan ve kota telafi mutasyonları | `leads`, queue, DDL, owner/migrator ve allowlist dışı tablo erişimi yok |
| `bimmetraj_worker` | Evet | Public iş verisi ve Graphile Worker queue işlemleri | DDL, owner/migrator yetkisi yok |
| `bimmetraj_backup` | Evet | Managed şema, tablo ve sequence salt okuma | Yazma, DDL ve wrapper çalıştırma yok |

Migrator üyeliği yalnız `SET OPTION=true`, `INHERIT=false`, `ADMIN=false` sözleşmesidir. Bütün login rolleri `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOREPLICATION` taşır.

## Runtime credential topolojisi

| Hizmet | Bağlantı kimliği | Kabul edilen secret | Bootstrap/owner sınırı |
|---|---|---|---|
| `app` veri düzlemi | `bimmetraj_app` | `BIMMETRAJ_APP_DB_PASSWORD` ile oluşturulan `DATABASE_URL` | Bootstrap ve owner kimliği yok |
| `app` kontrol düzlemi | `bimmetraj_control` | `BIMMETRAJ_CONTROL_DB_PASSWORD` ile oluşturulan `CONTROL_DATABASE_URL` | Yalnız app hizmetine verilir; queue/owner kimliği yok |
| `worker`, `ifc-worker` | `bimmetraj_worker` | `BIMMETRAJ_WORKER_DB_PASSWORD` ile oluşturulan `DATABASE_URL` | App, bootstrap ve owner kimliği yok |
| `migrate` | `bimmetraj_migrator` | `BIMMETRAJ_MIGRATOR_DB_PASSWORD` ile oluşturulan `RELEASE_DATABASE_URL` | Owner parolası yok; DDL yalnız transaction-local rol ile |
| `backup` | `bimmetraj_backup` | `BIMMETRAJ_BACKUP_DB_PASSWORD` → `PGPASSWORD` | Salt-okuma rolü zorunlu; bootstrap ve owner kimliği yok |
| `postgres` | bootstrap `bimmetraj` | `SERVICE_PASSWORD_64_POSTGRES` → `POSTGRES_PASSWORD` | Yalnız PostgreSQL bootstrap konteyneri |

Beş login parolası ve bootstrap parolası birbirinden farklı, en az 32 karakterli ve URL-safe yüksek entropili değerler olmalıdır. Compose eksik değerleri `:?` sözleşmesiyle render aşamasında reddeder. `CONTROL_DATABASE_URL` yalnız app hizmetine verilir; worker, ifc-worker, migrate, backup ve postgres ortamlarında bulunmaz. Uygulama başlangıcında control URL'nin kullanıcı adı exact `bimmetraj_control`, hedef host/port/database'i `DATABASE_URL` ile aynı olmalı; bağlantı davranışını değiştiren query override'ları reddedilir. Secret değerleri Git'e veya build argümanlarına konmaz ve provisioner parolayı SQL statement metnine eklemez. Production platform log redaksiyonu cutover öncesinde ayrıca doğrulanır.

Production migration bağlantısı yalnız `bimmetraj_migrator` kullanıcısını kabul eder. Runner sırası `BEGIN → SET LOCAL ROLE bimmetraj_owner → session/current role doğrulaması → hedef kapısı → advisory lock → drain kapısı → migration → COMMIT` şeklindedir. Her hata `ROLLBACK` üretir; transaction bittiğinde `current_user` yeniden `bimmetraj_migrator` olur. `bimmetraj_app`, `bimmetraj_worker` ve `bimmetraj_backup` owner rolüne geçemez.

`RELEASE_WORKERS_DRAINED=true` kalıcı bir ayar değildir. Yalnız iki worker durdurulup running/locked sayaçları sıfırlandıktan sonra migrate hizmetine verilir ve tek seferlik migration biter bitmez kaldırılır. Production deployment client'ında kod çağırıcısı seçenek vermese bile drain kapısı zorunludur.

## Güvenlik ve provenance kapıları

- Hedef veritabanı; exact database adı, PostgreSQL 16 system identifier ve schema-qualified release marker ile doğrulanır.
- Provision tek transaction içinde advisory lock alır; postcondition inspector geçmeden commit etmez.
- Parolalar en az 32 karakter, yeterli karakter çeşitliliği ve roller arasında benzersizlikle DB sorgusundan önce doğrulanır. Parola SQL metnine eklenmez.
- Managed object owner, database/schema/object/default/column/function ACL ve grant option matrisi exact karşılaştırılır.
- App queue erişimi yalnız `bimmetraj_enqueue_smartcheck` ve `bimmetraj_remove_smartcheck_job` wrapper'larıdır. Task adı, UUID job key, JSON boyutu, attempt ve priority aralığı fail-closed doğrulanır; `NULL` kabul edilmez.
- Graphile Worker `0.16.0` migration ledger'i exact `1..18` olmalıdır. Relation, persistence, access method, reloptions, tablespace, sequence ayarları, kolon/default/generated, constraint, index, non-internal trigger ve rule manifesti SHA-256 ile canonical yapıya bağlanır.
- `add_job`, `add_jobs` ve wrapper'ın nested bağımlılığı `remove_job` için SHA-256 source, full args/defaults, result, strictness, language, volatility, SECURITY mode, leakproof, parallel, binary, fixed search path ve exact EXECUTE ACL denetlenir.
- Dört private queue tablosu RLS enabled + `NO FORCE`; yalnız worker all ve backup select policy'lerini taşır. `migrations` RLS disabled + `NO FORCE` kalır.
- Uygulama artık istek sırasında Graphile şemasını kurmaz veya migrate etmez; migration 18 hazır değilse fail-closed durur.
- Control rolü `companies`/`subscriptions` CRUD, `plans` INSERT/SELECT/UPDATE ve `usage_logs` SELECT/INSERT/DELETE yetkileriyle sınırlıdır; `leads` erişimi yoktur. Kayıt ve ödeme akışının açık destek tabloları ayrıca exact ACL allowlist'idir; inspector allowlist dışı control grant'ini drift olarak reddeder.
- `0019_control_plane_rls`, `companies` ve `subscriptions` için control ALL; `usage_logs` için ayrı SELECT/INSERT/DELETE policy'leri kurar. Control rolü queue şemasına ve owner rolüne geçemez.
- Rev.57, authority/support tablolarındaki app/control/worker grant'lerini exact matrise yakınsar; control için tüm public sequence veya pre-schema tüm-table grant'i vermez. Production preflight iki URL'yi zorunlu tutar ve query override, duplicate seçenek, rol/hedef uyuşmazlığı ile TLS downgrade'i başlangıçta reddeder.
- Audit DELETE app ve control için kapalıdır. `admin_audit_logs` app INSERT kabul ettiği için kayıtlar credential compromise altında forge edilebilir; compliance authenticity kanıtı değildir ve production NO-GO sınırında kalır.

## Yerel doğrulama

```bash
pnpm exec tsc --noEmit
pnpm exec tsx --test src/contracts/database-role-contract.test.ts src/smartcheck/import/queue-readiness.test.ts
pnpm exec tsx --test scripts/database-roles/runtime-compose-contract.test.ts src/smartcheck/import/coolify-env-isolation.test.ts
pnpm exec tsx --test scripts/release-migrations/runner-role.test.ts scripts/release-migrations/safety.test.ts scripts/release-migrations/worker-drain-gate.test.ts
python3 -m unittest deploy.backup.test_backup
DATABASE_ROLE_TEST_URL='postgresql://<isolated-pg16-admin>@127.0.0.1:<port>/postgres' pnpm run test:database-roles:pg
```

Entegrasyon testi yalnız local, marker'lı disposable PostgreSQL 16 cluster kabul eder. Shared veya production veritabanına karşı çalıştırılmaz.

Parola doğrulamalı yerel PG16 kabulü beş login credentialını A→B döndürür; A credentiallarının tamamının reddedildiğini ve B kimliklerinin exact session/current role ile bağlandığını doğrular. Ardından B→A rollback yapar, B credentiallarını reddeder ve A erişimini yeniden doğrular. Rev.56 PG16 sözleşmesi control rolünün allowlist içi meşru mutasyonlarını ve `leads`/queue/owner/allowlist dışı negatif erişimini de doğrular. Bu tatbikat production credential rotation veya production rollback kanıtı değildir.

## Cutover kapısı

Bu belge production çalıştırma talimatı veya cutover onayı değildir. T40 ancak şu kanıtlar birlikte mevcutsa kapanabilir:

1. Hedef DB fingerprint ve yedek doğrulaması; güncel restore/parity kanıtı.
2. Secret manager/Coolify içinde beş benzersiz, URL-safe login credential; Compose fail-closed render ve log/image-history redaksiyonu.
3. Migration job → migrator, app veri düzlemi → app, app kontrol düzlemi → control, worker/ifc-worker → worker, backup → backup bağlantı ayrımı.
4. Pre-cutover inspector PASS; canary health, login, SmartCheck enqueue/consume/remove ve backup smoke.
5. Yerel A→B→A credential rollback kanıtına ek olarak production'da başarılı forward recovery ve rollback tatbikatı; eski credential'ın kontrollü iptali.
6. Production deploy SHA, çalışan image/source ve dış HTTP/browser kanıtının ayrı kaydı.

`pgaudit` veya DDL/audit logging kullanılırsa parola taşıyan nested DDL/GUC içerikleri loglanmamalı; hedef ortam logging davranışı redakte edilerek ayrıca doğrulanmalıdır.
