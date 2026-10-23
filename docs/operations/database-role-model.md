# BIMMetraj PostgreSQL görev ayrımı modeli

**Sürüm:** Rev. 47 / `BIM-CALC-2026-10-24.41`
**Kod baseline:** `eeeaf75f27cd0b65c3f7f44ed6e3668386cceb53`
**Durum:** **PARTIAL — tooling ve izole PostgreSQL 16 kanıtı hazır; runtime/production cutover yapılmadı**

## Rol sözleşmesi

| Rol | Login | Amaç | Yasak sınır |
|---|---:|---|---|
| `bimmetraj_owner` | Hayır | Veritabanı, şema ve managed object sahibi | Uygulama bağlantısı değildir |
| `bimmetraj_migrator` | Evet | Yalnız açık `SET ROLE bimmetraj_owner` ile DDL | `NOINHERIT`, app verisi okuma/yazma yok |
| `bimmetraj_app` | Evet | Public uygulama DML ve doğrulanmış SmartCheck wrapper çağrıları | Queue private tablo/vendor fonksiyon erişimi ve DDL yok |
| `bimmetraj_worker` | Evet | Public iş verisi ve Graphile Worker queue işlemleri | DDL, owner/migrator yetkisi yok |
| `bimmetraj_backup` | Evet | Managed şema, tablo ve sequence salt okuma | Yazma, DDL ve wrapper çalıştırma yok |

Migrator üyeliği yalnız `SET OPTION=true`, `INHERIT=false`, `ADMIN=false` sözleşmesidir. Bütün login rolleri `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOREPLICATION` taşır.

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

## Yerel doğrulama

```bash
pnpm exec tsc --noEmit
pnpm exec tsx --test src/contracts/database-role-contract.test.ts src/smartcheck/import/queue-readiness.test.ts
DATABASE_ROLE_TEST_URL='postgresql://<isolated-pg16-admin>@127.0.0.1:<port>/postgres' pnpm run test:database-roles:pg
```

Entegrasyon testi yalnız local, marker'lı disposable PostgreSQL 16 cluster kabul eder. Shared veya production veritabanına karşı çalıştırılmaz.

## Cutover kapısı

Bu belge production çalıştırma talimatı veya cutover onayı değildir. T40 ancak şu kanıtlar birlikte mevcutsa kapanabilir:

1. Hedef DB fingerprint ve yedek doğrulaması; güncel restore/parity kanıtı.
2. Secret manager/Coolify içinde dört benzersiz login credential; log, DDL audit ve shell history redaksiyonu.
3. Migration job → migrator, app → app, worker/ifc-worker → worker, backup → backup bağlantı ayrımı.
4. Pre-cutover inspector PASS; canary health, login, SmartCheck enqueue/consume/remove ve backup smoke.
5. Başarılı forward recovery ve rollback tatbikatı; eski credential'ın kontrollü iptali.
6. Production deploy SHA, çalışan image/source ve dış HTTP/browser kanıtının ayrı kaydı.

`pgaudit` veya DDL/audit logging kullanılırsa parola taşıyan nested DDL/GUC içerikleri loglanmamalı; hedef ortam logging davranışı redakte edilerek ayrıca doğrulanmalıdır.
